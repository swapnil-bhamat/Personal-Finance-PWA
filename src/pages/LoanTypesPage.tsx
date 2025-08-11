import { useState } from 'react';
import { TextField, DialogTitle, DialogContent, Button, DialogActions } from '@mui/material';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import type { LoanType } from '../services/db';
import BasePage from '../components/BasePage';

interface LoanTypeFormProps {
  open: boolean;
  onClose: () => void;
  item?: LoanType;
  onSave: (item: LoanType | Partial<LoanType>) => Promise<void>;
}

function LoanTypeForm({ item, onSave, onClose }: LoanTypeFormProps) {
  const [name, setName] = useState(item?.name ?? '');
  const [type, setType] = useState(item?.type ?? '');
  const [interestRate, setInterestRate] = useState(item?.interestRate ?? 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...(item ?? {}),
      name,
      type,
      interestRate
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogTitle>{item ? 'Edit' : 'Add'} Loan Type</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Name"
          fullWidth
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextField
          margin="dense"
          label="Type"
          fullWidth
          value={type}
          onChange={(e) => setType(e.target.value)}
        />
        <TextField
          margin="dense"
          label="Interest Rate"
          type="number"
          fullWidth
          value={interestRate}
          onChange={(e) => setInterestRate(Number(e.target.value))}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="contained" color="primary">Save</Button>
      </DialogActions>
    </form>
  );
}

export default function LoanTypesPage() {
  const loanTypes = useLiveQuery(() => db.loanTypes.toArray()) ?? [];

  const handleAdd = async (loanType: Partial<LoanType>) => {
    await db.loanTypes.add(loanType as LoanType);
  };

  const handleEdit = async (loanType: LoanType) => {
    await db.loanTypes.put(loanType);
  };

  const handleDelete = async (loanType: LoanType) => {
    await db.loanTypes.delete(loanType.id);
  };

  return (
    <BasePage<LoanType>
      title="Loan Types"
      data={loanTypes}
      columns={[
        { field: 'id', headerName: 'ID', width: 70 },
        { field: 'name', headerName: 'Name', width: 200 },
        { field: 'type', headerName: 'Type', width: 150 },
        { field: 'interestRate', headerName: 'Interest Rate', width: 150,
          renderCell: (item) => `${item.interestRate}%` }
      ]}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      FormComponent={LoanTypeForm}
    />
  );
}
