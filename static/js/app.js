/* ─── App Module (Main Controller) ─────────────────────────────────────── */
window.ET = window.ET || {};

ET.App = (function () {
    let _currentView = 'board';
    let _statsData = null;

    /* ── Initialize ──────────────────────────────────────────────────── */
    async function init() {
        // Load settings first
        await ET.Settings.load();

        // Apply saved theme
        const theme = ET.Utils.settings.color_scheme || 'ocean';
        document.body.setAttribute('data-theme', theme);
        document.getElementById('theme-label').textContent = theme[0].toUpperCase() + theme.slice(1);

        // Set display currency in top bar
        const currSel = document.getElementById('display-currency');
        currSel.value = ET.Utils.displayCurrency;

        // Fetch exchange rates
        await ET.Utils.fetchRates(ET.Utils.displayCurrency);
        ET.Utils.updateRateUpdateDisplay();

        // Load reference data
        ET.Utils.categories = await ET.Utils.api('/api/categories') || [];
        ET.Utils.paymentMethods = await ET.Utils.api('/api/payment-methods') || [];

        // Load expenses
        await ET.Expenses.load();
        
        // Populate expense filters after loading categories/payment methods
        populateExpenseFilters();

        // Initialize calendar
        ET.Calendar.init();

        // Set up event listeners
        setupNavigation();
        setupThemeSwitcher();
        setupCurrencySwitch();
        setupFilters();
        setupSidebar();

        // Apply grid columns
        applyGridColumns();

        // Enhance native selects into custom dropdowns
        ET.Dropdown.enhanceAll();

        // Sync display currency dropdown (value was set before enhancement)
        ET.Dropdown.syncValue(document.getElementById('display-currency'));

        // Render initial view
        await showView('board');
    }

    /* ── Navigation ──────────────────────────────────────────────────── */
    function setupNavigation() {
        document.querySelectorAll('.nav-link[data-view]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = link.dataset.view;
                showView(view);
                // Close mobile sidebar
                document.getElementById('sidebar').classList.remove('open');
            });
        });
    }

    async function showView(view) {
        _currentView = view;

        // Update nav active state
        document.querySelectorAll('.nav-link[data-view]').forEach(l => {
            l.classList.toggle('active', l.dataset.view === view);
        });

        // Hide all sections
        document.querySelectorAll('.view-section').forEach(s => s.classList.add('hidden'));

        // Clean up charts when leaving statistics
        if (view !== 'statistics') {
            ET.Statistics.destroyCharts();
        }

        // Show target
        const section = document.getElementById(`view-${view}`);
        if (section) {
            section.classList.remove('hidden');
            section.classList.add('fade-in');
        }

        // Update title
        const titles = {
            board: 'Dashboard', expenses: 'Expenses',
            calendar: 'Calendar', statistics: 'Statistics', settings: 'Settings',
        };
        document.getElementById('view-title').textContent = titles[view] || 'Dashboard';

        // Render view-specific content
        switch (view) {
            case 'board':
                _statsData = _statsData || await ET.Utils.api('/api/stats/summary');
                if (_statsData) ET.Expenses.renderSummary(_statsData);
                ET.Expenses.populateFilters();
                // Refresh the category filter dropdown (options may have changed)
                {
                    const catSel = document.getElementById('board-filter-cat');
                    if (catSel) ET.Dropdown.refresh(catSel);
                }
                ET.Expenses.renderBoard();
                break;
            case 'expenses':
                ET.Expenses.renderTable();
                break;
            case 'calendar':
                await ET.Calendar.load();
                ET.Calendar.render();
                if (ET.Dropdown) ET.Dropdown.enhanceAll('#view-calendar');
                break;
            case 'statistics':
                await ET.Statistics.render();
                break;
            case 'settings':
                ET.Settings.renderForm();
                // Refresh settings dropdowns (their options were rebuilt by renderForm)
                document.querySelectorAll('#view-settings select.glass-input').forEach(sel => {
                    ET.Dropdown.refresh(sel);
                });
                break;
        }
    }

    function refreshCurrentView() {
        _statsData = null; // Invalidate cache
        showView(_currentView);
    }

    /* ── Theme Switcher ──────────────────────────────────────────────── */
    function setupThemeSwitcher() {
        const btn = document.getElementById('theme-btn');
        const dropdown = document.getElementById('theme-dropdown');
        const arrow = document.getElementById('theme-arrow');

        function updateActiveTheme() {
            const currentTheme = document.body.getAttribute('data-theme') || 'ocean';
            dropdown.querySelectorAll('[data-theme]').forEach(opt => {
                opt.classList.toggle('active-theme', opt.dataset.theme === currentTheme);
            });
        }

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = dropdown.classList.contains('hidden');
            if (isHidden) {
                dropdown.classList.remove('hidden');
                updateActiveTheme();
                requestAnimationFrame(() => {
                    dropdown.classList.add('show');
                    if (arrow) arrow.style.transform = 'rotate(180deg)';
                });
            } else {
                dropdown.classList.remove('show');
                if (arrow) arrow.style.transform = '';
                setTimeout(() => dropdown.classList.add('hidden'), 200);
            }
        });

        document.addEventListener('click', () => {
            if (!dropdown.classList.contains('hidden')) {
                dropdown.classList.remove('show');
                if (arrow) arrow.style.transform = '';
                setTimeout(() => dropdown.classList.add('hidden'), 200);
            }
        });

        dropdown.addEventListener('click', (e) => e.stopPropagation());

        dropdown.querySelectorAll('[data-theme]').forEach(opt => {
            opt.addEventListener('click', () => {
                const theme = opt.dataset.theme;
                ET.Settings.selectTheme(theme);
                updateActiveTheme();
                // Close dropdown
                dropdown.classList.remove('show');
                if (arrow) arrow.style.transform = '';
                setTimeout(() => dropdown.classList.add('hidden'), 200);
                // Auto-save theme
                ET.Utils.api('/api/settings', {
                    method: 'PUT',
                    body: JSON.stringify({ ...ET.Utils.settings, color_scheme: theme })
                });
            });
        });
    }

    /* ── Currency Switch ─────────────────────────────────────────────── */
    function setupCurrencySwitch() {
        document.getElementById('display-currency').addEventListener('change', async (e) => {
            ET.Utils.displayCurrency = e.target.value;
            await ET.Utils.fetchRates(e.target.value);
            // Save to settings
            ET.Utils.settings.display_currency = e.target.value;
            ET.Utils.api('/api/settings', {
                method: 'PUT',
                body: JSON.stringify({ ...ET.Utils.settings, display_currency: e.target.value })
            });
            // Sync custom dropdown label
            ET.Dropdown.syncValue(e.target);
            _statsData = null;
            refreshCurrentView();
        });

        // Manual currency update button
        const updateBtn = document.getElementById('currency-update-btn');
        if (updateBtn) {
            updateBtn.addEventListener('click', async () => {
                updateBtn.classList.add('spin');
                await ET.Utils.fetchRates(ET.Utils.displayCurrency, true); // true = manual refresh
                _statsData = null;
                refreshCurrentView();
                setTimeout(() => updateBtn.classList.remove('spin'), 600);
            });
        }
    }

    /* ── Filters ─────────────────────────────────────────────────────── */
    function setupFilters() {
        // Board filters
        const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
        document.getElementById('board-search').addEventListener('input', debounce(() => ET.Expenses.renderBoard(), 200));
        document.getElementById('board-filter-cat').addEventListener('change', () => ET.Expenses.renderBoard());
        document.getElementById('board-sort').addEventListener('change', () => ET.Expenses.renderBoard());

        // Table filters
        document.getElementById('exp-filter-interval').addEventListener('change', () => ET.Expenses.renderTable());
        const categoryFilter = document.getElementById('exp-filter-category');
        const paymentFilter = document.getElementById('exp-filter-payment');
        if (categoryFilter) categoryFilter.addEventListener('change', () => ET.Expenses.renderTable());
        if (paymentFilter) paymentFilter.addEventListener('change', () => ET.Expenses.renderTable());
        document.getElementById('exp-active-only').addEventListener('change', () => ET.Expenses.renderTable());
        
        // Populate category and payment method filters
        populateExpenseFilters();
    }
    
    function populateExpenseFilters() {
        const categoryFilter = document.getElementById('exp-filter-category');
        const paymentFilter = document.getElementById('exp-filter-payment');
        const iconText = (item, fallback) => (item.icon_type === 'upload' || item.icon_type === 'image') ? '🖼️' : (item.icon || fallback);
        
        if (categoryFilter && ET.Utils.categories) {
            categoryFilter.innerHTML = '<option value="">All Categories</option>' + 
                ET.Utils.categories.map(c => `<option value="${c.id}" data-icon="${escAttr(c.icon || '')}" data-icon-type="${escAttr(c.icon_type || 'emoji')}" data-label="${escAttr(c.name || 'Uncategorized')}">${iconText(c, '📁')} ${escHtml(c.name || 'Uncategorized')}</option>`).join('');
        }
        
        if (paymentFilter && ET.Utils.paymentMethods) {
            paymentFilter.innerHTML = '<option value="">All Payment Methods</option>' + 
                ET.Utils.paymentMethods.map(p => `<option value="${p.id}" data-icon="${escAttr(p.icon || '')}" data-icon-type="${escAttr(p.icon_type || 'emoji')}" data-label="${escAttr(p.name || 'Payment Method')}">${iconText(p, '💳')} ${escHtml(p.name || 'Payment Method')}</option>`).join('');
        }
    }

    function escHtml(s) {
        const d = document.createElement('div');
        d.textContent = s == null ? '' : String(s);
        return d.innerHTML;
    }

    function escAttr(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    /* ── Sidebar (Mobile) ────────────────────────────────────────────── */
    function setupSidebar() {
        const toggle = document.getElementById('sidebar-toggle');
        const sidebar = document.getElementById('sidebar');
        if (toggle) {
            toggle.addEventListener('click', () => {
                sidebar.classList.toggle('open');
            });
        }
    }

    /* ── Grid Columns ────────────────────────────────────────────────── */
    function applyGridColumns() {
        const cols = ET.Utils.settings.grid_columns || 3;
        const style = document.createElement('style');
        style.id = 'dynamic-grid';
        style.textContent = `
            @media (min-width: 1024px) {
                #board-grid { grid-template-columns: repeat(${cols}, 1fr) !important; }
            }
        `;
        const existing = document.getElementById('dynamic-grid');
        if (existing) existing.remove();
        document.head.appendChild(style);
    }

    /* ── Modal ────────────────────────────────────────────────────────── */
    function openModal(title, bodyHtml) {
        document.getElementById('modal-title').textContent = title;
        const body = document.getElementById('modal-body');
        body.innerHTML = bodyHtml;
        const overlay = document.getElementById('modal-overlay');
        overlay.classList.remove('hidden');
        // Enhance any selects in the modal
        ET.Dropdown.enhanceAll('#modal-body');
        // Trigger animation
        requestAnimationFrame(() => overlay.classList.add('show'));
    }

    function closeModal() {
        ET.Dropdown.closeAll();
        const overlay = document.getElementById('modal-overlay');
        overlay.classList.remove('show');
        setTimeout(() => {
            overlay.classList.add('hidden');
            document.getElementById('modal-body').innerHTML = '';
        }, 200);
    }

    /**
     * Custom confirmation dialog
     * @param {string} message - Confirmation message
     * @param {function} onConfirm - Callback when user confirms
     * @param {object} options - Additional options (title, confirmText, cancelText)
     */
    function confirm(message, onConfirm, options = {}) {
        const title = options.title || 'Confirm Action';
        const confirmText = options.confirmText || 'Confirm';
        const cancelText = options.cancelText || 'Cancel';
        const isDangerous = options.dangerous !== false;

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10000] p-4';
        modal.style.opacity = '0';
        modal.style.transition = 'opacity 200ms';
        
        modal.innerHTML = `
            <div class="glass-card rounded-2xl p-6 max-w-md w-full transform scale-95 transition-transform duration-200" style="transform: scale(0.95)">
                <div class="flex items-start gap-3 mb-4">
                    <div class="flex-shrink-0 w-10 h-10 rounded-full ${isDangerous ? 'bg-red-500/20' : 'bg-blue-500/20'} flex items-center justify-center">
                        <i class="fas ${isDangerous ? 'fa-exclamation-triangle text-red-400' : 'fa-question-circle text-blue-400'} text-lg"></i>
                    </div>
                    <div class="flex-1">
                        <h3 class="text-lg font-semibold text-[var(--text-primary)] mb-2">${title}</h3>
                        <p class="text-sm text-[var(--text-secondary)]">${message}</p>
                    </div>
                </div>
                <div class="flex gap-3 justify-end">
                    <button id="confirm-cancel" class="btn-ghost px-5 py-2.5 rounded-xl text-sm">${cancelText}</button>
                    <button id="confirm-ok" class="btn-${isDangerous ? 'danger' : 'primary'} px-5 py-2.5 rounded-xl text-sm font-medium">${confirmText}</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Trigger animation
        requestAnimationFrame(() => {
            modal.style.opacity = '1';
            const card = modal.querySelector('.glass-card');
            if (card) card.style.transform = 'scale(1)';
        });

        const remove = () => {
            modal.style.opacity = '0';
            const card = modal.querySelector('.glass-card');
            if (card) card.style.transform = 'scale(0.95)';
            setTimeout(() => modal.remove(), 200);
        };

        modal.querySelector('#confirm-cancel').onclick = remove;
        modal.querySelector('#confirm-ok').onclick = () => {
            remove();
            if (onConfirm) onConfirm();
        };

        // Click outside to cancel
        modal.onclick = (e) => {
            if (e.target === modal) remove();
        };

        // ESC to cancel
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                remove();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    // Keyboard shortcut
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });

    return { init, showView, refreshCurrentView, openModal, closeModal, confirm, populateExpenseFilters };
})();


/* ─── Bootstrap ──────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    ET.App.init().catch(err => {
        console.error('App initialization error:', err);
    });
});
