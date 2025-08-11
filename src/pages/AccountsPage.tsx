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
import type { Account } from '../services/db';
import BasePage from '../components/BasePage';

interface AccountFormProps {
  open: boolean;
  onClose: () => void;
  item?: Account;
  onSave: (item: Account | Partial<Account>) => Promise<void>;
}

function AccountForm({ item, onSave, onClose }: AccountFormProps) {
  const [bank, setBank] = useState(item?.bank ?? '');
  const [accountNumber, setAccountNumber] = useState(item?.accountNumber ?? '');
  const [holders_id, setHoldersId] = useState(item?.holders_id ?? 0);

  const holders = useLiveQuery(() => db.holders.toArray()) ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...(item ?? {}),
      bank,
      accountNumber,
      holders_id
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogTitle>{item ? 'Edit' : 'Add'} Account</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Bank"
          fullWidth
          value={bank}
          onChange={(e) => setBank(e.target.value)}
        />
        <TextField
          margin="dense"
          label="Account Number"
          fullWidth
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value)}
        />
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
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="contained" color="primary">Save</Button>
      </DialogActions>
    </form>
  );
}

export default function AccountsPage() {
  const accounts = useLiveQuery(() => db.accounts.toArray()) ?? [];
  const holders = useLiveQuery(() => db.holders.toArray()) ?? [];

  const handleAdd = async (account: Partial<Account>) => {
    await db.accounts.add(account as Account);
  };

  const handleEdit = async (account: Account) => {
    await db.accounts.put(account);
  };

  const handleDelete = async (account: Account) => {
    await db.accounts.delete(account.id);
  };

  const getHolderName = (id: number) => {
    const holder = holders.find(h => h.id === id);
    return holder?.name ?? '';
  };

  return (
    <BasePage<Account>
      title="Accounts"
      data={accounts}
      columns={[
        { field: 'id', headerName: 'ID', width: 70 },
        { field: 'bank', headerName: 'Bank', width: 200 },
        { field: 'accountNumber', headerName: 'Account Number', width: 200 },
        { field: 'holders_id', headerName: 'Holder', width: 150,
          renderCell: (item) => getHolderName(item.holders_id) }
      ]}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      FormComponent={AccountForm}
    />
  );
}
