import { answerQuestion } from './openaiService.js';

// Enhanced AI validation service with improved accuracy and cross-validation
export class EnhancedAIValidation {
  
  constructor() {
    this.validationPrompts = {
      enterpriseValue: {
        primary: `Extract the ENTERPRISE VALUE (total business value including debt) from this ESOP valuation document. 
        
Look for terms like:
- "Enterprise Value"
- "Total Business Value" 
- "Business Enterprise Value"
- "Total Company Value" (if it includes debt)

IMPORTANT: Enterprise Value = Equity Value + Debt. This is the total value of the business.

Respond with ONLY the numeric value (no $ signs, commas, or text). If not found, respond with "NOT_FOUND".`,

        secondary: `Find the ENTERPRISE VALUE in this document. This is the total value of the business including debt.
        
Look in:
- Executive Summary
- Valuation Conclusion  
- Final Results
- Business Enterprise Value sections

Enterprise Value = Equity Value + Debt Value

Respond with ONLY the number. If not found, respond with "NOT_FOUND".`
      },

      valueOfEquity: {
        primary: `Extract the EQUITY VALUE (value of shareholders' equity only) from this ESOP valuation document.
        
Look for terms like:
- "Equity Value"
- "Fair Market Value of Equity"
- "Shareholder Value"
- "Value of Equity"
- "Total Equity Value"

IMPORTANT: Equity Value = Enterprise Value - Debt. This is the value available to shareholders.

Respond with ONLY the numeric value (no $ signs, commas, or text). If not found, respond with "NOT_FOUND".`,

        secondary: `Find the EQUITY VALUE in this document. This is the value of shareholders' equity only.
        
Look in:
- Equity Valuation sections
- Shareholder Value sections
- Fair Market Value of Equity
- Capital Structure analysis

Equity Value = Enterprise Value - Debt Value

Respond with ONLY the number. If not found, respond with "NOT_FOUND".`
      },

      debtValue: {
        primary: `Extract the DEBT VALUE from this ESOP valuation document.
        
Look for terms like:
- "Total Debt"
- "Outstanding Debt"
- "Interest-Bearing Debt"
- "Long-term Debt"
- "Short-term Debt"

Respond with ONLY the numeric value (no $ signs, commas, or text). If not found, respond with "NOT_FOUND".`
      },

      revenue: {
        primary: `Extract the ANNUAL REVENUE from this ESOP valuation document.
        
Look for terms like:
- "Annual Revenue"
- "Total Revenue"
- "Sales"
- "Gross Revenue"

Use the most recent year's data if multiple years are shown.

Respond with ONLY the numeric value (no $ signs, commas, or text). If not found, respond with "NOT_FOUND".`
      },

      ebitda: {
        primary: `Extract the EBITDA (Earnings Before Interest, Taxes, Depreciation, and Amortization) from this ESOP valuation document.
        
Look for terms like:
- "EBITDA"
- "Earnings Before Interest, Taxes, Depreciation, and Amortization"
- "Adjusted EBITDA"
- "Normalized EBITDA"

Use the most recent year's data if multiple years are shown.

Respond with ONLY the numeric value (no $ signs, commas, or text). If not found, respond with "NOT_FOUND".`
      },

      discountRate: {
        primary: `Extract the DISCOUNT RATE or WACC (Weighted Average Cost of Capital) from this ESOP valuation document.
        
Look for terms like:
- "Discount Rate"
- "WACC"
- "Weighted Average Cost of Capital"
- "Required Rate of Return"
- "Cost of Capital"

Respond with ONLY the percentage number (no % symbol). If not found, respond with "NOT_FOUND".`
      },

      totalShares: {
        primary: `Extract the TOTAL SHARES OUTSTANDING from this ESOP valuation document.
        
Look for terms like:
- "Total Shares Outstanding"
- "Shares Outstanding"
- "Common Shares Outstanding"
- "Total Outstanding Shares"

Respond with ONLY the numeric value (no commas or text). If not found, respond with "NOT_FOUND".`
      },

      esopPercentage: {
        primary: `Extract the ESOP OWNERSHIP PERCENTAGE from this ESOP valuation document.
        
Look for terms like:
- "ESOP Ownership Percentage"
- "Employee Ownership Percentage"
- "ESOP Percentage"
- "Employee Stock Ownership Percentage"

Respond with ONLY the percentage number (no % symbol). If not found, respond with "NOT_FOUND".`
      }
    };
  }

