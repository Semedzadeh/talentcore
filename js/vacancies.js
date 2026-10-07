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
        const shareUrl = `${window.location.origin}${window.location.pathname}?vacancy=${v.id}`;

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
    const VACANCIES = [
        {
            id: 1,
            premium: true,
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
            deadlineIn: 13,
            description: 'Məhsul komandamızda backend infrastrukturunun dizaynı və inkişafı üçün təcrübəli Backend Developer axtarırıq. Yüksək yüklənməyə davamlı sistemlər üzərində işləyəcəksiniz.',
            responsibilities: [
                'Backend servislərinin və API-lərin dizaynı, inkişafı və dəstəyi',
                'Kod nəzarəti (code review) və komanda daxilində texniki standartların qorunması',
                'Sistemin performansının izlənməsi və optimallaşdırılması',
                'Məhsul komandası ilə birgə yeni funksionallıqların planlaşdırılması'
            ],
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
            deadlineIn: 18,
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
            premium: true,
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
            company: 'Baku Finance Group',
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
            deadlineIn: 14,
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
            deadlineIn: 19,
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
            premium: true,
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
            company: 'LogiFlow Az',
            category: 'logistics',
            sector: 'transport-logistics',
            jobCategory: 'supply-operations',
            level: 'division-head',
            location: 'Sumqayıt',
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
            id: 9,
            premium: true,
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
            deadlineIn: 15,
            description: 'Kredit müraciətlərinin qiymətləndirilməsi və risk analizinin aparılması üçün Kredit Analitiki axtarırıq.',
            responsibilities: [
                'Korporativ müştərilərin kredit müraciətlərinin maliyyə təhlili',
                'Kredit risklərinin qiymətləndirilməsi və kredit komitəsi üçün rəyin hazırlanması',
                'Mövcud kredit portfelinin monitorinqi',
                'Daxili qaydalara və tənzimləyici tələblərə uyğunluğun təmin edilməsi'
            ],
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
            deadlineIn: 20,
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
            deadlineIn: 25,
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
            deadlineIn: 11,
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
            deadlineIn: 21,
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
            deadlineIn: 26,
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
            deadlineIn: 12,
            description: 'Maliyyə hesabatlarının hazırlanması, büdcə təhlili və proqnozlaşdırma proseslərində iştirak edəcək Maliyyə Analitiki axtarırıq.',
            requirements: [
                'Maliyyə/İqtisadiyyat üzrə ali təhsil',
                '1+ il analitik təcrübə',
                'Excel-də irəli səviyyə bilik',
                'Detallara diqqətlilik'
            ],
            offer: ['Rəqabətqabiliyyətli maaş', 'İllik təlim büdcəsi', 'Karyera inkişafı imkanları']
        },
        {
            id: 17,
            premium: true,
            title: 'Rəqəmsal Marketinq üzrə Aparıcı Mütəxəssis',
            company: 'BrightWave Agency',
            category: 'marketing',
            sector: 'marketing-advertising',
            jobCategory: 'sales-marketing-comms',
            level: null,
            location: 'Bakı',
            type: 'Tam ştat',
            mode: 'Hibrid',
            posted: 'Bu gün',
            deadlineIn: 21,
            description: 'Müştərilərimizin rəqəmsal kanallar üzrə marketinq strategiyasını qurmaq və icrasına rəhbərlik etmək üçün təcrübəli Rəqəmsal Marketinq üzrə Aparıcı Mütəxəssis axtarırıq. Bu rol brendlərin onlayn görünürlüyünü və satış göstəricilərini artırmaq məqsədi daşıyır.',
            responsibilities: [
                'Rəqəmsal marketinq strategiyasının hazırlanması və müştəri hədəflərinə uyğun icrası',
                'Google Ads, Meta Ads və digər ödənişli kanalların idarə olunması və büdcənin optimallaşdırılması',
                'SEO, kontent və e-poçt marketinq fəaliyyətlərinin koordinasiyası',
                'Kampaniya nəticələrinin analitika alətləri ilə izlənməsi və hesabatların hazırlanması',
                'Kiçik marketinq komandasına mentorluq və iş bölgüsü'
            ],
            requirements: [
                'Rəqəmsal marketinq sahəsində 4+ il təcrübə',
                'Google Analytics, Google Ads və Meta Business Suite biliyi',
                'Data əsaslı qərar vermə və A/B test təcrübəsi',
                'Azərbaycan və ingilis dillərində yazılı və şifahi kommunikasiya',
                'Layihələri müstəqil idarə etmək bacarığı'
            ],
            offer: ['Rəqabətqabiliyyətli maaş və illik bonus', 'Hibrid iş qrafiki', 'Sertifikasiya və təlim büdcəsi', 'Sağlamlıq sığortası']
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
        document.title = `Talentcore | ${requestedVacancy.title}`;
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
    const AZ_MONTHS = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avq', 'sen', 'okt', 'noy', 'dek'];
    function formatPostedDate(postedText) {
        const daysAgo = getPostedDaysAgo(postedText);
        if (daysAgo === 0) return 'Bu gün';
        if (daysAgo === 1) return 'Dünən';
        const d = new Date();
        d.setDate(d.getDate() - daysAgo);
        return `${String(d.getDate()).padStart(2, '0')} ${AZ_MONTHS[d.getMonth()]}`;
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
    // SaÄ panelin default illÃ¼strasiyasÄ± (CV + bÃ¶yÃ¼dÃ¼cÃ¼ ÅÃ¼ÅÉ) â dÃ¶rd xidmÉtin hamÄ±sÄ± Ã¼Ã§Ã¼n eynidir.
    const PLACEHOLDER_ILLUSTRATION = `<svg class="placeholder-illustration" viewBox="0 0 220 200" fill="none" aria-hidden="true"><g transform="rotate(-8 90 90)"><rect x="34" y="40" width="110" height="130" rx="14" fill="#dbe8fb" stroke="#bcd3f5" stroke-width="2"/><rect x="48" y="54" width="82" height="102" rx="8" fill="#fff" opacity=".9"/></g><rect x="58" y="62" width="104" height="76" rx="10" fill="#fff" stroke="#c6d9f7" stroke-width="2"/><circle cx="82" cy="88" r="11" fill="#2563eb"/><path d="M64 118c2-11 10-16 18-16s16 5 18 16z" fill="#2563eb"/><rect x="108" y="80" width="42" height="7" rx="3.500" fill="#b7cdf3"/><rect x="108" y="95" width="34" height="7" rx="3.500" fill="#cfdef7"/><rect x="108" y="110" width="40" height="7" rx="3.500" fill="#cfdef7"/><circle cx="150" cy="128" r="30" fill="#e6f0ff" stroke="#1d4ed8" stroke-width="9"/><path d="M172 150l24 24" stroke="#1d4ed8" stroke-width="12" stroke-linecap="round"/><path d="M172 50l8-14M186 62l14-6M162 40l2-16" stroke="#f59e0b" stroke-width="5" stroke-linecap="round"/></svg>`;
    let showcaseIndex = 0;
    let showcaseTimer = null;

    function renderServicesShowcase() {
        const item = SERVICES_SHOWCASE[showcaseIndex];
        const lang = document.documentElement.lang === 'en' ? 'en' : 'az';
        const ctaText = lang === 'en' ? 'Explore Our Services' : 'Xidmətlərimizə baxın';
        const hintText = lang === 'en' ? 'Select a vacancy on the left to see its details.' : 'Ətraflı məlumat üçün soldan bir vakansiya seçin.';
        detailEl.innerHTML = `
            <div class="detail-placeholder">
                <div class="detail-placeholder-icon">${PLACEHOLDER_ILLUSTRATION}</div>
                <h3>${item[lang].title}</h3>
                <p>${item[lang].desc}</p>
                <a href="services.html" class="btn-primary">${ctaText}</a>
                <div class="detail-placeholder-hint"><div class="hint-divider"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3"/><circle cx="5.500" cy="10" r="2"/><circle cx="18.500" cy="10" r="2"/><path d="M7 20v-1.500a5 5 0 0 1 10 0V20M1.500 19v-1a3 3 0 0 1 3-3M22.500 19v-1a3 3 0 0 0-3-3"/></svg></div><span>${hintText}</span></div>
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

    const AZ_MONTHS_FULL = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avqust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr'];

    // Son müraciət tarixi — real tarix sahəsi yoxdur, `deadlineIn` (bu gündən neçə gün
    // sonra) saxlanılır, nümunə datadır. Verilməyibsə sətir ümumiyyətlə göstərilmir.
    function deadlineHtml(v) {
        if (typeof v.deadlineIn !== 'number') return '';
        const d = new Date();
        d.setDate(d.getDate() + v.deadlineIn);
        const text = `${d.getDate()} ${AZ_MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`;
        const left = v.deadlineIn === 0 ? 'Bu gün son gündür' : `${v.deadlineIn} gün qalıb`;
        return `<div class="detail-meta-item detail-deadline"><span class="label">Son müraciət tarixi</span><span class="value">${text} <span class="deadline-left">${left}</span></span></div>`;
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

    // Oxşar vakansiyalar: eyni kateqoriya (ən güclü siqnal), eyni iş kateqoriyası və
    // ya eyni fəaliyyət sahəsi. Ən çox üst-üstə düşən 3 elan.
    function getSimilarVacancies(v) {
        const score = o => (o.category === v.category ? 2 : 0)
            + (o.jobCategory && o.jobCategory === v.jobCategory ? 1 : 0)
            + (o.sector && o.sector === v.sector ? 1 : 0);
        return VACANCIES
            .filter(o => o.id !== v.id)
            .map(o => ({ o, s: score(o) }))
            .filter(x => x.s > 0)
            .sort((a, b) => b.s - a.s || a.o.id - b.o.id)
            .slice(0, 3)
            .map(x => x.o);
    }

    function similarSectionHtml(v) {
        const similar = getSimilarVacancies(v);
        if (!similar.length) return '';
        return `<div class="detail-section detail-similar">
            <h4>Oxşar vakansiyalar</h4>
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
            detailEl.innerHTML = '<p class="vacancy-empty">Bu sahədə hazırda açıq vakansiya yoxdur.</p>';
            return;
        }
        stopShowcaseRotation();
        const catLabel = (CATEGORIES.find(c => c.id === v.category) || {}).az || '';
        detailEl.innerHTML = `
            <div class="detail-header">
                ${companyLogoHtml(v)}
                <div class="detail-header-text">
                    <h2>${v.title}</h2>
                    <div class="company-row">${v.company}${catLabel ? ' · ' + catLabel : ''}</div>
                </div>
            </div>
            <div class="detail-meta-row">
                <div class="detail-meta-item"><span class="label">Yer</span><span class="value">📍 ${v.location}</span></div>
                <div class="detail-meta-item"><span class="label">Məşğulluq</span><span class="value">${v.type}</span></div>
                <div class="detail-meta-item"><span class="label">İş forması</span><span class="value">${v.mode}</span></div>
                <div class="detail-meta-item"><span class="label">Maaş</span><span class="value">Razılaşma yolu ilə</span></div>
                ${deadlineHtml(v)}
            </div>
            ${textSectionHtml('Vəzifənin təsviri / məqsədi', v.description)}
            ${listSectionHtml('Öhdəliklər', v.responsibilities)}
            ${listSectionHtml('Tələblər', v.requirements)}
            ${listSectionHtml('Təkliflərimiz', v.offer)}
            ${textSectionHtml('Şirkət haqqında məlumat', COMPANY_ABOUT[v.company] || v.companyAbout)}
            <a href="cv.html?${new URLSearchParams({ company: v.company, vacancy: v.title })}" class="btn-primary detail-apply-btn">Müraciət Et</a>
            ${similarSectionHtml(v)}
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
                ${v.premium ? '<span class="vacancy-premium-badge">PREMIUM</span>' : ''}
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
    updateSavedCount();
    renderList();
});
