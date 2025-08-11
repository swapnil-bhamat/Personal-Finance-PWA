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
import type { Goal } from '../services/db';
import BasePage from '../components/BasePage';

interface GoalFormProps {
  open: boolean;
  onClose: () => void;
  item?: Goal;
  onSave: (item: Goal | Partial<Goal>) => Promise<void>;
}

function GoalForm({ item, onSave, onClose }: GoalFormProps) {
  const [name, setName] = useState(item?.name ?? '');
  const [priority, setPriority] = useState(item?.priority ?? 1);
  const [amountRequiredToday, setAmountRequiredToday] = useState(item?.amountRequiredToday ?? 0);
  const [durationInYears, setDurationInYears] = useState(item?.durationInYears ?? 1);
  const [assetPurpose_id, setAssetPurposeId] = useState(item?.assetPurpose_id ?? 0);

  const assetPurposes = useLiveQuery(() => db.assetPurposes.toArray()) ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...(item ?? {}),
      name,
      priority,
      amountRequiredToday,
      durationInYears,
      assetPurpose_id
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogTitle>{item ? 'Edit' : 'Add'} Goal</DialogTitle>
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
          label="Priority"
          type="number"
          fullWidth
          value={priority}
          onChange={(e) => setPriority(Number(e.target.value))}
        />
        <TextField
          margin="dense"
          label="Amount Required Today"
          type="number"
          fullWidth
          value={amountRequiredToday}
          onChange={(e) => setAmountRequiredToday(Number(e.target.value))}
        />
        <TextField
          margin="dense"
          label="Duration (Years)"
          type="number"
          fullWidth
          value={durationInYears}
          onChange={(e) => setDurationInYears(Number(e.target.value))}
        />
        <FormControl fullWidth margin="dense">
          <InputLabel>Asset Purpose</InputLabel>
          <Select
            value={assetPurpose_id}
            onChange={(e) => setAssetPurposeId(Number(e.target.value))}
          >
            {assetPurposes.map((ap) => (
              <MenuItem key={ap.id} value={ap.id}>{ap.name}</MenuItem>
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

export default function GoalsPage() {
  const goals = useLiveQuery(() => db.goals.toArray()) ?? [];
  const assetPurposes = useLiveQuery(() => db.assetPurposes.toArray()) ?? [];

  const handleAdd = async (goal: Partial<Goal>) => {
    await db.goals.add(goal as Goal);
  };

  const handleEdit = async (goal: Goal) => {
    await db.goals.put(goal);
  };

  const handleDelete = async (goal: Goal) => {
    await db.goals.delete(goal.id);
  };

  const getAssetPurposeName = (id: number) => {
    const purpose = assetPurposes.find(ap => ap.id === id);
    return purpose?.name ?? '';
  };

  return (
    <BasePage<Goal>
      title="Goals"
      data={goals}
      columns={[
        { field: 'id', headerName: 'ID', width: 70 },
        { field: 'name', headerName: 'Name', width: 200 },
        { field: 'priority', headerName: 'Priority', width: 100 },
        { field: 'amountRequiredToday', headerName: 'Amount Required', width: 150,
          renderCell: (item) => `₹${item.amountRequiredToday.toLocaleString('en-IN')}` },
        { field: 'durationInYears', headerName: 'Duration (Years)', width: 150 },
        { field: 'assetPurpose_id', headerName: 'Asset Purpose', width: 150,
          renderCell: (item) => getAssetPurposeName(item.assetPurpose_id) }
      ]}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      FormComponent={GoalForm}
    />
  );
}
