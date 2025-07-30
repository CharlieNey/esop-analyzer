import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface TrendDataPoint {
  year: string | number;
  [key: string]: string | number;
}

interface LinearTrendChartProps {
  data: TrendDataPoint[];
  title?: string;
  height?: number;
  formatValue?: (value: number) => string;
  reportYear?: number; // Year of the report publication
  lines?: {
    dataKey: string;
    name: string;
    color: string;
  }[];
}

const LinearTrendChart: React.FC<LinearTrendChartProps> = ({
  data,
  title = "Financial Trends",
  height = 300,
  formatValue = (value) => {
    if (Math.abs(value) >= 1000000000) {
      return `$${(value / 1000000000).toFixed(1)}B`;
    } else if (Math.abs(value) >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (Math.abs(value) >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    } else {
      return `$${value.toFixed(0)}`;
    }
  },
  reportYear,
  lines = []
}) => {
  const defaultColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const year = Number(label);
      const isProjected = reportYear && year > reportYear;
      
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{`Year: ${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.name}${isProjected ? ' (Projected)' : ''}: ${formatValue(entry.value)}`}
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
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis 
            dataKey="year" 
            tick={{ fontSize: 12, fill: '#374151' }}
          />
          <YAxis 
            tickFormatter={formatValue}
            tick={{ fontSize: 12, fill: '#6b7280' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {lines.map((line, index) => {
            const lineColor = line.color || defaultColors[index % defaultColors.length];
            
            if (!reportYear) {
              // No report year specified, render as single solid line
              return (
                <Line
                  key={line.dataKey}
                  type="monotone"
                  dataKey={line.dataKey}
                  stroke={lineColor}
                  strokeWidth={2}
                  dot={{ r: 4, fill: lineColor }}
                  activeDot={{ r: 6 }}
                  name={line.name}
                  connectNulls={false}
                />
              );
            }

            // Split data into historical and predicted segments
            const historicalData = data.filter(item => Number(item.year) <= reportYear);
            
            // For projected data, include the report year as the starting point to ensure proper connection
            const projectedData = data.filter(item => Number(item.year) >= reportYear);
            
            // If we have both historical and projected data, make sure they connect properly
            // by ensuring the report year data point exists in both datasets
            const reportYearData = data.find(item => Number(item.year) === reportYear);
            if (reportYearData && projectedData.length > 1 && !projectedData.some(item => Number(item.year) === reportYear)) {
              projectedData.unshift(reportYearData);
            }
            
            return (
              <React.Fragment key={line.dataKey}>
                {/* Historical data line (solid) */}
                {historicalData.length > 0 && (
                  <Line
                    type="monotone"
                    dataKey={line.dataKey}
                    stroke={lineColor}
                    strokeWidth={2}
                    dot={(props: any) => (
                      <circle 
                        cx={props.cx} 
                        cy={props.cy} 
                        r={4} 
                        fill={lineColor}
                        stroke={lineColor}
                      />
                    )}
                    activeDot={{ r: 6 }}
                    name={line.name}
                    data={historicalData}
                    connectNulls={false}
                  />
                )}
                {/* Projected data line (dashed) - only if we have projected data */}
                {projectedData.length > 1 && (
                  <Line
                    type="monotone"
                    dataKey={line.dataKey}
                    stroke={lineColor}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={(props: any) => {
                      const year = Number(props.payload?.year);
                      // For the connection point (report year), use a solid dot to match historical line
                      const isConnectionPoint = year === reportYear;
                      return (
                        <circle 
                          cx={props.cx} 
                          cy={props.cy} 
                          r={4} 
                          fill={isConnectionPoint ? lineColor : "white"}
                          stroke={lineColor}
                          strokeWidth={2}
                        />
                      );
                    }}
                    activeDot={{ r: 6 }}
                    name={`${line.name} (Projected)`}
                    data={projectedData}
                    connectNulls={false}
                  />
                )}
              </React.Fragment>
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default LinearTrendChart;