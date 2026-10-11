-- Migration 0013: add role_rank to staff table for persistent staff roles
alter table staff add column if not exists role_rank integer;
