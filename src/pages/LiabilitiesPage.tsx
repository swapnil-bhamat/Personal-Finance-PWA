import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import type { Liability } from '../services/db';
import BasePage from '../components/BasePage';

interface LiabilityFormProps {
  show: boolean;
  onHide: () => void;
  item?: Liability;
  onSave: (item: Liability | Partial<Liability>) => Promise<void>;
}

import FormModal from '../components/FormModal';
import { Form } from 'react-bootstrap';

function LiabilityForm({ item, onSave, onHide, show }: LiabilityFormProps) {
  const [loanType_id, setLoanTypeId] = useState(item?.loanType_id ?? 0);
  const [loanAmount, setLoanAmount] = useState(item?.loanAmount ?? 0);
  const [balance, setBalance] = useState(item?.balance ?? 0);
  const [emi, setEmi] = useState(item?.emi ?? 0);

  const loanTypes = useLiveQuery(() => db.loanTypes.toArray()) ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...(item ?? {}),
      loanType_id,
      loanAmount,
      balance,
      emi
    });
  };

  return (
    <FormModal
      show={show}
      onHide={onHide}
      onSubmit={handleSubmit}
      title={item ? 'Edit Liability' : 'Add Liability'}
      isValid={!!loanType_id}
    >
      <Form.Group className="mb-3" controlId="formLiabilityLoanType">
        <Form.Label>Loan Type</Form.Label>
        <Form.Select value={loanType_id} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setLoanTypeId(Number(e.target.value))}>
          {loanTypes.map((type) => (
            <option key={type.id} value={type.id}>{type.name}</option>
          ))}
        </Form.Select>
      </Form.Group>
      <Form.Group className="mb-3" controlId="formLiabilityLoanAmount">
        <Form.Label>Loan Amount</Form.Label>
        <Form.Control type="number" value={loanAmount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLoanAmount(Number(e.target.value))} />
      </Form.Group>
      <Form.Group className="mb-3" controlId="formLiabilityBalance">
        <Form.Label>Balance</Form.Label>
        <Form.Control type="number" value={balance} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBalance(Number(e.target.value))} />
      </Form.Group>
      <Form.Group className="mb-3" controlId="formLiabilityEmi">
        <Form.Label>EMI</Form.Label>
        <Form.Control type="number" value={emi} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmi(Number(e.target.value))} />
      </Form.Group>
    </FormModal>
  );
}

export default function LiabilitiesPage() {
  const liabilities = useLiveQuery(() => db.liabilities.toArray()) ?? [];
  const loanTypes = useLiveQuery(() => db.loanTypes.toArray()) ?? [];

  const handleAdd = async (liability: Partial<Liability>) => {
    await db.liabilities.add(liability as Liability);
  };

  const handleEdit = async (liability: Liability) => {
    await db.liabilities.put(liability);
  };

  const handleDelete = async (liability: Liability) => {
    await db.liabilities.delete(liability.id);
  };

  const getLoanTypeName = (id: number) => {
    const type = loanTypes.find(t => t.id === id);
    return type?.name ?? '';
  };

  return (
    <BasePage<Liability>
      title="Liabilities"
      data={liabilities}
      columns={[
        { field: 'loanType_id', headerName: 'Loan Type', width: 150,
          renderCell: (item) => getLoanTypeName(item.loanType_id) },
        { field: 'loanAmount', headerName: 'Loan Amount', width: 150,
          renderCell: (item) => `₹${item.loanAmount.toLocaleString('en-IN')}` },
        { field: 'balance', headerName: 'Balance', width: 150,
          renderCell: (item) => `₹${item.balance.toLocaleString('en-IN')}` },
        { field: 'emi', headerName: 'EMI', width: 150,
          renderCell: (item) => `₹${item.emi.toLocaleString('en-IN')}` }
      ]}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      FormComponent={LiabilityForm}
    />
  );
}
