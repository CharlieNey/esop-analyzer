import React, { useEffect, useState } from 'react';
import { BarChart3, PieChart, Activity, Download, Sparkles } from 'lucide-react';
import { getDocumentMetrics } from '../services/api';
import { DocumentMetrics } from '../types';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Import improved chart components
import WaterfallChart from './charts/WaterfallChart';
import RadarChart from './charts/RadarChart';
import { Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell as PieCell } from 'recharts';

interface AdvancedMetricsDashboardProps {
  documentId: string;
}

const AdvancedMetricsDashboard: React.FC<AdvancedMetricsDashboardProps> = ({ documentId }) => {
  const [metrics, setMetrics] = useState<DocumentMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeChart, setActiveChart] = useState<string>('waterfall');

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

  // Set default active chart to first available chart when metrics load
  useEffect(() => {
    if (metrics) {
      // Chart selection will be handled inline
    }
  }, [metrics]);

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

  const handleDownload = async () => {
    const dashboard = document.getElementById('advanced-dashboard-capture');
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
    pdf.save(`${metrics?.filename || 'advanced-dashboard'}.pdf`);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
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
    if (value === null || value === undefined || value === '') return null;
    
    if (typeof value === 'string') {
      const cleaned = value.replace(/[$,\s%]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? null : parsed;
    }
    
    if (typeof value === 'number') {
      return isNaN(value) ? null : value;
    }
    
    return null;
  };

  // Helper to get best available value
  const getBestValue = (...sources: any[]): number | null => {
    for (const source of sources) {
      const parsed = safeParseNumber(source);
      if (parsed !== null) {
        return parsed;
      }
    }
    return null;
  };

  // Extract data for charts
  const enterpriseValue = getBestValue(
    metrics.metrics.enterpriseValue?.data?.currentValue,
    metrics.metrics.enterpriseValue?.data?.value,
    metrics.metrics.companyValuation?.data?.totalValue
  );

  const valueOfEquity = getBestValue(
    metrics.metrics.valueOfEquity?.data?.currentValue,
    metrics.metrics.valueOfEquity?.data?.value,
    metrics.metrics.companyValuation?.data?.equityValue
  );

  const revenue = getBestValue(
    metrics.metrics.keyFinancials?.data?.revenue,
    metrics.metrics.keyFinancials?.data?.totalRevenue
  );

  const ebitda = getBestValue(
    metrics.metrics.keyFinancials?.data?.ebitda,
    metrics.metrics.keyFinancials?.data?.EBITDA
  );

  const discountRate = getBestValue(
    metrics.metrics.discountRates?.data?.discountRate,
    metrics.metrics.discountRates?.data?.wacc,
    metrics.metrics.keyFinancials?.data?.discountRate
  );

  // Fix waterfall chart to show proper value buildup
  const waterfallData = (() => {
    if (!revenue && !ebitda && !enterpriseValue) return [];
    
    const data = [];
    let cumulative = 0;
    
    if (revenue) {
      data.push({ name: 'Revenue', value: revenue, cumulative: revenue, type: 'positive' as const });
      cumulative = revenue;
    }
    
    if (ebitda && revenue) {
      const ebitdaContribution = ebitda - revenue;
      if (Math.abs(ebitdaContribution) > revenue * 0.01) { // Only show if significant
        data.push({ 
          name: 'EBITDA Adjustment', 
          value: ebitdaContribution, 
          cumulative: ebitda, 
          type: ebitdaContribution >= 0 ? 'positive' as const : 'negative' as const
        });
        cumulative = ebitda;
      }
    }
    
    if (enterpriseValue && cumulative) {
      const valuationMultiple = enterpriseValue - cumulative;
      if (Math.abs(valuationMultiple) > cumulative * 0.01) { // Only show if significant
        data.push({ 
          name: 'Valuation Multiple', 
          value: valuationMultiple, 
          cumulative: enterpriseValue, 
          type: valuationMultiple >= 0 ? 'positive' as const : 'negative' as const
        });
      }
    }
    
    if (enterpriseValue) {
      data.push({ name: 'Enterprise Value', value: 0, cumulative: enterpriseValue, type: 'total' as const });
    }
    
    return data;
  })();

  // Improved radar data with meaningful business metrics
  const radarData = (() => {
    const data = [];
    
    // EBITDA Margin (0-50% range, normalized to 100)
    if (ebitda && revenue && revenue > 0) {
      const margin = (ebitda / revenue) * 100;
      data.push({
        subject: 'EBITDA Margin',
        current: Math.min(100, Math.max(0, (margin / 50) * 100)), // Normalize 0-50% to 0-100
        benchmark: 50, // 25% margin = 50 on scale
        fullMark: 100
      });
    }
    
    // Revenue Scale (normalized based on industry - $10M = 50, $50M+ = 100)
    if (revenue) {
      const revenueScore = Math.min(100, Math.max(0, (revenue / 50000000) * 100));
      data.push({
        subject: 'Revenue Scale',
        current: revenueScore,
        benchmark: 60,
        fullMark: 100
      });
    }
    
    // Valuation Multiple (EV/EBITDA, normalized 0-20x to 0-100)
    if (enterpriseValue && ebitda && ebitda > 0) {
      const multiple = enterpriseValue / ebitda;
      data.push({
        subject: 'EV/EBITDA Multiple',
        current: Math.min(100, Math.max(0, (multiple / 20) * 100)), // Normalize 0-20x to 0-100
        benchmark: 60, // 12x multiple = 60 on scale
        fullMark: 100
      });
    }
    
    // Cost of Capital (inverted - lower is better, 0-20% to 100-0)
    if (discountRate) {
      data.push({
        subject: 'Capital Efficiency',
        current: Math.max(0, 100 - (discountRate * 5)), // 20% = 0, 0% = 100
        benchmark: 70, // 6% discount rate = 70
        fullMark: 100
      });
    }
    
    return data.length >= 2 ? data : []; // Show if we have at least 2 meaningful metrics
  })();

  // New: Valuation composition pie chart
  const valuationCompositionData = [
    enterpriseValue ? { name: 'Enterprise Value', value: enterpriseValue, color: '#3b82f6' } : null,
    valueOfEquity ? { name: 'Equity Value', value: valueOfEquity, color: '#10b981' } : null,
    (enterpriseValue && valueOfEquity && enterpriseValue > valueOfEquity) ? { 
      name: 'Debt Value', 
      value: enterpriseValue - valueOfEquity, 
      color: '#f59e0b' 
    } : null
  ].filter((item): item is { name: string; value: number; color: string } => item !== null);

  // Remove redundant financial comparison data and fake trend data

  const chartOptions = [
    { id: 'waterfall', name: 'Value Breakdown', icon: BarChart3, available: waterfallData.length > 0 },
    { id: 'radar', name: 'Performance Metrics', icon: Activity, available: radarData.length >= 2 },
    { id: 'composition', name: 'Valuation Composition', icon: PieChart, available: valuationCompositionData.length >= 2 }
  ].filter(option => option.available);

  // Get the effective active chart (first available if current is invalid)
  const effectiveActiveChart = chartOptions.find(opt => opt.id === activeChart)?.id || (chartOptions[0]?.id ?? 'waterfall');

  const renderActiveChart = (): React.ReactNode => {
    if (chartOptions.length === 0) {
      return (
        <div className="bg-gray-50 rounded-lg p-8 text-center min-h-[400px] flex items-center justify-center">
          <div>
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Insufficient Data for Charts</h3>
            <p className="text-gray-600">More financial data is needed to generate meaningful visualizations.</p>
          </div>
        </div>
      );
    }

    switch (effectiveActiveChart) {
      case 'waterfall':
        return waterfallData.length > 0 ? 
          <WaterfallChart data={waterfallData} title="Enterprise Value Breakdown" formatValue={formatCurrency} /> :
          <div className="bg-gray-50 rounded-lg p-8 text-center"><p className="text-gray-600">Insufficient data for waterfall chart</p></div>;
      case 'radar':
        return radarData.length >= 2 ? 
          <RadarChart data={radarData} title="Company Performance Analysis" /> :
          <div className="bg-gray-50 rounded-lg p-8 text-center"><p className="text-gray-600">Insufficient metrics for performance analysis</p></div>;
      case 'composition':
        return valuationCompositionData.length >= 2 ? (
          <div className="bg-white rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4 text-center">Valuation Composition</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={valuationCompositionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {valuationCompositionData.map((entry, index) => (
                    <PieCell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        ) : <div className="bg-gray-50 rounded-lg p-8 text-center"><p className="text-gray-600">Insufficient data for composition chart</p></div>;
      default:
        if (chartOptions.length > 0) {
          const firstChart = chartOptions[0];
          if (firstChart.id === 'waterfall' && waterfallData.length > 0) {
            return <WaterfallChart data={waterfallData} title="Enterprise Value Breakdown" formatValue={formatCurrency} />;
          } else if (firstChart.id === 'radar' && radarData.length >= 2) {
            return <RadarChart data={radarData} title="Company Performance Analysis" />;
          } else if (firstChart.id === 'composition' && valuationCompositionData.length >= 2) {
            return (
              <div className="bg-white rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4 text-center">Valuation Composition</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={valuationCompositionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {valuationCompositionData.map((entry, index) => (
                        <PieCell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => formatCurrency(value)} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            );
          }
        }
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Sparkles className="h-6 w-6 text-blue-600 mr-2" />
              Advanced Analytics Dashboard
            </h2>
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

        {/* Chart Navigation - Only show if charts are available */}
        {chartOptions.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-4">
            {chartOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  onClick={() => setActiveChart(option.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    effectiveActiveChart === option.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{option.name}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Dashboard content to capture */}
        <div id="advanced-dashboard-capture">
          {/* Active Chart */}
          <div className="min-h-[400px]">
            {renderActiveChart()}
          </div>

        </div>
      </div>
    </div>
  );
};

export default AdvancedMetricsDashboard;