import { useState, useMemo } from 'react';
import {
  Container,
  Row,
  Col,
  Form,
  Button,
  Card,
  Alert,
  Table,
  ProgressBar
} from 'react-bootstrap';
import {
  BsGraphUp,
  BsShield,
  BsWallet2,
  BsCheckCircle,
  BsExclamationTriangle,
  BsXCircle
} from 'react-icons/bs';

interface CalculationResult {
  year: number;
  age: number;
  bucket1Start: number;
  bucket2Start: number;
  bucket1Growth: number;
  bucket2Growth: number;
  sipContribution: number;
  bucket2ToB1Transfer: number;
  yearlyWithdrawal: number;
  bucket1End: number;
  bucket2End: number;
  totalAssets: number;
  inflationAdjustedExpenses: number;
  bucket2XIRRAchieved: boolean;
  bucket2ActualReturn: number;
  skippedYears: number;
  yearsTransferred: number;
  cumulativeReturn: number;
  status: 'success' | 'warning' | 'danger';
}

interface FormData {
  totalAssets: number;
  yearlyExpenses: number;
  currentAge: number;
  deathAge: number;
  withdrawalDate: string;
  sipAmount: number;
  sipYears: number;
}

const initialFormData: FormData = {
  totalAssets: 12200000,
  yearlyExpenses: 600000,
  currentAge: 35,
  deathAge: 100,
  withdrawalDate: '2025-08-01',
  sipAmount: 50000,
  sipYears: 5
};

