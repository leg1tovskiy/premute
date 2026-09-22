-- Suspicious tab detached from stats — manual grant via admin
alter table staff add column if not exists can_suspicious boolean not null default false;
