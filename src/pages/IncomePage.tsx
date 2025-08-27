import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../services/db";
import type { Income } from "../services/db";
import BasePage from "../components/BasePage";

interface IncomeFormProps {
  show: boolean;
  onHide: () => void;
  item?: Income;
  onSave: (item: Income | Partial<Income>) => Promise<void>;
}

import FormModal from "../components/FormModal";
import { Form } from "react-bootstrap";
import { toLocalCurrency } from "../utils/numberUtils";

function IncomeForm({ item, onSave, onHide, show }: IncomeFormProps) {
  const [item_name, setItemName] = useState(item?.item ?? "");
  const [accounts_id, setAccountsId] = useState(item?.accounts_id ?? 0);
  const [holders_id, setHoldersId] = useState(item?.holders_id ?? 0);
  const [monthly, setMonthly] = useState(item?.monthly ?? "0");

  const accounts = useLiveQuery(() => db.accounts.toArray()) ?? [];
  const holders = useLiveQuery(() => db.holders.toArray()) ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...(item ?? {}),
      item: item_name,
      accounts_id,
      holders_id,
      monthly,
    });
  };

  return (
    <FormModal
      show={show}
      onHide={onHide}
      onSubmit={handleSubmit}
      title={item ? "Edit Income" : "Add Income"}
      isValid={!!item_name}
    >
      <Form.Group className="mb-3" controlId="formIncomeItem">
        <Form.Label>Item</Form.Label>
        <Form.Control
          type="text"
          value={item_name}
          autoFocus
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setItemName(e.target.value)
          }
        />
      </Form.Group>
      <Form.Group className="mb-3" controlId="formIncomeHolder">
        <Form.Label>Holder</Form.Label>
        <Form.Select
          value={holders_id}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            setHoldersId(Number(e.target.value))
          }
        >
          {holders.map((holder) => (
            <option key={holder.id} value={holder.id}>
              {holder.name}
            </option>
          ))}
        </Form.Select>
      </Form.Group>
      <Form.Group className="mb-3" controlId="formIncomeAccount">
        <Form.Label>Account</Form.Label>
        <Form.Select
          value={accounts_id}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            setAccountsId(Number(e.target.value))
          }
        >
          {accounts
            .filter((acc) => acc.holders_id === holders_id)
            .map((account) => (
              <option key={account.id} value={account.id}>
                {account.bank}
              </option>
            ))}
        </Form.Select>
      </Form.Group>
      <Form.Group className="mb-3" controlId="formIncomeMonthly">
        <Form.Label>Monthly Amount</Form.Label>
        <Form.Control
          type="number"
          value={monthly}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setMonthly(e.target.value)
          }
        />
      </Form.Group>
    </FormModal>
  );
}

export default function IncomePage() {
  const incomes = useLiveQuery(() => db.income.toArray()) ?? [];
  const accounts = useLiveQuery(() => db.accounts.toArray()) ?? [];
  const holders = useLiveQuery(() => db.holders.toArray()) ?? [];

  const handleAdd = async (income: Partial<Income>) => {
    await db.income.add(income as Income);
  };

  const handleEdit = async (income: Income) => {
    await db.income.put(income);
  };

  const handleDelete = async (income: Income) => {
    await db.income.delete(income.id);
  };

  const getAccountName = (id: number) => {
    const account = accounts.find((a) => a.id === id);
    return account ? account.bank : "";
  };

  const getHolderName = (id: number) => {
    const holder = holders.find((h) => h.id === id);
    return holder?.name ?? "";
  };

  return (
    <BasePage<Income>
      title="Income"
      data={incomes}
      columns={[
        { field: "item", headerName: "Item" },
        {
          field: "holders_id",
          headerName: "Holder",
          renderCell: (item) => getHolderName(item.holders_id),
        },
        {
          field: "accounts_id",
          headerName: "Account",
          renderCell: (item) => getAccountName(item.accounts_id),
        },
        {
          field: "monthly",
          headerName: "Monthly Amount",
          renderCell: (item) => toLocalCurrency(Number(item.monthly)),
        },
      ]}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      FormComponent={IncomeForm}
    />
  );
}
