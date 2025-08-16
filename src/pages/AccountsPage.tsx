import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Account, db } from '../services/db';
import React from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import BasePage from '../components/BasePage';

interface AccountFormProps {
  show: boolean;
  onHide: () => void;
  item?: Account;
  onSave: (item: Account | Partial<Account>) => Promise<void>;
  isValid?: boolean;
}

const AccountForm = ({ item, onSave, onHide, show, isValid }: AccountFormProps) => {
  const [bank, setBank] = useState(item?.bank ?? '');
  const [accountNumber, setAccountNumber] = useState(item?.accountNumber ?? '');
  const [holders_id, setHoldersId] = useState(item?.holders_id ?? 0);

  const holders = useLiveQuery(() => db.holders.toArray()) ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...(item ?? {}),
      bank,
      accountNumber,
      holders_id
    });
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>{item ? 'Edit' : 'Add'} Account</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Form.Group controlId="formBank">
            <Form.Label>Bank</Form.Label>
            <Form.Control
              type="text"
              value={bank}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBank(e.target.value)}
            />
          </Form.Group>
          <Form.Group controlId="formAccountNumber">
            <Form.Label>Account Number</Form.Label>
            <Form.Control
              type="text"
              value={accountNumber}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAccountNumber(e.target.value)}
            />
          </Form.Group>
          <Form.Group controlId="formHolder">
            <Form.Label>Holder</Form.Label>
            <Form.Select
              value={holders_id}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setHoldersId(Number(e.target.value))}
            >
              {holders.map((holder) => (
                <option key={holder.id} value={holder.id}>{holder.name}</option>
              ))}
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={isValid === false}>Save</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

export default function AccountsPage() {
  const accounts = useLiveQuery(() => db.accounts.toArray()) ?? [];
  const holders = useLiveQuery(() => db.holders.toArray()) ?? [];

  const handleAdd = async (account: Partial<Account>) => {
    const dbAccount = {
      id: account.id ?? Date.now(),
      bank: account.bank ?? '',
      accountNumber: account.accountNumber ?? '',
      holders_id: account.holders_id ?? 0,
    };
    await db.accounts.add(dbAccount);
  };

  const handleEdit = async (account: Account) => {
    const dbAccount = {
      id: account.id,
      bank: account.bank,
      accountNumber: account.accountNumber,
      holders_id: account.holders_id,
    };
    await db.accounts.put(dbAccount);
  };

  const handleDelete = async (account: Account) => {
    await db.accounts.delete(account.id);
  };

  const getHolderName = (id: number) => {
    const holder = holders.find(h => h.id === id);
    return holder?.name ?? '';
  };

  return (
    <BasePage<Account>
      title="Accounts"
      data={accounts}
      columns={[
        { field: 'bank', headerName: 'Bank', width: 200 },
        { field: 'accountNumber', headerName: 'Account Number', width: 200 },
        { field: 'holders_id', headerName: 'Holder', width: 150,
          renderCell: (item) => getHolderName(item.holders_id) }
      ]}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      FormComponent={AccountForm}
    />
  );
}