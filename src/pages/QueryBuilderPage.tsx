import { useState } from 'react';
import {
  Box,
  Button,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
  Table as MuiTable,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { db } from '../services/db';
import type { Table } from 'dexie';

// Define a type for the database table map
type DbTables = {
  [key: string]: Table<TableData, number>;
};

const tables = [
  'configs',
  'assetPurposes',
  'loanTypes',
  'holders',
  'sipTypes',
  'buckets',
  'assetClasses',
  'assetSubClasses',
  'goals',
  'accounts',
  'income',
  'cashFlow',
  'assetsHoldings',
  'liabilities',
];

type TableData = {
  id: number;
  [key: string]: string | number | boolean | null | undefined;
};

// We use TableData as our QueryResult type
type QueryResult = TableData;

export default function QueryBuilderPage() {
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [whereClause, setWhereClause] = useState('');
  const [results, setResults] = useState<QueryResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const executeQuery = async () => {
    try {
      setError(null);
      let queryResults: QueryResult[] = [];

      // Execute the query based on selected tables
      if (selectedTables.length === 1) {
        // Simple query on a single table
        const tableName = selectedTables[0];
        const collection = (db as unknown as DbTables)[tableName];
        if (!collection) {
          throw new Error(`Invalid table name: ${tableName}`);
        }
        let results = await collection.toArray() as TableData[];

        if (whereClause) {
          try {
            // Create a safe function from the where clause
            const filterFn = new Function('item', `return ${whereClause}`) as (item: TableData) => boolean;
            results = results.filter(filterFn);
          } catch (error) {
            console.error('Where clause error:', error);
            throw new Error('Invalid where clause');
          }
        }

        queryResults = results;
      } else if (selectedTables.length > 1) {
        // Join query for multiple tables
        const firstTable = (db as unknown as DbTables)[selectedTables[0]];
        let results = await firstTable.toArray() as TableData[];

        // Perform joins with other selected tables
        for (let i = 1; i < selectedTables.length; i++) {
          const nextTable = (db as unknown as DbTables)[selectedTables[i]];
          const secondTable = await nextTable.toArray() as TableData[];
          results = results.flatMap((item1: TableData) =>
            secondTable
              .filter((item2: TableData) => {
                // Try to find matching ID fields for join
                const joinField = Object.keys(item1).find(key =>
                  key === `${selectedTables[i]}_id` || key === 'id'
                );
                return joinField && item1[joinField] === item2.id;
              })
              .map((item2: TableData) => ({ ...item1, ...item2 }))
          );
        }

        if (whereClause) {
          try {
            const filterFn = new Function('item', `return ${whereClause}`) as (item: TableData) => boolean;
            results = results.filter(filterFn);
          } catch (error) {
            console.error('Where clause error:', error);
            throw new Error('Invalid where clause');
          }
        }

        queryResults = results;
      }

      setResults(queryResults);
    } catch (error) {
      setError((error as Error).message);
      setResults([]);
    }
  };

  const getColumns = (results: QueryResult[]) => {
    if (results.length === 0) return [];
    return Object.keys(results[0]);
  };

  return (
    <Container maxWidth="xl">
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Query Builder
        </Typography>

        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Select Tables</InputLabel>
            <Select
              multiple
              value={selectedTables}
              onChange={(e) => setSelectedTables(e.target.value as string[])}
              renderValue={(selected) => (selected as string[]).join(', ')}
            >
              {tables.map((table) => (
                <MenuItem key={table} value={table}>
                  {table}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Where Clause"
            placeholder="Example: item.amount > 1000 && item.type === 'income'"
            value={whereClause}
            onChange={(e) => setWhereClause(e.target.value)}
            sx={{ mb: 2 }}
          />

          <Button
            variant="contained"
            onClick={executeQuery}
            disabled={selectedTables.length === 0}
          >
            Execute Query
          </Button>
        </Box>

        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            Error: {error}
          </Typography>
        )}

        {results.length > 0 && (
          <TableContainer>
            <MuiTable size="small">
              <TableHead>
                <TableRow>
                  {getColumns(results).map((column) => (
                    <TableCell key={column}>{column}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {results.map((row, index) => (
                  <TableRow key={index}>
                    {getColumns(results).map((column) => (
                      <TableCell key={column}>
                        {typeof row[column] === 'object'
                          ? JSON.stringify(row[column])
                          : String(row[column])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </MuiTable>
          </TableContainer>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Note: The where clause should be a valid JavaScript expression that returns a boolean.
          Use &apos;item&apos; to refer to the current record. Example: item.amount &gt; 1000
        </Typography>
      </Paper>
    </Container>
  );
}
