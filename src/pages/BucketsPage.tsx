import { useState } from 'react';
import { TextField, DialogTitle, DialogContent, Button, DialogActions } from '@mui/material';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import type { Bucket } from '../services/db';
import BasePage from '../components/BasePage';

interface BucketFormProps {
  open: boolean;
  onClose: () => void;
  item?: Bucket;
  onSave: (item: Bucket | Partial<Bucket>) => Promise<void>;
}

function BucketForm({ item, onSave, onClose }: BucketFormProps) {
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
      <DialogTitle>{item ? 'Edit' : 'Add'} Bucket</DialogTitle>
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

export default function BucketsPage() {
  const buckets = useLiveQuery(() => db.buckets.toArray()) ?? [];

  const handleAdd = async (bucket: Partial<Bucket>) => {
    await db.buckets.add(bucket as Bucket);
  };

  const handleEdit = async (bucket: Bucket) => {
    await db.buckets.put(bucket);
  };

  const handleDelete = async (bucket: Bucket) => {
    await db.buckets.delete(bucket.id);
  };

  return (
    <BasePage<Bucket>
      title="Buckets"
      data={buckets}
      columns={[
        { field: 'id', headerName: 'ID', width: 70 },
        { field: 'name', headerName: 'Name', width: 200 }
      ]}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      FormComponent={BucketForm}
    />
  );
}
