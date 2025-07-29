// Simple script to create a sample ESOP PDF using Node
import fs from 'fs';

// Create a text-based ESOP report that can be saved as PDF
const esopReport = `
EMPLOYEE STOCK OWNERSHIP PLAN (ESOP)
VALUATION REPORT
TechCorp Solutions, Inc.

Valuation Date: December 31, 2023
Report Date: March 15, 2024

EXECUTIVE SUMMARY
================
Based on our comprehensive analysis, we have determined the fair market value of 
TechCorp Solutions, Inc. common stock to be $125.00 per share as of December 31, 2023.

KEY VALUATION METRICS
=====================
• Total Company Value: $50,000,000
• Total Outstanding Shares: 400,000
• Fair Market Value per Share: $125.00
• ESOP Ownership Percentage: 30%
• ESOP Shares: 120,000
• ESOP Value: $15,000,000

FINANCIAL PERFORMANCE ANALYSIS
===============================
Financial Metrics (in USD):
                    2023        2022        2021
Revenue          $28,500,000  $24,200,000  $21,800,000
EBITDA           $8,550,000   $7,260,000   $6,540,000
Net Income       $5,700,000   $4,840,000   $4,360,000
EBITDA Margin    30.0%        30.0%        30.0%

VALUATION METHODOLOGY
====================
Our valuation was based on three primary approaches:

1. Discounted Cash Flow (DCF) Analysis
• Discount Rate: 12.5%
• Risk-Free Rate: 4.5%
• Market Risk Premium: 6.5%
• Company-Specific Risk Premium: 1.5%
• Terminal Growth Rate: 3.0%

2. Market Multiple Analysis
Multiple            TechCorp    Industry Avg
Revenue Multiple    1.75x       1.60x
EBITDA Multiple     5.85x       5.50x
P/E Multiple        8.77x       9.20x

3. Asset-Based Approach
The asset-based approach yielded a value of $48,200,000, which serves as a 
floor valuation for the company.

CAPITAL STRUCTURE
=================
Ownership Category    Shares     Percentage    Value
ESOP                 120,000     30.0%        $15,000,000
Management           160,000     40.0%        $20,000,000
Other Shareholders   120,000     30.0%        $15,000,000
Total               400,000     100.0%       $50,000,000

KEY ASSUMPTIONS AND RISK FACTORS
=================================
Growth Assumptions:
• Revenue growth rate: 8-10% annually for next 5 years
• EBITDA margin maintained at 30%
• Capital expenditure: 3% of revenue annually
• Working capital requirements: 5% of revenue

Risk Factors:
• Market competition and technological disruption
• Key customer concentration risk
• Regulatory compliance requirements
• Management team retention

CONCLUSION
==========
Based on our comprehensive analysis using multiple valuation methodologies, we 
conclude that the fair market value of TechCorp Solutions, Inc. common stock is 
$125.00 per share as of December 31, 2023.

This valuation reflects the company's strong financial performance, market position, 
and growth prospects, while appropriately considering the risks and challenges 
facing the business.

The ESOP participants collectively own 30% of the company valued at $15,000,000, 
representing a significant stake in the company's future success.

The discount rate of 12.5% was applied based on the company's beta of 1.2, 
adjusted for company-specific risks including customer concentration and 
management depth.

Key financial assumptions include:
- Normalized EBITDA of $8.5 million
- Working capital as percentage of sales: 15%
- Capital expenditures: $850,000 annually
- Tax rate: 25%

Market comparables analysis included similar technology services companies with 
revenues between $20-40 million, EBITDA margins of 25-35%, and growth rates 
of 5-15% annually.

This report was prepared in accordance with the Uniform Standards of Professional 
Appraisal Practice (USPAP) and applicable regulatory requirements for ESOP valuations.

Prepared by: Strategic Valuation Partners LLC
Certified Business Appraiser
Date: March 15, 2024
`;

// Save as a text file that can be converted to PDF
fs.writeFileSync('/Users/charlieney/village_labs/esop-analyzer/sample_esop_report.txt', esopReport);
console.log('Sample ESOP report created at: sample_esop_report.txt');
console.log('You can convert this to PDF using:');
console.log('1. Open in TextEdit and export as PDF');
console.log('2. Use online text-to-PDF converter');
console.log('3. Copy content to Google Docs and export as PDF');