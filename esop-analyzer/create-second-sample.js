// Create a second sample ESOP PDF with different values
import fs from 'fs';

const esopReport2 = `
EMPLOYEE STOCK OWNERSHIP PLAN (ESOP)
VALUATION REPORT
InnovateTech Corp

Valuation Date: December 31, 2023
Report Date: April 10, 2024

EXECUTIVE SUMMARY
================
Based on our comprehensive analysis, we have determined the fair market value of 
InnovateTech Corp common stock to be $95.00 per share as of December 31, 2023.

KEY VALUATION METRICS
=====================
• Total Company Value: $38,000,000
• Total Outstanding Shares: 400,000
• Fair Market Value per Share: $95.00
• ESOP Ownership Percentage: 25%
• ESOP Shares: 100,000
• ESOP Value: $9,500,000

FINANCIAL PERFORMANCE ANALYSIS
===============================
Financial Metrics (in USD):
                    2023        2022        2021
Revenue          $22,400,000  $19,800,000  $17,500,000
EBITDA           $6,720,000   $5,940,000   $5,250,000
Net Income       $4,480,000   $3,960,000   $3,500,000
EBITDA Margin    30.0%        30.0%        30.0%

VALUATION METHODOLOGY
====================
Our valuation was based on three primary approaches:

1. Discounted Cash Flow (DCF) Analysis
• Discount Rate: 14.0%
• Risk-Free Rate: 4.8%
• Market Risk Premium: 7.0%
• Company-Specific Risk Premium: 2.2%
• Terminal Growth Rate: 2.5%

2. Market Multiple Analysis
Multiple            InnovateTech    Industry Avg
Revenue Multiple    1.70x           1.60x
EBITDA Multiple     5.65x           5.50x
P/E Multiple        8.48x           9.20x

3. Asset-Based Approach
The asset-based approach yielded a value of $36,500,000, which serves as a 
floor valuation for the company.

CAPITAL STRUCTURE
=================
Ownership Category    Shares     Percentage    Value
ESOP                 100,000     25.0%        $9,500,000
Management           180,000     45.0%        $17,100,000
Other Shareholders   120,000     30.0%        $11,400,000
Total               400,000     100.0%       $38,000,000

KEY ASSUMPTIONS AND RISK FACTORS
=================================
Growth Assumptions:
• Revenue growth rate: 6-8% annually for next 5 years
• EBITDA margin maintained at 30%
• Capital expenditure: 4% of revenue annually
• Working capital requirements: 8% of revenue

Risk Factors:
• Technology disruption risk
• Competitive pressure from larger firms
• Key personnel dependency
• Regulatory compliance costs

CONCLUSION
==========
Based on our comprehensive analysis using multiple valuation methodologies, we 
conclude that the fair market value of InnovateTech Corp common stock is 
$95.00 per share as of December 31, 2023.

This valuation reflects the company's solid financial performance, competitive 
market position, and growth prospects, while appropriately considering the risks 
and challenges in the technology sector.

The ESOP participants collectively own 25% of the company valued at $9,500,000, 
representing meaningful employee ownership in the company's success.

The higher discount rate of 14.0% reflects increased market volatility and 
company-specific risks including technology refresh cycles and competitive 
pressures in the software industry.

Key financial assumptions include:
- Normalized EBITDA of $6.7 million
- Working capital as percentage of sales: 8%
- Capital expenditures: $896,000 annually
- Tax rate: 25%

Market comparables analysis focused on mid-market technology companies with 
similar business models, growth profiles, and market dynamics.

This report was prepared in accordance with the Uniform Standards of Professional 
Appraisal Practice (USPAP) and applicable regulatory requirements for ESOP valuations.

Prepared by: Valuation Experts LLC
Certified Business Appraiser
Date: April 10, 2024
`;

// Save as a text file
fs.writeFileSync('/Users/charlieney/village_labs/esop-analyzer/second_esop_report.txt', esopReport2);
console.log('Second sample ESOP report created: second_esop_report.txt');
console.log('Key differences from first sample:');
console.log('- Company: InnovateTech Corp (vs TechCorp Solutions)');
console.log('- Valuation: $95/share, $38M total (vs $125/share, $50M total)');
console.log('- ESOP: 25% ownership (vs 30%)');
console.log('- Discount Rate: 14.0% (vs 12.5%)');
console.log('- Revenue: $22.4M (vs $28.5M)');