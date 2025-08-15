import { useState } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import type { Holder } from '../services/db';
import BasePage from '../components/BasePage';

interface HolderFormProps {
  show: boolean;
  onHide: () => void;
  item?: Holder;
  onSave: (item: Holder | Partial<Holder>) => Promise<void>;
  isValid?: boolean;
}

function HolderForm({ item, onSave, onHide, show, isValid }: HolderFormProps) {
  const [name, setName] = useState(item?.name ?? '');
  const [error, setError] = useState('');

  const validate = () => {
    if (!name.trim()) {
      setError('Name is required');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({
      ...(item ?? {}),
      name: name.trim()
    });
    onHide();
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>{item ? 'Edit' : 'Add'} Holder</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Name</Form.Label>
            <Form.Control
              type="text"
              autoFocus
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              isInvalid={!!error}
            />
            <Form.Control.Feedback type="invalid">{error}</Form.Control.Feedback>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={!isValid}>
            Save
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

export default function HoldersPage() {
  const holders = useLiveQuery(() => db.holders.toArray()) ?? [];

  const handleAdd = async (holder: Partial<Holder>) => {
    if (!holder.name) throw new Error('Name is required');
    const newHolder: Holder = {
      id: Date.now(),
      name: holder.name
    };
    await db.holders.add(newHolder);
  };

  const handleEdit = async (holder: Holder) => {
    await db.holders.put(holder);
  };

  const handleDelete = async (holder: Holder) => {
    await db.holders.delete(holder.id);
  };

  const columns = [
    {
      field: 'name' as const,
      headerName: 'Name',
      required: true
    }
  ];

  return (
    <BasePage<Holder>
      title="Holders"
      data={holders.map(h => ({ ...h, id: h.id ?? Date.now() }))}
      columns={columns}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      FormComponent={HolderForm}
    />
  );
}
