-- A4.2: permite que os Agentes IA (function calling) marquem um criativo como vencedor.
alter table public.creatives
  add column if not exists is_winner boolean not null default false;
