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


  // Separate data into historical and projected
  const historicalData = reportYear ? data.filter(item => Number(item.year) <= reportYear) : data;
  const futureData = reportYear ? data.filter(item => Number(item.year) > reportYear) : [];
  
  // Build projected data with connection point
  let projectedData: TrendDataPoint[] = [];
  if (reportYear && futureData.length > 0) {
    const reportYearData = data.find(item => Number(item.year) === reportYear);
    if (reportYearData) {
      projectedData = [reportYearData, ...futureData];
    }
  }

  const hasProjections = projectedData.length > 1;
  const hasEnoughHistoricalData = historicalData.length > 1; // Need at least 2 points for a meaningful trend
  const showHistoricalChart = hasEnoughHistoricalData;
  const showProjectionsOnly = !showHistoricalChart && hasProjections;

  // Debug logging
  console.log(`📊 Chart display logic:`, {
    historicalDataPoints: historicalData.length,
    projectedDataPoints: projectedData.length,
    hasEnoughHistoricalData,
    hasProjections,
    showHistoricalChart,
    showProjectionsOnly
  });

  return (
    <div className="bg-white rounded-lg p-4">
      {title && (
        <h3 className="text-lg font-medium text-gray-900 mb-4 text-center">{title}</h3>
      )}
      
      <div className="space-y-6">
        {/* Historical Data Chart - only show if we have enough data points */}
        {showHistoricalChart && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Historical Data</h4>
            <ResponsiveContainer width="100%" height={hasProjections ? height * 0.5 : height}>
            <LineChart data={historicalData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
              })}
            </LineChart>
          </ResponsiveContainer>
          </div>
        )}

        {/* Projected Data Chart */}
        {hasProjections && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-3 h-3 border-2 border-blue-500 rounded-full bg-white"></div>
              <h4 className="text-sm font-medium text-blue-800">Projections</h4>
              <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">Forecast</span>
            </div>
            <ResponsiveContainer width="100%" height={showProjectionsOnly ? height : height * 0.5}>
              <LineChart data={projectedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" />
                <XAxis 
                  dataKey="year" 
                  tick={{ fontSize: 12, fill: '#1e40af' }}
                />
                <YAxis 
                  tickFormatter={formatValue}
                  tick={{ fontSize: 12, fill: '#1e40af' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {lines.map((line, index) => {
                  const lineColor = line.color || defaultColors[index % defaultColors.length];
                  return (
                    <Line
                      key={line.dataKey}
                      type="monotone"
                      dataKey={line.dataKey}
                      stroke={lineColor}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={(props: any) => {
                        const year = Number(props.payload?.year);
                        const isReportYear = reportYear && year === reportYear;
                        return (
                          <circle 
                            cx={props.cx} 
                            cy={props.cy} 
                            r={4} 
                            fill={isReportYear ? lineColor : "white"}
                            stroke={lineColor}
                            strokeWidth={2}
                          />
                        );
                      }}
                      activeDot={{ r: 6 }}
                      name={`${line.name} (Projected)`}
                      connectNulls={false}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default LinearTrendChart;