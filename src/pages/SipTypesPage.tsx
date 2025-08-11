import { useState } from 'react';
import { TextField, DialogTitle, DialogContent, Button, DialogActions } from '@mui/material';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import type { SipType } from '../services/db';
import BasePage from '../components/BasePage';

interface SipTypeFormProps {
  open: boolean;
  onClose: () => void;
  item?: SipType;
  onSave: (item: SipType | Partial<SipType>) => Promise<void>;
}

function SipTypeForm({ item, onSave, onClose }: SipTypeFormProps) {
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
      <DialogTitle>{item ? 'Edit' : 'Add'} SIP Type</DialogTitle>
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

export default function SipTypesPage() {
  const sipTypes = useLiveQuery(() => db.sipTypes.toArray()) ?? [];

  const handleAdd = async (sipType: Partial<SipType>) => {
    await db.sipTypes.add(sipType as SipType);
  };

  const handleEdit = async (sipType: SipType) => {
    await db.sipTypes.put(sipType);
  };

  const handleDelete = async (sipType: SipType) => {
    await db.sipTypes.delete(sipType.id);
  };

  return (
    <BasePage<SipType>
      title="SIP Types"
      data={sipTypes}
      columns={[
        { field: 'id', headerName: 'ID', width: 70 },
        { field: 'name', headerName: 'Name', width: 200 }
      ]}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      FormComponent={SipTypeForm}
    />
  );
}
