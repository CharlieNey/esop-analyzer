import React, { useState, useEffect } from 'react';
import { useRealtimeDocuments, useRealtimeJob, useJobStream } from '../hooks/useRealtimeUpdates';
import { supabaseApi } from '../services/supabaseApi';
import { Document } from '../types';

interface RealtimeDashboardProps {
  onDocumentSelect?: (document: Document) => void;
}

export const RealtimeDashboard: React.FC<RealtimeDashboardProps> = ({ onDocumentSelect }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Real-time document updates
  const { isConnected: documentsConnected } = useRealtimeDocuments({
    onDocumentAdded: (newDocument) => {
      console.log('New document added:', newDocument);
      setDocuments(prev => [newDocument, ...prev]);
    },
    onDocumentUpdated: (updatedDocument) => {
      console.log('Document updated:', updatedDocument);
      setDocuments(prev => 
        prev.map(doc => doc.id === updatedDocument.id ? updatedDocument : doc)
      );
    },
    onDocumentDeleted: (documentId) => {
      console.log('Document deleted:', documentId);
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
    }
  });

  // Real-time job updates (using the job stream hook)
  const { status: jobStatus, isConnected: jobConnected, error: jobError } = useJobStream(activeJobId || '');

  // Load initial documents
  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const docs = await supabaseApi.getDocuments();
        setDocuments(docs);
      } catch (error) {
        console.error('Failed to load documents:', error);
      }
    };

    loadDocuments();
  }, []);

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setUploadStatus('uploading');

    try {
      const result = await supabaseApi.uploadPDF(file, (progress) => {
        console.log('Upload progress:', progress);
      });

      if (result.jobId) {
        setActiveJobId(result.jobId);
        setUploadStatus('processing');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadStatus('error');
      setActiveJobId(null);
    }
  };

  // Update upload status based on job status
  useEffect(() => {
    if (jobStatus) {
      if (jobStatus.status === 'completed') {
        setUploadStatus('completed');
        setActiveJobId(null);
      } else if (jobStatus.status === 'failed') {
        setUploadStatus('error');
        setActiveJobId(null);
      } else {
        setUploadStatus('processing');
      }
    }
  }, [jobStatus]);

  const config = supabaseApi.getConfig();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Real-time Document Dashboard
        </h1>
        
        {/* Configuration Status */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-semibold mb-2">Configuration Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${config.useSupabase ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              <span>Backend: {config.useSupabase ? 'Supabase' : 'PostgreSQL'}</span>
            </div>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${documentsConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span>Real-time Documents: {documentsConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${jobConnected ? 'bg-green-500' : 'bg-gray-500'}`}></div>
              <span>Job Updates: {jobConnected ? 'Connected' : 'Not Connected'}</span>
            </div>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${config.hasSupabaseConfig ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span>Supabase Config: {config.hasSupabaseConfig ? 'Valid' : 'Missing'}</span>
            </div>
          </div>
        </div>

        {/* File Upload Section */}
        <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-6 mb-6">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Upload PDF Document</h3>
            
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              disabled={uploadStatus === 'uploading' || uploadStatus === 'processing'}
            />

            {/* Upload Status */}
            {uploadStatus !== 'idle' && (
              <div className="mt-4 p-3 rounded-lg">
                {uploadStatus === 'uploading' && (
                  <div className="text-blue-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 inline-block mr-2"></div>
                    Uploading {selectedFile?.name}...
                  </div>
                )}
                
                {uploadStatus === 'processing' && jobStatus && (
                  <div className="text-yellow-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 inline-block mr-2"></div>
                    Processing: {jobStatus.progressMessage || 'In progress...'}
                    {jobStatus.progress && (
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          className="bg-yellow-600 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${jobStatus.progress}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                )}
                
                {uploadStatus === 'completed' && (
                  <div className="text-green-600">
                    ✅ Processing completed successfully!
                  </div>
                )}
                
                {uploadStatus === 'error' && (
                  <div className="text-red-600">
                    ❌ {jobError || 'Upload/processing failed'}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Documents List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Documents ({documents.length})
              {documentsConnected && (
                <span className="ml-2 text-sm text-green-600">• Live Updates</span>
              )}
            </h3>
          </div>

          <div className="divide-y divide-gray-200">
            {documents.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                No documents uploaded yet. Upload a PDF to get started!
              </div>
            ) : (
              documents.map((document) => (
                <div
                  key={document.id}
                  className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => onDocumentSelect?.(document)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900">
                        {document.filename}
                      </h4>
                      <div className="mt-1 text-sm text-gray-500">
                        Uploaded: {new Date(document.upload_date).toLocaleString()}
                        {document.processed_at && (
                          <span className="ml-2">
                            • Processed: {new Date(document.processed_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {document.processed_at ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Processed
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Processing
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Real-time Features Info */}
        {config.useSupabase && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Real-time Features Active</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Document list updates automatically when new files are uploaded</li>
              <li>• Processing status updates in real-time without page refresh</li>
              <li>• Metrics and analysis results appear as they're computed</li>
              <li>• Connection status indicators show live data flow</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};