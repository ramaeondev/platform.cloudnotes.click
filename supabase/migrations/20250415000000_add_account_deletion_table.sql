-- Create a table to track account deletion requests
CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    scheduled_deletion_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_processed BOOLEAN DEFAULT false NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_account_deletion_user_id ON public.account_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_account_deletion_scheduled ON public.account_deletion_requests(scheduled_deletion_at)
WHERE NOT is_processed;

-- Add RLS policies
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Only service role can read this table
CREATE POLICY "Service role can view account_deletion_requests"
ON public.account_deletion_requests
FOR SELECT
USING (auth.role() = 'service_role');

-- Only service role can insert to this table
CREATE POLICY "Service role can insert account_deletion_requests"
ON public.account_deletion_requests
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- Only service role can update this table
CREATE POLICY "Service role can update account_deletion_requests"
ON public.account_deletion_requests
FOR UPDATE
USING (auth.role() = 'service_role');

-- Comment on table and columns for better documentation
COMMENT ON TABLE public.account_deletion_requests IS 'Table to track users who have requested account deletion';
COMMENT ON COLUMN public.account_deletion_requests.user_id IS 'The ID of the user requesting deletion';
COMMENT ON COLUMN public.account_deletion_requests.scheduled_deletion_at IS 'The timestamp when the account should be permanently deleted';
COMMENT ON COLUMN public.account_deletion_requests.is_processed IS 'Whether the deletion has been processed';

-- Grant access to service role
GRANT ALL ON public.account_deletion_requests TO service_role; 