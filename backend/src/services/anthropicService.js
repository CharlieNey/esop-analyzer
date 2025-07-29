import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const answerQuestionWithClaude = async (question, context) => {
  try {
    const systemPrompt = `You are an expert financial analyst specializing in ESOP (Employee Stock Ownership Plan) valuation reports. 

VISUAL CONTENT HANDLING:
- When you see "TABLE X:" interpret and analyze the tabular data thoroughly
- When you see "CHART X:" describe the visualization and extract key insights
- When you see "IMAGE X:" reference any relevant visual information
- Always reference both text content AND visual elements in your analysis
- For financial data, prioritize table values and chart data over narrative text
- When citing tables or charts, mention both the element type AND page number

CRITICAL CITATION REQUIREMENTS:
- You MUST explicitly mention page numbers in your answer (e.g., "According to Page 2..." or "Table 1 on Page 2 shows...")
- Every factual claim MUST reference the specific page where that information appears
- Use the exact page numbers shown in the document content below (PAGE 1, PAGE 2, etc.)
- When referencing visual elements, specify the element type (e.g., "Table 1 on Page 2", "Chart 2 on Page 3")
- If information spans multiple pages, mention all relevant page numbers

IMPORTANT: You MUST answer based ONLY on the document content provided below. If the information is not in the provided content, say "I cannot find that specific information in the provided document content" rather than making assumptions.

When answering:
1. Start each key point with a page reference (e.g., "Table 1 on Page 3 indicates that...")
2. Use ONLY the information from the provided document pages and visual elements
3. Be specific and cite page numbers AND element types for EVERY piece of information
4. If asked about something not in the content, clearly state it's not available
5. For financial figures, be precise with numbers, currency, AND source (table/chart/page)
6. Explain complex financial concepts in clear terms with page and element citations
7. When analyzing tables, reference specific rows/columns if helpful
8. When describing charts, mention the chart type and key data points

REMEMBER: Your answer must explicitly reference the page numbers AND visual elements that appear in the document content above. The user will see these same references in the citations, so they must match your analysis.`;

    const response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: `${systemPrompt}\n\nDocument Content:\n${context}\n\nQuestion: ${question}`
        }
      ]
    });
    
    return response.content[0].text;
    
  } catch (error) {
    console.error('Claude question answering error:', error);
    throw new Error(`Failed to answer question with Claude: ${error.message}`);
  }
};

