-- Advanced Row Level Security Policies for Supabase
-- Run these after the main schema setup

-- Enable RLS on all tables
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracted_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_metrics_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_jobs ENABLE ROW LEVEL SECURITY;

-- Create custom functions for policy checks
CREATE OR REPLACE FUNCTION auth.user_id() RETURNS UUID AS $$
  SELECT COALESCE(
    auth.jwt() ->> 'sub',
    (current_setting('request.jwt.claim.sub', true))::text
  )::UUID;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION auth.role() RETURNS text AS $$
  SELECT COALESCE(
    auth.jwt() ->> 'role',
    current_setting('request.jwt.claim.role', true),
    (current_setting('role'))::text
  );
$$ LANGUAGE SQL STABLE;

-- Documents table policies
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.documents;

-- Policy: Users can view all documents (for demo purposes)
-- In production, you'd want to restrict by user ownership or organization
CREATE POLICY "Allow read access to all authenticated users" ON public.documents
  FOR SELECT USING (
    auth.role() = 'authenticated' OR 
    auth.role() = 'service_role' OR
    auth.role() = 'anon'  -- Allow anonymous read for demo
  );

-- Policy: Only authenticated users can insert documents
CREATE POLICY "Allow insert for authenticated users" ON public.documents
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' OR 
    auth.role() = 'service_role'
  );

-- Policy: Users can update their own documents (if we add user_id column later)
-- For now, allow authenticated users to update any document
CREATE POLICY "Allow update for authenticated users" ON public.documents
  FOR UPDATE USING (
    auth.role() = 'authenticated' OR 
    auth.role() = 'service_role'
  );

-- Policy: Only service role can delete documents (for admin/cleanup operations)
CREATE POLICY "Allow delete for service role" ON public.documents
  FOR DELETE USING (
    auth.role() = 'service_role'
  );

-- Document chunks policies
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.document_chunks;

CREATE POLICY "Allow read access to document chunks" ON public.document_chunks
  FOR SELECT USING (
    auth.role() = 'authenticated' OR 
    auth.role() = 'service_role' OR
    auth.role() = 'anon'
  );

CREATE POLICY "Allow insert document chunks" ON public.document_chunks
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' OR 
    auth.role() = 'service_role'
  );

CREATE POLICY "Allow update document chunks" ON public.document_chunks
  FOR UPDATE USING (
    auth.role() = 'authenticated' OR 
    auth.role() = 'service_role'
  );

CREATE POLICY "Allow delete document chunks for service role" ON public.document_chunks
  FOR DELETE USING (
    auth.role() = 'service_role'
  );

-- Extracted metrics policies
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.extracted_metrics;

CREATE POLICY "Allow read access to metrics" ON public.extracted_metrics
  FOR SELECT USING (
    auth.role() = 'authenticated' OR 
    auth.role() = 'service_role' OR
    auth.role() = 'anon'
  );

CREATE POLICY "Allow insert metrics" ON public.extracted_metrics
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' OR 
    auth.role() = 'service_role'
  );

CREATE POLICY "Allow update metrics" ON public.extracted_metrics
  FOR UPDATE USING (
    auth.role() = 'authenticated' OR 
    auth.role() = 'service_role'
  );

-- AI metrics cache policies
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.ai_metrics_cache;

CREATE POLICY "Allow read access to AI metrics" ON public.ai_metrics_cache
  FOR SELECT USING (
    auth.role() = 'authenticated' OR 
    auth.role() = 'service_role' OR
    auth.role() = 'anon'
  );

CREATE POLICY "Allow upsert AI metrics" ON public.ai_metrics_cache
  FOR ALL USING (
    auth.role() = 'authenticated' OR 
    auth.role() = 'service_role'
  );

-- Processing jobs policies
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.processing_jobs;

CREATE POLICY "Allow read access to jobs" ON public.processing_jobs
  FOR SELECT USING (
    auth.role() = 'authenticated' OR 
    auth.role() = 'service_role' OR
    auth.role() = 'anon'
  );

