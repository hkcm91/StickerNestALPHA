CREATE TYPE api_key_provider AS ENUM (
    'replicate',
    'openai',
    'anthropic',
    'custom'
);

CREATE TYPE api_key_status AS ENUM (
    'active',
    'invalid',
    'pending'
);;
