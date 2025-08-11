import { useLiveQuery } from 'dexie-react-hooks';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { db } from '../services/db';

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

  const totalIncome = useLiveQuery(
    () => db.income.toArray().then(incomes =>
      incomes.reduce((sum, income) => sum + Number(income.monthly), 0)
    )
  ) || 0;

  const totalExpenses = useLiveQuery(
    () => db.cashFlow.toArray().then(flows =>
      flows.reduce((sum, flow) => sum + flow.monthly, 0)
    )
  ) || 0;

  const netWorth = totalAssets - totalLiabilities;
  const monthlySavings = totalIncome - totalExpenses;

  const cardData = [
    { title: 'Total Assets', value: totalAssets },
    { title: 'Total Liabilities', value: totalLiabilities },
    { title: 'Net Worth', value: netWorth },
    { title: 'Monthly Income', value: totalIncome },
    { title: 'Monthly Expenses', value: totalExpenses },
    { title: 'Monthly Savings', value: monthlySavings },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 3 }}>
        {cardData.map((card) => (
          <Card key={card.title}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                {card.title}
              </Typography>
              <Typography variant="h5">
                ₹{card.value.toLocaleString('en-IN')}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
}
