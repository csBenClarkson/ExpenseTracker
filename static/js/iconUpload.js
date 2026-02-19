/* ─── Icon Upload Module ───────────────────────────────────────────────── */
window.ET = window.ET || {};

ET.IconUpload = (function () {
    const MAX_FILE_SIZE = 512 * 1024; // 512KB
    const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

    /**
     * Upload icon file and return base64 data
     */
    async function uploadFile(file) {
        if (!file) return null;

        // Validate file
        if (file.size > MAX_FILE_SIZE) {
            ET.Utils.toast(`File too large (max ${MAX_FILE_SIZE / 1024}KB)`, 'error');
            return null;
        }

        if (!ALLOWED_TYPES.includes(file.type)) {
            ET.Utils.toast('Invalid file type. Use PNG, JPG, WebP, or SVG', 'error');
            return null;
        }

        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                resolve(e.target.result); // Base64 data URL
            };
            reader.onerror = () => {
                ET.Utils.toast('Failed to read file', 'error');
                resolve(null);
            };
            reader.readAsDataURL(file);
        });
    }

    /**
     * Render icon with consistent sizing
     * Returns HTML for emoji or image-based icon
     */
    function renderIcon(iconType, iconValue, sizeClass = '') {
        sizeClass = sizeClass || '';
        const value = iconValue || '';
        const inferredType = iconType || (typeof value === 'string' && (value.startsWith('data:image/') || value.startsWith('http'))
            ? 'image'
            : 'emoji');

        if (inferredType === 'emoji') {
            return `<span class="icon-display emoji ${sizeClass}">${value || '📌'}</span>`;
        }
        if (inferredType === 'image' || inferredType === 'upload') {
            const safeValue = String(value)
                .replace(/&/g, '&amp;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
            return `<span class="icon-display image ${sizeClass}" style="background-image:url(&quot;${safeValue}&quot;)"></span>`;
        }

        return `<span class="icon-display emoji ${sizeClass}">📌</span>`;
    }

    /**
     * Open emoji/file picker
     */
    function openEmojiPicker(callback) {
        // For simplicity, show common emojis
        const emojis = [
            '🏠', '🍔', '🚗', '🎬', '🛍️', '💊', '💡', '📚',
            '🔄', '🛡️', '🏦', '📌', '💵', '💳', '🏧', '🅿️',
            '₿', '🎓', '✈️', '🏨', '🎮', '📱', '⚡', '🌟',
            '❤️', '💰', '📊', '🎯', '🔐', '🎁', '🌍', '⚙️'
        ];

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4';
        modal.id = 'icon-picker-modal';
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };

        const content = document.createElement('div');
        content.className = 'glass-card rounded-2xl p-6 max-w-sm w-full';
        content.innerHTML = `
            <h3 class="text-lg font-bold text-[var(--text-primary)] mb-4">Select Icon</h3>
            
            <!-- Tab Switcher -->
            <div class="flex glass-card rounded-xl overflow-hidden mb-4">
                <button id="tab-emoji" class="flex-1 px-3 py-2 text-sm font-medium text-[var(--text-primary)] transition bg-white/10">
                    <i class="fas fa-smile mr-1"></i> Emoji
                </button>
                <button id="tab-upload" class="flex-1 px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition">
                    <i class="fas fa-upload mr-1"></i> Upload
                </button>
            </div>

            <!-- Emoji Tab -->
            <div id="emoji-tab-content">
                <div class="grid grid-cols-6 gap-2 mb-4" id="emoji-grid">
                    ${emojis.map(e => `
                        <button onclick="ET.IconUpload._selectEmoji('${e}', '${callback}')" 
                                class="glass-input p-2 text-xl hover:bg-white/20 transition rounded-lg"
                                title="${e}">
                            ${e}
                        </button>
                    `).join('')}
                </div>
                <input type="text" id="emoji-search" class="glass-input w-full px-3 py-2 rounded-lg text-[var(--text-primary)] text-sm placeholder-[var(--text-secondary)] mb-4" placeholder="Search emoji...">
            </div>

            <!-- Upload Tab -->
            <div id="upload-tab-content" class="hidden">
                <div class="border-2 border-dashed border-[var(--card-border)] rounded-xl p-6 text-center mb-4">
                    <input type="file" id="icon-file-input" accept="image/png,image/jpeg,image/webp,image/svg+xml" class="hidden">
                    <label for="icon-file-input" class="cursor-pointer block">
                        <i class="fas fa-cloud-upload-alt text-4xl text-[var(--text-secondary)] mb-2"></i>
                        <p class="text-sm text-[var(--text-primary)] font-medium">Click to upload image</p>
                        <p class="text-xs text-[var(--text-secondary)] mt-1">PNG, JPG, WebP, SVG (max 512KB)</p>
                    </label>
                </div>
                <div id="upload-preview" class="hidden glass-card rounded-xl p-4 flex items-center gap-3 mb-4">
                    <div id="preview-img" class="w-12 h-12 rounded-lg bg-cover bg-center"></div>
                    <div class="flex-1">
                        <p id="preview-name" class="text-sm text-[var(--text-primary)] font-medium"></p>
                        <p id="preview-size" class="text-xs text-[var(--text-secondary)]"></p>
                    </div>
                    <button id="clear-upload" class="px-2 py-1 text-xs text-[var(--text-secondary)] hover:text-red-400 transition">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>

            <div class="flex gap-2">
                <button id="cancel-picker" class="btn-ghost flex-1 py-2 rounded-lg text-sm">Cancel</button>
                <button id="confirm-upload" class="btn-primary flex-1 py-2 rounded-lg text-sm hidden">Use Image</button>
            </div>
        `;

        modal.appendChild(content);
        document.body.appendChild(modal);

        // Tab switching
        let selectedFile = null;
        const emojiTab = document.getElementById('tab-emoji');
        const uploadTab = document.getElementById('tab-upload');
        const emojiContent = document.getElementById('emoji-tab-content');
        const uploadContent = document.getElementById('upload-tab-content');

        emojiTab.onclick = () => {
            emojiTab.classList.add('bg-white/10');
            emojiTab.classList.remove('text-[var(--text-secondary)]');
            emojiTab.classList.add('text-[var(--text-primary)]');
            uploadTab.classList.remove('bg-white/10');
            uploadTab.classList.add('text-[var(--text-secondary)]');
            uploadTab.classList.remove('text-[var(--text-primary)]');
            emojiContent.classList.remove('hidden');
            uploadContent.classList.add('hidden');
        };

        uploadTab.onclick = () => {
            uploadTab.classList.add('bg-white/10');
            uploadTab.classList.remove('text-[var(--text-secondary)]');
            uploadTab.classList.add('text-[var(--text-primary)]');
            emojiTab.classList.remove('bg-white/10');
            emojiTab.classList.add('text-[var(--text-secondary)]');
            emojiTab.classList.remove('text-[var(--text-primary)]');
            uploadContent.classList.remove('hidden');
            emojiContent.classList.add('hidden');
        };

        // File upload handling
        const fileInput = document.getElementById('icon-file-input');
        const previewContainer = document.getElementById('upload-preview');
        const confirmBtn = document.getElementById('confirm-upload');

        fileInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const base64 = await uploadFile(file);
            if (base64) {
                selectedFile = base64;
                document.getElementById('preview-img').style.backgroundImage = `url('${base64}')`;
                document.getElementById('preview-name').textContent = file.name;
                document.getElementById('preview-size').textContent = `${(file.size / 1024).toFixed(1)} KB`;
                previewContainer.classList.remove('hidden');
                confirmBtn.classList.remove('hidden');
            }
        };

        document.getElementById('clear-upload').onclick = () => {
            selectedFile = null;
            fileInput.value = '';
            previewContainer.classList.add('hidden');
            confirmBtn.classList.add('hidden');
        };

        confirmBtn.onclick = () => {
            if (selectedFile && callback) {
                const cb = _resolveCallback(callback);
                if (typeof cb === 'function') {
                    cb(selectedFile, 'upload');
                }
            }
            modal.remove();
        };

        // Simple emoji search
        const searchInput = document.getElementById('emoji-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const search = e.target.value.toLowerCase();
                const grid = document.getElementById('emoji-grid');
                Array.from(grid.children).forEach(btn => {
                    const show = !search || btn.title.includes(search);
                    btn.style.display = show ? '' : 'none';
                });
            });
        }

        // Cancel button
        document.getElementById('cancel-picker').onclick = () => {
            modal.remove();
        };

        return {
            element: modal,
            remove: () => modal.remove()
        };
    }

    /**
     * Resolve a dot-separated callback path (e.g., 'ET.Settings._setNewCategoryIcon')
     */
    function _resolveCallback(callbackName) {
        if (typeof callbackName === 'function') return callbackName;
        if (typeof callbackName !== 'string') return null;
        const parts = callbackName.split('.');
        let obj = window;
        for (const part of parts) {
            obj = obj?.[part];
            if (obj === undefined) return null;
        }
        return typeof obj === 'function' ? obj : null;
    }

    /**
     * Internal function for emoji selection (called from inline onclick)
     */
    function _selectEmoji(emoji, callbackName) {
        const callback = _resolveCallback(callbackName);
        if (typeof callback === 'function') {
            callback(emoji, 'emoji');
        }
        const modal = document.getElementById('icon-picker-modal');
        if (modal) modal.remove();
    }

    /**
     * Validate icon for category/payment method
     */
    function validateIcon(iconType, iconValue) {
        if (iconType === 'emoji') {
            return iconValue && iconValue.length > 0;
        } else if (iconType === 'image' || iconType === 'upload') {
            return iconValue && (iconValue.startsWith('data:') || iconValue.startsWith('http'));
        }
        return false;
    }

    return {
        uploadFile,
        renderIcon,
        openEmojiPicker,
        validateIcon,
        _selectEmoji,
        MAX_FILE_SIZE,
        ALLOWED_TYPES
    };
})();
