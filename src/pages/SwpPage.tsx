import { Container, Row, Col } from "react-bootstrap";
import { BsGraphUp } from "react-icons/bs";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../services/db";
import { useDashboardData } from "../hooks/useDashboardData";

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
  const inflationRate = Number(userConfig["inflation-rate"]) || 0.06;
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
  const swpValuePerYear = Math.floor(totalAllocatedValue * 0.035); // 3.5% SWP Rule
  const swpValuePerMonth = Math.floor(swpValuePerYear / 12);
  const gapPerMonth = needPerMonth - swpValuePerMonth; // Need to cover from other sources
  const shortTermBucketCorpusRequired = swpValuePerYear * 5; // 5 years of expenses in short term bucket
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

  return (
    <Container fluid className="py-4 h-100 overflow-auto">
      <Row className="mb-4">
        <Col lg={12}>
          <h2>
            <BsGraphUp className="mb-1" /> Systematic Withdrawal Plan (SWP)
          </h2>
          <p className="text-muted">Based on 3.5% SWR and 2 Bucket strategy</p>
          <hr />
          <pre>{JSON.stringify(swpParams, null, 2)}</pre>
        </Col>
      </Row>
    </Container>
  );
};

export default SwpPage;
