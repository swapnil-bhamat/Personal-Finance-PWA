import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from '@mui/material';
import BasePage from '../components/BasePage';
import { db } from '../services/db';
import type { Config, NewConfig } from '../services/db';

interface ConfigFormProps {
  open: boolean;
  onClose: () => void;
  item?: Config;
  onSave: (config: Config | NewConfig) => Promise<void>;
}

function ConfigForm({ onClose, item, onSave }: ConfigFormProps) {
  const [formData, setFormData] = useState({
    key: item?.key ?? '',
    value: item?.value ?? ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...(item ?? {}),
      ...formData
    });
  };

  return (
    <>
      <DialogTitle>{item ? 'Edit Config' : 'Add Config'}</DialogTitle>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <TextField
            autoFocus
            margin="dense"
            label="Key"
            fullWidth
            value={formData.key}
            onChange={(e) => setFormData({ ...formData, key: e.target.value })}
            required
          />
          <TextField
            margin="dense"
            label="Value"
            fullWidth
            value={formData.value}
            onChange={(e) => setFormData({ ...formData, value: e.target.value })}
            required
          />
        </form>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} color="primary">
          Save
        </Button>
      </DialogActions>
    </>
  );
}

export default function ConfigsPage() {
  const configs = useLiveQuery(() => db.configs.toArray()) || [];

  const handleAdd = async (config: Partial<Config>) => {
    if (config.key && config.value) {
      await db.configs.add({
        key: config.key,
        value: config.value
      } as Config);
    }
  };

  const handleEdit = async (config: Config) => {
    if (config.id) {
      await db.configs.update(config.id, config);
    }
  };

  const handleDelete = async (config: Config) => {
    if (config.id) {
      await db.configs.delete(config.id);
    }
  };

  return (
    <BasePage<Config>
      title="Configurations"
      data={configs}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      columns={[
        { field: 'id', headerName: 'ID', width: 70 },
        { field: 'key', headerName: 'Key', width: 200 },
        { field: 'value', headerName: 'Value', width: 300,
          renderCell: (item) => JSON.stringify(item.value) }
      ]}
      FormComponent={ConfigForm}
    />
  );
}
