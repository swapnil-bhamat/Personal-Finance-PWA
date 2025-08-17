import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import type { Goal } from '../services/db';
import BasePage from '../components/BasePage';

interface GoalFormProps {
  show: boolean;
  onHide: () => void;
  item?: Goal;
  onSave: (item: Goal | Partial<Goal>) => Promise<void>;
}

import FormModal from '../components/FormModal';
import { Form } from 'react-bootstrap';

function GoalForm({ item, onSave, onHide, show }: GoalFormProps) {
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
    <FormModal
      show={show}
      onHide={onHide}
      onSubmit={handleSubmit}
      title={item ? 'Edit Goal' : 'Add Goal'}
      isValid={!!name}
    >
      <Form.Group className="mb-3" controlId="formGoalName">
        <Form.Label>Name</Form.Label>
        <Form.Control
          type="text"
          value={name}
          autoFocus
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
        />
      </Form.Group>
      <Form.Group className="mb-3" controlId="formGoalPriority">
        <Form.Label>Priority</Form.Label>
        <Form.Control
          type="number"
          value={priority}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPriority(Number(e.target.value))}
        />
      </Form.Group>
      <Form.Group className="mb-3" controlId="formGoalAmountRequired">
        <Form.Label>Amount Required Today</Form.Label>
        <Form.Control
          type="number"
          value={amountRequiredToday}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmountRequiredToday(Number(e.target.value))}
        />
      </Form.Group>
      <Form.Group className="mb-3" controlId="formGoalDuration">
        <Form.Label>Duration (Years)</Form.Label>
        <Form.Control
          type="number"
          value={durationInYears}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDurationInYears(Number(e.target.value))}
        />
      </Form.Group>
      <Form.Group className="mb-3" controlId="formGoalAssetPurpose">
        <Form.Label>Asset Purpose</Form.Label>
        <Form.Select value={assetPurpose_id} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAssetPurposeId(Number(e.target.value))}>
          {assetPurposes.map((ap) => (
            <option key={ap.id} value={ap.id}>{ap.name}</option>
          ))}
        </Form.Select>
      </Form.Group>
    </FormModal>
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
