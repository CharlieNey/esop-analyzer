import React, { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { uploadPDF, pollJobUntilComplete } from '../services/api';

interface UploadSectionProps {
  onUploadSuccess: (documentId: string) => void;
}

const UploadSection: React.FC<UploadSectionProps> = ({ onUploadSuccess }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error' | 'processing' | null;
    message: string;
  }>({ type: null, message: '' });

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const pdfFile = files.find(file => file.type === 'application/pdf');
    
    if (pdfFile) {
      handleFileUpload(pdfFile);
    } else {
      setUploadStatus({
        type: 'error',
        message: 'Please upload a PDF file'
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setIsProcessing(false);
    setUploadStatus({ type: null, message: '' });
    setProgressMessage('');

    try {
      // Step 1: Upload file
      setUploadStatus({
        type: 'processing',
        message: `Uploading ${file.name}...`
      });
      
      const uploadResult = await uploadPDF(file);
      
      // Step 2: Start polling for processing status
      setIsUploading(false);
      setIsProcessing(true);
      setUploadStatus({
        type: 'processing',
        message: 'Processing PDF with AI...'
      });

      const jobResult = await pollJobUntilComplete(
        uploadResult.jobId,
        (status) => {
          setProgressMessage(status.progressMessage || 'Processing...');
          setUploadStatus({
            type: 'processing',
            message: status.progressMessage || 'Processing with AI...'
          });
        }
      );

      // Processing completed successfully
      setUploadStatus({
        type: 'success',
        message: `Successfully processed ${file.name}`
      });
      
      if (jobResult.documentId) {
        onUploadSuccess(jobResult.documentId);
      }
      
    } catch (error: any) {
      setUploadStatus({
        type: 'error',
        message: error.response?.data?.error || error.message || 'Upload failed'
      });
    } finally {
      setIsUploading(false);
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Upload ESOP Valuation Report
      </h2>
      
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragging 
            ? 'border-primary-500 bg-primary-50' 
            : 'border-gray-300 hover:border-primary-400'
          }
          ${isUploading || isProcessing ? 'opacity-50 pointer-events-none' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center space-y-4">
          {isUploading || isProcessing ? (
            <div className="flex flex-col items-center space-y-2">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              {isProcessing && (
                <Clock className="h-6 w-6 text-primary-600 animate-pulse" />
              )}
            </div>
          ) : (
            <Upload className="h-12 w-12 text-gray-400" />
          )}
          
          <div>
            <p className="text-lg font-medium text-gray-900">
              {isUploading 
                ? 'Uploading...' 
                : isProcessing 
                ? 'Processing with AI...' 
                : 'Drop your PDF here'
              }
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {isUploading || isProcessing 
                ? (progressMessage || 'Please wait...') 
                : 'or click to browse files'
              }
            </p>
          </div>
          
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileInput}
            className="hidden"
            id="pdf-upload"
            disabled={isUploading || isProcessing}
          />
          <label
            htmlFor="pdf-upload"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 cursor-pointer disabled:opacity-50"
          >
            <FileText className="h-4 w-4 mr-2" />
            Choose PDF File
          </label>
        </div>
      </div>

      {uploadStatus.type && (
        <div className={`mt-4 p-4 rounded-md flex items-center space-x-2 ${
          uploadStatus.type === 'success' 
            ? 'bg-green-50 text-green-700'
            : uploadStatus.type === 'processing'
            ? 'bg-blue-50 text-blue-700'
            : 'bg-red-50 text-red-700'
        }`}>
          {uploadStatus.type === 'success' ? (
            <CheckCircle className="h-5 w-5" />
          ) : uploadStatus.type === 'processing' ? (
            <Clock className="h-5 w-5 animate-pulse" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span className="text-sm">{uploadStatus.message}</span>
        </div>
      )}
    </div>
  );
};

export default UploadSection;