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
import type { CashFlow } from '../services/db';
import BasePage from '../components/BasePage';

interface CashFlowFormProps {
  open: boolean;
  onClose: () => void;
  item?: CashFlow;
  onSave: (item: CashFlow | Partial<CashFlow>) => Promise<void>;
}

function CashFlowForm({ item, onSave, onClose }: CashFlowFormProps) {
  const [item_name, setItemName] = useState(item?.item ?? '');
  const [accounts_id, setAccountsId] = useState(item?.accounts_id ?? 0);
  const [holders_id, setHoldersId] = useState(item?.holders_id ?? 0);
  const [monthly, setMonthly] = useState(item?.monthly ?? 0);
  const [yearly, setYearly] = useState(item?.yearly ?? 0);
  const [assetPurpose_id, setAssetPurposeId] = useState(item?.assetPurpose_id ?? 0);

  const accounts = useLiveQuery(() => db.accounts.toArray()) ?? [];
  const holders = useLiveQuery(() => db.holders.toArray()) ?? [];
  const assetPurposes = useLiveQuery(() => db.assetPurposes.toArray()) ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...(item ?? {}),
      item: item_name,
      accounts_id,
      holders_id,
      monthly,
      yearly,
      assetPurpose_id
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogTitle>{item ? 'Edit' : 'Add'} Cash Flow</DialogTitle>
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
          type="number"
          fullWidth
          value={monthly}
          onChange={(e) => setMonthly(Number(e.target.value))}
        />
        <TextField
          margin="dense"
          label="Yearly Amount"
          type="number"
          fullWidth
          value={yearly}
          onChange={(e) => setYearly(Number(e.target.value))}
        />
        <FormControl fullWidth margin="dense">
          <InputLabel>Asset Purpose</InputLabel>
          <Select
            value={assetPurpose_id}
            onChange={(e) => setAssetPurposeId(Number(e.target.value))}
          >
            {assetPurposes.map((purpose) => (
              <MenuItem key={purpose.id} value={purpose.id}>{purpose.name}</MenuItem>
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

export default function CashFlowPage() {
  const cashFlows = useLiveQuery(() => db.cashFlow.toArray()) ?? [];
  const accounts = useLiveQuery(() => db.accounts.toArray()) ?? [];
  const holders = useLiveQuery(() => db.holders.toArray()) ?? [];
  const assetPurposes = useLiveQuery(() => db.assetPurposes.toArray()) ?? [];

  const handleAdd = async (cashFlow: Partial<CashFlow>) => {
    await db.cashFlow.add(cashFlow as CashFlow);
  };

  const handleEdit = async (cashFlow: CashFlow) => {
    await db.cashFlow.put(cashFlow);
  };

  const handleDelete = async (cashFlow: CashFlow) => {
    await db.cashFlow.delete(cashFlow.id);
  };

  const getAccountName = (id: number) => {
    const account = accounts.find(a => a.id === id);
    return account ? `${account.bank} - ${account.accountNumber}` : '';
  };

  const getHolderName = (id: number) => {
    const holder = holders.find(h => h.id === id);
    return holder?.name ?? '';
  };

  const getAssetPurposeName = (id: number) => {
    const purpose = assetPurposes.find(p => p.id === id);
    return purpose?.name ?? '';
  };

  return (
    <BasePage<CashFlow>
      title="Cash Flow"
      data={cashFlows}
      columns={[
        { field: 'id', headerName: 'ID', width: 70 },
        { field: 'item', headerName: 'Item', width: 200 },
        { field: 'accounts_id', headerName: 'Account', width: 200,
          renderCell: (item) => getAccountName(item.accounts_id) },
        { field: 'holders_id', headerName: 'Holder', width: 150,
          renderCell: (item) => getHolderName(item.holders_id) },
        { field: 'monthly', headerName: 'Monthly Amount', width: 150,
          renderCell: (item) => `₹${item.monthly.toLocaleString('en-IN')}` },
        { field: 'yearly', headerName: 'Yearly Amount', width: 150,
          renderCell: (item) => `₹${item.yearly.toLocaleString('en-IN')}` },
        { field: 'assetPurpose_id', headerName: 'Asset Purpose', width: 150,
          renderCell: (item) => getAssetPurposeName(item.assetPurpose_id) }
      ]}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      FormComponent={CashFlowForm}
    />
  );
}
