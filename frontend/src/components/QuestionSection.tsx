import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, ExternalLink, FileText, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [expandedCitations, setExpandedCitations] = useState<Set<number>>(new Set());
  
  // Refs for auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Clear previous responses when document changes
  React.useEffect(() => {
    setResponses([]);
  }, [documentId]);

  // Auto-scroll to top of the newest answer
  useEffect(() => {
    if (responses.length > 0 && messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      
      // Find all answer elements (gray background)
      const answerElements = container.querySelectorAll('.bg-gray-50');
      
      if (answerElements.length > 0) {
        // Get the last (newest) answer element
        const lastAnswerElement = answerElements[answerElements.length - 1] as HTMLElement;
        
        // Scroll to the top of the answer element
        const scrollTop = lastAnswerElement.offsetTop - container.offsetTop - 20; // 20px padding above
        
        container.scrollTo({
          top: scrollTop,
          behavior: 'smooth'
        });
      }
    } else if (isLoading && messagesEndRef.current) {
      // If loading and no messages yet, scroll to bottom
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [responses, isLoading]);

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
      setResponses(prev => [...prev, response]);
      setQuestion('');
      // Focus back to input after submission
      inputRef.current?.focus();
    } catch (error: any) {
      console.error('Question error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleClick = (exampleQ: string) => {
    setQuestion(exampleQ);
    inputRef.current?.focus();
  };

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
    <div className="bg-white rounded-lg shadow-md flex flex-col h-[600px]">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <MessageCircle className="h-5 w-5 mr-2" />
          Ask Questions About the Document
        </h2>
      </div>

      {/* Messages Area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {responses.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No questions asked yet</p>
            <p className="text-sm">Try asking about the company's valuation or key metrics!</p>
          </div>
        )}
        
        {responses.map((response, index) => (
          <div key={index} className="space-y-4">
            {/* User Question */}
            <div className="flex justify-end">
              <div className="bg-blue-600 text-white rounded-lg px-4 py-2 max-w-[80%]">
                <p className="text-sm">{response.question}</p>
              </div>
            </div>
            
            {/* AI Answer */}
            <div className="flex justify-start">
              <div className="bg-gray-50 rounded-lg px-4 py-3 max-w-[85%]">
                <div className="prose prose-sm max-w-none">
                  <p 
                    className="text-gray-700 whitespace-pre-wrap leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: highlightKeyInfo(response.answer) }}
                  />
                </div>

                {/* Citations */}
                {response.citations.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center mb-3">
                      <ExternalLink className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">
                        Sources ({response.citations.length})
                      </span>
                    </div>
                    <div className="space-y-2">
                      {response.citations.map((citation, citIndex) => (
                        <div 
                          key={citIndex} 
                          className="bg-white p-3 rounded border border-gray-200 shadow-sm"
                        >
                          {/* Citation Header */}
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center space-x-2">
                              <FileText className="h-3 w-3 text-blue-600" />
                              <span className="text-xs font-medium text-blue-800">
                                {citation.section || `Page ${citation.pageNumber}`}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                {((citation.relevance || 0) * 100).toFixed(0)}% relevant
                              </span>
                            </div>
                          </div>
                          
                          {/* Content Preview */}
                          <div className="text-xs text-gray-600 leading-relaxed">
                            <div 
                              dangerouslySetInnerHTML={{ 
                                __html: formatFinancialContent(citation.preview.substring(0, 150) + '...') 
                              }}
                            />
                          </div>
                          
                          {/* Expand Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCitation(citIndex);
                            }}
                            className="mt-2 text-xs text-blue-600 hover:text-blue-800 flex items-center"
                          >
                            {expandedCitations.has(citIndex) ? 'Show less' : 'Show more'}
                            {expandedCitations.has(citIndex) ? (
                              <ChevronUp className="h-3 w-3 ml-1" />
                            ) : (
                              <ChevronDown className="h-3 w-3 ml-1" />
                            )}
                          </button>
                          
                          {/* Expandable full content */}
                          {expandedCitations.has(citIndex) && (
                            <div className="mt-2 pt-2 border-t border-gray-100">
                              <div className="text-xs text-gray-700 leading-relaxed">
                                <div 
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
            </div>
          </div>
        ))}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-50 rounded-lg px-4 py-3">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm text-gray-600">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="border-t border-gray-200 p-4">
        {/* Example Questions */}
        <div className="mb-3">
          <div className="flex flex-wrap gap-2">
            {exampleQuestions.map((exampleQ, index) => (
              <button
                key={index}
                onClick={() => handleExampleClick(exampleQ)}
                className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
              >
                {exampleQ}
              </button>
            ))}
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex space-x-3">
          <input
            ref={inputRef}
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about company valuation, share prices, financial metrics..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!question.trim() || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

// Add this function to highlight key information in answers
const highlightKeyInfo = (answer: string) => {
  return formatFinancialContent(answer);
};

export default QuestionSection;