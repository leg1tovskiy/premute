-- Migration 0015: Staff caps and permissions columns

alter table staff add column if not exists is_banned boolean not null default false;
alter table staff add column if not exists steamid text;
alter table staff add column if not exists tag text;
alter table staff add column if not exists is_bot_owner boolean not null default false;
alter table staff add column if not exists can_logs boolean not null default false;
alter table staff add column if not exists can_power boolean not null default false;
alter table staff add column if not exists role_rank integer;
