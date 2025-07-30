import React, { useState, useEffect, useRef } from 'react';
import { FileText, BarChart3, Home, Upload, MessageCircle, TrendingUp, CheckCircle, Clock, ChevronDown, Sparkles, Layers } from 'lucide-react';
import UploadSection from './components/UploadSection';
import EnhancedMetricsDashboard from './components/EnhancedMetricsDashboard';
import AdvancedMetricsDashboard from './components/AdvancedMetricsDashboard';
import QuestionSection from './components/QuestionSection';
import { getDocuments, uploadPDF, pollJobUntilComplete } from './services/api';
import { Document } from './types';

function App() {
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);
  const [isAnalysisComplete, setIsAnalysisComplete] = useState<boolean>(false);
  const [recentDocuments, setRecentDocuments] = useState<Document[]>([]);
  const [showRecentDropdown, setShowRecentDropdown] = useState<boolean>(false);
  const [isUploadingNew, setIsUploadingNew] = useState<boolean>(false);
  const [isProcessingNew, setIsProcessingNew] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [processingMessage, setProcessingMessage] = useState<string>('');
  const [isDocumentTransitioning, setIsDocumentTransitioning] = useState<boolean>(false);
  const [dashboardType, setDashboardType] = useState<'enhanced' | 'advanced'>('enhanced');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadSuccess = (documentId: string) => {
    setCurrentDocumentId(documentId);
    setIsAnalysisComplete(false); // Reset analysis state when new document is uploaded
    setIsUploadingNew(false); // Hide upload section after successful upload
  };

  const handleFileUpload = async (file: File) => {
    setIsUploadingNew(true);
    setIsProcessingNew(false);
    setUploadProgress(0);
    setProcessingMessage('');

    try {
      // Step 1: Upload file
      const uploadResult = await uploadPDF(file, (progressEvent) => {
        setUploadProgress(progressEvent.progress);
      });
      
      // Step 2: Start polling for processing status
      setIsUploadingNew(false);
      setIsProcessingNew(true);
      setProcessingMessage('Processing PDF with AI...');

      const jobResult = await pollJobUntilComplete(
        uploadResult.jobId,
        (status) => {
          const message = status.progressMessage || 'Processing...';
          setProcessingMessage(message);
        }
      );

      // Processing completed successfully
      if (jobResult.documentId) {
        handleUploadSuccess(jobResult.documentId);
        // Refresh recent documents
        const documents = await getDocuments();
        const sorted = documents
          .sort((a, b) => new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime())
          .slice(0, 5);
        setRecentDocuments(sorted);
      }
      
    } catch (error: any) {
      console.error('Upload failed:', error);
      alert(error.response?.data?.error || error.message || 'Upload failed');
    } finally {
      setIsUploadingNew(false);
      setIsProcessingNew(false);
    }
  };

  const handleUploadButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleDocumentSwitch = async (documentId: string) => {
    setIsDocumentTransitioning(true);
    setShowRecentDropdown(false);
    
    // Small delay to show the transition animation
    await new Promise(resolve => setTimeout(resolve, 150));
    
    setCurrentDocumentId(documentId);
    setIsAnalysisComplete(true);
    
    // Small delay before hiding the transition
    setTimeout(() => {
      setIsDocumentTransitioning(false);
    }, 150);
  };

  const handleAnalysisComplete = () => {
    setIsAnalysisComplete(true);
  };

  // Auto-set analysis as complete when document is loaded and results are shown
  useEffect(() => {
    if (currentDocumentId) {
      // Small delay to simulate processing time
      const timer = setTimeout(() => {
        setIsAnalysisComplete(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentDocumentId]);

  // Fetch recent documents
  useEffect(() => {
    const fetchRecentDocuments = async () => {
      try {
        const documents = await getDocuments();
        // Sort by upload date, most recent first, and take the last 5
        const sorted = documents
          .sort((a, b) => new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime())
          .slice(0, 5);
        setRecentDocuments(sorted);
      } catch (error) {
        console.error('Failed to fetch recent documents:', error);
      }
    };

    fetchRecentDocuments();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.recent-dropdown')) {
        setShowRecentDropdown(false);
      }
    };

    if (showRecentDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showRecentDropdown]);

  // Progress steps for breadcrumb navigation
  const getProgressSteps = () => {
    return [
      { 
        id: 'upload', 
        name: 'Upload Document', 
        icon: Upload, 
        completed: !!currentDocumentId,
        current: !currentDocumentId 
      },
      { 
        id: 'analyze', 
        name: 'AI Analysis', 
        icon: TrendingUp, 
        completed: isAnalysisComplete,
        current: !!currentDocumentId && !isAnalysisComplete 
      },
      { 
        id: 'explore', 
        name: 'Explore Results', 
        icon: MessageCircle, 
        completed: false,
        current: isAnalysisComplete 
      }
    ];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 transition-all duration-300">
      <header className="bg-white shadow-sm border-b sticky top-0 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div 
              className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity duration-200"
              onClick={() => {
                setCurrentDocumentId(null);
                setIsAnalysisComplete(false);
              }}
            >
              <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">ESOP Analyzer</h1>
                <p className="text-sm text-gray-500">AI-Powered Valuation Analysis</p>
              </div>
            </div>
            
            <div className="flex-1"></div>
            
                                      <div className="flex items-center space-x-4">
              {/* Recent Documents Dropdown */}
              <div className="relative recent-dropdown">
                <button
                  onClick={() => setShowRecentDropdown(!showRecentDropdown)}
                  className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Clock className="h-4 w-4" />
                  <span>Recent Documents</span>
                  <ChevronDown className={`h-3 w-3 transition-transform ${showRecentDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                {showRecentDropdown && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="p-3 border-b border-gray-200">
                      <h3 className="text-sm font-medium text-gray-900">Recently Uploaded</h3>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {recentDocuments.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          No recent documents
                        </div>
                      ) : (
                        recentDocuments.map((doc) => (
                                                      <button
                              key={doc.id}
                              onClick={() => handleDocumentSwitch(doc.id)}
                            className="w-full p-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                          >
                            <div className="flex items-center space-x-3">
                              <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {doc.filename}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {new Date(doc.upload_date).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <button
                onClick={handleUploadButtonClick}
                disabled={isUploadingNew || isProcessingNew}
                className={`flex items-center space-x-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                  isUploadingNew || isProcessingNew
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isUploadingNew || isProcessingNew ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>{isUploadingNew ? `Uploading ${uploadProgress}%` : processingMessage}</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    <span>Upload New Document</span>
                  </>
                )}
              </button>
              
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileUpload(file);
                  }
                  // Reset the input
                  e.target.value = '';
                }}
                className="hidden"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {!currentDocumentId ? (
            <div className="py-8 animate-fade-in">
              {/* Hero Section */}
              <div className="text-center mb-12">
                <div className="max-w-3xl mx-auto">
                  <h2 className="text-4xl font-bold text-gray-900 mb-6">
                    ESOP Valuation Analysis
                  </h2>
                  <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                    Upload your ESOP valuation PDF and unlock AI-powered insights. Extract key metrics, 
                    visualize financial data, and get instant answers about your company's valuation.
                  </p>
                </div>
              </div>

              {/* Progress Navigation */}
              <div className="max-w-4xl mx-auto mb-12">
                <nav className="flex items-center justify-center space-x-4 md:space-x-8 min-w-max md:min-w-0">
                  {getProgressSteps().map((step, index) => {
                    const Icon = step.icon;
                    return (
                      <div key={step.id} className="flex items-center">
                        <div className={`flex items-center space-x-2 ${
                          step.current ? 'text-blue-600' : 
                          step.completed ? 'text-green-600' : 'text-gray-400'
                        }`}>
                          <div className={`flex items-center justify-center w-6 h-6 rounded-full ${
                            step.current ? 'bg-blue-100' : 
                            step.completed ? 'bg-green-100' : 'bg-gray-100'
                          }`}>
                            {step.completed ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <Icon className="h-4 w-4" />
                            )}
                          </div>
                          <span className="text-sm font-medium whitespace-nowrap">{step.name}</span>
                        </div>
                        {index < getProgressSteps().length - 1 && (
                          <div className={`ml-4 h-0.5 w-8 ${
                            step.completed ? 'bg-green-200' : 'bg-gray-200'
                          }`} />
                        )}
                      </div>
                    );
                  })}
                </nav>
              </div>

              {/* Upload Section */}
              <div className="max-w-2xl mx-auto mb-12">
                <UploadSection onUploadSuccess={handleUploadSuccess} />
              </div>

              {/* Feature Preview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 max-w-5xl mx-auto">
                <div className="bg-white rounded-lg shadow-lg p-6 text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Smart Extraction</h3>
                  <p className="text-sm text-gray-600">
                    AI automatically extracts enterprise value, equity value, share prices, and key financial metrics
                  </p>
                </div>
                
                <div className="bg-white rounded-lg shadow-lg p-6 text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Visual Dashboard</h3>
                  <p className="text-sm text-gray-600">
                    Dashboard with formatted metrics, ownership structure, and data quality indicators
                  </p>
                </div>
                
                <div className="bg-white rounded-lg shadow-lg p-6 text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Q&A</h3>
                  <p className="text-sm text-gray-600">
                    Ask natural language questions and get detailed answers with source citations
                  </p>
                </div>
              </div>


            </div>
          ) : (
            <div className="animate-slide-in">
              {isUploadingNew ? (
                /* Upload New Document Section */
                <div className="max-w-2xl mx-auto">
                  <div className="mb-6 text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload New Document</h2>
                    <p className="text-gray-600">Upload a new ESOP valuation PDF to replace the current document</p>
                  </div>
                  <UploadSection onUploadSuccess={handleUploadSuccess} />
                  <div className="text-center mt-4">
                    <button
                      onClick={() => setIsUploadingNew(false)}
                      className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      Cancel and return to current document
                    </button>
                  </div>
                </div>
                            ) : (
                /* Main 2-Column Layout */
                <div className="relative">
                  {isDocumentTransitioning && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                      <div className="bg-white rounded-lg shadow-lg p-4 flex items-center space-x-3">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="text-sm text-gray-600">Loading document...</span>
                      </div>
                    </div>
                  )}
                  <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 transition-opacity duration-150 ${
                    isDocumentTransitioning ? 'opacity-50' : 'opacity-100'
                  }`}>
                    {/* Left Column - AI Chat */}
                    <div className="order-2 lg:order-1">
                      {/* AI Chat Section */}
                      <div className="transform transition-all duration-300 hover:scale-[1.01] lg:hover:scale-[1.02]">
                        <QuestionSection documentId={currentDocumentId} />
                      </div>
                    </div>

                    {/* Right Column - Metrics Dashboard */}
                    <div className="order-1 lg:order-2 space-y-4">
                      {/* Dashboard Type Selector */}
                      <div className="flex flex-wrap gap-2 bg-white rounded-lg shadow-sm p-3 border border-gray-200">
                        <button
                          onClick={() => setDashboardType('enhanced')}
                          className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            dashboardType === 'enhanced'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <BarChart3 className="h-4 w-4" />
                          <span>Enhanced Dashboard</span>
                        </button>
                        <button
                          onClick={() => setDashboardType('advanced')}
                          className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            dashboardType === 'advanced'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <Layers className="h-4 w-4" />
                          <span>Advanced Charts</span>
                        </button>
                      </div>
                      
                      {/* Dashboard Component */}
                      <div className="transform transition-all duration-300 hover:scale-[1.01] lg:hover:scale-[1.02]">
                        {dashboardType === 'enhanced' ? (
                          <EnhancedMetricsDashboard documentId={currentDocumentId} />
                        ) : (
                          <AdvancedMetricsDashboard documentId={currentDocumentId} />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="text-center">
            <p className="text-sm text-gray-500">
              Built for Village Labs Challenge · Powered by OpenAI GPT-4 & Claude AI
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
