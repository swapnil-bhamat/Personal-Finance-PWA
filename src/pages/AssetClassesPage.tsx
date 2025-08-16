
import { useState } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import type { AssetClass } from '../services/db';
import BasePage from '../components/BasePage';

interface AssetClassFormProps {
  show: boolean;
  onHide: () => void;
  item?: AssetClass;
  onSave: (item: AssetClass | Partial<AssetClass>) => Promise<void>;
  isValid?: boolean;
}

const AssetClassForm = ({ item, onSave, onHide, show, isValid }: AssetClassFormProps) => {
  const [name, setName] = useState(item?.name ?? '');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    onSave({
        ...(item ?? {}),
        name: name.trim()
    });
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>{item ? 'Edit' : 'Add'} Asset Class</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Name</Form.Label>
            <Form.Control
              type="text"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            />
            <Form.Control.Feedback type="invalid">{error}</Form.Control.Feedback>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={isValid === false}>Save</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

export default function AssetClassesPage() {
  const assetClasses = useLiveQuery(() => db.assetClasses.toArray()) ?? [];

  const handleAdd = async (assetClass: Partial<AssetClass>) => {
    const newAssetClass: AssetClass = {
      id: assetClass.id ?? Date.now(),
      name: assetClass.name ?? ''
    };
    await db.assetClasses.add(newAssetClass);
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
        { field: 'name', headerName: 'Name', width: 200 }
      ]}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      FormComponent={AssetClassForm}
    />
  );
}