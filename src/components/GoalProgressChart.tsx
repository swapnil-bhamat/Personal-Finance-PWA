import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { toLocalCurrency } from "../utils/numberUtils";

interface GoalProgress {
  id: number;
  name: string;
  targetAmount: number;
  allocatedAmount: number;
  gap: number;
}

interface GoalProgressChartProps {
  data: GoalProgress[];
}

export default function GoalProgressChart({ data }: GoalProgressChartProps) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={data}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis tickFormatter={(value) => toLocalCurrency(value)} />
        <Tooltip
          formatter={(value: number) => toLocalCurrency(value)}
          labelStyle={{ color: "black" }}
        />
        <Legend />
        <Bar dataKey="targetAmount" name="Target Amount" fill="#8884d8" />
        <Bar dataKey="allocatedAmount" name="Allocated Assets" fill="#82ca9d" />
        <Bar dataKey="gap" name="Gap" fill="#ff7675" />
      </BarChart>
    </ResponsiveContainer>
  );
}
