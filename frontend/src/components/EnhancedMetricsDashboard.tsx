import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Building, Users, Calculator, BarChart3, Minus, Download } from 'lucide-react';
import { getDocumentMetrics } from '../services/api';
import { DocumentMetrics } from '../types';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import MetricsValidation from './MetricsValidation';

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
  ebitdaMargin?: string | null;
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
    
    // For very large numbers, use compact notation
    if (value >= 1000000000) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
        notation: 'compact',
        compactDisplay: 'short'
      }).format(value);
    } else if (value >= 1000000) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
        notation: 'compact',
        compactDisplay: 'short'
      }).format(value);
    } else {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    }
  };

  const formatPercentage = (value: number | null): string => {
    if (value === null || value === undefined) return 'N/A';
    return `${value.toFixed(2)}%`;
  };

  const calculatePercentageChange = (current: number | null, previous: number | null): number | null => {
    if (!current || !previous || previous === 0) return null;
    return ((current - previous) / previous) * 100;
  };

  // Download handler
  const handleDownload = async () => {
    const dashboard = document.getElementById('dashboard-capture');
    if (!dashboard) return;
    
    const canvas = await html2canvas(dashboard, { 
      useCORS: true,
      allowTaint: true,
      background: '#fff'
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [canvas.width, canvas.height]
    });
    
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(`${metrics?.filename || 'dashboard'}.pdf`);
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

  // Helper function to safely parse numeric values
  const safeParseNumber = (value: any): number | null => {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    
    // Handle string values
    if (typeof value === 'string') {
      // Remove common formatting characters
      const cleaned = value.replace(/[\$,\s%]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) || parsed === 0 ? null : parsed;
    }
    
    // Handle numeric values
    if (typeof value === 'number') {
      return isNaN(value) || value === 0 ? null : value;
    }
    
    return null;
  };

  // Extract metrics data with better error handling
  const enterpriseValue = metrics.metrics.enterpriseValue?.data;
  const valueOfEquity = metrics.metrics.valueOfEquity?.data;
  const valuationPerShare = metrics.metrics.valuationPerShare?.data;
  const keyFinancials = metrics.metrics.keyFinancials?.data;
  const companyValuation = metrics.metrics.companyValuation?.data;
  const capitalStructure = metrics.metrics.capitalStructure?.data;

  // Debug logging to help identify data issues
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Dashboard Debug Data:', {
      enterpriseValue,
      valueOfEquity,
      valuationPerShare,
      keyFinancials,
      companyValuation,
      capitalStructure,
      fullMetrics: metrics.metrics
    });
  }

  // Helper to get best available value with priority order
  const getBestValue = (...sources: any[]): number | null => {
    for (const source of sources) {
      const parsed = safeParseNumber(source);
      if (parsed !== null) {
        return parsed;
      }
    }
    return null;
  };

  // Prepare metric cards data with improved data extraction
  const metricCards: MetricCardData[] = [
    {
      title: 'Enterprise Value',
      currentValue: getBestValue(
        enterpriseValue?.currentValue,
        enterpriseValue?.value,
        companyValuation?.totalValue,
        companyValuation?.value
      ),
      previousValue: getBestValue(enterpriseValue?.previousValue),
      format: 'currency',
      icon: <Building className="h-6 w-6" />,
      color: 'blue'
    },
    {
      title: 'Value of Equity',
      currentValue: getBestValue(
        valueOfEquity?.currentValue,
        valueOfEquity?.value,
        companyValuation?.totalValue,
        companyValuation?.value
      ),
      previousValue: getBestValue(valueOfEquity?.previousValue),
      format: 'currency',
      icon: <DollarSign className="h-6 w-6" />,
      color: 'green'
    },
    {
      title: 'Valuation per Share',
      currentValue: getBestValue(
        valuationPerShare?.currentValue,
        valuationPerShare?.value,
        companyValuation?.perShareValue,
        companyValuation?.sharePrice
      ),
      previousValue: getBestValue(valuationPerShare?.previousValue),
      format: 'currency',
      icon: <Users className="h-6 w-6" />,
      color: 'purple'
    },
    {
      title: 'Revenue',
      currentValue: getBestValue(
        keyFinancials?.revenue,
        keyFinancials?.totalRevenue,
        keyFinancials?.annualRevenue
      ),
      format: 'currency',
      icon: <BarChart3 className="h-6 w-6" />,
      color: 'orange'
    },
    {
      title: 'EBITDA',
      currentValue: getBestValue(
        keyFinancials?.ebitda,
        keyFinancials?.EBITDA,
        keyFinancials?.adjustedEbitda
      ),
      format: 'currency',
      icon: <TrendingUp className="h-6 w-6" />,
      color: 'indigo',
      ebitdaMargin: (() => {
        const revenue = getBestValue(keyFinancials?.revenue, keyFinancials?.totalRevenue);
        const ebitda = getBestValue(keyFinancials?.ebitda, keyFinancials?.EBITDA);
        return revenue && ebitda ? ((ebitda / revenue) * 100).toFixed(1) : null;
      })()
    },
    {
      title: 'Weighted Avg Cost of Capital',
      currentValue: getBestValue(
        keyFinancials?.weightedAverageCostOfCapital,
        keyFinancials?.wacc,
        keyFinancials?.discountRate,
        metrics.metrics.discountRates?.data?.discountRate,
        metrics.metrics.discountRates?.data?.wacc
      ),
      format: 'percentage',
      icon: <Calculator className="h-6 w-6" />,
      color: 'red'
    }
  ];

  // Prepare metrics for validation
  const validationMetrics = {
    enterpriseValue: metricCards[0].currentValue,
    valueOfEquity: metricCards[1].currentValue,
    valuationPerShare: metricCards[2].currentValue,
    revenue: metricCards[3].currentValue,
    ebitda: metricCards[4].currentValue,
    discountRate: metricCards[5].currentValue,
  };

  return (
    <div className="space-y-6">
      {/* AI Validation Section */}
      <MetricsValidation 
        documentId={documentId} 
        metrics={validationMetrics}
      />
      
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Header with title, filename, valuation date, and download icon */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">ESOP Valuation Dashboard</h2>
            <div className="flex flex-col md:flex-row md:items-center md:space-x-4 mt-1">
              <span className="text-sm text-gray-500">{metrics.filename}</span>
              <span className="text-sm text-gray-600">
                Valuation Date: {metrics.valuationDate 
                  ? new Date(metrics.valuationDate).toLocaleDateString()
                  : new Date(metrics.uploadDate).toLocaleDateString()
                }
              </span>
            </div>
          </div>
          <button
            onClick={handleDownload}
            className="p-2 rounded hover:bg-blue-100 transition-colors"
            title="Download Dashboard"
          >
            <Download className="h-6 w-6 text-blue-600" />
          </button>
        </div>
      {/* Dashboard content to capture */}
      <div id="dashboard-capture">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {metricCards.map((card, index) => (
            <MetricCard key={index} {...card} />
          ))}
        </div>

        {/* Ownership Structure Section */}
        {capitalStructure && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Ownership Structure</h4>
              <div className="text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Total Shares Outstanding:</span>
                  <span className="font-medium">
                    {(() => {
                      const totalShares = getBestValue(
                        capitalStructure.totalShares,
                        capitalStructure.totalSharesOutstanding,
                        capitalStructure.sharesOutstanding
                      );
                      if (!totalShares) return 'N/A';
                      
                      return totalShares >= 1000000 
                        ? new Intl.NumberFormat('en-US', {
                            notation: 'compact',
                            compactDisplay: 'short'
                          }).format(totalShares)
                        : totalShares.toLocaleString();
                    })()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>ESOP Ownership:</span>
                  <span className="font-medium">
                    {(() => {
                      const esopPercentage = getBestValue(
                        capitalStructure.esopPercentage,
                        capitalStructure.esopOwnership,
                        capitalStructure.employeeOwnership
                      );
                      return esopPercentage ? `${esopPercentage.toFixed(1)}%` : 'N/A';
                    })()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
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
  color,
  ebitdaMargin
}) => {
  const calculatePercentageChange = (current: number | null | undefined, previous: number | null | undefined): number | null => {
    if (!current || !previous || previous === 0) return null;
    return ((current - previous) / previous) * 100;
  };

  const formatCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return 'N/A';
    
    // For very large numbers, use compact notation
    if (value >= 1000000000) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
        notation: 'compact',
        compactDisplay: 'short'
      }).format(value);
    } else if (value >= 1000000) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
        notation: 'compact',
        compactDisplay: 'short'
      }).format(value);
    } else {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    }
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

  // Helper function to determine font size based on value length
  const getFontSizeClass = (value: string): string => {
    if (value === 'N/A') return 'text-2xl';
    if (value.length <= 8) return 'text-2xl';
    if (value.length <= 12) return 'text-xl';
    if (value.length <= 16) return 'text-lg';
    return 'text-base';
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
        <p className={`${getFontSizeClass(formatValue(currentValue))} font-bold text-gray-900 leading-tight`}>
          {formatValue(currentValue)}
        </p>
        {ebitdaMargin && title === 'EBITDA' && (
          <p className="text-sm text-gray-500 mt-1">
            Margin: {ebitdaMargin}%
          </p>
        )}
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