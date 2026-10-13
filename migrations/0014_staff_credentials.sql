-- Migration 0014: Staff login credentials (username + password)

alter table staff add column if not exists username text;
alter table staff add column if not exists password_hash text;
alter table staff add column if not exists created_by text;

create unique index if not exists staff_username_lower_uidx
  on staff (lower(username))
  where username is not null;
