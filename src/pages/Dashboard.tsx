import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import type { AssetPurpose } from '../services/db';
import { Container, Row, Col, Card } from 'react-bootstrap';

export default function Dashboard() {
  const totalAssets = useLiveQuery(
    () => db.assetsHoldings.toArray().then(holdings =>
      holdings.reduce((sum, holding) => sum + holding.existingAllocation, 0)
    )
  ) || 0;

  const totalLiabilities = useLiveQuery(
    () => db.liabilities.toArray().then(liabilities =>
      liabilities.reduce((sum, liability) => sum + liability.balance, 0)
    )
  ) || 0;

  const netWorth = totalAssets - totalLiabilities;

  const expensesByPurpose = useLiveQuery(async () => {
    const purposes = await db.assetPurposes.toArray();
    const cashFlows = await db.cashFlow.toArray();
    
    const purposeMap = purposes.reduce((map: Record<number, { name: string; total: number }>, purpose: AssetPurpose) => {
      if (purpose.id) {
        map[purpose.id] = { name: purpose.name, total: 0 };
      }
      return map;
    }, {});

    cashFlows.forEach(flow => {
      if (flow.assetPurpose_id && purposeMap[flow.assetPurpose_id]) {
        purposeMap[flow.assetPurpose_id].total += flow.monthly;
      }
    });

    return Object.values(purposeMap)
      .filter((purpose): purpose is { name: string; total: number } => purpose.total > 0)
      .map(purpose => ({
        id: purpose.name,
        value: purpose.total,
        label: purpose.name,
      }));
  }) || [];

  const cardData = [
    { 
      title: 'Total Assets', 
      value: totalAssets,
      bgcolor: 'success.light',
      textColor: 'success.dark',
      headerColor: 'success.dark'
    },
    { 
      title: 'Total Liabilities', 
      value: totalLiabilities,
      bgcolor: 'error.light',
      textColor: 'error.dark',
      headerColor: 'error.dark'
    },
    { 
      title: 'Net Worth', 
      value: netWorth,
      bgcolor: 'primary.light',
      textColor: 'primary.dark',
      headerColor: 'primary.dark'
    }
  ];

  return (
    <Container fluid className="py-4">
      <div className="sticky-top z-3 pt-3">
  {/* Removed duplicate page title */}
      </div>
      <div className="overflow-auto" style={{ maxHeight: '80vh' }}>
        <Row className="mb-4">
        {cardData.map((card) => (
          <Col key={card.title} md={4} className="mb-3">
            <Card bg="light" text="dark" className="h-100">
              <Card.Header as="h5">{card.title}</Card.Header>
              <Card.Body>
                <Card.Text className="display-6">₹{card.value.toLocaleString()}</Card.Text>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
      {expensesByPurpose.length > 0 && (
        <Card className="mt-4">
          <Card.Header as="h6">Expense Distribution by Purpose</Card.Header>
          <Card.Body>
            {/* Replace with a chart library or a simple list if no chart available */}
            <ul className="list-group">
              {expensesByPurpose.map((item) => (
                <li key={item.id} className="list-group-item d-flex justify-content-between align-items-center">
                  {item.label}
                  <span className="badge bg-primary rounded-pill">
                    ₹{item.value.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </Card.Body>
        </Card>
      )}
      </div>
    </Container>
  );
}
