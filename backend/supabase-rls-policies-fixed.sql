-- Fixed Row Level Security Policies for Supabase
-- Run these after the main schema setup
-- This version uses Supabase's built-in auth functions

-- Enable RLS on all tables
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracted_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_metrics_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_jobs ENABLE ROW LEVEL SECURITY;

-- Documents table policies
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.documents;

-- Policy: Allow public read access for demo purposes
-- In production, you'd want to restrict by user ownership
CREATE POLICY "Allow public read access to documents" ON public.documents
  FOR SELECT USING (true);

-- Policy: Allow authenticated users to insert documents
CREATE POLICY "Allow authenticated insert documents" ON public.documents
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL OR 
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Policy: Allow authenticated users to update documents
CREATE POLICY "Allow authenticated update documents" ON public.documents
  FOR UPDATE USING (
    auth.uid() IS NOT NULL OR 
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Policy: Only service role can delete documents
CREATE POLICY "Allow service role delete documents" ON public.documents
  FOR DELETE USING (
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Document chunks policies
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.document_chunks;

CREATE POLICY "Allow public read document chunks" ON public.document_chunks
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert chunks" ON public.document_chunks
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL OR 
    auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "Allow authenticated update chunks" ON public.document_chunks
  FOR UPDATE USING (
    auth.uid() IS NOT NULL OR 
    auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "Allow service role delete chunks" ON public.document_chunks
  FOR DELETE USING (
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Extracted metrics policies
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.extracted_metrics;

CREATE POLICY "Allow public read metrics" ON public.extracted_metrics
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert metrics" ON public.extracted_metrics
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL OR 
    auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "Allow authenticated update metrics" ON public.extracted_metrics
  FOR UPDATE USING (
    auth.uid() IS NOT NULL OR 
    auth.jwt() ->> 'role' = 'service_role'
  );

-- AI metrics cache policies
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.ai_metrics_cache;

CREATE POLICY "Allow public read AI metrics" ON public.ai_metrics_cache
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated upsert AI metrics" ON public.ai_metrics_cache
  FOR ALL USING (
    auth.uid() IS NOT NULL OR 
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Processing jobs policies
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.processing_jobs;

CREATE POLICY "Allow public read jobs" ON public.processing_jobs
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert jobs" ON public.processing_jobs
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL OR 
    auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "Allow authenticated update jobs" ON public.processing_jobs
  FOR UPDATE USING (
    auth.uid() IS NOT NULL OR 
    auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "Allow service role delete jobs" ON public.processing_jobs
  FOR DELETE USING (
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Storage policies for documents bucket
-- Note: These need to be run in the Supabase dashboard under Storage > Policies

-- First, make sure the bucket exists (run this in Storage section)
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('documents', 'documents', false)
-- ON CONFLICT DO NOTHING;

-- Then create these policies in Storage > documents bucket > Policies:

-- Policy 1: Allow public uploads (you can restrict this later)
-- CREATE POLICY "Allow public uploads" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'documents');

-- Policy 2: Allow public downloads (for demo)
-- CREATE POLICY "Allow public downloads" ON storage.objects
--   FOR SELECT USING (bucket_id = 'documents');

-- Policy 3: Allow authenticated updates
-- CREATE POLICY "Allow authenticated updates" ON storage.objects
--   FOR UPDATE USING (bucket_id = 'documents' AND auth.uid() IS NOT NULL);

-- Policy 4: Allow service role to delete
-- CREATE POLICY "Allow service role delete" ON storage.objects
--   FOR DELETE USING (bucket_id = 'documents' AND auth.jwt() ->> 'role' = 'service_role');

-- Create helper functions in public schema (not auth schema)
CREATE OR REPLACE FUNCTION public.get_current_user_info()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'user_id', auth.uid(),
    'role', auth.jwt() ->> 'role',
    'email', auth.jwt() ->> 'email',
    'is_anonymous', auth.uid() IS NULL
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can access document (for future use)
CREATE OR REPLACE FUNCTION public.can_access_document(document_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- For demo purposes, allow all users (authenticated or anonymous)
  -- In production, implement proper access control logic
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- Only service role can access audit logs
CREATE POLICY "Service role access audit log" ON public.security_audit_log
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

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
    auth.uid(),
    auth.jwt() ->> 'email',
    p_resource_type,
    p_resource_id,
    p_action,
    p_details,
    NOW()
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Silently fail if audit logging fails (don't break main functionality)
    NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.can_access_document(UUID) TO public;
GRANT EXECUTE ON FUNCTION public.get_current_user_info() TO public;
GRANT EXECUTE ON FUNCTION public.log_security_event(VARCHAR, VARCHAR, UUID, VARCHAR, JSONB) TO public;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_security_audit_log_event_type ON public.security_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON public.security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_created_at ON public.security_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_resource ON public.security_audit_log(resource_type, resource_id);

-- Add helpful comments
COMMENT ON TABLE public.documents IS 'Documents table with RLS enabled. Currently allows public read access for demo purposes.';
COMMENT ON TABLE public.security_audit_log IS 'Security audit log for tracking access and modifications. Only accessible by service role.';
COMMENT ON FUNCTION public.get_current_user_info() IS 'Returns current user information for debugging and logging purposes.';
COMMENT ON FUNCTION public.log_security_event(VARCHAR, VARCHAR, UUID, VARCHAR, JSONB) IS 'Logs security events for audit trail. Fails silently if logging fails.';