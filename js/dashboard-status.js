(() => {
    const element = document.getElementById('dashboardLastUpdated');
    if (!element || typeof supabaseClient === 'undefined') return;

    function formatDateTime(value) {
        if (!value) return '—';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '—';
        return new Intl.DateTimeFormat('pt-BR', {
            dateStyle: 'short',
            timeStyle: 'short'
        }).format(date);
    }

    async function loadLastUpdate() {
        const { data, error } = await supabaseClient
            .from('dashboard_status')
            .select('updated_at')
            .eq('id', 1)
            .maybeSingle();

        if (error) {
            console.warn('Última atualização indisponível. Rode a migração migracao_ultima_atualizacao.sql.', error);
            element.textContent = 'indisponível';
            element.closest('.dashboard-update-status')?.classList.add('unavailable');
            return;
        }

        element.textContent = formatDateTime(data?.updated_at);
        element.closest('.dashboard-update-status')?.classList.remove('unavailable');
    }

    document.addEventListener('DOMContentLoaded', loadLastUpdate);
    window.addEventListener('dashboard:data-updated', loadLastUpdate);
})();
