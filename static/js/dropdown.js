/* ─── Custom Dropdown Enhancer ──────────────────────────────────────────── */
window.ET = window.ET || {};

ET.Dropdown = (function () {
    const _registry = new WeakMap();

    /**
     * Enhance all native <select> elements matching a selector
     * into fully custom dropdown components.
     * @param {string} scope - CSS selector for the container to search within (default: 'body')
     */
    function enhanceAll(scope) {
        const root = scope ? document.querySelector(scope) : document.body;
        if (!root) return;
        root.querySelectorAll('select.glass-input').forEach(sel => {
            if (_registry.has(sel)) return; // already enhanced
            enhance(sel);
        });
    }

    /**
     * Enhance a single <select> element.
     */
    function enhance(sel) {
        if (_registry.has(sel)) return;

        // Build wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'custom-dropdown';

        // Determine display width hint
        const isSmall = sel.closest('.top-bar') || sel.classList.contains('compact');

        // Build trigger button
        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'custom-dropdown-trigger';
        if (sel.id) trigger.setAttribute('data-for', sel.id);

        // Build menu
        const menu = document.createElement('div');
        menu.className = 'custom-dropdown-menu';

        // Populate
        function buildItems() {
            menu.innerHTML = '';
            Array.from(sel.options).forEach((opt, idx) => {
                const item = document.createElement('button');
                item.type = 'button';
                item.className = 'custom-dropdown-item';
                if (opt.selected) item.classList.add('active');
                item.setAttribute('data-value', opt.value);
                item.innerHTML = `
                    <svg class="dropdown-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span class="flex-1">${opt.textContent}</span>`;
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    selectItem(sel, wrapper, opt.value);
                });
                menu.appendChild(item);
            });
        }

        buildItems();
        updateTriggerLabel(sel, trigger);

        // Insert into DOM
        sel.parentNode.insertBefore(wrapper, sel);
        wrapper.appendChild(trigger);
        wrapper.appendChild(menu);
        wrapper.appendChild(sel);

        // Hide native select
        sel.style.position = 'absolute';
        sel.style.opacity = '0';
        sel.style.pointerEvents = 'none';
        sel.style.width = '0';
        sel.style.height = '0';
        sel.style.overflow = 'hidden';
        sel.tabIndex = -1;

        // Store reference
        _registry.set(sel, { wrapper, trigger, menu, buildItems });

        // Events
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            closeAllExcept(wrapper);
            toggle(wrapper);
        });

        // Listen for programmatic value changes on the select
        const origDescriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
        const selectEl = sel;
        Object.defineProperty(sel, '_customDropdownValue', {
            set(v) {
                origDescriptor.set.call(selectEl, v);
                updateTriggerLabel(selectEl, trigger);
                updateActiveItem(menu, v);
            },
            get() {
                return origDescriptor.get.call(selectEl);
            }
        });
    }

    function selectItem(sel, wrapper, value) {
        sel.value = value;
        // Dispatch native change event so existing handlers fire
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
            trigger.innerHTML = `<span class="truncate">${selected.textContent}</span>`;
        }
    }

    function updateActiveItem(menu, value) {
        menu.querySelectorAll('.custom-dropdown-item').forEach(item => {
            item.classList.toggle('active', item.getAttribute('data-value') === value);
        });
    }

    function toggle(wrapper) {
        if (wrapper.classList.contains('open')) {
            close(wrapper);
        } else {
            open(wrapper);
        }
    }

    function open(wrapper) {
        wrapper.classList.add('open');
        // Position: check if menu goes off-screen to the right
        const menu = wrapper.querySelector('.custom-dropdown-menu');
        const rect = menu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            menu.style.left = 'auto';
            menu.style.right = '0';
        }
        // Scroll active item into view
        const activeItem = menu.querySelector('.custom-dropdown-item.active');
        if (activeItem) {
            activeItem.scrollIntoView({ block: 'nearest' });
        }
    }

    function close(wrapper) {
        wrapper.classList.remove('open');
        const menu = wrapper.querySelector('.custom-dropdown-menu');
        if (menu) {
            menu.style.left = '';
            menu.style.right = '';
        }
    }

    function closeAllExcept(exceptWrapper) {
        document.querySelectorAll('.custom-dropdown.open').forEach(w => {
            if (w !== exceptWrapper) close(w);
        });
    }

    // Global click to close
    document.addEventListener('click', () => {
        document.querySelectorAll('.custom-dropdown.open').forEach(w => close(w));
    });

    // Escape key to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.custom-dropdown.open').forEach(w => close(w));
        }
    });

    /**
     * Refresh the dropdown items for a specific select (when options change dynamically).
     */
    function refresh(sel) {
        const info = _registry.get(sel);
        if (!info) return;
        info.buildItems();
        updateTriggerLabel(sel, info.trigger);
    }

    /**
     * Refresh the trigger label only (e.g., when value is set programmatically).
     */
    function syncValue(sel) {
        const info = _registry.get(sel);
        if (!info) return;
        updateTriggerLabel(sel, info.trigger);
        updateActiveItem(info.menu, sel.value);
    }

    /**
     * Destroy enhancement, restoring native select.
     */
    function destroy(sel) {
        const info = _registry.get(sel);
        if (!info) return;
        // Move select out of wrapper
        info.wrapper.parentNode.insertBefore(sel, info.wrapper);
        info.wrapper.remove();
        // Restore select visibility
        sel.style.position = '';
        sel.style.opacity = '';
        sel.style.pointerEvents = '';
        sel.style.width = '';
        sel.style.height = '';
        sel.style.overflow = '';
        sel.tabIndex = 0;
        _registry.delete(sel);
    }

    return { enhanceAll, enhance, refresh, syncValue, destroy };
})();