export const extractMetricsWithClaude = async (documentText) => {
  try {
    const systemPrompt = `You are an expert financial analyst. Extract ALL available ESOP valuation metrics from this document section. Be thorough and look for various ways these metrics might be expressed.

    CRITICAL TABLE DATA EXTRACTION:
    - Pay special attention to ANY tabular data, financial tables, or structured data
    - Look for tables with headers like "Financial Metrics", "Capital Structure", "Ownership Category"
    - Extract data from multi-column tables (e.g., years 2023, 2022, 2021)
    - For multi-year data, use the MOST RECENT year (typically the leftmost column)
    - Parse table rows that contain: Revenue, EBITDA, Total Shares, ESOP Percentage
    - Look for ownership tables showing ESOP shares and percentages
    - Extract exact numeric values from table cells, ignoring formatting

    IMPORTANT: Look for these terms and their variations:
    - Company Value/Valuation: "total value", "enterprise value", "company valuation", "fair market value", "firm value"
    - Per Share Value: "per share", "share value", "price per share", "fair market value per share"
    - Revenue: "annual revenue", "total revenue", "sales", "gross revenue"
    - EBITDA: "earnings before", "operating income", "adjusted EBITDA"
    - Discount Rate: "discount rate", "required rate", "cost of capital", "WACC", "weighted average"
    - Shares: "outstanding shares", "total shares", "shares issued", "common shares"
    - ESOP: "employee stock", "ESOP percentage", "employee ownership"
    - Valuation Date: "valuation date", "as of", "effective date", "date of valuation"

    TABLE PARSING PRIORITY:
    1. First, look for structured tables with clear headers and data
    2. Extract the most recent (leftmost) values from multi-year tables
    3. Parse ownership tables for ESOP percentages and share counts
    4. Look for financial metrics tables with revenue and EBITDA data
    5. Fall back to narrative text patterns if tables are not found

    CRITICAL: You MUST respond with ONLY valid JSON. No explanations, no text before or after the JSON.

    Return a JSON object with this exact structure:
    {
      "enterpriseValue": {
        "currentValue": numeric_value_or_null,
        "previousValue": numeric_value_or_null,
        "currency": "USD"
      },
      "valueOfEquity": {
        "currentValue": numeric_value_or_null,
        "previousValue": numeric_value_or_null,
        "currency": "USD"
      },
      "valuationPerShare": {
        "currentValue": numeric_value_or_null,
        "previousValue": numeric_value_or_null,
        "currency": "USD"
      },
      "keyFinancials": {
        "revenue": numeric_value_or_null,
        "ebitda": numeric_value_or_null,
        "weightedAverageCostOfCapital": numeric_value_or_null
      },
      "companyValuation": {
        "totalValue": numeric_value_or_null,
        "perShareValue": numeric_value_or_null,
        "currency": "USD"
      },
      "discountRates": {
        "discountRate": numeric_value_or_null,
        "riskFreeRate": numeric_value_or_null,
        "marketRiskPremium": numeric_value_or_null
      },
      "capitalStructure": {
        "totalShares": numeric_value_or_null,
        "esopShares": numeric_value_or_null,
        "esopPercentage": numeric_value_or_null
      },
      "valuationMultiples": {
        "revenueMultiple": numeric_value_or_null,
        "ebitdaMultiple": numeric_value_or_null
      },
      "valuationDate": {
        "date": "YYYY-MM-DD or null",
        "description": "text description of the valuation date"
      }
    }

    CRITICAL RULES:
    1. Extract EXACT numeric values only (no $ signs, % symbols, or commas)
    2. If enterprise value not found, use company/total valuation
    3. If value of equity not found, use company valuation minus debt (or same as company value if no debt mentioned)
    4. If WACC not found, use discount rate
    5. Look carefully for ALL financial numbers in this section, ESPECIALLY in tables
    6. Use null only if truly not available after thorough search
    7. For valuation date: Look for "Valuation Date:", "as of", "effective date", etc. Convert to YYYY-MM-DD format if possible
    8. For table data: Use the most recent year's data when multiple years are shown
    9. RESPOND WITH ONLY THE JSON OBJECT - NO OTHER TEXT
    
    Be aggressive in finding values - look in tables, summaries, conclusions, and anywhere numbers appear. Prioritize table data over narrative text when both are available.`;

    const response = await anthropic.messages.create({
      //model: 'claude-3-5-sonnet-20241022',
      model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `${systemPrompt}\n\nDocument content:\n${documentText}`
        }
      ]
    });
    
    const responseText = response.content[0].text.trim();
    
    // Parse JSON response with error handling
    try {
      return JSON.parse(responseText);
    } catch (parseError) {
      console.log('⚠️ Claude JSON parsing failed, attempting to extract JSON...');
      
      // Try to find JSON object in the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (jsonError) {
          console.log('⚠️ JSON extraction failed:', jsonError.message);
        }
      }
      
      // Return null result if no valid JSON found
      return {
        enterpriseValue: { currentValue: null, previousValue: null, currency: "USD" },
        valueOfEquity: { currentValue: null, previousValue: null, currency: "USD" },
        valuationPerShare: { currentValue: null, previousValue: null, currency: "USD" },
        keyFinancials: { revenue: null, ebitda: null, weightedAverageCostOfCapital: null },
        companyValuation: { totalValue: null, perShareValue: null, currency: "USD" },
        discountRates: { discountRate: null, riskFreeRate: null, marketRiskPremium: null },
        capitalStructure: { totalShares: null, esopShares: null, esopPercentage: null },
        valuationMultiples: { revenueMultiple: null, ebitdaMultiple: null },
        valuationDate: { date: null, description: null }
      };
    }
    
  } catch (error) {
    console.error('Claude metrics extraction error:', error);
    throw new Error(`Failed to extract metrics with Claude: ${error.message}`);
  }
}; 