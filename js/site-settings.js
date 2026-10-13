// Backend-dən (admin → "Sayt parametrləri") gələn parametrləri statik səhifələrə tətbiq edir:
// sosial şəbəkə linkləri, ana səhifə fon şəkli, vakansiyalar bannerı, reklam şəkilləri.
// Backend əlçatmaz/boşdursa heç nə dəyişmir — sayt öz standart görünüşündə qalır.
(function () {
    // Backend ünvanı (məs. 'https://admin.talentcore.az'). Boşdursa bu skript heç nə etmir.
    // Backend serverə qoyulandan sonra bura real ünvan yazılır.
    var API_BASE = '';

    if (!API_BASE) return;

    function safeUrl(u) {
        return typeof u === 'string' && /^https?:\/\//i.test(u) ? u : null;
    }

    function cssUrl(u) {
        return "url('" + u.replace(/'/g, '%27') + "')";
    }

    fetch(API_BASE.replace(/\/$/, '') + '/site-settings.json', { cache: 'no-cache' })
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

            // Reklamlar: vacancies.js dinləyir
            window.TC_ADS = (s.ads || []).filter(function (ad) { return safeUrl(ad.image); });
            window.dispatchEvent(new CustomEvent('tc-settings'));
        })
        .catch(function () { /* səssizcə: sayt standart qalır */ });
})();
