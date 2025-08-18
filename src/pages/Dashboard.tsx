

import { useDashboardData } from '../hooks/useDashboardData';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Gauge from '../components/Gauge';

export default function Dashboard() {
  const {
    cardData,
    withPercentage,
    transferRows,
    savingsCashFlow,
    assetClassAllocation,
    assetAllocationByGoal,
    assetClassColors,
    assetGoalColors,
    savingsColors
  } = useDashboardData();

  return (
    <Container fluid className="py-4 h-100 overflow-auto">
      <div>
        {/* Cards */}
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
        {/* 50:30:20 Rule Gauges */}
        <Row>
          <Col md={12}>
            <Card className="mb-4">
              <Card.Header as="h6">Monthly Income (<span className="text-danger">₹{withPercentage[0]?.total.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>) vs Expense Categories vs <strong>50:30:20</strong> Rule</Card.Header>
              <Card.Body>
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
        {/* Pie Charts */}
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
