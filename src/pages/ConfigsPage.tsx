import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import BasePage from '../components/BasePage';
import { db } from '../services/db';
import type { Config } from '../services/db';

interface ConfigFormProps {
  show: boolean;
  onHide: () => void;
  item?: Config;
  onSave: (config: Config | Partial<Config>) => Promise<void>;
}

import FormModal from '../components/FormModal';
import { Form } from 'react-bootstrap';

function ConfigForm({ onHide, show, item, onSave }: ConfigFormProps) {
  const [formData, setFormData] = useState({
    key: item?.key ?? '',
    value: typeof item?.value === 'string' ? item.value : JSON.stringify(item?.value) ?? ''
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      if (!formData.key.trim() || !formData.value.trim()) {
        throw new Error('Key and value are required');
      }

      setIsSubmitting(true);
      
      // Try to parse the value as JSON if it looks like a JSON string
      let parsedValue: string | number | boolean | Record<string, unknown> = formData.value;
      if (formData.value.trim().match(/^[{["]/)) {
        try {
          parsedValue = JSON.parse(formData.value);
        } catch {
          // If it's not valid JSON, use it as is
          console.log('Value is not valid JSON, using as string');
        }
      } else if (formData.value === 'true' || formData.value === 'false') {
        parsedValue = formData.value === 'true';
      } else if (!isNaN(Number(formData.value))) {
        parsedValue = Number(formData.value);
      }

      await onSave({
        ...(item ?? {}),
        key: formData.key,
        value: parsedValue
      });
    } catch (err) {
      console.error('Form submission error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while saving');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormModal
      show={show}
      onHide={onHide}
      onSubmit={handleSubmit}
      title={item ? 'Edit Config' : 'Add Config'}
      isValid={!!formData.key && !!formData.value && !error}
    >
      <Form.Group className="mb-3" controlId="formConfigKey">
        <Form.Label>Key</Form.Label>
        <Form.Control
          type="text"
          value={formData.key}
          autoFocus
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setError(null);
            setFormData({ ...formData, key: e.target.value });
          }}
          required
          disabled={isSubmitting}
          isInvalid={!!error}
        />
      </Form.Group>
      <Form.Group className="mb-3" controlId="formConfigValue">
        <Form.Label>Value</Form.Label>
        <Form.Control
          as="textarea"
          rows={4}
          value={formData.value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setError(null);
            setFormData({ ...formData, value: e.target.value });
          }}
          required
          disabled={isSubmitting}
          isInvalid={!!error}
        />
        <Form.Text className={error ? 'text-danger' : 'text-muted'}>
          {error || 'For objects or arrays, use valid JSON format'}
        </Form.Text>
      </Form.Group>
    </FormModal>
  );
}

export default function ConfigsPage() {
  const configs = useLiveQuery(() => db.configs.toArray()) || [];
  const handleAdd = async (config: Partial<Config>) => {
    try {
      if (!config.key || config.value === undefined || config.value === '') {
        throw new Error('Key and value are required');
      }

      const newConfig = {
        key: config.key,
        value: config.value
      } as Config;

      const id = await db.configs.add(newConfig);
      if (!id) throw new Error('Failed to add config');
      
      console.log('Added config:', { ...newConfig, id });
    } catch (error) {
      console.error('Error adding config:', error);
      throw error;
    }
  };

  const handleEdit = async (config: Config) => {
    try {
      if (!config.id) {
        throw new Error('Config ID is required for editing');
      }
      if (!config.key || config.value === undefined || config.value === '') {
        throw new Error('Key and value are required');
      }

      const updated = await db.configs.update(config.id, {
        key: config.key,
        value: config.value
      });

      if (!updated) throw new Error('Failed to update config');
      
      console.log('Updated config:', config);
    } catch (error) {
      console.error('Error updating config:', error);
      throw error;
    }
  };

  const handleDelete = async (config: Config) => {
    try {
      if (!config.id) {
        throw new Error('Config ID is required for deletion');
      }
      await db.configs.delete(config.id);
      console.log('Deleted config:', config);
    } catch (error) {
      console.error('Error deleting config:', error);
      throw error;
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
        { field: 'key', headerName: 'Key' },
        { field: 'value', headerName: 'Value',
          renderCell: (item) => JSON.stringify(item.value) }
      ]}
      FormComponent={ConfigForm}
    />
  );
}
