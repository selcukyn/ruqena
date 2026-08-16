-- Grant necessary DCL privileges to the authenticated role for push_subscriptions table
-- Fixes "permission denied for table push_subscriptions" error caused by previous REVOKE ALL.
-- UPDATE privilege is not granted as it is not used by the client application.

GRANT SELECT, INSERT, DELETE ON TABLE public.push_subscriptions TO authenticated;
