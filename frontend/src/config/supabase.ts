import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing required Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types (these would be generated from Supabase CLI in a real project)
export interface Database {
  public: {
    Tables: {
      documents: {
        Row: {
          id: string;
          filename: string;
          file_path: string;
          upload_date: string;
          content_text: string | null;
          metadata: any;
          processed_at: string | null;
        };
        Insert: {
          id?: string;
          filename: string;
          file_path: string;
          upload_date?: string;
          content_text?: string | null;
          metadata?: any;
          processed_at?: string | null;
        };
        Update: {
          id?: string;
          filename?: string;
          file_path?: string;
          upload_date?: string;
          content_text?: string | null;
          metadata?: any;
          processed_at?: string | null;
        };
      };
      document_chunks: {
        Row: {
          id: string;
          document_id: string;
          chunk_text: string;
          chunk_index: number;
          page_number: number | null;
          embedding: number[] | null;
          metadata: any;
        };
        Insert: {
          id?: string;
          document_id: string;
          chunk_text: string;
          chunk_index: number;
          page_number?: number | null;
          embedding?: number[] | null;
          metadata?: any;
        };
        Update: {
          id?: string;
          document_id?: string;
          chunk_text?: string;
          chunk_index?: number;
          page_number?: number | null;
          embedding?: number[] | null;
          metadata?: any;
        };
      };
      extracted_metrics: {
        Row: {
          id: string;
          document_id: string;
          metric_type: string;
          metric_value: string | null;
          metric_data: any;
          confidence_score: number;
          extracted_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          metric_type: string;
          metric_value?: string | null;
          metric_data?: any;
          confidence_score?: number;
          extracted_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          metric_type?: string;
          metric_value?: string | null;
          metric_data?: any;
          confidence_score?: number;
          extracted_at?: string;
        };
      };
      ai_metrics_cache: {
        Row: {
          id: number;
          document_id: string;
          ai_metrics: any;
          created_at: string;
        };
        Insert: {
          id?: number;
          document_id: string;
          ai_metrics: any;
          created_at?: string;
        };
        Update: {
          id?: number;
          document_id?: string;
          ai_metrics?: any;
          created_at?: string;
        };
      };
    };
  };
}