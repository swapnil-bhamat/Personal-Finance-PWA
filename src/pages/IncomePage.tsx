import { useState } from 'react';
import {
  TextField,
  DialogTitle,
  DialogContent,
  Button,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import type { Income } from '../services/db';
import BasePage from '../components/BasePage';

interface IncomeFormProps {
  open: boolean;
  onClose: () => void;
  item?: Income;
  onSave: (item: Income | Partial<Income>) => Promise<void>;
}

function IncomeForm({ item, onSave, onClose }: IncomeFormProps) {
  const [item_name, setItemName] = useState(item?.item ?? '');
  const [accounts_id, setAccountsId] = useState(item?.accounts_id ?? 0);
  const [holders_id, setHoldersId] = useState(item?.holders_id ?? 0);
  const [monthly, setMonthly] = useState(item?.monthly ?? '0');

  const accounts = useLiveQuery(() => db.accounts.toArray()) ?? [];
  const holders = useLiveQuery(() => db.holders.toArray()) ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...(item ?? {}),
      item: item_name,
      accounts_id,
      holders_id,
      monthly
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogTitle>{item ? 'Edit' : 'Add'} Income</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Item"
          fullWidth
          value={item_name}
          onChange={(e) => setItemName(e.target.value)}
        />
        <FormControl fullWidth margin="dense">
          <InputLabel>Account</InputLabel>
          <Select
            value={accounts_id}
            onChange={(e) => setAccountsId(Number(e.target.value))}
          >
            {accounts.map((account) => (
              <MenuItem key={account.id} value={account.id}>
                {account.bank} - {account.accountNumber}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth margin="dense">
          <InputLabel>Holder</InputLabel>
          <Select
            value={holders_id}
            onChange={(e) => setHoldersId(Number(e.target.value))}
          >
            {holders.map((holder) => (
              <MenuItem key={holder.id} value={holder.id}>{holder.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          margin="dense"
          label="Monthly Amount"
          fullWidth
          value={monthly}
          onChange={(e) => setMonthly(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="contained" color="primary">Save</Button>
      </DialogActions>
    </form>
  );
}

export default function IncomePage() {
  const incomes = useLiveQuery(() => db.income.toArray()) ?? [];
  const accounts = useLiveQuery(() => db.accounts.toArray()) ?? [];
  const holders = useLiveQuery(() => db.holders.toArray()) ?? [];

  const handleAdd = async (income: Partial<Income>) => {
    await db.income.add(income as Income);
  };

  const handleEdit = async (income: Income) => {
    await db.income.put(income);
  };

  const handleDelete = async (income: Income) => {
    await db.income.delete(income.id);
  };

  const getAccountName = (id: number) => {
    const account = accounts.find(a => a.id === id);
    return account ? `${account.bank} - ${account.accountNumber}` : '';
  };

  const getHolderName = (id: number) => {
    const holder = holders.find(h => h.id === id);
    return holder?.name ?? '';
  };

  return (
    <BasePage<Income>
      title="Income"
      data={incomes}
      columns={[
        { field: 'id', headerName: 'ID', width: 70 },
        { field: 'item', headerName: 'Item', width: 200 },
        { field: 'accounts_id', headerName: 'Account', width: 200,
          renderCell: (item) => getAccountName(item.accounts_id) },
        { field: 'holders_id', headerName: 'Holder', width: 150,
          renderCell: (item) => getHolderName(item.holders_id) },
        { field: 'monthly', headerName: 'Monthly Amount', width: 150,
          renderCell: (item) => `₹${Number(item.monthly).toLocaleString('en-IN')}` }
      ]}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      FormComponent={IncomeForm}
    />
  );
}
