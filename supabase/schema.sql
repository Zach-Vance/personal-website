-- Schema snapshot for the portfolio-analytics project. Hosted changes use apply_migration.
create table public.ai_api_calls (
  id uuid primary key,
  created_at timestamptz not null default now(),
  duration_ms integer not null check (duration_ms >= 0),
  status smallint not null check (status between 100 and 599),
  outcome text not null check (length(outcome) <= 64),
  api_version text check (length(api_version) <= 16),
  kind text check (length(kind) <= 32),
  provider text check (length(provider) <= 64),
  model text check (length(model) <= 128),
  source_ids text[] not null default '{}' check (cardinality(source_ids) <= 32),
  question text check (length(question) <= 600),
  response text check (length(response) <= 16000),
  history_count smallint not null default 0 check (history_count between 0 and 4),
  accepted boolean,
  citations_valid boolean,
  provider_completed boolean
);
alter table public.ai_api_calls enable row level security;
revoke all on table public.ai_api_calls from public, anon, authenticated;
grant select, insert on table public.ai_api_calls to service_role;
-- No public policies. Only the authenticated ingestion function writes using its server key.
create index ai_api_calls_created_at_idx on public.ai_api_calls (created_at desc, id);
comment on table public.ai_api_calls is 'Private, best-effort redacted portfolio API logs. Not training labels. 14-day / 10000-row hourly cleanup.';

create extension if not exists pg_cron;
select cron.schedule('prune-portfolio-ai-calls', '17 * * * *', $job$
  delete from public.ai_api_calls where created_at < now() - interval '14 days';
  delete from public.ai_api_calls where id in (
    select id from public.ai_api_calls order by created_at desc, id offset 10000
  );
$job$);
