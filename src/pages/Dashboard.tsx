import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import type { AssetPurpose } from '../services/db';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  // ...existing code...
  const holders = useLiveQuery(() => db.holders.toArray()) || [];
  const accounts = useLiveQuery(() => db.accounts.toArray()) || [];
  const cashFlows = useLiveQuery(() => db.cashFlow.toArray()) || [];

  // Monthly Holder Accounts Transfer rows
  let transferRows: Array<{ holderName: string; bankInfo: string; amount: number }> = [];
  holders.forEach(holder => {
    const holderAccounts = accounts.filter(acc => acc.holders_id === holder.id);
    holderAccounts.forEach(acc => {
      // Sum all monthly cash flows for this holder/account
      const amount = cashFlows
        .filter(cf => cf.holders_id === holder.id && cf.accounts_id === acc.id)
        .reduce((sum, cf) => sum + (cf.monthly || 0), 0);
      if (amount !== 0) {
        transferRows.push({
          holderName: holder.name,
          bankInfo: `${acc.bank} - ${acc.accountNumber}`,
          amount
        });
      }
    });
  });
  transferRows = transferRows.sort((a, b) => {
    const nameCompare = a.holderName.localeCompare(b.holderName);
    if (nameCompare !== 0) return nameCompare;
    return b.amount - a.amount;
  });
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
    const totalMonthlyIncome = await db.income.toArray().then(incomes => incomes.reduce((sum, item) => sum + Number(item.monthly), 0));
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
        total: totalMonthlyIncome
      }));
  }) || [];

  const withPercentage = ['Need', 'Savings', 'Want'].map((key) => {
    const item = expensesByPurpose.find((i) => i.id === key);
    if (!item) return null;
    const percentage = (item.value / item.total) * 100;
    let isValid = true;
    let rule = "";

    if (key === "Need") {
      rule = "≤ 50%";
      if (percentage > 50) isValid = false;
    }
    if (key === "Want") {
      rule = "≤ 20%";
      if (percentage > 20) isValid = false;
    }
    if (key === "Savings") {
      rule = "≥ 30%";
      if (percentage < 30) isValid = false;
    }

    return { ...item, percentage, isValid, rule };
  }).filter(Boolean);

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

  const Gauge = ({ label, percentage, rule, isValid, value }: { label: string; percentage: number; rule: string; isValid: boolean; value: number }) => {
    const data = [{ value: percentage }, { value: 100 - percentage }];
    return (
      <Card className="text-center p-3 shadow-sm">
        <Card.Body>
          <Card.Title>{label}</Card.Title>
          <div style={{ width: "100%", height: 180 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={data}
                  startAngle={180}
                  endAngle={0}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={0}
                  dataKey="value"
                >
                  <Cell fill={isValid ? "#28a745" : "#dc3545"} /> {/* actual */}
                  <Cell fill="#e9ecef" /> {/* remainder */}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <h5 className={isValid ? "text-success" : "text-danger"}>
            {percentage.toFixed(1)}% | {`₹${value.toLocaleString("en-IN", {
              maximumFractionDigits: 2
            })}`}
          </h5>
          <small className="text-muted">Rule: {rule}</small>
        </Card.Body>
      </Card>
    );
  };

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
          <Col md={12}>
            <Card className="mb-4">
              <Card.Header as="h6">Monthly Income (<span className="text-danger">₹{withPercentage[0]?.total.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>) vs Expense Categories vs <strong>50:30:20</strong> Rule</Card.Header>
              <Card.Body>
                <Card.Title></Card.Title>
                <Row xs={1} md={3} className="g-4">
                  {withPercentage.map((item) => (
                    <Col key={item!.id}>
                      <Gauge {...item!} />
                    </Col>
                  ))}
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
          {/* Monthly Holder Accounts Transfer Table */}
        <Row>
          <Col md={12}>
            <Card className="mb-4">
              <Card.Header as="h6">Monthly Family Member Accounts Transfer</Card.Header>
              <Card.Body>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ border: "1px solid #ccc", padding: "8px" }}>Member Name</th>
                      <th style={{ border: "1px solid #ccc", padding: "8px" }}>Bank Info</th>
                      <th style={{ border: "1px solid #ccc", padding: "8px" }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transferRows.length === 0 ? (
                      <tr><td colSpan={3} style={{ textAlign: "center", padding: "16px" }}>No transfers found</td></tr>
                    ) : (
                      transferRows.map((row, idx) => (
                        <tr key={idx}>
                          <td style={{ border: "1px solid #ccc", padding: "8px" }}>{row.holderName}</td>
                          <td style={{ border: "1px solid #ccc", padding: "8px" }}>{row.bankInfo}</td>
                          <td style={{ border: "1px solid #ccc", padding: "8px" }}>₹{row.amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </Card.Body>
            </Card>
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
                        label={({ value, percent = 0 }) => `${(percent * 100).toFixed(1)}% | ₹${value?.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`}
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
                        label={({ value, percent = 0 }) => `${(percent * 100).toFixed(1)}% | ₹${value?.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`}
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
                        label={({ value, percent = 0 }) => `${(percent * 100).toFixed(1)}% | ₹${value?.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`}
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
      </div>
    </Container>
  );
}
