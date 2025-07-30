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
          {data.type && (
            <p className="text-xs text-gray-500 capitalize">
              Type: {data.type}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg p-4">
      {title && (
        <h3 className="text-lg font-medium text-gray-900 mb-4 text-center">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 12, fill: '#374151' }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            tickFormatter={formatValue}
            tick={{ fontSize: 12, fill: '#6b7280' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="displayValue" stackId="waterfall" radius={[2, 2, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      
      {/* Legend */}
      <div className="flex justify-center mt-4 space-x-6">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="text-sm text-gray-600">Positive</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span className="text-sm text-gray-600">Negative</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gray-800 rounded"></div>
          <span className="text-sm text-gray-600">Total</span>
        </div>
      </div>
    </div>
  );
};

export default WaterfallChart;