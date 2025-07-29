import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Building, Users, Calculator, BarChart3, Minus } from 'lucide-react';
import { getDocumentMetrics } from '../services/api';
import { DocumentMetrics } from '../types';

interface EnhancedMetricsDashboardProps {
  documentId: string;
}

interface MetricCardData {
  title: string;
  currentValue: number | null | undefined;
  previousValue?: number | null | undefined;
  format: 'currency' | 'percentage';
  icon: React.ReactNode;
  color: string;
}

const EnhancedMetricsDashboard: React.FC<EnhancedMetricsDashboardProps> = ({ documentId }) => {
  const [metrics, setMetrics] = useState<DocumentMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const formatCurrency = (value: number | null): string => {
    if (value === null || value === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number | null): string => {
    if (value === null || value === undefined) return 'N/A';
    return `${value.toFixed(2)}%`;
  };

  const calculatePercentageChange = (current: number | null, previous: number | null): number | null => {
    if (!current || !previous || previous === 0) return null;
    return ((current - previous) / previous) * 100;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
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

  // Extract metrics data
  const enterpriseValue = metrics.metrics.enterpriseValue?.data;
  const valueOfEquity = metrics.metrics.valueOfEquity?.data;
  const valuationPerShare = metrics.metrics.valuationPerShare?.data;
  const keyFinancials = metrics.metrics.keyFinancials?.data;
  const companyValuation = metrics.metrics.companyValuation?.data;
  const capitalStructure = metrics.metrics.capitalStructure?.data;

  // Prepare metric cards data
  const metricCards: MetricCardData[] = [
    {
      title: 'Enterprise Value',
      currentValue: parseFloat(enterpriseValue?.currentValue || companyValuation?.totalValue || '0') || null,
      previousValue: parseFloat(enterpriseValue?.previousValue || '0') || null,
      format: 'currency',
      icon: <Building className="h-6 w-6" />,
      color: 'blue'
    },
    {
      title: 'Value of Equity',
      currentValue: parseFloat(valueOfEquity?.currentValue || companyValuation?.totalValue || '0') || null,
      previousValue: parseFloat(valueOfEquity?.previousValue || '0') || null,
      format: 'currency',
      icon: <DollarSign className="h-6 w-6" />,
      color: 'green'
    },
    {
      title: 'Valuation per Share',
      currentValue: parseFloat(valuationPerShare?.currentValue || companyValuation?.perShareValue || '0') || null,
      previousValue: parseFloat(valuationPerShare?.previousValue || '0') || null,
      format: 'currency',
      icon: <Users className="h-6 w-6" />,
      color: 'purple'
    },
    {
      title: 'Revenue',
      currentValue: parseFloat(keyFinancials?.revenue || '0') || null,
      format: 'currency',
      icon: <BarChart3 className="h-6 w-6" />,
      color: 'orange'
    },
    {
      title: 'EBITDA',
      currentValue: parseFloat(keyFinancials?.ebitda || '0') || null,
      format: 'currency',
      icon: <TrendingUp className="h-6 w-6" />,
      color: 'indigo'
    },
    {
      title: 'Weighted Avg Cost of Capital',
      currentValue: parseFloat(
        keyFinancials?.weightedAverageCostOfCapital || 
        metrics.metrics.discountRates?.data?.discountRate || 
        '0'
      ) || null,
      format: 'percentage',
      icon: <Calculator className="h-6 w-6" />,
      color: 'red'
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">ESOP Valuation Dashboard</h2>
        <span className="text-sm text-gray-500">{metrics.filename}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {metricCards.map((card, index) => (
          <MetricCard key={index} {...card} />
        ))}
      </div>

      {/* Additional Summary Section */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Key Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {capitalStructure && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Ownership Structure</h4>
              <div className="text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Total Shares Outstanding:</span>
                  <span className="font-medium">{parseFloat(capitalStructure.totalShares)?.toLocaleString() || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>ESOP Ownership:</span>
                  <span className="font-medium">{capitalStructure.esopPercentage}%</span>
                </div>
              </div>
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Financial Ratios</h4>
            <div className="text-sm text-gray-600">
              {keyFinancials?.revenue && keyFinancials?.ebitda && (
                <div className="flex justify-between">
                  <span>EBITDA Margin:</span>
                  <span className="font-medium">
                    {((parseFloat(keyFinancials.ebitda) / parseFloat(keyFinancials.revenue)) * 100).toFixed(1)}%
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Valuation Date:</span>
                <span className="font-medium">
                  {metrics.valuationDate 
                    ? new Date(metrics.valuationDate).toLocaleDateString()
                    : new Date(metrics.uploadDate).toLocaleDateString()
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface MetricCardProps extends MetricCardData {}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  currentValue, 
  previousValue, 
  format, 
  icon, 
  color 
}) => {
  const calculatePercentageChange = (current: number | null | undefined, previous: number | null | undefined): number | null => {
    if (!current || !previous || previous === 0) return null;
    return ((current - previous) / previous) * 100;
  };

  const formatCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return 'N/A';
    return `${value.toFixed(2)}%`;
  };

  const formatValue = (value: number | null | undefined) => {
    if (format === 'currency') {
      return formatCurrency(value);
    } else {
      return formatPercentage(value);
    }
  };

  const percentageChange = calculatePercentageChange(currentValue, previousValue);
  
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
          {icon}
        </div>
        {percentageChange !== null && (
          <div className={`flex items-center text-sm ${
            percentageChange >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {percentageChange >= 0 ? (
              <TrendingUp className="h-4 w-4 mr-1" />
            ) : (
              <TrendingDown className="h-4 w-4 mr-1" />
            )}
            {Math.abs(percentageChange).toFixed(1)}%
          </div>
        )}
      </div>
      
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{formatValue(currentValue)}</p>
        {previousValue && (
          <p className="text-sm text-gray-500 mt-1">
            Previous: {formatValue(previousValue)}
          </p>
        )}
      </div>
    </div>
  );
};

export default EnhancedMetricsDashboard;