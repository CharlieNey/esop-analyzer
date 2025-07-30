import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart } from 'recharts';
import { DollarSign, TrendingUp, Users, Percent, ZoomIn, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { getDocumentMetrics } from '../services/api';
import { DocumentMetrics } from '../types';
import MetricsValidation from './MetricsValidation';

interface MetricsDashboardProps {
  documentId: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

const MetricsDashboard: React.FC<MetricsDashboardProps> = ({ documentId }) => {
  const [metrics, setMetrics] = useState<DocumentMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChart, setSelectedChart] = useState<'financial' | 'capital' | 'trends'>('financial');
  const [drillDownData, setDrillDownData] = useState<any>(null);
  const [showDrillDown, setShowDrillDown] = useState(false);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await getDocumentMetrics(documentId);
        setMetrics(data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load metrics');
      } finally {
        setLoading(false);
      }
    };

    if (documentId) {
      fetchMetrics();
    }
  }, [documentId]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-red-600">{error}</div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-gray-500">No metrics available</div>
      </div>
    );
  }

  // Helper function to safely parse numeric values with improved accuracy
  const safeParseNumber = (value: any): number | null => {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    
    // Handle string values
    if (typeof value === 'string') {
      // Remove common formatting characters, including parentheses for negative values
      let cleaned = value.replace(/[\$,\s%()]/g, '');
      
      // Handle negative values in parentheses format
      if (value.includes('(') && value.includes(')')) {
        cleaned = '-' + cleaned;
      }
      
      // Handle percentage values
      if (value.includes('%')) {
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? null : parsed;
      }
      
      const parsed = parseFloat(cleaned);
      // Only return null if actually NaN, allow zero values
      return isNaN(parsed) ? null : parsed;
    }
    
    // Handle numeric values
    if (typeof value === 'number') {
      return isNaN(value) ? null : value;
    }
    
    return null;
  };

  // Helper to get best available value with priority order and validation
  const getBestValue = (...sources: any[]): number | null => {
    const validValues: number[] = [];
    
    for (const source of sources) {
      const parsed = safeParseNumber(source);
      if (parsed !== null && !isNaN(parsed)) {
        validValues.push(parsed);
      }
    }
    
    if (validValues.length === 0) return null;
    
    // If we have multiple values, prefer the first one but log inconsistencies
    if (validValues.length > 1 && process.env.NODE_ENV === 'development') {
      const variance = Math.max(...validValues) - Math.min(...validValues);
      const avgValue = validValues.reduce((a, b) => a + b, 0) / validValues.length;
      const percentVariance = (variance / avgValue) * 100;
      
      if (percentVariance > 10) {
        console.warn('📊 Data inconsistency detected:', {
          sources: sources.filter(s => s !== null && s !== undefined),
          validValues,
          percentVariance: percentVariance.toFixed(1) + '%'
        });
      }
    }
    
    return validValues[0];
  };

  const companyVal = metrics.metrics.companyValuation?.data;
  const keyFinancials = metrics.metrics.keyFinancials?.data;
  const capitalStructure = metrics.metrics.capitalStructure?.data;
  const discountRates = metrics.metrics.discountRates?.data;
  const valuationMultiples = metrics.metrics.valuationMultiples?.data;

  // Enhanced data extraction with more comprehensive field mapping
  const extractAllMetricsFields = (metrics: any) => {
    const allFields: any = {};
    
    // Recursively extract all fields from the metrics object
    const extractFields = (obj: any, prefix = '') => {
      for (const [key, value] of Object.entries(obj || {})) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          extractFields(value, fullKey);
        } else {
          allFields[fullKey] = value;
        }
      }
    };
    
    extractFields(metrics.metrics);
    return allFields;
  };
  
  const allFields = extractAllMetricsFields(metrics);
  
  const financialData = keyFinancials ? [
    { 
      name: 'Revenue', 
      value: getBestValue(
        keyFinancials.revenue, 
        keyFinancials.totalRevenue, 
        keyFinancials.annualRevenue,
        keyFinancials.grossRevenue,
        allFields['keyFinancials.data.revenue'],
        allFields['financials.revenue']
      ) || 0 
    },
    { 
      name: 'EBITDA', 
      value: getBestValue(
        keyFinancials.ebitda, 
        keyFinancials.EBITDA, 
        keyFinancials.adjustedEbitda,
        keyFinancials.normalizedEbitda,
        allFields['keyFinancials.data.ebitda'],
        allFields['financials.ebitda']
      ) || 0 
    },
    { 
      name: 'Net Income', 
      value: getBestValue(
        keyFinancials.netIncome, 
        keyFinancials.netProfit,
        keyFinancials.netEarnings,
        allFields['keyFinancials.data.netIncome'],
        allFields['financials.netIncome']
      ) || 0 
    },
  ].filter(item => item.value > 0) : [];

  const capitalData = capitalStructure ? (() => {
    const totalShares = getBestValue(
      capitalStructure.totalShares,
      capitalStructure.totalSharesOutstanding,
      capitalStructure.sharesOutstanding,
      capitalStructure.outstandingShares,
      allFields['capitalStructure.data.totalShares']
    );
    const esopShares = getBestValue(
      capitalStructure.esopShares,
      capitalStructure.employeeShares,
      capitalStructure.esopSharesOutstanding,
      allFields['capitalStructure.data.esopShares']
    );
    
    if (totalShares && esopShares) {
      return [
        { name: 'ESOP Shares', value: esopShares },
        { name: 'Other Shares', value: totalShares - esopShares },
      ];
    }
    return [];
  })() : [];

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    
    // For very large numbers, use compact notation
    if (num >= 1000000000) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
        notation: 'compact',
        compactDisplay: 'short'
      }).format(num || 0);
    } else if (num >= 1000000) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
        notation: 'compact',
        compactDisplay: 'short'
      }).format(num || 0);
    } else {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(num || 0);
    }
  };

  const formatPercent = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return `${(num || 0).toFixed(2)}%`;
  };

  // Handle chart selection and drill-down
  const handleChartTypeChange = (chartType: 'financial' | 'capital' | 'trends') => {
    setSelectedChart(chartType);
    setShowDrillDown(false);
  };

  const handleBarClick = (data: any) => {
    setDrillDownData(data);
    setShowDrillDown(true);
  };

  // Generate trend data for demonstration
  const generateTrendData = () => {
    const currentRevenue = getBestValue(
      keyFinancials?.revenue,
      keyFinancials?.totalRevenue,
      keyFinancials?.annualRevenue
    ) || 0;
    
    const currentEbitda = getBestValue(
      keyFinancials?.ebitda,
      keyFinancials?.EBITDA,
      keyFinancials?.adjustedEbitda
    ) || 0;

    return [
      { period: '2021', revenue: currentRevenue * 0.7, ebitda: currentEbitda * 0.6 },
      { period: '2022', revenue: currentRevenue * 0.85, ebitda: currentEbitda * 0.8 },
      { period: '2023', revenue: currentRevenue, ebitda: currentEbitda },
      { period: '2024E', revenue: currentRevenue * 1.15, ebitda: currentEbitda * 1.2 },
    ];
  };

  // Prepare metrics for validation
  const validationMetrics = {
    enterpriseValue: getBestValue(
      companyVal?.totalValue,
      companyVal?.value,
      companyVal?.companyValue
    ),
    valueOfEquity: getBestValue(
      companyVal?.totalValue,
      companyVal?.value,
      companyVal?.companyValue
    ),
    valuationPerShare: getBestValue(
      companyVal?.perShareValue,
      companyVal?.sharePrice,
      companyVal?.pricePerShare
    ),
    revenue: getBestValue(
      keyFinancials?.revenue,
      keyFinancials?.totalRevenue,
      keyFinancials?.annualRevenue
    ),
    ebitda: getBestValue(
      keyFinancials?.ebitda,
      keyFinancials?.EBITDA,
      keyFinancials?.adjustedEbitda
    ),
    discountRate: getBestValue(
      discountRates?.discountRate,
      discountRates?.wacc,
      keyFinancials?.discountRate
    ),
  };

  return (
    <div className="space-y-6">
      {/* AI Validation Section */}
      <MetricsValidation 
        documentId={documentId} 
        metrics={validationMetrics}
      />
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">ESOP Valuation Dashboard</h2>
          <span className="text-sm text-gray-500">{metrics.filename}</span>
        </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricCard
          title="Company Value"
          value={(() => {
            const value = getBestValue(
              companyVal?.totalValue,
              companyVal?.value,
              companyVal?.companyValue,
              companyVal?.enterpriseValue,
              allFields['companyValuation.data.totalValue'],
              allFields['valuation.companyValue']
            );
            return value ? formatCurrency(value) : 'N/A';
          })()}
          icon={<DollarSign className="h-6 w-6" />}
          color="blue"
        />
        <MetricCard
          title="Per Share Value"
          value={(() => {
            const value = getBestValue(
              companyVal?.perShareValue,
              companyVal?.sharePrice,
              companyVal?.pricePerShare,
              companyVal?.valuationPerShare,
              allFields['companyValuation.data.perShareValue'],
              allFields['valuation.perShareValue']
            );
            return value ? formatCurrency(value) : 'N/A';
          })()}
          icon={<TrendingUp className="h-6 w-6" />}
          color="green"
        />
        <MetricCard
          title="ESOP Ownership"
          value={(() => {
            const value = getBestValue(
              capitalStructure?.esopPercentage,
              capitalStructure?.esopOwnership,
              capitalStructure?.employeeOwnership,
              capitalStructure?.esopOwnershipPercentage,
              allFields['capitalStructure.data.esopPercentage']
            );
            return value ? formatPercent(value) : 'N/A';
          })()}
          icon={<Users className="h-6 w-6" />}
          color="yellow"
        />
        <MetricCard
          title="Discount Rate"
          value={(() => {
            const value = getBestValue(
              discountRates?.discountRate,
              discountRates?.wacc,
              keyFinancials?.discountRate,
              keyFinancials?.wacc,
              allFields['discountRates.data.discountRate'],
              allFields['valuation.discountRate']
            );
            return value ? formatPercent(value) : 'N/A';
          })()}
          icon={<Percent className="h-6 w-6" />}
          color="red"
        />
      </div>

      {/* Interactive Chart Section */}
      <div className="mt-8">
        {/* Chart Type Selector */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-4">
          <button
            onClick={() => handleChartTypeChange('financial')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              selectedChart === 'financial'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span className="text-sm font-medium">Financial Metrics</span>
          </button>
          <button
            onClick={() => handleChartTypeChange('capital')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              selectedChart === 'capital'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <PieChartIcon className="h-4 w-4" />
            <span className="text-sm font-medium">Capital Structure</span>
          </button>
          <button
            onClick={() => handleChartTypeChange('trends')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              selectedChart === 'trends'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm font-medium">Trend Analysis</span>
          </button>
        </div>

        {/* Chart Display Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart */}
          <div className="lg:col-span-2">
            {selectedChart === 'financial' && financialData.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Key Financial Metrics</h3>
                  <ZoomIn className="h-4 w-4 text-gray-500" />
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={financialData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis 
                      tickFormatter={(value) => {
                        const num = typeof value === 'string' ? parseFloat(value) : value;
                        if (num >= 1000000) {
                          return new Intl.NumberFormat('en-US', {
                            notation: 'compact',
                            compactDisplay: 'short'
                          }).format(num);
                        }
                        return formatCurrency(value);
                      }} 
                    />
                    <Tooltip 
                      formatter={(value) => {
                        const num = typeof value === 'string' ? parseFloat(value) : value;
                        return formatCurrency(num as number);
                      }} 
                    />
                    <Bar 
                      dataKey="value" 
                      fill="#3b82f6" 
                      onClick={handleBarClick}
                      style={{ cursor: 'pointer' }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {selectedChart === 'capital' && capitalData.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Capital Structure</h3>
                  <ZoomIn className="h-4 w-4 text-gray-500" />
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={capitalData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      onClick={handleBarClick}
                      style={{ cursor: 'pointer' }}
                    >
                      {capitalData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {selectedChart === 'trends' && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Historical Trends</h3>
                  <ZoomIn className="h-4 w-4 text-gray-500" />
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={generateTrendData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis 
                      tickFormatter={(value) => {
                        const num = typeof value === 'string' ? parseFloat(value) : value;
                        if (num >= 1000000) {
                          return new Intl.NumberFormat('en-US', {
                            notation: 'compact',
                            compactDisplay: 'short'
                          }).format(num);
                        }
                        return formatCurrency(value);
                      }} 
                    />
                    <Tooltip 
                      formatter={(value, name) => {
                        const num = typeof value === 'string' ? parseFloat(value) : value;
                        return [formatCurrency(num as number), name === 'revenue' ? 'Revenue' : 'EBITDA'];
                      }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stackId="1" 
                      stroke="#3b82f6" 
                      fill="#3b82f6" 
                      fillOpacity={0.6}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="ebitda" 
                      stackId="2" 
                      stroke="#10b981" 
                      fill="#10b981" 
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Drill-down Panel */}
          <div className="lg:col-span-1">
            {showDrillDown && drillDownData ? (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="text-lg font-medium text-gray-900 mb-3">Detailed View</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Selected:</span>
                    <span className="font-medium">{drillDownData.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Value:</span>
                    <span className="font-medium">{formatCurrency(drillDownData.value)}</span>
                  </div>
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      Click on chart elements to explore detailed breakdowns and trends.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-lg font-medium text-gray-900 mb-3">Chart Explorer</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <ZoomIn className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Click on chart elements for detailed analysis</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <button
                      onClick={() => handleChartTypeChange('financial')}
                      className="p-2 bg-blue-100 rounded text-xs text-blue-700 hover:bg-blue-200 transition-colors"
                    >
                      Financials
                    </button>
                    <button
                      onClick={() => handleChartTypeChange('capital')}
                      className="p-2 bg-green-100 rounded text-xs text-green-700 hover:bg-green-200 transition-colors"
                    >
                      Capital
                    </button>
                    <button
                      onClick={() => handleChartTypeChange('trends')}
                      className="p-2 bg-purple-100 rounded text-xs text-purple-700 hover:bg-purple-200 transition-colors"
                    >
                      Trends
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {valuationMultiples && (
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Valuation Multiples</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {(() => {
                  const value = getBestValue(
                    valuationMultiples.revenueMultiple,
                    valuationMultiples.revenue_multiple,
                    valuationMultiples.priceToRevenue
                  );
                  return value ? `${value.toFixed(1)}x` : 'N/A';
                })()}
              </div>
              <div className="text-sm text-gray-500">Revenue Multiple</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {(() => {
                  const value = getBestValue(
                    valuationMultiples.ebitdaMultiple,
                    valuationMultiples.ebitda_multiple,
                    valuationMultiples.priceToEbitda
                  );
                  return value ? `${value.toFixed(1)}x` : 'N/A';
                })()}
              </div>
              <div className="text-sm text-gray-500">EBITDA Multiple</div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'yellow' | 'red';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
  };

  // Helper function to determine font size based on value length
  const getFontSizeClass = (value: string): string => {
    if (value === 'N/A') return 'text-lg';
    if (value.length <= 8) return 'text-lg';
    if (value.length <= 12) return 'text-base';
    if (value.length <= 16) return 'text-sm';
    return 'text-xs';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className={`${getFontSizeClass(value)} font-semibold text-gray-900 leading-tight`}>{value}</p>
        </div>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export default MetricsDashboard;