// Comprehensive fallback extraction for when AI fails
export const extractComprehensiveMetrics = (documentText) => {
  const text = documentText.toLowerCase();
  const originalText = documentText;
  
  const metrics = {
    enterpriseValue: { currency: "USD" },
    valueOfEquity: { currency: "USD" },
    valuationPerShare: { currency: "USD" },
    keyFinancials: {},
    companyValuation: { currency: "USD" },
    discountRates: {},
    capitalStructure: {},
    valuationMultiples: {}
  };

  // Helper function to clean and parse numbers
  const parseNumber = (str) => {
    if (!str) return null;
    const cleaned = str.replace(/[\$,\s%]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  };

  // Helper function to find numbers in millions/billions
  const parseValueWithUnits = (str) => {
    if (!str) return null;
    console.log(`parseValueWithUnits input: "${str}"`);
    
    // First extract just the numeric part with commas
    const numberMatch = str.match(/\$?([\d,]+(?:\.\d+)?)/);
    if (!numberMatch) {
      console.log('No number found in string');
      return null;
    }
    
    const numberStr = numberMatch[1].replace(/,/g, ''); // Remove commas
    const baseNum = parseFloat(numberStr);
    
    if (isNaN(baseNum)) {
      console.log(`Failed to parse number: ${numberStr}`);
      return null;
    }
    
    console.log(`Base number: ${baseNum}`);
    
    // Check for unit multipliers
    const lowerStr = str.toLowerCase();
    let multiplier = 1;
    
    if (lowerStr.includes('million') || lowerStr.includes(' m ') || lowerStr.endsWith(' m')) {
      multiplier = 1000000;
    } else if (lowerStr.includes('billion') || lowerStr.includes(' b ') || lowerStr.endsWith(' b')) {
      multiplier = 1000000000;
    } else if (lowerStr.includes('thousand') || lowerStr.includes(' k ') || lowerStr.endsWith(' k')) {
      multiplier = 1000;
    }
    
    const result = baseNum * multiplier;
    console.log(`Final result: ${result} (base: ${baseNum}, multiplier: ${multiplier})`);
    return result;
  };

  // Company Valuation Patterns - more specific patterns
  const totalValuationPatterns = [
    /total\s+company\s+valuation:?\s*\$?([\d,]+(?:\.\d+)?)(?:\s*(?:million|billion|m|b))?/gi,
    /company\s+valuation:?\s*\$?([\d,]+(?:\.\d+)?)(?:\s*(?:million|billion|m|b))?/gi,
    /enterprise\s+value:?\s*\$?([\d,]+(?:\.\d+)?)(?:\s*(?:million|billion|m|b))?/gi,
    /total\s+(?:value|valuation):?\s*\$?([\d,]+(?:\.\d+)?)(?:\s*(?:million|billion|m|b))?/gi
  ];

  console.log('Testing total valuation patterns...');
  for (let i = 0; i < totalValuationPatterns.length; i++) {
    const pattern = totalValuationPatterns[i];
    const match = originalText.match(pattern);
    console.log(`Pattern ${i+1}: ${pattern} - Match: ${match ? match[0] : 'NO MATCH'}`);
    if (match) {
      // Extract just the number part
      const numberMatch = match[0].match(/\$?([\d,]+(?:\.\d+)?)/); 
      console.log(`Number match: ${numberMatch ? numberMatch[1] : 'NO NUMBER'}`);
      if (numberMatch) {
        const value = parseValueWithUnits(match[0]);
        console.log(`Parsed value: ${value}`);
        if (value) {
          metrics.companyValuation.totalValue = value;
          metrics.enterpriseValue.currentValue = value;
          metrics.valueOfEquity.currentValue = value; // Assume same unless debt found
          console.log(`Found total company valuation: ${value}`);
          break;
        } else {
          console.log('parseValueWithUnits returned null/falsy value');
        }
      }
    }
  }

  // Per Share Value Patterns - more specific
  const shareValuePatterns = [
    /per\s+share\s+value:?\s*\$?([\d,]+(?:\.\d+)?)/gi,
    /share\s+value:?\s*\$?([\d,]+(?:\.\d+)?)/gi,
    /price\s+per\s+share:?\s*\$?([\d,]+(?:\.\d+)?)/gi,
    /fair\s+market\s+value\s+per\s+share:?\s*\$?([\d,]+(?:\.\d+)?)/gi
  ];

  for (const pattern of shareValuePatterns) {
    const match = originalText.match(pattern);
    if (match) {
      const numberMatch = match[0].match(/\$?([\d,]+(?:\.\d+)?)/); 
      if (numberMatch) {
        const value = parseNumber(numberMatch[1]);
        if (value) {
          metrics.companyValuation.perShareValue = value;
          metrics.valuationPerShare.currentValue = value;
          console.log(`Found per share value: ${value}`);
          break;
        }
      }
    }
  }

  // Revenue Patterns - more specific
  const revenuePatterns = [
    /revenue:?\s*\$?([\d,]+(?:\.\d+)?)(?:\s*(?:million|billion|m|b))?/gi,
    /annual\s+revenue:?\s*\$?([\d,]+(?:\.\d+)?)(?:\s*(?:million|billion|m|b))?/gi,
    /total\s+revenue:?\s*\$?([\d,]+(?:\.\d+)?)(?:\s*(?:million|billion|m|b))?/gi,
    /sales:?\s*\$?([\d,]+(?:\.\d+)?)(?:\s*(?:million|billion|m|b))?/gi
  ];

  for (const pattern of revenuePatterns) {
    const match = originalText.match(pattern);
    if (match) {
      const numberMatch = match[0].match(/\$?([\d,]+(?:\.\d+)?)/); 
      if (numberMatch) {
        const value = parseValueWithUnits(match[0]);
        if (value) {
          metrics.keyFinancials.revenue = value;
          console.log(`Found revenue: ${value}`);
          break;
        }
      }
    }
  }

  // EBITDA Patterns - more specific
  const ebitdaPatterns = [
    /ebitda:?\s*\$?([\d,]+(?:\.\d+)?)(?:\s*(?:million|billion|m|b))?/gi,
    /earnings\s+before:?\s*\$?([\d,]+(?:\.\d+)?)(?:\s*(?:million|billion|m|b))?/gi,
    /operating\s+income:?\s*\$?([\d,]+(?:\.\d+)?)(?:\s*(?:million|billion|m|b))?/gi
  ];

  for (const pattern of ebitdaPatterns) {
    const match = originalText.match(pattern);
    if (match) {
      const numberMatch = match[0].match(/\$?([\d,]+(?:\.\d+)?)/); 
      if (numberMatch) {
        const value = parseValueWithUnits(match[0]);
        if (value) {
          metrics.keyFinancials.ebitda = value;
          console.log(`Found EBITDA: ${value}`);
          break;
        }
      }
    }
  }

  // Discount Rate / WACC Patterns - more specific
  const discountRatePatterns = [
    /discount\s+rate\s+applied:?\s*([\d.]+)%?/gi,
    /discount\s+rate:?\s*([\d.]+)%?/gi,
    /wacc:?\s*([\d.]+)%?/gi,
    /weighted\s+average\s+cost:?\s*([\d.]+)%?/gi,
    /cost\s+of\s+capital:?\s*([\d.]+)%?/gi
  ];

  for (const pattern of discountRatePatterns) {
    const match = originalText.match(pattern);
    if (match) {
      const numberMatch = match[0].match(/([\d.]+)/); 
      if (numberMatch) {
        const value = parseNumber(numberMatch[1]);
        if (value) {
          metrics.discountRates.discountRate = value;
          metrics.keyFinancials.weightedAverageCostOfCapital = value;
          console.log(`Found discount rate: ${value}%`);
          break;
        }
      }
    }
  }

  // Shares Outstanding Patterns - more specific
  const sharesPatterns = [
    /total\s+shares\s+outstanding:?\s*([\d,]+)/gi,
    /shares\s+outstanding:?\s*([\d,]+)/gi,
    /outstanding\s+shares:?\s*([\d,]+)/gi,
    /total\s+shares:?\s*([\d,]+)/gi
  ];

  for (const pattern of sharesPatterns) {
    const match = originalText.match(pattern);
    if (match) {
      const numberMatch = match[0].match(/([\d,]+)/); 
      if (numberMatch) {
        const value = parseNumber(numberMatch[1]);
        if (value) {
          metrics.capitalStructure.totalShares = value;
          console.log(`Found total shares: ${value}`);
          break;
        }
      }
    }
  }

  // ESOP Percentage Patterns - more specific
  const esopPatterns = [
    /esop\s+ownership\s+percentage:?\s*([\d.]+)%?/gi,
    /esop\s+percentage:?\s*([\d.]+)%?/gi,
    /employee\s+ownership:?\s*([\d.]+)%?/gi,
    /ownership\s+percentage:?\s*([\d.]+)%?/gi
  ];

  for (const pattern of esopPatterns) {
    const match = originalText.match(pattern);
    if (match) {
      const numberMatch = match[0].match(/([\d.]+)/); 
      if (numberMatch) {
        const value = parseNumber(numberMatch[1]);
        if (value) {
          metrics.capitalStructure.esopPercentage = value;
          console.log(`Found ESOP percentage: ${value}%`);
          break;
        }
      }
    }
  }

  // Revenue Multiple Patterns
  const revenueMultiplePatterns = [
    /revenue\s+multiple(?:\s+(?:is|of|:))?\s*([\d.]+)x?/gi,
    /([\d.]+)x?\s+revenue\s+multiple/gi
  ];

  for (const pattern of revenueMultiplePatterns) {
    const match = originalText.match(pattern);
    if (match) {
      const value = parseNumber(match[1] || match[0]);
      if (value) {
        metrics.valuationMultiples.revenueMultiple = value;
        break;
      }
    }
  }

  // EBITDA Multiple Patterns
  const ebitdaMultiplePatterns = [
    /ebitda\s+multiple(?:\s+(?:is|of|:))?\s*([\d.]+)x?/gi,
    /([\d.]+)x?\s+ebitda\s+multiple/gi
  ];

  for (const pattern of ebitdaMultiplePatterns) {
    const match = originalText.match(pattern);
    if (match) {
      const value = parseNumber(match[1] || match[0]);
      if (value) {
        metrics.valuationMultiples.ebitdaMultiple = value;
        break;
      }
    }
  }

  // Calculate ESOP shares if we have total shares and percentage
  if (metrics.capitalStructure.totalShares && metrics.capitalStructure.esopPercentage) {
    metrics.capitalStructure.esopShares = Math.round(
      (metrics.capitalStructure.totalShares * metrics.capitalStructure.esopPercentage) / 100
    );
  }

  console.log('🔍 Comprehensive extraction results:', JSON.stringify(metrics, null, 2));
  return metrics;
};