import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Building, Users, Calculator, BarChart3, Download, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { getAIMetrics } from '../services/api';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface AIDashboardProps {
  documentId: string;
}

interface AIMetrics {
  enterpriseValue: number | null;
  valueOfEquity: number | null;
  valuationPerShare: number | null;
  revenue: number | null;
  ebitda: number | null;
  discountRate: number | null;
  totalShares: number | null;
  esopPercentage: number | null;
  revenueMultiple: number | null;
  ebitdaMultiple: number | null;
  valuationDate: string | null;
  confidence: 'High' | 'Medium' | 'Low';
  notes: string;
  error?: string;
}

interface MetricCardData {
  title: string;
  value: number | null;
  format: 'currency' | 'percentage' | 'multiple';
  icon: React.ReactNode;
  color: string;
  confidence?: 'High' | 'Medium' | 'Low';
}

const AIDashboard: React.FC<AIDashboardProps> = ({ documentId }) => {
  const [aiData, setAiData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAIMetrics = async (forceRefresh = false) => {
    try {
      setError(null);
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const data = await getAIMetrics(documentId);
      console.log('🔍 AI Dashboard received data:', data);
      console.log('🔍 AI metrics specifically:', data?.metrics);
      setAiData(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load AI metrics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (documentId) {
      fetchAIMetrics();
    }
  }, [documentId]);

  const handleRefresh = () => {
    fetchAIMetrics(true);
  };

  const formatCurrency = (value: number | null): string => {
    if (value === null || value === undefined) return 'N/A';
    
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

  const formatMultiple = (value: number | null): string => {
    if (value === null || value === undefined) return 'N/A';
    return `${value.toFixed(1)}x`;
  };

  const handleDownload = async () => {
    const dashboard = document.getElementById('ai-dashboard-capture');
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
    pdf.save(`${aiData?.filename || 'ai-dashboard'}.pdf`);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="flex items-center mb-4">
            <Sparkles className="h-6 w-6 text-blue-600 mr-2" />
            <div className="h-6 bg-gray-200 rounded w-48"></div>
          </div>
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
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">AI Metrics Failed</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => fetchAIMetrics()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!aiData) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-gray-500">No AI metrics available</div>
      </div>
    );
  }

  const metrics: AIMetrics = aiData.metrics;

  // Prepare metric cards with AI data
  const metricCards: MetricCardData[] = [
    {
      title: 'Enterprise Value',
      value: metrics.enterpriseValue,
      format: 'currency',
      icon: <Building className="h-6 w-6" />,
      color: 'blue',
      confidence: metrics.confidence
    },
    {
      title: 'Value of Equity',
      value: metrics.valueOfEquity,
      format: 'currency',
      icon: <DollarSign className="h-6 w-6" />,
      color: 'green',
      confidence: metrics.confidence
    },
    {
      title: 'Valuation per Share',
      value: metrics.valuationPerShare,
      format: 'currency',
      icon: <Users className="h-6 w-6" />,
      color: 'purple',
      confidence: metrics.confidence
    },
    {
      title: 'Revenue',
      value: metrics.revenue,
      format: 'currency',
      icon: <BarChart3 className="h-6 w-6" />,
      color: 'orange',
      confidence: metrics.confidence
    },
    {
      title: 'EBITDA',
      value: metrics.ebitda,
      format: 'currency',
      icon: <TrendingUp className="h-6 w-6" />,
      color: 'indigo',
      confidence: metrics.confidence
    },
    {
      title: 'Discount Rate',
      value: metrics.discountRate,
      format: 'percentage',
      icon: <Calculator className="h-6 w-6" />,
      color: 'red',
      confidence: metrics.confidence
    }
  ];

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'High': return 'text-green-600';
      case 'Medium': return 'text-yellow-600';
      case 'Low': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getConfidenceIcon = (confidence: string) => {
    switch (confidence) {
      case 'High': return '🟢';
      case 'Medium': return '🟡';
      case 'Low': return '🔴';
      default: return '⚪';
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Header with confidence and refresh */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Sparkles className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">AI-Powered Dashboard</h3>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>
                  Confidence: <span className={getConfidenceColor(metrics.confidence)}>
                    {getConfidenceIcon(metrics.confidence)} {metrics.confidence}
                  </span>
                </span>
                <span>Source: Real-time AI analysis</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh AI metrics"
          >
            <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        {metrics.notes && (
          <div className="mt-3 p-3 bg-white rounded border border-blue-200">
            <p className="text-sm text-gray-700">
              <strong>AI Notes:</strong> {metrics.notes}
            </p>
          </div>
        )}
        
        {/* Debug info in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-3 p-3 bg-yellow-50 rounded border border-yellow-200">
            <p className="text-xs text-gray-600 mb-2">
              <strong>Debug - AI Metrics:</strong>
            </p>
            <pre className="text-xs overflow-auto max-h-40">
              {JSON.stringify(metrics, null, 2)}
            </pre>
          </div>
        )}
        
        {/* Temporary fallback notice */}
        {(!metrics.enterpriseValue && !metrics.valueOfEquity && !metrics.revenue) && (
          <div className="mt-3 p-3 bg-orange-50 rounded border border-orange-200">
            <p className="text-sm text-orange-800">
              <strong>Notice:</strong> AI extraction is still being refined. For now, you can use the "Traditional" dashboard for more complete data extraction.
            </p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Header with title, filename, valuation date, and download icon */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">ESOP Valuation Dashboard</h2>
            <div className="flex flex-col md:flex-row md:items-center md:space-x-4 mt-1">
              <span className="text-sm text-gray-500">{aiData.filename}</span>
              <span className="text-sm text-gray-600">
                Valuation Date: {metrics.valuationDate 
                  ? new Date(metrics.valuationDate).toLocaleDateString()
                  : new Date(aiData.uploadDate).toLocaleDateString()
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
        <div id="ai-dashboard-capture">
          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {metricCards.map((card, index) => (
              <AIMetricCard key={index} {...card} />
            ))}
          </div>

          {/* Additional AI Insights */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Financial Insights</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Ownership Structure */}
              {(metrics.totalShares || metrics.esopPercentage) && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Ownership Structure</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    {metrics.totalShares && (
                      <div className="flex justify-between">
                        <span>Total Shares Outstanding:</span>
                        <span className="font-medium">
                          {metrics.totalShares >= 1000000 
                            ? new Intl.NumberFormat('en-US', {
                                notation: 'compact',
                                compactDisplay: 'short'
                              }).format(metrics.totalShares)
                            : metrics.totalShares.toLocaleString()
                          }
                        </span>
                      </div>
                    )}
                    {metrics.esopPercentage && (
                      <div className="flex justify-between">
                        <span>ESOP Ownership:</span>
                        <span className="font-medium">{metrics.esopPercentage.toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Valuation Multiples */}
              {(metrics.revenueMultiple || metrics.ebitdaMultiple) && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Valuation Multiples</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {metrics.revenueMultiple && (
                      <div className="text-center">
                        <div className="text-xl font-bold text-blue-600">
                          {formatMultiple(metrics.revenueMultiple)}
                        </div>
                        <div className="text-xs text-gray-500">Revenue Multiple</div>
                      </div>
                    )}
                    {metrics.ebitdaMultiple && (
                      <div className="text-center">
                        <div className="text-xl font-bold text-green-600">
                          {formatMultiple(metrics.ebitdaMultiple)}
                        </div>
                        <div className="text-xs text-gray-500">EBITDA Multiple</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Financial Ratios */}
              {metrics.revenue && metrics.ebitda && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Financial Ratios</h4>
                  <div className="text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>EBITDA Margin:</span>
                      <span className="font-medium">
                        {((metrics.ebitda / metrics.revenue) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface AIMetricCardProps extends MetricCardData {}

const AIMetricCard: React.FC<AIMetricCardProps> = ({ 
  title, 
  value, 
  format, 
  icon, 
  color,
  confidence
}) => {
  const formatValue = (val: number | null) => {
    if (val === null || val === undefined) return 'N/A';
    
    switch (format) {
      case 'currency':
        return formatCurrency(val);
      case 'percentage':
        return formatPercentage(val);
      case 'multiple':
        return formatMultiple(val);
      default:
        return val.toString();
    }
  };

  const formatCurrency = (value: number): string => {
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

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(2)}%`;
  };

  const formatMultiple = (value: number): string => {
    return `${value.toFixed(1)}x`;
  };

  // Helper function to determine font size based on value length
  const getFontSizeClass = (value: string): string => {
    if (value === 'N/A') return 'text-2xl';
    if (value.length <= 8) return 'text-2xl';
    if (value.length <= 12) return 'text-xl';
    if (value.length <= 16) return 'text-lg';
    return 'text-base';
  };

  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    red: 'bg-red-50 text-red-600',
  };

  const formattedValue = formatValue(value);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 relative">
      {/* AI confidence indicator */}
      {confidence && (
        <div className="absolute top-2 right-2">
          <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
            AI: {confidence}
          </span>
        </div>
      )}
      
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
          {icon}
        </div>
      </div>
      
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <p className={`${getFontSizeClass(formattedValue)} font-bold text-gray-900 leading-tight`}>
          {formattedValue}
        </p>
      </div>
    </div>
  );
};

export default AIDashboard;