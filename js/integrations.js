
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
    let trendCardConfig = structuredClone(CARD_DEFAULTS);
    let trendPeriodDays = 'all';

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

    function setFirstLastEvolution(valueId, detailId, values) {
        const valueEl = $(valueId);
        const detailEl = $(detailId);
        if (!valueEl || !detailEl) return;

        const initial = number(values?.[0]);
        const current = number(values?.[values.length - 1]);
        const percentage = values?.length ? evolution(initial, current) : null;

        valueEl.classList.remove('good', 'bad', 'neutral');

        if (percentage === null) {
            valueEl.textContent = 'Não calculável';
            valueEl.classList.add('neutral');
            detailEl.textContent = 'Sem base suficiente para cálculo';
            return;
        }

        const arrow = percentage > 0 ? '↓' : percentage < 0 ? '↑' : '→';
        valueEl.textContent = `${arrow} ${pct(Math.abs(percentage))}`;
        valueEl.classList.add(percentage > 0 ? 'good' : percentage < 0 ? 'bad' : 'neutral');
        detailEl.textContent = `De ${initial} notas para ${current} notas`;
    }

    function filteredTrendRecords() {
        if (
            trendPeriodDays === 'all' ||
            !trendRecords.length
        ) {
            return [...trendRecords];
        }

        const days = Number(trendPeriodDays);

        if (!Number.isFinite(days) || days <= 0) {
            return [...trendRecords];
        }

        const latestRecord = trendRecords[trendRecords.length - 1];

        const latestDate = new Date(
            `${latestRecord.data}T12:00:00`
        );

        const cutoffDate = new Date(latestDate);

        cutoffDate.setDate(
            cutoffDate.getDate() - days
        );

        return trendRecords.filter(record => {
            const recordDate = new Date(
                `${record.data}T12:00:00`
            );

            return recordDate >= cutoffDate;
        });
    }


    function updateTrendFilterSummary(records) {
        const el = $('trendFilterSummary');
        if (!el) return;

        if (!records.length) {
            el.textContent = 'Nenhuma medição no período';
            return;
        }

        const first = brDate(records[0].data);
        const last = brDate(records[records.length - 1].data);

        el.textContent = records.length === 1
            ? `1 medição · ${last}`
            : `${records.length} medições · ${first} a ${last}`;
    }

    function exportTrendCsv() {
        const records = filteredTrendRecords();

        if (!records.length) {
            showTrendNotice('Não há medições para exportar neste período.', 'error');
            return;
        }

        const rows = [
            ['Data', 'Amarela', 'Vermelha', 'ND', 'Total'],
            ...records.map(record => {
                const total = number(record.amarela) + number(record.vermelha) + number(record.nd);
                return [
                    brDate(record.data),
                    number(record.amarela),
                    number(record.vermelha),
                    number(record.nd),
                    total
                ];
            })
        ];

        const csv = '\ufeff' + rows
            .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(';'))
            .join('\r\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = `tendencias-notas-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    function renderRecentEvolution() {
        const fields = [
            { key: 'vermelha', valueId: 'recentVermelhaVariation', detailId: 'recentVermelhaDetail' },
            { key: 'nd', valueId: 'recentNdVariation', detailId: 'recentNdDetail' },
            { key: 'amarela', valueId: 'recentAmarelaVariation', detailId: 'recentAmarelaDetail' }
        ];

        if (trendRecords.length < 2) {
            fields.forEach(({ valueId, detailId }) => {
                const valueEl = $(valueId);
                const detailEl = $(detailId);
                if (valueEl) {
                    valueEl.textContent = '—';
                    valueEl.className = 'overview-recent-variation neutral';
                }
                if (detailEl) detailEl.textContent = 'São necessárias pelo menos duas medições';
            });
            return;
        }

        const previous = trendRecords[trendRecords.length - 2];
        const current = trendRecords[trendRecords.length - 1];

        fields.forEach(({ key, valueId, detailId }) => {
            const previousValue = number(previous[key]);
            const currentValue = number(current[key]);
            const difference = currentValue - previousValue;
            const valueEl = $(valueId);
            const detailEl = $(detailId);

            if (valueEl) {
                const arrow = difference < 0 ? '↓' : difference > 0 ? '↑' : '→';
                const sign = difference > 0 ? '+' : '';
                valueEl.textContent = `${arrow} ${sign}${difference} ${Math.abs(difference) === 1 ? 'nota' : 'notas'}`;
                valueEl.className = `overview-recent-variation ${difference < 0 ? 'good' : difference > 0 ? 'bad' : 'neutral'}`;
            }

            if (detailEl) {
                detailEl.textContent = `${previousValue} → ${currentValue} na última medição`;
            }
        });
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
        renderRecentEvolution();

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

            updateTrendFilterSummary([]);
            renderTrendTable();
            return;
        }

        const yellow = trendRecords.map(r => number(r.amarela));
        const red = trendRecords.map(r => number(r.vermelha));
        const nd = trendRecords.map(r => number(r.nd));

        const missing = completionMeta(trendRecords);
        const metaValue = $('trendValueGeral');
        const metaDetail = $('trendDetailGeral');

        if (metaValue) {
            metaValue.textContent = missing === null ? 'Não calculável' : pct(missing);
            metaValue.className = `trend-card-value ${missing === 0 ? 'good' : 'neutral'}`;
        }
        if (metaDetail) metaDetail.textContent = '';

        setFirstLastEvolution('trendValueAmarela', 'trendDetailAmarela', yellow);
        setFirstLastEvolution('trendValueVermelha', 'trendDetailVermelha', red);
        setFirstLastEvolution('trendValueNd', 'trendDetailNd', nd);

        const visibleRecords = filteredTrendRecords();
        const visibleYellow = visibleRecords.map(r => number(r.amarela));
        const visibleRed = visibleRecords.map(r => number(r.vermelha));
        const visibleNd = visibleRecords.map(r => number(r.nd));
        const visibleTotals = visibleRecords.map((r, i) => visibleYellow[i] + visibleRed[i] + visibleNd[i]);

        updateTrendFilterSummary(visibleRecords);

        const canvas = $('trendChart');
        if (canvas && window.Chart) {
            if (trendChart) trendChart.destroy();

            trendChart = new Chart(canvas, {
                plugins: [trendValueLabelsPlugin],
                type: 'bar',
                data: {
                    labels: visibleRecords.map(r => brDate(r.data)),
                    datasets: [
                        {
                            type: 'line',
                            label: 'Linha de Tendência',
                            data: visibleTotals,
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
                        trendBar('Amarela', visibleYellow, '#f4c20d'),
                        trendBar('Vermelha', visibleRed, '#e74c3c'),
                        trendBar('ND', visibleNd, '#879295')
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
                                    return `Total: ${visibleTotals[items[0].dataIndex]}`;
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


    function bindTrendTools() {
        const filter = $('trendPeriodFilter');

        if (filter) {
            filter.value = trendPeriodDays;
            filter.addEventListener('change', () => {
                trendPeriodDays = filter.value || 'all';
                renderTrend();
            });
        }

        $('trendExportBtn')?.addEventListener('click', exportTrendCsv);
    }

    function bindAdmin() {
        if (!IS_ADMIN) return;

        $('trendAddBtn')?.addEventListener('click', newMeasurement);
        document.querySelectorAll('[data-trend-card]').forEach(btn => {
            btn.addEventListener('click', () => editTrendCard(btn.dataset.trendCard));
        });

    }

    async function init() {
        bindTrendTools();
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


        window.addEventListener('dashboard:viewchange', event => {
            if (event.detail?.view === 'trends' && trendChart) {
                requestAnimationFrame(() => trendChart.resize());
            }
        });
    }

    document.addEventListener('DOMContentLoaded', init);
})();
