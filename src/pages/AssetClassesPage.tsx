import { useState } from 'react';
import { TextField, DialogTitle, DialogContent, Button, DialogActions } from '@mui/material';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import type { AssetClass } from '../services/db';
import BasePage from '../components/BasePage';

interface AssetClassFormProps {
  open: boolean;
  onClose: () => void;
  item?: AssetClass;
  onSave: (item: AssetClass | Partial<AssetClass>) => Promise<void>;
}

function AssetClassForm({ item, onSave, onClose }: AssetClassFormProps) {
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
      <DialogTitle>{item ? 'Edit' : 'Add'} Asset Class</DialogTitle>
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

export default function AssetClassesPage() {
  const assetClasses = useLiveQuery(() => db.assetClasses.toArray()) ?? [];

  const handleAdd = async (assetClass: Partial<AssetClass>) => {
    await db.assetClasses.add(assetClass as AssetClass);
  };

  const handleEdit = async (assetClass: AssetClass) => {
    await db.assetClasses.put(assetClass);
  };

  const handleDelete = async (assetClass: AssetClass) => {
    await db.assetClasses.delete(assetClass.id);
  };

  return (
    <BasePage<AssetClass>
      title="Asset Classes"
      data={assetClasses}
      columns={[
        { field: 'id', headerName: 'ID', width: 70 },
        { field: 'name', headerName: 'Name', width: 200 }
      ]}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      FormComponent={AssetClassForm}
    />
  );
}
