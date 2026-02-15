/* ─── Utilities Module ──────────────────────────────────────────────────── */
window.ET = window.ET || {};

ET.Utils = (function () {
    let _rates = {};
    let _baseCurrency = 'USD';
    let _displayCurrency = 'USD';
    let _settings = {};
    let _categories = [];
    let _paymentMethods = [];
    let _lastRateUpdate = null;
    let _manualRefreshCount = 0;
    let _lastManualRefreshReset = Date.now();

    const CURRENCY_SYMBOLS = {
        USD:'$', EUR:'€', GBP:'£', JPY:'¥', CNY:'¥', CAD:'C$', AUD:'A$',
        CHF:'CHF', KRW:'₩', INR:'₹', SGD:'S$', HKD:'HK$', TWD:'NT$',
        MXN:'MX$', BRL:'R$', SEK:'kr', NOK:'kr', DKK:'kr', NZD:'NZ$',
        THB:'฿', RUB:'₽', ZAR:'R', PHP:'₱', MYR:'RM', IDR:'Rp',
    };

    const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
    const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
    const MAX_MANUAL_REFRESHES = 3;

    async function api(url, opts = {}) {
        const defaults = { headers: { 'Content-Type': 'application/json' } };
        const res = await fetch(url, { ...defaults, ...opts });
        if (res.status === 401) { window.location.href = '/login'; return null; }
        return res.json();
    }

    async function fetchRates(base, isManual = false) {
        base = base || _displayCurrency || 'USD';

        // Check cache first
        const cacheKey = `exchange_rates_${base}`;
        const cached = localStorage.getItem(cacheKey);
        const cacheTime = localStorage.getItem(`${cacheKey}_time`);
        
        if (!isManual && cached && cacheTime) {
            const age = Date.now() - parseInt(cacheTime);
            if (age < CACHE_DURATION) {
                _rates = JSON.parse(cached);
                _baseCurrency = base;
                _lastRateUpdate = new Date(parseInt(cacheTime));
                updateRateUpdateDisplay();
                console.log('Using cached exchange rates');
                return;
            }
        }

        // If manual refresh, check rate limit
        if (isManual) {
            const now = Date.now();
            if (now - _lastManualRefreshReset > RATE_LIMIT_WINDOW) {
                _manualRefreshCount = 0;
                _lastManualRefreshReset = now;
            }

            if (_manualRefreshCount >= MAX_MANUAL_REFRESHES) {
                const remaining = Math.ceil((RATE_LIMIT_WINDOW - (now - _lastManualRefreshReset)) / 1000);
                toast(`Rate limit reached. Please wait ${remaining} seconds before trying again.`, 'error');
                return;
            }

            _manualRefreshCount++;
        }

        // Fetch fresh rates
        try {
            _rates = await api(`/api/currency/rates?base=${base}`);
            _baseCurrency = base;
            _lastRateUpdate = new Date();
            
            // Cache the rates
            localStorage.setItem(cacheKey, JSON.stringify(_rates));
            localStorage.setItem(`${cacheKey}_time`, _lastRateUpdate.getTime().toString());
            
            updateRateUpdateDisplay();
            
            if (isManual) {
                toast('Currency rates updated successfully!', 'success');
            }
        } catch (e) {
            console.warn('Could not fetch rates:', e);
            toast('Failed to update currency rates', 'error');
        }
    }

    function updateRateUpdateDisplay() {
        const el = document.getElementById('currency-update-time');
        if (!el) return;
        if (!_lastRateUpdate) {
            el.textContent = 'Never updated';
            return;
        }
        const now = new Date();
        const diff = now - _lastRateUpdate;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        let text = 'Currency rates updated ';
        if (seconds < 60) {
            text += 'just now';
        } else if (minutes < 60) {
            text += `${minutes} min ago`;
        } else if (hours < 24) {
            text += `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else {
            const days = Math.floor(hours / 24);
            text += `${days} day${days > 1 ? 's' : ''} ago`;
        }
        el.textContent = text;
    }

    function convert(amount, fromCurrency, toCurrency) {
        if (!amount || fromCurrency === toCurrency) return amount;
        toCurrency = toCurrency || _displayCurrency;
        // Convert through rates
        if (_baseCurrency === fromCurrency) {
            return amount * (_rates[toCurrency] || 1);
        } else if (_baseCurrency === toCurrency) {
            return amount / (_rates[fromCurrency] || 1);
        } else {
            // Convert from -> base -> to
            const inBase = amount / (_rates[fromCurrency] || 1);
            return inBase * (_rates[toCurrency] || 1);
        }
    }

    function formatMoney(amount, currency) {
        currency = currency || _displayCurrency;
        const sym = CURRENCY_SYMBOLS[currency] || currency + ' ';
        const abs = Math.abs(amount);
        let formatted;
        if (abs >= 1000000) {
            formatted = (amount / 1000000).toFixed(1) + 'M';
        } else if (abs >= 10000) {
            formatted = (amount / 1000).toFixed(1) + 'K';
        } else {
            formatted = amount.toFixed(2);
        }
        return sym + formatted;
    }

    function formatMoneyFull(amount, currency) {
        currency = currency || _displayCurrency;
        const sym = CURRENCY_SYMBOLS[currency] || currency + ' ';
        return sym + parseFloat(amount).toFixed(2);
    }

    function convertAndFormat(amount, fromCurrency) {
        const converted = convert(amount, fromCurrency, _displayCurrency);
        return formatMoney(converted, _displayCurrency);
    }

    function convertAndFormatFull(amount, fromCurrency) {
        const converted = convert(amount, fromCurrency, _displayCurrency);
        return formatMoneyFull(converted, _displayCurrency);
    }

    function formatDate(dateStr) {
        if (!dateStr) return '';
        const fmt = _settings.date_format || 'YYYY-MM-DD';
        const parts = dateStr.split('-');
        if (parts.length !== 3) return dateStr;
        const [y, m, d] = parts;
        return fmt.replace('YYYY', y).replace('MM', m).replace('DD', d);
    }

    function toast(msg, type = 'info') {
        const container = document.getElementById('toast-container');
        const el = document.createElement('div');
        const icon = type === 'success' ? 'fa-check-circle' :
                     type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
        el.className = `toast toast-${type}`;
        el.innerHTML = `<i class="fas ${icon}"></i> ${msg}`;
        container.appendChild(el);
        setTimeout(() => {
            el.classList.add('toast-out');
            setTimeout(() => el.remove(), 300);
        }, 3000);
    }

    function intervalLabel(interval, customDays) {
        const labels = {
            once: 'One-time', daily: 'Daily', weekdays: 'Weekdays', weekends: 'Weekends',
            specific_days: 'Specific days', weekly: 'Weekly', biweekly: 'Biweekly',
            monthly: 'Monthly', bimonthly: 'Bimonthly', quarterly: 'Quarterly',
            semiannually: 'Semi-annually', yearly: 'Yearly', custom: `Every ${customDays}d`,
        };
        return labels[interval] || interval;
    }

    return {
        api,
        fetchRates,
        updateRateUpdateDisplay,
        convert,
        formatMoney,
        formatMoneyFull,
        convertAndFormat,
        convertAndFormatFull,
        formatDate,
        toast,
        intervalLabel,
        CURRENCY_SYMBOLS,
        get rates() { return _rates; },
        get displayCurrency() { return _displayCurrency; },
        set displayCurrency(v) { _displayCurrency = v; },
        get lastRateUpdate() { return _lastRateUpdate; },
        get settings() { return _settings; },
        set settings(v) { _settings = v; },
        get categories() { return _categories; },
        set categories(v) { _categories = v; },
        get paymentMethods() { return _paymentMethods; },
        set paymentMethods(v) { _paymentMethods = v; },
    };
})();
