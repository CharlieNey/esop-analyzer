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
          <h3 className="text-lg font-medium text-gray-900">AI Validation (Beta)</h3>
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

      {validationResults && isVisible && (() => {
        const allResults = Object.entries(validationResults.validationResults);
        
        const validResults = allResults.filter(([key, result]) => {
          const parsed = parseValidationResponse(result.aiValidation);
          // Filter out cases where AI couldn't find a value
          return !parsed.extractedValue.toLowerCase().includes('unknown') && 
                 !parsed.extractedValue.toLowerCase().includes('not found') &&
                 !parsed.extractedValue.toLowerCase().includes('could not find') &&
                 !parsed.extractedValue.toLowerCase().includes('not_found');
        });

        const unverifiedCount = allResults.filter(([key, result]) => {
          const parsed = parseValidationResponse(result.aiValidation);
          return parsed.extractedValue.toLowerCase().includes('unknown') || 
                 parsed.extractedValue.toLowerCase().includes('not found') ||
                 parsed.extractedValue.toLowerCase().includes('could not find') ||
                 parsed.extractedValue.toLowerCase().includes('not_found');
        }).length;

        const verifiedCount = validResults.filter(([key, result]) => {
          const parsed = parseValidationResponse(result.aiValidation);
          return parsed.matches.toLowerCase() === 'yes';
        }).length;

        const discrepancyResults = validResults.filter(([key, result]) => {
          const parsed = parseValidationResponse(result.aiValidation);
          return parsed.matches.toLowerCase() === 'no';
        });

        return (
          <div className="space-y-3">
            <div className="text-xs text-gray-500 mb-3">
              Validation completed at {new Date(validationResults.timestamp).toLocaleString()}
            </div>
            
            {/* Summary of verified values */}
            {verifiedCount > 0 && (
              <div className="p-3 border border-green-200 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-900">
                    {verifiedCount} value{verifiedCount !== 1 ? 's' : ''} verified
                  </span>
                </div>
                <p className="text-sm text-green-700">
                  AI successfully verified {verifiedCount} metric{verifiedCount !== 1 ? 's' : ''} against the document content.
                </p>
              </div>
            )}

            {/* Summary of unverified values */}
            {unverifiedCount > 0 && (
              <div className="p-3 border border-yellow-200 bg-yellow-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <span className="font-medium text-yellow-900">
                    {unverifiedCount} value{unverifiedCount !== 1 ? 's' : ''} unable to be verified
                  </span>
                </div>
                <p className="text-sm text-yellow-700">
                  AI was unable to locate these metrics in the document content.
                </p>
              </div>
            )}
            
            {/* Show only discrepancies */}
            {discrepancyResults.map(([key, result]) => {
              const parsed = parseValidationResponse(result.aiValidation);
              return (
                <div
                  key={key}
                  className="p-3 border border-red-200 bg-gradient-to-r from-red-50 to-red-25 rounded-lg shadow-sm"
                >
                  {/* Metric name and icon */}
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="flex items-center justify-center w-6 h-6 bg-red-100 rounded-full">
                      <XCircle className="h-3 w-3 text-red-600" />
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900 text-sm">
                        {metricLabels[key] || key}
                      </span>
                      <div className="text-xs text-red-600 font-medium">
                        Discrepancy detected
                      </div>
                    </div>
                  </div>

                  {/* Dashboard vs AI Value Comparison */}
                  <div className="bg-white rounded-lg p-3 mb-2 border border-red-100">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center">
                        <div className="text-xs text-gray-500 mb-1">Dashboard Value</div>
                        <div className="text-base font-bold text-gray-900">
                          {formatValue(result.currentValue)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-500 mb-1">AI Extracted Value</div>
                        <div className="text-base font-bold text-red-700">
                          {parsed.extractedValue}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-center mt-2 pt-2 border-t border-gray-100">
                      <div className="text-xs text-gray-500">
                        Values do not match
                      </div>
                    </div>
                  </div>
                  
                  {parsed.explanation && (
                    <div className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2">
                      {parsed.explanation}
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* Show message if no discrepancies found */}
            {discrepancyResults.length === 0 && verifiedCount > 0 && (
              <div className="p-3 border border-green-200 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm text-green-700">
                    All verified metrics match the document content.
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
};

export default MetricsValidation;