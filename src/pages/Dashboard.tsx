import { useLiveQuery } from 'dexie-react-hooks';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { PieChart } from '@mui/x-charts/PieChart';
import { db } from '../services/db';
import type { AssetPurpose } from '../services/db';

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
    <Box sx={{ width: '100%' }}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <div>
        {cardData.map((card) => (
          <Card 
            key={card.title} 
            sx={{
              bgcolor: card.bgcolor
            }}
          >
            <CardContent>
              <Typography color={card.headerColor} gutterBottom>
                {card.title}
              </Typography>
              <Typography variant="h5" color={card.textColor}>
                ₹{card.value.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </div>
      {expensesByPurpose.length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Expense Distribution by Purpose
            </Typography>
            <Box sx={{ width: '100%', height: 300 }}>
              <PieChart
                series={[
                  {
                    data: expensesByPurpose,
                    highlightScope: { highlight: 'item', fade: 'global' },
                    valueFormatter: (item) => {
                      const total = expensesByPurpose.reduce((sum, exp) => sum + exp.value, 0);
                      const percentage = ((item.value / total) * 100).toFixed(1);
                      return `₹${item.value.toLocaleString()} (${percentage}%)`;
                    },
                  },
                ]}
                height={300}
              />
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
