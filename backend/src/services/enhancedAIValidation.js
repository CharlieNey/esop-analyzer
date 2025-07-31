import { answerQuestion } from './openaiService.js';

// Enhanced AI validation service with improved accuracy and cross-validation
export class EnhancedAIValidation {
  
  constructor() {
    this.validationPrompts = {
      enterpriseValue: {
        primary: `Extract the total company or business value from this ESOP valuation document. This could be labeled as:

- "Enterprise Value"
- "Total Business Value" 
- "Company Valuation"
- "Fair Market Value" (of the business)
- "Business Enterprise Value"
- "Total Company Value"
- "Valuation Conclusion"

Look especially in:
- Executive Summary
- Valuation Summary/Conclusion
- Final valuation amounts
- Tables showing total values

Search for dollar amounts that represent the TOTAL value of the entire business. Often appears as the largest valuation figure in the document.

Respond with ONLY the numeric value (no $ signs, commas, or text). Examples: 50000000 or 12500000. If multiple values found, use the one labeled as "final" or "concluded" value. If not found, respond with "NOT_FOUND".`,

        secondary: `Look for the concluded business valuation or enterprise value. Check these sections:

1. Executive Summary (usually has the final valuation)
2. Valuation Conclusion section
3. Summary tables or charts
4. Any section titled "Fair Market Value" or "Business Value"

This is typically the largest dollar figure in the document representing the total worth of the business.

Ignore per-share values - look for TOTAL business value only.

Respond with ONLY the number. If not found, respond with "NOT_FOUND".`
      },

      valueOfEquity: {
        primary: `Extract the equity value or shareholder value from this ESOP valuation document. This could be labeled as:

- "Equity Value"
- "Fair Market Value of Equity"
- "Shareholder Value"
- "Value of Equity"
- "Total Equity Value"
- "Fair Market Value of Common Stock" (total, not per share)
- "Value Available to Shareholders"

Look especially in:
- Executive Summary
- Equity valuation sections
- Final conclusions about shareholder value
- Tables showing equity amounts

This represents the value belonging to shareholders after deducting debt. May be the same as enterprise value if there's no debt.

Search for dollar amounts specifically labeled as equity or shareholder value. Do NOT use per-share values.

Respond with ONLY the numeric value (no $ signs, commas, or text). Examples: 45000000 or 8750000. If not found, respond with "NOT_FOUND".`,

        secondary: `Look for the concluded equity or shareholder value. Check these sections:

1. Executive Summary (equity value conclusion)
2. Fair Market Value of Equity sections
3. Shareholder value analysis
4. Equity valuation summary

This is the value that belongs to the shareholders/owners after accounting for debt.

Look for TOTAL equity value, not per-share amounts.

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

  // Enhanced extraction with candidate collection and conflict resolution
  async extractMetricsWithValidation(documentText) {
    console.log('🤖 Starting enhanced AI validation with conflict resolution...');
    
    const candidates = {};
    const resolvedResults = {};

    // Step 1: Extract all metrics with multiple attempts to collect candidates
    console.log('📊 Step 1: Collecting candidate values for each metric...');
    for (const [metric, prompt] of Object.entries(this.validationPrompts)) {
      try {
        const candidateValues = await this.extractMetricCandidates(documentText, prompt, metric);
        candidates[metric] = candidateValues;
        console.log(`🎯 ${metric}: Found ${candidateValues.length} candidates`);
      } catch (error) {
        console.error(`❌ Error extracting candidates for ${metric}:`, error.message);
        candidates[metric] = [];
      }
    }

    // Step 2: Resolve conflicts between candidates
    console.log('🔍 Step 2: Resolving conflicts between candidate values...');
    const conflictResolution = await this.resolveValueConflicts(documentText, candidates);
    
    // Step 3: Cross-validate enterprise value and equity value
    console.log('🔄 Step 3: Cross-validating enterprise value and equity value...');
    const crossValidation = await this.crossValidateEnterpriseAndEquity(documentText, conflictResolution.resolvedResults);
    
    // Step 4: Validate financial relationships
    console.log('🧮 Step 4: Validating financial relationships...');
    const relationshipValidation = await this.validateFinancialRelationships(documentText, conflictResolution.resolvedResults);

    // Step 5: Apply final corrections based on validation
    console.log('✅ Step 5: Applying final corrections...');
    const finalResults = await this.applyCorrections(conflictResolution.resolvedResults, crossValidation, relationshipValidation);

    return {
      metrics: finalResults,
      validation: {
        conflictResolution,
        crossValidation,
        relationshipValidation
      },
      confidence: this.calculateConfidence(finalResults, crossValidation, relationshipValidation)
    };
  }

  // Extract a single metric with error handling and parsing
  async extractSingleMetric(documentText, prompt, metricName) {
    try {
      // For large documents, use intelligent chunking focused on key sections
      const optimizedContext = this.getOptimizedContext(documentText, metricName);
      const finalContext = optimizedContext || documentText;
      
      const response = await answerQuestion(prompt, finalContext);
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

  // Get optimized context for specific metrics to avoid truncation issues
  getOptimizedContext(documentText, metricName) {
    const maxContextTokens = 16000; // Conservative limit
    const estimatedTokens = Math.ceil(documentText.length / 4);
    
    if (estimatedTokens <= maxContextTokens) {
      return documentText; // Use full document if it fits
    }

    console.log(`🎯 Creating optimized context for ${metricName} (${estimatedTokens} → ~${maxContextTokens} tokens)`);
    
    // Define key sections for different metrics
    const keywordSets = {
      enterpriseValue: [
        'enterprise value', 'business value', 'total value', 'company valuation',
        'fair market value', 'valuation conclusion', 'executive summary',
        'valuation summary', 'total enterprise value', 'business enterprise value'
      ],
      valueOfEquity: [
        'equity value', 'fair market value of equity', 'shareholder value',
        'stockholder equity', 'value of equity', 'equity valuation',
        'valuation conclusion', 'executive summary', 'total equity value'
      ],
      revenue: [
        'revenue', 'sales', 'annual revenue', 'total revenue', 'gross revenue',
        'income statement', 'financial statements', 'financial data',
        'operating revenue', 'net sales'
      ],
      ebitda: [
        'ebitda', 'earnings before', 'operating income', 'adjusted ebitda',
        'income statement', 'financial statements', 'cash flow',
        'operating earnings', 'ebit'
      ],
      discountRate: [
        'discount rate', 'wacc', 'weighted average cost', 'required rate',
        'cost of capital', 'valuation methodology', 'assumptions',
        'discount factor', 'hurdle rate'
      ]
    };

    const keywords = keywordSets[metricName] || [];
    if (keywords.length === 0) {
      // Fallback: use first part of document
      return documentText.substring(0, maxContextTokens * 4);
    }

    // Find sections containing relevant keywords
    const sections = [];
    const paragraphs = documentText.split(/\n\s*\n/);
    
    for (const paragraph of paragraphs) {
      const lowerParagraph = paragraph.toLowerCase();
      const keywordMatches = keywords.filter(keyword => 
        lowerParagraph.includes(keyword.toLowerCase())
      ).length;
      
      if (keywordMatches > 0) {
        sections.push({
          text: paragraph,
          relevance: keywordMatches,
          length: paragraph.length
        });
      }
    }

    // Sort by relevance and build optimized context
    sections.sort((a, b) => b.relevance - a.relevance);
    
    let optimizedContext = '';
    let currentTokens = 0;
    const reserveTokens = 1000; // Reserve for headers and formatting
    
    for (const section of sections) {
      const sectionTokens = Math.ceil(section.length / 4);
      if (currentTokens + sectionTokens <= maxContextTokens - reserveTokens) {
        optimizedContext += section.text + '\n\n';
        currentTokens += sectionTokens;
      }
    }

    // If we still don't have enough content, add some general sections
    if (currentTokens < maxContextTokens / 2) {
      const generalSections = documentText.match(/(executive summary|summary|conclusion|valuation|financial data)[\s\S]{0,2000}/gi) || [];
      for (const section of generalSections) {
        const sectionTokens = Math.ceil(section.length / 4);
        if (currentTokens + sectionTokens <= maxContextTokens - reserveTokens) {
          optimizedContext += section + '\n\n';
          currentTokens += sectionTokens;
        }
      }
    }

    console.log(`✂️ Optimized context: ${Math.ceil(optimizedContext.length / 4)} tokens (${sections.length} relevant sections)`);
    return optimizedContext || documentText.substring(0, maxContextTokens * 4);
  }

  // Extract multiple candidate values for a single metric with date awareness
  async extractMetricCandidates(documentText, prompt, metricName) {
    const candidates = [];
    let filteredCandidates = null;
    
    try {
      // First, extract the valuation date for filtering
      const valuationDate = await this.extractValuationDate(documentText);
      console.log(`📅 Using valuation date for filtering: ${valuationDate || 'Not found'}`);
      
      // Primary extraction attempt with date awareness
      const primaryCandidate = await this.extractMetricWithDateContext(documentText, prompt.primary, metricName, valuationDate);
      if (primaryCandidate) {
        candidates.push({
          ...primaryCandidate,
          source: 'primary_prompt',
          method: 'primary'
        });
      }

      // Secondary extraction with secondary prompt if available
      if (prompt.secondary) {
        const secondaryCandidate = await this.extractMetricWithDateContext(documentText, prompt.secondary, metricName, valuationDate);
        if (secondaryCandidate && secondaryCandidate.value !== primaryCandidate?.value) {
          candidates.push({
            ...secondaryCandidate,
            source: 'secondary_prompt',
            method: 'secondary'
          });
        }
      }

      // Targeted search for specific patterns (e.g., tables, summaries)
      const targetedCandidate = await this.extractTargetedWithDateContext(documentText, metricName, valuationDate);
      if (targetedCandidate && !candidates.some(c => c.value === targetedCandidate.value)) {
        candidates.push({
          ...targetedCandidate,
          source: 'targeted_search',
          method: 'targeted'
        });
      }

      // Filter out candidates that are clearly historical or projected
      filteredCandidates = this.filterCandidatesByDate(candidates, valuationDate);
      
    } catch (error) {
      console.error(`Error collecting candidates for ${metricName}:`, error);
    }

    const validCandidates = filteredCandidates || candidates;
    console.log(`🔍 ${metricName} candidates: ${validCandidates.map(c => `${c.value} (${c.method}, date: ${c.dateRelevance || 'unknown'})`).join(', ')}`);
    return validCandidates;
  }

  // Extract a metric with explicit date context checking
  async extractMetricWithDateContext(documentText, prompt, metricName, valuationDate) {
    try {
      const dateAwarePrompt = `${prompt}

${valuationDate ? `CRITICAL: The valuation date is ${valuationDate}. ONLY extract values that are specifically for this date or "as of" this date. IGNORE:
- Historical values from previous years
- Projected/forecasted values for future years  
- Values clearly marked as "prior year" or "projected"

If you find a value, also mention what date context you found with it.` : ''}

Respond with ONLY the number if found, or "NOT_FOUND" if no value exists for the valuation date.`;

      const optimizedContext = this.getOptimizedContext(documentText, metricName);
      const response = await answerQuestion(dateAwarePrompt, optimizedContext);
      
      console.log(`📝 Date-aware response for ${metricName}: "${response}"`);
      
      const parsedValue = this.parseMetricResponse(response, metricName);
      if (parsedValue === null) {
        return null;
      }

      // Filter out obvious per-share values for equity metrics
      if ((metricName === 'valueOfEquity' || metricName === 'enterpriseValue') && parsedValue < 1000) {
        console.log(`⚠️ Filtered out likely per-share value for ${metricName}: ${parsedValue}`);
        return null;
      }

      // Assess date relevance from the response
      const dateRelevance = this.assessDateRelevance(response, valuationDate);
      
      return {
        value: parsedValue,
        confidence: dateRelevance === 'current' ? 0.9 : (dateRelevance === 'likely_current' ? 0.7 : 0.4),
        dateRelevance: dateRelevance,
        responseContext: response
      };
      
    } catch (error) {
      console.error(`Error extracting ${metricName} with date context:`, error);
      return null;
    }
  }

  // Targeted search with date awareness
  async extractTargetedWithDateContext(documentText, metricName, valuationDate) {
    const targetPrompts = {
      enterpriseValue: `Find the FINAL, CONCLUDED total business value ${valuationDate ? `as of ${valuationDate}` : 'for the valuation date'}. Look for:
      
1. Executive Summary - final valuation conclusion ${valuationDate ? `as of ${valuationDate}` : ''}
2. Valuation Summary/Conclusion section  
3. The definitive "Fair Market Value" ${valuationDate ? `as of ${valuationDate}` : ''}
4. Final concluded business value (not historical or projected)

${valuationDate ? `IMPORTANT: ONLY use values specifically labeled as "as of ${valuationDate}" or for the valuation date. Ignore historical data or projections.` : ''}

Respond with ONLY the number, no explanation.`,
      
      valueOfEquity: `Find the FINAL, CONCLUDED TOTAL equity value ${valuationDate ? `as of ${valuationDate}` : 'for the valuation date'}. Look for:
      
1. Executive Summary - total equity value conclusion ${valuationDate ? `as of ${valuationDate}` : ''}
2. "Fair Market Value of Equity" - TOTAL value ${valuationDate ? `as of ${valuationDate}` : ''}
3. Final concluded total equity value (not historical or projected)
4. Total value available to shareholders on the valuation date

${valuationDate ? `IMPORTANT: ONLY use values specifically for ${valuationDate}. Ignore values from prior years or projections.` : ''}

CRITICAL: Look for TOTAL equity value (typically millions of dollars, like 25000000). 
DO NOT use per-share values (typically small numbers like 3.04 or 125.50).
If you see a per-share value, look for the total equity value instead.

Respond with ONLY the total number (like 25000000), no explanation.`,
      
      revenue: `Find the company's annual revenue ${valuationDate ? `for the year closest to ${valuationDate}` : 'for the most recent complete year before valuation'}. Look in:
      
1. Financial statements
2. Income statement data for the relevant year
3. Revenue figures used in the valuation analysis

${valuationDate ? `Use revenue from the year that ends closest to ${valuationDate}. Do not use projected revenue.` : ''}

Respond with ONLY the number, no explanation.`,
      
      ebitda: `Find the company's EBITDA ${valuationDate ? `for the year closest to ${valuationDate}` : 'for the most recent complete year before valuation'}. Look for:
      
1. Financial statements for the relevant year
2. EBITDA used in the valuation analysis
3. Adjusted EBITDA for the base year

${valuationDate ? `Use EBITDA from the year that ends closest to ${valuationDate}. Do not use projected EBITDA.` : ''}

Respond with ONLY the number, no explanation.`,
      
      discountRate: `Find the discount rate used in this specific valuation ${valuationDate ? `as of ${valuationDate}` : ''}. Look in:
      
1. Valuation methodology section
2. Current assumptions ${valuationDate ? `as of ${valuationDate}` : ''}
3. Cost of capital analysis for this valuation

This should be the rate used for THIS valuation, not historical rates.

Respond with ONLY the percentage number, no explanation.`
    };

    const prompt = targetPrompts[metricName];
    if (!prompt) {
      return null;
    }

    try {
      const optimizedContext = this.getOptimizedContext(documentText, metricName);
      const response = await answerQuestion(prompt, optimizedContext);
      
      const parsedValue = this.parseMetricResponse(response, metricName);
      if (parsedValue === null) {
        return null;
      }

      // Filter out obvious per-share values for equity metrics
      if ((metricName === 'valueOfEquity' || metricName === 'enterpriseValue') && parsedValue < 1000) {
        console.log(`⚠️ Filtered out likely per-share value for ${metricName}: ${parsedValue}`);
        return null;
      }

      const dateRelevance = this.assessDateRelevance(response, valuationDate);
      
      return {
        value: parsedValue,
        confidence: dateRelevance === 'current' ? 0.95 : (dateRelevance === 'likely_current' ? 0.8 : 0.5),
        dateRelevance: dateRelevance,
        responseContext: response
      };
      
    } catch (error) {
      console.log(`Targeted search with date context failed for ${metricName}: ${error.message}`);
      return null;
    }
  }

  // Targeted search for specific metrics in common document sections
  async extractWithTargetedSearch(documentText, metricName) {
    const targetPrompts = {
      enterpriseValue: `Find the FINAL, CONCLUDED total business value in this document. Look for:
      
1. Executive Summary - final valuation conclusion
2. Valuation Summary/Conclusion section  
3. The largest dollar figure representing total company worth
4. Sections titled "Fair Market Value" or "Business Valuation"
5. Summary tables with total values

This should be the definitive answer to "What is this company worth in total?"

Respond with ONLY the number (like 50000000), no explanation.`,
      
      valueOfEquity: `Find the FINAL, CONCLUDED TOTAL equity or shareholder value in this document. Look for:
      
1. Executive Summary - TOTAL equity value conclusion
2. "Fair Market Value of Equity" sections - TOTAL value
3. Total shareholder value (NOT per-share)
4. Total value available to owners/shareholders
5. Equity valuation summary - TOTAL amount

This should be the definitive answer to "What is the equity worth in TOTAL?"

CRITICAL: Look for TOTAL equity value (millions of dollars, like 22000000 or 45000000). 
IGNORE per-share values (small numbers like 3.04, 125.50, etc).
If you only see per-share values, respond with "NOT_FOUND".

Respond with ONLY the total number (like 22000000), no explanation.`,
      
      revenue: `Find the company's most recent annual revenue/sales figure. Look in:
      
1. Financial statements or summaries
2. Income statement data
3. "Revenue" or "Sales" line items
4. Financial highlights section

Use the most recent full year's data.

Respond with ONLY the number, no explanation.`,
      
      ebitda: `Find the company's EBITDA (Earnings Before Interest, Taxes, Depreciation, Amortization). Look for:
      
1. Financial statements
2. "EBITDA" specifically mentioned
3. "Adjusted EBITDA" 
4. Operating income before depreciation

Use the most recent year's figure.

Respond with ONLY the number, no explanation.`,
      
      discountRate: `Find the discount rate used in the valuation. Look in:
      
1. Valuation methodology section
2. Assumptions
3. "Discount Rate", "WACC", or "Required Rate of Return"
4. Cost of capital discussion

This is usually expressed as a percentage.

Respond with ONLY the percentage number (like 12.5), no explanation.`
    };

    if (!targetPrompts[metricName]) {
      return null;
    }

    try {
      const response = await answerQuestion(targetPrompts[metricName], documentText);
      return this.parseMetricResponse(response, metricName);
    } catch (error) {
      console.log(`Targeted search failed for ${metricName}: ${error.message}`);
      return null;
    }
  }

  // Assess date relevance of an AI response
  assessDateRelevance(response, valuationDate) {
    if (!valuationDate) {
      return 'unknown';
    }

    const lowerResponse = response.toLowerCase();
    const dateFormatted = valuationDate.toLowerCase();
    
    // Strong indicators of current valuation date
    if (lowerResponse.includes(`as of ${dateFormatted}`) ||
        lowerResponse.includes(`${dateFormatted}`) ||
        lowerResponse.includes('valuation date') ||
        lowerResponse.includes('current value') ||
        lowerResponse.includes('concluded value')) {
      return 'current';
    }
    
    // Indicators of likely current (but not explicitly stated)
    if (lowerResponse.includes('fair market value') ||
        lowerResponse.includes('final') ||
        lowerResponse.includes('concluded') ||
        lowerResponse.includes('executive summary')) {
      return 'likely_current';
    }
    
    // Strong indicators of historical/projected data
    if (lowerResponse.includes('prior year') ||
        lowerResponse.includes('previous year') ||
        lowerResponse.includes('historical') ||
        lowerResponse.includes('projected') ||
        lowerResponse.includes('forecast') ||
        lowerResponse.includes('estimated') ||
        lowerResponse.match(/\b(20\d{2})\b/) && !lowerResponse.includes(valuationDate)) {
      return 'historical_or_projected';
    }
    
    return 'likely_current'; // Default assumption if no clear indicators
  }

  // Filter candidates based on date relevance
  filterCandidatesByDate(candidates, valuationDate) {
    if (!valuationDate || candidates.length === 0) {
      return candidates;
    }

    console.log(`🗓️ Filtering ${candidates.length} candidates by date relevance to ${valuationDate}`);
    
    // First, try to keep only current and likely_current candidates
    const relevantCandidates = candidates.filter(candidate => 
      candidate.dateRelevance === 'current' || candidate.dateRelevance === 'likely_current'
    );
    
    if (relevantCandidates.length > 0) {
      console.log(`✅ Kept ${relevantCandidates.length} date-relevant candidates, filtered out ${candidates.length - relevantCandidates.length}`);
      return relevantCandidates;
    }
    
    // If no clearly relevant candidates, keep all but mark the issue
    console.log(`⚠️ No clearly date-relevant candidates found, keeping all with reduced confidence`);
    return candidates.map(candidate => ({
      ...candidate,
      confidence: candidate.confidence * 0.5, // Reduce confidence for date uncertainty
      dateWarning: 'Date relevance unclear'
    }));
  }

  // Resolve conflicts between candidate values using AI judgment
  async resolveValueConflicts(documentText, candidates) {
    const resolvedResults = {};
    const resolutionDetails = {};

    for (const [metric, candidateList] of Object.entries(candidates)) {
      if (candidateList.length === 0) {
        resolvedResults[metric] = null;
        resolutionDetails[metric] = { status: 'no_candidates', reason: 'No values found' };
      } else if (candidateList.length === 1) {
        resolvedResults[metric] = candidateList[0].value;
        resolutionDetails[metric] = { 
          status: 'single_candidate', 
          chosen: candidateList[0],
          reason: 'Only one candidate found'
        };
      } else {
        // Multiple candidates - need AI to choose
        console.log(`🤔 Resolving conflict for ${metric}: ${candidateList.length} candidates`);
        const resolution = await this.resolveConflictWithAI(documentText, metric, candidateList);
        resolvedResults[metric] = resolution.chosenValue;
        resolutionDetails[metric] = {
          status: 'conflict_resolved',
          candidates: candidateList,
          chosen: resolution.chosen,
          reason: resolution.reason,
          confidence: resolution.confidence
        };
      }
    }

    return {
      resolvedResults,
      resolutionDetails
    };
  }

  // Use AI to choose between conflicting candidate values
  async resolveConflictWithAI(documentText, metricName, candidates) {
    const conflictPrompt = `I found multiple potential values for ${metricName} in this ESOP valuation document:

${candidates.map((candidate, index) => 
  `Option ${index + 1}: ${candidate.value} (found via ${candidate.method}, confidence: ${candidate.confidence}, date relevance: ${candidate.dateRelevance || 'unknown'})`
).join('\n')}

Please analyze the document context and choose the MOST RELIABLE value. Consider:
1. Date relevance: Strongly prefer values that are specifically for the valuation date (avoid historical or projected values)
2. Authoritative sections: Executive summary, valuation conclusion sections are most reliable
3. Context and supporting information around the value
4. Consistency with the document's overall valuation narrative
5. Values marked as "final", "concluded", or "as of [valuation date]"

CRITICAL: If any candidate has dateRelevance of "historical_or_projected", only choose it if no other options exist.

Respond in this exact format:
CHOSEN_VALUE: [the number you selected]
OPTION_NUMBER: [1, 2, 3, etc.]
CONFIDENCE: [High/Medium/Low]
REASON: [brief explanation focusing on date relevance and reliability]

If none of the values seem reliable for the valuation date, respond with:
CHOSEN_VALUE: NONE
REASON: [explanation]`;

    try {
      const response = await answerQuestion(conflictPrompt, documentText);
      console.log(`🎯 Conflict resolution response for ${metricName}: ${response}`);
      
      const resolution = this.parseConflictResolution(response, candidates);
      return resolution;

    } catch (error) {
      console.error(`Error resolving conflict for ${metricName}:`, error);
      // Fallback: choose the candidate with highest confidence
      const bestCandidate = candidates.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      );
      
      return {
        chosenValue: bestCandidate.value,
        chosen: bestCandidate,
        reason: 'Fallback: chose highest confidence candidate due to AI resolution error',
        confidence: 'Low'
      };
    }
  }

  // Parse AI conflict resolution response
  parseConflictResolution(response, candidates) {
    const lines = response.split('\n');
    let chosenValue = null;
    let optionNumber = null;
    let confidence = 'Medium';
    let reason = 'AI selection';

    for (const line of lines) {
      if (line.startsWith('CHOSEN_VALUE:')) {
        const valueStr = line.replace('CHOSEN_VALUE:', '').trim();
        if (valueStr === 'NONE') {
          return {
            chosenValue: null,
            chosen: null,
            reason: reason,
            confidence: 'Low'
          };
        }
        chosenValue = parseFloat(valueStr.replace(/[,$]/g, ''));
      } else if (line.startsWith('OPTION_NUMBER:')) {
        optionNumber = parseInt(line.replace('OPTION_NUMBER:', '').trim());
      } else if (line.startsWith('CONFIDENCE:')) {
        confidence = line.replace('CONFIDENCE:', '').trim();
      } else if (line.startsWith('REASON:')) {
        reason = line.replace('REASON:', '').trim();
      }
    }

    // Find the chosen candidate
    let chosenCandidate = null;
    if (optionNumber && optionNumber >= 1 && optionNumber <= candidates.length) {
      chosenCandidate = candidates[optionNumber - 1];
      chosenValue = chosenCandidate.value; // Use the exact value from the candidate
    } else {
      // Find candidate with closest value
      chosenCandidate = candidates.find(c => Math.abs(c.value - chosenValue) < 0.01) || candidates[0];
      chosenValue = chosenCandidate.value;
    }

    return {
      chosenValue,
      chosen: chosenCandidate,
      reason,
      confidence
    };
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

  // Cross-validate enterprise value and equity value with date awareness
  async crossValidateEnterpriseAndEquity(documentText, currentResults) {
    const validation = {
      enterpriseValue: { original: currentResults.enterpriseValue, corrected: null, reason: null },
      valueOfEquity: { original: currentResults.valueOfEquity, corrected: null, reason: null },
      debtValue: { original: currentResults.debtValue, corrected: null, reason: null },
      temporalConsistency: { issues: [], corrections: [] }
    };

    // First, extract the valuation date from the document
    const valuationDate = await this.extractValuationDate(documentText);
    console.log(`📅 Valuation date identified: ${valuationDate || 'Not found'}`);

    // Check for temporal conflicts in extracted values
    const temporalValidation = await this.validateTemporalConsistency(documentText, currentResults, valuationDate);
    validation.temporalConsistency = temporalValidation;

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
        
        // Use improved conflict resolution approach instead of re-extraction
        try {
          console.log('🔍 Cross-validation failed, collecting alternative candidates...');
          
          // Collect alternative candidates for both enterprise and equity values
          const enterpriseCandidates = await this.extractMetricCandidates(
            documentText, 
            this.validationPrompts.enterpriseValue, 
            'enterpriseValue'
          );
          
          const equityCandidates = await this.extractMetricCandidates(
            documentText, 
            this.validationPrompts.valueOfEquity, 
            'valueOfEquity'
          );
          
          // Add the current problematic values as low-confidence candidates
          if (currentResults.enterpriseValue) {
            enterpriseCandidates.push({
              value: currentResults.enterpriseValue,
              source: 'original_extraction',
              confidence: 0.3,
              method: 'original'
            });
          }
          
          if (currentResults.valueOfEquity) {
            equityCandidates.push({
              value: currentResults.valueOfEquity,
              source: 'original_extraction',
              confidence: 0.3,
              method: 'original'
            });
          }
          
          // Use AI to resolve the conflict considering the mathematical relationship
          const conflictPrompt = `I found a mathematical inconsistency in the ESOP valuation values:

Current values create negative debt: Enterprise Value (${currentResults.enterpriseValue}) - Equity Value (${currentResults.valueOfEquity}) = ${calculatedDebt}

I found these alternative candidates:

ENTERPRISE VALUE options:
${enterpriseCandidates.map((c, i) => `${i + 1}. ${c.value} (from ${c.method}, confidence: ${c.confidence})`).join('\n')}

EQUITY VALUE options:
${equityCandidates.map((c, i) => `${i + 1}. ${c.value} (from ${c.method}, confidence: ${c.confidence})`).join('\n')}

Please choose the BEST COMBINATION that:
1. Makes mathematical sense (Enterprise Value ≥ Equity Value)
2. Has strong document support
3. Is from authoritative sections
${valuationDate ? `4. Is closest to the valuation date ${valuationDate}` : ''}

Respond with:
ENTERPRISE_OPTION: [option number]
EQUITY_OPTION: [option number]
CONFIDENCE: [High/Medium/Low]
REASON: [why this combination is most reliable]`;

          const resolutionResponse = await answerQuestion(conflictPrompt, documentText);
          const resolution = this.parseConflictResolutionPair(resolutionResponse, enterpriseCandidates, equityCandidates);
          
          if (resolution.enterpriseValue && resolution.equityValue) {
            validation.enterpriseValue.corrected = resolution.enterpriseValue;
            validation.valueOfEquity.corrected = resolution.equityValue;
            validation.debtValue.corrected = resolution.enterpriseValue - resolution.equityValue;
            validation.enterpriseValue.reason = `Cross-validation conflict resolved via AI selection: ${resolution.reason}`;
            validation.valueOfEquity.reason = `Cross-validation conflict resolved via AI selection: ${resolution.reason}`;
            console.log(`✅ Cross-validation resolved: Enterprise=${resolution.enterpriseValue}, Equity=${resolution.equityValue}`);
          }
          
        } catch (error) {
          console.error('Error in cross-validation conflict resolution:', error);
        }
      }
    }

    return validation;
  }

  // Extract valuation date from document
  async extractValuationDate(documentText) {
    try {
      const datePrompt = `Extract the valuation date from this ESOP valuation document.

Look for terms like:
- "Valuation Date"
- "As of [date]"
- "Effective Date"
- "Report Date"
- "Date of Valuation"

The valuation date is typically mentioned in the executive summary, title page, or valuation conclusion.

Respond with ONLY the date in MM/DD/YYYY format. If multiple dates are found, use the primary valuation date.
If no clear valuation date is found, respond with "NOT_FOUND".`;

      const response = await answerQuestion(datePrompt, documentText);
      const dateMatch = response.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
      
      if (dateMatch) {
        return dateMatch[1];
      }
      
      // Try alternative date formats
      const altDateMatch = response.match(/(\d{1,2}-\d{1,2}-\d{4}|\d{4}-\d{1,2}-\d{1,2})/);
      if (altDateMatch) {
        // Convert to MM/DD/YYYY format
        const dateParts = altDateMatch[1].split('-');
        if (dateParts[0].length === 4) {
          // YYYY-MM-DD format
          return `${dateParts[1]}/${dateParts[2]}/${dateParts[0]}`;
        } else {
          // MM-DD-YYYY format
          return `${dateParts[0]}/${dateParts[1]}/${dateParts[2]}`;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting valuation date:', error);
      return null;
    }
  }

  // Validate temporal consistency of extracted metrics
  async validateTemporalConsistency(documentText, currentResults, valuationDate) {
    const validation = {
      issues: [],
      corrections: [],
      dateProximityScores: {}
    };

    if (!valuationDate) {
      validation.issues.push('No valuation date found - cannot validate temporal consistency');
      return validation;
    }

    // Check each metric for date context
    const metricsToCheck = ['enterpriseValue', 'valueOfEquity', 'revenue', 'ebitda'];
    
    for (const metric of metricsToCheck) {
      if (currentResults[metric] !== null && currentResults[metric] !== undefined) {
        try {
          const dateContextPrompt = `In this ESOP valuation document, find the date context for the ${metric} value of ${currentResults[metric]}.

The valuation date is ${valuationDate}. 

Look for:
- What date is this ${metric} value "as of"?
- Is this value from the valuation date, a historical period, or projected?
- Any temporal qualifiers near this value (e.g., "as of", "for the year ended", "projected")

Respond with:
DATE_CONTEXT: [the specific date or period this value represents]
TEMPORAL_RELATIONSHIP: [Same period/Historical/Projected relative to valuation date]
CONFIDENCE: [High/Medium/Low]

If no clear date context is found, respond with "NO_DATE_CONTEXT".`;

          const response = await answerQuestion(dateContextPrompt, documentText);
          const dateContext = this.parseDateContext(response);
          
          if (dateContext.dateContext && dateContext.dateContext !== 'NO_DATE_CONTEXT') {
            const proximityScore = this.calculateDateProximity(valuationDate, dateContext.dateContext);
            validation.dateProximityScores[metric] = {
              ...dateContext,
              proximityScore
            };
            
            // Flag potential issues
            if (dateContext.temporalRelationship === 'Historical' && proximityScore < 0.5) {
              validation.issues.push(`${metric} appears to be from a significantly earlier period than valuation date`);
            }
          }
        } catch (error) {
          console.error(`Error checking date context for ${metric}:`, error);
        }
      }
    }

    return validation;
  }

  // Parse date context response
  parseDateContext(response) {
    const result = {
      dateContext: null,
      temporalRelationship: null,
      confidence: null
    };
    
    const lines = response.split('\n');
    for (const line of lines) {
      if (line.startsWith('DATE_CONTEXT:')) {
        result.dateContext = line.replace('DATE_CONTEXT:', '').trim();
      } else if (line.startsWith('TEMPORAL_RELATIONSHIP:')) {
        result.temporalRelationship = line.replace('TEMPORAL_RELATIONSHIP:', '').trim();
      } else if (line.startsWith('CONFIDENCE:')) {
        result.confidence = line.replace('CONFIDENCE:', '').trim();
      }
    }
    
    return result;
  }

  // Calculate date proximity score (1.0 = same date, 0.0 = very different)
  calculateDateProximity(valuationDate, contextDate) {
    try {
      const valDate = new Date(valuationDate);
      const ctxDate = new Date(contextDate);
      
      if (isNaN(valDate.getTime()) || isNaN(ctxDate.getTime())) {
        return 0.5; // Default score if dates can't be parsed
      }
      
      const diffInDays = Math.abs((valDate - ctxDate) / (1000 * 60 * 60 * 24));
      
      if (diffInDays === 0) return 1.0;
      if (diffInDays <= 30) return 0.9;
      if (diffInDays <= 90) return 0.7;
      if (diffInDays <= 365) return 0.5;
      return 0.2;
    } catch (error) {
      return 0.5;
    }
  }

  // Parse AI conflict resolution for paired values (enterprise + equity)
  parseConflictResolutionPair(response, enterpriseCandidates, equityCandidates) {
    const lines = response.split('\n');
    let enterpriseOption = null;
    let equityOption = null;
    let confidence = 'Medium';
    let reason = 'AI pair selection';

    for (const line of lines) {
      if (line.startsWith('ENTERPRISE_OPTION:')) {
        enterpriseOption = parseInt(line.replace('ENTERPRISE_OPTION:', '').trim());
      } else if (line.startsWith('EQUITY_OPTION:')) {
        equityOption = parseInt(line.replace('EQUITY_OPTION:', '').trim());
      } else if (line.startsWith('CONFIDENCE:')) {
        confidence = line.replace('CONFIDENCE:', '').trim();
      } else if (line.startsWith('REASON:')) {
        reason = line.replace('REASON:', '').trim();
      }
    }

    // Validate and get the selected values
    let enterpriseValue = null;
    let equityValue = null;

    if (enterpriseOption && enterpriseOption >= 1 && enterpriseOption <= enterpriseCandidates.length) {
      enterpriseValue = enterpriseCandidates[enterpriseOption - 1].value;
    }

    if (equityOption && equityOption >= 1 && equityOption <= equityCandidates.length) {
      equityValue = equityCandidates[equityOption - 1].value;
    }

    return {
      enterpriseValue,
      equityValue,
      reason,
      confidence
    };
  }

  // Parse date-aware correction response
  parseDateAwareCorrectionResponse(response) {
    const result = {};
    const lines = response.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('ENTERPRISE_VALUE:')) {
        result.enterpriseValue = this.parseMetricResponse(line.replace('ENTERPRISE_VALUE:', '').trim(), 'enterpriseValue');
      } else if (line.startsWith('EQUITY_VALUE:')) {
        result.valueOfEquity = this.parseMetricResponse(line.replace('EQUITY_VALUE:', '').trim(), 'valueOfEquity');
      } else if (line.startsWith('DEBT_VALUE:')) {
        result.debtValue = this.parseMetricResponse(line.replace('DEBT_VALUE:', '').trim(), 'debtValue');
      } else if (line.startsWith('DATE_CONTEXT:')) {
        result.dateContext = line.replace('DATE_CONTEXT:', '').trim();
      }
    }
    
    return result;
  }

  // Parse correction response (legacy method for backward compatibility)
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

  // Calculate confidence score with temporal consistency factors
  calculateConfidence(results, crossValidation, relationshipValidation) {
    let confidence = 0;
    let totalChecks = 0;

    // Check how many metrics we successfully extracted
    const extractedMetrics = Object.values(results).filter(v => v !== null).length;
    const totalMetrics = Object.keys(results).length;
    confidence += (extractedMetrics / totalMetrics) * 0.3; // 30% weight
    totalChecks++;

    // Check cross-validation success
    const crossValidationSuccess = Object.values(crossValidation).every(v => 
      v.corrected === null || (v.corrected !== null && v.reason !== null)
    );
    if (crossValidationSuccess) {
      confidence += 0.25; // 25% weight
    }
    totalChecks++;

    // Check relationship validation
    if (relationshipValidation.issues.length === 0) {
      confidence += 0.25; // 25% weight
    }
    totalChecks++;

    // Check temporal consistency (new factor)
    if (crossValidation.temporalConsistency) {
      const temporalIssues = crossValidation.temporalConsistency.issues.length;
      const dateProximityScores = Object.values(crossValidation.temporalConsistency.dateProximityScores);
      
      if (temporalIssues === 0 && dateProximityScores.length > 0) {
        const avgProximityScore = dateProximityScores.reduce((sum, score) => sum + score.proximityScore, 0) / dateProximityScores.length;
        confidence += avgProximityScore * 0.2; // 20% weight based on date proximity
      } else if (temporalIssues === 0) {
        confidence += 0.15; // 15% weight if no temporal issues but no date context found
      }
      // No points added if there are temporal issues
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