const SwpPage: React.FC = () => {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [showResults, setShowResults] = useState(false);

  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: field === 'withdrawalDate' ? String(value) : Number(value)
    }));
  };

  const calculations = useMemo((): {
    results: CalculationResult[],
    isViable: boolean,
    totalYears: number,
    avgBucket2Return: number
  } => {
    const { totalAssets, yearlyExpenses, currentAge, deathAge, sipAmount, sipYears } = formData;
    
    const bucket1Initial: number = yearlyExpenses * 5;
    const bucket2Initial: number = totalAssets - bucket1Initial;
    
    if (bucket2Initial <= 0) {
      return { results: [], isViable: false, totalYears: 0, avgBucket2Return: 0 };
    }

    const indianEquityReturns: number[] = [
      0.18, -0.08, 0.25, 0.32, -0.12, 0.28, 0.15, -0.05, 0.22, 0.08,
      0.35, -0.15, 0.19, 0.42, -0.18, 0.31, 0.11, -0.02, 0.26, 0.06,
      0.29, -0.11, 0.16, 0.38, -0.09, 0.24, 0.14, 0.03, 0.20, 0.07,
      0.33, -0.13, 0.21, 0.27, -0.06, 0.17, 0.09, -0.04, 0.23, 0.12
    ];

    const results: CalculationResult[] = [];
    const totalYears = deathAge - currentAge;
    
    let bucket1Balance: number = bucket1Initial;
    let bucket2Balance: number = bucket2Initial;
    let currentExpenses: number = yearlyExpenses;
    let pendingTransfers: number = 0;
    let cumulativeReturn: number = 0;
    let bucket2Returns: number = 0;
    let skippedYears: number = 0;
    let yearsTransferred: number = 0;

    for (let year = 0; year < totalYears; year++) {
      const currentYear = new Date().getFullYear() + year;
      const currentUserAge = currentAge + year;
      
      const bucket1Start = bucket1Balance;
      const bucket2Start = bucket2Balance;
      
      // Bucket 1 growth (Fixed Income)
      const bucket1Growth = bucket1Balance * 0.06;
      bucket1Balance += bucket1Growth;
      
      // Bucket 2 growth (Equity)
      const equityReturnRate = indianEquityReturns[year % indianEquityReturns.length];
      const bucket2Growth = bucket2Balance * equityReturnRate;
      bucket2Balance += bucket2Growth;
      bucket2Returns += equityReturnRate;
      
      // SIP contribution
      let sipContribution = 0;
      if (year < sipYears) {
        sipContribution = sipAmount * 12;
        bucket2Balance += sipContribution;
      }
      
      // Inflation adjustment
      currentExpenses *= 1.06;
      
      // Transfer calculation
      let bucket2ToB1Transfer = 0;
      if (bucket1Balance < currentExpenses * 2) {
        const required = currentExpenses * 5 - bucket1Balance;
        if (bucket2Balance >= required) {
          bucket2ToB1Transfer = required;
          bucket2Balance -= required;
          bucket1Balance += required;
          yearsTransferred++;
        } else {
          pendingTransfers++;
        }
      }

      // Yearly withdrawal
      const yearlyWithdrawal = currentExpenses;
      if (bucket1Balance >= yearlyWithdrawal) {
        bucket1Balance -= yearlyWithdrawal;
      } else {
        skippedYears++;
      }

      const totalAssets = bucket1Balance + bucket2Balance;
      cumulativeReturn = (totalAssets - totalAssets) / totalAssets;

      let status: CalculationResult['status'] = 'success';
      if (pendingTransfers > 0) {
        status = pendingTransfers > 2 ? 'danger' : 'warning';
      }

      results.push({
        year: currentYear,
        age: currentUserAge,
        bucket1Start,
        bucket2Start,
        bucket1Growth,
        bucket2Growth,
        sipContribution,
        bucket2ToB1Transfer,
        yearlyWithdrawal,
        bucket1End: bucket1Balance,
        bucket2End: bucket2Balance,
        totalAssets,
        inflationAdjustedExpenses: currentExpenses,
        bucket2XIRRAchieved: equityReturnRate >= 0.12,
        bucket2ActualReturn: equityReturnRate,
        status,
        skippedYears,
        yearsTransferred,
        cumulativeReturn
      });
    }

    const avgBucket2Return = bucket2Returns / totalYears;
    const isViable = pendingTransfers <= 2 && skippedYears === 0;

    return { results, isViable, totalYears, avgBucket2Return };
  }, [formData]);

  const getStatusVariant = (status: CalculationResult['status']) => {
    switch (status) {
      case 'success': return 'success';
      case 'warning': return 'warning';
      case 'danger': return 'danger';
      default: return 'primary';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(value);
  };

  return (
  <Container fluid className="py-4">
      <div className="overflow-auto" style={{ maxHeight: '80vh' }}>
        <Row className="mb-4">
          <Col md={6} lg={4}>
            <Card className="mb-4">
              <Card.Header className="bg-primary text-white">
                Input Parameters
              </Card.Header>
              <Card.Body>
                <Form>
                  {/* ...existing input fields... */}
                  <Form.Group className="mb-3">
                    <Form.Label>Total Assets</Form.Label>
                    <Form.Control
                      type="number"
                      value={formData.totalAssets}
                      onChange={(e) => handleInputChange('totalAssets', e.target.value)}
                      min="0"
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Yearly Expenses</Form.Label>
                    <Form.Control
                      type="number"
                      value={formData.yearlyExpenses}
                      onChange={(e) => handleInputChange('yearlyExpenses', e.target.value)}
                      min="0"
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Current Age</Form.Label>
                    <Form.Control
                      type="number"
                      value={formData.currentAge}
                      onChange={(e) => handleInputChange('currentAge', e.target.value)}
                      min="0"
                      max={formData.deathAge}
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Expected Life Span</Form.Label>
                    <Form.Control
                      type="number"
                      value={formData.deathAge}
                      onChange={(e) => handleInputChange('deathAge', e.target.value)}
                      min={formData.currentAge}
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Withdrawal Start Date</Form.Label>
                    <Form.Control
                      type="date"
                      value={formData.withdrawalDate}
                      onChange={(e) => handleInputChange('withdrawalDate', e.target.value)}
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Monthly SIP Amount</Form.Label>
                    <Form.Control
                      type="number"
                      value={formData.sipAmount}
                      onChange={(e) => handleInputChange('sipAmount', e.target.value)}
                      min="0"
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>SIP Duration (Years)</Form.Label>
                    <Form.Control
                      type="number"
                      value={formData.sipYears}
                      onChange={(e) => handleInputChange('sipYears', e.target.value)}
                      min="0"
                    />
                  </Form.Group>
                  <Button
                    variant="primary"
                    onClick={() => setShowResults(true)}
                    className="w-100"
                  >
                    Calculate
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          </Col>
          {showResults && (
            <Col md={6} lg={8}>
              <Card className="mb-4">
                <Card.Header className="bg-success text-white">
                  Results Summary
                </Card.Header>
                <Card.Body>
                  <Row className="g-4">
                    <Col md={6}>
                      <Alert 
                        variant={calculations.isViable ? 'success' : 'danger'}
                        className="mb-0 h-100"
                      >
                        <Alert.Heading className="d-flex align-items-center">
                          {calculations.isViable ? (
                            <><BsCheckCircle className="me-2" /> Plan is Viable</>
                          ) : (
                            <><BsXCircle className="me-2" /> Plan Needs Adjustment</>
                          )}
                        </Alert.Heading>
                        <p className="mb-0">
                          {calculations.isViable
                            ? "Your withdrawal plan appears sustainable based on the given parameters."
                            : "The current plan may not be sustainable. Consider adjusting your parameters."}
                        </p>
                      </Alert>
                    </Col>
                    <Col md={6}>
                      <Card className="bg-light h-100">
                        <Card.Body>
                          <h6>Key Metrics</h6>
                          <div className="d-flex justify-content-between mb-2">
                            <span>Total Years:</span>
                            <strong>{calculations.totalYears}</strong>
                          </div>
                          <div className="d-flex justify-content-between mb-2">
                            <span>Average Return:</span>
                            <strong>{formatPercentage(calculations.avgBucket2Return)}</strong>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                  {/* Mobile table scrollable container */}
                  <div className="d-lg-none overflow-auto" style={{ maxHeight: '80vh' }}>
                    <div className="table-responsive mt-4">
                      <Table striped bordered hover>
                        <thead>
                          <tr>
                            <th>Year</th>
                            <th>Age</th>
                            <th>Bucket 1</th>
                            <th>Bucket 2</th>
                            <th>Total Assets</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {calculations.results.map((result) => (
                            <tr key={result.year}>
                              <td>{result.year}</td>
                              <td>{result.age}</td>
                              <td>
                                <div className="d-flex justify-content-between">
                                  <span>{formatCurrency(result.bucket1End)}</span>
                                  <small className={`text-${result.bucket1Growth > 0 ? 'success' : 'danger'}`}>
                                    {formatPercentage(result.bucket1Growth / result.bucket1Start)}
                                  </small>
                                </div>
                              </td>
                              <td>
                                <div className="d-flex justify-content-between">
                                  <span>{formatCurrency(result.bucket2End)}</span>
                                  <small className={`text-${result.bucket2Growth > 0 ? 'success' : 'danger'}`}>
                                    {formatPercentage(result.bucket2ActualReturn)}
                                  </small>
                                </div>
                              </td>
                              <td>{formatCurrency(result.totalAssets)}</td>
                              <td>
                                <Alert 
                                  variant={getStatusVariant(result.status)} 
                                  className="mb-0 py-1 text-center"
                                >
                                  {result.status === 'success' && <BsCheckCircle />}
                                  {result.status === 'warning' && <BsExclamationTriangle />}
                                  {result.status === 'danger' && <BsXCircle />}
                                </Alert>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  </div>
                  {/* Desktop table view */}
                  <div className="d-none d-lg-block table-responsive mt-4">
                    <Table striped bordered hover>
                      <thead>
                        <tr>
                          <th>Year</th>
                          <th>Age</th>
                          <th>Bucket 1</th>
                          <th>Bucket 2</th>
                          <th>Total Assets</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {calculations.results.map((result) => (
                          <tr key={result.year}>
                            <td>{result.year}</td>
                            <td>{result.age}</td>
                            <td>
                              <div className="d-flex justify-content-between">
                                <span>{formatCurrency(result.bucket1End)}</span>
                                <small className={`text-${result.bucket1Growth > 0 ? 'success' : 'danger'}`}>
                                  {formatPercentage(result.bucket1Growth / result.bucket1Start)}
                                </small>
                              </div>
                            </td>
                            <td>
                              <div className="d-flex justify-content-between">
                                <span>{formatCurrency(result.bucket2End)}</span>
                                <small className={`text-${result.bucket2Growth > 0 ? 'success' : 'danger'}`}>
                                  {formatPercentage(result.bucket2ActualReturn)}
                                </small>
                              </div>
                            </td>
                            <td>{formatCurrency(result.totalAssets)}</td>
                            <td>
                              <Alert 
                                variant={getStatusVariant(result.status)} 
                                className="mb-0 py-1 text-center"
                              >
                                {result.status === 'success' && <BsCheckCircle />}
                                {result.status === 'warning' && <BsExclamationTriangle />}
                                {result.status === 'danger' && <BsXCircle />}
                              </Alert>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                  <Card className="mt-4">
                    <Card.Header className="bg-info text-white">
                      Portfolio Health Indicators
                    </Card.Header>
                    <Card.Body>
                      <Row className="g-4">
                        <Col md={4}>
                          <div>
                            <div className="d-flex align-items-center mb-2">
                              <BsShield className="me-2" />
                              <h6 className="mb-0">Safety Buffer</h6>
                            </div>
                            <ProgressBar>
                              <ProgressBar 
                                variant="success" 
                                now={70} 
                                key={1}
                              />
                              <ProgressBar 
                                variant="warning" 
                                now={20} 
                                key={2}
                              />
                              <ProgressBar 
                                variant="danger" 
                                now={10} 
                                key={3}
                              />
                            </ProgressBar>
                          </div>
                        </Col>
                        <Col md={4}>
                          <div>
                            <div className="d-flex align-items-center mb-2">
                              <BsGraphUp className="me-2" />
                              <h6 className="mb-0">Growth Potential</h6>
                            </div>
                            <ProgressBar 
                              variant="info" 
                              now={calculations.avgBucket2Return * 100} 
                            />
                          </div>
                        </Col>
                        <Col md={4}>
                          <div>
                            <div className="d-flex align-items-center mb-2">
                              <BsWallet2 className="me-2" />
                              <h6 className="mb-0">Withdrawal Sustainability</h6>
                            </div>
                            <ProgressBar 
                              variant={calculations.isViable ? "success" : "danger"} 
                              now={calculations.isViable ? 100 : 60} 
                            />
                          </div>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                </Card.Body>
              </Card>
            </Col>
          )}
        </Row>
      </div>
      
    </Container>
  );
};

export default SwpPage;