  // Enhanced extraction with multiple attempts and validation
  async extractMetricsWithValidation(documentText) {
    console.log('🤖 Starting enhanced AI validation...');
    
    const results = {};
    const validationResults = {};

    // Step 1: Extract all metrics with primary prompts
    console.log('📊 Step 1: Extracting metrics with primary prompts...');
    for (const [metric, prompt] of Object.entries(this.validationPrompts)) {
      try {
        const value = await this.extractSingleMetric(documentText, prompt.primary, metric);
        results[metric] = value;
        console.log(`✅ ${metric}: ${value}`);
      } catch (error) {
        console.error(`❌ Error extracting ${metric}:`, error.message);
        results[metric] = null;
      }
    }

    // Step 2: Cross-validate enterprise value and equity value
    console.log('🔍 Step 2: Cross-validating enterprise value and equity value...');
    const crossValidation = await this.crossValidateEnterpriseAndEquity(documentText, results);
    
    // Step 3: Validate financial relationships
    console.log('🧮 Step 3: Validating financial relationships...');
    const relationshipValidation = await this.validateFinancialRelationships(documentText, results);

    // Step 4: Apply corrections based on validation
    console.log('🔄 Step 4: Applying corrections...');
    const finalResults = await this.applyCorrections(results, crossValidation, relationshipValidation);

    return {
      metrics: finalResults,
      validation: {
        crossValidation,
        relationshipValidation
      },
      confidence: this.calculateConfidence(finalResults, crossValidation, relationshipValidation)
    };
  }

  // Extract a single metric with error handling and parsing
  async extractSingleMetric(documentText, prompt, metricName) {
    try {
      const response = await answerQuestion(prompt, documentText);
      console.log(`📝 Raw response for ${metricName}: "${response}"`);
      
      // Parse the response
      const parsedValue = this.parseMetricResponse(response, metricName);
      console.log(`🔢 Parsed ${metricName}: ${parsedValue}`);
      
      return parsedValue;
    } catch (error) {
      console.error(`Error extracting ${metricName}:`, error);
      return null;
    }
  }

  // Parse metric response with comprehensive number extraction
  parseMetricResponse(response, metricName) {
    if (!response) return null;
    
    const cleanResponse = response.trim().toLowerCase();
    
    // Check for explicit "not found" responses
    if (cleanResponse.includes('not_found') || 
        cleanResponse.includes('not found') || 
        cleanResponse.includes('unknown') ||
        cleanResponse.includes('unavailable')) {
      return null;
    }

    // Comprehensive number extraction patterns
    const patterns = [
      // Currency with units
      /\$\s*([\d,]+(?:\.\d+)?)\s*(?:million|m)\b/gi,
      /\$\s*([\d,]+(?:\.\d+)?)\s*(?:billion|b)\b/gi,
      /([\d,]+(?:\.\d+)?)\s*(?:million|m)\s*(?:dollars?)?/gi,
      /([\d,]+(?:\.\d+)?)\s*(?:billion|b)\s*(?:dollars?)?/gi,
      // Currency without units
      /\$\s*([\d,]+(?:\.\d+)?)\b/g,
      // Percentages
      /([\d,]+(?:\.\d+)?)%/g,
      /([\d,]+(?:\.\d+)?)\s*percent/gi,
      // Large numbers (could be unformatted)
      /\b([\d,]{4,}(?:\.\d+)?)\b/g,
      // Any number (fallback)
      /\b([\d,]+(?:\.\d+)?)\b/g
    ];

    let bestMatch = null;
    let bestValue = null;

    for (const pattern of patterns) {
      const matches = [...cleanResponse.matchAll(pattern)];
      for (const match of matches) {
        let value = parseFloat(match[1].replace(/,/g, ''));
        const fullMatch = match[0].toLowerCase();
        
        // Apply multipliers
        if (fullMatch.includes('million') || fullMatch.endsWith(' m') || fullMatch.includes(' m ')) {
          value *= 1000000;
        } else if (fullMatch.includes('billion') || fullMatch.endsWith(' b') || fullMatch.includes(' b ')) {
          value *= 1000000000;
        }
        
        if (!isNaN(value) && value >= 0) {
          // Prefer matches with explicit units or currency symbols
          const hasUnits = fullMatch.includes('million') || fullMatch.includes('billion') || fullMatch.includes('$');
          const priority = hasUnits ? 2 : 1;
          
          if (!bestMatch || priority > (bestMatch.priority || 0)) {
            bestMatch = { value, text: match[0], priority };
            bestValue = value;
          }
        }
      }
    }

    return bestValue;
  }

