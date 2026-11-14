-- Storage-first retention: three calendar months unless the row/byte budget fills first.
alter table public.ai_api_calls add column estimated_bytes integer generated always as (
  512 + 2 * (coalesce(octet_length(question), 0) + coalesce(octet_length(response), 0))
) stored;
alter table public.ai_api_calls set (autovacuum_vacuum_scale_factor = 0.05, autovacuum_analyze_scale_factor = 0.05);
create schema if not exists portfolio_private;
revoke all on schema portfolio_private from public, anon, authenticated, service_role;

create function portfolio_private.prune_ai_calls() returns bigint
language plpgsql security invoker set search_path = '' as $function$
declare removed_count bigint;
begin
  with ranked as materialized (
    select id, created_at,
      row_number() over (order by created_at desc, id) as keep_rank,
      sum(estimated_bytes) over (order by created_at desc, id rows unbounded preceding) as keep_bytes
    from public.ai_api_calls
  ), removed as (
    delete from public.ai_api_calls as calls using ranked
    where calls.id = ranked.id and (
      ranked.created_at < now() - interval '3 months'
      or ranked.keep_rank > 100000
      or ranked.keep_bytes > 157286400
    ) returning 1
  ) select count(*) into removed_count from removed;
  return removed_count;
end;
$function$;
revoke all on function portfolio_private.prune_ai_calls() from public, anon, authenticated, service_role;
select cron.schedule('prune-portfolio-ai-calls', '17 * * * *', 'select portfolio_private.prune_ai_calls();');
comment on table public.ai_api_calls is 'Private redacted API logs, not training labels. Hourly cleanup keeps at most 3 calendar months, 100000 rows, and 150 MiB estimated live data; oldest logs expire early under storage pressure.';
