import React, { useState, useEffect } from 'react';
import { supabaseApi } from '../services/supabaseApi';

interface TestResult {
  test: string;
  success: boolean;
  message: string;
  duration?: number;
}

export const SupabaseTest: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [overallStatus, setOverallStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');

  const addResult = (result: TestResult) => {
    setTestResults(prev => [...prev, result]);
  };

  const runTests = async () => {
    setIsRunning(true);
    setOverallStatus('running');
    setTestResults([]);

    const tests = [
      testConfiguration,
      testHealthCheck,
      testDocumentOperations,
      testRealtimeCapabilities
    ];

    let allPassed = true;

    for (const test of tests) {
      try {
        const startTime = Date.now();
        await test(addResult);
        const duration = Date.now() - startTime;
        
        // Update the last result with duration
        setTestResults(prev => {
          const updated = [...prev];
          if (updated.length > 0) {
            updated[updated.length - 1].duration = duration;
          }
          return updated;
        });
      } catch (error) {
        allPassed = false;
        addResult({
          test: 'Test Execution',
          success: false,
          message: `Test failed: ${error}`
        });
      }
    }

    setIsRunning(false);
    setOverallStatus(allPassed ? 'success' : 'error');
  };

  const testConfiguration = async (addResult: (result: TestResult) => void) => {
    const config = supabaseApi.getConfig();
    
    addResult({
      test: 'Configuration Check',
      success: config.hasSupabaseConfig,
      message: config.hasSupabaseConfig 
        ? `✓ Supabase configured (${config.useSupabase ? 'enabled' : 'disabled'})`
        : '✗ Supabase configuration missing'
    });

    addResult({
      test: 'Environment Variables',
      success: !!(config.supabaseUrl && process.env.REACT_APP_SUPABASE_ANON_KEY),
      message: `Supabase URL: ${config.supabaseUrl ? '✓' : '✗'}, Anon Key: ${process.env.REACT_APP_SUPABASE_ANON_KEY ? '✓' : '✗'}`
    });
  };

  const testHealthCheck = async (addResult: (result: TestResult) => void) => {
    try {
      const health = await supabaseApi.healthCheck();
      addResult({
        test: 'Health Check',
        success: true,
        message: `✓ Backend healthy (${health.backend || 'unknown'})`
      });
    } catch (error) {
      addResult({
        test: 'Health Check',
        success: false,
        message: `✗ Health check failed: ${error}`
      });
    }
  };

  const testDocumentOperations = async (addResult: (result: TestResult) => void) => {
    try {
      const documents = await supabaseApi.getDocuments();
      addResult({
        test: 'Document Retrieval',
        success: true,
        message: `✓ Retrieved ${documents.length} documents`
      });
    } catch (error) {
      addResult({
        test: 'Document Retrieval',
        success: false,
        message: `✗ Document retrieval failed: ${error}`
      });
    }
  };

  const testRealtimeCapabilities = async (addResult: (result: TestResult) => void) => {
    const config = supabaseApi.getConfig();
    
    if (!config.useSupabase || !config.hasSupabaseConfig) {
      addResult({
        test: 'Real-time Capabilities',
        success: false,
        message: '✗ Real-time not available (Supabase not enabled/configured)'
      });
      return;
    }

    try {
      // Test subscription creation
      const subscription = supabaseApi.subscribeToDocuments(() => {});
      
      if (subscription) {
        addResult({
          test: 'Real-time Subscription',
          success: true,
          message: '✓ Real-time subscription created successfully'
        });
        
        // Clean up
        supabaseApi.unsubscribe('documents');
      } else {
        addResult({
          test: 'Real-time Subscription',
          success: false,
          message: '✗ Failed to create real-time subscription'
        });
      }
    } catch (error) {
      addResult({
        test: 'Real-time Subscription',
        success: false,
        message: `✗ Real-time test failed: ${error}`
      });
    }
  };

  const getStatusColor = (success: boolean) => {
    return success ? 'text-green-600' : 'text-red-600';
  };

  const getOverallStatusColor = () => {
    switch (overallStatus) {
      case 'success': return 'bg-green-50 border-green-200 text-green-800';
      case 'error': return 'bg-red-50 border-red-200 text-red-800';
      case 'running': return 'bg-blue-50 border-blue-200 text-blue-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Supabase Integration Test
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Test the Supabase integration and real-time capabilities
          </p>
        </div>

        <div className="p-6">
          {/* Overall Status */}
          {overallStatus !== 'idle' && (
            <div className={`mb-6 p-4 rounded-lg border ${getOverallStatusColor()}`}>
              <div className="flex items-center">
                {overallStatus === 'running' && (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
                )}
                <span className="font-medium">
                  {overallStatus === 'running' && 'Running tests...'}
                  {overallStatus === 'success' && '✅ All tests passed!'}
                  {overallStatus === 'error' && '❌ Some tests failed'}
                </span>
              </div>
            </div>
          )}

          {/* Run Tests Button */}
          <div className="mb-6">
            <button
              onClick={runTests}
              disabled={isRunning}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {isRunning ? 'Running Tests...' : 'Run Tests'}
            </button>
          </div>

          {/* Test Results */}
          {testResults.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Test Results</h3>
              
              {testResults.map((result, index) => (
                <div key={index} className="flex items-start justify-between py-3 px-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{result.test}</div>
                    <div className={`text-sm mt-1 ${getStatusColor(result.success)}`}>
                      {result.message}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    {result.duration && <span>{result.duration}ms</span>}
                    <span className={`font-medium ${getStatusColor(result.success)}`}>
                      {result.success ? '✓' : '✗'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Configuration Info */}
          <div className="mt-8 bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Current Configuration</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <div>Use Supabase: {supabaseApi.getConfig().useSupabase ? '✓ Yes' : '✗ No'}</div>
              <div>Supabase URL: {supabaseApi.getConfig().supabaseUrl || 'Not set'}</div>
              <div>Has Config: {supabaseApi.getConfig().hasSupabaseConfig ? '✓ Yes' : '✗ No'}</div>
              <div>API Base URL: {supabaseApi.getConfig().apiBaseUrl}</div>
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-6 bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Setup Instructions</h4>
            <div className="text-sm text-blue-700 space-y-1">
              <div>1. Create a Supabase project at https://supabase.com</div>
              <div>2. Add your Supabase URL and anon key to frontend/.env</div>
              <div>3. Run the database schema setup in Supabase SQL editor</div>
              <div>4. Set REACT_APP_USE_SUPABASE=true to enable Supabase mode</div>
              <div>5. Ensure backend is configured with USE_SUPABASE=true</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};