  // Cross-validate enterprise value and equity value
  async crossValidateEnterpriseAndEquity(documentText, currentResults) {
    const validation = {
      enterpriseValue: { original: currentResults.enterpriseValue, corrected: null, reason: null },
      valueOfEquity: { original: currentResults.valueOfEquity, corrected: null, reason: null },
      debtValue: { original: currentResults.debtValue, corrected: null, reason: null }
    };

    // Check if we have both enterprise value and equity value
    if (currentResults.enterpriseValue && currentResults.valueOfEquity) {
      const calculatedDebt = currentResults.enterpriseValue - currentResults.valueOfEquity;
      
      // If calculated debt is reasonable (positive and not too large)
      if (calculatedDebt > 0 && calculatedDebt < currentResults.enterpriseValue * 0.8) {
        console.log(`✅ Cross-validation: Enterprise Value (${currentResults.enterpriseValue}) - Equity Value (${currentResults.valueOfEquity}) = Debt (${calculatedDebt})`);
        validation.debtValue.corrected = calculatedDebt;
        validation.debtValue.reason = 'Calculated from Enterprise Value - Equity Value';
      } else if (calculatedDebt <= 0) {
        // If calculated debt is negative, one of the values is wrong
        console.log(`⚠️ Cross-validation issue: Negative debt calculated (${calculatedDebt})`);
        
        // Try to find the correct values using a more specific prompt
        const correctionPrompt = `In this ESOP valuation document, I need to clarify the relationship between Enterprise Value and Equity Value.

Current extracted values:
- Enterprise Value: ${currentResults.enterpriseValue}
- Equity Value: ${currentResults.valueOfEquity}

This creates a negative debt value, which is impossible. Please help me find the correct values.

Look for:
1. Enterprise Value (total business value including debt)
2. Equity Value (value available to shareholders)
3. Total Debt (if mentioned separately)

Please respond with:
ENTERPRISE_VALUE: [number]
EQUITY_VALUE: [number] 
DEBT_VALUE: [number or "NOT_FOUND"]

If you can't find separate values, respond with "INSUFFICIENT_DATA".`;

        try {
          const correctionResponse = await answerQuestion(correctionPrompt, documentText);
          const correctedValues = this.parseCorrectionResponse(correctionResponse);
          
          if (correctedValues.enterpriseValue && correctedValues.valueOfEquity) {
            validation.enterpriseValue.corrected = correctedValues.enterpriseValue;
            validation.valueOfEquity.corrected = correctedValues.valueOfEquity;
            validation.debtValue.corrected = correctedValues.debtValue;
            validation.enterpriseValue.reason = 'Corrected due to cross-validation failure';
            validation.valueOfEquity.reason = 'Corrected due to cross-validation failure';
          }
        } catch (error) {
          console.error('Error in cross-validation correction:', error);
        }
      }
    }

    return validation;
  }

