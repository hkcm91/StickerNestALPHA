-- Stock management RPC for atomic increment/release
CREATE OR REPLACE FUNCTION increment_stock(item_id UUID, amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE shop_items
    SET stock_count = stock_count + amount
    WHERE id = item_id
      AND stock_count IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a user has an active API key for a provider
CREATE OR REPLACE FUNCTION has_active_api_key(
    p_user_id UUID,
    p_provider api_key_provider
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_api_keys
        WHERE user_id = p_user_id
        AND provider = p_provider
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get decrypted API key (only callable by edge functions via service role)
CREATE OR REPLACE FUNCTION get_decrypted_api_key(
    p_user_id UUID,
    p_provider api_key_provider
) RETURNS TABLE (
    id UUID,
    key_value TEXT,
    custom_base_url TEXT,
    custom_header_name TEXT,
    custom_header_prefix TEXT
) AS $$
DECLARE
    v_secret TEXT;
BEGIN
    v_secret := current_setting('app.api_key_secret', true);

    IF v_secret IS NULL OR v_secret = '' THEN
        RAISE EXCEPTION 'API key secret not configured';
    END IF;

    RETURN QUERY
    SELECT
        uak.id,
        pgp_sym_decrypt(uak.encrypted_key, v_secret)::TEXT,
        uak.custom_base_url,
        uak.custom_header_name,
        uak.custom_header_prefix
    FROM user_api_keys uak
    WHERE uak.user_id = p_user_id
    AND uak.provider = p_provider
    AND uak.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update last_used_at timestamp
CREATE OR REPLACE FUNCTION update_api_key_last_used(
    p_key_id UUID
) RETURNS VOID AS $$
BEGIN
    UPDATE user_api_keys
    SET last_used_at = NOW()
    WHERE id = p_key_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;;
