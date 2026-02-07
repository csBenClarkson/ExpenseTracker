/* ─── Tooltip Module ───────────────────────────────────────────────────── */
window.ET = window.ET || {};

ET.Tooltip = (function () {
    /**
     * Initialize tooltips on elements with data-tooltip attributes
     * Usage: <button data-tooltip="Help text" data-tooltip-pos="top">...</button>
     */
    function init() {
        document.addEventListener('DOMContentLoaded', createTooltips);
        createTooltips();
    }

    function createTooltips() {
        const elementsWithTooltips = document.querySelectorAll('[data-tooltip]');
        elementsWithTooltips.forEach(el => {
            if (!el.querySelector('.tooltip')) {
                createTooltip(el);
            }
        });
    }

    function createTooltip(element) {
        const text = element.getAttribute('data-tooltip');
        const position = element.getAttribute('data-tooltip-pos') || 'top';
        
        if (!text) return;

        // Ensure element is a tooltip-container
        if (!element.classList.contains('tooltip-container')) {
            element.classList.add('tooltip-container');
        }

        const tooltip = document.createElement('div');
        tooltip.className = `tooltip tooltip-${position}`;
        tooltip.textContent = text;
        tooltip.setAttribute('role', 'tooltip');
        tooltip.setAttribute('aria-hidden', 'true');

        element.appendChild(tooltip);
    }

    /**
     * Add tooltip to an element programmatically
     */
    function add(element, text, position = 'top') {
        if (!element) return;
        
        element.setAttribute('data-tooltip', text);
        element.setAttribute('data-tooltip-pos', position);
        
        if (!element.classList.contains('tooltip-container')) {
            element.classList.add('tooltip-container');
        }

        // Remove existing tooltip if present
        const existing = element.querySelector('.tooltip');
        if (existing) existing.remove();

        createTooltip(element);
    }

    /**
     * Remove tooltip from an element
     */
    function remove(element) {
        if (!element) return;
        
        element.removeAttribute('data-tooltip');
        const tooltip = element.querySelector('.tooltip');
        if (tooltip) tooltip.remove();
    }

    /**
     * Update tooltip text
     */
    function update(element, text) {
        if (!element) return;
        
        element.setAttribute('data-tooltip', text);
        const tooltip = element.querySelector('.tooltip');
        if (tooltip) {
            tooltip.textContent = text;
        }
    }

    return {
        init,
        add,
        remove,
        update,
        createTooltips
    };
})();

// Auto-initialize tooltips when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ET.Tooltip.init);
} else {
    ET.Tooltip.init();
}
