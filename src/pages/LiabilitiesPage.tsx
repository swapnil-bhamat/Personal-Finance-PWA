import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../services/db";
import type { Liability } from "../services/db";
import BasePage from "../components/BasePage";

interface LiabilityFormProps {
  show: boolean;
  onHide: () => void;
  item?: Liability;
  onSave: (item: Liability | Partial<Liability>) => Promise<void>;
}

import FormModal from "../components/FormModal";
import { Form } from "react-bootstrap";
import { toLocalCurrency } from "../utils/numberUtils";

// Helper function to convert DD-MM-YYYY to YYYY-MM-DD for date input
function convertToDateInputFormat(dateStr: string): string {
  if (!dateStr || dateStr.trim() === "") return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return "";
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

// Helper function to convert YYYY-MM-DD to DD-MM-YYYY for storage
function convertFromDateInputFormat(dateStr: string): string {
  if (!dateStr || dateStr.trim() === "") return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return "";
  const [year, month, day] = parts;
  return `${day.padStart(2, "0")}-${month.padStart(2, "0")}-${year}`;
}

function LiabilityForm({ item, onSave, onHide, show }: LiabilityFormProps) {
  const [loanType_id, setLoanTypeId] = useState(item?.loanType_id ?? 0);
  const [loanAmount, setLoanAmount] = useState(item?.loanAmount ?? 0);
  const [balance, setBalance] = useState(item?.balance ?? 0);
  const [emi, setEmi] = useState(item?.emi ?? 0);
  const [loanTakenDate, setLoanTakenDate] = useState(
    item?.loanTakenDate ?? ""
  );
  const [totalMonths, setTotalMonths] = useState(item?.totalMonths ?? 0);

  // Update state when item changes
  useEffect(() => {
    if (item) {
      setLoanTypeId(item.loanType_id ?? 0);
      setLoanAmount(item.loanAmount ?? 0);
      setBalance(item.balance ?? 0);
      setEmi(item.emi ?? 0);
      setLoanTakenDate(item.loanTakenDate ?? "");
      setTotalMonths(item.totalMonths ?? 0);
    } else {
      setLoanTypeId(0);
      setLoanAmount(0);
      setBalance(0);
      setEmi(0);
      setLoanTakenDate("");
      setTotalMonths(0);
    }
  }, [item]);

  const loanTypes = useLiveQuery(() => db.loanTypes.toArray()) ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...(item ?? {}),
      loanType_id,
      loanAmount,
      balance,
      emi,
      loanTakenDate,
      totalMonths,
    });
  };

  return (
    <FormModal
      show={show}
      onHide={onHide}
      onSubmit={handleSubmit}
      title={item ? "Edit Liability" : "Add Liability"}
      isValid={!!loanType_id}
    >
      <Form.Group className="mb-3" controlId="formLiabilityLoanType">
        <Form.Label>Loan Type</Form.Label>
        <Form.Select
          value={loanType_id}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            setLoanTypeId(Number(e.target.value))
          }
        >
          {loanTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </Form.Select>
      </Form.Group>
      <Form.Group className="mb-3" controlId="formLiabilityLoanAmount">
        <Form.Label>Loan Amount</Form.Label>
        <Form.Control
          type="number"
          value={loanAmount}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setLoanAmount(Number(e.target.value))
          }
        />
      </Form.Group>
      <Form.Group className="mb-3" controlId="formLiabilityBalance">
        <Form.Label>Balance</Form.Label>
        <Form.Control
          type="number"
          value={balance}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setBalance(Number(e.target.value))
          }
        />
      </Form.Group>
      <Form.Group className="mb-3" controlId="formLiabilityEmi">
        <Form.Label>EMI</Form.Label>
        <Form.Control
          type="number"
          value={emi}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setEmi(Number(e.target.value))
          }
        />
      </Form.Group>
      <Form.Group className="mb-3" controlId="formLiabilityLoanTakenDate">
        <Form.Label>Loan Taken Date</Form.Label>
        <Form.Control
          type="date"
          value={convertToDateInputFormat(loanTakenDate)}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const dateValue = e.target.value;
            setLoanTakenDate(convertFromDateInputFormat(dateValue));
          }}
        />
      </Form.Group>
      <Form.Group className="mb-3" controlId="formLiabilityTotalMonths">
        <Form.Label>Total Months</Form.Label>
        <Form.Control
          type="number"
          value={totalMonths}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setTotalMonths(Number(e.target.value))
          }
        />
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
    const type = loanTypes.find((t) => t.id === id);
    return type?.name ?? "";
  };

  return (
    <BasePage<Liability>
      title="Liabilities"
      data={liabilities}
      columns={[
        {
          field: "loanType_id",
          headerName: "Loan Type",
          renderCell: (item) => getLoanTypeName(item.loanType_id),
        },
        {
          field: "loanAmount",
          headerName: "Loan Amount",
          renderCell: (item) => toLocalCurrency(item.loanAmount),
        },
        {
          field: "balance",
          headerName: "Balance",
          renderCell: (item) => toLocalCurrency(item.balance),
        },
        {
          field: "emi",
          headerName: "EMI",
          renderCell: (item) => toLocalCurrency(item.emi),
        },
        {
          field: "loanTakenDate",
          headerName: "Loan Taken Date",
          renderCell: (item) => item.loanTakenDate || "-",
        },
        {
          field: "totalMonths",
          headerName: "Total Months",
          renderCell: (item) => item.totalMonths || "-",
        },
      ]}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      FormComponent={LiabilityForm}
    />
  );
}
