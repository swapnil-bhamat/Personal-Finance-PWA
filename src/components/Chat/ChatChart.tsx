import React from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart
} from 'recharts';
import { Card } from 'react-bootstrap';

interface ChatChartProps {
  type: 'bar' | 'pie' | 'line' | 'composed';
  data: any[];
  title: string;
  xAxisKey?: string;
  dataKeys: string[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const ChatChart: React.FC<ChatChartProps> = ({ type, data, title, xAxisKey, dataKeys }) => {
  const renderChart = () => {
    switch (type) {
      case 'bar':
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xAxisKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {dataKeys.map((key, index) => (
              <Bar key={key} dataKey={key} fill={COLORS[index % COLORS.length]} />
            ))}
          </BarChart>
        );
      case 'line':
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xAxisKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {dataKeys.map((key, index) => (
              <Line key={key} type="monotone" dataKey={key} stroke={COLORS[index % COLORS.length]} />
            ))}
          </LineChart>
        );
      case 'pie':
        return (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={60}
              fill="#8884d8"
              dataKey={dataKeys[0]}
            >
              {data.map((_entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        );
       case 'composed':
          return (
            <ComposedChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={xAxisKey} />
                <YAxis />
                <Tooltip />
                <Legend />
                {dataKeys.map((key, index) => {
                   if (index < 2) return <Bar key={key} dataKey={key} fill={COLORS[index % COLORS.length]} />;
                   return <Line key={key} type="monotone" dataKey={key} stroke={COLORS[index % COLORS.length]} />;
                })}
            </ComposedChart>
          )
      default:
        return <div>Unsupported chart type</div>;
    }
  };

  return (
    <Card className="my-2 border-0 shadow-sm" style={{ width: '100%', minHeight: '250px' }}>
      <Card.Body className="p-2">
        <h6 className="text-center mb-3 text-muted">{title}</h6>
        <ResponsiveContainer width="100%" height={200}>
          {renderChart()}
        </ResponsiveContainer>
      </Card.Body>
    </Card>
  );
};

export default ChatChart;
