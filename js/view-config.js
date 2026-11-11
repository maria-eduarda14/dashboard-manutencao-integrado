(() => {
    const DEFAULTS = {
        overview: {
            titulo: 'Visão geral',
            subtitulo: 'Resumo atual das notas de manutenção de embalagem.'
        },
        distribution: {
            titulo: 'Distribuição das notas por linha',
            subtitulo: 'Visualize a distribuição das notas amarelas, vermelhas e ND por linha.'
        },
        status: {
            titulo: 'Situação por linha',
            subtitulo: 'Escolha uma linha para visualizar seus indicadores e informações.'
        },
        details: {
            titulo: 'Detalhamento por linha',
            subtitulo: 'Consulte os valores de cada classificação em todas as linhas.'
        },
        trends: {
            titulo: 'Gráfico de tendências',
            subtitulo: 'Acompanhe a evolução das notas ao longo das medições registradas.'
        },
        'action-plan': {
            titulo: 'Plano de ação',
            subtitulo: 'Visualização do plano de ação mais recente disponibilizado pela administração.'
        }
    };

    const MENU_LABELS = {
        overview: 'Visão geral',
        distribution: 'Distribuição',
        status: 'Situação por linha',
        details: 'Detalhamento',
        trends: 'Gráfico de tendências',
        'action-plan': 'Plano de ação'
    };

    const config = structuredClone(DEFAULTS);

    function applyView(key) {
        const item = config[key] || DEFAULTS[key];
        if (!item) return;

        document.querySelectorAll(`[data-view-title="${key}"]`).forEach(el => {
            el.textContent = item.titulo;
        });

        document.querySelectorAll(`[data-view-subtitle="${key}"]`).forEach(el => {
            el.textContent = item.subtitulo || '';
            el.hidden = !item.subtitulo;
        });

        document.querySelectorAll(`[data-view-target="${key}"] .sidebar-label`).forEach(el => {
            el.textContent = MENU_LABELS[key] || item.titulo;
        });
    }

    function applyAll() {
        Object.keys(DEFAULTS).forEach(applyView);
    }

    async function loadConfig() {
        applyAll();

        try {
            const { data, error } = await supabaseClient
                .from('dashboard_view_config')
                .select('view_key,titulo,subtitulo');

            if (error) throw error;

            (data || []).forEach(row => {
                if (!DEFAULTS[row.view_key]) return;
                config[row.view_key] = {
                    titulo: row.titulo || DEFAULTS[row.view_key].titulo,
                    subtitulo: row.subtitulo ?? DEFAULTS[row.view_key].subtitulo
                };
            });

            applyAll();
        } catch (error) {
            console.warn('Não foi possível carregar os títulos personalizados das abas:', error);
        }
    }

    async function editTitle(key) {
        const current = config[key] || DEFAULTS[key];
        if (!current) return;

        const values = await uiFormModal({
            title: 'Editar título',
            fields: [
                { name: 'title', label: 'Título da seção', type: 'text', value: current.titulo, maxLength: 100, required: true }
            ]
        });
        if (!values) return;

        const payload = {
            view_key: key,
            titulo: values.title.trim(),
            subtitulo: current.subtitulo || '',
            updated_at: new Date().toISOString()
        };

        const { error } = await supabaseClient
            .from('dashboard_view_config')
            .upsert(payload, { onConflict: 'view_key' });

        if (error) {
            alert(`Não foi possível salvar: ${error.message}`);
            return;
        }

        config[key].titulo = payload.titulo;
        applyView(key);
    }

    async function editSubtitle(key) {
        const current = config[key] || DEFAULTS[key];
        if (!current) return;

        const values = await uiFormModal({
            title: 'Editar subtítulo',
            fields: [
                { name: 'subtitle', label: 'Subtítulo / descrição', type: 'textarea', rows: 3, value: current.subtitulo || '', maxLength: 300 }
            ]
        });
        if (!values) return;

        const payload = {
            view_key: key,
            titulo: current.titulo,
            subtitulo: values.subtitle.trim(),
            updated_at: new Date().toISOString()
        };

        const { error } = await supabaseClient
            .from('dashboard_view_config')
            .upsert(payload, { onConflict: 'view_key' });

        if (error) {
            alert(`Não foi possível salvar: ${error.message}`);
            return;
        }

        config[key].subtitulo = payload.subtitulo;
        applyView(key);
    }

    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('[data-edit-view-title]').forEach(button => {
            button.addEventListener('click', () => editTitle(button.dataset.editViewTitle));
        });

        document.querySelectorAll('[data-edit-view-subtitle]').forEach(button => {
            button.addEventListener('click', () => editSubtitle(button.dataset.editViewSubtitle));
        });

        loadConfig();
    });
})();
