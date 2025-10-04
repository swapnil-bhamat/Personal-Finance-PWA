import { useState } from "react";
import { Form } from "react-bootstrap";
import FormModal from "./FormModal";

import { BasePageFormProps } from "./BasePage";
import { AllocationRecord } from "../pages/AssetAllocationProjectionPage";

export function AssetAllocationProjectionForm({
  show,
  onHide,
  item,
  onSave,
}: BasePageFormProps<AllocationRecord>) {
  const [monthlyInvestment, setMonthlyInvestment] = useState(
    item?.monthlyInvestment ?? 0
  );
  const [lumpsumExpected, setLumpsumExpected] = useState(
    item?.lumpsumExpected ?? 0
  );
  const [redemptionExpected, setRedemptionExpected] = useState(
    item?.redemptionExpected ?? 0
  );

  const handleSubmit = () => {
    onSave({
      ...item,
      monthlyInvestment,
      lumpsumExpected,
      redemptionExpected,
    });
  };

  return (
    <FormModal
      show={show}
      onHide={onHide}
      onSubmit={handleSubmit}
      title="Edit Projection"
    >
      <Form.Group className="mb-3">
        <Form.Label>Monthly Investment</Form.Label>
        <Form.Control
          type="number"
          value={monthlyInvestment}
          onChange={(e) => setMonthlyInvestment(Number(e.target.value))}
        />
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>Lumpsum Expected</Form.Label>
        <Form.Control
          type="number"
          value={lumpsumExpected}
          onChange={(e) => setLumpsumExpected(Number(e.target.value))}
        />
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>Redemption Expected</Form.Label>
        <Form.Control
          type="number"
          value={redemptionExpected}
          onChange={(e) => setRedemptionExpected(Number(e.target.value))}
        />
      </Form.Group>
    </FormModal>
  );
}
