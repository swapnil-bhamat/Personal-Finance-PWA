import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../services/db";
import type { CashFlow } from "../services/db";
import BasePage from "../components/BasePage";
import FormModal from "../components/FormModal";
import { Form, Card, Row, Col } from "react-bootstrap";
import { toLocalCurrency } from "../utils/numberUtils";

interface CashFlowFormProps {
  show: boolean;
  onHide: () => void;
  item?: CashFlow;
  onSave: (item: CashFlow | Partial<CashFlow>) => Promise<void>;
}

function CashFlowForm({ item, onSave, onHide, show }: CashFlowFormProps) {
  const [item_name, setItemName] = useState(item?.item ?? "");
  const [accounts_id, setAccountsId] = useState(item?.accounts_id ?? 0);
  const [holders_id, setHoldersId] = useState(item?.holders_id ?? 0);
  const [monthly, setMonthly] = useState(item?.monthly ?? 0);
  const [yearly, setYearly] = useState(item?.yearly ?? 0);
  const [assetPurpose_id, setAssetPurposeId] = useState(
    item?.assetPurpose_id ?? 0
  );
  const [goal_id, setGoalId] = useState(item?.goal_id ?? null);
  const accounts = useLiveQuery(() => db.accounts.toArray()) ?? [];
  const holders = useLiveQuery(() => db.holders.toArray()) ?? [];
  const assetPurposes = useLiveQuery(() => db.assetPurposes.toArray()) ?? [];
  const goals = useLiveQuery(() => db.goals.toArray()) ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...(item ?? {}),
      item: item_name,
      accounts_id,
      holders_id,
      monthly,
      yearly,
      assetPurpose_id,
      goal_id: goal_id === 0 ? null : goal_id,
    });
  };

  return (
    <FormModal
      show={show}
      onHide={onHide}
      onSubmit={handleSubmit}
      title={item ? "Edit Cash Flow" : "Add Cash Flow"}
      isValid={!!item_name}
    >
      <Form.Group className="mb-3" controlId="formItem">
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
      <Form.Group className="mb-3" controlId="formHolder">
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
      <Form.Group className="mb-3" controlId="formAccount">
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
      <Form.Group className="mb-3" controlId="formMonthly">
        <Form.Label>Monthly Amount</Form.Label>
        <Form.Control
          type="number"
          value={monthly}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setMonthly(Number(e.target.value));
            setYearly(Number(e.target.value) * 12);
          }}
        />
      </Form.Group>
      <Form.Group className="mb-3" controlId="formAssetPurpose">
        <Form.Label>Asset Purpose</Form.Label>
        <Form.Select
          value={assetPurpose_id}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            setAssetPurposeId(Number(e.target.value))
          }
        >
          {assetPurposes.map((purpose) => (
            <option key={purpose.id} value={purpose.id}>
              {purpose.name}
            </option>
          ))}
        </Form.Select>
      </Form.Group>
      <Form.Group className="mb-3" controlId="formGoal">
        <Form.Label>Goal (optional)</Form.Label>
        <Form.Select
          value={goal_id ?? 0}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            setGoalId(Number(e.target.value))
          }
        >
          <option value={0}>None</option>
          {goals.map((goal) => (
            <option key={goal.id} value={goal.id}>
              {goal.name}
            </option>
          ))}
        </Form.Select>
      </Form.Group>
    </FormModal>
  );
}

export default function CashFlowPage() {
  const cashFlows = useLiveQuery(() => db.cashFlow.toArray()) ?? [];
  const accounts = useLiveQuery(() => db.accounts.toArray()) ?? [];
  const holders = useLiveQuery(() => db.holders.toArray()) ?? [];
  const assetPurposes = useLiveQuery(() => db.assetPurposes.toArray()) ?? [];
  const goals = useLiveQuery(() => db.goals.toArray()) ?? [];
  const monthlyIncomes = useLiveQuery(() => db.income.toArray()) ?? [];
  const getGoalName = (id: number | null | undefined) => {
    if (!id) return "";
    const goal = goals.find((g) => g.id === id);
    return goal?.name ?? "";
  };

  const handleAdd = async (cashFlow: Partial<CashFlow>) => {
    await db.cashFlow.add(cashFlow as CashFlow);
  };

  const handleEdit = async (cashFlow: CashFlow) => {
    await db.cashFlow.put(cashFlow);
  };

  const handleDelete = async (cashFlow: CashFlow) => {
    await db.cashFlow.delete(cashFlow.id);
  };

  const getAccountName = (id: number) => {
    const account = accounts.find((a) => a.id === id);
    return account ? account.bank : "";
  };

  const getHolderName = (id: number) => {
    const holder = holders.find((h) => h.id === id);
    return holder?.name ?? "";
  };

  const getAssetPurposeName = (id: number) => {
    const purpose = assetPurposes.find((p) => p.id === id);
    return purpose?.name ?? "";
  };

  // Calculate totals
  const totalMonthlyIncome = monthlyIncomes.reduce(
    (sum, inc) => sum + parseFloat(String(inc.monthly)),
    0
  );
  const totalAllocated = cashFlows
    .filter((flow) => flow.assetPurpose_id)
    .reduce((sum, flow) => sum + parseFloat(String(flow.monthly)), 0);
  const gap = totalMonthlyIncome - totalAllocated;

  return (
    <>
      <Row className="mb-2">
        <Col md={4} className="mb-2">
          <Card className="h-100">
            <Card.Body>
              <Card.Title>Total Monthly Income</Card.Title>
              <Card.Text className="h3 text-primary">
                {toLocalCurrency(totalMonthlyIncome)}
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4} className="mb-2">
          <Card className="h-100">
            <Card.Body>
              <Card.Title>Total Allocated</Card.Title>
              <Card.Text className="h3 text-info">
                {toLocalCurrency(totalAllocated)}
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4} className="mb-2">
          <Card className="h-100">
            <Card.Body>
              <Card.Title>Gap</Card.Title>
              <Card.Text
                className={`h3 ${gap >= 0 ? "text-success" : "text-danger"}`}
              >
                {toLocalCurrency(gap)}
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <BasePage<CashFlow>
        title="Monthly Cash Flow"
        data={cashFlows}
        columns={[
          { field: "item", headerName: "Item" },
          {
            field: "holders_id",
            headerName: "Holder",
            renderCell: (item) => getHolderName(item.holders_id),
          },
          {
            field: "accounts_id",
            headerName: "Bank",
            renderCell: (item) => getAccountName(item.accounts_id),
          },
          {
            field: "monthly",
            headerName: "Monthly Amount",
            renderCell: (item) => toLocalCurrency(item.monthly),
          },
          {
            field: "assetPurpose_id",
            headerName: "Asset Purpose",
            renderCell: (item) => getAssetPurposeName(item.assetPurpose_id),
          },
          {
            field: "goal_id",
            headerName: "Goal",
            renderCell: (item) => getGoalName(item.goal_id),
          },
        ]}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        FormComponent={CashFlowForm}
      />
    </>
  );
}
