import {
  Container,
  Row,
  Col,
  Table,
  Card,
  OverlayTrigger,
  Tooltip,
} from "react-bootstrap";
import {
  BsGraphUp,
  BsInfoCircle,
  BsCheckCircleFill,
  BsExclamationTriangleFill,
  BsWallet2,
  BsCashCoin,
  BsCalendar3,
} from "react-icons/bs";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../services/db";
import { useDashboardData } from "../hooks/useDashboardData";
import { toLocalCurrency } from "../utils/numberUtils";

const SwpPage: React.FC = () => {
  const userConfig =
    useLiveQuery(async () => {
      const configs = await db.configs.toArray();
      return configs.map((config) => ({
        [config.key]: config.value,
      }));
    })?.reduce((acc, curr) => ({ ...acc, ...curr }), {}) || {};

  const dob = String(userConfig["date-of-birth"]); // Format: DD-MM-YYYY
  const age = dob
    ? Math.floor(
        (new Date().getTime() -
          new Date(dob.split("-").reverse().join("-")).getTime()) /
          (1000 * 60 * 60 * 24 * 365.25)
      )
    : 35;

  const inflationRate = Number(userConfig["inflation-rate"]) || 6.5;
  const lifeExpectancy = Number(userConfig["life-expectancy"] || 100);

  const { withPercentage, assetAllocationByBucket } = useDashboardData();
  const needPerMonth =
    withPercentage.filter((a) => a?.id === "Need")[0]?.value ?? 0;
  const shortTermBucketValue =
    assetAllocationByBucket.filter((a) => a?.label === "Short Term")[0]
      ?.value ?? 0;
  const longTermBucketValue =
    assetAllocationByBucket.filter((a) => a?.label === "Long Term")[0]?.value ??
    0;
  const totalAllocatedValue = shortTermBucketValue + longTermBucketValue;
  const swpValuePerYear = Math.floor(totalAllocatedValue * 0.035);
  const swpValuePerMonth = Math.floor(swpValuePerYear / 12);
  const gapPerMonth = needPerMonth - swpValuePerMonth;

  const shortTermBucketCorpusRequired = swpValuePerYear * 5;
  const longTermBucketCorpusRequired =
    totalAllocatedValue - shortTermBucketCorpusRequired;

  const swpParams = {
    age,
    inflationRate,
    lifeExpectancy,
    totalAllocatedValue,
    swpValuePerYear,
    swpValuePerMonth,
    gapPerMonth,
    shortTermBucketValue,
    shortTermBucketCorpusRequired,
    longTermBucketValue,
    longTermBucketCorpusRequired,
    avgShortTermXIRR: 6,
    avgLongTermXIRR: 12,
  };

  // ---------------- Projection Table Logic ----------------
  type ProjectionRow = {
    year: number;
    age: number;
    yearlyNeed: number;
    withdrawal: number;
    shortTermBucket: number;
    longTermBucket: number;
    depleted: boolean;
    status: "Covered" | "Partial" | "Corpus Exhausted";
  };

  const generateProjections = (): ProjectionRow[] => {
    const rows: ProjectionRow[] = [];
    let st = swpParams.shortTermBucketValue;
    let lt = swpParams.longTermBucketValue;
    let depletedFlag = false;

    for (let y = 0; y <= swpParams.lifeExpectancy - swpParams.age; y++) {
      const currentAge = swpParams.age + y;
      const yearlyNeed =
        swpParams.swpValuePerYear * (1 + swpParams.inflationRate / 100) ** y;

      // Step 1: Withdraw from Short-Term
      let withdrawal = Math.min(st, yearlyNeed);
      st -= withdrawal;

      // Step 2: If Shortfall, cover from Long-Term immediately
      if (withdrawal < yearlyNeed && lt > 0) {
        const refill = Math.min(lt, yearlyNeed - withdrawal);
        withdrawal += refill;
        lt -= refill;
      }

      // Step 3: Rebalancing (maintain 5x yearly need in ST if possible)
      const requiredST = yearlyNeed * 5;
      if (st < requiredST && lt > 0) {
        const transfer = Math.min(lt, requiredST - st);
        st += transfer;
        lt -= transfer;
      }

      // Optional: If ST > requiredST, move some back to LT
      if (st > requiredST) {
        const excess = st - requiredST;
        st -= excess;
        lt += excess;
      }

      // Step 4: Apply growth for next year
      if (st > 0) st = st * (1 + swpParams.avgShortTermXIRR / 100);
      if (lt > 0) lt = lt * (1 + swpParams.avgLongTermXIRR / 100);

      // Step 5: Check depletion
      if (!depletedFlag && st <= 0 && lt <= 0) {
        depletedFlag = true;
      }

      let status: ProjectionRow["status"] = "Covered";
      if (withdrawal < yearlyNeed) status = "Partial";
      if (depletedFlag) status = "Corpus Exhausted";

      rows.push({
        year: y,
        age: currentAge,
        yearlyNeed: Math.round(yearlyNeed),
        withdrawal: Math.round(withdrawal),
        shortTermBucket: Math.max(0, Math.round(st)),
        longTermBucket: Math.max(0, Math.round(lt)),
        depleted: depletedFlag,
        status,
      });

      if (depletedFlag) break;
    }
    return rows;
  };

  const projections = generateProjections();
  const lastProjection = projections[projections.length - 1];
  const totalWithdrawals = projections.reduce(
    (sum, r) => sum + r.withdrawal,
    0
  );

  const sustainabilityMessage = !lastProjection?.depleted
    ? `Portfolio sustains till age ${swpParams.lifeExpectancy}`
    : `Corpus runs out at age ${lastProjection.age}`;

  return (
    <Container fluid className="py-4 h-100 overflow-auto">
      {/* Parameters Section */}
      <Row className="mb-4">
        <Col lg={12}>
          <Card>
            <Card.Header>
              <BsInfoCircle className="me-2" /> Parameters Considered
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={4}>
                  <BsCalendar3 className="me-2 text-primary" /> Age:{" "}
                  <strong>{swpParams.age}</strong>
                </Col>
                <Col md={4}>
                  <BsCalendar3 className="me-2 text-primary" /> Life Expectancy:{" "}
                  <strong>{swpParams.lifeExpectancy}</strong> yrs
                </Col>
                <Col md={4}>
                  <BsCashCoin className="me-2 text-success" /> Inflation Rate:{" "}
                  <strong>{swpParams.inflationRate}%</strong>
                </Col>
              </Row>
              <Row className="mt-2">
                <Col md={4}>
                  <OverlayTrigger
                    overlay={<Tooltip>Safe Withdrawal Rate</Tooltip>}
                  >
                    <span>
                      <BsWallet2 className="me-2 text-warning" /> SWR:{" "}
                      <strong>3.5%</strong>
                    </span>
                  </OverlayTrigger>
                </Col>
                <Col md={4}>
                  <BsGraphUp className="me-2 text-success" /> Short-Term XIRR:{" "}
                  <strong>{swpParams.avgShortTermXIRR}%</strong>
                </Col>
                <Col md={4}>
                  <BsGraphUp className="me-2 text-success" /> Long-Term XIRR:{" "}
                  <strong>{swpParams.avgLongTermXIRR}%</strong>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Rebalancing Overview */}
      <Row className="mb-4">
        <Col lg={12}>
          <Card>
            <Card.Header>
              <BsWallet2 className="me-2" /> Rebalancing Overview
            </Card.Header>
            <Card.Body>
              <Table striped bordered hover>
                <thead className="table-dark">
                  <tr>
                    <th>Metric</th>
                    <th>Current</th>
                    <th>Required</th>
                    <th>Gap</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Need vs SWP (Monthly)</td>
                    <td>{toLocalCurrency(needPerMonth)}</td>
                    <td>{toLocalCurrency(swpParams.swpValuePerMonth)}</td>
                    <td>{toLocalCurrency(gapPerMonth)}</td>
                    <td>
                      {gapPerMonth > 0 ? (
                        <span className="text-danger">
                          <BsExclamationTriangleFill /> Shortfall
                        </span>
                      ) : (
                        <span className="text-success">
                          <BsCheckCircleFill /> Covered
                        </span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td>Short-Term Bucket</td>
                    <td>{toLocalCurrency(swpParams.shortTermBucketValue)}</td>
                    <td>
                      {toLocalCurrency(swpParams.shortTermBucketCorpusRequired)}
                    </td>
                    <td>
                      {toLocalCurrency(
                        swpParams.shortTermBucketValue -
                          swpParams.shortTermBucketCorpusRequired
                      )}
                    </td>
                    <td>
                      {swpParams.shortTermBucketValue <
                      swpParams.shortTermBucketCorpusRequired ? (
                        <span className="text-danger">
                          <BsExclamationTriangleFill /> Needs Rebalancing
                        </span>
                      ) : (
                        <span className="text-success">
                          <BsCheckCircleFill /> Adequate
                        </span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td>Long-Term Bucket</td>
                    <td>{toLocalCurrency(swpParams.longTermBucketValue)}</td>
                    <td>
                      {toLocalCurrency(swpParams.longTermBucketCorpusRequired)}
                    </td>
                    <td>
                      {toLocalCurrency(
                        swpParams.longTermBucketValue -
                          swpParams.longTermBucketCorpusRequired
                      )}
                    </td>
                    <td>
                      {swpParams.longTermBucketValue <
                      swpParams.longTermBucketCorpusRequired ? (
                        <span className="text-danger">
                          <BsExclamationTriangleFill /> Needs Rebalancing
                        </span>
                      ) : (
                        <span className="text-success">
                          <BsCheckCircleFill /> Adequate
                        </span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Sustainability Summary */}
      <Row className="mb-4">
        <Col lg={12}>
          <Card>
            <Card.Header>
              <BsGraphUp className="me-2" /> Sustainability Summary
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  {!lastProjection?.depleted ? (
                    <h6 className="text-success mb-0">
                      <BsCheckCircleFill className="me-2" />{" "}
                      {sustainabilityMessage}
                    </h6>
                  ) : (
                    <h6 className="text-danger mb-0">
                      <BsExclamationTriangleFill className="me-2" />{" "}
                      {sustainabilityMessage}
                    </h6>
                  )}
                </Col>
                <Col md={6}>
                  <h6>
                    Total Withdrawals Made:{" "}
                    <strong>{toLocalCurrency(totalWithdrawals)}</strong>
                  </h6>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Projection Table */}
      <Row>
        <Col lg={12}>
          <h4>Projection Table</h4>
          <div className="table-responsive">
            <Table striped bordered hover>
              <thead className="table-dark">
                <tr>
                  <th>Year</th>
                  <th>Age</th>
                  <th>Yearly Need (₹)</th>
                  <th>Withdrawal (₹)</th>
                  <th>Short Term Bucket (₹)</th>
                  <th>Long Term Bucket (₹)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {projections.map((row, idx) => (
                  <tr
                    key={row.year}
                    className={
                      row.depleted
                        ? "table-danger"
                        : idx === projections.length - 1
                        ? "table-secondary"
                        : ""
                    }
                  >
                    <td>{row.year}</td>
                    <td>{row.age}</td>
                    <td>{toLocalCurrency(row.yearlyNeed)}</td>
                    <td>{toLocalCurrency(row.withdrawal)}</td>
                    <td>{toLocalCurrency(row.shortTermBucket)}</td>
                    <td>{toLocalCurrency(row.longTermBucket)}</td>
                    <td>
                      {row.status === "Covered" && (
                        <span className="text-success">
                          <BsCheckCircleFill className="me-1" /> Covered
                        </span>
                      )}
                      {row.status === "Partial" && (
                        <span className="text-warning">
                          <BsExclamationTriangleFill className="me-1" /> Partial
                        </span>
                      )}
                      {row.status === "Corpus Exhausted" && (
                        <span className="text-danger">
                          <BsExclamationTriangleFill className="me-1" /> Corpus
                          Exhausted
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default SwpPage;
