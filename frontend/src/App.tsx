import React, { useState } from 'react';
import { FileText, BarChart3 } from 'lucide-react';
import UploadSection from './components/UploadSection';
import EnhancedMetricsDashboard from './components/EnhancedMetricsDashboard';
import QuestionSection from './components/QuestionSection';

function App() {
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);

  const handleUploadSuccess = (documentId: string) => {
    setCurrentDocumentId(documentId);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-primary-600 rounded-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">ESOP Analyzer</h1>
                <p className="text-sm text-gray-500">Valuation Report Analysis</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <BarChart3 className="h-4 w-4" />
              <span>Village Labs Challenge</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {!currentDocumentId ? (
            <div className="text-center py-12">
              <div className="max-w-2xl mx-auto">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Analyze Your ESOP Valuation Report
                </h2>
                <p className="text-lg text-gray-600 mb-8">
                  Upload your ESOP valuation PDF to extract key metrics, visualize financial data, 
                  and ask questions about your company's valuation with AI-powered insights.
                </p>
                <UploadSection onUploadSuccess={handleUploadSuccess} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-8">
                <UploadSection onUploadSuccess={handleUploadSuccess} />
                <QuestionSection documentId={currentDocumentId} />
              </div>
              <div>
                <EnhancedMetricsDashboard documentId={currentDocumentId} />
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-500">
            <p>Built for Village Labs Challenge · Powered by OpenAI GPT-4 & Vector Search</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
