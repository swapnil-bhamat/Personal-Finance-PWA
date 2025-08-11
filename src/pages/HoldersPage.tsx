import { useState } from 'react';
import { TextField, DialogTitle, DialogContent, Button, DialogActions } from '@mui/material';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import type { Holder } from '../services/db';
import BasePage from '../components/BasePage';

interface HolderFormProps {
  open: boolean;
  onClose: () => void;
  item?: Holder;
  onSave: (item: Holder | Partial<Holder>) => Promise<void>;
}

function HolderForm({ item, onSave, onClose }: HolderFormProps) {
  const [name, setName] = useState(item?.name ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...(item ?? {}),
      name
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogTitle>{item ? 'Edit' : 'Add'} Holder</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Name"
          fullWidth
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="contained" color="primary">Save</Button>
      </DialogActions>
    </form>
  );
}

export default function HoldersPage() {
  const holders = useLiveQuery(() => db.holders.toArray()) ?? [];

  const handleAdd = async (holder: Partial<Holder>) => {
    await db.holders.add(holder as Holder);
  };

  const handleEdit = async (holder: Holder) => {
    await db.holders.put(holder);
  };

  const handleDelete = async (holder: Holder) => {
    await db.holders.delete(holder.id);
  };

  return (
    <BasePage<Holder>
      title="Holders"
      data={holders}
      columns={[
        { field: 'id', headerName: 'ID', width: 70 },
        { field: 'name', headerName: 'Name', width: 200 }
      ]}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      FormComponent={HolderForm}
    />
  );
}
