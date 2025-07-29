import { extractComprehensiveMetrics } from './src/services/comprehensiveExtraction.js';
import fs from 'fs/promises';

async function testTableExtraction() {
  console.log('🧪 Testing Enhanced Table Extraction...\n');

  try {
    // Test with first sample report
    console.log('📄 Testing with TechCorp Solutions sample report...');
    const techCorpText = await fs.readFile('../esop-analyzer/sample_esop_report.txt', 'utf8');
    
    console.log('\n🔍 Extracting metrics from TechCorp report...');
    const techCorpMetrics = extractComprehensiveMetrics(techCorpText);
    
    console.log('\n📊 TechCorp Results:');
    console.log('Revenue:', techCorpMetrics.keyFinancials.revenue);
    console.log('EBITDA:', techCorpMetrics.keyFinancials.ebitda);
    console.log('Total Shares:', techCorpMetrics.capitalStructure.totalShares);
    console.log('ESOP Percentage:', techCorpMetrics.capitalStructure.esopPercentage);
    console.log('Company Valuation:', techCorpMetrics.companyValuation.totalValue);
    console.log('Per Share Value:', techCorpMetrics.companyValuation.perShareValue);

    // Test with second sample report
    console.log('\n📄 Testing with InnovateTech Corp sample report...');
    const innovateText = await fs.readFile('../esop-analyzer/second_esop_report.txt', 'utf8');
    
    console.log('\n🔍 Extracting metrics from InnovateTech report...');
    const innovateMetrics = extractComprehensiveMetrics(innovateText);
    
    console.log('\n📊 InnovateTech Results:');
    console.log('Revenue:', innovateMetrics.keyFinancials.revenue);
    console.log('EBITDA:', innovateMetrics.keyFinancials.ebitda);
    console.log('Total Shares:', innovateMetrics.capitalStructure.totalShares);
    console.log('ESOP Percentage:', innovateMetrics.capitalStructure.esopPercentage);
    console.log('Company Valuation:', innovateMetrics.companyValuation.totalValue);
    console.log('Per Share Value:', innovateMetrics.companyValuation.perShareValue);

    // Expected values for comparison
    console.log('\n✅ Expected Values (TechCorp):');
    console.log('Revenue: 28500000');
    console.log('EBITDA: 8550000');
    console.log('Total Shares: 400000');
    console.log('ESOP Percentage: 30');
    console.log('Company Valuation: 50000000');
    console.log('Per Share Value: 125');

    console.log('\n✅ Expected Values (InnovateTech):');
    console.log('Revenue: 22400000');
    console.log('EBITDA: 6720000');
    console.log('Total Shares: 400000');
    console.log('ESOP Percentage: 25');
    console.log('Company Valuation: 38000000');
    console.log('Per Share Value: 95');

    // Validation
    console.log('\n🔍 Validation Results:');
    
    // TechCorp validation
    const techCorpValidation = {
      revenue: techCorpMetrics.keyFinancials.revenue === 28500000,
      ebitda: techCorpMetrics.keyFinancials.ebitda === 8550000,
      totalShares: techCorpMetrics.capitalStructure.totalShares === 400000,
      esopPercentage: techCorpMetrics.capitalStructure.esopPercentage === 30,
      companyValuation: techCorpMetrics.companyValuation.totalValue === 50000000,
      perShareValue: techCorpMetrics.companyValuation.perShareValue === 125
    };

    console.log('TechCorp Validation:');
    Object.entries(techCorpValidation).forEach(([key, correct]) => {
      console.log(`  ${key}: ${correct ? '✅' : '❌'}`);
    });

    // InnovateTech validation
    const innovateValidation = {
      revenue: innovateMetrics.keyFinancials.revenue === 22400000,
      ebitda: innovateMetrics.keyFinancials.ebitda === 6720000,
      totalShares: innovateMetrics.capitalStructure.totalShares === 400000,
      esopPercentage: innovateMetrics.capitalStructure.esopPercentage === 25,
      companyValuation: innovateMetrics.companyValuation.totalValue === 38000000,
      perShareValue: innovateMetrics.companyValuation.perShareValue === 95
    };

    console.log('InnovateTech Validation:');
    Object.entries(innovateValidation).forEach(([key, correct]) => {
      console.log(`  ${key}: ${correct ? '✅' : '❌'}`);
    });

    // Summary
    const techCorpScore = Object.values(techCorpValidation).filter(Boolean).length;
    const innovateScore = Object.values(innovateValidation).filter(Boolean).length;
    
    console.log(`\n📈 Overall Accuracy:`);
    console.log(`TechCorp: ${techCorpScore}/6 (${Math.round(techCorpScore/6*100)}%)`);
    console.log(`InnovateTech: ${innovateScore}/6 (${Math.round(innovateScore/6*100)}%)`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testTableExtraction(); 