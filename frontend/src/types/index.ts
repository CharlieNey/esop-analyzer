export interface Document {
  id: string;
  filename: string;
  upload_date: string;
  processed_at: string;
}

export interface CitationKeyMetric {
  type: string;
  values: string[];
}

export interface Citation {
  chunkIndex: number;
  distance: number;
  preview: string;
  // Enhanced citation properties
  section?: string;
  pageNumber?: number;
  relevance?: number;
  keyMetrics?: CitationKeyMetric[];
  fullText?: string;
  highlightedText?: string;
  documentSection?: string;
  confidence?: number;
}

export interface QuestionResponse {
  question: string;
  answer: string;
  citations: Citation[];
  documentId: string;
}

export interface MetricData {
  data: any;
  confidence: number;
  extractedAt: string;
}

export interface DocumentMetrics {
  documentId: string;
  filename: string;
  uploadDate: string;
  valuationDate?: string;
  metrics: {
    enterpriseValue?: MetricData;
    valueOfEquity?: MetricData;
    valuationPerShare?: MetricData;
    companyValuation?: MetricData;
    discountRates?: MetricData;
    keyFinancials?: MetricData;
    capitalStructure?: MetricData;
    valuationMultiples?: MetricData;
    valuationDate?: MetricData;
  };
}

export interface CompanyValuation {
  totalValue: string;
  perShareValue: string;
  currency: string;
}

export interface DiscountRates {
  discountRate: string;
  riskFreeRate: string;
  marketRiskPremium: string;
}

export interface KeyFinancials {
  revenue: string;
  ebitda: string;
  netIncome: string;
}

export interface CapitalStructure {
  totalShares: string;
  esopShares: string;
  esopPercentage: string;
}

export interface ValuationMultiples {
  revenueMultiple: string;
  ebitdaMultiple: string;
}