// Vakansiyalar səhifəsi: sahələr üzrə filtrləmə + siyahıdan seçilən vakansiyanın
// sağ paneldə detallı göstərilməsi. Yalnız vacancies.html-də işə düşür.
document.addEventListener('DOMContentLoaded', () => {

    const listEl = document.getElementById('vacancies-list');
    const detailEl = document.getElementById('vacancy-detail');
    const catListEl = document.getElementById('category-list');

    if (!listEl || !detailEl || !catListEl) return;

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
    let activeVacancyId = VACANCIES[0].id;
    let mobilePage = 1; // yalnız mobil görünüşdə istifadə olunur

    function countByCategory(catId) {
        return VACANCIES.filter(v => v.category === catId).length;
    }

    function renderCategories() {
        const items = [{ id: 'all', az: 'Bütün Sahələr' }, ...CATEGORIES];
        catListEl.innerHTML = items.map(cat => {
            const count = cat.id === 'all' ? VACANCIES.length : countByCategory(cat.id);
            const activeClass = cat.id === activeCategory ? ' active' : '';
            return `<li class="cat-item${activeClass}" data-category="${cat.id}">
                <span>${cat.az}</span><span class="cat-count">${count}</span>
            </li>`;
        }).join('');
    }

    function highlightActiveCard() {
        listEl.querySelectorAll('.vacancy-card').forEach(card => {
            card.classList.toggle('active', Number(card.dataset.id) === activeVacancyId);
        });
    }

    function renderDetail(v) {
        if (!v) {
            detailEl.innerHTML = '<p class="vacancy-empty">Bu sahədə hazırda açıq vakansiya yoxdur.</p>';
            return;
        }
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
            <a href="cv.html" class="btn-primary detail-apply-btn">Müraciət Et</a>
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
        const filtered = activeCategory === 'all'
            ? VACANCIES
            : VACANCIES.filter(v => v.category === activeCategory);

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

        if (!pageItems.find(v => v.id === activeVacancyId)) {
            activeVacancyId = pageItems[0].id;
        }
        highlightActiveCard();
        renderDetail(VACANCIES.find(v => v.id === activeVacancyId));
    }

    catListEl.addEventListener('click', (e) => {
        const item = e.target.closest('.cat-item');
        if (!item) return;
        activeCategory = item.dataset.category;
        mobilePage = 1;
        renderCategories();
        renderList();
        listEl.scrollTop = 0;
    });

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

    renderCategories();
    renderList();
});
