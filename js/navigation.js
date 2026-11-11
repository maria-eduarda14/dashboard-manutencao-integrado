(() => {
    const sidebar = document.getElementById('dashboardSidebar');
    const toggle = document.getElementById('sidebarToggle');
    const backdrop = document.getElementById('sidebarBackdrop');
    const links = [...document.querySelectorAll('[data-view-target]')];
    const views = [...document.querySelectorAll('[data-dashboard-view]')];
    const statusLineSelector = document.getElementById('statusLineSelector');
    const selectedLineBadge = document.getElementById('linhaSelecionada');
    const dashboardMainTitle = document.getElementById('dashboardMainTitle');

    if (!sidebar || !links.length || !views.length) return;

    if (statusLineSelector) {
        try {
            if (typeof labels !== 'undefined' && Array.isArray(labels)) {
                labels.forEach((label, index) => {
                    const option = document.createElement('option');
                    option.value = String(index);
                    option.textContent = label;
                    statusLineSelector.appendChild(option);
                });
            }
        } catch (_) {}

        statusLineSelector.addEventListener('change', () => {
            if (statusLineSelector.value === '') return;
            const index = Number(statusLineSelector.value);
            try {
                if (typeof atualizarVencimento === 'function') atualizarVencimento(index);
            } catch (_) {}
        });
    }

    if (selectedLineBadge && statusLineSelector) {
        const syncSelector = () => {
            try {
                if (typeof labels === 'undefined' || !Array.isArray(labels)) return;
                const index = labels.indexOf(selectedLineBadge.textContent.trim());
                if (index >= 0) statusLineSelector.value = String(index);
            } catch (_) {}
        };
        new MutationObserver(syncSelector).observe(selectedLineBadge, { childList: true, subtree: true, characterData: true });
        syncSelector();
    }

    function isMobile() {
        return window.matchMedia('(max-width: 820px)').matches;
    }

    function closeMobileMenu() {
        sidebar.classList.remove('mobile-open');
        backdrop?.classList.remove('visible');
        toggle?.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('sidebar-mobile-open');
    }

    function openMobileMenu() {
        sidebar.classList.add('mobile-open');
        backdrop?.classList.add('visible');
        toggle?.setAttribute('aria-expanded', 'true');
        document.body.classList.add('sidebar-mobile-open');
    }

    function activateView(name, updateHash = true) {
        const target = views.find(view => view.dataset.dashboardView === name);
        if (!target) return;

        views.forEach(view => view.classList.toggle('active', view === target));
        links.forEach(link => {
            const active = link.dataset.viewTarget === name;
            link.classList.toggle('active', active);
            link.setAttribute('aria-current', active ? 'page' : 'false');
        });

        if (dashboardMainTitle) {
            dashboardMainTitle.hidden = name !== 'overview';
        }

        if (updateHash) {
            history.replaceState(null, '', `#${name}`);
        }

        window.dispatchEvent(new CustomEvent('dashboard:viewchange', { detail: { view: name } }));

        if (name === 'distribution') {
            requestAnimationFrame(() => {
                try {
                    if (typeof chart !== 'undefined' && chart) chart.resize();
                } catch (_) {}
                window.dispatchEvent(new Event('resize'));
            });
        }

        if (isMobile()) closeMobileMenu();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    links.forEach(link => {
        link.addEventListener('click', () => activateView(link.dataset.viewTarget));
    });

    document.querySelectorAll('[data-go-view]').forEach(button => {
        button.addEventListener('click', () => activateView(button.dataset.goView));
    });

    toggle?.addEventListener('click', () => {
        if (!isMobile()) {
            sidebar.classList.toggle('pinned-open');
            toggle.setAttribute('aria-expanded', sidebar.classList.contains('pinned-open') ? 'true' : 'false');
            return;
        }
        sidebar.classList.contains('mobile-open') ? closeMobileMenu() : openMobileMenu();
    });

    backdrop?.addEventListener('click', closeMobileMenu);
    window.addEventListener('resize', () => {
        if (!isMobile()) closeMobileMenu();
    });

    const requested = location.hash.replace('#', '');
    activateView(views.some(v => v.dataset.dashboardView === requested) ? requested : 'overview', false);
})();
