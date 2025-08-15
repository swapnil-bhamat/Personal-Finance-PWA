import { useState } from 'react';
import { Form } from 'react-bootstrap';
import { useLiveQuery } from 'dexie-react-hooks';
import { BsCurrencyRupee } from 'react-icons/bs';
import { db } from '../services/db';
import type { AssetHolding, AssetClass, AssetPurpose, Holder } from '../services/db';
import BasePage from '../components/BasePage';

interface AssetHoldingWithRelations extends AssetHolding {
  id: number;
  assetClass?: AssetClass;
  assetPurpose?: AssetPurpose;
  holder?: Holder;
  allocationPercentage: number;
}

interface AssetHoldingFormProps {
  open: boolean;
  onClose: () => void;
  item?: AssetHolding;
  onSave: (item: AssetHolding | Partial<AssetHolding>) => Promise<void>;
}

function AssetHoldingForm({ item, onSave, onClose }: AssetHoldingFormProps) {
  const [name, setName] = useState(item?.name ?? '');
  const [existingAllocation, setExistingAllocation] = useState(item?.existingAllocation ?? 0);
  const [targetAllocation, setTargetAllocation] = useState(item?.targetAllocation ?? 0);
  const [assetClasses_id, setAssetClassId] = useState(item?.assetClasses_id ?? 0);
  const [assetPurposes_id, setAssetPurposeId] = useState(item?.assetPurposes_id ?? 0);
  const [holders_id, setHolderId] = useState(item?.holders_id ?? 0);

  const assetClasses = useLiveQuery(() => db.assetClasses.toArray()) ?? [];
  const assetPurposes = useLiveQuery(() => db.assetPurposes.toArray()) ?? [];
  const holders = useLiveQuery(() => db.holders.toArray()) ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      name,
      existingAllocation,
      targetAllocation,
      assetClasses_id,
      assetPurposes_id,
      holders_id,
      ...(item?.id ? { id: item.id } : {})
    });
    onClose();
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Form.Group className="mb-3">
        <Form.Label>Asset Name</Form.Label>
        <Form.Control
          type="text"
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          required
          placeholder="Enter asset name"
        />
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>Current Value</Form.Label>
        <Form.Control
          type="number"
          value={existingAllocation}
          onChange={(e) => setExistingAllocation(Number(e.target.value))}
          required
          min="0"
        />
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>Target Value</Form.Label>
        <Form.Control
          type="number"
          value={targetAllocation}
          onChange={(e) => setTargetAllocation(Number(e.target.value))}
          required
          min="0"
        />
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>Asset Class</Form.Label>
        <Form.Select
          value={assetClasses_id}
          onChange={(e) => setAssetClassId(Number(e.target.value))}
          required
        >
          <option value="">Select an asset class</option>
          {assetClasses.map((ac) => (
            <option key={ac.id} value={ac.id}>
              {ac.name}
            </option>
          ))}
        </Form.Select>
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>Asset Purpose</Form.Label>
        <Form.Select
          value={assetPurposes_id}
          onChange={(e) => setAssetPurposeId(Number(e.target.value))}
          required
        >
          <option value="">Select a purpose</option>
          {assetPurposes.map((ap) => (
            <option key={ap.id} value={ap.id}>
              {ap.name}
            </option>
          ))}
        </Form.Select>
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>Holder</Form.Label>
        <Form.Select
          value={holders_id}
          onChange={(e) => setHolderId(Number(e.target.value))}
          required
        >
          <option value="">Select a holder</option>
          {holders.map((holder) => (
            <option key={holder.id} value={holder.id}>
              {holder.name}
            </option>
          ))}
        </Form.Select>
      </Form.Group>
    </Form>
  );
}

export default function AssetsHoldingsPage() {
  const assetHoldings = useLiveQuery(async () => {
    const holdings = await db.assetsHoldings.toArray();
    const totalValue = holdings.reduce((sum, h) => sum + h.existingAllocation, 0);
    
    return Promise.all(
      holdings.filter((h): h is AssetHolding & { id: number } => h.id !== undefined)
        .map(async (holding) => {
          const assetClass = await db.assetClasses.get(holding.assetClasses_id);
          const assetPurpose = await db.assetPurposes.get(holding.assetPurposes_id);
          const holder = await db.holders.get(holding.holders_id);

          return {
            ...holding,
            assetClass,
            assetPurpose,
            holder,
            allocationPercentage: (holding.existingAllocation / totalValue) * 100
          };
        })
    );
  });

  const handleSave = async (holding: AssetHolding | Partial<AssetHolding>) => {
    if ('id' in holding) {
      await db.assetsHoldings.update(holding.id!, holding);
    } else {
      await db.assetsHoldings.add(holding as AssetHolding);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this holding?')) {
      await db.assetsHoldings.delete(id);
    }
  };

  return (
    <BasePage<AssetHoldingWithRelations>
      title="Asset Holdings"
      Form={AssetHoldingForm}
      items={assetHoldings as AssetHoldingWithRelations[]}
      onSave={handleSave}
      onDelete={handleDelete}
      formatColumns={[
        { field: 'name', header: 'Asset Name' },
        {
          field: 'existingAllocation',
          header: 'Current Value',
          format: (value: number) => new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
          }).format(value)
        },
        {
          field: 'targetAllocation',
          header: 'Target Value',
          format: (value: number) => new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
          }).format(value)
        },
        { 
          field: 'assetClass',
          header: 'Asset Class',
          format: (value?: AssetClass) => value?.name ?? '-'
        },
        {
          field: 'assetPurpose',
          header: 'Purpose',
          format: (value?: AssetPurpose) => value?.name ?? '-'
        },
        {
          field: 'holder',
          header: 'Holder',
          format: (value?: Holder) => value?.name ?? '-'
        },
        {
          field: 'allocationPercentage',
          header: 'Allocation %',
          format: (value: number) => new Intl.NumberFormat('en-IN', {
            style: 'percent',
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
          }).format(value / 100)
        }
      ]}
    />
  );
}
  );
}
