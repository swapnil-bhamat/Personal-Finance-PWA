import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import type { AssetHolding } from '../services/db';
import BasePage from '../components/BasePage';
import FormModal from '../components/FormModal';
import { Form } from 'react-bootstrap';

interface AssetHoldingFormProps {
  show: boolean;
  onHide: () => void;
  item?: AssetHolding;
  onSave: (item: AssetHolding | Partial<AssetHolding>) => Promise<void>;
}

function AssetHoldingForm({ item, onSave, onHide, show }: AssetHoldingFormProps) {
  const [assetClasses_id, setAssetClassesId] = useState(item?.assetClasses_id ?? 0);
  const [assetSubClasses_id, setAssetSubClassesId] = useState(item?.assetSubClasses_id ?? 0);
  const [goals_id, setGoalsId] = useState(item?.goals_id ?? null);
  const [holders_id, setHoldersId] = useState(item?.holders_id ?? 0);
  const [assetDetail, setAssetDetail] = useState(item?.assetDetail ?? '');
  const [existingAllocation, setExistingAllocation] = useState(item?.existingAllocation ?? 0);
  const [sip, setSip] = useState(item?.sip ?? 0);
  const [sipTypes_id, setSipTypesId] = useState(item?.sipTypes_id ?? 0);
  const [buckets_id, setBucketsId] = useState(item?.buckets_id ?? 0);
  const [comments, setComments] = useState(item?.comments ?? '');

  const assetClasses = useLiveQuery(() => db.assetClasses.toArray()) ?? [];
  const assetSubClasses = useLiveQuery(() => db.assetSubClasses.toArray()) ?? [];
  const goals = useLiveQuery(() => db.goals.toArray()) ?? [];
  const holders = useLiveQuery(() => db.holders.toArray()) ?? [];
  const sipTypes = useLiveQuery(() => db.sipTypes.toArray()) ?? [];
  const buckets = useLiveQuery(() => db.buckets.toArray()) ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...(item ?? {}),
      assetClasses_id,
      assetSubClasses_id,
      goals_id,
      holders_id,
      assetDetail,
      existingAllocation,
      sip,
      sipTypes_id,
      buckets_id,
      comments
    });
  };

  return (
    <FormModal
      show={show}
      onHide={onHide}
      onSubmit={handleSubmit}
      title={item ? 'Edit Asset Holding' : 'Add Asset Holding'}
      isValid={!!assetClasses_id}
    >
      <Form.Group className="mb-3" controlId="formAssetClass">
        <Form.Label>Asset Class</Form.Label>
        <Form.Select value={assetClasses_id} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAssetClassesId(Number(e.target.value))}>
          {assetClasses.map((ac) => (
            <option key={ac.id} value={ac.id}>{ac.name}</option>
          ))}
        </Form.Select>
      </Form.Group>
      <Form.Group className="mb-3" controlId="formAssetSubClass">
        <Form.Label>Asset Sub Class</Form.Label>
        <Form.Select value={assetSubClasses_id} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAssetSubClassesId(Number(e.target.value))}>
          {assetSubClasses.filter((asc) => asc.assetClasses_id === assetClasses_id).map((asc) => (
            <option key={asc.id} value={asc.id}>{asc.name}</option>
          ))}
        </Form.Select>
      </Form.Group>
      <Form.Group className="mb-3" controlId="formGoal">
        <Form.Label>Goal</Form.Label>
        <Form.Select value={goals_id ?? ''} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setGoalsId(e.target.value ? Number(e.target.value) : null)}>
          <option value="">None</option>
          {goals.map((goal) => (
            <option key={goal.id} value={goal.id}>{goal.name}</option>
          ))}
        </Form.Select>
      </Form.Group>
      <Form.Group className="mb-3" controlId="formHolder">
        <Form.Label>Holder</Form.Label>
        <Form.Select value={holders_id} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setHoldersId(Number(e.target.value))}>
          {holders.map((holder) => (
            <option key={holder.id} value={holder.id}>{holder.name}</option>
          ))}
        </Form.Select>
      </Form.Group>
      <Form.Group className="mb-3" controlId="formAssetDetail">
        <Form.Label>Asset Detail</Form.Label>
        <Form.Control type="text" value={assetDetail} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAssetDetail(e.target.value)} />
      </Form.Group>
      <Form.Group className="mb-3" controlId="formExistingAllocation">
        <Form.Label>Existing Allocation</Form.Label>
        <Form.Control type="number" value={existingAllocation} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExistingAllocation(Number(e.target.value))} />
      </Form.Group>
      <Form.Group className="mb-3" controlId="formSIP">
        <Form.Label>SIP Amount</Form.Label>
        <Form.Control type="number" value={sip} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSip(Number(e.target.value))} />
      </Form.Group>
      <Form.Group className="mb-3" controlId="formSIPType">
        <Form.Label>SIP Type</Form.Label>
        <Form.Select value={sipTypes_id} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSipTypesId(Number(e.target.value))}>
          {sipTypes.map((st) => (
            <option key={st.id} value={st.id}>{st.name}</option>
          ))}
        </Form.Select>
      </Form.Group>
      <Form.Group className="mb-3" controlId="formBucket">
        <Form.Label>Bucket</Form.Label>
        <Form.Select value={buckets_id} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setBucketsId(Number(e.target.value))}>
          {buckets.map((bucket) => (
            <option key={bucket.id} value={bucket.id}>{bucket.name}</option>
          ))}
        </Form.Select>
      </Form.Group>
      <Form.Group className="mb-3" controlId="formComments">
        <Form.Label>Comments</Form.Label>
        <Form.Control as="textarea" rows={4} value={comments} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setComments(e.target.value)} />
      </Form.Group>
    </FormModal>
  );
}

