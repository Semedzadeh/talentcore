// Vakansiyalar səhifəsi: sahələr üzrə filtrləmə + siyahıdan seçilən vakansiyanın
// sağ paneldə detallı göstərilməsi. Yalnız vacancies.html-də işə düşür.
document.addEventListener('DOMContentLoaded', () => {

    // Sol paneldəki bütün filtr qruplarının (Fəaliyyət sahəsi, Şirkətlər,
    // Kateqoriyalar, Vəzifə dərəcəsi, Region, İş qrafiki, İş formatı) aç/bağla
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
    const VACANCIES = [
        {
            id: 1,
            title: 'Senior Backend Developer',
            company: 'TechCore Solutions',
            category: 'it',
            sector: 'tech-telecom',
            jobCategory: 'it-digital',
            level: null,
            location: 'Bakı',
            type: 'Tam ştat',
            mode: 'Hibrid',
            posted: '2 gün əvvəl',
            description: 'Məhsul komandamızda backend infrastrukturunun dizaynı və inkişafı üçün təcrübəli Backend Developer axtarırıq. Yüksək yüklənməyə davamlı sistemlər üzərində işləyəcəksiniz.',
            requirements: [
                'Node.js və ya Java ilə 4+ il təcrübə',
                'PostgreSQL / MySQL ilə verilənlər bazası dizaynı',
                'Mikroservis arxitekturası təcrübəsi',
                'Komanda daxilində effektiv kommunikasiya'
            ],
            offer: ['Rəqabətqabiliyyətli maaş paketi', 'Sağlamlıq sığortası', 'Peşəkar inkişaf büdcəsi']
        },
        {
            id: 2,
            title: 'Frontend Developer (React)',
            company: 'TechCore Solutions',
            category: 'it',
            sector: 'tech-telecom',
            jobCategory: 'it-digital',
            level: null,
            location: 'Bakı',
            type: 'Tam ştat',
            mode: 'Ofisdən',
            posted: '5 gün əvvəl',
            description: 'İstifadəçi interfeyslərinin React əsasında qurulması və mövcud məhsulun inkişaf etdirilməsi üçün Frontend Developer axtarırıq.',
            requirements: [
                'React.js ilə 3+ il təcrübə',
                'TypeScript biliyi',
                'REST API inteqrasiyası təcrübəsi',
                'Diqqətli və detallara həssas yanaşma'
            ],
            offer: ['Çevik iş qrafiki', 'Müasir texnologiya stəki', 'Komanda daxili təlimlər']
        },
        {
            id: 3,
            title: 'Maliyyə Meneceri',
            company: 'Baku Finance Group',
            category: 'finance',
            sector: 'banking-finance',
            jobCategory: 'economic-finance',
            level: 'manager',
            location: 'Bakı',
            type: 'Tam ştat',
            mode: 'Ofisdən',
            posted: '1 gün əvvəl',
            description: 'Şirkətin maliyyə planlaşdırılması, büdcələşdirmə və hesabatlılıq proseslərinə rəhbərlik edəcək təcrübəli Maliyyə Meneceri axtarırıq.',
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
            company: 'Baku Finance Group',
            category: 'finance',
            sector: 'banking-finance',
            jobCategory: 'economic-finance',
            level: 'division-head',
            location: 'Bakı',
            type: 'Tam ştat',
            mode: 'Ofisdən',
            posted: '1 həftə əvvəl',
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
            id: 5,
            title: 'Rəqəmsal Marketinq Mütəxəssisi',
            company: 'BrightWave Agency',
            category: 'marketing',
            sector: 'marketing-advertising',
            jobCategory: 'sales-marketing-comms',
            level: null,
            location: 'Bakı',
            type: 'Tam ştat',
            mode: 'Uzaqdan',
            posted: '3 gün əvvəl',
            description: 'Sosial media, SEO və performans reklamları üzrə strategiyaların hazırlanması və icrası üçün Rəqəmsal Marketinq Mütəxəssisi axtarırıq.',
            requirements: [
                'Rəqəmsal marketinqdə 2+ il təcrübə',
                'Meta Ads və Google Ads təcrübəsi',
                'Analitik düşüncə və hesabatlılıq bacarığı',
                'Yaradıcı məzmun hazırlama bacarığı'
            ],
            offer: ['Tam uzaqdan iş imkanı', 'Çevik iş saatları', 'Performansa əsaslanan bonuslar']
        },
        {
            id: 6,
            title: 'Satış Təmsilçisi',
            company: 'BrightWave Agency',
            category: 'marketing',
            sector: 'marketing-advertising',
            jobCategory: 'sales-marketing-comms',
            level: null,
            location: 'Bakı',
            type: 'Tam ştat',
            mode: 'Ofisdən',
            posted: '4 gün əvvəl',
            description: 'Yeni müştərilərin cəlb edilməsi və mövcud müştəri portfelinin inkişaf etdirilməsi üçün nəticəyönümlü Satış Təmsilçisi axtarırıq.',
            requirements: [
                'Satışda 1+ il təcrübə',
                'Güclü ünsiyyət və danışıqlar bacarığı',
                'Nəticəyönümlülük',
                'B kateqoriyalı sürücülük vəsiqəsi üstünlükdür'
            ],
            offer: ['Sabit əmək haqqı + komissiya', 'Nəqliyyat kompensasiyası', 'Satış təlimləri']
        },
        {
            id: 7,
            title: 'Layihə Meneceri (Tikinti)',
            company: 'NorthBuild MMC',
            category: 'construction',
            sector: 'real-estate-construction',
            jobCategory: 'technical-engineering',
            level: 'manager',
            location: 'Bakı',
            type: 'Tam ştat',
            mode: 'Ofisdən',
            posted: '6 gün əvvəl',
            description: 'Tikinti layihələrinin planlaşdırılması, büdcəyə və müddətə uyğun icrasının təmin edilməsi üçün təcrübəli Layihə Meneceri axtarırıq.',
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
            company: 'LogiFlow Az',
            category: 'logistics',
            sector: 'transport-logistics',
            jobCategory: 'supply-operations',
            level: 'division-head',
            location: 'Sumqayıt',
            type: 'Tam ştat',
            mode: 'Ofisdən',
            posted: '3 gün əvvəl',
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
            id: 9,
            title: 'Kredit Analitiki',
            company: 'AtlasBank',
            category: 'banking',
            sector: 'banking-finance',
            jobCategory: 'economic-finance',
            level: null,
            location: 'Bakı',
            type: 'Tam ştat',
            mode: 'Ofisdən',
            posted: '2 gün əvvəl',
            description: 'Kredit müraciətlərinin qiymətləndirilməsi və risk analizinin aparılması üçün Kredit Analitiki axtarırıq.',
            requirements: [
                'Maliyyə/İqtisadiyyat üzrə ali təhsil',
                '2+ il bank sektorunda təcrübə',
                'Maliyyə analizi və risk qiymətləndirməsi bacarığı',
                'Excel-də irəli səviyyə bilik'
            ],
            offer: ['Bank sektoru üzrə sosial paket', 'İllik təlim büdcəsi', 'Karyera yüksəlişi imkanları']
        },
        {
            id: 10,
            title: 'HR Business Partner',
            company: 'TalentCore Partner Co.',
            category: 'hr',
            sector: 'service-other',
            jobCategory: 'humanitarian-social',
            level: null,
            location: 'Bakı',
            type: 'Tam ştat',
            mode: 'Hibrid',
            posted: '1 gün əvvəl',
            description: 'Biznes bölmələri ilə sıx əməkdaşlıq edərək işə qəbul, işçi təcrübəsi və təşkilati inkişaf proseslərinə dəstək olacaq HR Business Partner axtarırıq.',
            requirements: [
                'HR sahəsində 3+ il təcrübə',
                'İşə qəbul proseslərini idarəetmə bacarığı',
                'Əmək Məcəlləsi üzrə bilik',
                'Güclü kommunikasiya bacarığı'
            ],
            offer: ['Hibrid iş formatı', 'Peşəkar HR sertifikatları üçün dəstək', 'Dostluq mühiti']
        },
        {
            id: 11,
            title: 'UI/UX Dizayner',
            company: 'DesignHub Creative',
            category: 'it',
            sector: 'marketing-advertising',
            jobCategory: 'it-digital',
            level: null,
            location: 'Bakı',
            type: 'Tam ştat',
            mode: 'Uzaqdan',
            posted: '4 gün əvvəl',
            description: 'Məhsul komandası ilə birgə istifadəçi interfeyslərinin dizaynını hazırlayacaq, prototip qurulmasında iştirak edəcək UI/UX Dizayner axtarırıq.',
            requirements: [
                'Figma ilə 2+ il təcrübə',
                'İstifadəçi təcrübəsi (UX) prinsipləri üzrə bilik',
                'Vizual dizayn portfolio-su',
                'Frontend komandası ilə əməkdaşlıq bacarığı'
            ],
            offer: ['Tam uzaqdan iş imkanı', 'Yaradıcı komanda mühiti', 'Müasir dizayn alətlərinə giriş']
        },
        {
            id: 12,
            title: 'Anbar Operatoru',
            company: 'LogiFlow Az',
            category: 'logistics',
            sector: 'transport-logistics',
            jobCategory: 'supply-operations',
            level: null,
            location: 'Sumqayıt',
            type: 'Tam ştat',
            mode: 'Ofisdən',
            posted: '5 gün əvvəl',
            description: 'Anbarda malların qəbulu, yerləşdirilməsi və sifarişlərin hazırlanması proseslərində iştirak edəcək Anbar Operatoru axtarırıq.',
            requirements: [
                'Fiziki aktivliyə açıqlıq',
                'Komanda daxilində işləmə bacarığı',
                'Məsuliyyətlilik və dəqiqlik',
                'Növbəli iş qrafikinə uyğunluq'
            ],
            offer: ['Nahar təminatı', 'Nəqliyyat xətti', 'İş yerində təlim']
        },
        {
            id: 13,
            title: 'Sığorta Məhsulları üzrə Menecer',
            company: 'AtlasBank',
            category: 'banking',
            sector: 'banking-finance',
            jobCategory: 'economic-finance',
            level: 'manager',
            location: 'Bakı',
            type: 'Tam ştat',
            mode: 'Ofisdən',
            posted: '2 gün əvvəl',
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
            id: 14,
            title: 'Tikinti Mühəndisi',
            company: 'NorthBuild MMC',
            category: 'construction',
            sector: 'real-estate-construction',
            jobCategory: 'technical-engineering',
            level: null,
            location: 'Gəncə',
            type: 'Tam ştat',
            mode: 'Ofisdən',
            posted: '1 həftə əvvəl',
            description: 'Tikinti sahəsində texniki nəzarəti həyata keçirəcək, layihə sənədləri ilə sahə işlərinin uyğunluğunu təmin edəcək Tikinti Mühəndisi axtarırıq.',
            requirements: [
                'İnşaat mühəndisliyi üzrə ali təhsil',
                '2+ il sahə təcrübəsi',
                'AutoCAD biliyi',
                'Texniki sənədləşmə bacarığı'
            ],
            offer: ['Yol xərclərinin ödənilməsi', 'Sahə əlavəsi', 'Peşəkar sertifikat proqramları']
        },
        {
            id: 15,
            title: 'İnsan Resursları üzrə Mütəxəssis',
            company: 'TalentCore Partner Co.',
            category: 'hr',
            sector: 'service-other',
            jobCategory: 'humanitarian-social',
            level: null,
            location: 'Bakı',
            type: 'Tam ştat',
            mode: 'Hibrid',
            posted: '3 gün əvvəl',
            description: 'İşə qəbul prosesləri, işçi sənədləşməsi və HR sistemlərinin aparılmasında məsul olacaq İnsan Resursları üzrə Mütəxəssis axtarırıq.',
            requirements: [
                'HR sahəsində 1+ il təcrübə',
                'MS Office proqramlarında sərbəst işləmə',
                'Təşkilatçılıq bacarığı',
                'Məxfiliyə riayət etmə'
            ],
            offer: ['Hibrid iş formatı', 'Öyrənmə və inkişaf proqramları', 'Dostluq mühiti']
        },
        {
            id: 16,
            title: 'Maliyyə Analitiki',
            company: 'Baku Finance Group',
            category: 'finance',
            sector: 'banking-finance',
            jobCategory: 'economic-finance',
            level: null,
            location: 'Bakı',
            type: 'Tam ştat',
            mode: 'Ofisdən',
            posted: '6 gün əvvəl',
            description: 'Maliyyə hesabatlarının hazırlanması, büdcə təhlili və proqnozlaşdırma proseslərində iştirak edəcək Maliyyə Analitiki axtarırıq.',
            requirements: [
                'Maliyyə/İqtisadiyyat üzrə ali təhsil',
                '1+ il analitik təcrübə',
                'Excel-də irəli səviyyə bilik',
                'Detallara diqqətlilik'
            ],
            offer: ['Rəqabətqabiliyyətli maaş', 'İllik təlim büdcəsi', 'Karyera inkişafı imkanları']
        }
    ];

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
    let mobilePage = 1; // yalnız mobil görünüşdə istifadə olunur
    let searchQuery = '';
    let sortMode = 'newest'; // 'newest' | 'oldest' | 'az'

    // Sol paneldəki "Region" və "İş qrafiki"/"İş formatı" filtrləri üçün ayrıca
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
        { icon: '🔍', az: { title: 'Executive Search', desc: 'Gələcəyi quracaq liderlərin və C-level rəhbərlərin tapılması.' }, en: { title: 'Executive Search', desc: 'Finding the leaders who will build the future.' } },
        { icon: '🤝', az: { title: 'Professional Recruitment', desc: 'Peşəkar komandaların səmərəli və sürətli formalaşdırılması.' }, en: { title: 'Professional Recruitment', desc: 'Building professional teams, efficiently and fast.' } },
        { icon: '📊', az: { title: 'Talent Assessment', desc: 'Namizədlərin və komandaların bacarıq və potensialına görə qiymətləndirilməsi.' }, en: { title: 'Talent Assessment', desc: 'Evaluating candidates and teams against their true potential.' } },
        { icon: '🌟', az: { title: 'Employer Branding', desc: 'İstedadları cəlb edən və özündə saxlayan güclü işəgötürən imicinin formalaşdırılması.' }, en: { title: 'Employer Branding', desc: 'Building an employer image that attracts and retains top talent.' } }
    ];
    let showcaseIndex = 0;
    let showcaseTimer = null;

    function renderServicesShowcase() {
        const item = SERVICES_SHOWCASE[showcaseIndex];
        const lang = document.documentElement.lang === 'en' ? 'en' : 'az';
        const ctaText = lang === 'en' ? 'Explore Our Services' : 'Xidmətlərimizə baxın';
        const hintText = lang === 'en' ? 'Select a vacancy on the left to see its details.' : 'Ətraflı məlumat üçün soldan bir vakansiya seçin.';
        detailEl.innerHTML = `
            <div class="detail-placeholder">
                <div class="detail-placeholder-icon">${item.icon}</div>
                <h3>${item[lang].title}</h3>
                <p>${item[lang].desc}</p>
                <a href="services.html" class="btn-primary">${ctaText}</a>
                <div class="detail-placeholder-hint">${hintText}</div>
            </div>
        `;
    }

    function startShowcaseRotation() {
        stopShowcaseRotation();
        renderServicesShowcase();
        showcaseTimer = setInterval(() => {
            showcaseIndex = (showcaseIndex + 1) % SERVICES_SHOWCASE.length;
            renderServicesShowcase();
        }, 5000);
    }

    function stopShowcaseRotation() {
        if (showcaseTimer) {
            clearInterval(showcaseTimer);
            showcaseTimer = null;
        }
    }

    function renderDetail(v) {
        if (!v) {
            stopShowcaseRotation();
            detailEl.innerHTML = '<p class="vacancy-empty">Bu sahədə hazırda açıq vakansiya yoxdur.</p>';
            return;
        }
        stopShowcaseRotation();
        const catLabel = (CATEGORIES.find(c => c.id === v.category) || {}).az || '';
        detailEl.innerHTML = `
            <h2>${v.title}</h2>
            <div class="company-row">${v.company} · ${catLabel}</div>
            <div class="detail-meta-row">
                <div class="detail-meta-item"><span class="label">Yer</span><span class="value">📍 ${v.location}</span></div>
                <div class="detail-meta-item"><span class="label">Məşğulluq</span><span class="value">${v.type}</span></div>
                <div class="detail-meta-item"><span class="label">İş forması</span><span class="value">${v.mode}</span></div>
                <div class="detail-meta-item"><span class="label">Maaş</span><span class="value">Razılaşma yolu ilə</span></div>
            </div>
            <div class="detail-section">
                <h4>Vəzifə Haqqında</h4>
                <p>${v.description}</p>
            </div>
            <div class="detail-section">
                <h4>Tələblər</h4>
                <ul>${v.requirements.map(r => `<li><span class="tick">✓</span><span>${r}</span></li>`).join('')}</ul>
            </div>
            <div class="detail-section">
                <h4>Bizim Təklifimiz</h4>
                <ul>${v.offer.map(o => `<li><span class="tick">✓</span><span>${o}</span></li>`).join('')}</ul>
            </div>
            <a href="cv.html?${new URLSearchParams({ company: v.company, vacancy: v.title })}" class="btn-primary detail-apply-btn">Müraciət Et</a>
        `;
    }

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

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(v => v.title.toLowerCase().includes(q) || v.company.toLowerCase().includes(q));
        }

        filtered = sortVacancies(filtered);

        if (filtered.length === 0) {
            listEl.innerHTML = '<p class="vacancy-empty">Bu sahədə hazırda açıq vakansiya yoxdur.</p>';
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
            <div class="vacancy-card" data-id="${v.id}">
                <h4>${v.title}</h4>
                <div class="vacancy-meta">
                    <span>🏢 ${v.company}</span>
                    <span>📍 ${v.location}</span>
                </div>
                <div class="vacancy-tags">
                    <span class="vacancy-tag">${v.type}</span>
                    <span class="vacancy-tag">${v.mode}</span>
                </div>
                <div class="vacancy-posted">${v.posted}</div>
            </div>
        `).join('') + renderMobilePagination(totalPages);

        // Əvvəl seçilmiş vakansiya filtrdən sonra siyahıda qalmayıbsa seçimi
        // ləğv edirik (sağ panel default xidmətlər vitrininə qayıdır) —
        // ONU ƏVƏZ ETMƏK ÜÇÜN başqa vakansiyanı MƏCBURİ seçmirik, çünki
        // istifadəçi özü klikləməyənə qədər default heç nə açılmamalıdır.
        if (activeVacancyId !== null && !pageItems.find(v => v.id === activeVacancyId)) {
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

        const card = e.target.closest('.vacancy-card');
        if (!card) return;
        activeVacancyId = Number(card.dataset.id);
        highlightActiveCard();
        renderDetail(VACANCIES.find(v => v.id === activeVacancyId));
        detailEl.scrollTop = 0;
        if (window.innerWidth <= 1024) {
            detailEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });

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
    if (sidebarFiltersEl) {
        sidebarFiltersEl.addEventListener('change', (e) => {
            if (e.target.matches('input[type="checkbox"]')) {
                mobilePage = 1;
                renderList();
            }
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
    renderList();
});
