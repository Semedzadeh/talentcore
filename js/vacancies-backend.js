// vacancies.html üçün backend adapteri (yalnız js/site-settings.js-də backend ünvanı yazılıbsa istifadə olunur).
// Backend-in /api/vacancies və /filters.json cavablarını js/vacancies.js-in gözlədiyi VACANCIES formasına çevirir.
// Backend ünvanı boşdursa bu fayl heç nə etmir — səhifə hardcoded nümunə vakansiyalarla işləyir.
(function () {
    'use strict';

    // Admin paneldə yazılan mətnlər innerHTML-ə düşdüyü üçün HTML-dən təmizlənir (XSS-ə qarşı)
    function esc(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    // Sətir sonları saxlanılsın (təsvir, şirkət haqqında)
    function escMultiline(value) {
        return esc(value).replace(/\r?\n/g, '<br>');
    }

    function currentLang() {
        var lang = 'az';
        try { lang = localStorage.getItem('lang') || 'az'; } catch (e) { /* mühüm deyil */ }
        return ['az', 'en', 'ru', 'zh'].indexOf(lang) >= 0 ? lang : 'az';
    }

    function api(path) {
        return window.TC_API_BASE + path;
    }

    function getJson(path) {
        return fetch(api(path), { headers: { 'Accept': 'application/json' } }).then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        });
    }

    // Filtr qrupunun açarı → saytdakı siyahının (ul) id-si və başlıq düyməsinin id-si
    var STATIC_GROUPS = {
        sector: { list: 'sector-filter-list', toggle: 'sector-filter-toggle' },
        job_category: { list: 'function-filter-list', toggle: 'function-filter-toggle' },
        level: { list: 'level-filter-list', toggle: 'level-filter-toggle' },
        region: { list: 'region-filter-list', toggle: 'region-filter-toggle' },
        schedule: { list: 'schedule-filter-list', toggle: 'schedule-filter-toggle' },
        work_mode: { list: 'format-filter-list', toggle: 'format-filter-toggle' }
    };

    function listIdFor(key) {
        return STATIC_GROUPS[key] ? STATIC_GROUPS[key].list : key + '-filter-list';
    }

    function pick(map, lang) {
        if (!map) return '';
        return map[lang] || map.az || map.en || '';
    }

    // Bu günə qədər neçə gün keçib → "N gün əvvəl" (vacancies.js sıralama və tarix üçün bu mətni oxuyur)
    function postedText(iso) {
        var days = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
        return days + ' gün əvvəl';
    }

    function deadlineIn(dateStr) {
        if (!dateStr) return undefined;
        var end = new Date(dateStr + 'T00:00:00');
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        return Math.round((end.getTime() - today.getTime()) / 86400000);
    }

    // API elementi → js/vacancies.js-in VACANCIES elementi
    function mapVacancy(item) {
        var f = item.filters || {};
        var company = item.company || {};
        return {
            id: item.id,
            slug: item.slug,
            title: esc(item.title),
            titleRaw: item.title,
            company: esc(company.name),
            companyRaw: company.name || '',
            logo: company.logo ? esc(company.logo) : '',
            logoRaw: company.logo || '',
            location: esc(item.location || ''),
            type: esc(item.employment || ''),
            mode: esc(item.mode || ''),
            categoryLabel: esc(item.category || ''),
            category: f.job_category || 'other',
            sector: f.sector || null,
            jobCategory: f.job_category || null,
            level: f.level || null,
            filters: f,
            premium: !!item.is_premium,
            posted: postedText(item.posted_at),
            deadlineIn: deadlineIn(item.expires_at),
            apply: item.apply || { method: 'email', url: null },
            _detailLoaded: false
        };
    }

    // Tək vakansiyanın mətnlərini (təsvir, siyahılar, şirkət haqqında) yüklə və obyektə yaz
    function loadDetail(v) {
        return getJson('/api/vacancies/' + encodeURIComponent(v.slug) + '?lang=' + currentLang()).then(function (res) {
            var d = res.data || {};
            v.description = d.description ? escMultiline(d.description) : '';
            v.responsibilities = (d.responsibilities || []).map(esc);
            v.requirements = (d.requirements || []).map(esc);
            v.offer = (d.offer || []).map(esc);
            v.companyAbout = d.about_company ? escMultiline(d.about_company) : '';
            v._detailLoaded = true;
            return v;
        });
    }

    var GROUP_ICON = '<svg class="filter-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 5h18l-7 8v6l-4 2v-8z"/></svg>';
    var CHEVRON = '<svg class="filter-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';

    function optionsHtml(options, lang) {
        return options.map(function (o) {
            return '<li><label class="filter-option"><input type="checkbox" value="' + esc(o.slug) + '"><span>' + esc(pick(o.label, lang)) + '</span></label></li>';
        }).join('');
    }

    function wireHeader(header) {
        var list = document.getElementById(header.getAttribute('aria-controls'));
        if (!list) return;
        header.addEventListener('click', function () {
            var open = header.getAttribute('aria-expanded') === 'true';
            header.setAttribute('aria-expanded', String(!open));
            list.classList.toggle('collapsed', open);
        });
    }

    // Sol filtr panelini /filters.json ilə sinxronlaşdır: seçimlər, başlıqlar (cari dildə), söndürülmüş qruplar gizlənir,
    // yeni qruplar əlavə olunur. Qaytarır: [{ key, listId }] — vacancies.js filtrləmədə istifadə edir.
    function applyFilters(json, lang) {
        var sidebar = document.querySelector('.vacancies-sidebar');
        var groups = (json && json.groups) || [];
        var seen = {};
        var result = [];
        var lastGroupEl = null;

        groups.forEach(function (g) {
            var meta = STATIC_GROUPS[g.key];
            seen[g.key] = true;
            result.push({ key: g.key, listId: listIdFor(g.key) });

            if (meta) {
                var listEl = document.getElementById(meta.list);
                var toggle = document.getElementById(meta.toggle);
                if (!listEl || !toggle) return;
                listEl.innerHTML = optionsHtml(g.options || [], lang);
                var title = toggle.querySelector('.filter-group-title > span:first-child');
                if (title) { title.classList.remove('lang'); title.textContent = pick(g.title, lang); }
                toggle.closest('.filter-group').hidden = false;
                lastGroupEl = toggle.closest('.filter-group');
                return;
            }

            // Admin paneldə yaradılmış yeni filtr qrupu: eyni quruluşda əlavə olunur
            if (!sidebar || document.getElementById(listIdFor(g.key))) return;
            var wrap = document.createElement('div');
            wrap.className = 'filter-group';
            wrap.innerHTML =
                '<button type="button" class="filter-group-header" id="' + esc(g.key) + '-filter-toggle" aria-expanded="false" aria-controls="' + esc(listIdFor(g.key)) + '">' +
                GROUP_ICON +
                '<span class="filter-group-title"><span>' + esc(pick(g.title, lang)) + '</span><span class="filter-group-sub lang" data-az="Hamısı" data-en="All">Hamısı</span></span>' +
                CHEVRON + '</button>' +
                '<ul class="filter-options collapsed" id="' + esc(listIdFor(g.key)) + '">' + optionsHtml(g.options || [], lang) + '</ul>';
            if (lastGroupEl && lastGroupEl.parentNode) lastGroupEl.parentNode.insertBefore(wrap, lastGroupEl.nextSibling);
            else sidebar.appendChild(wrap);
            lastGroupEl = wrap;
            wireHeader(wrap.querySelector('.filter-group-header'));
        });

        // Admin paneldə söndürülmüş qruplar saytda gizlənir
        Object.keys(STATIC_GROUPS).forEach(function (key) {
            if (seen[key]) return;
            var toggle = document.getElementById(STATIC_GROUPS[key].toggle);
            if (toggle) toggle.closest('.filter-group').hidden = true;
        });

        return result;
    }

    // Populyar axtarış düymələri (admin → Sayt parametrləri): filtr tipli və ya söz tipli
    function renderPopular(items, lang) {
        var box = document.querySelector('.popular-searches');
        if (!box || !items || !items.length) return;
        box.querySelectorAll('.popular-chip').forEach(function (c) { c.remove(); });
        items.forEach(function (it) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'popular-chip';
            btn.textContent = pick(it.label, lang);
            if (it.keyword) {
                btn.dataset.q = it.keyword;
            } else if (it.group && it.value) {
                btn.classList.add('level-chip');
                btn.dataset.group = it.group;
                btn.dataset.value = it.value;
                btn.setAttribute('aria-pressed', 'false');
            } else {
                return;
            }
            box.appendChild(btn);
        });
    }

    window.tcVacanciesBackend = {
        esc: esc,
        listIdFor: listIdFor,
        loadDetail: loadDetail,
        renderPopular: function (items) { renderPopular(items, currentLang()); },

        // Vakansiyaları və filtrləri yüklə. Backend əlçatmazdırsa boş siyahı qaytarır (səhifə "vakansiya yoxdur" göstərir).
        load: function () {
            var lang = currentLang();
            return Promise.all([
                getJson('/api/vacancies?lang=' + lang),
                getJson('/filters.json').catch(function () { return null; })
            ]).then(function (res) {
                var groups = res[1] ? applyFilters(res[1], lang) : null;
                return { vacancies: (res[0].data || []).map(mapVacancy), groups: groups };
            }).catch(function () {
                return { vacancies: [], groups: null, failed: true };
            });
        }
    };
})();
