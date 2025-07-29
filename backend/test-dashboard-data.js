import { extractComprehensiveMetrics } from './src/services/comprehensiveExtraction.js';
import fs from 'fs/promises';

async function testDashboardData() {
  console.log('🧪 Testing Dashboard Data Structure...\n');

  try {
    // Test with TechCorp sample report
    console.log('📄 Testing with TechCorp Solutions sample report...');
    const techCorpText = await fs.readFile('../esop-analyzer/sample_esop_report.txt', 'utf8');
    
    const techCorpMetrics = extractComprehensiveMetrics(techCorpText);
    
    // Simulate the data structure that would be sent to the frontend
    const dashboardData = {
      documentId: 'test-doc-123',
      filename: 'sample_esop_report.pdf',
      uploadDate: '2024-01-15T10:00:00Z',
      valuationDate: '2023-12-31',
      metrics: {
        enterpriseValue: {
          data: techCorpMetrics.enterpriseValue,
          confidence: 0.95,
          extractedAt: new Date().toISOString()
        },
        valueOfEquity: {
          data: techCorpMetrics.valueOfEquity,
          confidence: 0.95,
          extractedAt: new Date().toISOString()
        },
        valuationPerShare: {
          data: techCorpMetrics.valuationPerShare,
          confidence: 0.95,
          extractedAt: new Date().toISOString()
        },
        keyFinancials: {
          data: techCorpMetrics.keyFinancials,
          confidence: 0.95,
          extractedAt: new Date().toISOString()
        },
        companyValuation: {
          data: techCorpMetrics.companyValuation,
          confidence: 0.95,
          extractedAt: new Date().toISOString()
        },
        capitalStructure: {
          data: techCorpMetrics.capitalStructure,
          confidence: 0.95,
          extractedAt: new Date().toISOString()
        }
      }
    };

    console.log('\n📊 Dashboard Data Structure:');
    console.log(JSON.stringify(dashboardData, null, 2));

    // Test the specific values that the dashboard would extract
    console.log('\n🔍 Dashboard Value Extraction Test:');
    
    const enterpriseValue = dashboardData.metrics.enterpriseValue?.data;
    const valueOfEquity = dashboardData.metrics.valueOfEquity?.data;
    const valuationPerShare = dashboardData.metrics.valuationPerShare?.data;
    const keyFinancials = dashboardData.metrics.keyFinancials?.data;
    const companyValuation = dashboardData.metrics.companyValuation?.data;
    const capitalStructure = dashboardData.metrics.capitalStructure?.data;

    console.log('Enterprise Value:', enterpriseValue?.currentValue || companyValuation?.totalValue);
    console.log('Value of Equity:', valueOfEquity?.currentValue || companyValuation?.totalValue);
    console.log('Valuation per Share:', valuationPerShare?.currentValue || companyValuation?.perShareValue);
    console.log('Revenue:', keyFinancials?.revenue);
    console.log('EBITDA:', keyFinancials?.ebitda);
    console.log('WACC:', keyFinancials?.weightedAverageCostOfCapital);
    console.log('Total Shares:', capitalStructure?.totalShares);
    console.log('ESOP Percentage:', capitalStructure?.esopPercentage);

    // Verify the dashboard calculations would work correctly
    console.log('\n✅ Dashboard Calculation Verification:');
    
    const enterpriseValueDisplay = parseFloat(enterpriseValue?.currentValue || companyValuation?.totalValue || '0') || null;
    const valueOfEquityDisplay = parseFloat(valueOfEquity?.currentValue || companyValuation?.totalValue || '0') || null;
    const valuationPerShareDisplay = parseFloat(valuationPerShare?.currentValue || companyValuation?.perShareValue || '0') || null;
    const revenueDisplay = parseFloat(keyFinancials?.revenue || '0') || null;
    const ebitdaDisplay = parseFloat(keyFinancials?.ebitda || '0') || null;
    const waccDisplay = parseFloat(keyFinancials?.weightedAverageCostOfCapital || '0') || null;

    console.log('Enterprise Value (formatted):', enterpriseValueDisplay ? `$${(enterpriseValueDisplay / 1000000).toFixed(1)}M` : 'N/A');
    console.log('Value of Equity (formatted):', valueOfEquityDisplay ? `$${(valueOfEquityDisplay / 1000000).toFixed(1)}M` : 'N/A');
    console.log('Valuation per Share (formatted):', valuationPerShareDisplay ? `$${valuationPerShareDisplay.toFixed(2)}` : 'N/A');
    console.log('Revenue (formatted):', revenueDisplay ? `$${(revenueDisplay / 1000000).toFixed(1)}M` : 'N/A');
    console.log('EBITDA (formatted):', ebitdaDisplay ? `$${(ebitdaDisplay / 1000000).toFixed(1)}M` : 'N/A');
    console.log('WACC (formatted):', waccDisplay ? `${waccDisplay.toFixed(1)}%` : 'N/A');

    // Expected formatted values
    console.log('\n✅ Expected Formatted Values:');
    console.log('Enterprise Value: $50.0M');
    console.log('Value of Equity: $50.0M');
    console.log('Valuation per Share: $125.00');
    console.log('Revenue: $28.5M');
    console.log('EBITDA: $8.6M');
    console.log('WACC: 12.5%');

    // Validation
    const validation = {
      enterpriseValue: Math.abs(enterpriseValueDisplay - 50000000) < 1000,
      valueOfEquity: Math.abs(valueOfEquityDisplay - 50000000) < 1000,
      valuationPerShare: Math.abs(valuationPerShareDisplay - 125) < 0.01,
      revenue: Math.abs(revenueDisplay - 28500000) < 1000,
      ebitda: Math.abs(ebitdaDisplay - 8550000) < 1000,
      wacc: Math.abs(waccDisplay - 12.5) < 0.1
    };

    console.log('\n🔍 Dashboard Display Validation:');
    Object.entries(validation).forEach(([key, correct]) => {
      console.log(`  ${key}: ${correct ? '✅' : '❌'}`);
    });

    const accuracy = Object.values(validation).filter(Boolean).length;
    console.log(`\n📈 Dashboard Display Accuracy: ${accuracy}/6 (${Math.round(accuracy/6*100)}%)`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testDashboardData(); 