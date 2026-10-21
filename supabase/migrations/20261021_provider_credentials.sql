-- Owner-managed upstream provider credentials. Values are encrypted by the
-- application before they reach Postgres and this table has no client policies.
CREATE TABLE IF NOT EXISTS provider_credentials (
    provider TEXT PRIMARY KEY,
    cipher_text TEXT NOT NULL,
    iv TEXT NOT NULL,
    auth_tag TEXT NOT NULL,
    key_version TEXT NOT NULL,
    masked_key TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE provider_credentials ENABLE ROW LEVEL SECURITY;
