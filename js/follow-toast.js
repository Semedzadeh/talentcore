// "Bizi sosial mediada izlə!" bildirişi (Telegram / WhatsApp).
// Saytı İLK DƏFƏ açana sağ aşağıda bir dəfə çıxır; × düyməsi, Esc və ya linkə klik ilə bağlanır və bir daha çıxmır (localStorage).
// js/main.js bu faylı yalnız ilk dəfə gələnlər üçün yükləyir (css/follow-toast.css də buradan yüklənir: iki fayl da yenidir,
// köhnə keşlənmiş nüsxələri ola bilməz). Düymələrin ünvanları admin → Sayt parametrləri-dən gəlir (window.TC_SOCIALS,
// js/site-settings.js); yoxdursa aşağıdakı ehtiyat ünvanlar qalır (şirkətin ictimai nömrəsinə söhbət).
// Baxış/sınaq üçün ünvana ?toast=1 əlavə edin: yaddaşa baxmadan və yazmadan göstərir.
(function () {
    'use strict';

    var KEY = 'tc_follow_toast_v1';
    var SELF = document.currentScript && document.currentScript.src;
    var preview = /[?&]toast=1(&|$)/.test(location.search);
    var DELAY = preview ? 500 : 3500;

    if (!preview) {
        // Artıq görüb (yaddaşda qeyd var) və ya yaddaş əlçatmazdır (məxfi rejim) — göstərilmir: hər səhifədə çıxıb bezdirməsin
        var seen;
        try { seen = window.localStorage.getItem(KEY); } catch (e) { return; }
        if (seen !== null) return;
        // Kart artıq səhifənin özündədir (cv.html, contact.html) — təkrar lazım deyil
        if (document.querySelector('.follow-card')) return;
    }

    var FALLBACK = { telegram: 'https://t.me/+994508006029', whatsapp: 'https://wa.me/994508006029' };
    var ICON = {
        telegram: '<path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>',
        whatsapp: '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>'
    };
    var toast = null;
    var shown = false;

    function safeUrl(u) { return typeof u === 'string' && /^https?:\/\//i.test(u) ? u : null; }
    function msg(az, en) { return window.tcMsg ? window.tcMsg(az, en) : (document.documentElement.lang === 'az' ? az : en); }
    function markSeen() { if (preview) return; try { window.localStorage.setItem(KEY, String(Date.now())); } catch (e) { /* mühüm deyil */ } }

    // Admin parametrlərindən (yoxdursa ehtiyat) düymələrin ünvanları
    function applySocials() {
        if (!toast) return;
        var socials = window.TC_SOCIALS || {};
        toast.querySelectorAll('[data-social]').forEach(function (a) {
            var key = a.getAttribute('data-social');
            a.setAttribute('href', safeUrl(socials[key]) || FALLBACK[key]);
        });
    }

    function link(key, name) {
        return '<a class="tc-toast-link tc-toast-' + key + '" href="' + FALLBACK[key] + '" data-social="' + key + '" target="_blank" rel="noopener noreferrer">' +
            '<span class="tc-toast-icon" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">' + ICON[key] + '</svg></span>' +
            '<span class="tc-toast-linktext"><strong>' + name + '</strong>' +
            '<span class="lang" data-az="Kanala qoşul" data-en="Join the channel">Kanala qoşul</span></span></a>';
    }

    function build() {
        var el = document.createElement('section');
        el.className = 'tc-toast';
        el.setAttribute('role', 'region');
        el.setAttribute('aria-labelledby', 'tc-toast-title');
        el.innerHTML =
            '<button type="button" class="tc-toast-close"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
            '<div class="tc-toast-head">' +
                '<span class="tc-toast-badge" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></span>' +
                '<div class="tc-toast-copy">' +
                    '<h3 class="tc-toast-title lang" id="tc-toast-title" data-az="Bizi sosial mediada izlə!" data-en="Follow us on social media!">Bizi sosial mediada izlə!</h3>' +
                    '<p class="tc-toast-text lang" data-az="Rəhbər vəzifələr üzrə vakansiyaları ilk sən gör!" data-en="Be the first to see leadership vacancies!">Rəhbər vəzifələr üzrə vakansiyaları ilk sən gör!</p>' +
                '</div>' +
            '</div>' +
            '<div class="tc-toast-actions">' + link('telegram', 'Telegram') + link('whatsapp', 'WhatsApp') + '</div>';

        // Seçilmiş dildə mətnlər (main.js dil dəyişəndə bu .lang elementlərini də yeniləyir)
        el.querySelectorAll('.lang').forEach(function (n) { n.innerHTML = window.tcText ? window.tcText(n) : n.getAttribute('data-az'); });
        el.querySelector('.tc-toast-close').setAttribute('aria-label', msg('Bağla', 'Close'));

        el.querySelector('.tc-toast-close').addEventListener('click', close);
        el.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
        // Kanala keçən istifadəçiyə bildiriş artıq lazım deyil
        el.querySelectorAll('.tc-toast-link').forEach(function (a) { a.addEventListener('click', close); });
        return el;
    }

    function close() {
        if (!toast || toast.classList.contains('is-leaving')) return;
        var el = toast;
        toast = null;
        markSeen();
        window.removeEventListener('tc-settings', applySocials);
        el.classList.remove('is-visible');
        el.classList.add('is-leaving');
        var remove = function () { if (el.parentNode) el.parentNode.removeChild(el); };
        el.addEventListener('transitionend', function (e) { if (e.target === el) remove(); });
        setTimeout(remove, 700);
    }

    function show() {
        if (shown) return;
        shown = true;
        toast = build();
        document.body.appendChild(toast);
        applySocials();
        window.addEventListener('tc-settings', applySocials);   // ayarlar sonradan gəlsə (yavaş şəbəkə) ünvanlar yenilənir
        markSeen();                                             // bir dəfə göstərilib sayılır (istifadəçi bağlamasa da)
        void toast.offsetWidth;                                 // başlanğıc vəziyyəti tətbiq olunsun, sonra animasiya
        toast.classList.add('is-visible');
    }

    function schedule() {
        setTimeout(function () {
            if (document.visibilityState === 'visible') { show(); return; }
            // Tab arxa planda açılıbsa baxılana qədər gözlənilir
            document.addEventListener('visibilitychange', function onVisible() {
                if (document.visibilityState !== 'visible') return;
                document.removeEventListener('visibilitychange', onVisible);
                show();
            });
        }, DELAY);
    }

    // Üslub faylı yüklənməsə bildiriş göstərilmir (üslubsuz görünməsin)
    var css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = SELF ? new URL('../css/follow-toast.css', SELF).href : '/css/follow-toast.css';
    css.onload = schedule;
    document.head.appendChild(css);
})();
