import { useEffect, useState } from "react";
import { Card, Button, Spinner, Row, Col } from "react-bootstrap";
import { fetchGoldData, GoldData, fetchSilverData, SilverData } from "../services/marketData";
import { toLocalCurrency } from "../utils/numberUtils";
import { FaSync } from "react-icons/fa";

export default function GoldRateCard() {
  const [data, setData] = useState<GoldData | null>(null);
  const [silverData, setSilverData] = useState<SilverData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const [goldRes, silverRes] = await Promise.all([
        fetchGoldData(force),
        fetchSilverData(force)
      ]);

      if (goldRes) setData(goldRes);
      if (silverRes) setSilverData(silverRes);

      if (!goldRes && !silverRes) {
        setError("Failed to load commodity rates.");
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
            <strong>Commodity Rates</strong>
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
            <>
            <h6 className="text-secondary border-bottom pb-2">Gold (10g)</h6>
          <Row className="g-3">
            <Col xs={6} className="text-center">
              <div className="p-2 border rounded bg-light-subtle">
                <div className="text-muted small">24K (Pure)</div>
                <div className="fs-5 fw-bold text-success">
                    {toLocalCurrency(data.price_gram_24k * 10)}
                </div>
              </div>
            </Col>
            <Col xs={6} className="text-center">
              <div className="p-2 border rounded bg-light-subtle">
                <div className="text-muted small">22K (Standard)</div>
                <div className="fs-5 fw-bold text-success">
                    {toLocalCurrency(data.price_gram_22k * 10)}
                </div>
              </div>
            </Col>
            <Col xs={6} className="text-center">
              <div className="p-2 border rounded bg-light-subtle">
                <div className="text-muted small">21K</div>
                <div className="fs-6 fw-semibold text-secondary">
                    {toLocalCurrency(data.price_gram_21k * 10)}
                </div>
              </div>
            </Col>
            <Col xs={6} className="text-center">
              <div className="p-2 border rounded bg-light-subtle">
                <div className="text-muted small">18K</div>
                <div className="fs-6 fw-semibold text-secondary">
                    {toLocalCurrency(data.price_gram_18k * 10)}
                </div>
              </div>
            </Col>
          </Row>

          </>
        )}
        
        {silverData && (
            <>
            <h6 className="text-secondary border-bottom pb-2 mt-4">Silver (1kg)</h6>
            <Row className="g-3">
             <Col xs={12} className="text-center">
              <div className="p-2 border rounded bg-light-subtle d-flex justify-content-between align-items-center px-4">
                <div className="text-muted small">Silver (24K)</div>
                <div className="fs-5 fw-bold">
                    {toLocalCurrency(silverData.price_gram_24k * 1000)}
                </div>
              </div>
            </Col>
            </Row>
          </>
        )}
      </Card.Body>
      {(data || silverData) && (
        <Card.Footer className="text-muted small text-end">
          Updated: {formatDate((data || silverData)?.timestamp || 0)}
        </Card.Footer>
      )}
    </Card>
  );
}
