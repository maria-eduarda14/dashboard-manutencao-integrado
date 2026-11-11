
(() => {
    function ensureDialog() {
        let overlay = document.getElementById('appDialogOverlay');
        if (overlay) return overlay;

        overlay = document.createElement('div');
        overlay.id = 'appDialogOverlay';
        overlay.className = 'app-dialog-overlay oculto';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.innerHTML = `
            <div class="app-dialog" role="dialog" aria-modal="true" aria-labelledby="appDialogTitle">
                <button type="button" class="app-dialog-close" id="appDialogClose" aria-label="Fechar">×</button>
                <h3 id="appDialogTitle"></h3>
                <p id="appDialogDescription" class="app-dialog-description"></p>
                <div id="appDialogFields" class="app-dialog-fields"></div>
                <div id="appDialogMessage" class="app-dialog-message" hidden></div>
                <div class="app-dialog-actions">
                    <button type="button" class="app-dialog-btn secondary" id="appDialogCancel">Cancelar</button>
                    <button type="button" class="app-dialog-btn primary" id="appDialogConfirm">Salvar</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
        return overlay;
    }

    function closeDialog(result) {
        const overlay = ensureDialog();
        overlay.classList.add('oculto');
        overlay.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('dialog-open');
        const resolver = overlay._resolver;
        overlay._resolver = null;
        if (resolver) resolver(result);
    }

    window.uiFormModal = function({
        title = 'Editar',
        description = '',
        confirmText = 'Salvar',
        cancelText = 'Cancelar',
        fields = []
    } = {}) {
        const overlay = ensureDialog();
        const titleEl = overlay.querySelector('#appDialogTitle');
        const descEl = overlay.querySelector('#appDialogDescription');
        const fieldsEl = overlay.querySelector('#appDialogFields');
        const messageEl = overlay.querySelector('#appDialogMessage');
        const confirmBtn = overlay.querySelector('#appDialogConfirm');
        const cancelBtn = overlay.querySelector('#appDialogCancel');
        const closeBtn = overlay.querySelector('#appDialogClose');

        titleEl.textContent = title;
        descEl.textContent = description || '';
        descEl.hidden = !description;
        messageEl.hidden = true;
        messageEl.textContent = '';
        fieldsEl.innerHTML = '';

        fields.forEach((field, index) => {
            const group = document.createElement('div');
            group.className = 'app-dialog-field';

            const id = `appDialogField_${index}`;
            const label = document.createElement('label');
            label.htmlFor = id;
            label.textContent = field.label || field.name || '';

            let input;
            if (field.type === 'textarea') {
                input = document.createElement('textarea');
                input.rows = field.rows || 3;
            } else {
                input = document.createElement('input');
                input.type = field.type || 'text';
            }

            input.id = id;
            input.name = field.name;
            input.value = field.value ?? '';
            if (field.placeholder) input.placeholder = field.placeholder;
            if (field.min !== undefined) input.min = field.min;
            if (field.max !== undefined) input.max = field.max;
            if (field.step !== undefined) input.step = field.step;
            if (field.maxLength) input.maxLength = field.maxLength;
            if (field.required) input.required = true;

            group.append(label, input);
            fieldsEl.appendChild(group);
        });

        confirmBtn.textContent = confirmText;
        cancelBtn.textContent = cancelText;

        overlay.classList.remove('oculto');
        overlay.setAttribute('aria-hidden', 'false');
        document.body.classList.add('dialog-open');

        return new Promise(resolve => {
            overlay._resolver = resolve;

            const finish = () => {
                const result = {};
                let invalid = false;
                fieldsEl.querySelectorAll('[name]').forEach(input => {
                    if (input.required && !String(input.value).trim()) invalid = true;
                    result[input.name] = input.value;
                });

                if (invalid) {
                    messageEl.textContent = 'Preencha os campos obrigatórios.';
                    messageEl.hidden = false;
                    return;
                }
                closeDialog(result);
            };

            confirmBtn.onclick = finish;
            cancelBtn.onclick = () => closeDialog(null);
            closeBtn.onclick = () => closeDialog(null);
            overlay.onclick = e => {
                if (e.target === overlay) closeDialog(null);
            };

            overlay.onkeydown = e => {
                if (e.key === 'Escape') closeDialog(null);
                if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                    finish();
                }
            };

            requestAnimationFrame(() => {
                fieldsEl.querySelector('input, textarea')?.focus();
            });
        });
    };

    window.uiConfirmModal = function({
        title = 'Confirmar ação',
        description = '',
        confirmText = 'Confirmar',
        cancelText = 'Cancelar',
        danger = false
    } = {}) {
        const overlay = ensureDialog();
        const titleEl = overlay.querySelector('#appDialogTitle');
        const descEl = overlay.querySelector('#appDialogDescription');
        const fieldsEl = overlay.querySelector('#appDialogFields');
        const messageEl = overlay.querySelector('#appDialogMessage');
        const confirmBtn = overlay.querySelector('#appDialogConfirm');
        const cancelBtn = overlay.querySelector('#appDialogCancel');
        const closeBtn = overlay.querySelector('#appDialogClose');

        titleEl.textContent = title;
        descEl.textContent = description;
        descEl.hidden = !description;
        fieldsEl.innerHTML = '';
        messageEl.hidden = true;
        confirmBtn.textContent = confirmText;
        cancelBtn.textContent = cancelText;
        confirmBtn.classList.toggle('danger', danger);

        overlay.classList.remove('oculto');
        overlay.setAttribute('aria-hidden', 'false');
        document.body.classList.add('dialog-open');

        return new Promise(resolve => {
            overlay._resolver = resolve;
            confirmBtn.onclick = () => closeDialog(true);
            cancelBtn.onclick = () => closeDialog(false);
            closeBtn.onclick = () => closeDialog(false);
            overlay.onclick = e => {
                if (e.target === overlay) closeDialog(false);
            };
            overlay.onkeydown = e => {
                if (e.key === 'Escape') closeDialog(false);
                if (e.key === 'Enter') closeDialog(true);
            };
            requestAnimationFrame(() => confirmBtn.focus());
        });
    };
})();
