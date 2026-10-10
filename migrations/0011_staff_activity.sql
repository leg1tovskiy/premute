-- Activity tab attached to stats, requires can_activity capability
alter table staff add column if not exists can_activity boolean not null default false;
