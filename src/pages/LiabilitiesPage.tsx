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
import type { Liability } from '../services/db';
import BasePage from '../components/BasePage';

interface LiabilityFormProps {
  open: boolean;
  onClose: () => void;
  item?: Liability;
  onSave: (item: Liability | Partial<Liability>) => Promise<void>;
}

function LiabilityForm({ item, onSave, onClose }: LiabilityFormProps) {
  const [loanType_id, setLoanTypeId] = useState(item?.loanType_id ?? 0);
  const [loanAmount, setLoanAmount] = useState(item?.loanAmount ?? 0);
  const [balance, setBalance] = useState(item?.balance ?? 0);
  const [emi, setEmi] = useState(item?.emi ?? 0);

  const loanTypes = useLiveQuery(() => db.loanTypes.toArray()) ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...(item ?? {}),
      loanType_id,
      loanAmount,
      balance,
      emi
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogTitle>{item ? 'Edit' : 'Add'} Liability</DialogTitle>
      <DialogContent>
        <FormControl fullWidth margin="dense">
          <InputLabel>Loan Type</InputLabel>
          <Select
            value={loanType_id}
            onChange={(e) => setLoanTypeId(Number(e.target.value))}
          >
            {loanTypes.map((type) => (
              <MenuItem key={type.id} value={type.id}>{type.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          margin="dense"
          label="Loan Amount"
          type="number"
          fullWidth
          value={loanAmount}
          onChange={(e) => setLoanAmount(Number(e.target.value))}
        />
        <TextField
          margin="dense"
          label="Balance"
          type="number"
          fullWidth
          value={balance}
          onChange={(e) => setBalance(Number(e.target.value))}
        />
        <TextField
          margin="dense"
          label="EMI"
          type="number"
          fullWidth
          value={emi}
          onChange={(e) => setEmi(Number(e.target.value))}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="contained" color="primary">Save</Button>
      </DialogActions>
    </form>
  );
}

export default function LiabilitiesPage() {
  const liabilities = useLiveQuery(() => db.liabilities.toArray()) ?? [];
  const loanTypes = useLiveQuery(() => db.loanTypes.toArray()) ?? [];

  const handleAdd = async (liability: Partial<Liability>) => {
    await db.liabilities.add(liability as Liability);
  };

  const handleEdit = async (liability: Liability) => {
    await db.liabilities.put(liability);
  };

  const handleDelete = async (liability: Liability) => {
    await db.liabilities.delete(liability.id);
  };

  const getLoanTypeName = (id: number) => {
    const type = loanTypes.find(t => t.id === id);
    return type?.name ?? '';
  };

  return (
    <BasePage<Liability>
      title="Liabilities"
      data={liabilities}
      columns={[
        { field: 'id', headerName: 'ID', width: 70 },
        { field: 'loanType_id', headerName: 'Loan Type', width: 150,
          renderCell: (item) => getLoanTypeName(item.loanType_id) },
        { field: 'loanAmount', headerName: 'Loan Amount', width: 150,
          renderCell: (item) => `₹${item.loanAmount.toLocaleString('en-IN')}` },
        { field: 'balance', headerName: 'Balance', width: 150,
          renderCell: (item) => `₹${item.balance.toLocaleString('en-IN')}` },
        { field: 'emi', headerName: 'EMI', width: 150,
          renderCell: (item) => `₹${item.emi.toLocaleString('en-IN')}` }
      ]}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      FormComponent={LiabilityForm}
    />
  );
}
