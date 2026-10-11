-- Dismissed/handled accounts in suspicious view
create table if not exists suspicious_dismissed (
  steamid text primary key,
  nickname text,
  dismissed_by text,
  dismissed_by_name text,
  dismissed_at timestamptz not null default now(),
  reason text
);
