CREATE TABLE IF NOT EXISTS punishment_proofs (
  id TEXT PRIMARY KEY,
  record_id BIGINT NOT NULL,
  kind TEXT NOT NULL,
  proof_url TEXT NOT NULL,
  comment TEXT,
  author_user_id TEXT,
  author_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS punishment_proofs_lookup_idx ON punishment_proofs (kind, record_id);
