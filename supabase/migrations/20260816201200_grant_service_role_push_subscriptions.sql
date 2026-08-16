-- Grant necessary DCL privileges to the service_role for push_subscriptions table
-- Fixes "permission denied for table push_subscriptions" error during API push

GRANT SELECT ON TABLE public.push_subscriptions TO service_role;
