import { useState } from 'react';
import { Form } from 'react-bootstrap';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import type { AssetPurpose } from '../services/db';
import BasePage from '../components/BasePage';
import { BsBullseye, BsPiggyBank, BsArrowUpShort, BsArrowDownShort } from 'react-icons/bs';

interface AssetPurposeWithStats extends AssetPurpose {
  id: number;
  totalValue: number;
  holdingCount: number;
  monthlyChange: number;
}

interface AssetPurposeFormProps {
  open: boolean;
  onClose: () => void;
  item?: AssetPurpose;
  onSave: (item: AssetPurpose | Partial<AssetPurpose>) => Promise<void>;
}

function AssetPurposeForm({ item, onSave, onClose }: AssetPurposeFormProps) {
  const [name, setName] = useState(item?.name ?? '');
  const [type, setType] = useState(item?.type ?? '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      name,
      type,
      ...(item?.id ? { id: item.id } : {})
    });
    onClose();
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Form.Group className="mb-3">
        <Form.Label>Purpose Name</Form.Label>
        <Form.Control
          type="text"
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          required
          placeholder="Enter purpose name"
        />
      </Form.Group>

      <Form.Group>
        <Form.Label>Purpose Type</Form.Label>
        <Form.Select
          value={type}
          onChange={(e) => setType(e.target.value)}
          required
        >
          <option value="">Select a type</option>
          <option value="retirement">Retirement</option>
          <option value="education">Education</option>
          <option value="emergency">Emergency Fund</option>
          <option value="wealth">Wealth Building</option>
          <option value="other">Other</option>
        </Form.Select>
      </Form.Group>
    </Form>
  );
}

export default function AssetPurposePage() {
  const purposes = useLiveQuery(async () => {
    const items = await db.assetPurposes.toArray();
    const holdings = await db.assetsHoldings.toArray();
    
    return Promise.all(items.filter((p): p is AssetPurpose & { id: number } => p.id !== undefined)
      .map(async (purpose) => {
        const purposeHoldings = holdings.filter(h => h.assetPurposes_id === purpose.id);
        const totalValue = purposeHoldings.reduce((sum, h) => sum + h.existingAllocation, 0);
        const holdingCount = purposeHoldings.length;
        const monthlyChange = Math.random() * 20 - 10; // Mock data, replace with actual calculation
        
        return {
          ...purpose,
          totalValue,
          holdingCount,
          monthlyChange
        };
      }));
  });

  const handleSave = async (purpose: AssetPurpose | Partial<AssetPurpose>) => {
    if ('id' in purpose) {
      await db.assetPurposes.update(purpose.id!, purpose);
    } else {
      await db.assetPurposes.add(purpose as AssetPurpose);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this purpose? This will affect all associated holdings.')) {
      await db.assetPurposes.delete(id);
    }
  };

  const getPurposeIcon = (type: string) => {
    switch (type) {
      case 'retirement':
        return <BsPiggyBank />;
      case 'education':
        return <BsBullseye />;
      default:
        return <BsBullseye />;
    }
  };

  return (
    <BasePage<AssetPurposeWithStats>
      title="Asset Purposes"
      Form={AssetPurposeForm}
      items={purposes as AssetPurposeWithStats[]}
      onSave={handleSave}
      onDelete={handleDelete}
      formatColumns={[
        { 
          field: 'name', 
          header: 'Name',
          format: (_, row) => (
            <div className="d-flex align-items-center">
              {getPurposeIcon(row.type)}
              <span className="ms-2">{row.name}</span>
            </div>
          )
        },
        { 
          field: 'type', 
          header: 'Type',
          format: (value: string) => value.charAt(0).toUpperCase() + value.slice(1)
        },
        { 
          field: 'holdingCount', 
          header: 'Holdings',
          format: (value: number) => `${value} items`
        },
        {
          field: 'totalValue',
          header: 'Total Value',
          format: (value: number) => new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
          }).format(value)
        },
        {
          field: 'monthlyChange',
          header: 'Monthly Change',
          format: (value: number) => (
            <div className={`d-flex align-items-center ${value >= 0 ? 'text-success' : 'text-danger'}`}>
              {value >= 0 ? <BsArrowUpShort /> : <BsArrowDownShort />}
              <span>{Math.abs(value).toFixed(1)}%</span>
            </div>
          )
        }
      ]}
    />
  );
}
