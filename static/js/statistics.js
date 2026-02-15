/* ─── Statistics Module ────────────────────────────────────────────────── */
window.ET = window.ET || {};

ET.Statistics = (function () {
    let _charts = {};

    async function render() {
        // Destroy existing charts first to prevent canvas reuse issues
        destroyCharts();

        const stats = await ET.Utils.api('/api/stats/summary');
        if (!stats) return;

        renderSummaryCards(stats);
        renderMonthlyChart(stats.monthly_totals || []);
        renderCategoryChart(stats.categories || []);
        renderTopExpenses(stats.top_expenses || []);
        renderPaymentBreakdown(stats.payment_breakdown || []);
    }

    function renderSummaryCards(stats) {
        const el = document.getElementById('stats-summary');
        const monthlyTotals = stats.monthly_totals || [];
        const nonZeroMonths = monthlyTotals.filter(m => m.total > 0);
        const avgMonthly = nonZeroMonths.length > 0
            ? monthlyTotals.reduce((s, m) => s + m.total, 0) / nonZeroMonths.length
            : 0;

        el.innerHTML = `
            <div class="summary-card">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                        <i class="fas fa-calendar-check text-cyan-400"></i>
                    </div>
                    <div>
                        <div class="text-xs text-[var(--text-secondary)]">This Month</div>
                        <div class="amount-display text-xl text-[var(--text-primary)]">${ET.Utils.formatMoney(stats.month_total || 0)}</div>
                    </div>
                </div>
            </div>
            <div class="summary-card">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                        <i class="fas fa-sync-alt text-purple-400"></i>
                    </div>
                    <div>
                        <div class="text-xs text-[var(--text-secondary)]">Recurring Total</div>
                        <div class="amount-display text-xl text-[var(--text-primary)]">${ET.Utils.formatMoney(stats.recurring_total || 0)}</div>
                    </div>
                </div>
            </div>
            <div class="summary-card">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                        <i class="fas fa-receipt text-amber-400"></i>
                    </div>
                    <div>
                        <div class="text-xs text-[var(--text-secondary)]">Total Expenses</div>
                        <div class="amount-display text-xl text-[var(--text-primary)]">${stats.total_count || 0}</div>
                    </div>
                </div>
            </div>
            <div class="summary-card">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                        <i class="fas fa-chart-line text-emerald-400"></i>
                    </div>
                    <div>
                        <div class="text-xs text-[var(--text-secondary)]">Avg Monthly</div>
                        <div class="amount-display text-xl text-[var(--text-primary)]">${ET.Utils.formatMoney(avgMonthly)}</div>
                    </div>
                </div>
            </div>`;
    }

    function getAccentColor() {
        const raw = getComputedStyle(document.body).getPropertyValue('--accent').trim();
        return raw || '#06b6d4';
    }

    function renderMonthlyChart(monthly) {
        const canvas = document.getElementById('chart-monthly');
        const emptyEl = document.getElementById('chart-monthly-empty');
        if (!canvas) return;

        const hasData = monthly.some(m => m.total > 0);
        if (!hasData) {
            canvas.parentElement.style.display = 'none';
            if (emptyEl) emptyEl.classList.remove('hidden');
            return;
        }

        canvas.parentElement.style.display = '';
        if (emptyEl) emptyEl.classList.add('hidden');

        const accentColor = getAccentColor();

        _charts.monthly = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: monthly.map(m => {
                    const [y, mo] = m.month.split('-');
                    return new Date(y, mo - 1).toLocaleDateString('en', { month: 'short', year: '2-digit' });
                }),
                datasets: [{
                    label: 'Monthly Spending',
                    data: monthly.map(m => m.total),
                    backgroundColor: accentColor + '55',
                    borderColor: accentColor,
                    borderWidth: 2,
                    borderRadius: 8,
                    hoverBackgroundColor: accentColor + '99',
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(15,23,42,0.95)',
                        titleColor: '#e2e8f0',
                        bodyColor: '#94a3b8',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 1,
                        cornerRadius: 8,
                        padding: 10,
                        callbacks: {
                            label: ctx => ' ' + ET.Utils.formatMoney(ctx.parsed.y),
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
                        ticks: { color: '#94a3b8', font: { size: 11 } },
                    },
                    y: {
                        grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
                        ticks: {
                            color: '#94a3b8',
                            font: { size: 11 },
                            callback: v => ET.Utils.formatMoney(v),
                        },
                        beginAtZero: true,
                    }
                }
            }
        });
    }

    function renderCategoryChart(categories) {
        const canvas = document.getElementById('chart-category');
        const emptyEl = document.getElementById('chart-category-empty');
        if (!canvas) return;

        if (!categories || categories.length === 0) {
            canvas.parentElement.style.display = 'none';
            if (emptyEl) emptyEl.classList.remove('hidden');
            return;
        }

        canvas.parentElement.style.display = '';
        if (emptyEl) emptyEl.classList.add('hidden');

        const defaultColors = ['#06b6d4','#f59e0b','#10b981','#ec4899','#8b5cf6',
                               '#ef4444','#3b82f6','#f97316','#a855f7','#64748b'];

        _charts.category = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: categories.map(c => `${c.icon || ''} ${c.name || 'Other'}`),
                datasets: [{
                    data: categories.map(c => c.total),
                    backgroundColor: categories.map((c, i) => (c.color || defaultColors[i % defaultColors.length]) + 'cc'),
                    borderColor: categories.map((c, i) => c.color || defaultColors[i % defaultColors.length]),
                    borderWidth: 2,
                    hoverOffset: 10,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '55%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#94a3b8',
                            font: { size: 11 },
                            padding: 14,
                            usePointStyle: true,
                            pointStyleWidth: 8,
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15,23,42,0.95)',
                        titleColor: '#e2e8f0',
                        bodyColor: '#94a3b8',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 1,
                        cornerRadius: 8,
                        padding: 10,
                        callbacks: {
                            label: ctx => ` ${ctx.label}: ${ET.Utils.formatMoney(ctx.parsed)}`,
                        }
                    }
                }
            }
        });
    }

    function renderTopExpenses(top) {
        const el = document.getElementById('stats-top-expenses');
        if (!top || top.length === 0) {
            el.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-trophy text-3xl text-gray-600 mb-2"></i>
                    <p class="text-sm text-[var(--text-secondary)]">No expenses this month</p>
                </div>`;
            return;
        }
        const maxAmount = Math.max(...top.map(e => e.amount));
        el.innerHTML = top.map((e, idx) => `
            <div class="flex items-center gap-3 mb-3">
                <span class="text-xs font-bold text-[var(--text-secondary)] w-5">#${idx + 1}</span>
                <span class="text-lg">${e.category_icon || '📌'}</span>
                <div class="flex-1 min-w-0">
                    <div class="flex justify-between mb-1">
                        <span class="text-sm text-[var(--text-primary)] truncate">${escHtml(e.title)}</span>
                        <span class="amount-display text-sm text-[var(--text-primary)] ml-2">${ET.Utils.convertAndFormat(e.amount, e.currency)}</span>
                    </div>
                    <div class="stat-bar">
                        <div class="stat-bar-fill" style="width:${(e.amount / maxAmount * 100).toFixed(1)}%;background:${e.category_color || 'var(--accent)'}"></div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    function renderPaymentBreakdown(payments) {
        const el = document.getElementById('stats-payment-breakdown');
        if (!payments || payments.length === 0) {
            el.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-credit-card text-3xl text-gray-600 mb-2"></i>
                    <p class="text-sm text-[var(--text-secondary)]">No payment data this month</p>
                </div>`;
            return;
        }
        const total = payments.reduce((s, p) => s + p.total, 0);
        const colors = ['#06b6d4','#8b5cf6','#f59e0b','#10b981','#ec4899','#3b82f6'];
        el.innerHTML = payments.map((p, i) => {
            const pct = total > 0 ? (p.total / total * 100) : 0;
            return `
            <div class="flex items-center gap-3 mb-3">
                <span class="text-lg">${p.icon || '💳'}</span>
                <div class="flex-1">
                    <div class="flex justify-between mb-1">
                        <span class="text-sm text-[var(--text-primary)]">${p.name || 'Unknown'}</span>
                        <span class="amount-display text-sm text-[var(--text-primary)]">${ET.Utils.formatMoney(p.total)} <span class="text-xs text-[var(--text-secondary)]">(${pct.toFixed(0)}%)</span></span>
                    </div>
                    <div class="stat-bar">
                        <div class="stat-bar-fill" style="width:${pct}%;background:${colors[i % colors.length]}"></div>
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    function destroyCharts() {
        Object.values(_charts).forEach(c => {
            try { if (c) c.destroy(); } catch (e) {}
        });
        _charts = {};
    }

    return { render, destroyCharts };
})();
