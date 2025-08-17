import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import type { AssetPurpose } from '../services/db';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const expenseColors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];
  const assetClassColors = ['#2ecc71', '#e74c3c', '#f1c40f', '#3498db', '#9b59b6', '#34495e'];
  const assetGoalColors = ['#8e44ad', '#16a085', '#d35400', '#c0392b', '#27ae60', '#2980b9'];
  const savingsColors = ['#f39c12', '#1abc9c', '#e67e22', '#7f8c8d', '#bdc3c7', '#2c3e50'];
  const totalAssets = useLiveQuery(
    () => db.assetsHoldings.toArray().then(holdings =>
      holdings.reduce((sum, holding) => sum + holding.existingAllocation, 0)
    )
  ) || 0;

  const totalLiabilities = useLiveQuery(
    () => db.liabilities.toArray().then(liabilities =>
      liabilities.reduce((sum, liability) => sum + liability.balance, 0)
    )
  ) || 0;

  const netWorth = totalAssets - totalLiabilities;

  const expensesByPurpose = useLiveQuery(async () => {
    const purposes = await db.assetPurposes.toArray();
    const cashFlows = await db.cashFlow.toArray();

    const purposeMap = purposes.reduce((map: Record<number, { name: string; total: number }>, purpose: AssetPurpose) => {
      if (purpose.id) {
        map[purpose.id] = { name: purpose.name, total: 0 };
      }
      return map;
    }, {});

    cashFlows.forEach(flow => {
      if (flow.assetPurpose_id && purposeMap[flow.assetPurpose_id]) {
        purposeMap[flow.assetPurpose_id].total += flow.monthly;
      }
    });

    return Object.values(purposeMap)
      .filter((purpose): purpose is { name: string; total: number } => purpose.total > 0)
      .map(purpose => ({
        id: purpose.name,
        value: purpose.total,
        label: purpose.name,
      }));
  }) || [];

  // Pie chart data for asset class allocation
  const assetClassAllocation = useLiveQuery(async () => {
    const assetClasses = await db.assetClasses.toArray();
    const holdings = await db.assetsHoldings.toArray();
    // Map asset class id to total allocation
    const allocationMap: Record<number, number> = {};
    holdings.forEach(h => {
      if (h.assetClasses_id) {
        allocationMap[h.assetClasses_id] = (allocationMap[h.assetClasses_id] || 0) + h.existingAllocation;
      }
    });
    // Build chart data
    return assetClasses
      .filter(ac => allocationMap[ac.id] > 0)
      .map(ac => ({
        id: ac.id,
        label: ac.name,
        value: allocationMap[ac.id]
      }));
  }) || [];

  // Pie chart data for asset allocation by goal
  const assetAllocationByGoal = useLiveQuery(async () => {
    const goals = await db.goals.toArray();
    const holdings = await db.assetsHoldings.toArray();
    // Map goal id to total allocation
    const allocationMap: Record<number, number> = {};
    holdings.forEach(h => {
      if (h.goals_id) {
        allocationMap[h.goals_id] = (allocationMap[h.goals_id] || 0) + h.existingAllocation;
      }
    });
    // Build chart data
    return goals
      .filter(goal => allocationMap[goal.id] > 0)
      .map(goal => ({
        id: goal.id,
        label: goal.name,
        value: allocationMap[goal.id]
      }));
  }) || [];

  const savingsCashFlow = useLiveQuery(async () => {
    const purposes = await db.assetPurposes.toArray();
    const cashFlows = await db.cashFlow.toArray();
    const goals = await db.goals.toArray();
    // Find savings purpose ids
    const savingsPurposeIds = purposes.filter(p => p.type === 'savings').map(p => p.id);
    // Map goal id to total savings cash flow
    const goalMap: Record<number, { name: string; total: number }> = {};
    goals.forEach(goal => {
      if (goal.id) {
        goalMap[goal.id] = { name: goal.name, total: 0 };
      }
    });
      const savingsFlows = cashFlows.filter(flow => savingsPurposeIds.includes(flow.assetPurpose_id));
      // Group by item name
      const itemMap: Record<string, number> = {};
      savingsFlows.forEach(flow => {
        if (flow.item) {
          itemMap[flow.item] = (itemMap[flow.item] || 0) + flow.monthly;
        }
      });
      return Object.entries(itemMap)
        .map(([item, total]) => ({
          id: item,
          label: item,
          value: total
        }));
  }) || [];

  const cardData = [
    {
      title: 'Total Assets',
      value: totalAssets,
      bg: 'primary',
      text: 'white'
    },
    {
      title: 'Total Liabilities',
      value: totalLiabilities,
      bg: 'danger',
      text: 'white'
    },
    {
      title: 'Net Worth',
      value: netWorth,
      bg: 'success',
      text: 'white'
    }
  ];

  return (
    <Container fluid className="py-4 h-100 overflow-auto">
      <div>
        <Row className="mb-4">
          {cardData.map((card) => (
            <Col key={card.title} md={4} className="mb-3 mb-md-0">
              <Card bg={card.bg} text={card.text} className="h-100 shadow">
                <Card.Header as="h5" className={`bg-${card.bg} text-${card.text}`}>{card.title}</Card.Header>
                <Card.Body>
                  <Card.Text className="display-6">₹{card.value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</Card.Text>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
        <Row>
          <Col md={4}>
            {expensesByPurpose.length > 0 && (
              <Card className="mb-4">
                <Card.Header as="h6">Expense Distribution by Purpose</Card.Header>
                <Card.Body style={{ height: 350 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expensesByPurpose}
                        dataKey="value"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ percent = 0, name }) => `${(percent * 100).toFixed(1)}% - ${name}`}
                      >
                        {expensesByPurpose.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={expenseColors[index % expenseColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            )}
          </Col>
          <Col md={4}>
            {assetClassAllocation.length > 0 && (
              <Card className="mb-4">
                <Card.Header as="h6">Asset Allocation by Class</Card.Header>
                <Card.Body style={{ height: 350 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={assetClassAllocation}
                        dataKey="value"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ value }) => `₹${value?.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`}
                      >
                        {assetClassAllocation.map((_, index) => (
                          <Cell key={`cell-ac-${index}`} fill={assetClassColors[index % assetClassColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            )}
          </Col>
          <Col md={4}>
            {assetAllocationByGoal.length > 0 && (
              <Card className="mb-4">
                <Card.Header as="h6">Asset Allocation by Goal</Card.Header>
                <Card.Body style={{ height: 350 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={assetAllocationByGoal}
                        dataKey="value"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ value }) => `₹${value?.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`}
                      >
                        {assetAllocationByGoal.map((_, index) => (
                          <Cell key={`cell-goal-${index}`} fill={assetGoalColors[index % assetGoalColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            )}
          </Col>
        </Row>
        <Row>
          <Col md={4}>
          {savingsCashFlow.length > 0 && (
              <Card className="mb-4">
                <Card.Header as="h6">Monthly Cash Flow (Savings)</Card.Header>
                <Card.Body style={{ height: 350 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={savingsCashFlow}
                        dataKey="value"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ percent = 0 }) => `${(percent * 100).toFixed(1)}%`}
                      >
                        {savingsCashFlow.map((_, index) => (
                          <Cell key={`cell-savings-${index}`} fill={savingsColors[index % savingsColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            )}
          </Col>
          <Col md={4}></Col>
          <Col md={4}></Col>
        </Row>
      </div>
    </Container>
  );
}
