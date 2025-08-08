-- Seed file for ESOP Analyzer Supabase setup
-- This creates initial data and storage buckets

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', false)
ON CONFLICT DO NOTHING;

-- Create vector index for document chunks (after initial migration)
-- This will be created when data is actually inserted
-- CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding 
-- ON public.document_chunks USING ivfflat (embedding vector_cosine_ops);

-- Insert some initial test data (optional - remove in production)
-- This helps verify the setup is working

DO $$
DECLARE
    test_doc_id UUID;
BEGIN
    -- Only insert test data if no documents exist
    IF NOT EXISTS (SELECT 1 FROM public.documents LIMIT 1) THEN
        -- Create test document
        INSERT INTO public.documents (
            id,
            filename,
            file_path,
            content_text,
            metadata,
            processed_at
        ) VALUES (
            gen_random_uuid(),
            'test-setup-document.pdf',
            'test/setup/test-setup-document.pdf',
            'This is a test document created during Supabase setup to verify the schema is working correctly.',
            jsonb_build_object(
                'test', true,
                'setup_verification', true,
                'created_by', 'supabase_setup'
            ),
            NOW()
        ) RETURNING id INTO test_doc_id;

        -- Create test processing job
        INSERT INTO public.processing_jobs (
            document_id,
            status,
            job_type,
            progress,
            result
        ) VALUES (
            test_doc_id,
            'completed',
            'setup_verification',
            100,
            jsonb_build_object(
                'message', 'Setup verification completed successfully',
                'timestamp', NOW()
            )
        );

        -- Create test metrics
        INSERT INTO public.extracted_metrics (
            document_id,
            metric_type,
            metric_value,
            metric_data,
            confidence_score
        ) VALUES (
            test_doc_id,
            'setup_test',
            'success',
            jsonb_build_object(
                'verification', 'passed',
                'setup_time', NOW()
            ),
            1.0
        );

        -- Create test AI metrics cache
        INSERT INTO public.ai_metrics_cache (
            document_id,
            ai_metrics
        ) VALUES (
            test_doc_id,
            jsonb_build_object(
                'setup_verification', true,
                'status', 'completed',
                'message', 'Supabase setup completed successfully'
            )
        );

        -- Log setup completion
        INSERT INTO public.security_audit_log (
            event_type,
            resource_type,
            resource_id,
            action,
            details
        ) VALUES (
            'SETUP_COMPLETED',
            'system',
            test_doc_id,
            'initial_setup',
            jsonb_build_object(
                'message', 'Supabase schema setup completed',
                'test_document_created', true,
                'timestamp', NOW()
            )
        );

        RAISE NOTICE 'Test data inserted successfully for setup verification';
    ELSE
        RAISE NOTICE 'Documents table already contains data, skipping test data insertion';
    END IF;
END $$;

-- Display setup completion message
DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'ESOP Analyzer Supabase Setup Complete!';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Schema created with tables:';
    RAISE NOTICE '- documents (main document storage)';
    RAISE NOTICE '- document_chunks (text chunks with embeddings)';
    RAISE NOTICE '- extracted_metrics (extracted data metrics)';
    RAISE NOTICE '- ai_metrics_cache (AI analysis cache)';
    RAISE NOTICE '- processing_jobs (background job tracking)';
    RAISE NOTICE '- security_audit_log (security event logging)';
    RAISE NOTICE '';
    RAISE NOTICE 'Storage bucket created:';
    RAISE NOTICE '- documents (for PDF file storage)';
    RAISE NOTICE '';
    RAISE NOTICE 'Row Level Security enabled with demo policies';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Configure your application environment variables';
    RAISE NOTICE '2. Set up storage policies in Supabase dashboard';
    RAISE NOTICE '3. Test the integration with your application';
    RAISE NOTICE '===========================================';
END $$;