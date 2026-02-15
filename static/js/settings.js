/* ─── Settings Module ──────────────────────────────────────────────────── */
window.ET = window.ET || {};

ET.Settings = (function () {

    const THEMES = ['ocean','sunset','forest','lavender','midnight','rose','aurora','light-neutral','light-warm','light-cool','light-green','light-purple'];
    const THEME_GRADIENTS = {
        ocean:    'linear-gradient(135deg,#0c1445,#0d9488)',
        sunset:   'linear-gradient(135deg,#7c2d12,#ec4899)',
        forest:   'linear-gradient(135deg,#052e16,#059669)',
        lavender: 'linear-gradient(135deg,#2e1065,#7c3aed)',
        midnight: 'linear-gradient(135deg,#020617,#1e3a5f)',
        rose:     'linear-gradient(135deg,#4c0519,#f43f5e)',
        aurora:   'linear-gradient(135deg,#064e3b,#6d28d9)',
        'light-neutral': 'linear-gradient(135deg,#f8fafc,#e2e8f0)',
        'light-warm':    'linear-gradient(135deg,#fef7f0,#fde68a)',
        'light-cool':    'linear-gradient(135deg,#f0f9ff,#cffafe)',
        'light-green':   'linear-gradient(135deg,#f0fdf4,#dcfce7)',
        'light-purple':  'linear-gradient(135deg,#faf5ff,#ede9fe)',
    };

    async function load() {
        const settings = await ET.Utils.api('/api/settings');
        if (settings) {
            ET.Utils.settings = settings;
            ET.Utils.displayCurrency = settings.display_currency || 'USD';
        }
        return settings;
    }

    function renderForm() {
        const s = ET.Utils.settings;

        // Currency select
        const currSel = document.getElementById('set-currency');
        const currencies = Object.keys(ET.Utils.CURRENCY_SYMBOLS);
        currSel.innerHTML = currencies.map(c =>
            `<option value="${c}" ${s.display_currency === c ? 'selected' : ''}>${c} ${ET.Utils.CURRENCY_SYMBOLS[c]}</option>`
        ).join('');

        // Other fields
        document.getElementById('set-api-url').value = s.currency_api_url || '';
        document.getElementById('set-grid-cols').value = s.grid_columns || 3;
        document.getElementById('set-date-format').value = s.date_format || 'YYYY-MM-DD';

        // Theme grid
        const themeGrid = document.getElementById('set-theme-grid');
        themeGrid.innerHTML = THEMES.map(t => `
            <div class="theme-swatch ${s.color_scheme === t ? 'active' : ''}"
                 style="background:${THEME_GRADIENTS[t]}"
                 onclick="ET.Settings.selectTheme('${t}')"
                 title="${t[0].toUpperCase() + t.slice(1)}"></div>
        `).join('');

        // Categories
        renderCategories();
        renderPaymentMethods();
    }

    function renderCategories() {
        const el = document.getElementById('settings-categories');
        const cats = ET.Utils.categories;
        el.innerHTML = cats.map(c => {
            const iconHtml = (c.icon_type === 'upload' || c.icon_type === 'image') 
                ? `<div class="w-6 h-6 rounded bg-cover bg-center" style="background-image:url('${c.icon}')"></div>`
                : `<span class="text-lg">${c.icon}</span>`;
            return `
                <div class="flex items-center justify-between glass-input rounded-lg px-3 py-2 hover:bg-white/10 transition">
                    <div class="flex items-center gap-2">
                        ${iconHtml}
                        <span class="text-sm text-[var(--text-primary)]">${escHtml(c.name)}</span>
                        <span class="w-3 h-3 rounded-full" style="background:${c.color}"></span>
                    </div>
                    <button onclick="ET.Settings.deleteCategory(${c.id})" class="text-xs text-[var(--text-secondary)] hover:text-red-400 transition tooltip-container" data-tooltip="Delete category" data-tooltip-pos="top">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        }).join('');
        
        // Re-initialize tooltips for dynamically created elements
        if (ET.Tooltip && ET.Tooltip.createTooltips) {
            ET.Tooltip.createTooltips();
        }
    }

    function renderPaymentMethods() {
        const el = document.getElementById('settings-payments');
        const pms = ET.Utils.paymentMethods;
        el.innerHTML = pms.map(p => {
            const iconHtml = (p.icon_type === 'upload' || p.icon_type === 'image') 
                ? `<div class="w-6 h-6 rounded bg-cover bg-center" style="background-image:url('${p.icon}')"></div>`
                : `<span class="text-lg">${p.icon}</span>`;
            return `
                <div class="flex items-center justify-between glass-input rounded-lg px-3 py-2 hover:bg-white/10 transition">
                    <div class="flex items-center gap-2">
                        ${iconHtml}
                        <span class="text-sm text-[var(--text-primary)]">${escHtml(p.name)}</span>
                    </div>
                    <button onclick="ET.Settings.deletePaymentMethod(${p.id})" class="text-xs text-[var(--text-secondary)] hover:text-red-400 transition tooltip-container" data-tooltip="Delete payment method" data-tooltip-pos="top">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        }).join('');
        
        // Re-initialize tooltips for dynamically created elements
        if (ET.Tooltip && ET.Tooltip.createTooltips) {
            ET.Tooltip.createTooltips();
        }
    }

    function selectTheme(theme) {
        document.body.setAttribute('data-theme', theme);
        ET.Utils.settings.color_scheme = theme;
        // Update theme label
        document.getElementById('theme-label').textContent = theme[0].toUpperCase() + theme.slice(1);
        // Update active swatch
        document.querySelectorAll('.theme-swatch').forEach(el => {
            el.classList.toggle('active', el.getAttribute('onclick').includes(`'${theme}'`));
        });
    }

    async function save() {
        const data = {
            display_currency: document.getElementById('set-currency').value,
            currency_api_url: document.getElementById('set-api-url').value,
            grid_columns: parseInt(document.getElementById('set-grid-cols').value),
            color_scheme: ET.Utils.settings.color_scheme || 'ocean',
            date_format: document.getElementById('set-date-format').value,
            custom_colors: ET.Utils.settings.custom_colors || '{}',
        };

        await ET.Utils.api('/api/settings', { method: 'PUT', body: JSON.stringify(data) });
        ET.Utils.settings = { ...ET.Utils.settings, ...data };
        ET.Utils.displayCurrency = data.display_currency;

        // Update top bar currency
        document.getElementById('display-currency').value = data.display_currency;
        // Sync custom dropdown display
        const currDropdown = document.getElementById('display-currency');
        if (currDropdown) ET.Dropdown.syncValue(currDropdown);

        // Refresh exchange rates
        await ET.Utils.fetchRates(data.display_currency);

        ET.Utils.toast('Settings saved!', 'success');
        ET.App.refreshCurrentView();
    }

    async function addCategory() {
        const name = document.getElementById('new-cat-name').value.trim();
        const iconData = document.getElementById('new-cat-icon-hidden').value.trim() || '📁';
        const iconType = document.getElementById('new-cat-icon-hidden').dataset.type || 'emoji';
        const color = document.getElementById('new-cat-color').value;
        if (!name) { ET.Utils.toast('Category name is required', 'error'); return; }

        await ET.Utils.api('/api/categories', { 
            method: 'POST', 
            body: JSON.stringify({ name, icon: iconData, icon_type: iconType, color }) 
        });
        document.getElementById('new-cat-name').value = '';
        document.getElementById('new-cat-icon-hidden').value = '📁';
        document.getElementById('new-cat-icon-hidden').dataset.type = 'emoji';
        document.getElementById('new-cat-icon-display').textContent = '📁';
        document.getElementById('new-cat-icon-display').style.backgroundImage = '';

        // Reload categories
        ET.Utils.categories = await ET.Utils.api('/api/categories') || [];
        renderCategories();
        ET.Utils.toast('Category added!', 'success');
    }

    async function deleteCategory(id) {
        ET.App.confirm(
            'Are you sure you want to delete this category? This action cannot be undone.',
            async () => {
                await ET.Utils.api(`/api/categories/${id}`, { method: 'DELETE' });
                ET.Utils.categories = await ET.Utils.api('/api/categories') || [];
                renderCategories();
                ET.Utils.toast('Category deleted', 'success');
            },
            { title: 'Delete Category', confirmText: 'Delete', dangerous: true }
        );
    }

    async function addPaymentMethod() {
        const name = document.getElementById('new-pm-name').value.trim();
        const iconData = document.getElementById('new-pm-icon-hidden').value.trim() || '💳';
        const iconType = document.getElementById('new-pm-icon-hidden').dataset.type || 'emoji';
        if (!name) { ET.Utils.toast('Name is required', 'error'); return; }

        await ET.Utils.api('/api/payment-methods', { 
            method: 'POST', 
            body: JSON.stringify({ name, icon: iconData, icon_type: iconType }) 
        });
        document.getElementById('new-pm-name').value = '';
        document.getElementById('new-pm-icon-hidden').value = '💳';
        document.getElementById('new-pm-icon-hidden').dataset.type = 'emoji';
        document.getElementById('new-pm-icon-display').textContent = '💳';
        document.getElementById('new-pm-icon-display').style.backgroundImage = '';

        ET.Utils.paymentMethods = await ET.Utils.api('/api/payment-methods') || [];
        renderPaymentMethods();
        ET.Utils.toast('Payment method added!', 'success');
    }

    async function deletePaymentMethod(id) {
        ET.App.confirm(
            'Are you sure you want to delete this payment method? This action cannot be undone.',
            async () => {
                await ET.Utils.api(`/api/payment-methods/${id}`, { method: 'DELETE' });
                ET.Utils.paymentMethods = await ET.Utils.api('/api/payment-methods') || [];
                renderPaymentMethods();
                ET.Utils.toast('Payment method deleted', 'success');
            },
            { title: 'Delete Payment Method', confirmText: 'Delete', dangerous: true }
        );
    }

    function _setNewCategoryIcon(iconData, type) {
        document.getElementById('new-cat-icon-hidden').value = iconData;
        document.getElementById('new-cat-icon-hidden').dataset.type = type;
        if (type === 'emoji') {
            document.getElementById('new-cat-icon-display').textContent = iconData;
            document.getElementById('new-cat-icon-display').style.backgroundImage = '';
        } else {
            document.getElementById('new-cat-icon-display').textContent = '';
            document.getElementById('new-cat-icon-display').style.backgroundImage = `url('${iconData}')`;
            document.getElementById('new-cat-icon-display').style.backgroundSize = 'cover';
            document.getElementById('new-cat-icon-display').style.backgroundPosition = 'center';
        }
    }

    function _setNewPaymentIcon(iconData, type) {
        document.getElementById('new-pm-icon-hidden').value = iconData;
        document.getElementById('new-pm-icon-hidden').dataset.type = type;
        if (type === 'emoji') {
            document.getElementById('new-pm-icon-display').textContent = iconData;
            document.getElementById('new-pm-icon-display').style.backgroundImage = '';
        } else {
            document.getElementById('new-pm-icon-display').textContent = '';
            document.getElementById('new-pm-icon-display').style.backgroundImage = `url('${iconData}')`;
            document.getElementById('new-pm-icon-display').style.backgroundSize = 'cover';
            document.getElementById('new-pm-icon-display').style.backgroundPosition = 'center';
        }
    }

    return {
        load, renderForm, selectTheme, save,
        addCategory, deleteCategory,
        addPaymentMethod, deletePaymentMethod,
        _setNewCategoryIcon, _setNewPaymentIcon,
        THEMES, THEME_GRADIENTS,
    };
})();
