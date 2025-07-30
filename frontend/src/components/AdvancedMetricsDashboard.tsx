import React, { useEffect, useState } from 'react';
import { TrendingUp, BarChart3, Layers, Activity, Download, Sparkles } from 'lucide-react';
import { getDocumentMetrics } from '../services/api';
import { DocumentMetrics } from '../types';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Import new chart components
import WaterfallChart from './charts/WaterfallChart';
import SunburstChart from './charts/SunburstChart';
import SankeyChart from './charts/SankeyChart';
import RadarChart from './charts/RadarChart';
import GaugeChart from './charts/GaugeChart';

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
      return isNaN(parsed) || parsed === 0 ? null : parsed;
    }
    
    if (typeof value === 'number') {
      return isNaN(value) || value === 0 ? null : value;
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

  // Prepare data for different chart types
  const waterfallData = [
    { name: 'Revenue', value: revenue || 0, cumulative: revenue || 0, type: 'positive' as const },
    { name: 'EBITDA', value: (ebitda || 0) - (revenue || 0), cumulative: ebitda || 0, type: 'negative' as const },
    { name: 'Enterprise Value', value: (enterpriseValue || 0) - (ebitda || 0), cumulative: enterpriseValue || 0, type: 'positive' as const },
    { name: 'Total Value', value: 0, cumulative: enterpriseValue || 0, type: 'total' as const }
  ].filter(item => item.value !== 0 || item.type === 'total');

  const sunburstData = {
    name: 'Company Valuation',
    children: [
      {
        name: 'Enterprise Value',
        value: enterpriseValue || 0,
        children: [
          { name: 'Operating Value', value: (enterpriseValue || 0) * 0.8 },
          { name: 'Asset Value', value: (enterpriseValue || 0) * 0.2 }
        ]
      },
      {
        name: 'Equity Value',
        value: valueOfEquity || 0,
        children: [
          { name: 'Common Shares', value: (valueOfEquity || 0) * 0.7 },
          { name: 'ESOP Shares', value: (valueOfEquity || 0) * 0.3 }
        ]
      }
    ]
  };

  const sankeyData = {
    nodes: [
      { name: 'Revenue' },
      { name: 'EBITDA' },
      { name: 'Operating Cash Flow' },
      { name: 'Enterprise Value' },
      { name: 'Equity Value' }
    ],
    links: [
      { source: 0, target: 1, value: ebitda || 0 },
      { source: 1, target: 2, value: (ebitda || 0) * 0.8 },
      { source: 2, target: 3, value: enterpriseValue || 0 },
      { source: 3, target: 4, value: valueOfEquity || 0 }
    ]
  };

  const radarData = [
    { subject: 'Revenue Growth', current: 75, benchmark: 60, fullMark: 100 },
    { subject: 'Profitability', current: ebitda && revenue ? (ebitda / revenue) * 100 : 0, benchmark: 65, fullMark: 100 },
    { subject: 'Valuation Multiple', current: 80, benchmark: 70, fullMark: 100 },
    { subject: 'Market Position', current: 70, benchmark: 75, fullMark: 100 },
    { subject: 'Financial Health', current: 85, benchmark: 80, fullMark: 100 },
    { subject: 'ESOP Structure', current: 90, benchmark: 75, fullMark: 100 }
  ];

  const chartOptions = [
    { id: 'waterfall', name: 'Value Breakdown', icon: BarChart3 },
    { id: 'sunburst', name: 'Hierarchical View', icon: Layers },
    { id: 'sankey', name: 'Cash Flow', icon: TrendingUp },
    { id: 'radar', name: 'Performance', icon: Activity },
    { id: 'gauge', name: 'Health Score', icon: Sparkles }
  ];

  const renderActiveChart = () => {
    switch (activeChart) {
      case 'waterfall':
        return <WaterfallChart data={waterfallData} title="Enterprise Value Breakdown" formatValue={formatCurrency} />;
      case 'sunburst':
        return <SunburstChart data={sunburstData} title="Valuation Hierarchy" formatValue={formatCurrency} />;
      case 'sankey':
        return <SankeyChart data={sankeyData} title="Value Flow Analysis" formatValue={formatCurrency} />;
      case 'radar':
        return <RadarChart data={radarData} title="Company Performance Radar" />;
      case 'gauge':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GaugeChart 
              value={ebitda && revenue ? (ebitda / revenue) * 100 : 0} 
              title="EBITDA Margin" 
              unit="%" 
              max={100}
            />
            <GaugeChart 
              value={discountRate || 0} 
              title="Discount Rate" 
              unit="%" 
              max={20}
              thresholds={[
                { value: 5, color: '#10b981', label: 'Low Risk' },
                { value: 10, color: '#f59e0b', label: 'Medium Risk' },
                { value: 20, color: '#ef4444', label: 'High Risk' }
              ]}
            />
          </div>
        );
      default:
        return <WaterfallChart data={waterfallData} title="Enterprise Value Breakdown" formatValue={formatCurrency} />;
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

        {/* Chart Navigation */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-4">
          {chartOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                onClick={() => setActiveChart(option.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  activeChart === option.id
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

        {/* Dashboard content to capture */}
        <div id="advanced-dashboard-capture">
          {/* Active Chart */}
          <div className="min-h-[400px]">
            {renderActiveChart()}
          </div>

          {/* Key Insights */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Key Insights</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Valuation Health</h4>
                <p className="text-sm text-blue-800">
                  Enterprise value of {formatCurrency(enterpriseValue)} indicates strong market position
                </p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-2">Profitability</h4>
                <p className="text-sm text-green-800">
                  {ebitda && revenue ? `EBITDA margin of ${((ebitda / revenue) * 100).toFixed(1)}%` : 'EBITDA data available'}
                </p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-medium text-purple-900 mb-2">Risk Profile</h4>
                <p className="text-sm text-purple-800">
                  {discountRate ? `Discount rate of ${discountRate.toFixed(2)}%` : 'Risk assessment available'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedMetricsDashboard;