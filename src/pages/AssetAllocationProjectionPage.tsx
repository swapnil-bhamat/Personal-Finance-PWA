import { useState, FormEvent } from "react";
import type { AssetProjection } from "../services/db";
import { db } from "../services/db";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import Table from "react-bootstrap/Table";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Alert from "react-bootstrap/Alert";
import Card from "react-bootstrap/Card";
import { useLiveQuery } from "dexie-react-hooks";
import { BsPencil } from "react-icons/bs";
import { toLocalCurrency } from "../utils/numberUtils";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Badge } from "react-bootstrap";

interface ProjectionData extends AssetProjection {
  assetSubClassName: string;
  expectedReturns: number;
  currentAllocation: number;
  currentMonthlyInvestment: number;
  projectedValue: number;
}

interface FormData {
  newMonthlyInvestment: number;
  lumpsumExpected: number;
  redemptionExpected: number;
  comment: string;
}

export default function AssetAllocationProjectionPage() {
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ProjectionData | null>(
    null
  );
  const [formData, setFormData] = useState<FormData>({
    newMonthlyInvestment: 0,
    lumpsumExpected: 0,
    redemptionExpected: 0,
    comment: "",
  });
  const [alert, setAlert] = useState<{
    type: "success" | "danger";
    message: string;
  } | null>(null);

  // Fetch all required data
  const assetSubClasses = useLiveQuery(() => db.assetSubClasses.toArray());
  const assetsHoldings = useLiveQuery(() => db.assetsHoldings.toArray());
  const assetsProjection = useLiveQuery(() => db.assetsProjection.toArray());

  // Combine data for display
  const projectionData: ProjectionData[] = useLiveQuery(
    async () => {
      if (!assetSubClasses || !assetsHoldings || !assetsProjection) return [];

      const getAssetSubClass = (id: number) =>
        assetSubClasses.find((asc) => asc.id === id);

      const getCurrentAllocation = (assetSubClassId: number) =>
        assetsHoldings
          .filter((ah) => ah.assetSubClasses_id === assetSubClassId)
          .reduce((sum, ah) => sum + ah.existingAllocation, 0);

      const getCurrentMonthlyInvestment = (assetSubClassId: number) =>
        assetsHoldings
          .filter((ah) => ah.assetSubClasses_id === assetSubClassId)
          .reduce((sum, ah) => sum + (ah.sip || 0), 0);

      // Calculate projected value for each asset
      const calculateProjectedValue = (
        currentAllocation: number,
        newMonthly: number,
        lumpsum: number,
        redemption: number,
        expectedReturns: number
      ) => {
        const monthlyReturn = expectedReturns / 12 / 100;
        const totalMonthlyInvestment = newMonthly;
        const years = 1; // Projection for 1 year

        // Future value of current allocation
        const futureValue =
          currentAllocation * Math.pow(1 + expectedReturns / 100, years);

        // Future value of monthly investments (current + new)
        const monthlyFV =
          totalMonthlyInvestment *
          ((Math.pow(1 + monthlyReturn, years * 12) - 1) / monthlyReturn);

        // Add lumpsum investment with its growth
        const lumpsumFV = lumpsum * Math.pow(1 + expectedReturns / 100, years);

        // Subtract redemption
        return futureValue + monthlyFV + lumpsumFV - redemption;
      };

      return assetsProjection.map((ap) => {
        const subClass = getAssetSubClass(ap.assetSubClasses_id);
        const currentAllocation = getCurrentAllocation(ap.assetSubClasses_id);
        const currentMonthlyInvestment = getCurrentMonthlyInvestment(
          ap.assetSubClasses_id
        );

        return {
          ...ap,
          assetSubClassName: subClass?.name || "Unknown",
          expectedReturns: subClass?.expectedReturns || 0,
          currentAllocation,
          currentMonthlyInvestment,
          projectedValue: calculateProjectedValue(
            currentAllocation,
            ap.newMonthlyInvestment,
            ap.lumpsumExpected,
            ap.redemptionExpected,
            subClass?.expectedReturns || 0
          ),
        };
      });
    },
    [assetSubClasses, assetsHoldings, assetsProjection],
    []
  );

  const handleEdit = (record: ProjectionData) => {
    setEditingRecord(record);
    setFormData({
      newMonthlyInvestment: record.newMonthlyInvestment,
      lumpsumExpected: record.lumpsumExpected,
      redemptionExpected: record.redemptionExpected,
      comment: record.comment || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (editingRecord) {
        await db.assetsProjection.update(editingRecord.id, formData);
        setAlert({
          type: "success",
          message: "Projection updated successfully",
        });
      }
      setShowModal(false);
      setFormData({
        newMonthlyInvestment: 0,
        lumpsumExpected: 0,
        redemptionExpected: 0,
        comment: "",
      });
      setEditingRecord(null);
    } catch (error) {
      setAlert({ type: "danger", message: "Failed to update projection" });
      console.error(error);
    }
  };

  // Prepare data for pie charts
  const CURRENT_COLORS = [
    "#1f77b4", // blue
    "#2ca02c", // green
    "#ff7f0e", // orange
    "#d62728", // red
    "#9467bd", // purple
    "#8c564b", // brown
    "#e377c2", // pink
    "#7f7f7f", // gray
    "#bcbd22", // olive
    "#17becf", // cyan
  ];

  const PROJECTED_COLORS = [
    "#3498db", // light blue
    "#27ae60", // light green
    "#f39c12", // light orange
    "#e74c3c", // light red
    "#9b59b6", // light purple
    "#795548", // light brown
    "#ff69b4", // light pink
    "#95a5a6", // light gray
    "#cddc39", // light olive
    "#00bcd4", // light cyan
  ];

  const prepareChartData = () => {
    return (
      projectionData?.map((record) => ({
        name: record.assetSubClassName,
        currentValue: record.currentAllocation,
        projectedValue: Number(record.projectedValue),
      })) || []
    ).filter((item) => item.currentValue > 0 || item.projectedValue > 0);
  };

  const chartData = prepareChartData();
  const totalCurrent = chartData.reduce(
    (sum, item) => sum + item.currentValue,
    0
  );
  const totalProjected = chartData.reduce(
    (sum, item) => sum + item.projectedValue,
    0
  );

  // Calculate CAGR
  const calculateCAGR = () => {
    if (totalCurrent <= 0) return 0;
    const years = 1; // Since we're projecting for 1 year
    return (Math.pow(totalProjected / totalCurrent, 1 / years) - 1) * 100;
  };

  const cagr = calculateCAGR();

  const CustomPieChartLabel = function (props: { [key: string]: any }) {
    const cx = props.cx ?? 0;
    const cy = props.cy ?? 0;
    const midAngle = props.midAngle ?? 0;
    const innerRadius = props.innerRadius ?? 0;
    const outerRadius = props.outerRadius ?? 0;
    const percent = props.percent ?? 0;
    if (!percent || percent <= 0.05) return null;

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Container fluid className="flex-grow-1 overflow-auto">
      {alert && (
        <Alert variant={alert.type} onClose={() => setAlert(null)} dismissible>
          {alert.message}
        </Alert>
      )}

      <Row className="mb-2">
        <Col md={6} className="mb-2">
          <Card className="h-100 shadow">
            <Card.Header as="h5">Current Allocation Projection</Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="currentValue"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={CustomPieChartLabel}
                  >
                    {chartData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CURRENT_COLORS[index % CURRENT_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => toLocalCurrency(value as number)}
                  />
                  <Legend
                    className="d-none d-lg-block"
                    formatter={(value) => {
                      const item = chartData.find((d) => d.name === value);
                      return item?.currentValue ? value : "";
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <p className="text-center"></p>
            </Card.Body>
            <Card.Footer className="text-center">
              <strong>Total: {toLocalCurrency(totalCurrent)}</strong>
            </Card.Footer>
          </Card>
        </Col>
        <Col md={6} className="mb-2">
          <Card className="h-100 shadow">
            <Card.Header as="h5">Projected Allocation</Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="projectedValue"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={CustomPieChartLabel}
                  >
                    {chartData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PROJECTED_COLORS[index % PROJECTED_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => toLocalCurrency(value as number)}
                  />
                  <Legend
                    className="d-none d-lg-block"
                    formatter={(value) => {
                      const item = chartData.find((d) => d.name === value);
                      return item?.projectedValue ? value : "";
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <p className="text-center"></p>
            </Card.Body>
            <Card.Footer className="text-center">
              <strong>Total: {toLocalCurrency(totalProjected)}</strong>
              {"  "}
              <Badge bg={cagr >= 0 ? "success" : "danger"}>
                CAGR: {cagr.toFixed(2)}%
              </Badge>
            </Card.Footer>
          </Card>
        </Col>
      </Row>
      {/* Table View */}
      {/* Mobile Card View */}
      <div className="d-lg-none">
        {projectionData?.map((record: ProjectionData) => (
          <Card key={record.id} className="mb-3 shadow-sm">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <h6 className="mb-1">{record.assetSubClassName}</h6>
                  <div className="small text-muted">
                    Expected Returns: {record.expectedReturns}%
                  </div>
                </div>
                <Button
                  variant="outline-primary"
                  size="sm"
                  className="d-flex align-items-center gap-1"
                  onClick={() => handleEdit(record)}
                >
                  <BsPencil size={14} />
                  <span>Edit</span>
                </Button>
              </div>

              <Row className="g-3">
                <Col xs={6}>
                  <div className="small text-muted">Current Allocation</div>
                  <div className="fw-bold text-success">
                    {toLocalCurrency(record.currentAllocation)}
                  </div>
                </Col>
                <Col xs={6}>
                  <div className="small text-muted">Projected Value</div>
                  <div className="fw-bold text-success">
                    {toLocalCurrency(record.projectedValue)}
                  </div>
                </Col>
                <Col xs={6}>
                  <div className="small text-muted">Current Monthly</div>
                  <div className="fw-bold text-success">
                    {toLocalCurrency(record.currentMonthlyInvestment)}
                  </div>
                </Col>
                <Col xs={6}>
                  <div className="small text-muted">New Monthly</div>
                  <div className="fw-bold text-warning">
                    {toLocalCurrency(record.newMonthlyInvestment)}
                  </div>
                </Col>
                <Col xs={6}>
                  <div className="small text-muted">Lumpsum Expected</div>
                  <div className="fw-bold text-warning">
                    {toLocalCurrency(record.lumpsumExpected)}
                  </div>
                </Col>
                <Col xs={6}>
                  <div className="small text-muted">Redemption Expected</div>
                  <div className="fw-bold text-warning">
                    {toLocalCurrency(record.redemptionExpected)}
                  </div>
                </Col>
              </Row>

              {record.comment && (
                <div className="mt-3 pt-3 border-top">
                  <div className="small text-muted mb-1">Comment</div>
                  <div className="fw-bold text-warning">{record.comment}</div>
                </div>
              )}
            </Card.Body>
          </Card>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="d-none d-lg-block">
        <Table striped bordered hover>
          <thead className="table-dark">
            <tr>
              <th>Asset Sub Class</th>
              <th>Expected Returns (%)</th>
              <th>Current Allocation</th>
              <th>Current Monthly Investment</th>
              <th>New Monthly Investment</th>
              <th>Lumpsum Expected</th>
              <th>Redemption Expected</th>
              <th>Comment</th>
              <th>Projected Value</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {projectionData?.map((record: ProjectionData) => (
              <tr key={record.id}>
                <td>{record.assetSubClassName}</td>
                <td>{record.expectedReturns}</td>
                <td className="align-middle fw-bold text-success fs-6">
                  {toLocalCurrency(record.currentAllocation)}
                </td>
                <td className="align-middle fw-bold text-success fs-6">
                  {toLocalCurrency(record.currentMonthlyInvestment)}
                </td>
                <td className="align-middle fw-bold text-warning fs-6">
                  {toLocalCurrency(record.newMonthlyInvestment)}
                </td>
                <td className="align-middle fw-bold text-warning fs-6">
                  {toLocalCurrency(record.lumpsumExpected)}
                </td>
                <td className="align-middle fw-bold text-warning fs-6">
                  {toLocalCurrency(record.redemptionExpected)}
                </td>
                <td className="text-warning fw-bold fs-6">{record.comment}</td>
                <td className="align-middle fw-bold text-success fs-6">
                  {toLocalCurrency(record.projectedValue)}
                </td>
                <td>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    className="d-flex align-items-center gap-1"
                    onClick={() => handleEdit(record)}
                  >
                    <BsPencil size={14} />
                    <span>Edit</span>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Projection</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>New Monthly Investment</Form.Label>
              <Form.Control
                type="number"
                value={formData.newMonthlyInvestment}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    newMonthlyInvestment: Number(e.target.value),
                  }))
                }
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Lumpsum Expected</Form.Label>
              <Form.Control
                type="number"
                value={formData.lumpsumExpected}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    lumpsumExpected: Number(e.target.value),
                  }))
                }
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Redemption Expected</Form.Label>
              <Form.Control
                type="number"
                value={formData.redemptionExpected}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    redemptionExpected: Number(e.target.value),
                  }))
                }
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Comment</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={formData.comment}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    comment: e.target.value,
                  }))
                }
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Close
            </Button>
            <Button variant="primary" type="submit">
              Save Changes
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
}
