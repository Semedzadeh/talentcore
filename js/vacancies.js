// Vakansiyalar səhifəsi: sahələr üzrə filtrləmə + siyahıdan seçilən vakansiyanın
// sağ paneldə detallı göstərilməsi. Yalnız vacancies.html-də işə düşür.
// async: backend rejimində (js/site-settings.js-də ünvan yazılıbsa) vakansiyalar və filtrlər
// backend-dən yüklənənə qədər gözlənilir (bax "BACKEND REJİMİ" bloku VACANCIES massivindən sonra).
document.addEventListener('DOMContentLoaded', async () => {

    // Sol paneldəki bütün filtr qruplarının (Fəaliyyət sahəsi, Şirkətlər,
    // Kateqoriyalar, Vəzifə dərəcəsi, Region, İş qrafiki, İş rejimi) aç/bağla
    // oxu. Checkbox-ların özünün siyahını filtrləmə məntiqi aşağıda,
    // passesSidebarFilters() və "sidebarFiltersEl.addEventListener('change', ...)"
    // bölümlərindədir — statik VACANCIES üzərində TEST məqsədilədir, real
    // backend gələndə eyni taksonomiya (sector/jobCategory/level sahələri)
    // real data ilə doldurulmalıdır, bax CLAUDE.md.
    document.querySelectorAll('.filter-group-header').forEach(header => {
        const list = document.getElementById(header.getAttribute('aria-controls'));
        if (!list) return;
        header.addEventListener('click', () => {
            const isExpanded = header.getAttribute('aria-expanded') === 'true';
            header.setAttribute('aria-expanded', String(!isExpanded));
            list.classList.toggle('collapsed', isExpanded);
        });
    });

    const listEl = document.getElementById('vacancies-list');
    const detailEl = document.getElementById('vacancy-detail');

    // Panelin sabit yazıları 4 dildə (az/en/ru/zh): seçilmiş dil <html lang>-dan oxunur, boş qalan dil üçün ingiliscə ehtiyat.
    function tr(az, en, ru, zh) {
        const lang = document.documentElement.lang || 'az';
        return lang === 'az' ? az : ((lang === 'ru' ? ru : lang === 'zh' ? zh : en) || en || az);
    }

    // Nümunə (statik) vakansiyalarda yer, qrafik, iş forması və sahə dəyərləri Azərbaycan dilində saxlanır — onların
    // başqa dillərdəki qarşılığı burada: [en, ru, zh]. Backend rejimində dəyərlər artıq API-dən seçilmiş dildə gəlir,
    // onlar bu cədvəldə olmadığı üçün olduğu kimi qalır.
    const VALUE_TR = {
        'Bakı': ['Baku', 'Баку', '巴库'], 'Gəncə': ['Ganja', 'Гянджа', '占贾'], 'Sumqayıt': ['Sumgait', 'Сумгайыт', '苏姆盖特'],
        'Tam ştat': ['Full-time', 'Полная занятость', '全职'], 'Yarım ştat': ['Part-time', 'Частичная занятость', '兼职'],
        'Ofisdən': ['Office', 'Офис', '办公室'], 'Hibrid': ['Hybrid', 'Гибрид', '混合办公'], 'Uzaqdan': ['Remote', 'Удалённо', '远程'],
        'İT və Texnologiya': ['IT & Technology', 'ИТ и технологии', 'IT与科技'],
        'Maliyyə və Mühasibatlıq': ['Finance & Accounting', 'Финансы и бухгалтерия', '财务与会计'],
        'Marketinq və Satış': ['Marketing & Sales', 'Маркетинг и продажи', '市场与销售'],
        'Tikinti və Mühəndislik': ['Construction & Engineering', 'Строительство и инженерия', '建筑与工程'],
        'Logistika və Anbar': ['Logistics & Warehousing', 'Логистика и склад', '物流与仓储'],
        'Bank və Sığorta': ['Banking & Insurance', 'Банки и страхование', '银行与保险'],
        'İnsan Resursları': ['Human Resources', 'Управление персоналом', '人力资源']
    };
    function trVal(value) {
        const t = VALUE_TR[value];
        return t ? tr(value, t[0], t[1], t[2]) : value;
    }

    // "Şirkətlər" filtri statik deyil — yalnız aktiv elanı olan şirkətlər
    // göstərilməlidir, ona görə VACANCIES-dən (aşağıda təyin olunur) törəmə
    // siyahı kimi qurulur. VACANCIES elan olunmazdan əvvəl çağırıla bilməz,
    // ona görə bu funksiya faylın sonunda, VACANCIES artıq mövcud olanda
    // işə salınır.
    function renderCompanyFilter() {
        const companyListEl = document.getElementById('company-filter-list');
        if (!companyListEl) return;
        const companies = [...new Set(VACANCIES.map(v => v.company))].sort((a, b) => a.localeCompare(b, 'az'));
        companyListEl.innerHTML = companies.map(company => `
            <li><label class="filter-option"><input type="checkbox" value="${company}"><span>${company}</span></label></li>
        `).join('');
    }

    // "Yaddaşa verilmiş vakansiyalar" — hər kartdakı ⭐ düyməsi ilə işarətlənən
    // id-lər. sessionStorage istifadə olunur (localStorage YOX): istifadəçi
    // bunun məhz bu tab/seans bağlanana qədər yadda qalmasını istəyib, sonra
    // avtomatik silinsin.
    const SAVED_KEY = 'talentcore_saved_vacancies';

    function getSavedIds() {
        try {
            return JSON.parse(sessionStorage.getItem(SAVED_KEY)) || [];
        } catch {
            return [];
        }
    }

    function setSavedIds(ids) {
        try {
            sessionStorage.setItem(SAVED_KEY, JSON.stringify(ids));
        } catch {
            // sessionStorage bloklanıbsa (məs. private rejim) sükutla keçirik
        }
    }

    function isSaved(id) {
        return getSavedIds().includes(id);
    }

    // Sol paneldəki "Yaddaşa verilmiş vakansiyalar" düyməsinin üstündəki say
    // nişanı — neçə vakansiya save edilibsə onu göstərir, heç biri yoxdursa gizlənir.
    function updateSavedCount() {
        const countEl = document.getElementById('saved-count');
        if (!countEl) return;
        const count = getSavedIds().length;
        countEl.textContent = count;
        countEl.hidden = count === 0;
    }

    // Sağ paneldəki "Yadda saxla" düyməsinin görünüşü kartdakı ilə həmişə eyni olsun.
    function syncDetailSaveBtn(id) {
        const saved = isSaved(id);
        detailEl.querySelectorAll('.detail-save-btn[data-id="' + id + '"]').forEach(b => {
            b.classList.toggle('saved', saved);
            b.setAttribute('aria-pressed', String(saved));
            const label = b.querySelector('span');
            if (label) label.textContent = saved ? tr('Yadda saxlanıb', 'Saved', 'Сохранено', '已收藏') : tr('Yadda saxla', 'Save', 'Сохранить', '收藏');
        });
    }

    function toggleSaved(id) {
        const savedIds = getSavedIds();
        const idx = savedIds.indexOf(id);
        if (idx === -1) {
            savedIds.push(id);
        } else {
            savedIds.splice(idx, 1);
        }
        setSavedIds(savedIds);
        updateSavedCount();
        syncDetailSaveBtn(id);

        // "Yalnız save edilənlər" görünüşü aktivdirsə, save/un-save olunan
        // vakansiya siyahıya girib-çıxmalıdır, ona görə tam yenidən çəkilir.
        // Əks halda sadəcə həmin kartın öz ⭐ düyməsinin görünüşünü çeviririk —
        // bütöv siyahını lazımsız yerə yenidən çəkməyə ehtiyac yoxdur.
        if (showSavedOnly) {
            renderList();
            return;
        }

        const btn = listEl.querySelector(`.vacancy-save-btn[data-id="${id}"]`);
        if (btn) btn.classList.toggle('saved', savedIds.includes(id));
    }

    // Detal panelindəki "Paylaş" düyməsi — hər vakansiyanın "?vacancy=<id>"
    // linkini (bax focused mode, yuxarıda) mobil/dəstəklənən brauzerlərdə
    // native paylaşma pəncərəsi ilə, əks halda mübadilə buferinə kopyalayaraq
    // paylaşmağa imkan verir. "hardasa paylaşa bilsin" tələbinə görə sabit bir
    // platforma (WhatsApp/Telegram və s.) seçilmədi — link haradasa yapışdırıla bilsin deyə.
    async function shareVacancy(v, btn) {
        // Backend rejimində paylaşma linki vakansiyanın öz (Google-da görünən) səhifəsidir
        const shareUrl = (BACKEND && v.slug)
            ? `${window.TC_API_BASE}/vakansiya/${encodeURIComponent(v.slug)}`
            : `${window.location.origin}${window.location.pathname}?vacancy=${v.id}`;

        if (navigator.share) {
            try {
                await navigator.share({ title: v.title, text: `${v.title} — ${v.company}`, url: shareUrl });
            } catch {
                // İstifadəçi paylaşma pəncərəsini bağlayıb/imtina edib — sükutla keçirik
            }
            return;
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
            try {
                await navigator.clipboard.writeText(shareUrl);
                btn.classList.add('copied');
                clearTimeout(btn._copiedTimer);
                btn._copiedTimer = setTimeout(() => btn.classList.remove('copied'), 1800);
                return;
            } catch {
                // aşağıdakı prompt fallback-inə keçir
            }
        }

        window.prompt('Linki kopyalayın:', shareUrl);
    }

    if (!listEl || !detailEl) return;

    // --- SAHƏLƏR (nümunə) ---
    const CATEGORIES = [
        { id: 'it', az: 'İT və Texnologiya' },
        { id: 'finance', az: 'Maliyyə və Mühasibatlıq' },
        { id: 'marketing', az: 'Marketinq və Satış' },
        { id: 'construction', az: 'Tikinti və Mühəndislik' },
        { id: 'logistics', az: 'Logistika və Anbar' },
        { id: 'banking', az: 'Bank və Sığorta' },
        { id: 'hr', az: 'İnsan Resursları' }
    ];

    // --- VAKANSİYALAR (nümunə məlumatlar — real data ilə əvəzlənməlidir) ---
    let VACANCIES = [
        // --- TEST: təqdimat üçün yalnız rəhbər vəzifələr (CEO, Baş direktor, Departament direktoru, Şöbə müdiri, Menecer). Real şirkət adları nümunədir — yayımdan əvvəl silinməlidir. ---
        {
            id: 34,
            premium: true,
            title: 'Hüquq Direktoru',
            company: 'Oba Market',
            logo: 'logos/oba-market.png',
            category: 'hr',
            sector: 'retail-ecommerce',
            jobCategory: 'legal-management',
            level: 'director',
            location: 'Bakı',
            type: 'Tam ştat',
            mode: 'Ofisdən',
            posted: 'Bu gün',
            deadlineIn: 28,
            description: 'Şirkətin hüquqi təhlükəsizliyini, müqavilə münasibətlərini və normativ uyğunluğunu təmin edəcək, hüquq departamentinə rəhbərlik edəcək təcrübəli Hüquq Direktoru axtarılır.',
            responsibilities: [
                'Şirkətin hüquqi strategiyasının hazırlanması və icrasına nəzarət',
                'Müqavilələrin, tərəfdaşlıq və icarə sənədlərinin hüquqi ekspertizası',
                'Normativ tələblərə uyğunluğun (compliance) təmin edilməsi və risklərin idarə olunması',
                'Məhkəmə və dövlət orqanları ilə münasibətlərdə şirkətin maraqlarının təmsil olunması',
                'Hüquq departamentinin komandasının idarə olunması'
            ],
            requirements: [
                'Hüquq üzrə ali təhsil, 10+ il təcrübə, o cümlədən 4+ il rəhbər vəzifədə',
                'Kommersiya və əmək hüququ, korporativ idarəetmə sahəsində dərin biliklər',
                'Pərakəndə satış və ya geniş şəbəkəli şirkətlərdə iş təcrübəsi üstünlükdür',
                'Azərbaycan və ingilis dillərində səlis ünsiyyət, güclü danışıqlar aparma bacarığı'
            ],
            offer: ['Rəqabətqabiliyyətli kompensasiya paketi və illik bonus', 'Sağlamlıq sığortası', 'Xidməti avtomobil', 'Karyera və liderlik inkişafı imkanları']
        },
        {
            id: 35,
            premium: true,
            title: 'Pərakəndə Əməliyyatlar üzrə Departament Direktoru',
            company: 'Oba Market',
            logo: 'logos/oba-market.png',
            category: 'logistics',
            sector: 'retail-ecommerce',
            jobCategory: 'supply-operations',
            level: 'department-head',
            location: 'Bakı',
            type: 'Tam ştat',
            mode: 'Ofisdən',
            posted: 'Bu gün',
            deadlineIn: 24,
            description: 'Mağazaların gündəlik fəaliyyətinə, təchizat zəncirinə və xidmət standartlarına cavabdeh olacaq Pərakəndə Əməliyyatlar üzrə Departament Direktoru axtarılır.',
            responsibilities: [
                'Mağaza şəbəkəsinin əməliyyat planlarının hazırlanması və icrası',
                'Təchizat, anbar və xidmət standartlarının vahid səviyyədə saxlanması',
                'Regional menecerlərin və şöbə müdirlərinin idarə olunması',
                'Əməliyyat xərclərinin və KPI göstəricilərinin izlənməsi'
            ],
            requirements: [
                'Pərakəndə əməliyyatlarda 8+ il, o cümlədən 3+ il departament rəhbəri təcrübəsi',
                'Təchizat zənciri və mağaza əməliyyatları üzrə dərin biliklər',
                'Böyük komandaların idarə olunması bacarığı',
                'Analitik düşüncə və nəticəyönümlülük'
            ],
            offer: ['Rəqabətqabiliyyətli maaş və rüblük bonus', 'Sağlamlıq sığortası', 'Xidməti avtomobil', 'Peşəkar inkişaf büdcəsi']
        },
        {
            id: 3,
            premium: true,
            title: 'Maliyyə Departamentinin Direktoru',
            company: 'PASHA Bank',
            logo: 'logos/pasha-bank.png',
            category: 'finance',
            sector: 'banking-finance',
            jobCategory: 'economic-finance',
            level: 'department-head',
            location: 'Bakı',
            type: 'Tam ştat',
            mode: 'Ofisdən',
            posted: '1 gün əvvəl',
            deadlineIn: 23,
            description: 'Şirkətin maliyyə planlaşdırılması, büdcələşdirmə və hesabatlılıq proseslərinə rəhbərlik edəcək təcrübəli Maliyyə Meneceri axtarırıq.',
            responsibilities: [
                'Şirkətin maliyyə planlaşdırılması və büdcə proseslərinin idarə olunması',
                'Aylıq və illik maliyyə hesabatlarının hazırlanması və təhlili',
                'Pul vəsaitlərinin hərəkətinə nəzarət və risklərin qiymətləndirilməsi',
                'Rəhbərliyə qərarvermə üçün analitik hesabatların təqdim edilməsi'
            ],
            requirements: [
                'Maliyyə/Mühasibatlıq üzrə ali təhsil',
                '5+ il müvafiq iş təcrübəsi',
                'Maliyyə hesabatlılığı standartları biliyi (IFRS üstünlükdür)',
                'Excel-də irəli səviyyə'
            ],
            offer: ['İllik bonus sistemi', 'Nahar kompensasiyası', 'Karyera inkişafı imkanları']
        },
        {
            id: 4,
            title: 'Baş Mühasib',
            company: 'PASHA Bank',
            logo: 'logos/pasha-bank.png',
            category: 'finance',
            sector: 'banking-finance',
            jobCategory: 'economic-finance',
            level: 'division-head',
            location: 'Bakı',
            type: 'Tam ştat',
            mode: 'Ofisdən',
            posted: '1 həftə əvvəl',
            deadlineIn: 9,
            description: 'Bütün mühasibat uçotu proseslərinin aparılması və vergi hesabatlarının vaxtında təqdim edilməsinə görə məsuliyyət daşıyacaq Baş Mühasib axtarırıq.',
            requirements: [
                'Mühasibatlıq üzrə 7+ il təcrübə, 2+ il rəhbər vəzifədə',
                '1C proqramında sərbəst işləmə bacarığı',
                'Vergi Məcəlləsi üzrə dərin bilik',
                'Komanda idarəetmə bacarığı'
            ],
            offer: ['Rəqabətqabiliyyətli maaş', 'Sağlamlıq sığortası', 'Sabit iş qrafiki']
        },
        {
            id: 7,
            premium: true,
            title: 'Layihə Meneceri (Tikinti)',
            company: 'Azərbaycan Dəmir Yolları (ADY)',
            logo: 'logos/ady.png',
            category: 'construction',
            sector: 'real-estate-construction',
            jobCategory: 'technical-engineering',
            level: 'manager',
            location: 'Bakı',
            type: 'Tam ştat',
            mode: 'Ofisdən',
            posted: '6 gün əvvəl',
            deadlineIn: 24,
            description: 'Tikinti layihələrinin planlaşdırılması, büdcəyə və müddətə uyğun icrasının təmin edilməsi üçün təcrübəli Layihə Meneceri axtarırıq.',
            responsibilities: [
                'Tikinti layihələrinin planlaşdırılması, icrası və müddətində təhvil verilməsi',
                'Podratçılar və təchizatçılarla əlaqələrin idarə olunması',
                'Layihə büdcəsinə, keyfiyyətə və təhlükəsizlik normalarına nəzarət',
                'Layihə komandasının koordinasiyası və müntəzəm hesabatlılıq'
            ],
            requirements: [
                'İnşaat mühəndisliyi üzrə ali təhsil',
                '5+ il layihə idarəetməsi təcrübəsi',
                'MS Project / AutoCAD bilikləri',
                'Sahədə iş qrafikinə uyğunluq'
            ],
            offer: ['Layihə bonusları', 'Nəqliyyat təminatı', 'Peşəkar sertifikat proqramları']
        },
        {
            id: 8,
            title: 'Anbar Nəzarətçisi',
            company: 'Azərbaycan Hava Yolları (AZAL)',
            logo: 'logos/azal.png',
            category: 'logistics',
            sector: 'transport-logistics',
            jobCategory: 'supply-operations',
            level: 'division-head',
            location: 'Bakı',
            type: 'Tam ştat',
            mode: 'Ofisdən',
            posted: '3 gün əvvəl',
            deadlineIn: 10,
            description: 'Anbar əməliyyatlarının səmərəli təşkili, ehtiyatların uçotu və komandanın rəhbərliyi üçün Anbar Nəzarətçisi axtarırıq.',
            requirements: [
                'Anbar/logistika sahəsində 2+ il təcrübə',
                'WMS proqram təminatı ilə iş bacarığı',
                'Komanda idarəetmə bacarığı',
                'Fiziki aktivliyə açıqlıq'
            ],
            offer: ['Nahar təminatı', 'Nəqliyyat xətti', 'İş yerində təlim']
        },
        {
            id: 13,
            title: 'Bank Biznesi üzrə Baş Direktor',
            company: 'Azərbaycan Beynəlxalq Bankı (ABB)',
            logo: 'logos/abb.png',
            category: 'banking',
            sector: 'banking-finance',
            jobCategory: 'economic-finance',
            level: 'director',
            location: 'Bakı',
            type: 'Tam ştat',
            mode: 'Ofisdən',
            posted: '2 gün əvvəl',
            deadlineIn: 16,
            description: 'Yeni sığorta məhsullarının hazırlanması və mövcud məhsul xəttinin bazar tələblərinə uyğun inkişaf etdirilməsi üçün Menecer axtarırıq.',
            requirements: [
                'Sığorta və ya bank sektorunda 3+ il təcrübə',
                'Məhsul idarəetməsi bacarığı',
                'Bazar araşdırması aparma təcrübəsi',
                'Analitik düşüncə'
            ],
            offer: ['Bank sektoru üzrə sosial paket', 'İllik bonus sistemi', 'Peşəkar inkişaf imkanları']
        },
        {
            id: 19,
            title: 'Pərakəndə Satış Şöbəsinin Müdiri',
            company: 'Kontakt Home',
            logo: 'logos/kontakt-home.png',
            category: 'marketing',
            sector: 'retail-ecommerce',
            jobCategory: 'sales-marketing-comms',
            level: 'division-head',
            location: 'Bakı',
            type: 'Tam ştat',
            mode: 'Ofisdən',
            posted: '1 gün əvvəl',
            deadlineIn: 14,
            description: 'Mağazalar şəbəkəsinin satış göstəricilərinə cavabdeh olacaq, komandaya rəhbərlik edəcək şöbə müdiri axtarırıq.',
            responsibilities: ['Satış planlarının qurulması və icrasına nəzarət', 'Mağaza menecerlərinin idarə olunması', 'Aylıq satış hesabatlarının hazırlanması'],
            requirements: ['Pərakəndə satışda 5+ il, o cümlədən 2+ il rəhbər təcrübəsi', 'Analitik düşüncə', 'Komanda idarəetməsi bacarığı'],
            offer: ['Əsas maaş + satış bonusu', 'Sığorta paketi', 'Karyera inkişafı imkanları']
        },
        {
            id: 22,
            premium: true,
            title: 'Rezervasiya və Qonaq Münasibətləri Meneceri',
            company: 'Fairmont Baku',
            logo: 'logos/fairmont-baku.png',
            category: 'hr',
            sector: 'tourism-hospitality',
            jobCategory: 'service-other',
            level: 'manager',
            location: 'Bakı',
            type: 'Tam ştat',
            mode: 'Ofisdən',
            posted: '4 gün əvvəl',
            deadlineIn: 12,
            description: 'Beş ulduzlu otelimizdə rezervasiya şöbəsini idarə edəcək və qonaq məmnuniyyətinə cavabdeh olacaq menecer axtarırıq.',
            responsibilities: ['Rezervasiya prosesinin idarə olunması', 'Qonaq şikayət və təkliflərinin həlli', 'Turizm agentlikləri ilə əməkdaşlıq'],
            requirements: ['Qonaqpərvərlik sahəsində 3+ il təcrübə', 'Azərbaycan, ingilis və rus dillərini bilmək', 'Opera və ya analoji PMS təcrübəsi üstünlükdür'],
            offer: ['Nahar və forma', 'Sığorta', 'Otel şəbəkəsində endirimlər']
        },
        {
            id: 26,
            premium: true,
            title: 'Korporativ Kredit Üzrə Menecer',
            company: 'Kapital Bank',
            logo: 'logos/kapital-bank.png',
            category: 'banking',
            sector: 'banking-finance',
            jobCategory: 'economic-finance',
            level: 'manager',
            location: 'Bakı',
            type: 'Tam ştat',
            mode: 'Ofisdən',
            posted: 'Bu gün',
            deadlineIn: 15,
            description: 'Korporativ müştərilərə kredit məhsullarının təqdimatı və portfelin idarə olunması üçün menecer axtarılır.',
            responsibilities: ['Korporativ müştərilərlə əlaqələrin qurulması','Kredit sənədlərinin hazırlanması','Portfelin monitorinqi'],
            requirements: ['Bankçılıqda 3+ il təcrübə','İqtisadi və ya maliyyə təhsili','Analitik düşüncə'],
            offer: ['Rəqabətqabiliyyətli maaş','Sığorta','Karyera imkanları']
        },
        {
            id: 29,
            title: 'Rəqəmsal Məhsul Meneceri',
            company: 'Azercell',
            logo: 'logos/azercell.png',
            category: 'it',
            sector: 'tech-telecom',
            jobCategory: 'it-digital',
            level: 'manager',
            location: 'Bakı',
            type: 'Tam ştat',
            mode: 'Hibrid',
            posted: '3 gün əvvəl',
            deadlineIn: 21,
            description: 'Rəqəmsal xidmətlərin yol xəritəsinə və inkişafına rəhbərlik edəcək menecer axtarılır.',
            responsibilities: ['Məhsul strategiyasının qurulması','Komandalar arası əlaqələndirmə','İstifadəçi analitikasının izlənməsi'],
            requirements: ['Məhsul idarəetməsində 4+ il','Agile/Scrum təcrübəsi','Analitik bacarıqlar'],
            offer: ['Hibrid iş','Sığorta','Təlim büdcəsi']
        },
        {
            id: 31,
            title: 'Satış üzrə Regional Menecer',
            company: 'Azersun Holding',
            logo: 'logos/azersun.png',
            category: 'marketing',
            sector: 'fmcg',
            jobCategory: 'sales-marketing-comms',
            level: 'manager',
            location: 'Gəncə',
            type: 'Tam ştat',
            mode: 'Ofisdən',
            posted: '5 gün əvvəl',
            deadlineIn: 16,
            description: 'Qərb regionunda satış şəbəkəsinin inkişafı üçün regional menecer axtarılır.',
            responsibilities: ['Satış planının icrası','Distribyutorlarla əlaqə','Bazar təhlili'],
            requirements: ['Satışda 3+ il təcrübə','Sürücülük vəsiqəsi','Komanda idarəetməsi'],
            offer: ['Xidməti avtomobil','Bonus sistemi','Sığorta']
        },
        {
            id: 32,
            title: 'Mağaza Meneceri',
            company: 'Bravo',
            logo: 'logos/bravo.png',
            category: 'marketing',
            sector: 'retail-ecommerce',
            jobCategory: 'sales-marketing-comms',
            level: 'manager',
            location: 'Sumqayıt',
            type: 'Tam ştat',
            mode: 'Ofisdən',
            posted: 'Dünən',
            deadlineIn: 11,
            description: 'Supermarketin gündəlik əməliyyatlarına və komandaya rəhbərlik edəcək menecer axtarılır.',
            responsibilities: ['Mağaza əməliyyatlarının idarə olunması','Stok və planoqram nəzarəti','İşçi qrafikinin hazırlanması'],
            requirements: ['Pərakəndədə 2+ il rəhbər təcrübəsi','Liderlik bacarığı','Növbəli iş qrafikinə hazırlıq'],
            offer: ['Sığorta','Bonuslar','Karyera inkişafı']
        }
    ];

    // --- BACKEND REJİMİ ---
    // js/site-settings.js-də backend ünvanı yazılıbsa yuxarıdakı nümunə vakansiyalar İSTİFADƏ OLUNMUR:
    // vakansiyalar /api/vacancies-dən, filtr seçimləri /filters.json-dan gəlir (js/vacancies-backend.js).
    // Ünvan boşdursa (indiki vəziyyət) bu blok heç nə etmir və səhifə nümunə datayla işləyir.
    const BACKEND = Boolean(window.TC_API_BASE && window.tcVacanciesBackend);
    // Backend filtr qrupları: [{ key, listId }] — passesSidebarFilters() və populyar düymələr bunu oxuyur
    let FILTER_GROUPS = null;
    const STATIC_GROUP_LISTS = {
        sector: 'sector-filter-list', job_category: 'function-filter-list', level: 'level-filter-list',
        region: 'region-filter-list', schedule: 'schedule-filter-list', work_mode: 'format-filter-list'
    };
    const listIdForGroup = (key) => STATIC_GROUP_LISTS[key] || (key + '-filter-list');
    if (!BACKEND) {
        const langSwitchStatic = document.getElementById('lang-switch');
        if (langSwitchStatic) langSwitchStatic.addEventListener('change', () => setTimeout(() => {
            renderList();
            const current = VACANCIES.find(x => x.id === activeVacancyId);
            if (current) renderDetail(current);
        }, 80));
    }
    if (BACKEND) {
        const backendData = await window.tcVacanciesBackend.load();
        VACANCIES = backendData.vacancies;
        FILTER_GROUPS = backendData.groups;
        // Dil dəyişəndə vakansiya mətnləri də o dildə gəlsin: main.js dili yadda saxladıqdan sonra səhifəni yenilə
        const langSwitch = document.getElementById('lang-switch');
        if (langSwitch) langSwitch.addEventListener('change', () => setTimeout(() => location.reload(), 60));
        // Populyar axtarışlar backend-dən (admin → Sayt parametrləri); parametrlər gec gələ bilər
        const applyPopular = () => window.tcVacanciesBackend.renderPopular(window.TC_POPULAR);
        applyPopular();
        window.addEventListener('tc-settings', applyPopular);
    }

    const MOBILE_BREAKPOINT = 1024; // css/vacancies.css-dəki mobil sərhədlə eynidir
    const MOBILE_PAGE_SIZE = 10; // mobildə hər səhifədə maksimum vakansiya sayı

    function isMobile() {
        return window.innerWidth <= MOBILE_BREAKPOINT;
    }

    // industries.html-dəki sahə kartlarından "?category=it" kimi keçid gələ bilər —
    // etibarlı bir kateqoriyadırsa, siyahı açılışda birbaşa o sahəyə filtrlənir.
    const requestedCategory = new URLSearchParams(window.location.search).get('category');
    const isValidCategory = CATEGORIES.some(cat => cat.id === requestedCategory);

    let activeCategory = isValidCategory ? requestedCategory : 'all';
    // Səhifə açılanda/yenilənəndə sağ paneldə heç bir vakansiya default
    // seçilməmiş olmalıdır (istifadəçi özü vakansiya kartına basmayınca) —
    // ona görə null-dan başlayır, VACANCIES[0]-dan yox.
    let activeVacancyId = null;

    // Vakansiya kartına "sağ klik → yeni tabda aç" edildikdə (və ya orta
    // klik / Ctrl+klik) "?vacancy=<id>" ilə buraya gəlinir — bu halda səhifə
    // sırf həmin vakansiyanın detayını göstərən "fokuslanmış" görünüşə keçir
    // (sol/orta sütunlar gizlənir, bax css/vacancies.css-də body.vacancy-focused-mode).
    // Adi (dəyişdirici düyməsiz) klik ilə heç vaxt bura keçilmir — o hələ də
    // köhnə davranışı (sağ paneldə açmaq) saxlayır, bax listEl click handler-i.
    const requestedVacancyId = Number(new URLSearchParams(window.location.search).get('vacancy'));
    const requestedVacancy = VACANCIES.find(v => v.id === requestedVacancyId);
    if (requestedVacancy) {
        activeVacancyId = requestedVacancy.id;
        document.body.classList.add('vacancy-focused-mode');
        document.title = `Talentcore | ${requestedVacancy.titleRaw || requestedVacancy.title}`;
    }
    // Şirkət haqqında məlumat (nümunə) — şirkət adı ilə uyğunlaşdırılır. Qəsdən
    // yalnız bəzi şirkətlər üçün doldurulub: məlumat verməyən şirkətin vakansiyasında
    // "Şirkət haqqında" bölməsi boş qalmır, tamamilə gizlənir (bax renderDetail).
    const COMPANY_ABOUT = {
        'TechCore Solutions': 'TechCore Solutions bank və telekommunikasiya sektoru üçün rəqəmsal məhsullar hazırlayan texnologiya şirkətidir. Komandamız 60-dan çox mühəndis və dizayner birləşdirir.',
        'Baku Finance Group': 'Baku Finance Group Azərbaycanda korporativ maliyyə və investisiya xidmətləri göstərən qrupdur. Müştərilərimizə büdcələmə, risk idarəçiliyi və maliyyə məsləhəti təqdim edirik.',
        'AtlasBank': 'AtlasBank fiziki və hüquqi şəxslərə geniş çeşiddə bank və sığorta məhsulları təklif edən universal banklardan biridir.',
        'BrightWave Agency': 'BrightWave Agency brendlərə rəqəmsal marketinq, kontent və performans reklamı üzrə xidmət göstərən kreativ agentlikdir.',
        'NorthBuild MMC':'NorthBuild MMC yaşayış və kommersiya tikinti layihələrinin icrası ilə məşğul olan inşaat şirkətidir.'
    };

    let mobilePage = 1; // yalnız mobil görünüşdə istifadə olunur
    let searchQuery = '';
    let sortMode = 'newest'; // 'newest' | 'oldest' | 'az'
    // "Yaddaşa verilmiş vakansiyalar" düyməsi bir filtr checkbox-u kimi işləyir:
    // aktiv olanda orta sütunun siyahısı yalnız save edilmiş vakansiyaları
    // göstərir (digər aktiv filtrlərlə birgə, AND məntiqi ilə) — bax renderList().
    let showSavedOnly = false;

    // Sol paneldəki "Region" və "İş qrafiki"/"İş rejimi" filtrləri üçün ayrıca
    // sahə saxlamırıq — VACANCIES-də onsuz da olan location/type/mode
    // mətnlərini filtr checkbox-larının value-larına uyğunlaşdırırıq. Yalnız
    // "Fəaliyyət sahəsi" (sector) və "Kateqoriyalar" (jobCategory) köhnə
    // 7-lik `category`-dən fərqli, tamamilə yeni taksonomiyalar olduğu üçün
    // hər VACANCIES elanına ayrıca sahə kimi əlavə olunub (bax yuxarı).
    const REGION_BY_LOCATION = {
        'Bakı': 'baku', 'Sumqayıt': 'sumgait', 'Gəncə': 'ganja', 'Xırdalan': 'khirdalan',
        'Mingəçevir': 'mingachevir', 'Lənkəran': 'lankaran', 'Tovuz': 'tovuz',
        'Hacıqabul': 'hajigabul', 'Şamaxı': 'shamakhi', 'Şəmkir': 'shamkir', 'Bərdə': 'barda',
        'Cəlilabad': 'jalilabad', 'Qazax': 'gazakh', 'Quba': 'guba', 'Qusar': 'gusar',
        'Xaçmaz': 'khachmaz', 'Salyan': 'salyan', 'Şirvan': 'shirvan', 'Göyçay': 'goychay',
        'İmişli': 'imishli', 'Qəbələ': 'gabala', 'Masallı': 'masally', 'Beyləqan': 'beylagan',
        'Xızı': 'khizi', 'Naxçıvan': 'nakhchivan'
    };
    const SCHEDULE_BY_TYPE = { 'Tam ştat': 'full-time', 'Yarım ştat': 'part-time' };
    const FORMAT_BY_MODE = { 'Ofisdən': 'office', 'Hibrid': 'hybrid', 'Uzaqdan': 'remote' };

    // Bir filtr qrupunda seçilmiş checkbox-ların value-larını qaytarır.
    function getCheckedValues(listId) {
        const listEl2 = document.getElementById(listId);
        if (!listEl2) return [];
        return [...listEl2.querySelectorAll('input[type="checkbox"]:checked')].map(cb => cb.value);
    }

    // Sol paneldəki 7 filtr qrupu — qrup daxilində OR (istənilən seçilmiş
    // qutuya uyğun gəlsə kifayətdir), qruplar arasında AND (hər aktiv qrupun
    // şərtinə uyğun gəlməlidir). Heç nə seçilməyibsə, həmin qrup filtrləməyə
    // təsir etmir. Bu, real backend gələnə qədər statik VACANCIES üzərində
    // test üçündür — real data ilə eyni taksonomiya saxlanılmalıdır.
    function passesSidebarFilters(v) {
        // Backend rejimi: hər filtr qrupu vakansiyanın filters[qrup_açarı] dəyəri ilə müqayisə olunur
        if (BACKEND) {
            const companiesB = getCheckedValues('company-filter-list');
            if (companiesB.length && !companiesB.includes(v.company)) return false;
            for (const group of (FILTER_GROUPS || [])) {
                const checked = getCheckedValues(group.listId);
                if (checked.length && !checked.includes((v.filters || {})[group.key])) return false;
            }
            return true;
        }

        const sectors = getCheckedValues('sector-filter-list');
        if (sectors.length && !sectors.includes(v.sector)) return false;

        const companies = getCheckedValues('company-filter-list');
        if (companies.length && !companies.includes(v.company)) return false;

        const jobCategories = getCheckedValues('function-filter-list');
        if (jobCategories.length && !jobCategories.includes(v.jobCategory)) return false;

        const levels = getCheckedValues('level-filter-list');
        if (levels.length && !levels.includes(v.level)) return false;

        const regions = getCheckedValues('region-filter-list');
        if (regions.length && !regions.includes(REGION_BY_LOCATION[v.location])) return false;

        const schedules = getCheckedValues('schedule-filter-list');
        if (schedules.length && !schedules.includes(SCHEDULE_BY_TYPE[v.type])) return false;

        const formats = getCheckedValues('format-filter-list');
        if (formats.length && !formats.includes(FORMAT_BY_MODE[v.mode])) return false;

        return true;
    }

    // "posted" sahəsi ("2 gün əvvəl", "1 həftə əvvəl") sabit mətn kimi
    // saxlanılır (UI-də göstərilən budur), amma sıralama üçün ondan təxmini
    // gün sayı çıxarırıq — ayrıca bir tarix sahəsi saxlamağa ehtiyac qalmır.
    function getPostedDaysAgo(postedText) {
        const match = postedText.match(/(\d+)\s*(gün|həftə)/);
        if (!match) return 0;
        const amount = parseInt(match[1], 10);
        return match[2] === 'həftə' ? amount * 7 : amount;
    }

    // Kartın solundakı şirkət loqosu. Hələ real loqo faylları yoxdur — vakansiyada
    // ixtiyari `logo` (şəkil yolu) sahəsi varsa o göstərilir, yoxdursa şirkət
    // adı əvəzinə sakit, tək rəngli bina ikonu (placeholder) çəkilir. Real loqolar
    // gələndə sadəcə VACANCIES-ə logo: 'yol.png' əlavə etmək kifayətdir.
    function companyLogoHtml(v) {
        if (v.logo) {
            return `<span class="vacancy-logo"><img src="${v.logo}" alt="${v.company}"></span>`;
        }
        return `<span class="vacancy-logo" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                <rect x="4" y="3" width="11" height="18" rx="1.5"></rect>
                <path d="M15 9h4a1 1 0 0 1 1 1v11h-5"></path>
                <path d="M8 7h3M8 11h3M8 15h3"></path>
            </svg>
        </span>`;
    }

    // Kartdakı tarix: "2 gün əvvəl" əvəzinə "Bu gün" / "Dünən" / "03 okt" (qısa, 3 hərfli ay).
    // Real tarix sahəsi yoxdur, ona görə posted mətnindən hesablanan gün sayı
    // bu günkü tarixdən çıxılır (getPostedDaysAgo ilə eyni təxmini məntiq).
    const MONTHS = {
        az: ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avq', 'sen', 'okt', 'noy', 'dek'],
        en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        ru: ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
    };
    function formatPostedDate(postedText) {
        const daysAgo = getPostedDaysAgo(postedText);
        if (daysAgo === 0) return tr('Bu gün', 'Today', 'Сегодня', '今天');
        if (daysAgo === 1) return tr('Dünən', 'Yesterday', 'Вчера', '昨天');
        const d = new Date();
        d.setDate(d.getDate() - daysAgo);
        const lang = document.documentElement.lang || 'az';
        if (lang === 'zh') return `${d.getMonth() + 1}月${d.getDate()}日`;
        return `${String(d.getDate()).padStart(2, '0')} ${(MONTHS[lang] || MONTHS.en)[d.getMonth()]}`;
    }

    function sortVacancies(vacancies) {
        const sorted = [...vacancies];
        if (sortMode === 'oldest') {
            sorted.sort((a, b) => getPostedDaysAgo(b.posted) - getPostedDaysAgo(a.posted));
        } else if (sortMode === 'az') {
            sorted.sort((a, b) => a.title.localeCompare(b.title, 'az'));
        } else if (sortMode === 'za') {
            sorted.sort((a, b) => b.title.localeCompare(a.title, 'az'));
        } else {
            sorted.sort((a, b) => getPostedDaysAgo(a.posted) - getPostedDaysAgo(b.posted));
        }
        return sorted;
    }

    function highlightActiveCard() {
        listEl.querySelectorAll('.vacancy-card').forEach(card => {
            card.classList.toggle('active', Number(card.dataset.id) === activeVacancyId);
        });
    }

    // Sağ paneldə default görünüş — heç bir vakansiya seçilməyibsə, xidmətlərimizi
    // 5 saniyədən bir növbə ilə göstəririk (services.html-dəki eyni 4 xidmət).
    // "sağa lazım olsa sonra reklam qoyacağıq" — ona görə bu, ayrıca funksiya kimi
    // saxlanılıb ki, gələcəkdə asanlıqla bir statik reklam bloku ilə əvəzlənsin.
    const SERVICES_SHOWCASE = [
        { az: { title: "Executive Search", desc: "Şirkətin strateji hədəflərinə və idarəetmə ehtiyaclarına uyğun rəhbərlərin və yüksək səviyyəli liderlərin axtarışı və seçim prosesini həyata keçiririk." }, en: { title: "Executive Search", desc: "We identify and attract senior executives and strategic leaders whose expertise and leadership capabilities align with your company’s strategic objectives and leadership needs." } },
        { az: { title: "Professional Recruitment", desc: "Biznesinizin tələblərinə uyğun peşəkar mütəxəssisləri müəyyənləşdirir, strukturlaşdırılmış seçim prosesi vasitəsilə komandalarınıza dəyər qatacaq istedadların cəlb olunmasını təmin edirik." }, en: { title: "Professional Recruitment", desc: "We identify qualified professionals aligned with your business needs and leverage a structured selection process to attract talent that strengthens your teams and drives business success." } },
        { az: { title: "Talent Assessment", desc: "Namizədlərin və əməkdaşların səriştə və potensialını qiymətləndirərək, biznesin strateji hədəflərinə uyğun doğru istedad qərarların verilməsinə dəstək oluruq." }, en: { title: "Talent Assessment", desc: "We assess candidates’ and employees’ competencies and potential to support informed talent decisions aligned with your business’s strategic objectives." } },
        { az: { title: "Immigration Services", desc: "Xarici mütəxəssislərin cəlb olunması və miqrasiya prosedurlarının peşəkar idarə edilməsi ilə işçi qüvvənizin beynəlxalq mobilliyini dəstəkləyirik." }, en: { title: "Immigration Services", desc: "We support international workforce mobility by facilitating the recruitment of foreign professionals and professionally managing immigration procedures." } }
    ];
    // SaÄ panelin default illÃ¼strasiyasÄ± (CV + bÃ¶yÃ¼dÃ¼cÃ¼ ÅÃ¼ÅÉ) â dÃ¶rd xidmÉtin hamÄ±sÄ± Ã¼Ã§Ã¼n eynidir.
    const PLACEHOLDER_ILLUSTRATION = `<svg class="placeholder-illustration" viewBox="0 0 220 200" fill="none" aria-hidden="true"><g transform="rotate(-8 90 90)"><rect x="34" y="40" width="110" height="130" rx="14" fill="#dbe8fb" stroke="#bcd3f5" stroke-width="2"/><rect x="48" y="54" width="82" height="102" rx="8" fill="#fff" opacity=".9"/></g><rect x="58" y="62" width="104" height="76" rx="10" fill="#fff" stroke="#c6d9f7" stroke-width="2"/><circle cx="82" cy="88" r="11" fill="#2563eb"/><path d="M64 118c2-11 10-16 18-16s16 5 18 16z" fill="#2563eb"/><rect x="108" y="80" width="42" height="7" rx="3.500" fill="#b7cdf3"/><rect x="108" y="95" width="34" height="7" rx="3.500" fill="#cfdef7"/><rect x="108" y="110" width="40" height="7" rx="3.500" fill="#cfdef7"/><circle cx="150" cy="128" r="30" fill="#e6f0ff" stroke="#1d4ed8" stroke-width="9"/><path d="M172 150l24 24" stroke="#1d4ed8" stroke-width="12" stroke-linecap="round"/><path d="M172 50l8-14M186 62l14-6M162 40l2-16" stroke="#f59e0b" stroke-width="5" stroke-linecap="round"/></svg>`;
    // Sınaq üçün: backend-dən reklam gəlməyəndə göstəriləcək poster (hazırda boşdur — xidmətlər göstərilir).
    // Sınamaq üçün: [{ image: 'images/detail-ad.webp', url: '' }] yaz. ---
    const TEST_DETAIL_ADS = [];
    function getDetailAds() {
        return (window.TC_ADS && window.TC_ADS.length) ? window.TC_ADS : TEST_DETAIL_ADS;
    }

    // Sağ panel yaxınlaşma effekti (pageexecutive.com kimi): sayt açılanda panel adi (tam) görünür; siçan
    // panelin üstündə ikən təkəri aşağı fırladanda məzmun yaxınlaşır (çərçivədən kənara çıxan hissə kəsilir),
    // yuxarı fırladanda uzaqlaşır və kiçik, əyri kart halına düşür. Sərhədə (tam kiçik/tam böyük) çatanda təkər səhifəyə ötürülür —
    // yəni səhifənin sürüşdürülməsi tutulub qalmır. Toxunma ekranında və "hərəkəti azalt" rejimində
    // məzmun birbaşa tam göstərilir. CSS dəyişəni --zoom (0..1) görünüşü idarə edir (.detail-zoom, .detail-ad).
    // Xidmətlər hər 5 saniyədən bir dəyişəndə element yenidən yaradılır, ona görə vəziyyət (zoomTarget/zoomCurrent)
    // elementdən kənarda saxlanır və yaxınlaşma dəyişmir.
    const ZOOM_STILL = window.matchMedia('(hover: none), (prefers-reduced-motion: reduce)').matches;
    let zoomTarget = 1; // 1 = normal görünüş (sayt açılanda belədir); 0 = kiçik əyri kart; 2 = 1,34x yaxınlaşmış
    let zoomCurrent = zoomTarget;
    let zoomRaf = null;
    let zoomEl = null;
    function zoomApply() { if (zoomEl) zoomEl.style.setProperty('--zoom', zoomCurrent.toFixed(4)); }
    function zoomTick() {
        zoomCurrent += (zoomTarget - zoomCurrent) * 0.16;
        if (Math.abs(zoomTarget - zoomCurrent) < 0.002) zoomCurrent = zoomTarget;
        zoomApply();
        zoomRaf = zoomCurrent === zoomTarget ? null : requestAnimationFrame(zoomTick);
    }
    function setupDetailZoom(el) {
        zoomEl = el;
        zoomApply();
        if (ZOOM_STILL) return;
        el.addEventListener('wheel', e => {
            const next = Math.min(2, Math.max(0, zoomTarget + e.deltaY * 0.002));
            if (next === zoomTarget) return; // sərhəddədir: təkər səhifəni sürüşdürsün
            e.preventDefault();
            zoomTarget = next;
            if (!zoomRaf) zoomRaf = requestAnimationFrame(zoomTick);
        }, { passive: false });
    }
    let showcaseIndex = 0;
    let showcaseTimer = null;

    function renderServicesShowcase() {
        // Backend-dən reklam şəkilləri gəlibsə (Sayt parametrləri) xidmətlər əvəzinə onlar göstərilir
        const ads = getDetailAds();
        if (ads.length) {
            const ad = ads[showcaseIndex % ads.length];
            const hasLink = ad.url && new RegExp('^https?://', 'i').test(ad.url);
            const wrap = document.createElement(hasLink ? 'a' : 'div');
            wrap.className = 'detail-ad';
            if (hasLink) { wrap.href = ad.url; wrap.target = '_blank'; wrap.rel = 'noopener sponsored'; }
            const img = document.createElement('img');
            img.src = ad.image;
            img.alt = '';
            wrap.appendChild(img);
            detailEl.replaceChildren(wrap);
            setupDetailZoom(wrap);
            return;
        }
        const item = SERVICES_SHOWCASE[showcaseIndex];
        // 4 dil (az/en/ru/zh): mətnlər window.tcMsg ilə seçilir — az mətni açardır,
        // ru/zh js/translations.js lüğətindədir, en isə burada ehtiyatdır
        const ctaText = window.tcMsg('Xidmətlərimizə baxın', 'Explore Our Services');
        const hintText = window.tcMsg('Ətraflı məlumat üçün soldan bir vakansiya seçin.', 'Select a vacancy on the left to see its details.');
        detailEl.innerHTML = `
            <div class="detail-zoom"><div class="detail-zoom-card">
            <div class="detail-placeholder">
                <div class="detail-placeholder-icon">${PLACEHOLDER_ILLUSTRATION}</div>
                <h3>${window.tcMsg(item.az.title, item.en.title)}</h3>
                <p>${window.tcMsg(item.az.desc, item.en.desc)}</p>
                <a href="services.html" class="btn-primary">${ctaText}</a>
                <div class="detail-placeholder-hint"><div class="hint-divider"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3"/><circle cx="5.500" cy="10" r="2"/><circle cx="18.500" cy="10" r="2"/><path d="M7 20v-1.500a5 5 0 0 1 10 0V20M1.500 19v-1a3 3 0 0 1 3-3M22.500 19v-1a3 3 0 0 0-3-3"/></svg></div><span>${hintText}</span></div>
            </div>
            </div></div>
        `;
        setupDetailZoom(detailEl.querySelector('.detail-zoom'));
    }

    function startShowcaseRotation() {
        stopShowcaseRotation();
        renderServicesShowcase();
        showcaseTimer = setInterval(() => {
            // Tək poster varsa yenidən çəkmirik, yoxsa yaxınlaşma vəziyyəti hər 5 saniyədən bir sıfırlanardı
            if (getDetailAds().length === 1 && detailEl.querySelector('.detail-ad')) return;
            showcaseIndex = (showcaseIndex + 1) % (getDetailAds().length || SERVICES_SHOWCASE.length);
            renderServicesShowcase();
        }, 5000);
    }

    // Parametrlər (reklamlar) gec gəlirsə: heç nə seçilməyibsə sağ sütunu dərhal yenilə
    window.addEventListener('tc-settings', function () {
        if (activeVacancyId === null) {
            showcaseIndex = 0;
            startShowcaseRotation();
        }
    });

    function stopShowcaseRotation() {
        if (showcaseTimer) {
            clearInterval(showcaseTimer);
            showcaseTimer = null;
        }
    }

    const AZ_MONTHS_FULL = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avqust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr'];

    // Son müraciət tarixi — real tarix sahəsi yoxdur, `deadlineIn` (bu gündən neçə gün
    // sonra) saxlanılır, nümunə datadır. Verilməyibsə sətir ümumiyyətlə göstərilmir.
    function deadlineHtml(v) {
        if (typeof v.deadlineIn !== 'number') return '';
        const d = new Date();
        d.setDate(d.getDate() + v.deadlineIn);
        const pad = x => String(x).padStart(2, '0');
        const text = `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
        const left = v.deadlineIn === 0
            ? tr('Bu gün son gündür', 'Last day today', 'Сегодня последний день', '今天是最后一天')
            : tr(`${v.deadlineIn} gün qalıb`, `${v.deadlineIn} days left`, `Осталось дней: ${v.deadlineIn}`, `剩余 ${v.deadlineIn} 天`);
        const urgent = v.deadlineIn <= 3 ? ' urgent' : '';
        return `<div class="detail-deadline-pill${urgent}" title="${left}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg><span>${tr('Son tarix', 'Deadline', 'Срок', '截止日期')} ${text}</span></div>`;
    }

    // Bölmələr İXTİYARİDİR: şirkət/vakansiya həmin məlumatı verməyibsə (boş, undefined,
    // boş massiv) bölmə başlığı ilə birlikdə tamamilə gizlənir — boş başlıq qalmır.
    function textSectionHtml(title, text) {
        const t = String(text || '').trim();
        return t ? `<div class="detail-section"><h4>${title}</h4><p>${t}</p></div>` : '';
    }

    function listSectionHtml(title, items) {
        const list = (items || []).map(x => String(x || '').trim()).filter(Boolean);
        if (!list.length) return '';
        return `<div class="detail-section"><h4>${title}</h4><ul>${list.map(i => `<li><span class="tick">✓</span><span>${i}</span></li>`).join('')}</ul></div>`;
    }

    // Oxşar vakansiyalar: YALNIZ eyni kateqoriyadan (sol paneldəki "Kateqoriyalar" = jobCategory), maks. 3 elan.
    // Əvvəl PREMİUM, sonra ən yenilər. Kateqoriyası olmayan vakansiyada oxşar siyahısı çıxmır.
    // (Backend-də eyni qayda: Vacancy::similar().)
    function getSimilarVacancies(v) {
        if (!v.jobCategory) return [];
        return VACANCIES
            .filter(o => o.id !== v.id && o.jobCategory === v.jobCategory)
            .sort((a, b) => (b.premium ? 1 : 0) - (a.premium ? 1 : 0)
                || getPostedDaysAgo(a.posted) - getPostedDaysAgo(b.posted)
                || a.id - b.id)
            .slice(0, 3);
    }

    function similarSectionHtml(v) {
        const similar = getSimilarVacancies(v);
        if (!similar.length) return '';
        return `<div class="detail-section detail-similar">
            <h4>${tr('Oxşar vakansiyalar', 'Similar vacancies', 'Похожие вакансии', '相似职位')}</h4>
            <div class="similar-list">${similar.map(o => `
                <a class="similar-vacancy" data-id="${o.id}" href="vacancies.html?vacancy=${o.id}">
                    ${companyLogoHtml(o)}
                    <span class="similar-body">
                        <span class="similar-title">${o.title}</span>
                        <span class="similar-meta">${o.company} · ${formatPostedDate(o.posted)}</span>
                    </span>
                </a>`).join('')}
            </div>
        </div>`;
    }

    function renderDetail(v) {
        if (!v) {
            stopShowcaseRotation();
            detailEl.innerHTML = `<p class="vacancy-empty">${tr('Bu sahədə hazırda açıq vakansiya yoxdur.', 'There are currently no open vacancies in this area.', 'В этой области сейчас нет открытых вакансий.', '该领域目前没有开放职位。')}</p>`;
            return;
        }
        stopShowcaseRotation();
        const catLabel = (CATEGORIES.find(c => c.id === v.category) || {}).az || v.categoryLabel || '';
        // "Müraciət Et" hara aparır: backend-də "birbaşa Glorri" seçilibsə xarici link (yeni tabda, bizə müraciət gəlmir),
        // əks halda cv.html müraciət formu. Nümunə vakansiyalarda həmişə cv.html.
        const externalApplyUrl = (v.apply && v.apply.method === 'external' && /^https?:\/\//i.test(v.apply.url || '')) ? v.apply.url : '';
        const applyHref = externalApplyUrl || `cv.html?${new URLSearchParams({
            company: v.companyRaw || v.company,
            vacancy: v.titleRaw || v.title,
            ...(v.slug ? { slug: v.slug } : {}),
            ...((v.logoRaw || v.logo) ? { logo: v.logoRaw || v.logo } : {})
        })}`;
        const applyAttrs = externalApplyUrl ? ' target="_blank" rel="noopener noreferrer" data-apply="external"' : ' data-apply="mail"';
        detailEl.innerHTML = `
            <div class="detail-header">
                ${companyLogoHtml(v)}
                <div class="detail-header-text">
                    <h2>${v.title}</h2>
                    <div class="company-row">${v.company}${catLabel ? ' · ' + trVal(catLabel) : ''}</div>
                </div>
            </div>
            <div class="detail-meta-row">
                <div class="detail-meta-item" title="${tr('Yer', 'Location', 'Место', '地点')}"><span class="value"><svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>${trVal(v.location)}</span></div>
                <div class="detail-meta-item" title="${tr('Məşğulluq', 'Employment', 'Занятость', '工作类型')}"><span class="value"><svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/></svg>${trVal(v.type)}</span></div>
                <div class="detail-meta-item" title="${tr('İş forması', 'Work mode', 'Формат работы', '工作方式')}"><span class="value"><svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 20h20"/></svg>${trVal(v.mode)}</span></div>
                <div class="detail-meta-item" title="${tr('Maaş', 'Salary', 'Зарплата', '薪资')}"><span class="value"><svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.8"/><path d="M6 9.5v.01M18 14.5v.01"/></svg>${tr('Razılaşma yolu ilə', 'Negotiable', 'По договорённости', '面议')}</span></div>
                ${deadlineHtml(v)}
            </div>
            <div class="detail-tabs" role="tablist">
                <button type="button" class="detail-tab active" role="tab" aria-selected="true" data-tab="job">${tr('Vəzifə haqqında', 'About the role', 'О должности', '关于职位')}</button>
                <button type="button" class="detail-tab" role="tab" aria-selected="false" data-tab="company">${tr('Şirkət haqqında', 'About the company', 'О компании', '关于公司')}</button>
            </div>
            <div class="detail-tab-panel" role="tabpanel" data-panel="job">
                ${textSectionHtml(tr('Vəzifənin təsviri / məqsədi', 'Job description / purpose', 'Описание должности / цель', '职位描述 / 目标'), v.description)}
                ${listSectionHtml(tr('Öhdəliklər', 'Responsibilities', 'Обязанности', '岗位职责'), v.responsibilities)}
                ${listSectionHtml(tr('Tələblər', 'Requirements', 'Требования', '任职要求'), v.requirements)}
                ${listSectionHtml(tr('Təkliflərimiz', 'What we offer', 'Мы предлагаем', '我们提供'), v.offer)}
                <!-- "Müraciət Et" və "Yadda saxla" yalnız "Vəzifə haqqında" tabındadır —
                     "Şirkət haqqında" tabında lazım deyil (tələb olunub) -->
                <div class="detail-actions">
                    <a href="${applyHref}"${applyAttrs} class="btn-primary detail-apply-btn">
                        <span>${tr('Müraciət Et', 'Apply', 'Откликнуться', '申请职位')}</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                    </a>
                    <button type="button" class="detail-save-btn${isSaved(v.id) ? ' saved' : ''}" data-id="${v.id}" aria-pressed="${isSaved(v.id)}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                        <span>${isSaved(v.id) ? tr('Yadda saxlanıb', 'Saved', 'Сохранено', '已收藏') : tr('Yadda saxla', 'Save', 'Сохранить', '收藏')}</span>
                    </button>
                </div>
            </div>
            <div class="detail-tab-panel" role="tabpanel" data-panel="company" hidden>
                ${textSectionHtml(tr('Şirkət haqqında məlumat', 'About the company', 'О компании', '公司简介'), COMPANY_ABOUT[v.company] || v.companyAbout) || `<p class="detail-tab-empty">${tr('Bu şirkət haqqında məlumat tezliklə əlavə olunacaq.', 'Information about this company will be added soon.', 'Информация об этой компании скоро появится.', '公司信息即将添加。')}</p>`}
            </div>
            ${similarSectionHtml(v)}
        `;

        // Boş qalan başlıq nişanları (məs. yer/qrafik/rejim seçilməyibsə) göstərilmir
        detailEl.querySelectorAll('.detail-meta-item').forEach(item => {
            const val = item.querySelector('.value');
            if (val && !val.textContent.trim()) item.remove();
        });

        if (BACKEND) {
            // Siyahı yığcam məlumat gətirir — təsvir və siyahılar vakansiya seçiləndə yüklənir
            if (!v._detailLoaded && !v._detailLoading) {
                v._detailLoading = true;
                window.tcVacanciesBackend.loadDetail(v)
                    .catch(() => { v._detailLoaded = true; })
                    .finally(() => {
                        v._detailLoading = false;
                        if (activeVacancyId === v.id) renderDetail(v);
                    });
            }
            if (!v._viewTracked) {
                v._viewTracked = true;
                if (window.tcTrack) window.tcTrack('vacancy_view', { vacancy: v.slug });
            }
        }
    }

    // "Müraciət Et" kliklərinin sayğacı (mail yolu / Glorri yolu ayrıca sayılır)
    detailEl.addEventListener('click', (e) => {
        const btn = e.target.closest('.detail-apply-btn');
        if (!btn || !window.tcTrack || !BACKEND) return;
        const v = VACANCIES.find(x => x.id === activeVacancyId);
        window.tcTrack(btn.dataset.apply === 'external' ? 'external_apply_click' : 'apply_click', { vacancy: v && v.slug });
    });

    function renderMobilePagination(totalPages) {
        if (!isMobile() || totalPages <= 1) return '';
        return `
            <div class="vacancies-mobile-pagination">
                <button class="mobile-page-btn" data-mobile-page="prev" ${mobilePage === 1 ? 'disabled' : ''}>‹ Əvvəlki</button>
                <span class="mobile-page-info">${mobilePage} / ${totalPages}</span>
                <button class="mobile-page-btn primary" data-mobile-page="next" ${mobilePage === totalPages ? 'disabled' : ''}>Növbəti ›</button>
            </div>
        `;
    }

    function renderList() {
        let filtered = activeCategory === 'all'
            ? VACANCIES
            : VACANCIES.filter(v => v.category === activeCategory);

        filtered = filtered.filter(passesSidebarFilters);

        if (showSavedOnly) {
            const savedIds = getSavedIds();
            filtered = filtered.filter(v => savedIds.includes(v.id));
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(v => v.title.toLowerCase().includes(q) || v.company.toLowerCase().includes(q));
        }

        filtered = sortVacancies(filtered);

        // Premium elanlar həmişə siyahının ən başında sabitlənir. Filtr/axtarış
        // yuxarıda artıq tətbiq olunub, deməli açılışda (filtrsiz) bütün sahələrin
        // premium-ları, filtr seçiləndə isə yalnız həmin filtrə uyğun premium-lar
        // qalır. Array.sort stabildir — hər qrupun daxilində seçilmiş sıralama saxlanır.
        filtered = [...filtered.filter(v => v.premium), ...filtered.filter(v => !v.premium)];


        if (filtered.length === 0) {
            listEl.innerHTML = showSavedOnly
                ? '<p class="vacancy-empty">Hələ heç bir vakansiya yadda saxlanmayıb.</p>'
                : '<p class="vacancy-empty">Bu sahədə hazırda açıq vakansiya yoxdur.</p>';
            renderDetail(null);
            return;
        }

        // Mobildə (desktopda YOX) siyahı 10-luq "səhifələrə" bölünür ki, çox
        // sayda vakansiya olduqda səhifə sonsuz uzanmasın.
        let pageItems = filtered;
        let totalPages = 1;
        if (isMobile()) {
            totalPages = Math.ceil(filtered.length / MOBILE_PAGE_SIZE);
            if (mobilePage > totalPages) mobilePage = totalPages;
            if (mobilePage < 1) mobilePage = 1;
            pageItems = filtered.slice((mobilePage - 1) * MOBILE_PAGE_SIZE, mobilePage * MOBILE_PAGE_SIZE);
        }

        listEl.innerHTML = pageItems.map(v => `
            <a class="vacancy-card${v.premium ? ' premium' : ''}" data-id="${v.id}" href="vacancies.html?vacancy=${v.id}">
                ${v.premium ? '<span class="vacancy-premium-badge">PREMİUM</span>' : ''}
                <button type="button" class="vacancy-save-btn${isSaved(v.id) ? ' saved' : ''}" data-id="${v.id}" aria-label="Yadda saxla">
                    <svg viewBox="0 0 24 24">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                    </svg>
                </button>
                <button type="button" class="vacancy-share-btn" data-id="${v.id}" aria-label="Paylaş">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="18" cy="5" r="3"></circle>
                        <circle cx="6" cy="12" r="3"></circle>
                        <circle cx="18" cy="19" r="3"></circle>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                    </svg>
                </button>
                <span class="vacancy-posted">${formatPostedDate(v.posted)}</span>
                <div class="vacancy-card-main">
                    ${companyLogoHtml(v)}
                    <div class="vacancy-card-body">
                        <h4 title="${v.title}">${v.title}</h4>
                        <div class="vacancy-meta">
                            <span class="vacancy-company">${v.company}</span>
                        </div>
                    </div>
                </div>
            </a>
        `).join('') + renderMobilePagination(totalPages);

        // Əvvəl seçilmiş vakansiya filtrdən sonra siyahıda qalmayıbsa seçimi
        // ləğv edirik (sağ panel default xidmətlər vitrininə qayıdır) —
        // ONU ƏVƏZ ETMƏK ÜÇÜN başqa vakansiyanı MƏCBURİ seçmirik, çünki
        // istifadəçi özü klikləməyənə qədər default heç nə açılmamalıdır.
        // Fokuslanmış rejimdə (bax "?vacancy=" yuxarıda) bu yoxlamanı ötürürük —
        // orada siyahı/səhifələmə heç göstərilmir, ona görə vakansiyanın mobil
        // pageItems-in hansı səhifəsinə düşdüyü seçimi ləğv etməməlidir.
        if (activeVacancyId !== null && !document.body.classList.contains('vacancy-focused-mode') && !pageItems.find(v => v.id === activeVacancyId)) {
            activeVacancyId = null;
        }
        highlightActiveCard();
        if (activeVacancyId === null) {
            startShowcaseRotation();
        } else {
            renderDetail(VACANCIES.find(v => v.id === activeVacancyId));
        }
    }

    listEl.addEventListener('click', (e) => {
        const pageBtn = e.target.closest('.mobile-page-btn');
        if (pageBtn && !pageBtn.disabled) {
            mobilePage += pageBtn.dataset.mobilePage === 'next' ? 1 : -1;
            renderList();
            listEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }

        const saveBtn = e.target.closest('.vacancy-save-btn');
        if (saveBtn) {
            e.preventDefault();
            e.stopPropagation();
            toggleSaved(Number(saveBtn.dataset.id));
            return;
        }

        const shareBtn = e.target.closest('.vacancy-share-btn');
        if (shareBtn) {
            e.preventDefault();
            e.stopPropagation();
            const vac = VACANCIES.find(x => x.id === Number(shareBtn.dataset.id));
            if (vac) shareVacancy(vac, shareBtn);
            return;
        }

        const card = e.target.closest('.vacancy-card');
        if (!card) return;

        // Kart indi əsl <a href="...">-dır ki, sağ klik → "Yeni tabda aç"
        // (və ya orta klik / Ctrl+Cmd+klik) native işləsin. Adi (dəyişdirici
        // düyməsiz, sol) klikdə isə köhnə davranış davam edir: səhifə
        // dəyişmir, detal elə bu səhifədə sağ paneldə açılır.
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();

        activeVacancyId = Number(card.dataset.id);
        highlightActiveCard();
        renderDetail(VACANCIES.find(v => v.id === activeVacancyId));
        detailEl.scrollTop = 0;
        if (window.innerWidth <= 1024) {
            detailEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });

    // Detal panelindəki "Oxşar vakansiyalar" — renderDetail() hər dəfə detailEl-in
    // innerHTML-ini bütünlüklə yenidən yazdığı üçün listener birbaşa elementə yox,
    // detailEl-in özünə delegasiya edilir. Adi sol klik elə həmin paneldə həmin
    // vakansiyanı açır (vacancy-card ilə eyni davranış); Ctrl/orta/sağ klik native
    // "yeni tabda aç" qalır. Fokuslanmış rejimdə (siyahı gizlidir, URL ?vacancy=
    // ilə sabitdir) isə link adi keçid kimi işləyir ki, URL ilə göstərilən vakansiya
    // uyğun qalsın.
    detailEl.addEventListener('click', (e) => {
        const link = e.target.closest('.similar-vacancy');
        if (!link) return;
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
        if (document.body.classList.contains('vacancy-focused-mode')) return;
        e.preventDefault();

        activeVacancyId = Number(link.dataset.id);
        highlightActiveCard();
        renderDetail(VACANCIES.find(v => v.id === activeVacancyId));
        detailEl.scrollTop = 0;
        const activeCard = listEl.querySelector('.vacancy-card.active');
        if (activeCard) activeCard.scrollIntoView({ block: 'nearest' });
    });

    // "Yaddaşa verilmiş vakansiyalar" düyməsi — sol paneldə ayrıca altına
    // yığılan bir siyahı YOXDUR, sadəcə bir filtr açarı kimi işləyir: basılanda
    // orta sütunun siyahısı yalnız save edilmiş vakansiyaları göstərir (necə
    // ki "Şirkətlər" filtri seçiləndə orta sütun ona uyğun nəticələri göstərir),
    // yenidən basılanda normal görünüşə qayıdır.
    const savedToggleBtn = document.getElementById('saved-vacancies-toggle');
    if (savedToggleBtn) {
        savedToggleBtn.addEventListener('click', () => {
            showSavedOnly = !showSavedOnly;
            savedToggleBtn.classList.toggle('active', showSavedOnly);
            savedToggleBtn.setAttribute('aria-pressed', String(showSavedOnly));
            mobilePage = 1;
            renderList();
        });
    }

    // Ekran mobil ↔ desktop sərhədini keçəndə (məs. cihazı çevirəndə) siyahını
    // yenidən çəkirik ki, səhifələmə vəziyyəti düzgün tətbiq/ləğv olunsun.
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(renderList, 150);
    });

    // Sol paneldəki 7 filtr qrupundan hər hansı checkbox dəyişəndə siyahını
    // yenidən çəkirik — delegasiya sayəsində dinamik doldurulan Şirkətlər
    // siyahısı (renderCompanyFilter) daxil olmaqla bütün checkbox-lar üçün
    // işləyir, ayrıca listener lazım deyil. "Vakansiya yerləşdir" paneli
    // (.vacancies-post-panel) bu konteynerin XARİCİNDƏdir, ona görə linklərə
    // toxunulmur.
    const sidebarFiltersEl = document.querySelector('.vacancies-sidebar');
    // "Seçimləri sıfırla" — yalnız sol paneldəki filtr checkbox-larını təmizləyir
    // (axtarış sahəsinə və "Yaddaşa verilmiş" açarına toxunmur). Heç bir seçim
    // yoxdursa düymə gizlidir; varsa neçə seçim olduğunu göstərir.
    const resetBtn = document.getElementById('filter-reset-btn');
    const resetCount = document.getElementById('filter-reset-count');
    // Hər filtr qrupunun başlığının altındakı yüngül yazı: heç nə seçilməyibsə
    // "Bütün ...", seçilibsə seçilmiş variantların adları (uzunsa "…" ilə kəsilir).
    function updateGroupSubtitles() {
        if (!sidebarFiltersEl) return;
        sidebarFiltersEl.querySelectorAll('.filter-group').forEach(group => {
            const sub = group.querySelector('.filter-group-sub');
            if (!sub) return;
            const names = [...group.querySelectorAll('input[type="checkbox"]:checked')]
                .map(cb => (cb.parentElement.querySelector('span') || {}).textContent)
                .filter(Boolean);
            if (names.length) {
                sub.classList.remove('lang'); // dil dəyişəndə üzərinə yazılmasın
                sub.textContent = names.join(', ');
                sub.title = names.join(', ');
            } else {
                sub.classList.add('lang');
                sub.removeAttribute('title');
                sub.textContent = window.tcText(sub) || '';
            }
        });
    }

    function updateResetBtn() {
        if (!resetBtn || !sidebarFiltersEl) return;
        updateGroupSubtitles();
        document.querySelectorAll('.level-chip').forEach(chip => {
            // Backend populyar düymələri istənilən filtr qrupuna bağlana bilər (data-group + data-value);
            // köhnə statik düymələr "Vəzifə dərəcəsi" qrupuna (data-level) bağlıdır.
            const chipList = listIdForGroup(chip.dataset.group || 'level');
            const chipValue = chip.dataset.value || chip.dataset.level;
            const cb = sidebarFiltersEl.querySelector('#' + chipList + ' input[value="' + CSS.escape(chipValue) + '"]');
            const on = !!(cb && cb.checked);
            chip.classList.toggle('active', on);
            chip.setAttribute('aria-pressed', String(on));
        });
        const qs = document.getElementById('sector-quick-select');
        if (qs) {
            const sectors = sidebarFiltersEl.querySelectorAll('#sector-filter-list input[type="checkbox"]:checked');
            qs.value = sectors.length === 1 ? sectors[0].value : (sectors.length > 1 ? '__multi' : '');
        }
        const n = sidebarFiltersEl.querySelectorAll('input[type="checkbox"]:checked').length;
        resetBtn.hidden = n === 0;
        if (resetCount) resetCount.textContent = n ? '(' + n + ')' : '';
    }
    if (sidebarFiltersEl) {
        sidebarFiltersEl.addEventListener('change', (e) => {
            if (e.target.matches('input[type="checkbox"]')) {
                mobilePage = 1;
                updateResetBtn();
                renderList();
            }
        });
    }
    if (resetBtn && sidebarFiltersEl) {
        resetBtn.addEventListener('click', () => {
            sidebarFiltersEl.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => { cb.checked = false; });
            mobilePage = 1;
            updateResetBtn();
            renderList();
        });
    }

    // Orta sütunun başındakı axtarış + sıralama paneli
    const searchInput = document.getElementById('vacancy-search');

    if (searchInput) {
        let searchTimer;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => {
                searchQuery = searchInput.value.trim();
                mobilePage = 1;
                renderList();
            }, 150);
        });
    }

    // Tam enli axtarış paneli (banner ilə siyahı arasında): "Axtarış et" düyməsi,
    // Enter və "Populyar axtarışlar" çipləri axtarışı gecikmədən tətbiq edir.
    function runSearchNow() {
        if (!searchInput) return;
        searchQuery = searchInput.value.trim();
        mobilePage = 1;
        renderList();
    }
    const searchBtn = document.getElementById('vacancy-search-btn');
    if (searchBtn) searchBtn.addEventListener('click', runSearchNow);
    if (searchInput) {
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') runSearchNow();
        });
    }
    // Populyar düymələr (söz tipli və filtr tipli): düymələr backend-dən gec gələ bilər, ona görə
    // klik konteynerdə dinlənir (delegasiya).
    const popularBox = document.querySelector('.popular-searches');
    if (popularBox) {
        popularBox.addEventListener('click', (e) => {
            const chip = e.target.closest('.popular-chip');
            if (!chip) return;

            if (chip.dataset.q) {
                if (!searchInput) return;
                searchInput.value = chip.dataset.q;
                runSearchNow();
                return;
            }

            // Vəzifə dərəcəsi çipləri sol paneldəki müvafiq filtrə bağlıdır: çipə basmaq həmin
            // checkbox-ı aç/bağlayır, soldan seçim isə çipi aktiv göstərir (bax updateResetBtn).
            if (chip.classList.contains('level-chip')) {
                const chipList = listIdForGroup(chip.dataset.group || 'level');
                const chipValue = chip.dataset.value || chip.dataset.level;
                const cb = sidebarFiltersEl && sidebarFiltersEl.querySelector('#' + chipList + ' input[value="' + CSS.escape(chipValue) + '"]');
                if (!cb) return;
                cb.checked = !cb.checked;
                cb.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
    }

    // "Bütün sahələr" açılan siyahısı sol paneldəki "Fəaliyyət sahəsi" filtri ilə
    // eyni vəziyyəti göstərir: burda sahə seçmək həmin filtrin yalnız bir
    // checkbox-ını işarələyir, "Bütün sahələr" isə hamısını təmizləyir.
    const quickSector = document.getElementById('sector-quick-select');
    if (quickSector && sidebarFiltersEl) {
        quickSector.addEventListener('change', () => {
            const boxes = [...sidebarFiltersEl.querySelectorAll('#sector-filter-list input[type="checkbox"]')];
            boxes.forEach(cb => { cb.checked = cb.value === quickSector.value; });
            if (boxes[0]) boxes[0].dispatchEvent(new Event('change', { bubbles: true }));
        });
    }

    // Fərdi sıralama dropdown-u (native <select> deyil — bax vacancies.html-dəki şərhə)
    const sortToggle = document.getElementById('vacancy-sort-toggle');
    const sortMenu = document.getElementById('vacancy-sort-menu');
    const sortLabel = document.getElementById('vacancy-sort-label');

    if (sortToggle && sortMenu && sortLabel) {
        const closeSortMenu = () => {
            sortMenu.classList.add('collapsed');
            sortToggle.setAttribute('aria-expanded', 'false');
        };

        sortToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = sortToggle.getAttribute('aria-expanded') === 'true';
            sortMenu.classList.toggle('collapsed', isOpen);
            sortToggle.setAttribute('aria-expanded', String(!isOpen));
        });

        sortMenu.querySelectorAll('li').forEach(option => {
            option.addEventListener('click', () => {
                sortMode = option.dataset.value;

                // Seçilmiş sıralamanın adını toggle düyməsində göstəririk və
                // .lang atributlarını da köçürürük ki, dil dəyişəndə (AZ/EN)
                // bu etiket də düzgün tərcümə olunsun.
                const optionSpan = option.querySelector('.lang');
                sortLabel.textContent = optionSpan.textContent;
                sortLabel.setAttribute('data-az', optionSpan.getAttribute('data-az'));
                sortLabel.setAttribute('data-en', optionSpan.getAttribute('data-en'));

                sortMenu.querySelectorAll('li').forEach(li => li.classList.toggle('active', li === option));
                closeSortMenu();
                renderList();
            });
        });

        // Menyudan kənara klikləndikdə bağlanır
        document.addEventListener('click', (e) => {
            if (!sortToggle.contains(e.target) && !sortMenu.contains(e.target)) {
                closeSortMenu();
            }
        });
    }

    renderCompanyFilter();
    updateSavedCount();

    // "Vakansiya yerləşdir" açılan menyusu (axtarış panelinin sağında).
    const postToggle = document.getElementById('post-dropdown-toggle');
    const postMenu = document.getElementById('post-dropdown-menu');
    if (postToggle && postMenu) {
        const setPostOpen = (open) => {
            postMenu.classList.toggle('collapsed', !open);
            postToggle.setAttribute('aria-expanded', String(open));
        };
        postToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            setPostOpen(postMenu.classList.contains('collapsed'));
        });
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.post-dropdown')) setPostOpen(false);
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') setPostOpen(false);
        });
    }

    // Detal panelinin tabları: "Vəzifə haqqında" / "Şirkət haqqında".
    detailEl.addEventListener('click', (e) => {
        const tab = e.target.closest('.detail-tab');
        if (!tab) return;
        detailEl.querySelectorAll('.detail-tab').forEach(t => {
            const on = t === tab;
            t.classList.toggle('active', on);
            t.setAttribute('aria-selected', String(on));
        });
        detailEl.querySelectorAll('.detail-tab-panel').forEach(p => {
            p.hidden = p.dataset.panel !== tab.dataset.tab;
        });
    });

    // Detal panelindəki "Yadda saxla" düyməsi (kartdakı bookmark ilə eyni saxlanma).
    detailEl.addEventListener('click', (e) => {
        const btn = e.target.closest('.detail-save-btn');
        if (!btn) return;
        toggleSaved(Number(btn.dataset.id));
        syncDetailSaveBtn(Number(btn.dataset.id));
    });
    renderList();
});
