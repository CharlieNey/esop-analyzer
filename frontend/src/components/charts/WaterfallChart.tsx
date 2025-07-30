import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface WaterfallData {
  name: string;
  value: number;
  cumulative: number;
  type: 'positive' | 'negative' | 'total';
}

interface WaterfallChartProps {
  data: WaterfallData[];
  title?: string;
  height?: number;
  formatValue?: (value: number) => string;
}

const WaterfallChart: React.FC<WaterfallChartProps> = ({ 
  data, 
  title = "Waterfall Analysis", 
  height = 300,
  formatValue = (value) => `$${(value / 1000000).toFixed(1)}M`
}) => {
  // Transform data for waterfall effect
  const chartData = data.map((item, index) => {
    const prevCumulative = index > 0 ? data[index - 1].cumulative : 0;
    
    return {
      ...item,
      displayValue: item.type === 'total' ? item.cumulative : item.value,
      stackBase: item.type === 'total' ? 0 : (item.value >= 0 ? prevCumulative : prevCumulative + item.value),
      color: item.type === 'total' ? '#1f2937' : (item.value >= 0 ? '#10b981' : '#ef4444')
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          <p className="text-sm text-gray-600">
            Value: <span className="font-medium">{formatValue(data.value)}</span>
          </p>
          <p className="text-sm text-gray-600">
            Cumulative: <span className="font-medium">{formatValue(data.cumulative)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg p-4">
      {title && (
        <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            tickFormatter={formatValue}
            tick={{ fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="displayValue" stackId="waterfall">
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default WaterfallChart;