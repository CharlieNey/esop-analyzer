// Mock OpenAI service for testing without API key

export const createEmbedding = async (text) => {
  // Return mock embedding vector
  return Array(1536).fill(0).map(() => Math.random() - 0.5);
};

export const answerQuestion = async (question, context) => {
  // Mock intelligent responses based on question content
  const lowerQuestion = question.toLowerCase();
  
  if (lowerQuestion.includes('valuation') || lowerQuestion.includes('value')) {
    return `Based on the ESOP valuation report, the company has a fair market value per share with total company valuation details available in the document.

**Key Valuation Details provided in context:**
${context.substring(0, 300)}...

*Source: Executive Summary and Valuation Methodology sections*`;
  }
  
  if (lowerQuestion.includes('discount') || lowerQuestion.includes('rate')) {
    return `The discount rate information is available in the valuation methodology section.

**Context shows:**
${context.substring(0, 300)}...

*Source: Valuation Methodology - DCF Analysis section*`;
  }
  
  if (lowerQuestion.includes('esop') || lowerQuestion.includes('shares') || lowerQuestion.includes('ownership')) {
    return `The ESOP ownership details are outlined in the capital structure section.

**ESOP Information from document:**
${context.substring(0, 300)}...

*Source: Capital Structure section*`;
  }
  
  // Default response
  return `Based on the ESOP valuation document, here's the relevant information:

**Document Context:**
${context.substring(0, 400)}...

Please ask a more specific question about company valuation, discount rates, ESOP ownership, or financial metrics.`;
};

export const extractMetrics = async (documentText) => {
  // Return mock extracted metrics - will be overridden in PDF service
  return {
    companyValuation: {
      totalValue: "50000000",
      perShareValue: "125.00", 
      currency: "USD"
    },
    discountRates: {
      discountRate: "12.5",
      riskFreeRate: "4.5",
      marketRiskPremium: "6.5"
    },
    keyFinancials: {
      revenue: "28500000",
      ebitda: "8550000", 
      netIncome: "5700000"
    },
    capitalStructure: {
      totalShares: "400000",
      esopShares: "120000",
      esopPercentage: "30.0"
    },
    valuationMultiples: {
      revenueMultiple: "1.75",
      ebitdaMultiple: "5.85"
    }
  };
};