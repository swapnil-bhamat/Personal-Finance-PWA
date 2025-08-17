import { useState } from 'react';
import { Container, Alert, Button, Card, Row, Col } from 'react-bootstrap';
import { db, initializeDatabase } from '../services/db';

export default function ImportExportPage() {
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleExport = async () => {
    try {
      const data = {
        configs: await db.configs.toArray(),
        assetPurpose: await db.assetPurposes.toArray(),
        loanType: await db.loanTypes.toArray(),
        holders: await db.holders.toArray(),
        sipTypes: await db.sipTypes.toArray(),
        buckets: await db.buckets.toArray(),
        assetClasses: await db.assetClasses.toArray(),
        assetSubClasses: await db.assetSubClasses.toArray(),
        goals: await db.goals.toArray(),
        accounts: await db.accounts.toArray(),
        income: await db.income.toArray(),
        cashFlow: await db.cashFlow.toArray(),
        assetsHoldings: await db.assetsHoldings.toArray(),
        liabilities: await db.liabilities.toArray(),
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'finance-data.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: 'Data exported successfully!' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to export data: ' + (error as Error).message,
      });
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const jsonData = JSON.parse(e.target?.result as string);
        await initializeDatabase(jsonData);
        setMessage({ type: 'success', text: 'Data imported successfully!' });
      } catch (error) {
        setMessage({
          type: 'error',
          text: 'Failed to import data: ' + (error as Error).message,
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <Container className="my-5">
      <Row className="justify-content-center">
        <Col md={8} lg={6}>
          <Card className="p-4">
            <h4 className="mb-4">Import/Export Data</h4>

            {message && (
              <Alert variant={message.type} className="mb-3">
                {message.text}
              </Alert>
            )}

            <div className="d-flex gap-2 mb-3">
              <Button variant="primary" onClick={handleExport}>
                Export Data
              </Button>
              <Button variant="secondary" as="label">
                Import Data
                <input
                  type="file"
                  hidden
                  accept=".json"
                  onChange={handleImport}
                />
              </Button>
            </div>

            <small className="text-muted">
              Note: Importing data will replace all existing data in the application.<br />
              Please make sure to export and backup your current data before importing.
            </small>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}
