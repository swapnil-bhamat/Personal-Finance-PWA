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
  // Transform data for stacked bar chart
  const transformedData = data.map((item) => ({
    name: item.name,
    Allocated: item.allocatedAmount,
    Gap: item.gap,
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={transformedData}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 5,
        }}
        barSize={50}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 12 }}
          interval={0}
          angle={-45}
          textAnchor="end"
          height={60}
        />
        <YAxis
          tickFormatter={(value) => toLocalCurrency(value)}
          tick={{ fontSize: 12 }}
        />
        <Tooltip
          formatter={(value: number | undefined) => toLocalCurrency(value)}
          labelStyle={{ color: "black" }}
        />
        <Legend />
        <Bar
          dataKey="Allocated"
          stackId="a"
          name="Allocated Assets"
          fill="#82ca9d"
        />
        <Bar dataKey="Gap" stackId="a" name="Gap to Target" fill="#ff7675" />
      </BarChart>
    </ResponsiveContainer>
  );
}
