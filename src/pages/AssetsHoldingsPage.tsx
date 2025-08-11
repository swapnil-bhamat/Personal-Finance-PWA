import { useState } from 'react';
import {
  TextField,
  DialogTitle,
  DialogContent,
  Button,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import type { AssetHolding } from '../services/db';
import BasePage from '../components/BasePage';

interface AssetHoldingFormProps {
  open: boolean;
  onClose: () => void;
  item?: AssetHolding;
  onSave: (item: AssetHolding | Partial<AssetHolding>) => Promise<void>;
}

function AssetHoldingForm({ item, onSave, onClose }: AssetHoldingFormProps) {
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
    <form onSubmit={handleSubmit}>
      <DialogTitle>{item ? 'Edit' : 'Add'} Asset Holding</DialogTitle>
      <DialogContent>
        <FormControl fullWidth margin="dense">
          <InputLabel>Asset Class</InputLabel>
          <Select
            value={assetClasses_id}
            onChange={(e) => setAssetClassesId(Number(e.target.value))}
          >
            {assetClasses.map((ac) => (
              <MenuItem key={ac.id} value={ac.id}>{ac.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <FormControl fullWidth margin="dense">
          <InputLabel>Asset Sub Class</InputLabel>
          <Select
            value={assetSubClasses_id}
            onChange={(e) => setAssetSubClassesId(Number(e.target.value))}
          >
            {assetSubClasses
              .filter((asc) => asc.assetClasses_id === assetClasses_id)
              .map((asc) => (
                <MenuItem key={asc.id} value={asc.id}>{asc.name}</MenuItem>
              ))}
          </Select>
        </FormControl>

        <FormControl fullWidth margin="dense">
          <InputLabel>Goal</InputLabel>
          <Select
            value={goals_id ?? ''}
            onChange={(e) => setGoalsId(e.target.value ? Number(e.target.value) : null)}
          >
            <MenuItem value="">None</MenuItem>
            {goals.map((goal) => (
              <MenuItem key={goal.id} value={goal.id}>{goal.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth margin="dense">
          <InputLabel>Holder</InputLabel>
          <Select
            value={holders_id}
            onChange={(e) => setHoldersId(Number(e.target.value))}
          >
            {holders.map((holder) => (
              <MenuItem key={holder.id} value={holder.id}>{holder.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          margin="dense"
          label="Asset Detail"
          fullWidth
          value={assetDetail}
          onChange={(e) => setAssetDetail(e.target.value)}
        />

        <TextField
          margin="dense"
          label="Existing Allocation"
          type="number"
          fullWidth
          value={existingAllocation}
          onChange={(e) => setExistingAllocation(Number(e.target.value))}
        />

        <TextField
          margin="dense"
          label="SIP Amount"
          type="number"
          fullWidth
          value={sip}
          onChange={(e) => setSip(Number(e.target.value))}
        />

        <FormControl fullWidth margin="dense">
          <InputLabel>SIP Type</InputLabel>
          <Select
            value={sipTypes_id}
            onChange={(e) => setSipTypesId(Number(e.target.value))}
          >
            {sipTypes.map((st) => (
              <MenuItem key={st.id} value={st.id}>{st.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth margin="dense">
          <InputLabel>Bucket</InputLabel>
          <Select
            value={buckets_id}
            onChange={(e) => setBucketsId(Number(e.target.value))}
          >
            {buckets.map((bucket) => (
              <MenuItem key={bucket.id} value={bucket.id}>{bucket.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          margin="dense"
          label="Comments"
          fullWidth
          multiline
          rows={4}
          value={comments}
          onChange={(e) => setComments(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="contained" color="primary">Save</Button>
      </DialogActions>
    </form>
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
        { field: 'id', headerName: 'ID', width: 70 },
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
        { field: 'comments', headerName: 'Comments', width: 200 }
      ]}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      FormComponent={AssetHoldingForm}
    />
  );
}
