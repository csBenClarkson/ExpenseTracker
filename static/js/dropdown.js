/* ─── Custom Dropdown Enhancer ──────────────────────────────────────────── */
window.ET = window.ET || {};

ET.Dropdown = (function () {
    const _registry = new WeakMap();

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str == null ? '' : String(str);
        return div.innerHTML;
    }

    function escapeAttr(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function getOptionIconHtml(opt) {
        const icon = opt.getAttribute('data-icon') || '';
        const iconType = opt.getAttribute('data-icon-type') || 'emoji';
        if (!icon) return '';

        if (iconType === 'upload' || iconType === 'image') {
            return `<span class="icon-display image sm" style="background-image:url(&quot;${escapeAttr(icon)}&quot;)"></span>`;
        }
        return `<span class="icon-display emoji sm">${escapeHtml(icon)}</span>`;
    }

    function getOptionLabel(opt) {
        return opt.getAttribute('data-label') || opt.textContent || '';
    }

    function getOptionContentHtml(opt) {
        const iconHtml = getOptionIconHtml(opt);
        const label = escapeHtml(getOptionLabel(opt));
        return `
            <span class="flex items-center gap-2 flex-1 min-w-0">
                ${iconHtml}
                <span class="truncate">${label}</span>
            </span>`;
    }

    /**
     * Enhance all native <select> elements matching a selector
     * into fully custom dropdown components.
     */
    function enhanceAll(scope) {
        const root = scope ? document.querySelector(scope) : document.body;
        if (!root) return;
        root.querySelectorAll('select.glass-input').forEach(sel => {
            if (_registry.has(sel)) return;
            enhance(sel);
        });
    }

    /**
     * Enhance a single <select> element.
     */
    function enhance(sel) {
        if (_registry.has(sel)) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'custom-dropdown';

        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'custom-dropdown-trigger';
        if (sel.id) trigger.setAttribute('data-for', sel.id);

        const menu = document.createElement('div');
        menu.className = 'custom-dropdown-menu';

        function buildItems() {
            menu.innerHTML = '';
            Array.from(sel.options).forEach(opt => {
                const item = document.createElement('button');
                item.type = 'button';
                item.className = 'custom-dropdown-item';
                if (opt.selected) item.classList.add('active');
                item.setAttribute('data-value', opt.value);
                item.innerHTML = `
                    <svg class="dropdown-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    ${getOptionContentHtml(opt)}`;
                item.addEventListener('click', e => {
                    e.stopPropagation();
                    selectItem(sel, wrapper, opt.value);
                });
                menu.appendChild(item);
            });
        }

        buildItems();
        updateTriggerLabel(sel, trigger);

        // Insert into DOM: wrapper replaces sel position, sel hidden inside
        sel.parentNode.insertBefore(wrapper, sel);
        wrapper.appendChild(trigger);
        wrapper.appendChild(menu);
        wrapper.appendChild(sel);

        sel.style.position = 'absolute';
        sel.style.opacity = '0';
        sel.style.pointerEvents = 'none';
        sel.style.width = '0';
        sel.style.height = '0';
        sel.style.overflow = 'hidden';
        sel.tabIndex = -1;

        _registry.set(sel, { wrapper, trigger, menu, buildItems });

        // Toggle on trigger click
        trigger.addEventListener('click', e => {
            e.stopPropagation();
            closeAllExcept(wrapper);
            toggle(wrapper);
        });

        // Prevent clicks inside the menu from bubbling to the document close handler
        menu.addEventListener('mousedown', e => e.stopPropagation());
        menu.addEventListener('click', e => e.stopPropagation());

        // Intercept programmatic value changes
        const origDescriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
        const selectEl = sel;
        Object.defineProperty(sel, '_customDropdownValue', {
            set(v) {
                origDescriptor.set.call(selectEl, v);
                updateTriggerLabel(selectEl, trigger);
                updateActiveItem(menu, v);
            },
            get() { return origDescriptor.get.call(selectEl); }
        });
    }

    function selectItem(sel, wrapper, value) {
        sel.value = value;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        const info = _registry.get(sel);
        if (info) {
            updateTriggerLabel(sel, info.trigger);
            updateActiveItem(info.menu, value);
        }
        close(wrapper);
    }

    function updateTriggerLabel(sel, trigger) {
        const selected = sel.options[sel.selectedIndex];
        if (selected) {
            trigger.innerHTML = getOptionContentHtml(selected);
        }
    }

    function updateActiveItem(menu, value) {
        menu.querySelectorAll('.custom-dropdown-item').forEach(item => {
            item.classList.toggle('active', item.getAttribute('data-value') === value);
        });
    }

    function toggle(wrapper) {
        wrapper.classList.contains('open') ? close(wrapper) : open(wrapper);
    }

    /**
     * Open a dropdown.
     */
    function open(wrapper) {
        wrapper.classList.add('open');
        const menu = wrapper.querySelector('.custom-dropdown-menu');
        const trigger = wrapper.querySelector('.custom-dropdown-trigger');
        if (!menu || !trigger) return;

        // Decide up vs down based on available viewport space below the trigger
        const triggerRect = trigger.getBoundingClientRect();
        const spaceBelow = window.innerHeight - triggerRect.bottom - 10;
        if (spaceBelow < 200 && triggerRect.top > spaceBelow) {
            wrapper.classList.add('dropdown-up');
        } else {
            wrapper.classList.remove('dropdown-up');
        }

        // Scroll active item into view after menu renders
        requestAnimationFrame(() => {
            const activeItem = menu.querySelector('.custom-dropdown-item.active');
            if (activeItem) activeItem.scrollIntoView({ block: 'nearest' });
        });
    }

    /**
     * Close a dropdown.
     */
    function close(wrapper) {
        wrapper.classList.remove('open', 'dropdown-up');
    }

    function closeAllExcept(exceptWrapper) {
        document.querySelectorAll('.custom-dropdown.open').forEach(w => {
            if (w !== exceptWrapper) close(w);
        });
    }

    function closeAll() {
        document.querySelectorAll('.custom-dropdown.open').forEach(w => close(w));
    }

    // Global: click anywhere to close all dropdowns
    document.addEventListener('click', () => closeAll());

    // Escape key to close
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeAll();
    });

    /** Refresh dropdown items when options change dynamically. */
    function refresh(sel) {
        const info = _registry.get(sel);
        if (!info) return;
        info.buildItems();
        updateTriggerLabel(sel, info.trigger);
    }

    /** Sync trigger label to current select value. */
    function syncValue(sel) {
        const info = _registry.get(sel);
        if (!info) return;
        updateTriggerLabel(sel, info.trigger);
        updateActiveItem(info.menu, sel.value);
    }

    /** Destroy enhancement, restoring native select. */
    function destroy(sel) {
        const info = _registry.get(sel);
        if (!info) return;
        close(info.wrapper);
        info.wrapper.parentNode.insertBefore(sel, info.wrapper);
        info.wrapper.remove();
        sel.style.position = '';
        sel.style.opacity = '';
        sel.style.pointerEvents = '';
        sel.style.width = '';
        sel.style.height = '';
        sel.style.overflow = '';
        sel.tabIndex = 0;
        _registry.delete(sel);
    }

    return { enhanceAll, enhance, refresh, syncValue, destroy, closeAll };
})();
