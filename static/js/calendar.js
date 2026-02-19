/* ─── Calendar Module (Enhanced) ───────────────────────────────────────── */
window.ET = window.ET || {};

ET.Calendar = (function () {
    let _year, _month;
    let _calData = {};
    let _selectedDate = null;
    let _viewMode = 'month'; // 'month' or 'week'
    let _weekStart = null;
    let _rangeSelecting = false;
    let _rangeStart = null;
    let _rangeEnd = null;
    let _ignoreClickOnce = false;

    const MONTHS = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December'];

    function init() {
        const now = new Date();
        _year = now.getFullYear();
        _month = now.getMonth() + 1;
        _weekStart = getWeekStart(now);
        initDateSelectors();
    }

    function getWeekStart(date) {
        const d = new Date(date);
        d.setDate(d.getDate() - d.getDay());
        d.setHours(0, 0, 0, 0);
        return d;
    }

    function initDateSelectors() {
        const dateInput = document.getElementById('calendar-date-input');
        const monthSelect = document.getElementById('calendar-month-select');
        const yearSelect = document.getElementById('calendar-year-select');
        if (!dateInput || !monthSelect || !yearSelect) return;

        const now = new Date();
        const startYear = now.getFullYear() - 5;
        const endYear = now.getFullYear() + 5;
        yearSelect.innerHTML = '';
        for (let y = startYear; y <= endYear; y++) {
            const opt = document.createElement('option');
            opt.value = String(y);
            opt.textContent = String(y);
            yearSelect.appendChild(opt);
        }

        dateInput.addEventListener('change', async () => {
            if (!dateInput.value) return;
            const [y, m, d] = dateInput.value.split('-').map(Number);
            _year = y;
            _month = m;
            _selectedDate = dateInput.value;
            await load();
            render();
            showDetail(_selectedDate);
        });

        monthSelect.addEventListener('change', async () => {
            _month = parseInt(monthSelect.value, 10);
            await load();
            render();
        });

        yearSelect.addEventListener('change', async () => {
            _year = parseInt(yearSelect.value, 10);
            await load();
            render();
        });
    }

    function syncDateSelectors() {
        const dateInput = document.getElementById('calendar-date-input');
        const monthSelect = document.getElementById('calendar-month-select');
        const yearSelect = document.getElementById('calendar-year-select');
        if (!dateInput || !monthSelect || !yearSelect) return;

        monthSelect.value = String(_month);
        yearSelect.value = String(_year);

        const today = new Date();
        if (_selectedDate) {
            dateInput.value = _selectedDate;
        } else if (today.getFullYear() === _year && today.getMonth() + 1 === _month) {
            dateInput.value = today.toISOString().split('T')[0];
        } else {
            dateInput.value = `${_year}-${String(_month).padStart(2, '0')}-01`;
        }

        if (window.ET && ET.Dropdown) {
            ET.Dropdown.refresh(monthSelect);
            ET.Dropdown.refresh(yearSelect);
            ET.Dropdown.syncValue(monthSelect);
            ET.Dropdown.syncValue(yearSelect);
        }
    }

    async function load() {
        _calData = await ET.Utils.api(`/api/calendar?year=${_year}&month=${_month}`) || {};
    }

    function render() {
        const title = document.getElementById('calendar-title');
        title.textContent = `${MONTHS[_month - 1]} ${_year}`;

        renderMonthSummary();
        updateViewButtons();
        syncDateSelectors();

        if (_viewMode === 'month') {
            renderMonthView();
            bindMonthInteractions();
        } else {
            renderWeekView();
        }

        // Hide detail panel on re-render
        document.getElementById('calendar-detail').classList.add('hidden');
    }

    function updateViewButtons() {
        document.querySelectorAll('.cal-view-btn').forEach(btn => {
            const isActive = btn.id === `cal-view-${_viewMode}`;
            btn.classList.toggle('active', isActive);
            btn.classList.toggle('text-[var(--text-primary)]', isActive);
            btn.classList.toggle('text-[var(--text-secondary)]', !isActive);
        });
    }

    function renderMonthSummary() {
        const el = document.getElementById('calendar-month-summary');
        if (!el) return;

        let totalAmount = 0;
        let totalItems = 0;
        let activeDays = 0;

        Object.values(_calData).forEach(items => {
            if (items.length > 0) {
                activeDays++;
                totalItems += items.length;
                items.forEach(it => {
                    totalAmount += ET.Utils.convert(it.amount, it.currency, ET.Utils.displayCurrency);
                });
            }
        });

        if (totalItems === 0) {
            el.innerHTML = `<span class="text-[var(--text-secondary)] text-xs"><i class="fas fa-info-circle mr-1"></i>No expenses this month</span>`;
            return;
        }

        el.innerHTML = `
            <div class="flex items-center gap-4 text-xs flex-wrap">
                <span class="flex items-center gap-1.5">
                    <i class="fas fa-coins text-[var(--accent)]"></i>
                    <span class="amount-display text-[var(--text-primary)]">${ET.Utils.formatMoney(totalAmount)}</span>
                </span>
                <span class="text-[var(--text-secondary)]">${totalItems} expense${totalItems !== 1 ? 's' : ''} · ${activeDays} day${activeDays !== 1 ? 's' : ''}</span>
            </div>`;
    }

    function renderMonthView() {
        const grid = document.getElementById('calendar-grid');
        grid.className = 'grid grid-cols-7';

        const firstDay = new Date(_year, _month - 1, 1).getDay();
        const daysInMonth = new Date(_year, _month, 0).getDate();
        const prevDays = new Date(_year, _month - 1, 0).getDate();
        const today = new Date();

        let html = '';

        // Previous month trailing days
        for (let i = firstDay - 1; i >= 0; i--) {
            const day = prevDays - i;
            html += `<div class="calendar-day other-month">
                <div class="cal-day-num text-[var(--text-secondary)]">${day}</div>
            </div>`;
        }

        // Current month days
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${_year}-${String(_month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const items = _calData[dateStr] || [];
            const isToday = today.getFullYear() === _year && today.getMonth() + 1 === _month && today.getDate() === d;
            const isSelected = _selectedDate === dateStr;
            const total = items.reduce((sum, it) =>
                sum + ET.Utils.convert(it.amount, it.currency, ET.Utils.displayCurrency), 0);

            // Show event previews (first 2 items as text labels)
            const previews = items.slice(0, 2).map(it =>
                `<div class="cal-event" style="border-left:3px solid ${it.category_color || 'var(--accent)'}">
                    <span class="cal-event-title">${escHtml(it.title)}</span>
                </div>`
            ).join('');

            const moreCount = items.length > 2
                ? `<div class="cal-more">+${items.length - 2} more</div>` : '';

            html += `
            <div class="calendar-day${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}" data-date="${dateStr}">
                <div class="flex items-center justify-between mb-1">
                    <span class="cal-day-num${isToday ? ' cal-today-num' : ''}">${d}</span>
                    ${total > 0 ? `<span class="cal-total">${ET.Utils.formatMoney(total)}</span>` : ''}
                </div>
                <div class="cal-events">${previews}${moreCount}</div>
            </div>`;
        }

        // Next month leading days
        const totalCells = firstDay + daysInMonth;
        const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
        for (let i = 1; i <= remaining; i++) {
            html += `<div class="calendar-day other-month">
                <div class="cal-day-num text-[var(--text-secondary)]">${i}</div>
            </div>`;
        }

        grid.innerHTML = html;
    }

    function bindMonthInteractions() {
        const grid = document.getElementById('calendar-grid');
        if (!grid) return;

        grid.onmousedown = (e) => {
            const dayEl = e.target.closest('.calendar-day[data-date]');
            if (!dayEl) return;
            _rangeSelecting = true;
            _rangeStart = dayEl.dataset.date;
            _rangeEnd = dayEl.dataset.date;
            _ignoreClickOnce = false;
            updateRangeHighlight();
            e.preventDefault();

            const onMouseUp = () => {
                if (!_rangeSelecting) return;
                _rangeSelecting = false;
                _ignoreClickOnce = true;
                showRangeSummary(_rangeStart, _rangeEnd);
                document.removeEventListener('mouseup', onMouseUp);
            };
            document.addEventListener('mouseup', onMouseUp);
        };

        grid.onmouseover = (e) => {
            if (!_rangeSelecting) return;
            const dayEl = e.target.closest('.calendar-day[data-date]');
            if (!dayEl) return;
            _rangeEnd = dayEl.dataset.date;
            updateRangeHighlight();
        };

        grid.onclick = (e) => {
            const dayEl = e.target.closest('.calendar-day[data-date]');
            if (!dayEl) return;
            if (_ignoreClickOnce) {
                _ignoreClickOnce = false;
                return;
            }
            clearRangeHighlight();
            showDetail(dayEl.dataset.date);
        };
    }

    function updateRangeHighlight() {
        clearRangeHighlight();
        if (!_rangeStart || !_rangeEnd) return;

        const [start, end] = normalizeRange(_rangeStart, _rangeEnd);
        document.querySelectorAll('.calendar-day[data-date]').forEach(el => {
            const date = el.dataset.date;
            if (date >= start && date <= end) {
                el.classList.add('range-in');
            }
            if (date === start) el.classList.add('range-start');
            if (date === end) el.classList.add('range-end');
        });
    }

    function clearRangeHighlight() {
        document.querySelectorAll('.calendar-day.range-in, .calendar-day.range-start, .calendar-day.range-end').forEach(el => {
            el.classList.remove('range-in', 'range-start', 'range-end');
        });
    }

    function updateSelectedHighlight() {
        document.querySelectorAll('.calendar-day.selected').forEach(el => el.classList.remove('selected'));
        if (_selectedDate) {
            const sel = document.querySelector(`.calendar-day[data-date="${_selectedDate}"]`);
            if (sel) sel.classList.add('selected');
        }
    }

    function normalizeRange(a, b) {
        return a <= b ? [a, b] : [b, a];
    }

    function showRangeSummary(start, end) {
        if (!start || !end) return;
        const [from, to] = normalizeRange(start, end);
        let total = 0;
        let count = 0;
        let expenses = [];

        Object.keys(_calData).forEach(date => {
            if (date >= from && date <= to) {
                const items = _calData[date] || [];
                items.forEach(it => {
                    count++;
                    total += ET.Utils.convert(it.amount, it.currency, ET.Utils.displayCurrency);
                    expenses.push({ ...it, date });
                });
            }
        });

        // Sort by date descending
        expenses.sort((a, b) => new Date(b.date) - new Date(a.date));

        const detailEl = document.getElementById('calendar-detail');
        const titleEl = document.getElementById('calendar-detail-title');
        const itemsEl = document.getElementById('calendar-detail-items');

        titleEl.innerHTML = `<i class="far fa-calendar-alt mr-2 text-[var(--accent)]"></i>Range Summary`;
        
        let rangeHTML = `
            <div class="mb-4">
                <div class="flex items-center justify-between mb-3">
                    <div>
                        <div class="flex items-center gap-2 mb-1">
                            <input type="date" id="range-from" value="${from}" class="glass-input px-2 py-1 rounded-lg text-xs text-[var(--text-primary)]" onchange="ET.Calendar._updateRangeInputs()"/>
                            <span class="text-[var(--text-secondary)] mx-1">to</span>
                            <input type="date" id="range-to" value="${to}" class="glass-input px-2 py-1 rounded-lg text-xs text-[var(--text-primary)]" onchange="ET.Calendar._updateRangeInputs()"/>
                        </div>
                        <div class="text-xs text-[var(--text-secondary)]">${count} expense${count !== 1 ? 's' : ''}</div>
                    </div>
                    <div class="text-right">
                        <div class="text-xs text-[var(--text-secondary)]">Total</div>
                        <div class="amount-display text-[var(--text-primary)] text-base">${ET.Utils.formatMoney(total)}</div>
                    </div>
                </div>
                <div class="border-b border-[var(--card-border)]"></div>
            </div>`;

        if (expenses.length > 0) {
            rangeHTML += `
                <div class="mb-3">
                    <button onclick="ET.Calendar._toggleRangeDetails()" id="range-toggle-btn" class="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] hover:text-[var(--accent)] transition py-2">
                        <i class="fas fa-chevron-right transition-transform" id="range-toggle-icon"></i>
                        <span>Detailed Breakdown</span>
                    </button>
                </div>
                <div id="range-details" class="hidden space-y-2 max-h-96 overflow-y-auto">
                    ${expenses.map(it => `
                        <div class="flex items-center justify-between glass-input rounded-xl px-3 py-2 hover:bg-white/10 transition text-sm">
                            <div class="flex items-center gap-2 flex-1">
                                <div class="w-6 h-6 rounded flex items-center justify-center text-xs flex-shrink-0" style="background:${(it.category_color || 'var(--accent)') + '33'}">
                                    ${renderIcon(it.category_icon_type, it.category_icon, '📌', 'sm')}
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div class="text-[var(--text-primary)] truncate font-medium">${escHtml(it.title)}</div>
                                    <div class="text-xs text-[var(--text-secondary)] flex items-center gap-1.5 min-w-0">
                                        <span>${ET.Utils.formatDate(it.date)} · ${it.category_name || 'Uncategorized'}</span>
                                        ${it.payment_method_name ? `<span class="inline-flex items-center gap-1 min-w-0">· ${renderIcon(it.payment_method_icon_type, it.payment_method_icon, '💳', 'sm')}<span class="truncate">${escHtml(it.payment_method_name)}</span></span>` : ''}
                                    </div>
                                </div>
                            </div>
                            <div class="text-right flex-shrink-0">
                                <div class="amount-display text-[var(--text-primary)] text-sm">${ET.Utils.convertAndFormat(it.amount, it.currency)}</div>
                                <span class="badge badge-${it.billing_interval} text-xs">${ET.Utils.intervalLabel(it.billing_interval, it.custom_interval_days)}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>`;
        } else {
            rangeHTML += `<div class="text-center py-8">
                <i class="far fa-calendar text-3xl text-gray-600 mb-2"></i>
                <p class="text-sm text-[var(--text-secondary)]">No expenses in this range</p>
            </div>`;
        }

        itemsEl.innerHTML = rangeHTML;

        detailEl.classList.remove('hidden');
        detailEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function renderWeekView() {
        const grid = document.getElementById('calendar-grid');
        grid.className = '';

        const today = new Date();
        const weekDates = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(_weekStart);
            d.setDate(d.getDate() + i);
            weekDates.push(d);
        }

        // Update title for week view
        const title = document.getElementById('calendar-title');
        const startMonth = MONTHS[weekDates[0].getMonth()];
        const endMonth = MONTHS[weekDates[6].getMonth()];
        const startDay = weekDates[0].getDate();
        const endDay = weekDates[6].getDate();
        if (startMonth === endMonth) {
            title.textContent = `${startMonth} ${startDay} – ${endDay}, ${weekDates[0].getFullYear()}`;
        } else {
            title.textContent = `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${weekDates[6].getFullYear()}`;
        }

        // Header with day names and dates
        let headerHtml = '<div class="calendar-week-row border-b border-[var(--card-border)]">';
        headerHtml += '<div class="calendar-week-time"></div>';
        const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        weekDates.forEach((d, i) => {
            const isToday = d.toDateString() === today.toDateString();
            headerHtml += `<div class="p-2 text-center border-r border-[var(--card-border)]">
                <div class="text-xs text-[var(--text-secondary)]">${dayNames[i]}</div>
                <div class="text-sm font-medium mt-0.5 ${isToday ? 'cal-today-num w-7 h-7 mx-auto' : 'text-[var(--text-primary)]'}">${d.getDate()}</div>
            </div>`;
        });
        headerHtml += '</div>';

        // All-day events
        let allDayHtml = '<div class="calendar-week-row" style="min-height:auto">';
        allDayHtml += '<div class="calendar-week-time py-2 text-[10px]">ALL DAY</div>';
        weekDates.forEach(d => {
            const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            const items = _calData[dateStr] || [];
            allDayHtml += '<div class="calendar-week-cell p-1">';
            items.forEach(it => {
                allDayHtml += `<div class="calendar-week-event" style="background:${(it.category_color || 'var(--accent)') + 'cc'}" onclick="ET.Calendar.showDetail('${dateStr}')" title="${escHtml(it.title)}: ${ET.Utils.convertAndFormat(it.amount, it.currency)}">
                    ${escHtml(it.title)}
                </div>`;
            });
            allDayHtml += '</div>';
        });
        allDayHtml += '</div>';

        // Summary rows
        let summaryHtml = '';
        const timeLabels = ['Morning', 'Afternoon', 'Evening'];
        timeLabels.forEach(label => {
            summaryHtml += '<div class="calendar-week-row">';
            summaryHtml += `<div class="calendar-week-time">${label}</div>`;
            weekDates.forEach(d => {
                const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                const items = _calData[dateStr] || [];
                const total = items.reduce((s, it) =>
                    s + ET.Utils.convert(it.amount, it.currency, ET.Utils.displayCurrency), 0);
                summaryHtml += `<div class="calendar-week-cell" onclick="ET.Calendar.showDetail('${dateStr}')">`;
                if (label === 'Morning' && total > 0) {
                    summaryHtml += `<div class="text-xs text-[var(--accent)] font-semibold p-1">${ET.Utils.formatMoney(total)}</div>`;
                }
                summaryHtml += '</div>';
            });
            summaryHtml += '</div>';
        });

        grid.innerHTML = headerHtml + allDayHtml + summaryHtml;
    }

    function showDetail(dateStr) {
        _selectedDate = dateStr;
        _rangeStart = null;
        _rangeEnd = null;
        clearRangeHighlight();

        const items = _calData[dateStr] || [];
        const detailEl = document.getElementById('calendar-detail');
        const titleEl = document.getElementById('calendar-detail-title');
        const itemsEl = document.getElementById('calendar-detail-items');

        const dateObj = new Date(dateStr + 'T00:00:00');
        titleEl.innerHTML = `<i class="far fa-calendar-alt mr-2 text-[var(--accent)]"></i>${dateObj.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' })}`;

        if (items.length === 0) {
            itemsEl.innerHTML = `
                <div class="text-center py-8">
                    <i class="far fa-calendar-check text-3xl text-gray-600 mb-3"></i>
                    <p class="text-sm text-[var(--text-secondary)] mb-3">No expenses on this day</p>
                    <button onclick="ET.Calendar.addExpenseForDate()" class="btn-primary px-4 py-2 rounded-xl text-xs font-medium">
                        <i class="fas fa-plus mr-1"></i> Add Expense
                    </button>
                </div>`;
            detailEl.classList.remove('hidden');
            detailEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            // Refresh month view to update selection highlight
            if (_viewMode === 'month') updateSelectedHighlight();
            return;
        }

        const total = items.reduce((s, it) =>
            s + ET.Utils.convert(it.amount, it.currency, ET.Utils.displayCurrency), 0);

        itemsEl.innerHTML = `
            <div class="flex items-center justify-between mb-4 pb-3 border-b border-[var(--card-border)]">
                <span class="text-sm text-[var(--text-secondary)]">${items.length} expense${items.length !== 1 ? 's' : ''}</span>
                <span class="text-sm text-[var(--text-secondary)]">Total: <span class="amount-display text-[var(--text-primary)] text-base">${ET.Utils.formatMoney(total)}</span></span>
            </div>
            <div class="space-y-2">
                ${items.map(it => `
                    <div class="flex items-center justify-between glass-input rounded-xl px-4 py-3 hover:bg-white/10 transition">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style="background:${(it.category_color || 'var(--accent)') + '33'}">
                                ${renderIcon(it.category_icon_type, it.category_icon, '📌', 'sm')}
                            </div>
                            <div>
                                <div class="text-sm font-medium text-[var(--text-primary)]">${escHtml(it.title)}</div>
                                <div class="text-xs text-[var(--text-secondary)] flex items-center gap-1.5 min-w-0">
                                    <span>${it.category_name || ''}</span>
                                    ${it.payment_method_name ? `<span class="inline-flex items-center gap-1 min-w-0">· ${renderIcon(it.payment_method_icon_type, it.payment_method_icon, '💳', 'sm')}<span class="truncate">${escHtml(it.payment_method_name)}</span></span>` : ''}
                                </div>
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="amount-display text-[var(--text-primary)] text-sm">${ET.Utils.convertAndFormat(it.amount, it.currency)}</div>
                            <span class="badge badge-${it.billing_interval}">${ET.Utils.intervalLabel(it.billing_interval)}</span>
                        </div>
                    </div>
                `).join('')}
            </div>`;

        detailEl.classList.remove('hidden');
        detailEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        if (_viewMode === 'month') updateSelectedHighlight();
    }

    function addExpenseForDate() {
        const date = _selectedDate || new Date().toISOString().split('T')[0];
        ET.Expenses.openAddModal(date);
    }

    async function goToday() {
        const now = new Date();
        _year = now.getFullYear();
        _month = now.getMonth() + 1;
        _weekStart = getWeekStart(now);
        _selectedDate = null;
        _rangeStart = null;
        _rangeEnd = null;
        await load();
        render();
    }

    async function prevMonth() {
        if (_viewMode === 'week') {
            _weekStart.setDate(_weekStart.getDate() - 7);
            _year = _weekStart.getFullYear();
            _month = _weekStart.getMonth() + 1;
            _rangeStart = null;
            _rangeEnd = null;
            await load();
            render();
            return;
        }
        _month--;
        if (_month < 1) { _month = 12; _year--; }
        _selectedDate = null;
        _rangeStart = null;
        _rangeEnd = null;
        await load();
        render();
    }

    async function nextMonth() {
        if (_viewMode === 'week') {
            _weekStart.setDate(_weekStart.getDate() + 7);
            _year = _weekStart.getFullYear();
            _month = _weekStart.getMonth() + 1;
            _rangeStart = null;
            _rangeEnd = null;
            await load();
            render();
            return;
        }
        _month++;
        if (_month > 12) { _month = 1; _year++; }
        _selectedDate = null;
        _rangeStart = null;
        _rangeEnd = null;
        await load();
        render();
    }

    async function setView(mode) {
        _viewMode = mode;
        if (mode === 'week') {
            const now = new Date();
            if (_year === now.getFullYear() && _month === now.getMonth() + 1) {
                _weekStart = getWeekStart(now);
            } else {
                _weekStart = getWeekStart(new Date(_year, _month - 1, 1));
            }
        }
        _rangeStart = null;
        _rangeEnd = null;
        render();
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        const calSection = document.getElementById('view-calendar');
        if (!calSection || calSection.classList.contains('hidden')) return;
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
        if (e.ctrlKey || e.metaKey || e.altKey) return;

        if (e.key === 't') {
            goToday();
        }
    });

    function _toggleRangeDetails() {
        const details = document.getElementById('range-details');
        const icon = document.getElementById('range-toggle-icon');
        if (details) {
            details.classList.toggle('hidden');
            icon.style.transform = details.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(90deg)';
        }
    }

    function _updateRangeInputs() {
        const fromEl = document.getElementById('range-from');
        const toEl = document.getElementById('range-to');
        if (fromEl && toEl) {
            const from = fromEl.value;
            const to = toEl.value;
            if (from && to) {
                _rangeStart = from;
                _rangeEnd = to;
                showRangeSummary(from, to);
            }
        }
    }

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

    return { 
        init, load, render, showDetail, addExpenseForDate, prevMonth, nextMonth, goToday, setView,
        _toggleRangeDetails,
        _updateRangeInputs
    };
})();
