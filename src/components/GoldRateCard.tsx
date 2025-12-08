import { useEffect, useState } from "react";
import { Card, Button, Spinner, Row, Col } from "react-bootstrap";
import { fetchGoldData, GoldData } from "../services/marketData";
import { toLocalCurrency } from "../utils/numberUtils";
import { FaSync } from "react-icons/fa";

export default function GoldRateCard() {
  const [data, setData] = useState<GoldData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchGoldData(force);
      if (result) {
        setData(result);
      } else {
        setError("Failed to load gold rates.");
      }
    } catch (err) {
      setError("An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <Card className="shadow h-100">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-2">
            <strong>Gold Rates</strong>
        </div>
        <Button
          variant="link"
          className="p-0"
          onClick={() => loadData(true)}
          disabled={loading}
          title="Refresh Rates"
        >
          {loading ? <Spinner animation="border" size="sm" /> : <FaSync />}
        </Button>
      </Card.Header>
      <Card.Body>
        {error && <div className="text-danger mb-2">{error}</div>}
        
        {!data && !loading && !error && (
            <div className="text-muted">No data available.</div>
        )}

        {data && (
          <Row className="g-3">
            <Col xs={6} className="text-center">
              <div className="p-2 border rounded bg-light-subtle">
                <div className="text-muted small">24K (Pure)</div>
                <div className="fs-5 fw-bold text-success">
                    {toLocalCurrency(data.price_gram_24k)}
                </div>
              </div>
            </Col>
            <Col xs={6} className="text-center">
              <div className="p-2 border rounded bg-light-subtle">
                <div className="text-muted small">22K (Standard)</div>
                <div className="fs-5 fw-bold text-success">
                    {toLocalCurrency(data.price_gram_22k)}
                </div>
              </div>
            </Col>
            <Col xs={6} className="text-center">
              <div className="p-2 border rounded bg-light-subtle">
                <div className="text-muted small">21K</div>
                <div className="fs-6 fw-semibold text-secondary">
                    {toLocalCurrency(data.price_gram_21k)}
                </div>
              </div>
            </Col>
            <Col xs={6} className="text-center">
              <div className="p-2 border rounded bg-light-subtle">
                <div className="text-muted small">18K</div>
                <div className="fs-6 fw-semibold text-secondary">
                    {toLocalCurrency(data.price_gram_18k)}
                </div>
              </div>
            </Col>
          </Row>
        )}
      </Card.Body>
      {data && (
        <Card.Footer className="text-muted small text-end">
          Updated: {formatDate(data.timestamp)}
        </Card.Footer>
      )}
    </Card>
  );
}