  // Parse correction response
  parseCorrectionResponse(response) {
    const result = {};
    const lines = response.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('ENTERPRISE_VALUE:')) {
        result.enterpriseValue = this.parseMetricResponse(line.replace('ENTERPRISE_VALUE:', '').trim(), 'enterpriseValue');
      } else if (line.startsWith('EQUITY_VALUE:')) {
        result.valueOfEquity = this.parseMetricResponse(line.replace('EQUITY_VALUE:', '').trim(), 'valueOfEquity');
      } else if (line.startsWith('DEBT_VALUE:')) {
        result.debtValue = this.parseMetricResponse(line.replace('DEBT_VALUE:', '').trim(), 'debtValue');
      }
    }
    
    return result;
  }

  // Validate financial relationships
  async validateFinancialRelationships(documentText, currentResults) {
    const validation = {
      revenueEbitdaRatio: null,
      ebitdaMargin: null,
      valuationMultiples: null,
      issues: []
    };

    // Check EBITDA margin
    if (currentResults.revenue && currentResults.ebitda) {
      const ebitdaMargin = (currentResults.ebitda / currentResults.revenue) * 100;
      validation.ebitdaMargin = ebitdaMargin;
      
      // Flag unusual margins
      if (ebitdaMargin > 50) {
        validation.issues.push('Unusually high EBITDA margin (>50%)');
      } else if (ebitdaMargin < 5) {
        validation.issues.push('Unusually low EBITDA margin (<5%)');
      }
    }

    // Check valuation multiples
    if (currentResults.enterpriseValue && currentResults.ebitda) {
      const evEbitdaMultiple = currentResults.enterpriseValue / currentResults.ebitda;
      validation.valuationMultiples = { evEbitdaMultiple };
      
      // Flag unusual multiples
      if (evEbitdaMultiple > 20) {
        validation.issues.push('Unusually high EV/EBITDA multiple (>20x)');
      } else if (evEbitdaMultiple < 3) {
        validation.issues.push('Unusually low EV/EBITDA multiple (<3x)');
      }
    }

    return validation;
  }

  // Apply corrections based on validation results
  async applyCorrections(originalResults, crossValidation, relationshipValidation) {
    const correctedResults = { ...originalResults };

    // Apply cross-validation corrections
    for (const [metric, validation] of Object.entries(crossValidation)) {
      if (validation.corrected !== null) {
        correctedResults[metric] = validation.corrected;
        console.log(`🔄 Corrected ${metric}: ${validation.original} → ${validation.corrected} (${validation.reason})`);
      }
    }

    // If we have relationship validation issues, try to resolve them
    if (relationshipValidation.issues.length > 0) {
      console.log(`⚠️ Financial relationship issues detected: ${relationshipValidation.issues.join(', ')}`);
      
      // For now, we'll flag these but not auto-correct
      // In a production system, you might want to add more sophisticated correction logic
    }

    return correctedResults;
  }

  // Calculate confidence score
  calculateConfidence(results, crossValidation, relationshipValidation) {
    let confidence = 0;
    let totalChecks = 0;

    // Check how many metrics we successfully extracted
    const extractedMetrics = Object.values(results).filter(v => v !== null).length;
    const totalMetrics = Object.keys(results).length;
    confidence += (extractedMetrics / totalMetrics) * 0.4; // 40% weight
    totalChecks++;

    // Check cross-validation success
    const crossValidationSuccess = Object.values(crossValidation).every(v => 
      v.corrected === null || (v.corrected !== null && v.reason !== null)
    );
    if (crossValidationSuccess) {
      confidence += 0.3; // 30% weight
    }
    totalChecks++;

    // Check relationship validation
    if (relationshipValidation.issues.length === 0) {
      confidence += 0.3; // 30% weight
    }
    totalChecks++;

    return Math.round((confidence / totalChecks) * 100);
  }

  // Main method to run enhanced validation
  async runEnhancedValidation(documentText) {
    console.log('🚀 Running enhanced AI validation...');
    
    try {
      const result = await this.extractMetricsWithValidation(documentText);
      
      console.log('✅ Enhanced validation completed');
      console.log('📊 Final metrics:', result.metrics);
      console.log('🎯 Confidence:', result.confidence);
      
      return result;
    } catch (error) {
      console.error('❌ Enhanced validation failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const enhancedAIValidation = new EnhancedAIValidation(); 