/* ─── Expenses Module ──────────────────────────────────────────────────── */
window.ET = window.ET || {};

ET.Expenses = (function () {
    let _expenses = [];
    let _editingId = null;

    async function load() {
        _expenses = await ET.Utils.api('/api/expenses') || [];
        return _expenses;
    }

    function getAll() { return _expenses; }

    /* ── Render Board Cards ──────────────────────────────────────────── */
    function renderBoard() {
        const grid = document.getElementById('board-grid');
        const empty = document.getElementById('board-empty');
        const search = (document.getElementById('board-search').value || '').toLowerCase();
        const catFilter = document.getElementById('board-filter-cat').value;
        const sort = document.getElementById('board-sort').value;

        let items = [..._expenses];

        // Filter
        if (search) items = items.filter(e =>
            e.title.toLowerCase().includes(search) ||
            (e.description || '').toLowerCase().includes(search) ||
            (e.category_name || '').toLowerCase().includes(search));
        if (catFilter) items = items.filter(e => String(e.category_id) === catFilter);

        // Sort
        items.sort((a, b) => {
            switch (sort) {
                case 'date-asc': return a.billing_date.localeCompare(b.billing_date);
                case 'amount-desc': return b.amount - a.amount;
                case 'amount-asc': return a.amount - b.amount;
                case 'title-asc': return a.title.localeCompare(b.title);
                default: return b.billing_date.localeCompare(a.billing_date);
            }
        });

        if (items.length === 0) {
            grid.innerHTML = '';
            empty.classList.remove('hidden');
            return;
        }
        empty.classList.add('hidden');

        const cols = ET.Utils.settings.grid_columns || 3;
        grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

        grid.innerHTML = items.map((e, i) => `
            <div class="expense-card slide-up" style="animation-delay:${i * 0.03}s">
                <div class="flex items-start justify-between mb-3">
                    <div class="flex items-center gap-2.5">
                        ${renderIcon(e.category_icon_type, e.category_icon, '📌', 'lg')}
                        <div>
                            <h4 class="font-semibold text-[var(--text-primary)] text-sm leading-tight">${escHtml(e.title)}</h4>
                            <span class="text-xs text-[var(--text-secondary)]">${e.category_name || 'Uncategorized'}</span>
                        </div>
                    </div>
                    <span class="badge badge-${e.billing_interval}">${ET.Utils.intervalLabel(e.billing_interval, e.custom_interval_days)}</span>
                </div>
                ${e.description ? `<p class="text-xs text-[var(--text-secondary)] mb-3 truncate-2">${escHtml(e.description)}</p>` : ''}
                <div class="flex items-end justify-between mt-auto">
                    <div>
                        <div class="amount-display text-lg text-[var(--text-primary)]">${ET.Utils.convertAndFormat(e.amount, e.currency)}</div>
                        ${e.currency !== ET.Utils.displayCurrency ? `<div class="text-xs text-[var(--text-secondary)]">${ET.Utils.formatMoneyFull(e.amount, e.currency)}</div>` : ''}
                    </div>
                    <div class="flex items-center gap-2 text-xs text-[var(--text-secondary)] min-w-0">
                        ${e.payment_method_name ? renderIcon(e.payment_method_icon_type, e.payment_method_icon, '💳', 'sm') : ''}
                        <span class="truncate">${escHtml(e.payment_method_name || '')}</span>
                    </div>
                </div>
                <div class="flex items-center justify-between mt-3 pt-3 border-t border-[var(--card-border)]">
                    <span class="text-xs text-[var(--text-secondary)]"><i class="far fa-calendar mr-1"></i>${ET.Utils.formatDate(e.billing_date)}</span>
                    <div class="flex gap-1">
                        <button onclick="ET.Expenses.openEditModal(${e.id})" class="px-2 py-1 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/10 transition tooltip-container" data-tooltip="Edit expense" data-tooltip-pos="top">
                            <i class="fas fa-pen"></i>
                        </button>
                        <button onclick="ET.Expenses.deleteExpense(${e.id})" class="px-2 py-1 rounded-lg text-xs text-[var(--text-secondary)] hover:text-red-400 hover:bg-white/10 transition tooltip-container" data-tooltip="Delete expense" data-tooltip-pos="top">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
        
        // Re-initialize tooltips for dynamically created elements
        if (ET.Tooltip && ET.Tooltip.createTooltips) {
            ET.Tooltip.createTooltips();
        }
    }

    /* ── Render Table ────────────────────────────────────────────────── */
    function renderTable() {
        const tbody = document.getElementById('expenses-table-body');
        const intervalFilter = document.getElementById('exp-filter-interval').value;
        const categoryFilter = document.getElementById('exp-filter-category')?.value || '';
        const paymentFilter = document.getElementById('exp-filter-payment')?.value || '';
        const activeOnly = document.getElementById('exp-active-only').checked;

        let items = [..._expenses];
        if (intervalFilter) items = items.filter(e => e.billing_interval === intervalFilter);
        if (categoryFilter) items = items.filter(e => e.category_id == categoryFilter);
        if (paymentFilter) items = items.filter(e => e.payment_method_id == paymentFilter);
        if (activeOnly) items = items.filter(e => e.is_active);

        tbody.innerHTML = items.map(e => `
            <tr class="table-row">
                <td class="px-4 py-3">
                    <div class="flex items-center gap-2">
                        ${renderIcon(e.category_icon_type, e.category_icon, '📌', 'sm')}
                        <div>
                            <div class="font-medium text-[var(--text-primary)]">${escHtml(e.title)}</div>
                            ${e.description ? `<div class="text-xs text-[var(--text-secondary)] truncate max-w-[200px]">${escHtml(e.description)}</div>` : ''}
                        </div>
                    </div>
                </td>
                <td class="px-4 py-3 amount-display text-[var(--text-primary)]">${ET.Utils.convertAndFormat(e.amount, e.currency)}</td>
                <td class="px-4 py-3 hidden md:table-cell"><span style="color:${e.category_color || '#94a3b8'}">${e.category_name || '-'}</span></td>
                <td class="px-4 py-3 hidden md:table-cell">
                    <div class="flex items-center gap-2 min-w-0">
                        ${e.payment_method_name ? renderIcon(e.payment_method_icon_type, e.payment_method_icon, '💳', 'sm') : ''}
                        <span class="truncate">${escHtml(e.payment_method_name || '-')}</span>
                    </div>
                </td>
                <td class="px-4 py-3 text-[var(--text-secondary)]">${ET.Utils.formatDate(e.billing_date)}</td>
                <td class="px-4 py-3 hidden sm:table-cell"><span class="badge badge-${e.billing_interval}">${ET.Utils.intervalLabel(e.billing_interval, e.custom_interval_days)}</span></td>
                <td class="px-4 py-3 text-right">
                    <button onclick="ET.Expenses.openEditModal(${e.id})" class="px-2 py-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition tooltip-container" data-tooltip="Edit" data-tooltip-pos="top"><i class="fas fa-pen text-xs"></i></button>
                    <button onclick="ET.Expenses.remove(${e.id})" class="px-2 py-1 rounded text-[var(--text-secondary)] hover:text-red-400 transition"><i class="fas fa-trash text-xs"></i></button>
                </td>
            </tr>
        `).join('');
        
        // Re-initialize tooltips for dynamically created elements
        if (ET.Tooltip && ET.Tooltip.createTooltips) {
            ET.Tooltip.createTooltips();
        }
    }

    /* ── Summary Cards ───────────────────────────────────────────────── */
    function renderSummary(stats) {
        const el = document.getElementById('board-summary');
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const dim = daysInMonth(year, month);

        let monthTotal = 0;
        let recurringTotal = 0;
        let recurringCount = 0;
        let peakDayTotal = 0;

        for (let d = 1; d <= dim; d++) {
            const dt = new Date(year, month - 1, d);
            let dayTotal = 0;
            _expenses.forEach(exp => {
                if (exp.is_active === 0) return;
                if (!occursOnDate(exp, dt)) return;
                dayTotal += ET.Utils.convert(exp.amount, exp.currency, ET.Utils.displayCurrency);
            });
            if (dayTotal > peakDayTotal) peakDayTotal = dayTotal;
        }

        _expenses.forEach(exp => {
            if (exp.is_active === 0) return;

            const countInMonth = getOccurrenceCountInMonth(exp, year, month);
            if (countInMonth <= 0) return;

            const converted = ET.Utils.convert(exp.amount * countInMonth, exp.currency, ET.Utils.displayCurrency);
            if ((exp.billing_interval || 'once') === 'once') {
                monthTotal += converted;
            } else {
                recurringTotal += converted;
            }
        });

        recurringCount = _expenses.filter(e => e.is_active !== 0 && (e.billing_interval || 'once') !== 'once').length;
        const totalCount = (_expenses && _expenses.length) || stats.total_count || 0;
        
        el.innerHTML = `
            <div class="summary-card">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center"><i class="fas fa-calendar-check text-cyan-400"></i></div>
                    <div>
                        <div class="text-xs text-[var(--text-secondary)]">Peek This Month</div>
                        <div class="amount-display text-xl text-[var(--text-primary)]">${ET.Utils.formatMoney(peakDayTotal, ET.Utils.displayCurrency)}</div>
                    </div>
                </div>
            </div>
            <div class="summary-card">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center"><i class="fas fa-sync-alt text-purple-400"></i></div>
                    <div>
                        <div class="text-xs text-[var(--text-secondary)]">Recurring (${recurringCount})</div>
                        <div class="amount-display text-xl text-[var(--text-primary)]">${ET.Utils.formatMoney(recurringTotal, ET.Utils.displayCurrency)}</div>
                    </div>
                </div>
            </div>
            <div class="summary-card">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center"><i class="fas fa-receipt text-amber-400"></i></div>
                    <div>
                        <div class="text-xs text-[var(--text-secondary)]">Total Expenses</div>
                        <div class="amount-display text-xl text-[var(--text-primary)]">${totalCount}</div>
                    </div>
                </div>
            </div>
            <div class="summary-card">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center"><i class="fas fa-wallet text-emerald-400"></i></div>
                    <div>
                        <div class="text-xs text-[var(--text-secondary)]">Combined Total</div>
                        <div class="amount-display text-xl text-[var(--text-primary)]">${ET.Utils.formatMoney(monthTotal + recurringTotal, ET.Utils.displayCurrency)}</div>
                    </div>
                </div>
            </div>`;
    }

    function parseYmd(dateStr) {
        const [y, m, d] = String(dateStr || '').split('-').map(Number);
        if (!y || !m || !d) return null;
        return new Date(y, m - 1, d);
    }

    function normalizeDate(dt) {
        const d = new Date(dt);
        d.setHours(0, 0, 0, 0);
        return d;
    }

    function sameYearMonth(dt, year, month) {
        return dt.getFullYear() === year && (dt.getMonth() + 1) === month;
    }

    function daysInMonth(year, month) {
        return new Date(year, month, 0).getDate();
    }

    function occursOnDate(expense, targetDate) {
        const billing = parseYmd(expense.billing_date);
        if (!billing) return false;

        const interval = expense.billing_interval || 'once';
        const dt = normalizeDate(targetDate);
        const b = normalizeDate(billing);
        if (dt < b) return false;

        if (interval === 'once') {
            return dt.getTime() === b.getTime();
        }

        if (interval === 'daily') {
            return true;
        }

        const wd = dt.getDay();
        const mon0 = (wd + 6) % 7; // Mon=0 ... Sun=6

        if (interval === 'weekdays') return mon0 <= 4;
        if (interval === 'weekends') return mon0 >= 5;
        if (interval === 'specific_days') {
            const selected = String(expense.specific_days || '')
                .split(',')
                .map(x => parseInt(x, 10))
                .filter(Number.isInteger);
            return selected.includes(mon0);
        }

        const msPerDay = 24 * 60 * 60 * 1000;
        const diffDays = Math.round((dt.getTime() - b.getTime()) / msPerDay);

        if (interval === 'weekly') return diffDays % 7 === 0;
        if (interval === 'biweekly') return diffDays % 14 === 0;
        if (interval === 'custom') {
            const step = parseInt(expense.custom_interval_days, 10) || 0;
            return step > 0 && diffDays % step === 0;
        }

        const stepMonths = interval === 'monthly' ? 1
            : interval === 'bimonthly' ? 2
            : interval === 'quarterly' ? 3
            : interval === 'semiannually' ? 6
            : interval === 'yearly' ? 12
            : 0;

        if (stepMonths > 0) {
            const monthsDiff = (dt.getFullYear() - b.getFullYear()) * 12 + (dt.getMonth() - b.getMonth());
            if (monthsDiff < 0 || monthsDiff % stepMonths !== 0) return false;
            const dom = Math.min(b.getDate(), daysInMonth(dt.getFullYear(), dt.getMonth() + 1));
            return dt.getDate() === dom;
        }

        return false;
    }

    function getOccurrenceCountInMonth(expense, year, month) {
        const billing = parseYmd(expense.billing_date);
        if (!billing) return 0;

        const interval = expense.billing_interval || 'once';
        const dim = daysInMonth(year, month);
        const monthStart = new Date(year, month - 1, 1);

        if (interval === 'once') {
            return sameYearMonth(billing, year, month) ? 1 : 0;
        }

        if (interval === 'daily') {
            let count = 0;
            for (let d = 1; d <= dim; d++) {
                const dt = new Date(year, month - 1, d);
                if (dt >= billing) count++;
            }
            return count;
        }

        if (interval === 'weekdays' || interval === 'weekends' || interval === 'specific_days') {
            const selected = interval === 'specific_days'
                ? String(expense.specific_days || '').split(',').map(x => parseInt(x, 10)).filter(Number.isInteger)
                : null;
            let count = 0;
            for (let d = 1; d <= dim; d++) {
                const dt = new Date(year, month - 1, d);
                if (dt < billing) continue;
                const wd = dt.getDay();
                const mon0 = (wd + 6) % 7; // convert JS Sun=0..Sat=6 to Mon=0..Sun=6
                if (interval === 'weekdays' && mon0 <= 4) count++;
                else if (interval === 'weekends' && mon0 >= 5) count++;
                else if (interval === 'specific_days' && selected.includes(mon0)) count++;
            }
            return count;
        }

        if (interval === 'weekly' || interval === 'biweekly') {
            const step = interval === 'weekly' ? 7 : 14;
            let dt = new Date(billing);
            while (dt < monthStart) dt.setDate(dt.getDate() + step);
            let count = 0;
            while (sameYearMonth(dt, year, month)) {
                if (dt >= billing) count++;
                dt.setDate(dt.getDate() + step);
            }
            return count;
        }

        if (interval === 'custom') {
            const step = parseInt(expense.custom_interval_days, 10) || 0;
            if (step <= 0) return 0;
            let dt = new Date(billing);
            while (dt < monthStart) dt.setDate(dt.getDate() + step);
            let count = 0;
            while (sameYearMonth(dt, year, month)) {
                if (dt >= billing) count++;
                dt.setDate(dt.getDate() + step);
            }
            return count;
        }

        if (interval === 'monthly' || interval === 'bimonthly' || interval === 'quarterly' || interval === 'semiannually' || interval === 'yearly') {
            const stepMonths = interval === 'monthly' ? 1
                : interval === 'bimonthly' ? 2
                : interval === 'quarterly' ? 3
                : interval === 'semiannually' ? 6
                : 12;

            let dt = new Date(billing);
            while (dt < monthStart) {
                const m = dt.getMonth() + 1 + stepMonths;
                const y = dt.getFullYear() + Math.floor((m - 1) / 12);
                const nm = ((m - 1) % 12) + 1;
                const targetDay = Math.min(dt.getDate(), new Date(y, nm, 0).getDate());
                dt = new Date(y, nm - 1, targetDay);
            }
            return sameYearMonth(dt, year, month) && dt >= billing ? 1 : 0;
        }

        return 0;
    }

    /* ── Populate category filter ────────────────────────────────────── */
    function populateFilters() {
        const sel = document.getElementById('board-filter-cat');
        const cats = ET.Utils.categories;
        const iconText = c => (c.icon_type === 'upload' || c.icon_type === 'image') ? '🖼️' : (c.icon || '📁');
        sel.innerHTML = '<option value="">All Categories</option>' +
            cats.map(c => `<option value="${c.id}" data-icon="${escAttr(c.icon || '')}" data-icon-type="${escAttr(c.icon_type || 'emoji')}" data-label="${escAttr(c.name || 'Uncategorized')}">${iconText(c)} ${escHtml(c.name || 'Uncategorized')}</option>`).join('');
    }

    /* ── Modal Form ──────────────────────────────────────────────────── */
    function buildForm(expense, defaultDate) {
        const e = expense || {};
        const cats = ET.Utils.categories;
        const pms = ET.Utils.paymentMethods;
        const iconText = (item, fallback) => (item.icon_type === 'upload' || item.icon_type === 'image') ? '🖼️' : (item.icon || fallback);
        const currencies = Object.keys(ET.Utils.CURRENCY_SYMBOLS);
        const billingDate = e.billing_date || defaultDate || new Date().toISOString().split('T')[0];

        return `
        <form id="expense-form" class="space-y-4">
            <div>
                <label class="block text-xs text-[var(--text-secondary)] mb-1">Title *</label>
                <input name="title" required value="${escAttr(e.title || '')}" class="glass-input w-full px-3 py-2.5 rounded-xl text-[var(--text-primary)] text-sm" placeholder="e.g., Netflix Subscription">
            </div>
            <div>
                <label class="block text-xs text-[var(--text-secondary)] mb-1">Description</label>
                <textarea name="description" rows="2" class="glass-input w-full px-3 py-2.5 rounded-xl text-[var(--text-primary)] text-sm" placeholder="Optional notes...">${escHtml(e.description || '')}</textarea>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs text-[var(--text-secondary)] mb-1">Amount *</label>
                    <input name="amount" type="number" step="0.01" min="0" required value="${e.amount || ''}" class="glass-input w-full px-3 py-2.5 rounded-xl text-[var(--text-primary)] text-sm" placeholder="0.00">
                </div>
                <div>
                    <label class="block text-xs text-[var(--text-secondary)] mb-1">Currency</label>
                    <select name="currency" class="glass-input w-full px-3 py-2.5 rounded-xl text-[var(--text-primary)] text-sm">
                        ${currencies.map(c => `<option value="${c}" ${(e.currency || ET.Utils.displayCurrency) === c ? 'selected' : ''}>${c} ${ET.Utils.CURRENCY_SYMBOLS[c]}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs text-[var(--text-secondary)] mb-1">Category</label>
                    <select name="category_id" class="glass-input w-full px-3 py-2.5 rounded-xl text-[var(--text-primary)] text-sm">
                        <option value="">None</option>
                        ${cats.map(c => `<option value="${c.id}" data-icon="${escAttr(c.icon || '')}" data-icon-type="${escAttr(c.icon_type || 'emoji')}" data-label="${escAttr(c.name || 'Uncategorized')}" ${e.category_id == c.id ? 'selected' : ''}>${iconText(c, '📁')} ${escHtml(c.name || 'Uncategorized')}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-xs text-[var(--text-secondary)] mb-1">Payment Method</label>
                    <select name="payment_method_id" class="glass-input w-full px-3 py-2.5 rounded-xl text-[var(--text-primary)] text-sm">
                        <option value="">None</option>
                        ${pms.map(p => `<option value="${p.id}" data-icon="${escAttr(p.icon || '')}" data-icon-type="${escAttr(p.icon_type || 'emoji')}" data-label="${escAttr(p.name || 'Payment Method')}" ${e.payment_method_id == p.id ? 'selected' : ''}>${iconText(p, '💳')} ${escHtml(p.name || 'Payment Method')}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div>
                <label class="block text-xs text-[var(--text-secondary)] mb-1">Billing Date *</label>
                <input name="billing_date" type="date" required value="${billingDate}" class="glass-input w-full px-3 py-2.5 rounded-xl text-[var(--text-primary)] text-sm">
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs text-[var(--text-secondary)] mb-1">Billing Interval</label>
                    <select name="billing_interval" class="glass-input w-full px-3 py-2.5 rounded-xl text-[var(--text-primary)] text-sm" onchange="ET.Expenses._toggleIntervalOptions(this.value, '${e.billing_interval}')">
                        <option value="once" ${(e.billing_interval || 'once') === 'once' ? 'selected' : ''}>One-time</option>
                        <option value="daily" ${e.billing_interval === 'daily' ? 'selected' : ''}>Daily</option>
                        <option value="weekdays" ${e.billing_interval === 'weekdays' ? 'selected' : ''}>Weekdays only (Mon-Fri)</option>
                        <option value="weekends" ${e.billing_interval === 'weekends' ? 'selected' : ''}>Weekends only (Sat-Sun)</option>
                        <option value="specific_days" ${e.billing_interval === 'specific_days' ? 'selected' : ''}>Specific days of week...</option>
                        <option value="weekly" ${e.billing_interval === 'weekly' ? 'selected' : ''}>Weekly</option>
                        <option value="biweekly" ${e.billing_interval === 'biweekly' ? 'selected' : ''}>Biweekly</option>
                        <option value="monthly" ${e.billing_interval === 'monthly' ? 'selected' : ''}>Monthly</option>
                        <option value="bimonthly" ${e.billing_interval === 'bimonthly' ? 'selected' : ''}>Bimonthly</option>
                        <option value="quarterly" ${e.billing_interval === 'quarterly' ? 'selected' : ''}>Quarterly</option>
                        <option value="semiannually" ${e.billing_interval === 'semiannually' ? 'selected' : ''}>Semi-annually</option>
                        <option value="yearly" ${e.billing_interval === 'yearly' ? 'selected' : ''}>Yearly</option>
                        <option value="custom" ${e.billing_interval === 'custom' ? 'selected' : ''}>Custom days...</option>
                    </select>
                </div>
                <div id="custom-interval-row" style="display:${e.billing_interval === 'custom' ? 'block' : 'none'}">
                    <label class="block text-xs text-[var(--text-secondary)] mb-1">Every N Days</label>
                    <input name="custom_interval_days" type="number" min="1" value="${e.custom_interval_days || 1}" class="glass-input w-full px-3 py-2.5 rounded-xl text-[var(--text-primary)] text-sm">
                </div>
            </div>
            
            <!-- Specific Days of Week Selector -->
            <div id="specific-days-row" class="grid grid-cols-7 gap-1" style="display:${e.billing_interval === 'specific_days' ? 'grid' : 'none'}">
                ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
                    const checked = e.specific_days ? e.specific_days.split(',').map(Number).includes(i) : false;
                    return `
                        <label class="flex flex-col items-center glass-input rounded-lg px-2 py-2 cursor-pointer hover:bg-white/10 transition">
                            <input type="checkbox" name="specific_days" value="${i}" ${checked ? 'checked' : ''} class="accent-cyan-500 mb-1">
                            <span class="text-xs text-[var(--text-secondary)]">${day}</span>
                        </label>
                    `;
                }).join('')}
            </div>
            
            <div class="flex items-center gap-2">
                <input name="is_active" type="checkbox" ${e.is_active !== 0 ? 'checked' : ''} class="accent-cyan-500">
                <label class="text-sm text-[var(--text-secondary)]">Active</label>
            </div>
            <div class="flex gap-3 pt-2">
                <button type="submit" class="btn-primary flex-1 py-2.5 rounded-xl text-sm font-medium tooltip-container" data-tooltip="Save expense" data-tooltip-pos="top">
                    <i class="fas fa-save mr-1"></i> ${expense ? 'Update' : 'Create'} Expense
                </button>
                <button type="button" onclick="ET.App.closeModal()" class="btn-ghost px-5 py-2.5 rounded-xl text-sm tooltip-container" data-tooltip="Cancel without saving" data-tooltip-pos="top">Cancel</button>
            </div>
        </form>`;
    }

    function openAddModal(defaultDate) {
        _editingId = null;
        ET.App.openModal('Add Expense', buildForm(null, defaultDate));
        document.getElementById('expense-form').addEventListener('submit', handleSubmit);
    }

    function openEditModal(id) {
        const exp = _expenses.find(e => e.id === id);
        if (!exp) return;
        _editingId = id;
        ET.App.openModal('Edit Expense', buildForm(exp));
        document.getElementById('expense-form').addEventListener('submit', handleSubmit);
    }

    async function handleSubmit(ev) {
        ev.preventDefault();
        const form = ev.target;
        
        // Collect specific days of week if selected
        let specificDays = null;
        if (form.billing_interval.value === 'specific_days') {
            const checked = Array.from(form.querySelectorAll('input[name="specific_days"]:checked'));
            specificDays = checked.map(cb => parseInt(cb.value)).join(',');
            if (!specificDays) {
                ET.Utils.toast('Please select at least one day of the week', 'error');
                return;
            }
        }
        
        const data = {
            title: form.title.value.trim(),
            description: form.description.value.trim(),
            amount: parseFloat(form.amount.value),
            currency: form.currency.value,
            category_id: form.category_id.value || null,
            payment_method_id: form.payment_method_id.value || null,
            billing_date: form.billing_date.value,
            billing_interval: form.billing_interval.value,
            custom_interval_days: parseInt(form.custom_interval_days.value) || 0,
            specific_days: specificDays,
            is_active: form.is_active.checked ? 1 : 0,
        };

        if (!data.title || !data.amount || !data.billing_date) {
            ET.Utils.toast('Please fill all required fields', 'error');
            return;
        }

        if (_editingId) {
            await ET.Utils.api(`/api/expenses/${_editingId}`, { method: 'PUT', body: JSON.stringify(data) });
            ET.Utils.toast('Expense updated!', 'success');
        } else {
            await ET.Utils.api('/api/expenses', { method: 'POST', body: JSON.stringify(data) });
            ET.Utils.toast('Expense created!', 'success');
        }
        ET.App.closeModal();
        await load();
        ET.App.refreshCurrentView();
    }

    async function remove(id) {
        ET.App.confirm(
            'Are you sure you want to delete this expense? This action cannot be undone.',
            async () => {
                await ET.Utils.api(`/api/expenses/${id}`, { method: 'DELETE' });
                ET.Utils.toast('Expense deleted', 'success');
                await load();
                ET.App.refreshCurrentView();
            },
            { title: 'Delete Expense', confirmText: 'Delete', dangerous: true }
        );
    }

    /* ── HTML helpers ────────────────────────────────────────────────── */
    function escHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
    function escAttr(s) { return String(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

    function inferIconType(iconType, iconValue) {
        if (iconType) return iconType;
        const v = String(iconValue || '');
        if (v.startsWith('data:image/') || v.startsWith('http')) return 'image';
        return 'emoji';
    }

    function renderIcon(iconType, iconValue, fallback = '📌', sizeClass = 'sm') {
        const type = inferIconType(iconType, iconValue);
        const value = iconValue || fallback;
        if (ET.IconUpload && ET.IconUpload.renderIcon) {
            return ET.IconUpload.renderIcon(type, value, sizeClass);
        }
        return `<span class="icon-display emoji ${sizeClass}">${escHtml(value)}</span>`;
    }

    // Toggle interval-specific options in the modal
    function _toggleIntervalOptions(value) {
        const customRow = document.getElementById('custom-interval-row');
        const specificDaysRow = document.getElementById('specific-days-row');
        
        // Hide all special options first
        if (customRow) customRow.style.display = 'none';
        if (specificDaysRow) specificDaysRow.style.display = 'none';
        
        // Show the appropriate one
        if (value === 'custom' && customRow) {
            customRow.style.display = 'block';
        } else if (value === 'specific_days' && specificDaysRow) {
            specificDaysRow.style.display = 'grid';
        }
    }

    // Make escHtml globally available
    window.escHtml = escHtml;
    window.escAttr = escAttr;

    return {
        load, getAll, renderBoard, renderTable, renderSummary,
        populateFilters, openAddModal, openEditModal, remove,
        deleteExpense: remove,  // Alias for backward compatibility
        _toggleIntervalOptions,  // For use in inline onclick handlers
    };
})();
