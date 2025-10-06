import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

interface AnalyticsChartProps {
  title: string;
  data: any[];
  type?: 'line' | 'area' | 'bar';
  dataKey: string;
  xAxisKey?: string;
  color?: string;
  height?: number;
}

export const AnalyticsChart = ({ 
  title, 
  data, 
  type = 'line',
  dataKey,
  xAxisKey = 'date',
  color = '#8884d8',
  height = 300
}: AnalyticsChartProps) => {
  const ChartComponent = type === 'area' ? AreaChart : type === 'bar' ? BarChart : LineChart;
  const DataComponent = type === 'area' ? Area : type === 'bar' ? Bar : Line;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <ChartComponent data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey={xAxisKey} 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => {
                // Format date if it looks like a date
                if (value && typeof value === 'string' && value.includes('-')) {
                  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }
                return value;
              }}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <DataComponent 
              type="monotone" 
              dataKey={dataKey} 
              stroke={color} 
              fill={color}
              fillOpacity={type === 'area' ? 0.3 : undefined}
            />
          </ChartComponent>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
