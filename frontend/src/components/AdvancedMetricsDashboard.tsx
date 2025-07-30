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
        },
        {
          key: 'cashflow',
          question: `Looking at this ESOP valuation document, please extract historical cash flow data for multiple years.
          Look for cash flow statements, operating cash flow, free cash flow, or cash flow analysis.
          
          Please respond in this exact format:
          YEAR:OPERATING_CASH_FLOW:FREE_CASH_FLOW
          2023:12000000:8000000
          2022:10000000:6500000
          2021:9000000:5000000
          
          If you find historical cash flow data, list all years available. If no historical data is found, respond with "NO_HISTORICAL_DATA".`
        },
        {
          key: 'growth',
          question: `Looking at this ESOP valuation document, please extract historical growth rate data for multiple years.
          Look for revenue growth rates, EBITDA growth rates, or year-over-year growth analysis.
          
          Please respond in this exact format (rates as decimals, e.g., 0.15 for 15%):
          YEAR:REVENUE_GROWTH_RATE:EBITDA_GROWTH_RATE
          2023:0.12:0.15
          2022:0.08:0.10
          2021:0.05:0.07
          
          If you find historical growth rate data, list all years available. If no historical data is found, respond with "NO_HISTORICAL_DATA".`
        },
        {
          key: 'margins',
          question: `Looking at this ESOP valuation document, please extract historical profit margin data for multiple years.
          Look for gross margins, EBITDA margins, net margins, or profitability analysis.
          
          Please respond in this exact format (margins as decimals, e.g., 0.25 for 25%):
          YEAR:GROSS_MARGIN:EBITDA_MARGIN:NET_MARGIN
          2023:0.45:0.18:0.12
          2022:0.42:0.16:0.10
          2021:0.40:0.15:0.08
          
          If you find historical margin data, list all years available. If no historical data is found, respond with "NO_HISTORICAL_DATA".`
        },
        {
          key: 'debt',
          question: `Looking at this ESOP valuation document, please extract historical debt coverage data for multiple years.
          Look for debt service coverage ratios, debt-to-EBITDA ratios, or debt analysis.
          
          Please respond in this exact format:
          YEAR:DEBT_SERVICE_COVERAGE:DEBT_TO_EBITDA
          2023:2.5:1.8
          2022:2.2:2.1
          2021:1.9:2.5
          
          If you find historical debt coverage data, list all years available. If no historical data is found, respond with "NO_HISTORICAL_DATA".`
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
        } else if (type === 'cashflow') {
          if (parts.length >= 3) {
            const year = parts[0].trim();
            const operatingCashFlowStr = parts[1].trim();
            const freeCashFlowStr = parts[2].trim();
            
            const operatingCashFlow = parseFloat(operatingCashFlowStr.replace(/[,$\s]/g, ''));
            const freeCashFlow = parseFloat(freeCashFlowStr.replace(/[,$\s]/g, ''));
            
            if (year && /^\d{4}$/.test(year) && (!isNaN(operatingCashFlow) || !isNaN(freeCashFlow))) {
              data.push({
                year,
                operatingCashFlow: !isNaN(operatingCashFlow) ? operatingCashFlow : null,
                freeCashFlow: !isNaN(freeCashFlow) ? freeCashFlow : null
              });
            }
          }
        } else if (type === 'growth') {
          if (parts.length >= 3) {
            const year = parts[0].trim();
            const revenueGrowthStr = parts[1].trim();
            const ebitdaGrowthStr = parts[2].trim();
            
            const revenueGrowthRate = parseFloat(revenueGrowthStr);
            const ebitdaGrowthRate = parseFloat(ebitdaGrowthStr);
            
            if (year && /^\d{4}$/.test(year) && (!isNaN(revenueGrowthRate) || !isNaN(ebitdaGrowthRate))) {
              data.push({
                year,
                revenueGrowthRate: !isNaN(revenueGrowthRate) ? revenueGrowthRate : null,
                ebitdaGrowthRate: !isNaN(ebitdaGrowthRate) ? ebitdaGrowthRate : null
              });
            }
          }
        } else if (type === 'margins') {
          if (parts.length >= 4) {
            const year = parts[0].trim();
            const grossMarginStr = parts[1].trim();
            const ebitdaMarginStr = parts[2].trim();
            const netMarginStr = parts[3].trim();
            
            const grossMargin = parseFloat(grossMarginStr);
            const ebitdaMargin = parseFloat(ebitdaMarginStr);
            const netMargin = parseFloat(netMarginStr);
            
            if (year && /^\d{4}$/.test(year) && (!isNaN(grossMargin) || !isNaN(ebitdaMargin) || !isNaN(netMargin))) {
              data.push({
                year,
                grossMargin: !isNaN(grossMargin) ? grossMargin : null,
                ebitdaMargin: !isNaN(ebitdaMargin) ? ebitdaMargin : null,
                netMargin: !isNaN(netMargin) ? netMargin : null
              });
            }
          }
        } else if (type === 'debt') {
          if (parts.length >= 3) {
            const year = parts[0].trim();
            const debtServiceCoverageStr = parts[1].trim();
            const debtToEbitdaStr = parts[2].trim();
            
            const debtServiceCoverage = parseFloat(debtServiceCoverageStr);
            const debtToEbitda = parseFloat(debtToEbitdaStr);
            
            if (year && /^\d{4}$/.test(year) && (!isNaN(debtServiceCoverage) || !isNaN(debtToEbitda))) {
              data.push({
                year,
                debtServiceCoverage: !isNaN(debtServiceCoverage) ? debtServiceCoverage : null,
                debtToEbitda: !isNaN(debtToEbitda) ? debtToEbitda : null
              });
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

    const { 
      revenue: revenueHistory, 
      ebitda: ebitdaHistory, 
      valuation: valuationHistory,
      cashflow: cashflowHistory,
      growth: growthHistory,
      margins: marginsHistory,
      debt: debtHistory
    } = historicalDataSource;
    
    console.log('📊 Historical data breakdown:', {
      revenueHistory,
      ebitdaHistory,
      valuationHistory,
      cashflowHistory,
      growthHistory,
      marginsHistory,
      debtHistory
    });
    
    // Create combined trend data
    const trendData: any[] = [];
    const years = new Set<string>();

    // Collect all years from all data sources
    [revenueHistory, ebitdaHistory, valuationHistory, cashflowHistory, growthHistory, marginsHistory, debtHistory].forEach(history => {
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

      // Add cash flow data
      if (cashflowHistory && Array.isArray(cashflowHistory)) {
        const cashflowItem = cashflowHistory.find((item: any) => item && item.year && item.year.toString() === year);
        if (cashflowItem) {
          if (cashflowItem.operatingCashFlow && !isNaN(cashflowItem.operatingCashFlow)) {
            yearData.operatingCashFlow = cashflowItem.operatingCashFlow;
            hasData = true;
          }
          if (cashflowItem.freeCashFlow && !isNaN(cashflowItem.freeCashFlow)) {
            yearData.freeCashFlow = cashflowItem.freeCashFlow;
            hasData = true;
          }
        }
      }

      // Add growth rate data
      if (growthHistory && Array.isArray(growthHistory)) {
        const growthItem = growthHistory.find((item: any) => item && item.year && item.year.toString() === year);
        if (growthItem) {
          if (growthItem.revenueGrowthRate && !isNaN(growthItem.revenueGrowthRate)) {
            yearData.revenueGrowthRate = growthItem.revenueGrowthRate;
            hasData = true;
          }
          if (growthItem.ebitdaGrowthRate && !isNaN(growthItem.ebitdaGrowthRate)) {
            yearData.ebitdaGrowthRate = growthItem.ebitdaGrowthRate;
            hasData = true;
          }
        }
      }

      // Add margin data
      if (marginsHistory && Array.isArray(marginsHistory)) {
        const marginItem = marginsHistory.find((item: any) => item && item.year && item.year.toString() === year);
        if (marginItem) {
          if (marginItem.grossMargin && !isNaN(marginItem.grossMargin)) {
            yearData.grossMargin = marginItem.grossMargin;
            hasData = true;
          }
          if (marginItem.ebitdaMargin && !isNaN(marginItem.ebitdaMargin)) {
            yearData.ebitdaMargin = marginItem.ebitdaMargin;
            hasData = true;
          }
          if (marginItem.netMargin && !isNaN(marginItem.netMargin)) {
            yearData.netMargin = marginItem.netMargin;
            hasData = true;
          }
        }
      }

      // Add debt coverage data
      if (debtHistory && Array.isArray(debtHistory)) {
        const debtItem = debtHistory.find((item: any) => item && item.year && item.year.toString() === year);
        if (debtItem) {
          if (debtItem.debtServiceCoverage && !isNaN(debtItem.debtServiceCoverage)) {
            yearData.debtServiceCoverage = debtItem.debtServiceCoverage;
            hasData = true;
          }
          if (debtItem.debtToEbitda && !isNaN(debtItem.debtToEbitda)) {
            yearData.debtToEbitda = debtItem.debtToEbitda;
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
  
  // Create data for additional time-based charts
  const cashFlowTrendData = trendData ? trendData.filter((item: any) => 
    item.operatingCashFlow !== undefined || item.freeCashFlow !== undefined
  ) : null;
  
  const growthRateTrendData = trendData ? trendData.filter((item: any) => 
    item.revenueGrowthRate !== undefined || item.ebitdaGrowthRate !== undefined
  ) : null;
  
  const marginTrendData = trendData ? trendData.filter((item: any) => 
    item.grossMargin !== undefined || item.ebitdaMargin !== undefined || item.netMargin !== undefined
  ) : null;
  
  const debtCoverageTrendData = trendData ? trendData.filter((item: any) => 
    item.debtServiceCoverage !== undefined || item.debtToEbitda !== undefined
  ) : null;

  // Chart availability logic - only show charts that have actual data
  const allChartOptions = [
    { 
      id: 'revenue', 
      name: 'Revenue Trends', 
      icon: TrendingUp, 
      hasData: revenueTrendData !== null && revenueTrendData.length > 0,
      isLoading: loadingEnhanced || loadingFallback
    },
    { 
      id: 'ebitda', 
      name: 'EBITDA Trends', 
      icon: TrendingUp, 
      hasData: ebitdaTrendData !== null && ebitdaTrendData.length > 0,
      isLoading: loadingEnhanced || loadingFallback
    },
    { 
      id: 'pershare', 
      name: 'Per-Share Value', 
      icon: TrendingUp, 
      hasData: perShareTrendData !== null && perShareTrendData.length > 0,
      isLoading: loadingEnhanced || loadingFallback
    },
    { 
      id: 'cashflow', 
      name: 'Cash Flow Trends', 
      icon: TrendingUp, 
      hasData: cashFlowTrendData !== null && cashFlowTrendData.length > 0,
      isLoading: loadingEnhanced || loadingFallback
    },
    { 
      id: 'growth', 
      name: 'Growth Rates', 
      icon: TrendingUp, 
      hasData: growthRateTrendData !== null && growthRateTrendData.length > 0,
      isLoading: loadingEnhanced || loadingFallback
    },
    { 
      id: 'margins', 
      name: 'Profit Margins', 
      icon: TrendingUp, 
      hasData: marginTrendData !== null && marginTrendData.length > 0,
      isLoading: loadingEnhanced || loadingFallback
    },
    { 
      id: 'debt', 
      name: 'Debt Coverage', 
      icon: TrendingUp, 
      hasData: debtCoverageTrendData !== null && debtCoverageTrendData.length > 0,
      isLoading: loadingEnhanced || loadingFallback
    }
  ];

  // Only include charts that have data OR are currently loading (to show loading state)  
  const chartOptions = allChartOptions.filter(option => option.hasData || option.isLoading).map(option => ({
    id: option.id,
    name: option.name,
    icon: option.icon,
    available: option.hasData // Only mark as available if there's actual data
  }));
  
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
    const isTrendChart = ['revenue', 'ebitda', 'pershare', 'cashflow', 'growth', 'margins', 'debt'].includes(chartId);
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
      // Show different message if we're still loading vs no data found
      const isStillLoading = loadingEnhanced || loadingFallback;
      
      return (
        <div className="bg-gray-50 rounded-lg p-8 text-center min-h-[400px] flex items-center justify-center">
          <div>
            {isStillLoading ? (
              <>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Analyzing Historical Data</h3>
                <p className="text-gray-600">AI is extracting historical financial trends from your document...</p>
              </>
            ) : (
              <>
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Historical Data Found</h3>
                <p className="text-gray-600">This document doesn't contain sufficient historical financial data for trend analysis.</p>
              </>
            )}
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
      case 'cashflow':
        if (loadingFallback) {
          return (
            <div className="bg-gray-50 rounded-lg p-8 text-center min-h-[400px] flex items-center justify-center">
              <div>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Analyzing Cash Flow Data</h3>
                <p className="text-gray-600">Using AI to extract historical cash flow trends from your document...</p>
              </div>
            </div>
          );
        }
        return cashFlowTrendData ? (
          <LinearTrendChart
            data={cashFlowTrendData}
            title="Cash Flow Trends (Dashed = Predictions)"
            reportYear={getReportYear()}
            lines={[
              { dataKey: 'operatingCashFlow', name: 'Operating Cash Flow', color: '#3b82f6' },
              { dataKey: 'freeCashFlow', name: 'Free Cash Flow', color: '#10b981' }
            ]}
            formatValue={formatCurrency}
          />
        ) : (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Cash Flow Data</h3>
            <p className="text-gray-600 mb-4">No historical cash flow data was found in this document.</p>
          </div>
        );
      case 'growth':
        if (loadingFallback) {
          return (
            <div className="bg-gray-50 rounded-lg p-8 text-center min-h-[400px] flex items-center justify-center">
              <div>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Analyzing Growth Rate Data</h3>
                <p className="text-gray-600">Using AI to extract historical growth rate trends from your document...</p>
              </div>
            </div>
          );
        }
        return growthRateTrendData ? (
          <LinearTrendChart
            data={growthRateTrendData}
            title="Growth Rate Trends (Dashed = Predictions)"
            reportYear={getReportYear()}
            lines={[
              { dataKey: 'revenueGrowthRate', name: 'Revenue Growth Rate', color: '#3b82f6' },
              { dataKey: 'ebitdaGrowthRate', name: 'EBITDA Growth Rate', color: '#10b981' }
            ]}
            formatValue={(value) => `${(value * 100).toFixed(1)}%`}
          />
        ) : (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Growth Rate Data</h3>
            <p className="text-gray-600 mb-4">No historical growth rate data was found in this document.</p>
          </div>
        );
      case 'margins':
        if (loadingFallback) {
          return (
            <div className="bg-gray-50 rounded-lg p-8 text-center min-h-[400px] flex items-center justify-center">
              <div>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Analyzing Margin Data</h3>
                <p className="text-gray-600">Using AI to extract historical profit margin trends from your document...</p>
              </div>
            </div>
          );
        }
        return marginTrendData ? (
          <LinearTrendChart
            data={marginTrendData}
            title="Profit Margin Trends (Dashed = Predictions)"
            reportYear={getReportYear()}
            lines={[
              { dataKey: 'grossMargin', name: 'Gross Margin', color: '#3b82f6' },
              { dataKey: 'ebitdaMargin', name: 'EBITDA Margin', color: '#10b981' },
              { dataKey: 'netMargin', name: 'Net Margin', color: '#f59e0b' }
            ]}
            formatValue={(value) => `${(value * 100).toFixed(1)}%`}
          />
        ) : (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Margin Data</h3>
            <p className="text-gray-600 mb-4">No historical profit margin data was found in this document.</p>
          </div>
        );
      case 'debt':
        if (loadingFallback) {
          return (
            <div className="bg-gray-50 rounded-lg p-8 text-center min-h-[400px] flex items-center justify-center">
              <div>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Analyzing Debt Coverage Data</h3>
                <p className="text-gray-600">Using AI to extract historical debt coverage trends from your document...</p>
              </div>
            </div>
          );
        }
        return debtCoverageTrendData ? (
          <LinearTrendChart
            data={debtCoverageTrendData}
            title="Debt Coverage Trends (Dashed = Predictions)"
            reportYear={getReportYear()}
            lines={[
              { dataKey: 'debtServiceCoverage', name: 'Debt Service Coverage', color: '#3b82f6' },
              { dataKey: 'debtToEbitda', name: 'Debt to EBITDA', color: '#ef4444' }
            ]}
            formatValue={(value) => `${value.toFixed(2)}x`}
          />
        ) : (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Debt Coverage Data</h3>
            <p className="text-gray-600 mb-4">No historical debt coverage data was found in this document.</p>
          </div>
        );
      default:
        // Find the first available chart to show as default
        const firstAvailableChart = chartOptions.find(option => option.available);
        if (firstAvailableChart) {
          switch (firstAvailableChart.id) {
            case 'revenue':
              return revenueTrendData ? (
                <LinearTrendChart
                  data={revenueTrendData}
                  title="Revenue Trends (Dashed = Predictions)"
                  reportYear={getReportYear()}
                  lines={[{ dataKey: 'revenue', name: 'Revenue', color: '#3b82f6' }]}
                  formatValue={formatCurrency}
                />
              ) : null;
            case 'ebitda':
              return ebitdaTrendData ? (
                <LinearTrendChart
                  data={ebitdaTrendData}
                  title="EBITDA Trends (Dashed = Predictions)"
                  reportYear={getReportYear()}
                  lines={[{ dataKey: 'ebitda', name: 'EBITDA', color: '#10b981' }]}
                  formatValue={formatCurrency}
                />
              ) : null;
            case 'pershare':
              return perShareTrendData ? (
                <LinearTrendChart
                  data={perShareTrendData}
                  title="Per-Share Value Trends (Dashed = Predictions)"
                  reportYear={getReportYear()}
                  lines={[{ dataKey: 'perShareValue', name: 'Per Share Value', color: '#8b5cf6' }]}
                  formatValue={formatCurrency}
                />
              ) : null;
            case 'cashflow':
              return cashFlowTrendData ? (
                <LinearTrendChart
                  data={cashFlowTrendData}
                  title="Cash Flow Trends (Dashed = Predictions)"
                  reportYear={getReportYear()}
                  lines={[
                    { dataKey: 'operatingCashFlow', name: 'Operating Cash Flow', color: '#3b82f6' },
                    { dataKey: 'freeCashFlow', name: 'Free Cash Flow', color: '#10b981' }
                  ]}
                  formatValue={formatCurrency}
                />
              ) : null;
            case 'growth':
              return growthRateTrendData ? (
                <LinearTrendChart
                  data={growthRateTrendData}
                  title="Growth Rate Trends (Dashed = Predictions)"
                  reportYear={getReportYear()}
                  lines={[
                    { dataKey: 'revenueGrowthRate', name: 'Revenue Growth Rate', color: '#3b82f6' },
                    { dataKey: 'ebitdaGrowthRate', name: 'EBITDA Growth Rate', color: '#10b981' }
                  ]}
                  formatValue={(value) => `${(value * 100).toFixed(1)}%`}
                />
              ) : null;
            case 'margins':
              return marginTrendData ? (
                <LinearTrendChart
                  data={marginTrendData}
                  title="Profit Margin Trends (Dashed = Predictions)"
                  reportYear={getReportYear()}
                  lines={[
                    { dataKey: 'grossMargin', name: 'Gross Margin', color: '#3b82f6' },
                    { dataKey: 'ebitdaMargin', name: 'EBITDA Margin', color: '#10b981' },
                    { dataKey: 'netMargin', name: 'Net Margin', color: '#f59e0b' }
                  ]}
                  formatValue={(value) => `${(value * 100).toFixed(1)}%`}
                />
              ) : null;
            case 'debt':
              return debtCoverageTrendData ? (
                <LinearTrendChart
                  data={debtCoverageTrendData}
                  title="Debt Coverage Trends (Dashed = Predictions)"
                  reportYear={getReportYear()}
                  lines={[
                    { dataKey: 'debtServiceCoverage', name: 'Debt Service Coverage', color: '#3b82f6' },
                    { dataKey: 'debtToEbitda', name: 'Debt to EBITDA', color: '#ef4444' }
                  ]}
                  formatValue={(value) => `${value.toFixed(2)}x`}
                />
              ) : null;
            default:
              return null;
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


        {/* Chart Navigation - Only show charts with data */}
        {chartOptions.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-4">
            {chartOptions.map((option) => {
              const Icon = option.icon;
              const isActive = effectiveActiveChart === option.id;
              const isLoading = (loadingEnhanced || loadingFallback) && !option.available;
              
              return (
                <button
                  key={option.id}
                  onClick={() => handleChartSelection(option.id)}
                  disabled={!option.available && !isLoading}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    !option.available && !isLoading
                      ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                      : isActive
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  title={option.name}
                >
                  <Icon className={`h-4 w-4 ${!option.available && !isLoading ? 'opacity-50' : ''}`} />
                  <span className="text-sm font-medium">{option.name}</span>
                  {isLoading && (
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