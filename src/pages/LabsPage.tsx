import { useState } from "react";
import { Container, Tab, Tabs, Row, Col } from "react-bootstrap";
import REITsPage from "./REITsPage";
import GoldRateCard from "../components/GoldRateCard";
import GoldCalculator from "../components/GoldCalculator";

export default function LabsPage() {
  const [key, setKey] = useState<string>("reits");

  return (
    <Container fluid className="flex-grow-1 overflow-auto">
      <Tabs
        id="labs-tabs"
        activeKey={key}
        onSelect={(k) => setKey(k || "reits")}
        className="mb-4"
      >
        <Tab eventKey="reits" title="REITs Simulator">
          <REITsPage />
        </Tab>
        <Tab eventKey="gold" title="Gold Rates">
            <Row className="g-4">
                <Col md={6}>
                    <GoldRateCard />
                </Col>
                <Col md={6}>
                    <GoldCalculator />
                </Col>
            </Row>
        </Tab>
      </Tabs>
    </Container>
  );
}
