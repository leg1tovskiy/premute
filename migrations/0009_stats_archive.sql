create table if not exists stats_archive (
  month_key   text primary key,
  month_label text not null,
  payload     text not null,
  archived_at timestamptz not null default now()
);
