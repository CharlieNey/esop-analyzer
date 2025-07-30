import React, { useEffect, useState, useCallback } from 'react';
import { BarChart3, Download, Sparkles, TrendingUp } from 'lucide-react';
import { getDocumentMetrics, getEnhancedMetrics, askQuestion } from '../services/api';
import { DocumentMetrics } from '../types';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Import improved chart components
import LinearTrendChart from './charts/LinearTrendChart';

interface AdvancedMetricsDashboardProps {
  documentId: string;
}

const AdvancedMetricsDashboard: React.FC<AdvancedMetricsDashboardProps> = ({ documentId }) => {
  const [metrics, setMetrics] = useState<DocumentMetrics | null>(null);
  const [enhancedMetrics, setEnhancedMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeChart, setActiveChart] = useState<string>('waterfall');
  const [loadingEnhanced, setLoadingEnhanced] = useState(false);
  const [fallbackHistoricalData, setFallbackHistoricalData] = useState<any>(null);
  const [loadingFallback, setLoadingFallback] = useState(false);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await getDocumentMetrics(documentId);
        setMetrics(data);
        
        // Try to fetch enhanced metrics with historical data
        setLoadingEnhanced(true);
        try {
          const enhancedData = await getEnhancedMetrics(documentId);
          console.log('🔍 Enhanced metrics response:', enhancedData);
          console.log('📊 Historical data:', enhancedData?.historicalData);
          setEnhancedMetrics(enhancedData);
        } catch (enhancedErr) {
          console.log('Enhanced metrics not available:', enhancedErr);
          // Don't set error for enhanced metrics, just continue without them
        } finally {
          setLoadingEnhanced(false);
        }
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

  // Fallback function to fetch historical data using direct AI questions
  const fetchFallbackHistoricalData = useCallback(async () => {
    if (loadingFallback || fallbackHistoricalData) return; // Don't refetch if already loading or have data
    
    setLoadingFallback(true);
    try {
      console.log('🔄 Attempting to fetch historical data using AI fallback...');
      
      const historicalQuestions = [
        {
          key: 'revenue',
          question: `Looking at this ESOP valuation document, please extract historical revenue data for multiple years. 
          Look for financial statements, revenue trends, or historical financial data.
          
          Please respond in this exact format:
          YEAR:REVENUE
          2023:50000000
          2022:45000000
          2021:40000000
          
          If you find historical revenue data, list all years available. If no historical data is found, respond with "NO_HISTORICAL_DATA".`
        },
        {
          key: 'ebitda', 
          question: `Looking at this ESOP valuation document, please extract historical EBITDA data for multiple years.
          Look for financial statements, EBITDA trends, or historical earnings data.
          
          Please respond in this exact format:
          YEAR:EBITDA
          2023:8000000
          2022:7200000
          2021:6400000
          
          If you find historical EBITDA data, list all years available. If no historical data is found, respond with "NO_HISTORICAL_DATA".`
        },
        {
          key: 'valuation',
          question: `Looking at this ESOP valuation document, please extract historical valuation data for multiple years.
          Look for previous valuations, valuation trends, or historical fair market value data.
          
          Please respond in this exact format:
          YEAR:ENTERPRISE_VALUE:EQUITY_VALUE:PER_SHARE_VALUE
          2023:80000000:75000000:15.50
          2022:72000000:68000000:14.25
          2021:65000000:62000000:13.00
          
          If you find historical valuation data, list all years available. If no historical data is found, respond with "NO_HISTORICAL_DATA".`
        }
      ];

      const fallbackData: any = {};
      
      for (const question of historicalQuestions) {
        try {
          console.log(`🔍 Asking AI for ${question.key} historical data...`);
          const response = await askQuestion(question.question, documentId);
          console.log(`📝 Raw AI response for ${question.key}:`, response);
          console.log(`📝 AI answer text for ${question.key}:`, response.answer);
          
          if (response.answer && !response.answer.toLowerCase().includes('no_historical_data')) {
            const parsedData = parseHistoricalResponse(response.answer, question.key);
            if (parsedData && parsedData.length > 0) {
              fallbackData[question.key] = parsedData;
              console.log(`✅ Found ${parsedData.length} years of ${question.key} data:`, parsedData);
            } else {
              console.log(`❌ Failed to parse ${question.key} data from response`);
            }
          } else {
            console.log(`❌ No historical data found in response for ${question.key}`);
          }
        } catch (error) {
          console.error(`❌ Error fetching ${question.key} historical data:`, error);
        }
      }
      
      if (Object.keys(fallbackData).length > 0) {
        console.log('✅ Successfully fetched fallback historical data:', fallbackData);
        setFallbackHistoricalData(fallbackData);
      } else {
        console.log('❌ No historical data found in fallback queries');
      }
      
    } catch (error) {
      console.error('❌ Error in fallback historical data fetch:', error);
    } finally {
      setLoadingFallback(false);
    }
  }, [documentId, loadingFallback, fallbackHistoricalData]);

  // Helper function to parse historical data responses
  const parseHistoricalResponse = (response: string, type: string) => {
    if (!response) return null;
    
    console.log(`🔍 Parsing ${type} response:`, response);
    
    const lines = response.split('\n');
    const data = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      console.log(`📝 Processing line: "${trimmedLine}"`);
      
      if (trimmedLine.includes(':') && !trimmedLine.toLowerCase().includes('year:') && !trimmedLine.toLowerCase().includes('format')) {
        const parts = trimmedLine.split(':');
        console.log(`🔧 Split parts:`, parts);
        
        if (type === 'revenue' || type === 'ebitda') {
          if (parts.length >= 2) {
            const year = parts[0].trim();
            const valueStr = parts[1].trim();
            
            // More flexible parsing for different number formats
            let value = null;
            
            // Remove common non-numeric characters and try to parse
            const cleanedValue = valueStr.replace(/[,$\s]/g, '');
            const parsedValue = parseFloat(cleanedValue);
            
            if (!isNaN(parsedValue) && parsedValue > 0) {
              value = parsedValue;
            }
            
            console.log(`💰 Parsed ${type} for ${year}: ${value}`);
            
            if (year && value !== null && /^\d{4}$/.test(year)) {
              data.push({ year, [type]: value });
              console.log(`✅ Added ${type} data:`, { year, [type]: value });
            }
          }
        } else if (type === 'valuation') {
          if (parts.length >= 4) {
            const year = parts[0].trim();
            const enterpriseValueStr = parts[1].trim();
            const equityValueStr = parts[2].trim();
            const perShareValueStr = parts[3].trim();
            
            const enterpriseValue = parseFloat(enterpriseValueStr.replace(/[,$\s]/g, ''));
            const equityValue = parseFloat(equityValueStr.replace(/[,$\s]/g, ''));
            const perShareValue = parseFloat(perShareValueStr.replace(/[,$\s]/g, ''));
            
            console.log(`📊 Parsed valuation for ${year}:`, { enterpriseValue, equityValue, perShareValue });
            
            if (year && /^\d{4}$/.test(year) && (!isNaN(enterpriseValue) || !isNaN(equityValue) || !isNaN(perShareValue))) {
              data.push({
                year,
                enterpriseValue: !isNaN(enterpriseValue) ? enterpriseValue : null,
                equityValue: !isNaN(equityValue) ? equityValue : null,
                perShareValue: !isNaN(perShareValue) ? perShareValue : null
              });
              console.log(`✅ Added valuation data:`, data[data.length - 1]);
            }
          }
        }
      }
    }

    console.log(`📊 Final parsed ${type} data:`, data);
    return data.length > 0 ? data : null;
  };

  // Set default active chart to first available chart when metrics load
  useEffect(() => {
    if (metrics) {
      // Chart selection will be handled inline
    }
  }, [metrics]);

  // Auto-trigger AI historical data fetch when component mounts if no historical data
  useEffect(() => {
    // Only auto-fetch if we have metrics, no enhanced metrics, no fallback data, and not already loading
    if (metrics && !loadingEnhanced && !enhancedMetrics?.historicalData && !fallbackHistoricalData && !loadingFallback) {
      console.log('🚀 Auto-triggering AI historical data fetch for Advanced Charts...');
      fetchFallbackHistoricalData();
    }
  }, [metrics, loadingEnhanced, enhancedMetrics, fallbackHistoricalData, loadingFallback, fetchFallbackHistoricalData]);

  // Helper function to get the report year from valuation date
  const getReportYear = (): number => {
    if (metrics?.valuationDate) {
      return new Date(metrics.valuationDate).getFullYear();
    } else if (metrics?.uploadDate) {
      return new Date(metrics.uploadDate).getFullYear();
    }
    return new Date().getFullYear();
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


  // Helper functions removed since radar chart was removed

  // Note: Variables removed since radar chart was removed






  // Process historical data for trend charts with better fallback
  const processHistoricalData = () => {
    console.log('🔍 Processing historical data, enhancedMetrics:', enhancedMetrics);
    console.log('🔍 Fallback historical data:', fallbackHistoricalData);
    
    // Use enhanced metrics data first, then fallback data
    const historicalDataSource = enhancedMetrics?.historicalData || fallbackHistoricalData;
    
    if (!historicalDataSource) {
      console.log('❌ No enhanced metrics or fallback historical data available');
      return null;
    }

    const { revenue: revenueHistory, ebitda: ebitdaHistory, valuation: valuationHistory } = historicalDataSource;
    
    console.log('📊 Historical data breakdown:', {
      revenueHistory,
      ebitdaHistory,
      valuationHistory
    });
    
    // Create combined trend data
    const trendData: any[] = [];
    const years = new Set<string>();

    // Collect all years from all data sources
    [revenueHistory, ebitdaHistory, valuationHistory].forEach(history => {
      if (history && Array.isArray(history)) {
        history.forEach((item: any) => {
          if (item && item.year) {
            years.add(item.year.toString());
          }
        });
      }
    });

    console.log('📅 Years found:', Array.from(years));

    // Sort years numerically
    const sortedYears = Array.from(years).sort((a, b) => parseInt(a) - parseInt(b));

    // Build trend data for each year
    sortedYears.forEach(year => {
      const yearData: any = { year };
      let hasData = false;

      // Add revenue data
      if (revenueHistory && Array.isArray(revenueHistory)) {
        const revenueItem = revenueHistory.find((item: any) => item && item.year && item.year.toString() === year);
        if (revenueItem && revenueItem.revenue && !isNaN(revenueItem.revenue)) {
          yearData.revenue = revenueItem.revenue;
          hasData = true;
        }
      }

      // Add EBITDA data
      if (ebitdaHistory && Array.isArray(ebitdaHistory)) {
        const ebitdaItem = ebitdaHistory.find((item: any) => item && item.year && item.year.toString() === year);
        if (ebitdaItem && ebitdaItem.ebitda && !isNaN(ebitdaItem.ebitda)) {
          yearData.ebitda = ebitdaItem.ebitda;
          hasData = true;
        }
      }

      // Add valuation data
      if (valuationHistory && Array.isArray(valuationHistory)) {
        const valuationItem = valuationHistory.find((item: any) => item && item.year && item.year.toString() === year);
        if (valuationItem) {
          if (valuationItem.enterpriseValue && !isNaN(valuationItem.enterpriseValue)) {
            yearData.enterpriseValue = valuationItem.enterpriseValue;
            hasData = true;
          }
          if (valuationItem.equityValue && !isNaN(valuationItem.equityValue)) {
            yearData.equityValue = valuationItem.equityValue;
            hasData = true;
          }
          if (valuationItem.perShareValue && !isNaN(valuationItem.perShareValue)) {
            yearData.perShareValue = valuationItem.perShareValue;
            hasData = true;
          }
        }
      }

      // Only add years that have at least one data point
      if (hasData) {
        trendData.push(yearData);
      }
    });

    console.log('📈 Built trend data:', trendData);
    return trendData.length >= 2 ? trendData : null;
  };

  const trendData = processHistoricalData();
  console.log('📈 Processed trend data:', trendData);

  // Create separate trend data for different metrics
  const revenueTrendData = trendData ? trendData.filter((item: any) => item.revenue !== undefined) : null;
  const ebitdaTrendData = trendData ? trendData.filter((item: any) => item.ebitda !== undefined) : null;
  const perShareTrendData = trendData ? trendData.filter((item: any) => item.perShareValue !== undefined) : null;

  // Chart availability logic - show all charts but mark some as disabled
  const chartOptions = [
    { 
      id: 'revenue', 
      name: 'Revenue Trends', 
      icon: TrendingUp, 
      available: (revenueTrendData !== null && revenueTrendData.length > 0) || !loadingEnhanced // Show if we have data or haven't tried enhanced yet
    },
    { 
      id: 'ebitda', 
      name: 'EBITDA Trends', 
      icon: TrendingUp, 
      available: (ebitdaTrendData !== null && ebitdaTrendData.length > 0) || !loadingEnhanced // Show if we have data or haven't tried enhanced yet
    },
    { 
      id: 'pershare', 
      name: 'Per-Share Value', 
      icon: TrendingUp, 
      available: (perShareTrendData !== null && perShareTrendData.length > 0) || !loadingEnhanced // Show if we have data or haven't tried enhanced yet
    }
  ];
  
  console.log('📊 Chart options available:', chartOptions.map(opt => opt.id));
  console.log('💹 Per-share trend data:', perShareTrendData);
  console.log('🔍 Enhanced metrics historical data:', enhancedMetrics?.historicalData);
  console.log('🔄 Fallback historical data:', fallbackHistoricalData);
  console.log('📈 Final processed trend data:', trendData);
  console.log('🔧 Loading states - Enhanced:', loadingEnhanced, 'Fallback:', loadingFallback);

  // Get the effective active chart (first available if current is invalid)
  const effectiveActiveChart = chartOptions.find(opt => opt.id === activeChart && opt.available)?.id || 
    chartOptions.find(opt => opt.available)?.id || 'revenue';

  // Handle chart selection with fallback data fetching
  const handleChartSelection = (chartId: string) => {
    const selectedOption = chartOptions.find(opt => opt.id === chartId);
    
    // Don't allow selection of disabled charts
    if (!selectedOption?.available) {
      return;
    }
    
    setActiveChart(chartId);
    
    // If user selects a trend chart but we don't have historical data, try to fetch it
    const isTrendChart = ['revenue', 'ebitda', 'pershare'].includes(chartId);
    const hasHistoricalData = trendData !== null;
    const hasAnyFallbackData = fallbackHistoricalData !== null;
    
    if (isTrendChart && !hasHistoricalData && !hasAnyFallbackData && !loadingFallback) {
      console.log(`🔄 User selected ${chartId} but no historical data available, triggering fallback fetch...`);
      fetchFallbackHistoricalData();
    }
  };

  const renderActiveChart = (): React.ReactNode => {
    // Check if any charts have data
    const availableCharts = chartOptions.filter(option => option.available);
    
    if (availableCharts.length === 0) {
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
      case 'revenue':
        if (loadingFallback) {
          return (
            <div className="bg-gray-50 rounded-lg p-8 text-center min-h-[400px] flex items-center justify-center">
              <div>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Analyzing Revenue Data</h3>
                <p className="text-gray-600">Using AI to extract historical revenue trends from your document...</p>
              </div>
            </div>
          );
        }
        return revenueTrendData ? (
          <LinearTrendChart
            data={revenueTrendData}
            title="Revenue Trends (Dashed = Predictions)"
            reportYear={getReportYear()}
            lines={[
              { dataKey: 'revenue', name: 'Revenue', color: '#3b82f6' }
            ]}
            formatValue={formatCurrency}
          />
        ) : (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Revenue Trend Data</h3>
            <p className="text-gray-600 mb-4">No historical revenue data was found in this document.</p>
            {!loadingFallback && !fallbackHistoricalData && (
              <button 
                onClick={fetchFallbackHistoricalData}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Ask AI to Find Historical Data
              </button>
            )}
            {fallbackHistoricalData && Object.keys(fallbackHistoricalData).length === 0 && (
              <p className="text-gray-500 text-sm">AI analysis found no historical revenue data in this document.</p>
            )}
          </div>
        );
      case 'ebitda':
        if (loadingFallback) {
          return (
            <div className="bg-gray-50 rounded-lg p-8 text-center min-h-[400px] flex items-center justify-center">
              <div>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Analyzing EBITDA Data</h3>
                <p className="text-gray-600">Using AI to extract historical EBITDA trends from your document...</p>
              </div>
            </div>
          );
        }
        return ebitdaTrendData ? (
          <LinearTrendChart
            data={ebitdaTrendData}
            title="EBITDA Trends (Dashed = Predictions)"
            reportYear={getReportYear()}
            lines={[
              { dataKey: 'ebitda', name: 'EBITDA', color: '#10b981' }
            ]}
            formatValue={formatCurrency}
          />
        ) : (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No EBITDA Trend Data</h3>
            <p className="text-gray-600 mb-4">No historical EBITDA data was found in this document.</p>
            {!loadingFallback && !fallbackHistoricalData && (
              <button 
                onClick={fetchFallbackHistoricalData}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Ask AI to Find Historical Data
              </button>
            )}
            {fallbackHistoricalData && Object.keys(fallbackHistoricalData).length === 0 && (
              <p className="text-gray-500 text-sm">AI analysis found no historical EBITDA data in this document.</p>
            )}
          </div>
        );
      case 'pershare':
        if (loadingFallback) {
          return (
            <div className="bg-gray-50 rounded-lg p-8 text-center min-h-[400px] flex items-center justify-center">
              <div>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Analyzing Valuation History</h3>
                <p className="text-gray-600">Using AI to extract historical per-share valuation data...</p>
              </div>
            </div>
          );
        }
        return perShareTrendData ? (
          <LinearTrendChart
            data={perShareTrendData}
            title="Per-Share Value Trends (Dashed = Predictions)"
            reportYear={getReportYear()}
            lines={[
              { dataKey: 'perShareValue', name: 'Per Share Value', color: '#8b5cf6' }
            ]}
            formatValue={formatCurrency}
          />
        ) : (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Per-Share History</h3>
            <p className="text-gray-600 mb-4">No historical per-share valuation data was found in this document.</p>
            {!loadingFallback && !fallbackHistoricalData && (
              <button 
                onClick={fetchFallbackHistoricalData}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Ask AI to Find Historical Data
              </button>
            )}
            {fallbackHistoricalData && Object.keys(fallbackHistoricalData).length === 0 && (
              <p className="text-gray-500 text-sm">AI analysis found no historical valuation data in this document.</p>
            )}
          </div>
        );
      default:
        // Find the first available chart to show as default
        const firstAvailableChart = chartOptions.find(option => option.available);
        if (firstAvailableChart) {
          if (firstAvailableChart.id === 'revenue' && revenueTrendData) {
            return (
              <LinearTrendChart
                data={revenueTrendData}
                title="Revenue Trends (Dashed = Predictions)"
                reportYear={getReportYear()}
                lines={[
                  { dataKey: 'revenue', name: 'Revenue', color: '#3b82f6' }
                ]}
                formatValue={formatCurrency}
              />
            );
          } else if (firstAvailableChart.id === 'ebitda' && ebitdaTrendData) {
            return (
              <LinearTrendChart
                data={ebitdaTrendData}
                title="EBITDA Trends (Dashed = Predictions)"
                reportYear={getReportYear()}
                lines={[
                  { dataKey: 'ebitda', name: 'EBITDA', color: '#10b981' }
                ]}
                formatValue={formatCurrency}
              />
            );
          } else if (firstAvailableChart.id === 'pershare' && perShareTrendData) {
            return (
              <LinearTrendChart
                data={perShareTrendData}
                title="Per-Share Value Trends (Dashed = Predictions)"
                reportYear={getReportYear()}
                lines={[
                  { dataKey: 'perShareValue', name: 'Per Share Value', color: '#8b5cf6' }
                ]}
                formatValue={formatCurrency}
              />
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

        {/* Loading indicator for enhanced metrics */}
        {(loadingEnhanced || loadingFallback) && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm text-blue-700">
                {loadingEnhanced ? 'Analyzing historical data for trend charts...' : 'Using AI to extract historical financial data...'}
              </span>
            </div>
          </div>
        )}

        {/* Chart Navigation - Show all charts with disabled states */}
        {chartOptions.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-4">
            {chartOptions.map((option) => {
              const Icon = option.icon;
              const isDisabled = !option.available;
              const isActive = effectiveActiveChart === option.id;
              
              return (
                <button
                  key={option.id}
                  onClick={() => handleChartSelection(option.id)}
                  disabled={isDisabled}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    isDisabled
                      ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                      : isActive
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  title={isDisabled ? `No data available for ${option.name}` : option.name}
                >
                  <Icon className={`h-4 w-4 ${isDisabled ? 'opacity-50' : ''}`} />
                  <span className="text-sm font-medium">{option.name}</span>
                  {(['revenue', 'ebitda', 'pershare'].includes(option.id)) && (loadingEnhanced || loadingFallback) && !isDisabled && (
                    <div className="animate-spin rounded-full h-3 w-3 border border-gray-400 border-t-transparent"></div>
                  )}
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