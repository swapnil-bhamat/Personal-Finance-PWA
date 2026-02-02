import { useEffect, useState } from "react";
import { Card, Button, Spinner, Row, Col, Form, InputGroup } from "react-bootstrap";
import { fetchGoldData, GoldData, fetchSilverData, SilverData, getDailyUsageCount } from "../services/marketData";
import { toLocalCurrency } from "../utils/numberUtils";
import { FaSync, FaCog, FaEye, FaEyeSlash } from "react-icons/fa";
import { saveAppConfig, getAppConfig, CONFIG_KEYS } from "../services/configService";

export default function GoldRateCard() {
  const [data, setData] = useState<GoldData | null>(null);
  const [silverData, setSilverData] = useState<SilverData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [city, setCity] = useState("Nagpur");
  const [dailyLimit, setDailyLimit] = useState("3");
  const [monthlyLimit, setMonthlyLimit] = useState("100");
  
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [requestsToday, setRequestsToday] = useState(0);

  const loadData = async (force = false) => {
    setLoading(true);
    let errorMsg: string | null = null;
    
    try {
      // Use results from successful calls
      let goldRes: GoldData | null = null;
      let silverRes: SilverData | null = null;

      try {
        goldRes = await fetchGoldData(force);
        if (goldRes) setData(goldRes);
      } catch (err) {
        errorMsg = (err as Error).message;
      }

      try {
        silverRes = await fetchSilverData(force);
        if (silverRes) setSilverData(silverRes);
      } catch (err) {
        if (!errorMsg) errorMsg = (err as Error).message;
      }
      
      setRequestsToday(getDailyUsageCount());

      setError(errorMsg);
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const key = await getAppConfig(CONFIG_KEYS.GOLD_API_KEY);
    const savedCity = await getAppConfig(CONFIG_KEYS.GOLD_API_CITY);
    const savedDailyLimit = await getAppConfig(CONFIG_KEYS.GOLD_API_DAILY_LIMIT);
    const savedMonthlyLimit = await getAppConfig(CONFIG_KEYS.GOLD_API_MONTHLY_LIMIT);
    
    if (key) setApiKey(key);
    if (savedCity) setCity(savedCity);
    if (savedDailyLimit) setDailyLimit(savedDailyLimit);
    if (savedMonthlyLimit) setMonthlyLimit(savedMonthlyLimit);
  };

  const handleSaveKey = async () => {
    setIsSaving(true);
    try {
      await saveAppConfig(CONFIG_KEYS.GOLD_API_KEY, apiKey);
      await saveAppConfig(CONFIG_KEYS.GOLD_API_CITY, city);
      await saveAppConfig(CONFIG_KEYS.GOLD_API_DAILY_LIMIT, dailyLimit);
      await saveAppConfig(CONFIG_KEYS.GOLD_API_MONTHLY_LIMIT, monthlyLimit);
      
      setShowSettings(false);
      loadData(true); // Refresh data with new settings
    } catch (e) {
      console.error("Failed to save settings", e);
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <Card className="shadow h-100">

      <Card.Header className="d-flex justify-content-between align-items-center">
         <div className="d-flex align-items-center gap-2">
            <strong>Commodity Rates</strong>
            {data?.city && <span className="badge bg-secondary">{data.city}</span>}
        </div>
        <div className="d-flex gap-2">
            <Button
            variant="link"
            className="p-0 text-muted"
            onClick={() => setShowSettings(!showSettings)}
            title="Settings"
            >
            <FaCog />
            </Button>
            <Button
            variant="link"
            className="p-0"
            onClick={() => loadData(true)}
            disabled={loading}
            title="Refresh Rates"
            >
            {loading ? <Spinner animation="border" size="sm" /> : <FaSync />}
            </Button>
        </div>
      </Card.Header>
      <Card.Body>
        {showSettings ? (
            <div className="p-2">
                <Form.Group className="mb-3">
                    <Form.Label>RapidAPI Key</Form.Label>
                    <InputGroup>
                        <Form.Control
                            type={showKey ? "text" : "password"}
                            placeholder="Enter RapidAPI Key"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                        />
                        <Button variant="outline-secondary" onClick={() => setShowKey(!showKey)}>
                            {showKey ? <FaEyeSlash /> : <FaEye />}
                        </Button>
                    </InputGroup>
                    <Form.Text className="text-muted d-block mt-2">
                        Subscribe to <a href="https://rapidapi.com/messy.programmer/api/indian-gold-and-silver-price/" target="_blank" rel="noopener noreferrer">Indian Gold and Silver Price</a> on RapidAPI.
                    </Form.Text>
                </Form.Group>
                
                <Form.Group className="mb-3">
                    <Form.Label>City</Form.Label>
                    <Form.Control
                        type="text"
                        placeholder="Nagpur"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                    />
                </Form.Group>

                <Row>
                    <Col xs={6}>
                        <Form.Group className="mb-3">
                            <Form.Label>Daily Limit</Form.Label>
                            <Form.Control
                                type="number"
                                placeholder="3"
                                value={dailyLimit}
                                onChange={(e) => setDailyLimit(e.target.value)}
                            />
                        </Form.Group>
                    </Col>
                    <Col xs={6}>
                        <Form.Group className="mb-3">
                            <Form.Label>Monthly Limit</Form.Label>
                            <Form.Control
                                type="number"
                                placeholder="100"
                                value={monthlyLimit}
                                onChange={(e) => setMonthlyLimit(e.target.value)}
                            />
                        </Form.Group>
                    </Col>
                </Row>

                <div className="d-flex justify-content-end gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setShowSettings(false)}>Cancel</Button>
                    <Button variant="primary" size="sm" onClick={handleSaveKey} disabled={isSaving}>
                        {isSaving ? <Spinner size="sm" animation="border" /> : "Save"}
                    </Button>
                </div>
            </div>
        ) : (
            <>
        {error && <div className="text-danger mb-2 small">{error}</div>}
        
        {!data && !loading && !error && (
            <div className="text-center py-4">
                {!apiKey ? (
                     <p className="text-muted px-3">
                        Click on Settings icon <FaCog className="mb-1"/> to configure API key.
                     </p>
                ) : (
                    <p className="text-muted mb-3">No data available.</p>
                )}
            </div>
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
            </>
        )}
      </Card.Body>
      
      <Card.Footer className="text-muted small">
            <div className="d-flex justify-content-between">
                <div>
                   {(() => {
                        const dL = parseInt(dailyLimit) || 3;
                        const mL = parseInt(monthlyLimit) || 100;
                        const used = requestsToday;
                        const isLow = used >= dL;
                        return (
                            <span className={isLow ? "text-danger fw-bold" : ""}>
                                Usage: {used}/{dL} (Day) | Limit: {mL} (Mo)
                            </span>
                        );
                   })()}
                </div>
                <div>
                    Updated: {formatDate((data || silverData)?.timestamp || 0)}
                </div>
            </div>
      </Card.Footer>
    </Card>
  );
}