CREATE POLICY "Allow insert jobs" ON public.processing_jobs
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' OR 
    auth.role() = 'service_role'
  );

CREATE POLICY "Allow update jobs" ON public.processing_jobs
  FOR UPDATE USING (
    auth.role() = 'authenticated' OR 
    auth.role() = 'service_role'
  );

CREATE POLICY "Allow delete jobs for service role" ON public.processing_jobs
  FOR DELETE USING (
    auth.role() = 'service_role'
  );

-- Storage policies for documents bucket
DROP POLICY IF EXISTS "Allow authenticated users to upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow service role full access to documents" ON storage.objects;

-- Policy: Allow authenticated users to upload to documents bucket
CREATE POLICY "Allow authenticated upload to documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents' AND 
    (auth.role() = 'authenticated' OR auth.role() = 'service_role')
  );

-- Policy: Allow public read access to documents (for demo)
-- In production, you'd want to restrict this based on user ownership
CREATE POLICY "Allow public read from documents bucket" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents'
  );

-- Policy: Allow authenticated users to update their files
CREATE POLICY "Allow authenticated update in documents bucket" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'documents' AND 
    (auth.role() = 'authenticated' OR auth.role() = 'service_role')
  );

-- Policy: Only service role can delete files (for cleanup)
CREATE POLICY "Allow service role delete from documents bucket" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documents' AND auth.role() = 'service_role'
  );

-- Additional security functions

-- Function to check if user owns a document (for future use)
CREATE OR REPLACE FUNCTION public.user_owns_document(document_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- For now, return true for authenticated users
  -- In production, you'd check against a user_id column
  RETURN auth.role() IN ('authenticated', 'service_role');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can access document (for future use)
CREATE OR REPLACE FUNCTION public.can_access_document(document_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- For demo purposes, allow all authenticated users
  -- In production, implement proper access control logic
  RETURN auth.role() IN ('authenticated', 'service_role', 'anon');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to safely get current user info
CREATE OR REPLACE FUNCTION public.get_current_user_info()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'user_id', auth.user_id(),
    'role', auth.role(),
    'email', auth.jwt() ->> 'email',
    'is_anonymous', auth.role() = 'anon'
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.user_owns_document(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_document(UUID) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.get_current_user_info() TO authenticated, service_role, anon;

-- Create audit log table for security events (optional)
CREATE TABLE IF NOT EXISTS public.security_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(50) NOT NULL,
    user_id UUID,
    user_email TEXT,
    resource_type VARCHAR(50),
    resource_id UUID,
    action VARCHAR(50),
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only service role can read/write audit logs
CREATE POLICY "Service role only access to audit log" ON public.security_audit_log
  FOR ALL USING (auth.role() = 'service_role');

-- Create audit logging function
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type VARCHAR(50),
  p_resource_type VARCHAR(50) DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_action VARCHAR(50) DEFAULT NULL,
  p_details JSONB DEFAULT '{}'::JSONB
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    event_type,
    user_id,
    user_email,
    resource_type,
    resource_id,
    action,
    details,
    created_at
  ) VALUES (
    p_event_type,
    auth.user_id(),
    auth.jwt() ->> 'email',
    p_resource_type,
    p_resource_id,
    p_action,
    p_details,
    NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.log_security_event(VARCHAR, VARCHAR, UUID, VARCHAR, JSONB) TO authenticated, service_role;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_security_audit_log_event_type ON public.security_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON public.security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_created_at ON public.security_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_resource ON public.security_audit_log(resource_type, resource_id);

-- Comment to document the security model
COMMENT ON TABLE public.documents IS 'Documents table with RLS enabled. Currently allows public read access for demo purposes.';
COMMENT ON TABLE public.security_audit_log IS 'Security audit log for tracking access and modifications.';

COMMENT ON FUNCTION public.get_current_user_info() IS 'Returns current user information for debugging and logging purposes.';
COMMENT ON FUNCTION public.log_security_event(VARCHAR, VARCHAR, UUID, VARCHAR, JSONB) IS 'Logs security events for audit trail.';