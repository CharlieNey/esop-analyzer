import React from 'react';
import { Radar, RadarChart as RechartsRadar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface RadarData {
  subject: string;
  current: number;
  benchmark?: number;
  fullMark: number;
}

interface RadarChartProps {
  data: RadarData[];
  title?: string;
  height?: number;
  showBenchmark?: boolean;
}

const RadarChart: React.FC<RadarChartProps> = ({
  data,
  title = "Performance Analysis",
  height = 300,
  showBenchmark = true
}) => {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey === 'current' ? 'Current' : 'Benchmark'}: {entry.value.toFixed(1)}
            </p>
          ))}
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
        <RechartsRadar data={data} margin={{ top: 20, right: 80, bottom: 20, left: 80 }}>
          <PolarGrid stroke="#e5e7eb" strokeDasharray="3 3" />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fontSize: 12, fill: '#374151', fontWeight: 500 }}
          />
          <PolarRadiusAxis 
            angle={90} 
            domain={[0, 'dataMax']} 
            tick={{ fontSize: 10, fill: '#6b7280' }}
            axisLine={false}
          />
          <Radar
            name="Current Performance"
            dataKey="current"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.3}
            strokeWidth={3}
            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 5 }}
          />
          {showBenchmark && (
            <Radar
              name="Industry Benchmark"
              dataKey="benchmark"
              stroke="#ef4444"
              fill="#ef4444"
              fillOpacity={0.1}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
            />
          )}
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
            iconType="line"
            iconSize={12}
          />
        </RechartsRadar>
      </ResponsiveContainer>
    </div>
  );
};

export default RadarChart;