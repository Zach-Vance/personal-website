-- Heuristic intent only: this does not identify visitors or prove employer status.
alter table public.ai_api_calls add column possible_hiring_interest boolean generated always as (
  coalesce(question ~* '\m(hire|hiring|hite|recruiter|recruiting|recruitment|interview|interviews|availability|resume|résumé|cv|candidate|candidates|opportunity|opportunities)\M|\m(role|job|team)\M.{0,24}\m(fit|available|availability)\M|\m(contact|reach)\M.{0,24}\m(zach|him|you)\M', false)
) stored;
create index ai_api_calls_hiring_interest_idx on public.ai_api_calls (created_at desc) where possible_hiring_interest;
comment on column public.ai_api_calls.possible_hiring_interest is 'Keyword heuristic for private review; does not identify people or establish employer intent.';
