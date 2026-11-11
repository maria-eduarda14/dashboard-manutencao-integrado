
(() => {
    const IS_ADMIN = Boolean(document.getElementById('trendAddBtn'));
    const CARD_DEFAULTS = {
        geral: { titulo: 'Meta', complemento: 'para atingir a meta de 85%' },
        amarela: { titulo: 'Redução Notas Amarelas', complemento: '' },
        vermelha: { titulo: 'Redução Notas Vermelhas', complemento: '' },
        nd: { titulo: 'Redução Notas ND', complemento: '' }
    };


    const trendValueLabelsPlugin = {
        id: 'trendValueLabels',
        afterDatasetsDraw(chart) {
            const { ctx } = chart;
            ctx.save();
            ctx.fillStyle = '#2f3b45';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.font = '700 12px Arial, sans-serif';

            chart.data.datasets.forEach((dataset, datasetIndex) => {
                const meta = chart.getDatasetMeta(datasetIndex);
                if (meta.hidden) return;

                meta.data.forEach((element, index) => {
                    const value = Number(dataset.data[index]);
                    if (!Number.isFinite(value)) return;

                    const props = element.getProps(['x', 'y'], true);
                    let y = props.y - 6;

                    // Dá mais espaço para os valores da linha de tendência.
                    if (dataset.type === 'line') {
                        y -= 4;
                    }

                    ctx.fillText(String(value), props.x, y);
                });
            });

            ctx.restore();
        }
    };

    let trendRecords = [];
    let trendChart = null;
    let actionPlanPreviewUrl = null;
    let trendCardConfig = structuredClone(CARD_DEFAULTS);

    const $ = id => document.getElementById(id);
    const number = value => Number(value || 0);

    function brDate(iso) {
        if (!iso) return '';
        const [y, m, d] = iso.split('-');
        return `${d}/${m}/${y}`;
    }

    function pct(value) {
        return `${value.toFixed(2).replace('.', ',')}%`;
    }

    function evolution(initial, current) {
        if (initial === 0) return current === 0 ? 0 : null;
        return ((initial - current) / initial) * 100;
    }

    function accumulatedReduction(values) {
        if (!values?.length) {
            return { percentage: null, reductions: 0, accumulated: 0, additions: 0 };
        }

        const initial = number(values[0]);
        let additions = 0;
        let reductions = 0;

        for (let i = 1; i < values.length; i++) {
            const previous = number(values[i - 1]);
            const current = number(values[i]);
            const delta = current - previous;

            if (delta > 0) additions += delta;
            if (delta < 0) reductions += Math.abs(delta);
        }

        const accumulated = initial + additions;
        const percentage = accumulated > 0
            ? (reductions / accumulated) * 100
            : null;

        return { percentage, reductions, accumulated, additions };
    }

    function setAccumulatedEvolution(valueId, detailId, values) {
        const valueEl = $(valueId);
        const detailEl = $(detailId);
        if (!valueEl || !detailEl) return;

        const result = accumulatedReduction(values);
        valueEl.classList.remove('good', 'bad', 'neutral');

        if (result.percentage === null) {
            valueEl.textContent = 'Não calculável';
            valueEl.classList.add('neutral');
            detailEl.textContent = 'Sem base suficiente para cálculo';
            return;
        }

        valueEl.textContent = `↓ ${pct(result.percentage)}`;
        valueEl.classList.add(result.percentage > 0 ? 'good' : 'neutral');
        detailEl.textContent = `${result.reductions} notas reduzidas de ${result.accumulated} totalizadas`;
    }

    function completionMeta(records, meta = 85) {
        if (!records.length) return null;
        const totals = records.map(r => number(r.amarela) + number(r.vermelha) + number(r.nd));
        const initial = totals[0];
        let entries = 0;
        let completions = 0;
        for (let i = 1; i < totals.length; i++) {
            const delta = totals[i] - totals[i - 1];
            if (delta > 0) entries += delta;
            if (delta < 0) completions += -delta;
        }
        const accumulated = initial + entries;
        const completedPct = accumulated > 0 ? completions / accumulated * 100 : null;
        return completedPct === null ? null : Math.max(0, meta - completedPct);
    }

    function applyCardConfig() {
        const ids = {
            geral: ['trendTitleGeral', 'trendComplementGeral'],
            amarela: ['trendTitleAmarela', 'trendComplementAmarela'],
            vermelha: ['trendTitleVermelha', 'trendComplementVermelha'],
            nd: ['trendTitleNd', 'trendComplementNd']
        };
        Object.entries(ids).forEach(([key, [titleId, complementId]]) => {
            const cfg = trendCardConfig[key] || CARD_DEFAULTS[key];
            const title = $(titleId);
            const complement = $(complementId);
            if (title) title.textContent = cfg.titulo;
            if (complement) {
                complement.textContent = cfg.complemento || '';
                complement.hidden = !cfg.complemento;
            }
        });
    }

    async function loadTrendData() {
        const [{ data: records, error: recordsError }, { data: config, error: configError }] = await Promise.all([
            supabaseClient.from('tendencia_notas').select('id,data,amarela,vermelha,nd').order('data', { ascending: true }),
            supabaseClient.from('dashboard_card_config').select('card_key,titulo,complemento')
        ]);

        if (recordsError) throw recordsError;
        trendRecords = records || [];

        if (!configError) {
            trendCardConfig = structuredClone(CARD_DEFAULTS);
            (config || []).forEach(item => {
                if (trendCardConfig[item.card_key]) {
                    trendCardConfig[item.card_key] = {
                        titulo: item.titulo,
                        complemento: item.complemento || ''
                    };
                }
            });
        }

        renderTrend();
    }

    function renderTrend() {
        applyCardConfig();

        const empty = $('trendEmpty');
        if (empty) empty.hidden = trendRecords.length > 0;

        if (!trendRecords.length) {
            ['Geral', 'Amarela', 'Vermelha', 'Nd'].forEach(key => {
                const value = $(`trendValue${key}`);
                const detail = $(`trendDetail${key}`);
                if (value) value.textContent = '—';
                if (detail) detail.textContent = 'Sem dados cadastrados';
            });
            if (trendChart) {
                trendChart.destroy();
                trendChart = null;
            }
            renderTrendTable();
            return;
        }

        const yellow = trendRecords.map(r => number(r.amarela));
        const red = trendRecords.map(r => number(r.vermelha));
        const nd = trendRecords.map(r => number(r.nd));
        const totals = trendRecords.map((r, i) => yellow[i] + red[i] + nd[i]);

        const missing = completionMeta(trendRecords);
        const metaValue = $('trendValueGeral');
        const metaDetail = $('trendDetailGeral');
        if (metaValue) {
            metaValue.textContent = missing === null ? 'Não calculável' : pct(missing);
            metaValue.className = `trend-card-value ${missing === 0 ? 'good' : 'neutral'}`;
        }
        if (metaDetail) metaDetail.textContent = '';

        setAccumulatedEvolution('trendValueAmarela', 'trendDetailAmarela', yellow);
        setAccumulatedEvolution('trendValueVermelha', 'trendDetailVermelha', red);
        setAccumulatedEvolution('trendValueNd', 'trendDetailNd', nd);

        const canvas = $('trendChart');
        if (canvas && window.Chart) {
            if (trendChart) trendChart.destroy();

            trendChart = new Chart(canvas, {
                plugins: [trendValueLabelsPlugin],
                type: 'bar',
                data: {
                    labels: trendRecords.map(r => brDate(r.data)),
                    datasets: [
                        {
                            type: 'line',
                            label: 'Linha de Tendência',
                            data: totals,
                            borderColor: '#d93025',
                            backgroundColor: '#d93025',
                            borderWidth: 3,
                            borderDash: [8, 6],
                            pointRadius: 4,
                            pointHoverRadius: 6,
                            tension: .15,
                            fill: false,
                            order: 0
                        },
                        trendBar('Amarela', yellow, '#f4c20d'),
                        trendBar('Vermelha', red, '#e74c3c'),
                        trendBar('ND', nd, '#879295')
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: { boxWidth: 32, padding: 18, font: { size: 14 } }
                        },
                        tooltip: {
                            callbacks: {
                                footer(items) {
                                    return `Total: ${totals[items[0].dataIndex]}`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            title: { display: true, text: 'Data', font: { size: 14 } },
                            ticks: { font: { size: 12 } }
                        },
                        y: {
                            beginAtZero: true,
                            suggestedMax: 500,
                            ticks: { stepSize: 100, font: { size: 12 } },
                            title: { display: true, text: 'Quantidade de notas', font: { size: 14 } }
                        }
                    }
                }
            });
        }

        renderTrendTable();
    }

    function trendBar(label, data, color) {
        return {
            label,
            data,
            backgroundColor: color,
            borderColor: color,
            borderWidth: 1,
            borderRadius: 3,
            categoryPercentage: .72,
            barPercentage: .88,
            order: 1
        };
    }

    function showTrendNotice(message, type = 'success') {
        const el = $('trendAdminNotice') || $('trendError');
        if (!el) return;
        el.textContent = message;
        el.className = `integration-notice ${type}`;
        el.hidden = false;
        if (type !== 'error') setTimeout(() => { el.hidden = true; }, 4500);
    }

    function renderTrendTable() {
        if (!IS_ADMIN) return;
        const tbody = $('trendTableBody');
        const empty = $('trendTableEmpty');
        if (!tbody) return;
        tbody.innerHTML = '';
        if (empty) empty.hidden = trendRecords.length > 0;

        trendRecords.forEach(record => {
            const total = number(record.amarela) + number(record.vermelha) + number(record.nd);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${brDate(record.data)}</td>
                <td>${record.amarela}</td>
                <td>${record.vermelha}</td>
                <td>${record.nd}</td>
                <td><strong>${total}</strong></td>
                <td class="trend-actions">
                    <button type="button" class="trend-icon-btn edit-icon" data-trend-edit="${record.id}" title="Editar medição" aria-label="Editar medição">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/></svg>
                    </button>
                    <button type="button" class="trend-icon-btn delete-icon" data-trend-delete="${record.id}" title="Excluir medição" aria-label="Excluir medição">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M8 10v8M12 10v8M16 10v8M6 7l1 14h10l1-14"/></svg>
                    </button>
                </td>`;
            tbody.appendChild(tr);
        });

        tbody.querySelectorAll('[data-trend-edit]').forEach(btn => {
            btn.addEventListener('click', () => editMeasurement(btn.dataset.trendEdit));
        });
        tbody.querySelectorAll('[data-trend-delete]').forEach(btn => {
            btn.addEventListener('click', () => deleteMeasurement(btn.dataset.trendDelete));
        });
    }

    async function newMeasurement() {
        const values = await uiFormModal({
            title: 'Nova medição',
            description: 'Preencha os valores da nova medição.',
            fields: [
                { name: 'date', label: 'Data', type: 'date', required: true },
                { name: 'yellow', label: 'Notas Amarelas', type: 'number', min: 0, step: 1, value: 0, required: true },
                { name: 'red', label: 'Notas Vermelhas', type: 'number', min: 0, step: 1, value: 0, required: true },
                { name: 'nd', label: 'Notas ND', type: 'number', min: 0, step: 1, value: 0, required: true }
            ]
        });
        if (!values) return;

        const payload = {
            data: values.date,
            amarela: Math.max(0, Number(values.yellow) || 0),
            vermelha: Math.max(0, Number(values.red) || 0),
            nd: Math.max(0, Number(values.nd) || 0)
        };

        const { error } = await supabaseClient.from('tendencia_notas').insert(payload);
        if (error) return showTrendNotice(`Erro ao salvar: ${error.message}`, 'error');
        showTrendNotice('Medição adicionada.');
        await loadTrendData();
    }

    async function editMeasurement(id) {
        const record = trendRecords.find(r => String(r.id) === String(id));
        if (!record) return;

        const values = await uiFormModal({
            title: 'Editar medição',
            description: `Medição de ${brDate(record.data)}.`,
            fields: [
                { name: 'date', label: 'Data', type: 'date', value: record.data, required: true },
                { name: 'yellow', label: 'Notas Amarelas', type: 'number', min: 0, step: 1, value: record.amarela, required: true },
                { name: 'red', label: 'Notas Vermelhas', type: 'number', min: 0, step: 1, value: record.vermelha, required: true },
                { name: 'nd', label: 'Notas ND', type: 'number', min: 0, step: 1, value: record.nd, required: true }
            ]
        });
        if (!values) return;

        const { error } = await supabaseClient
            .from('tendencia_notas')
            .update({
                data: values.date,
                amarela: Math.max(0, Number(values.yellow) || 0),
                vermelha: Math.max(0, Number(values.red) || 0),
                nd: Math.max(0, Number(values.nd) || 0)
            })
            .eq('id', id);

        if (error) return showTrendNotice(`Erro ao atualizar: ${error.message}`, 'error');
        showTrendNotice('Medição atualizada.');
        await loadTrendData();
    }

    async function deleteMeasurement(id) {
        const record = trendRecords.find(r => String(r.id) === String(id));
        if (!record) return;

        const confirmed = await uiConfirmModal({
            title: 'Excluir medição',
            description: `Deseja excluir a medição de ${brDate(record.data)}?`,
            confirmText: 'Excluir',
            danger: true
        });
        if (!confirmed) return;

        const { error } = await supabaseClient.from('tendencia_notas').delete().eq('id', id);
        if (error) return showTrendNotice(`Erro ao excluir: ${error.message}`, 'error');
        showTrendNotice('Medição excluída.');
        await loadTrendData();
    }

    async function editTrendCard(key) {
        const current = trendCardConfig[key] || CARD_DEFAULTS[key];
        const values = await uiFormModal({
            title: `Editar card: ${current.titulo}`,
            description: 'Somente o título e o texto complementar são editáveis. Os valores são calculados automaticamente.',
            fields: [
                { name: 'title', label: 'Título do card', type: 'text', value: current.titulo, maxLength: 80, required: true },
                { name: 'complement', label: 'Texto complementar (opcional)', type: 'text', value: current.complemento || '', maxLength: 180 }
            ]
        });
        if (!values) return;

        const { error } = await supabaseClient.from('dashboard_card_config').upsert({
            card_key: key,
            titulo: values.title.trim(),
            complemento: values.complement.trim()
        }, { onConflict: 'card_key' });

        if (error) return showTrendNotice(`Erro ao salvar o card: ${error.message}`, 'error');
        showTrendNotice('Card atualizado.');
        await loadTrendData();
    }

    async function importOldTrendData() {
        if (!IS_ADMIN) return;
        const confirmed = await uiConfirmModal({
            title: 'Importar dados antigos',
            description: 'As medições e configurações do gráfico antigo serão copiadas para este dashboard. O banco antigo não será apagado.',
            confirmText: 'Importar'
        });
        if (!confirmed) return;

        const btn = $('trendImportBtn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Importando...';
        }

        try {
            const OLD_URL = 'https://mqjfmnjhxpjoaglravey.supabase.co';
            const OLD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xamZtbmpoeHBqb2FnbHJhdmV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0MTk3MTMsImV4cCI6MjEwNjk5NTcxM30.vIGN1SQmbLKucDbamWBJmJCDc1L_Gxoc9UUXs9Fxl4s';
            const source = window.supabase.createClient(OLD_URL, OLD_KEY, {
                auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
            });

            const [{ data: oldRecords, error: recordError }, { data: oldConfig, error: configError }] = await Promise.all([
                source.from('tendencia_notas').select('data,amarela,vermelha,nd').order('data'),
                source.from('dashboard_card_config').select('card_key,titulo,complemento')
            ]);

            if (recordError) throw recordError;
            if (oldRecords?.length) {
                const { error } = await supabaseClient
                    .from('tendencia_notas')
                    .upsert(oldRecords, { onConflict: 'data' });
                if (error) throw error;
            }

            if (!configError && oldConfig?.length) {
                const { error } = await supabaseClient
                    .from('dashboard_card_config')
                    .upsert(oldConfig, { onConflict: 'card_key' });
                if (error) throw error;
            }

            showTrendNotice(`Importação concluída: ${oldRecords?.length || 0} medições copiadas. O banco antigo permanece intacto.`);
            await loadTrendData();
        } catch (error) {
            console.error(error);
            showTrendNotice(`Não foi possível importar: ${error.message}`, 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Importar dados do gráfico antigo';
            }
        }
    }

    async function loadActionPlan() {
        const { data, error } = await supabaseClient
            .from('plano_acao')
            .select('id,image_path,updated_at')
            .eq('id', 1)
            .maybeSingle();

        if (error) {
            console.error('Erro ao carregar plano de ação:', error);
            return;
        }

        const image = $('actionPlanImage');
        const empty = $('actionPlanEmpty');
        const remove = $('actionPlanRemoveBtn');
        if (!image || !empty) return;

        image.classList.remove('is-preview');
        image.removeAttribute('data-preview');

        if (!data?.image_path) {
            image.removeAttribute('src');
            image.removeAttribute('data-path');
            image.alt = '';
            image.hidden = true;
            empty.hidden = false;
            if (remove) remove.hidden = true;
            return;
        }

        const { data: publicData } = supabaseClient.storage
            .from('plano-acao')
            .getPublicUrl(data.image_path);

        image.alt = 'Plano de ação';
        image.src = `${publicData.publicUrl}?v=${encodeURIComponent(data.updated_at || Date.now())}`;
        image.hidden = false;
        empty.hidden = true;
        image.dataset.path = data.image_path;
        if (remove) remove.hidden = false;
    }

    function showActionNotice(message, type = 'success') {
        const el = $('actionPlanAdminNotice');
        if (!el) return;
        el.textContent = message;
        el.className = `integration-notice ${type}`;
        el.hidden = false;
        if (type !== 'error') setTimeout(() => { el.hidden = true; }, 4500);
    }


    function clearActionPlanPreview() {
        const image = $('actionPlanImage');

        if (actionPlanPreviewUrl) {
            URL.revokeObjectURL(actionPlanPreviewUrl);
            actionPlanPreviewUrl = null;
        }

        if (image) {
            image.classList.remove('is-preview');
            image.removeAttribute('data-preview');
        }
    }

    function previewActionPlanFile(file) {
        const image = $('actionPlanImage');
        const empty = $('actionPlanEmpty');
        if (!image || !empty || !file) return;

        clearActionPlanPreview();
        actionPlanPreviewUrl = URL.createObjectURL(file);

        image.alt = 'Pré-visualização do plano de ação';
        image.src = actionPlanPreviewUrl;
        image.hidden = false;
        image.classList.add('is-preview');
        image.dataset.preview = 'true';

        empty.hidden = true;

        showActionNotice(
            'Pré-visualização carregada. Confira a imagem e clique em “Publicar imagem” para confirmar.',
            'preview'
        );
    }

    async function uploadActionPlan() {
        const input = $('actionPlanFile');
        const file = input?.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            return showActionNotice('Selecione um arquivo de imagem.', 'error');
        }
        if (file.size > 10 * 1024 * 1024) {
            return showActionNotice('A imagem deve ter no máximo 10 MB.', 'error');
        }

        const btn = $('actionPlanUploadBtn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Publicando...';
        }

        try {
            const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
            const path = `publicado/plano-acao-${Date.now()}.${ext}`;
            const oldPath = $('actionPlanImage')?.dataset.path || '';

            const { error: uploadError } = await supabaseClient.storage
                .from('plano-acao')
                .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
            if (uploadError) throw uploadError;

            const { error: dbError } = await supabaseClient
                .from('plano_acao')
                .upsert({ id: 1, image_path: path, updated_at: new Date().toISOString() }, { onConflict: 'id' });
            if (dbError) {
                await supabaseClient.storage.from('plano-acao').remove([path]);
                throw dbError;
            }

            if (oldPath && oldPath !== path) {
                await supabaseClient.storage.from('plano-acao').remove([oldPath]);
            }

            input.value = '';
            clearActionPlanPreview();
            showActionNotice('Imagem publicada com sucesso.');
            await loadActionPlan();
        } catch (error) {
            console.error(error);
            showActionNotice(`Não foi possível publicar a imagem: ${error.message}`, 'error');
        } finally {
            if (btn) {
                btn.disabled = true;
                btn.textContent = 'Publicar imagem';
            }
        }
    }

    async function removeActionPlan() {
        const confirmed = await uiConfirmModal({
            title: 'Remover imagem',
            description: 'Deseja remover a imagem atual do plano de ação?',
            confirmText: 'Remover',
            danger: true
        });
        if (!confirmed) return;
        const image = $('actionPlanImage');
        const oldPath = image?.dataset.path || '';

        const { error } = await supabaseClient
            .from('plano_acao')
            .upsert({ id: 1, image_path: null, updated_at: new Date().toISOString() }, { onConflict: 'id' });

        if (error) return showActionNotice(`Erro ao remover: ${error.message}`, 'error');
        if (oldPath) await supabaseClient.storage.from('plano-acao').remove([oldPath]);

        showActionNotice('Imagem removida.');
        await loadActionPlan();
    }

    function bindAdmin() {
        if (!IS_ADMIN) return;

        $('trendAddBtn')?.addEventListener('click', newMeasurement);
        document.querySelectorAll('[data-trend-card]').forEach(btn => {
            btn.addEventListener('click', () => editTrendCard(btn.dataset.trendCard));
        });

        const fileInput = $('actionPlanFile');
        $('actionPlanChooseBtn')?.addEventListener('click', () => fileInput?.click());
        fileInput?.addEventListener('change', () => {
            const file = fileInput.files?.[0] || null;
            const btn = $('actionPlanUploadBtn');

            if (!file) {
                if (btn) btn.disabled = true;
                clearActionPlanPreview();
                loadActionPlan();
                return;
            }

            if (!file.type.startsWith('image/')) {
                fileInput.value = '';
                if (btn) btn.disabled = true;
                showActionNotice('Selecione um arquivo de imagem.', 'error');
                return;
            }

            if (file.size > 10 * 1024 * 1024) {
                fileInput.value = '';
                if (btn) btn.disabled = true;
                showActionNotice('A imagem deve ter no máximo 10 MB.', 'error');
                return;
            }

            if (btn) btn.disabled = false;
            previewActionPlanFile(file);
        });
        $('actionPlanUploadBtn')?.addEventListener('click', uploadActionPlan);
        $('actionPlanRemoveBtn')?.addEventListener('click', removeActionPlan);
    }

    async function init() {
        bindAdmin();

        try {
            await loadTrendData();
        } catch (error) {
            console.error('Erro ao carregar tendências:', error);
            const el = $('trendError') || $('trendAdminNotice');
            if (el) {
                el.textContent = 'Não foi possível carregar o gráfico de tendências. Rode primeiro o SQL de centralização no Supabase principal.';
                el.className = 'integration-notice error';
                el.hidden = false;
            }
        }

        try {
            await loadActionPlan();
        } catch (error) {
            console.error('Erro ao carregar plano de ação:', error);
        }

        window.addEventListener('dashboard:viewchange', event => {
            if (event.detail?.view === 'trends' && trendChart) {
                requestAnimationFrame(() => trendChart.resize());
            }
        });
    }

    document.addEventListener('DOMContentLoaded', init);
})();