export default function AssetsHoldingsPage() {
  const assetsHoldings = useLiveQuery(() => db.assetsHoldings.toArray()) ?? [];
  const assetClasses = useLiveQuery(() => db.assetClasses.toArray()) ?? [];
  const assetSubClasses = useLiveQuery(() => db.assetSubClasses.toArray()) ?? [];
  const goals = useLiveQuery(() => db.goals.toArray()) ?? [];
  const holders = useLiveQuery(() => db.holders.toArray()) ?? [];
  const sipTypes = useLiveQuery(() => db.sipTypes.toArray()) ?? [];
  const buckets = useLiveQuery(() => db.buckets.toArray()) ?? [];

  const handleAdd = async (holding: Partial<AssetHolding>) => {
    await db.assetsHoldings.add(holding as AssetHolding);
  };

  const handleEdit = async (holding: AssetHolding) => {
    await db.assetsHoldings.put(holding);
  };

  const handleDelete = async (holding: AssetHolding) => {
    await db.assetsHoldings.delete(holding.id);
  };

  const getAssetClassName = (id: number) => {
    const assetClass = assetClasses.find(ac => ac.id === id);
    return assetClass?.name ?? '';
  };

  const getAssetSubClassName = (id: number) => {
    const assetSubClass = assetSubClasses.find(asc => asc.id === id);
    return assetSubClass?.name ?? '';
  };

  const getGoalName = (id: number | null) => {
    if (!id) return 'None';
    const goal = goals.find(g => g.id === id);
    return goal?.name ?? '';
  };

  const getHolderName = (id: number) => {
    const holder = holders.find(h => h.id === id);
    return holder?.name ?? '';
  };

  const getSipTypeName = (id: number) => {
    const sipType = sipTypes.find(st => st.id === id);
    return sipType?.name ?? '';
  };

  const getBucketName = (id: number) => {
    const bucket = buckets.find(b => b.id === id);
    return bucket?.name ?? '';
  };

  return (
    <BasePage<AssetHolding>
      title="Asset Holdings"
      data={assetsHoldings}
      columns={[
        { field: 'assetClasses_id', headerName: 'Asset Class', width: 150,
          renderCell: (item) => getAssetClassName(item.assetClasses_id) },
        { field: 'assetSubClasses_id', headerName: 'Asset Sub Class', width: 150,
          renderCell: (item) => getAssetSubClassName(item.assetSubClasses_id) },
        { field: 'goals_id', headerName: 'Goal', width: 150,
          renderCell: (item) => getGoalName(item.goals_id) },
        { field: 'holders_id', headerName: 'Holder', width: 150,
          renderCell: (item) => getHolderName(item.holders_id) },
        { field: 'assetDetail', headerName: 'Asset Detail', width: 200 },
        { field: 'existingAllocation', headerName: 'Existing Allocation', width: 150,
          renderCell: (item) => `₹${item.existingAllocation.toLocaleString('en-IN')}` },
        { field: 'sip', headerName: 'SIP', width: 150,
          renderCell: (item) => `₹${item.sip.toLocaleString('en-IN')}` },
        { field: 'sipTypes_id', headerName: 'SIP Type', width: 150,
          renderCell: (item) => getSipTypeName(item.sipTypes_id) },
        { field: 'buckets_id', headerName: 'Bucket', width: 150,
          renderCell: (item) => getBucketName(item.buckets_id) },
        { field: 'comments', headerName: 'Additional Information', width: 200 }
      ]}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      FormComponent={AssetHoldingForm}
    />
  );
}
