import React, { useState } from 'react';
import { Send, MessageCircle, ExternalLink, FileText, TrendingUp, DollarSign, Percent, ChevronDown, ChevronUp } from 'lucide-react';
import { askQuestion } from '../services/api';
import { QuestionResponse } from '../types';
import { formatFinancialContent } from '../utils/markdownRenderer';

interface QuestionSectionProps {
  documentId: string;
}

const QuestionSection: React.FC<QuestionSectionProps> = ({ documentId }) => {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [responses, setResponses] = useState<QuestionResponse[]>([]);

  // Clear previous responses when document changes
  React.useEffect(() => {
    setResponses([]);
  }, [documentId]);

  const exampleQuestions = [
    "What is the company's total valuation?",
    "What discount rate was used in the valuation?",
    "How many shares are owned by the ESOP?",
    "What are the key financial assumptions?",
    "What is the fair market value per share?"
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const response = await askQuestion(question, documentId);
      setResponses(prev => [response, ...prev]);
      setQuestion('');
    } catch (error: any) {
      console.error('Question error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleClick = (exampleQ: string) => {
    setQuestion(exampleQ);
  };

  // Add expandable citations
  const [expandedCitations, setExpandedCitations] = useState<Set<number>>(new Set());

  const toggleCitation = (index: number) => {
    const newExpanded = new Set(expandedCitations);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedCitations(newExpanded);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
        <MessageCircle className="h-5 w-5 mr-2" />
        Ask Questions About the Document
      </h2>

      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex space-x-3">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about company valuation, share prices, financial metrics..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!question.trim() || isLoading}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </form>

      <div className="mb-6">
        <p className="text-sm text-gray-600 mb-2">Try these example questions:</p>
        <div className="flex flex-wrap gap-2">
          {exampleQuestions.map((exampleQ, index) => (
            <button
              key={index}
              onClick={() => handleExampleClick(exampleQ)}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
            >
              {exampleQ}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {responses.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No questions asked yet. Try asking about the company's valuation or key metrics!
          </div>
        )}
        
        {responses.map((response, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4">
            <div className="mb-3">
              <h4 className="font-medium text-gray-900 mb-2">Question:</h4>
              <p className="text-gray-700 bg-gray-50 p-3 rounded">{response.question}</p>
            </div>
            
            <div className="mb-3">
              <h4 className="font-medium text-gray-900 mb-2">Answer:</h4>
              <div className="prose prose-sm max-w-none">
                <p 
                  className="text-gray-700 whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: highlightKeyInfo(response.answer) }}
                />
              </div>
            </div>

            {response.citations.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Sources & Citations ({response.citations.length})
                </h4>
                <div className="space-y-3">
                  {response.citations.map((citation, citIndex) => (
                    <div 
                      key={citIndex} 
                      className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200 shadow-sm hover:shadow-md transition-shadow"
                    >
                      {/* Citation Header */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-semibold text-blue-800">
                            {citation.section || `Section ${citation.chunkIndex + 1}`}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                            Page {citation.pageNumber}
                          </span>
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                            {((citation.relevance || 0) * 100).toFixed(0)}% relevant
                          </span>
                        </div>
                      </div>
                      
                      {/* Key Metrics Preview */}
                      {citation.keyMetrics && citation.keyMetrics.length > 0 && (
                        <div className="mb-3">
                          <div className="flex items-center space-x-1 mb-2">
                            <TrendingUp className="h-3 w-3 text-gray-600" />
                            <span className="text-xs font-medium text-gray-700">Key Metrics Found:</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {citation.keyMetrics.map((metric, idx) => (
                              <span key={idx} className="text-xs bg-white px-2 py-1 rounded border">
                                {metric.type}: {metric.values.join(', ')}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Content Preview */}
                      <div className="bg-white p-3 rounded border">
                        <div 
                          className="text-sm text-gray-700 leading-relaxed"
                          dangerouslySetInnerHTML={{ 
                            __html: formatFinancialContent(citation.preview) 
                          }}
                        />
                      </div>
                      
                      {/* Citation Footer with Expand Button */}
                      <div className="mt-3 flex justify-between items-center">
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>Document chunk #{citation.chunkIndex + 1}</span>
                          <span>Similarity: {citation.relevance ? (citation.relevance * 100).toFixed(1) : 'N/A'}%</span>
                        </div>
                        
                        {/* Expand/Collapse Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCitation(citIndex);
                          }}
                          className="flex items-center space-x-1 px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
                        >
                          <span>
                            {expandedCitations.has(citIndex) ? 'Collapse' : 'Expand'}
                          </span>
                          {expandedCitations.has(citIndex) ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                      
                      {/* Expandable full content */}
                      {expandedCitations.has(citIndex) && (
                        <div className="mt-3 pt-3 border-t border-blue-200">
                          <div className="bg-white p-4 rounded border">
                            <h5 className="text-sm font-medium text-gray-900 mb-2">Full Content:</h5>
                            <div 
                              className="text-sm text-gray-700 leading-relaxed"
                              dangerouslySetInnerHTML={{ 
                                __html: formatFinancialContent(citation.fullText || citation.preview) 
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Add this function to highlight key information in answers
const highlightKeyInfo = (answer: string) => {
  return formatFinancialContent(answer);
};

export default QuestionSection;