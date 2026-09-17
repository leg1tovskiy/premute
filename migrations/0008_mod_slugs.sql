create table if not exists mod_slugs (
  steamid text primary key,
  slug text not null unique,
  created_at timestamptz not null default now()
);
