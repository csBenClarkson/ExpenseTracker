/* ─── Consumption Module ───────────────────────────────────────────────── */
window.ET = window.ET || {};

ET.Consumption = (function () {
    let _items = [];
    let _editingId = null;

    async function load() {
        _items = await ET.Utils.api('/api/consumption') || [];
        return _items;
    }

    function getAll() { return _items; }

    function renderGrid() {
        const grid = document.getElementById('consumption-grid');
        const empty = document.getElementById('consumption-empty');

        if (_items.length === 0) {
            grid.innerHTML = '';
            empty.classList.remove('hidden');
            return;
        }
        empty.classList.add('hidden');

        const cols = ET.Utils.settings.grid_columns || 3;
        grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

        grid.innerHTML = _items.map((item, i) => {
            const level = item.current_level || 0;
            const barClass = level > 50 ? 'progress-green' : level > 20 ? 'progress-yellow' : 'progress-red';
            const daysLeft = item.days_remaining >= 0 ? Math.round(item.days_remaining) : '∞';
            const monthCost = ET.Utils.convert(item.monthly_cost || 0, item.currency, ET.Utils.displayCurrency);

            return `
            <div class="expense-card slide-up" style="animation-delay:${i * 0.03}s">
                <div class="flex items-start justify-between mb-3">
                    <div class="flex items-center gap-2.5">
                        <span class="text-xl">${item.category_icon || '🛒'}</span>
                        <div>
                            <h4 class="font-semibold text-white text-sm">${escHtml(item.name)}</h4>
                            <span class="text-xs text-[var(--text-secondary)]">${item.category_name || 'Uncategorized'}</span>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="amount-display text-white text-sm">${ET.Utils.convertAndFormat(item.price, item.currency)}</div>
                        <div class="text-xs text-[var(--text-secondary)]">per unit</div>
                    </div>
                </div>
                ${item.description ? `<p class="text-xs text-[var(--text-secondary)] mb-2 truncate-2">${escHtml(item.description)}</p>` : ''}

                <!-- Progress Bar -->
                <div class="mb-2">
                    <div class="flex justify-between text-xs mb-1">
                        <span class="text-[var(--text-secondary)]">Remaining</span>
                        <span class="font-medium text-white">${level.toFixed(1)}%</span>
                    </div>
                    <div class="progress-track">
                        <div class="progress-fill ${barClass}" style="width:${Math.min(100, level)}%"></div>
                    </div>
                </div>

                <!-- Info Grid -->
                <div class="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div class="glass-input rounded-lg px-2 py-1.5 text-center">
                        <div class="text-[var(--text-secondary)]">Rate</div>
                        <div class="font-medium text-white">${item.consuming_rate}%/day</div>
                    </div>
                    <div class="glass-input rounded-lg px-2 py-1.5 text-center">
                        <div class="text-[var(--text-secondary)]">Days Left</div>
                        <div class="font-medium text-white">${daysLeft}</div>
                    </div>
                    <div class="glass-input rounded-lg px-2 py-1.5 text-center">
                        <div class="text-[var(--text-secondary)]">Monthly Cost</div>
                        <div class="font-medium text-white">${ET.Utils.formatMoney(monthCost)}</div>
                    </div>
                    <div class="glass-input rounded-lg px-2 py-1.5 text-center">
                        <div class="text-[var(--text-secondary)]">${item.estimated_empty ? 'Empty by' : 'Status'}</div>
                        <div class="font-medium text-white">${item.estimated_empty ? ET.Utils.formatDate(item.estimated_empty) : 'N/A'}</div>
                    </div>
                </div>

                <div class="flex items-center justify-between pt-2 border-t border-white/5">
                    <div class="flex items-center gap-1">
                        ${item.auto_repurchase ? '<span class="text-xs text-green-400"><i class="fas fa-sync-alt mr-1"></i>Auto-restock</span>' : ''}
                    </div>
                    <div class="flex gap-1">
                        <button onclick="ET.Consumption.refill(${item.id})" class="px-2 py-1 rounded-lg text-xs text-green-400 hover:bg-green-400/10 transition tooltip-container" data-tooltip="Refill to 100%" data-tooltip-pos="top">
                            <i class="fas fa-fill-drip"></i>
                        </button>
                        <button onclick="ET.Consumption.openEditModal(${item.id})" class="px-2 py-1 rounded-lg text-xs text-[var(--text-secondary)] hover:text-white hover:bg-white/10 transition tooltip-container" data-tooltip="Edit item" data-tooltip-pos="top">
                            <i class="fas fa-pen"></i>
                        </button>
                        <button onclick="ET.Consumption.remove(${item.id})" class="px-2 py-1 rounded-lg text-xs text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-400/10 transition tooltip-container" data-tooltip="Delete item" data-tooltip-pos="top">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    /* ── Modal Form ──────────────────────────────────────────────────── */
    function buildForm(item) {
        const e = item || {};
        const cats = ET.Utils.categories;
        const currencies = Object.keys(ET.Utils.CURRENCY_SYMBOLS);

        return `
        <form id="consumption-form" class="space-y-4">
            <div>
                <label class="block text-xs text-[var(--text-secondary)] mb-1">Item Name *</label>
                <input name="name" required value="${escAttr(e.name || '')}" class="glass-input w-full px-3 py-2.5 rounded-xl text-[var(--text-primary)] text-sm" placeholder="e.g., Body Wash, Toothpaste">
            </div>
            <div>
                <label class="block text-xs text-[var(--text-secondary)] mb-1">Description</label>
                <textarea name="description" rows="2" class="glass-input w-full px-3 py-2.5 rounded-xl text-[var(--text-primary)] text-sm" placeholder="Brand, size, notes...">${escHtml(e.description || '')}</textarea>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs text-[var(--text-secondary)] mb-1">Price *</label>
                    <input name="price" type="number" step="0.01" min="0" required value="${e.price || ''}" class="glass-input w-full px-3 py-2.5 rounded-xl text-[var(--text-primary)] text-sm" placeholder="0.00">
                </div>
                <div>
                    <label class="block text-xs text-[var(--text-secondary)] mb-1">Currency</label>
                    <select name="currency" class="glass-input w-full px-3 py-2.5 rounded-xl text-[var(--text-primary)] text-sm">
                        ${currencies.map(c => `<option value="${c}" ${(e.currency || ET.Utils.displayCurrency) === c ? 'selected' : ''}>${c} ${ET.Utils.CURRENCY_SYMBOLS[c]}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div>
                <label class="block text-xs text-[var(--text-secondary)] mb-1">Category</label>
                <select name="category_id" class="glass-input w-full px-3 py-2.5 rounded-xl text-[var(--text-primary)] text-sm">
                    <option value="">None</option>
                    ${cats.map(c => `<option value="${c.id}" ${e.category_id == c.id ? 'selected' : ''}>${c.icon} ${c.name}</option>`).join('')}
                </select>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs text-[var(--text-secondary)] mb-1">
                        Consuming Rate (%/day) *
                        <i class="fas fa-info-circle ml-1 text-[var(--text-secondary)]" title="How much is consumed per day. e.g., 3.33 = lasts ~30 days"></i>
                    </label>
                    <input name="consuming_rate" type="number" step="0.01" min="0" value="${e.consuming_rate ?? 3.33}" class="glass-input w-full px-3 py-2.5 rounded-xl text-[var(--text-primary)] text-sm">
                </div>
                <div>
                    <label class="block text-xs text-[var(--text-secondary)] mb-1">Current Stock %</label>
                    <input name="current_level" type="number" step="0.1" min="0" max="100" value="${e.current_level ?? 100}" class="glass-input w-full px-3 py-2.5 rounded-xl text-[var(--text-primary)] text-sm">
                </div>
            </div>
            <div class="flex items-center gap-2">
                <input name="auto_repurchase" type="checkbox" ${e.auto_repurchase ? 'checked' : ''} class="accent-cyan-500">
                <label class="text-sm text-[var(--text-secondary)]">Auto-restock when empty</label>
            </div>
            <div class="flex gap-3 pt-2">
                <button type="submit" class="btn-primary flex-1 py-2.5 rounded-xl text-sm font-medium">
                    <i class="fas fa-save mr-1"></i> ${item ? 'Update' : 'Add'} Item
                </button>
                <button type="button" onclick="ET.App.closeModal()" class="btn-ghost px-5 py-2.5 rounded-xl text-sm">Cancel</button>
            </div>
        </form>`;
    }

    function openAddModal() {
        _editingId = null;
        ET.App.openModal('Add Consumption Item', buildForm());
        document.getElementById('consumption-form').addEventListener('submit', handleSubmit);
    }

    function openEditModal(id) {
        const item = _items.find(i => i.id === id);
        if (!item) return;
        _editingId = id;
        ET.App.openModal('Edit Consumption Item', buildForm(item));
        document.getElementById('consumption-form').addEventListener('submit', handleSubmit);
    }

    async function handleSubmit(ev) {
        ev.preventDefault();
        const form = ev.target;
        const data = {
            name: form.name.value.trim(),
            description: form.description.value.trim(),
            category_id: form.category_id.value || null,
            price: parseFloat(form.price.value),
            currency: form.currency.value,
            consuming_rate: parseFloat(form.consuming_rate.value) || 0,
            current_level: parseFloat(form.current_level.value) || 100,
            auto_repurchase: form.auto_repurchase.checked ? 1 : 0,
        };

        if (!data.name || !data.price) {
            ET.Utils.toast('Please fill all required fields', 'error');
            return;
        }

        if (_editingId) {
            await ET.Utils.api(`/api/consumption/${_editingId}`, { method: 'PUT', body: JSON.stringify(data) });
            ET.Utils.toast('Item updated!', 'success');
        } else {
            await ET.Utils.api('/api/consumption', { method: 'POST', body: JSON.stringify(data) });
            ET.Utils.toast('Item added!', 'success');
        }
        ET.App.closeModal();
        await load();
        renderGrid();
    }

    async function remove(id) {
        ET.App.confirm(
            'Are you sure you want to delete this consumption item? This action cannot be undone.',
            async () => {
                await ET.Utils.api(`/api/consumption/${id}`, { method: 'DELETE' });
                ET.Utils.toast('Item deleted', 'success');
                await load();
                renderGrid();
            },
            { title: 'Delete Item', confirmText: 'Delete', dangerous: true }
        );
    }

    async function refill(id) {
        const item = _items.find(i => i.id === id);
        if (!item) return;
        const data = { ...item, current_level: 100 };
        delete data.days_remaining;
        delete data.estimated_empty;
        delete data.monthly_cost;
        delete data.category_name;
        delete data.category_icon;
        delete data.category_color;
        await ET.Utils.api(`/api/consumption/${id}`, { method: 'PUT', body: JSON.stringify(data) });
        ET.Utils.toast(`${item.name} refilled to 100%!`, 'success');
        await load();
        renderGrid();
    }

    return { load, getAll, renderGrid, openAddModal, openEditModal, remove, refill, deleteItem: remove };
})();
