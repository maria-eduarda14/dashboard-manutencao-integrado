-- Registra a data/hora real da última alteração relevante do dashboard.
-- Execute uma vez no SQL Editor do Supabase principal.

create table if not exists public.dashboard_status (
    id integer primary key check (id = 1),
    updated_at timestamptz not null default now()
);

insert into public.dashboard_status (id, updated_at)
values (1, now())
on conflict (id) do nothing;

alter table public.dashboard_status enable row level security;

drop policy if exists "dashboard_status_public_read" on public.dashboard_status;
create policy "dashboard_status_public_read"
on public.dashboard_status
for select
to anon, authenticated
using (true);

create or replace function public.touch_dashboard_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.dashboard_status (id, updated_at)
    values (1, now())
    on conflict (id) do update set updated_at = excluded.updated_at;
    return coalesce(new, old);
end;
$$;

-- Cria o mesmo trigger apenas nas tabelas que existirem neste projeto.
do $$
declare
    tbl text;
begin
    foreach tbl in array array[
        'painel_notas',
        'painel_notas_info',
        'tendencia_notas',
        'dashboard_card_config',
        'dashboard_view_config'
    ]
    loop
        if to_regclass('public.' || tbl) is not null then
            execute format('drop trigger if exists dashboard_status_touch on public.%I', tbl);
            execute format(
                'create trigger dashboard_status_touch after insert or update or delete on public.%I for each statement execute function public.touch_dashboard_status()',
                tbl
            );
        end if;
    end loop;
end;
$$;
