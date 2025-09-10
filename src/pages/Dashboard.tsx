import { useDashboardData } from "../hooks/useDashboardData";
import { Container, Row, Col, Card, Table } from "react-bootstrap";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import Gauge from "../components/Gauge";
import CashFlowDiagram from "../components/CashFlowDiagram";
import { toLocalCurrency } from "../utils/numberUtils";
import { ImplicitLabelListType } from "recharts/types/component/LabelList";

export default function Dashboard() {
  const {
    cardData,
    withPercentage,
    transferRows,
    totalTransferAmount,
    savingsCashFlow,
    assetClassAllocation,
    assetAllocationByGoal,
    assetClassColors,
    assetGoalColors,
    savingsColors,
    assetAllocationByBucket,
  } = useDashboardData();

  const renderCustomizedLabel: ImplicitLabelListType = (props) => {
    const {
      cx = 0,
      cy = 0,
      midAngle = 0,
      innerRadius = 0,
      outerRadius = 0,
      percent = 0
    } = props as {
      cx: number | string;
      cy: number | string;
      midAngle: number;
      innerRadius: number;
      outerRadius: number;
      percent: number;
    };
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = Number(cx) + radius * Math.cos(-(midAngle ?? 0) * RADIAN);
    const y = Number(cy) + radius * Math.sin(-(midAngle ?? 0) * RADIAN);

    return <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > Number(cx) ? "start" : "end"}
        dominantBaseline="central"
      >
        {`${((percent ?? 1) * 100).toFixed(0)}%`}
      </text>;
  };

  return (
    <Container fluid className="py-4 h-100 overflow-auto">
      <div>
        {/* Cards */}
        <Row className="mb-4">
          {cardData.map((card) => (
            <Col key={card.title} md={4} className="mb-3 mb-md-0">
              <Card bg={card.bg} text={card.text} className="h-100 shadow">
                <Card.Header
                  as="h5"
                  className={`bg-${card.bg} text-${card.text}`}
                >
                  {card.title}
                </Card.Header>
                <Card.Body>
                  <Card.Text className="display-6">
                    {toLocalCurrency(card.value)}
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
        {/* 50:30:20 Rule Gauges */}
        <Row>
          <Col md={12}>
            <Card className="mb-4">
              <Card.Header as="h6">
                Monthly Income (
                <span className="text-danger">
                  {toLocalCurrency(withPercentage[0]?.total)}
                </span>
                ) vs Expense Categories vs{" "}
                <strong>
                  <a
                    href="https://blog.investyadnya.in/2018/12/06/50-30-20-rule-of-tracking-budget/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    50:30:20 Rule
                  </a>
                </strong>
              </Card.Header>
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
              <Card.Header as="h6">
                Monthly Family Member Accounts Transfer
              </Card.Header>
              <Card.Body>
                <Table striped bordered hover>
                  <thead className="table-dark">
                    <tr>
                      <th className="w-auto">Member Name</th>
                      <th className="w-auto">Bank Info</th>
                      <th className="w-auto">Amount</th>
                    </tr>
                  </thead>

                  {transferRows.length === 0 ? (
                    <tbody>
                      <tr>
                        <td colSpan={3} className="w-auto">
                          No transfers found
                        </td>
                      </tr>
                    </tbody>
                  ) : (
                    <tbody>
                      {transferRows.map((row, idx) => (
                        <tr key={idx}>
                          <td className="w-auto">{row.holderName}</td>
                          <td className="w-auto">{row.bankInfo}</td>
                          <td className="w-auto">
                            {toLocalCurrency(row.amount)}
                          </td>
                        </tr>
                      ))}
                      <tr key={"total"}>
                        <td colSpan={2} className="w-auto text-end">
                          <strong>Total</strong>
                        </td>
                        <td colSpan={1} className="w-auto">
                          <strong>
                            {toLocalCurrency(totalTransferAmount)}
                          </strong>
                        </td>
                      </tr>
                    </tbody>
                  )}
                </Table>
              </Card.Body>
            </Card>
          </Col>
        </Row>
        <Row>
          <Col md={12}>
            <CashFlowDiagram />
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
                        labelLine={false}
                        label={renderCustomizedLabel}
                      >
                        {savingsCashFlow.map((_, index) => (
                          <Cell
                            key={`cell-savings-${index}`}
                            fill={savingsColors[index % savingsColors.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => toLocalCurrency(value)}
                      />
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
                        labelLine={false}
                        label={renderCustomizedLabel}
                      >
                        {assetClassAllocation.map((_, index) => (
                          <Cell
                            key={`cell-ac-${index}`}
                            fill={
                              assetClassColors[index % assetClassColors.length]
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => toLocalCurrency(value)}
                      />
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
                        labelLine={false}
                        label={renderCustomizedLabel}
                      >
                        {assetAllocationByGoal.map((_, index) => (
                          <Cell
                            key={`cell-goal-${index}`}
                            fill={
                              assetGoalColors[index % assetGoalColors.length]
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => toLocalCurrency(value)}
                      />
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
            {assetAllocationByBucket.length > 0 && (
              <Card className="mb-4">
                <Card.Header as="h6">Asset Allocation by Buckets</Card.Header>
                <Card.Body style={{ height: 350 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={assetAllocationByBucket}
                        dataKey="value"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        labelLine={false}
                        label={renderCustomizedLabel}
                      >
                        {assetAllocationByBucket.map((_, index) => (
                          <Cell
                            key={`cell-savings-${index}`}
                            fill={
                              assetClassColors[index % assetClassColors.length]
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => toLocalCurrency(value)}
                      />
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
