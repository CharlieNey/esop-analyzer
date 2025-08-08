import { useState, useEffect, useCallback, useRef } from 'react';
import { supabaseApi } from '../services/supabaseApi';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeDocumentsOptions {
  onDocumentAdded?: (document: any) => void;
  onDocumentUpdated?: (document: any) => void;
  onDocumentDeleted?: (documentId: string) => void;
}

export const useRealtimeDocuments = (options: UseRealtimeDocumentsOptions = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const { onDocumentAdded, onDocumentUpdated, onDocumentDeleted } = options;

  useEffect(() => {
    const config = supabaseApi.getConfig();
    
    if (!config.useSupabase || !config.hasSupabaseConfig) {
      console.log('Real-time updates not available (Supabase not configured)');
      return;
    }

    console.log('Setting up real-time document updates...');

    const channel = supabaseApi.subscribeToDocuments((payload) => {
      console.log('Document update received:', payload);
      
      switch (payload.eventType) {
        case 'INSERT':
          if (onDocumentAdded) {
            onDocumentAdded(payload.new);
          }
          break;
        case 'UPDATE':
          if (onDocumentUpdated) {
            onDocumentUpdated(payload.new);
          }
          break;
        case 'DELETE':
          if (onDocumentDeleted) {
            onDocumentDeleted(payload.old.id);
          }
          break;
      }
    });

    if (channel) {
      channelRef.current = channel;
      setIsConnected(true);
      
      // Listen for connection status changes
      channel.subscribe((status) => {
        console.log('Document subscription status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });
    }

    return () => {
      if (channelRef.current) {
        console.log('Cleaning up document subscription');
        supabaseApi.unsubscribe('documents');
        setIsConnected(false);
      }
    };
  }, [onDocumentAdded, onDocumentUpdated, onDocumentDeleted]);

  return { isConnected };
};

interface UseRealtimeJobOptions {
  jobId: string;
  onStatusUpdate?: (jobData: any) => void;
  onCompleted?: (jobData: any) => void;
  onFailed?: (jobData: any) => void;
}

export const useRealtimeJob = (options: UseRealtimeJobOptions) => {
  const [isConnected, setIsConnected] = useState(false);
  const [jobStatus, setJobStatus] = useState<any>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const { jobId, onStatusUpdate, onCompleted, onFailed } = options;

  useEffect(() => {
    if (!jobId) return;

    const config = supabaseApi.getConfig();
    
    if (!config.useSupabase || !config.hasSupabaseConfig) {
      console.log('Real-time job updates not available, falling back to polling');
      
      // Fallback to polling
      supabaseApi.pollJobUntilComplete(
        jobId,
        (status) => {
          setJobStatus(status);
          if (onStatusUpdate) onStatusUpdate(status);
        },
        600000
      ).then((finalStatus) => {
        if (finalStatus.status === 'completed' && onCompleted) {
          onCompleted(finalStatus);
        } else if (finalStatus.status === 'failed' && onFailed) {
          onFailed(finalStatus);
        }
      }).catch((error) => {
        console.error('Job polling failed:', error);
        if (onFailed) onFailed({ status: 'failed', errorMessage: error.message });
      });

      return;
    }

    console.log(`Setting up real-time job updates for ${jobId}...`);

    const channel = supabaseApi.subscribeToProcessingJobs(jobId, (payload) => {
      console.log('Job update received:', payload);
      
      if (payload.eventType === 'UPDATE' && payload.new) {
        const jobData = {
          id: payload.new.id,
          status: payload.new.status,
          progress: payload.new.progress || 0,
          progressMessage: payload.new.result?.progressMessage || null,
          errorMessage: payload.new.error_message,
          result: payload.new.result,
          updatedAt: payload.new.updated_at
        };

        setJobStatus(jobData);
        
        if (onStatusUpdate) {
          onStatusUpdate(jobData);
        }

        if (jobData.status === 'completed' && onCompleted) {
          onCompleted(jobData);
        } else if (jobData.status === 'failed' && onFailed) {
          onFailed(jobData);
        }
      }
    });

    if (channel) {
      channelRef.current = channel;
      setIsConnected(true);
      
      channel.subscribe((status) => {
        console.log(`Job ${jobId} subscription status:`, status);
        setIsConnected(status === 'SUBSCRIBED');
      });
    }

    return () => {
      if (channelRef.current) {
        console.log(`Cleaning up job ${jobId} subscription`);
        supabaseApi.unsubscribe(`processing_job_${jobId}`);
        setIsConnected(false);
      }
    };
  }, [jobId, onStatusUpdate, onCompleted, onFailed]);

  return { isConnected, jobStatus };
};

interface UseRealtimeMetricsOptions {
  documentId: string;
  onMetricsUpdate?: (metricsData: any) => void;
}

export const useRealtimeMetrics = (options: UseRealtimeMetricsOptions) => {
  const [isConnected, setIsConnected] = useState(false);
  const [metricsData, setMetricsData] = useState<any>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const { documentId, onMetricsUpdate } = options;

  useEffect(() => {
    if (!documentId) return;

    const config = supabaseApi.getConfig();
    
    if (!config.useSupabase || !config.hasSupabaseConfig) {
      console.log('Real-time metrics updates not available');
      return;
    }

    console.log(`Setting up real-time metrics updates for document ${documentId}...`);

    const channel = supabaseApi.subscribeToMetrics(documentId, (payload) => {
      console.log('Metrics update received:', payload);
      
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        const metrics = payload.new?.ai_metrics;
        if (metrics) {
          setMetricsData(metrics);
          if (onMetricsUpdate) {
            onMetricsUpdate(metrics);
          }
        }
      }
    });

    if (channel) {
      channelRef.current = channel;
      setIsConnected(true);
      
      channel.subscribe((status) => {
        console.log(`Metrics ${documentId} subscription status:`, status);
        setIsConnected(status === 'SUBSCRIBED');
      });
    }

    return () => {
      if (channelRef.current) {
        console.log(`Cleaning up metrics ${documentId} subscription`);
        supabaseApi.unsubscribe(`metrics_${documentId}`);
        setIsConnected(false);
      }
    };
  }, [documentId, onMetricsUpdate]);

  const refreshMetrics = useCallback(async () => {
    try {
      const metrics = await supabaseApi.getLiveDocumentMetrics(documentId);
      setMetricsData(metrics);
      if (onMetricsUpdate) {
        onMetricsUpdate(metrics);
      }
    } catch (error) {
      console.error('Failed to refresh metrics:', error);
    }
  }, [documentId, onMetricsUpdate]);

  return { 
    isConnected, 
    metricsData, 
    refreshMetrics 
  };
};

// Server-Sent Events hook for job streaming
export const useJobStream = (jobId: string) => {
  const [status, setStatus] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;

    const config = supabaseApi.getConfig();
    
    if (!config.useSupabase) {
      // Fallback to polling for non-Supabase mode
      supabaseApi.pollJobUntilComplete(jobId, setStatus)
        .catch((err) => setError(err.message));
      return;
    }

    setIsConnected(true);
    setError(null);

    supabaseApi.streamJobStatus(
      jobId,
      (jobData) => {
        setStatus(jobData);
        setError(null);
      },
      (finalStatus) => {
        setStatus(finalStatus);
        setIsConnected(false);
      },
      (err) => {
        setError(err.message);
        setIsConnected(false);
      }
    );

    return () => {
      setIsConnected(false);
    };
  }, [jobId]);

  return { status, isConnected, error };
};