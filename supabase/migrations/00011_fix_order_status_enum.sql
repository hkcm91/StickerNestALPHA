-- Migration 00011: Fix order_status enum — add missing values
--
-- The order_status enum (created in 00008) is missing 'refund_requested' which
-- is written by both checkout-integration.ts and the request-refund edge function.
-- Without this value, those UPDATE statements fail at the Postgres level.

ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'refund_requested';
