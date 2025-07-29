import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { validateMetrics } from '../services/api';

interface MetricsValidationProps {
  documentId: string;
  metrics: {
    enterpriseValue?: number | null;
    valueOfEquity?: number | null;
    valuationPerShare?: number | null;
    revenue?: number | null;
    ebitda?: number | null;
    discountRate?: number | null;
  };
}

interface ValidationResult {
  currentValue: number;
  aiValidation: string;
  query: string;
  error?: string;
}

interface ValidationResponse {
  validationResults: Record<string, ValidationResult>;
  timestamp: string;
}

const MetricsValidation: React.FC<MetricsValidationProps> = ({ documentId, metrics }) => {
  const [validationResults, setValidationResults] = useState<ValidationResponse | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleValidate = async () => {
    setIsValidating(true);
    setError(null);
    setValidationResults(null);
    
    try {
      const response = await validateMetrics(documentId, metrics);
      setValidationResults(response);
      setIsVisible(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Validation failed');
    } finally {
      setIsValidating(false);
    }
  };

  const parseValidationResponse = (aiResponse: string) => {
    const lines = aiResponse.split('\n');
    const result = {
      extractedValue: 'Unknown',
      confidence: 'Unknown',
      matches: 'Unknown',
      explanation: 'Unable to parse response'
    };

    for (const line of lines) {
      if (line.startsWith('EXTRACTED_VALUE:')) {
        result.extractedValue = line.replace('EXTRACTED_VALUE:', '').trim();
      } else if (line.startsWith('CONFIDENCE:')) {
        result.confidence = line.replace('CONFIDENCE:', '').trim();
      } else if (line.startsWith('MATCHES_CURRENT:')) {
        result.matches = line.replace('MATCHES_CURRENT:', '').trim();
      } else if (line.startsWith('EXPLANATION:')) {
        result.explanation = line.replace('EXPLANATION:', '').trim();
      }
    }

    return result;
  };

  const getValidationIcon = (matches: string, confidence: string) => {
    if (matches.toLowerCase() === 'yes' && confidence.toLowerCase() === 'high') {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    } else if (matches.toLowerCase() === 'no') {
      return <XCircle className="h-5 w-5 text-red-600" />;
    } else {
      return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getValidationColor = (matches: string, confidence: string) => {
    if (matches.toLowerCase() === 'yes' && confidence.toLowerCase() === 'high') {
      return 'border-green-200 bg-green-50';
    } else if (matches.toLowerCase() === 'no') {
      return 'border-red-200 bg-red-50';
    } else {
      return 'border-yellow-200 bg-yellow-50';
    }
  };

  const formatValue = (value: number) => {
    if (value >= 1000000000) {
      return `$${(value / 1000000000).toFixed(1)}B`;
    } else if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    } else if (value < 1) {
      return `${(value * 100).toFixed(2)}%`;
    } else {
      return `$${value.toLocaleString()}`;
    }
  };

  const metricLabels: Record<string, string> = {
    enterpriseValue: 'Enterprise Value',
    valueOfEquity: 'Value of Equity',
    valuationPerShare: 'Valuation per Share',
    revenue: 'Revenue',
    ebitda: 'EBITDA',
    discountRate: 'Discount Rate'
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-medium text-gray-900">AI Validation</h3>
        </div>
        <div className="flex items-center space-x-2">
          {validationResults && (
            <button
              onClick={() => setIsVisible(!isVisible)}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
              title={isVisible ? 'Hide validation results' : 'Show validation results'}
            >
              {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
          <button
            onClick={handleValidate}
            disabled={isValidating}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
          >
            {isValidating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Validating...</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                <span>Validate with AI</span>
              </>
            )}
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Use AI to double-check the extracted metrics against the original document content.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {validationResults && isVisible && (
        <div className="space-y-3">
          <div className="text-xs text-gray-500 mb-3">
            Validation completed at {new Date(validationResults.timestamp).toLocaleString()}
          </div>
          
          {Object.entries(validationResults.validationResults).map(([key, result]) => {
            const parsed = parseValidationResponse(result.aiValidation);
            return (
              <div
                key={key}
                className={`p-3 border rounded-lg ${getValidationColor(parsed.matches, parsed.confidence)}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getValidationIcon(parsed.matches, parsed.confidence)}
                    <span className="font-medium text-gray-900">
                      {metricLabels[key] || key}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      Dashboard: {formatValue(result.currentValue)}
                    </div>
                    <div className="text-xs text-gray-600">
                      Confidence: {parsed.confidence}
                    </div>
                  </div>
                </div>
                
                <div className="text-sm text-gray-700 mb-2">
                  <strong>AI Found:</strong> {parsed.extractedValue}
                </div>
                
                <div className="text-xs text-gray-600">
                  {parsed.explanation}
                </div>
                
                {parsed.matches.toLowerCase() === 'no' && (
                  <div className="mt-2 p-2 bg-white border border-red-300 rounded text-xs">
                    <strong className="text-red-700">⚠️ Discrepancy detected:</strong> 
                    The AI found a different value than what's displayed in the dashboard.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MetricsValidation;