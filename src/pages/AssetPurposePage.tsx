import { useState } from 'react';
import { TextField, DialogTitle, DialogContent } from '@mui/material';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import type { AssetPurpose } from '../services/db';
import BasePage from '../components/BasePage';

interface AssetPurposeFormProps {
  open: boolean;
  onClose: () => void;
  item?: AssetPurpose;
  onSave: (item: AssetPurpose | Partial<AssetPurpose>) => Promise<void>;
}

function AssetPurposeForm({ item, onSave, onClose, open }: AssetPurposeFormProps) {
  const [name, setName] = useState(item?.name ?? '');
  const [type, setType] = useState(item?.type ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...(item ?? {}),
      name,
      type,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogTitle>{item ? 'Edit' : 'Add'} Asset Purpose</DialogTitle>
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
      </DialogContent>
    </form>
  );
}

export default function AssetPurposePage() {
  const assetPurposes = useLiveQuery(() => db.assetPurposes.toArray()) ?? [];

  const handleAdd = async (purpose: Partial<AssetPurpose>) => {
    await db.assetPurposes.add(purpose as AssetPurpose);
  };

  const handleEdit = async (purpose: AssetPurpose) => {
    await db.assetPurposes.put(purpose);
  };

  const handleDelete = async (purpose: AssetPurpose) => {
    await db.assetPurposes.delete(purpose.id);
  };

  return (
    <BasePage<AssetPurpose>
      title="Asset Purposes"
      data={assetPurposes}
      columns={[
        { field: 'id', headerName: 'ID', width: 70 },
        { field: 'name', headerName: 'Name', width: 200 },
        { field: 'type', headerName: 'Type', width: 150 }
      ]}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      FormComponent={AssetPurposeForm}
    />
  );
}
