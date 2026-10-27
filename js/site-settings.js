// Backend ilə əlaqə (bütün səhifələrdə, main.js-dən sonra yüklənir):
//  • Backend-dən (admin → "Sayt parametrləri") gələn parametrləri tətbiq edir: sosial linklər, ana səhifə
//    fon şəkli, vakansiyalar bannerı, reklamlar, populyar axtarışlar.
//  • Ortaq köməkçilər: window.TC_API_BASE, window.tcSubmit (formalar), window.tcTrack (sayğac),
//    Cloudflare Turnstile (robot yoxlaması) widget-i.
// Backend ünvanı BOŞDURSA bu skript heç nə etmir: sayt öz standart (nümunə) görünüşündə qalır,
// formalar köhnə Web3Forms yolu ilə işləyir. Backend əlçatmazdırsa da səssizcə standart qalır.
(function () {
    // Backend ünvanı səhifənin açıldığı ünvandan götürülür, ona görə deploy zamanı bu faylı dəyişmək lazım deyil:
    // talentcore.az (və www) — sayt və backend eyni domendədir; localhost — lokal backend; qalan hallarda
    // (GitHub Pages, fayl kimi açılış) boş qalır və sayt statik nümunə məlumatla işləyir.
    var API_BASE = (function () {
        var host = location.hostname;
        if (host === 'talentcore.az' || host === 'www.talentcore.az') return location.origin;
        if (host === 'localhost' || host === '127.0.0.1') return 'http://127.0.0.1:8000';
        return '';
    })();

    // Cloudflare Turnstile "site key" (İCTİMAİ açardır, gizli deyil; gizli açar yalnız backend-in .env-indədir).
    // Boşdursa robot widget-i göstərilmir.
    var TURNSTILE_SITE_KEY = '0x4AAAAAAFafgEAWE0jObHgs';

    var base = API_BASE.replace(/\/$/, '');
    window.TC_API_BASE = base;

    function safeUrl(u) {
        return typeof u === 'string' && /^https?:\/\//i.test(u) ? u : null;
    }

    function cssUrl(u) {
        return "url('" + u.replace(/'/g, '%27') + "')";
    }

    // Formanı backend-ə göndər: { ok, status, data } qaytarır (şəbəkə xətasında rədd edir)
    window.tcSubmit = function (path, formData) {
        return fetch(base + path, { method: 'POST', headers: { 'Accept': 'application/json' }, body: formData })
            .then(function (r) {
                return r.json().catch(function () { return {}; }).then(function (data) {
                    return { ok: r.ok && data.ok !== false, status: r.status, data: data };
                });
            });
    };

    // Sayğac: səhifə açıldı / "Müraciət et" kliki / forma göndərildi. Cavab gözlənilmir, xəta sayta təsir etmir.
    window.tcTrack = function (event, extra) {
        if (!base) return;
        try {
            var body = JSON.stringify(Object.assign({
                event: event,
                path: location.pathname + location.search,
                referrer: document.referrer || ''
            }, extra || {}));
            if (navigator.sendBeacon) {
                navigator.sendBeacon(base + '/t', new Blob([body], { type: 'text/plain' }));
            } else {
                fetch(base + '/t', { method: 'POST', body: body, keepalive: true }).catch(function () {});
            }
        } catch (e) { /* sayğac sayt işini pozmasın */ }
    };

    // Turnstile-ı formada yenilə (uğursuz/uğurlu göndərişdən sonra token təkrar istifadə olunmur)
    window.tcResetTurnstile = function () {
        if (window.turnstile) {
            try { window.turnstile.reset(); } catch (e) { /* mühüm deyil */ }
        }
    };

    if (!base) return;

    // Səhifə baxışı (vakansiya baxışını vacancies.js özü göndərir)
    window.tcTrack('page_view');

    // Robot yoxlaması: üç formanın göndər düyməsindən əvvəl widget qoyulur
    // Lokal işlədəndə widget yüklənmir: açar yalnız talentcore.az domenləri üçün qeydiyyatdadır (lokalda Cloudflare xəta qaytarır)
    if (TURNSTILE_SITE_KEY && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        ['contact-form', 'cv-form', 'request-form'].forEach(function (id) {
            var form = document.getElementById(id);
            var btn = form && form.querySelector('button[type="submit"]');
            if (!btn) return;
            var box = document.createElement('div');
            box.className = 'cf-turnstile';
            box.setAttribute('data-sitekey', TURNSTILE_SITE_KEY);
            box.style.margin = '12px 0';
            btn.parentNode.insertBefore(box, btn);
        });
        var s = document.createElement('script');
        s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
        s.async = true;
        s.defer = true;
        document.head.appendChild(s);
    }

    fetch(base + '/site-settings.json', { cache: 'no-cache' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (s) {
            if (!s) return;

            // Sosial ikonlar (footer): aria-label-ə görə
            var socials = s.socials || {};
            document.querySelectorAll('.social-icon').forEach(function (a) {
                var key = (a.getAttribute('aria-label') || '').toLowerCase();
                var url = safeUrl(socials[key]);
                if (url) a.setAttribute('href', url);
            });

            // Ana səhifə (və hero istifadə edən səhifələr) arxa fon şəkli
            var hero = safeUrl(s.hero_image);
            if (hero) document.documentElement.style.setProperty('--hero-photo', cssUrl(hero));

            // Vakansiyalar bannerı
            var banner = safeUrl(s.banner_image);
            if (banner) document.documentElement.style.setProperty('--banner-photo', cssUrl(banner));

            // Reklamlar və populyar axtarışlar: vacancies.js dinləyir
            window.TC_ADS = (s.ads || []).filter(function (ad) { return safeUrl(ad.image); });
            window.TC_POPULAR = s.popular_searches || [];
            window.dispatchEvent(new CustomEvent('tc-settings'));
        })
        .catch(function () { /* səssizcə: sayt standart qalır */ });
})();
