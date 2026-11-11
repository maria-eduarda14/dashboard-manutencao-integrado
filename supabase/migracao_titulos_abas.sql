-- ============================================================
-- TÍTULOS E SUBTÍTULOS EDITÁVEIS DAS ABAS
-- Execute UMA VEZ no SQL Editor do Supabase principal do dashboard.
-- Não altera nem apaga os dados atuais.
-- ============================================================

create table if not exists public.dashboard_view_config (
    view_key text primary key check (
        view_key in (
            'overview',
            'distribution',
            'status',
            'details',
            'trends',
            'action-plan'
        )
    ),
    titulo text not null check (char_length(btrim(titulo)) between 1 and 100),
    subtitulo text not null default '' check (char_length(subtitulo) <= 300),
    updated_at timestamptz not null default now()
);

alter table public.dashboard_view_config enable row level security;

drop policy if exists "Leitura publica configuracao abas" on public.dashboard_view_config;
create policy "Leitura publica configuracao abas"
on public.dashboard_view_config
for select
to anon, authenticated
using (true);

drop policy if exists "Autenticado insere configuracao abas" on public.dashboard_view_config;
create policy "Autenticado insere configuracao abas"
on public.dashboard_view_config
for insert
to authenticated
with check (auth.uid() is not null);

drop policy if exists "Autenticado atualiza configuracao abas" on public.dashboard_view_config;
create policy "Autenticado atualiza configuracao abas"
on public.dashboard_view_config
for update
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

insert into public.dashboard_view_config (view_key, titulo, subtitulo) values
    ('overview', 'Visão geral', 'Resumo atual das notas de manutenção de embalagem.'),
    ('distribution', 'Distribuição das notas por linha', 'Visualize a distribuição das notas amarelas, vermelhas e ND por linha.'),
    ('status', 'Situação por linha', 'Escolha uma linha para visualizar seus indicadores e informações.'),
    ('details', 'Detalhamento por linha', 'Consulte os valores de cada classificação em todas as linhas.'),
    ('trends', 'Gráfico de tendências', 'Acompanhe a evolução das notas ao longo das medições registradas.'),
    ('action-plan', 'Plano de ação', 'Visualização do plano de ação mais recente disponibilizado pela administração.')
on conflict (view_key) do nothing;
