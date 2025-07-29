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

  // NEW: Enhanced table parsing function
  const parseTableData = (text) => {
    console.log('🔍 Parsing table data...');
    
    // Look for financial metrics table patterns
    const financialTablePatterns = [
      // Pattern for "Financial Metrics (in USD):" table
      /financial\s+metrics\s*\([^)]*\)\s*:?\s*\n\s*([\s\S]*?)(?=\n\s*[A-Z]|$)/gi,
      // Pattern for revenue/EBITDA table
      /(?:revenue|ebitda|financial)\s*:?\s*\n\s*([\s\S]*?)(?=\n\s*[A-Z]|$)/gi,
      // Pattern for capital structure table
      /capital\s+structure\s*:?\s*\n\s*([\s\S]*?)(?=\n\s*[A-Z]|$)/gi,
      // Pattern for ownership table
      /ownership\s+category\s*:?\s*\n\s*([\s\S]*?)(?=\n\s*[A-Z]|$)/gi
    ];

    for (const pattern of financialTablePatterns) {
      const matches = [...originalText.matchAll(pattern)];
      for (const match of matches) {
        const tableContent = match[1];
        console.log(`📊 Found table content: ${tableContent.substring(0, 200)}...`);
        
        // Parse revenue from table
        const revenueMatch = tableContent.match(/revenue\s+\$?([\d,]+(?:\.\d+)?)/i);
        if (revenueMatch && !metrics.keyFinancials.revenue) {
          const revenue = parseValueWithUnits(revenueMatch[0]);
          if (revenue) {
            metrics.keyFinancials.revenue = revenue;
            console.log(`✅ Extracted revenue from table: ${revenue}`);
          }
        }
        
        // Parse EBITDA from table
        const ebitdaMatch = tableContent.match(/ebitda\s+\$?([\d,]+(?:\.\d+)?)/i);
        if (ebitdaMatch && !metrics.keyFinancials.ebitda) {
          const ebitda = parseValueWithUnits(ebitdaMatch[0]);
          if (ebitda) {
            metrics.keyFinancials.ebitda = ebitda;
            console.log(`✅ Extracted EBITDA from table: ${ebitda}`);
          }
        }
        
        // Parse total shares from table
        const sharesMatch = tableContent.match(/total\s+\$?([\d,]+)/i);
        if (sharesMatch && !metrics.capitalStructure.totalShares) {
          const shares = parseNumber(sharesMatch[1]);
          if (shares && shares > 1000) { // Likely shares if > 1000
            metrics.capitalStructure.totalShares = shares;
            console.log(`✅ Extracted total shares from table: ${shares}`);
          }
        }
        
        // Parse ESOP percentage from table
        const esopPercentMatch = tableContent.match(/esop\s+[^%]*?(\d+(?:\.\d+)?)%/i);
        if (esopPercentMatch && !metrics.capitalStructure.esopPercentage) {
          const esopPercent = parseNumber(esopPercentMatch[1]);
          if (esopPercent && esopPercent > 0 && esopPercent <= 100) {
            metrics.capitalStructure.esopPercentage = esopPercent;
            console.log(`✅ Extracted ESOP percentage from table: ${esopPercent}%`);
          }
        }
      }
    }
  };

  // NEW: Enhanced row-based table parsing
  const parseTableRows = (text) => {
    console.log('🔍 Parsing table rows...');
    
    // Split text into lines and look for table-like patterns
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Look for revenue line
      if (line.toLowerCase().includes('revenue') && !metrics.keyFinancials.revenue) {
        const revenueMatch = line.match(/\$?([\d,]+(?:\.\d+)?)/);
        if (revenueMatch) {
          const revenue = parseValueWithUnits(line);
          if (revenue) {
            metrics.keyFinancials.revenue = revenue;
            console.log(`✅ Extracted revenue from line: ${revenue}`);
          }
        }
      }
      
      // Look for EBITDA line
      if (line.toLowerCase().includes('ebitda') && !metrics.keyFinancials.ebitda) {
        const ebitdaMatch = line.match(/\$?([\d,]+(?:\.\d+)?)/);
        if (ebitdaMatch) {
          const ebitda = parseValueWithUnits(line);
          if (ebitda) {
            metrics.keyFinancials.ebitda = ebitda;
            console.log(`✅ Extracted EBITDA from line: ${ebitda}`);
          }
        }
      }
      
      // Look for total shares line
      if (line.toLowerCase().includes('total') && line.toLowerCase().includes('shares') && !metrics.capitalStructure.totalShares) {
        const sharesMatch = line.match(/(\d{1,3}(?:,\d{3})*)/);
        if (sharesMatch) {
          const shares = parseNumber(sharesMatch[1]);
          if (shares && shares > 1000) {
            metrics.capitalStructure.totalShares = shares;
            console.log(`✅ Extracted total shares from line: ${shares}`);
          }
        }
      }
      
      // Look for ESOP percentage line
      if (line.toLowerCase().includes('esop') && line.includes('%') && !metrics.capitalStructure.esopPercentage) {
        const percentMatch = line.match(/(\d+(?:\.\d+)?)%/);
        if (percentMatch) {
          const percent = parseNumber(percentMatch[1]);
          if (percent && percent > 0 && percent <= 100) {
            metrics.capitalStructure.esopPercentage = percent;
            console.log(`✅ Extracted ESOP percentage from line: ${percent}%`);
          }
        }
      }
    }
  };

  // NEW: Enhanced multi-column table parsing
  const parseMultiColumnTable = (text) => {
    console.log('🔍 Parsing multi-column table data...');
    
    // Look for patterns like "2023        2022        2021" followed by data
    const yearHeaderPattern = /\d{4}\s+\d{4}\s+\d{4}/;
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if this line has year headers
      if (yearHeaderPattern.test(line)) {
        console.log(`📊 Found year header line: ${line}`);
        
        // Look at next few lines for data
        for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
          const dataLine = lines[j];
          
          // Look for revenue line
          if (dataLine.toLowerCase().includes('revenue') && !metrics.keyFinancials.revenue) {
            const values = dataLine.match(/\$?([\d,]+(?:\.\d+)?)/g);
            if (values && values.length >= 1) {
              const revenue = parseValueWithUnits(values[0]); // Use first (most recent) value
              if (revenue) {
                metrics.keyFinancials.revenue = revenue;
                console.log(`✅ Extracted revenue from multi-column table: ${revenue}`);
              }
            }
          }
          
          // Look for EBITDA line
          if (dataLine.toLowerCase().includes('ebitda') && !metrics.keyFinancials.ebitda) {
            const values = dataLine.match(/\$?([\d,]+(?:\.\d+)?)/g);
            if (values && values.length >= 1) {
              const ebitda = parseValueWithUnits(values[0]); // Use first (most recent) value
              if (ebitda) {
                metrics.keyFinancials.ebitda = ebitda;
                console.log(`✅ Extracted EBITDA from multi-column table: ${ebitda}`);
              }
            }
          }
        }
      }
    }
  };

  // Execute all parsing methods
  parseTableData(originalText);
  parseTableRows(originalText);
  parseMultiColumnTable(originalText);

  // Company Valuation Patterns - more specific patterns
  const totalValuationPatterns = [
    /total\s+company\s+value:?\s*\$?([\d,]+(?:\.\d+)?)(?:\s*(?:million|billion|m|b))?/gi,
    /total\s+company\s+valuation:?\s*\$?([\d,]+(?:\.\d+)?)(?:\s*(?:million|billion|m|b))?/gi,
    /company\s+valuation:?\s*\$?([\d,]+(?:\.\d+)?)(?:\s*(?:million|billion|m|b))?/gi,
    /enterprise\s+value:?\s*\$?([\d,]+(?:\.\d+)?)(?:\s*(?:million|billion|m|b))?/gi,
    /total\s+(?:value|valuation):?\s*\$?([\d,]+(?:\.\d+)?)(?:\s*(?:million|billion|m|b))?/gi,
    /fair\s+market\s+value:?\s*\$?([\d,]+(?:\.\d+)?)(?:\s*(?:million|billion|m|b))?/gi
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

  // NEW: Additional company valuation extraction from bullet points
  if (!metrics.companyValuation.totalValue) {
    console.log('Trying bullet point patterns for company valuation...');
    const bulletPatterns = [
      /•\s*total\s+company\s+value:?\s*\$?([\d,]+(?:\.\d+)?)/gi,
      /•\s*company\s+valuation:?\s*\$?([\d,]+(?:\.\d+)?)/gi,
      /•\s*total\s+value:?\s*\$?([\d,]+(?:\.\d+)?)/gi
    ];

    for (const pattern of bulletPatterns) {
      const match = originalText.match(pattern);
      if (match) {
        const numberMatch = match[0].match(/\$?([\d,]+(?:\.\d+)?)/);
        if (numberMatch) {
          const value = parseValueWithUnits(match[0]);
          if (value) {
            metrics.companyValuation.totalValue = value;
            metrics.enterpriseValue.currentValue = value;
            metrics.valueOfEquity.currentValue = value;
            console.log(`Found company valuation from bullet point: ${value}`);
            break;
          }
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

  // Revenue Patterns - more specific (only if not already found in tables)
  if (!metrics.keyFinancials.revenue) {
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
  }

  // EBITDA Patterns - more specific (only if not already found in tables)
  if (!metrics.keyFinancials.ebitda) {
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

  // Shares Outstanding Patterns - more specific (only if not already found in tables)
  if (!metrics.capitalStructure.totalShares) {
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
  }

  // ESOP Percentage Patterns - more specific (only if not already found in tables)
  if (!metrics.capitalStructure.esopPercentage) {
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