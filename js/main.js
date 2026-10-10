document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Dil Dəyişdirici (az | en | ru | zh) — seçilmiş dil localStorage-də ('lang')
    // saxlanılır və hər səhifə açılanda avtomatik tətbiq olunur (əvvəl səhifə dəyişəndə
    // AZ-yə qayıdırdı).
    const langSwitch = document.getElementById('lang-switch');
    const SUPPORTED_LANGS = ['az', 'en', 'ru', 'zh'];

    function applyLanguage(selectedLang) {
        // <html lang> ƏVVƏL yenilənir — tcText/tcMsg (js/translations.js) və
        // səhifə skriptləri cari dili buradan oxuyur
        document.documentElement.lang = selectedLang;
        // Mətn seçimi window.tcText-dədir: az → data-az, en → data-en, ru/zh →
        // js/translations.js lüğəti (açar = data-az), tapılmasa data-en ehtiyatı.
        // translations.js yüklənməyibsə köhnə az/en davranışı saxlanılır.
        document.querySelectorAll('.lang').forEach(el => {
            el.innerHTML = window.tcText
                ? window.tcText(el, selectedLang)
                : (selectedLang === 'az' ? el.getAttribute('data-az') : el.getAttribute('data-en'));
        });
        // input/textarea placeholder-ləri innerHTML ilə tərcümə oluna bilmir,
        // ona görə eyni məntiq placeholder atributu üçün ayrıca .lang-placeholder
        // klassı ilə təkrarlanır (bax: vacancies.html)
        document.querySelectorAll('.lang-placeholder').forEach(el => {
            el.placeholder = window.tcPlaceholder
                ? window.tcPlaceholder(el, selectedLang)
                : (selectedLang === 'az' ? el.getAttribute('data-az-placeholder') : el.getAttribute('data-en-placeholder'));
        });
    }

    if (langSwitch) {
        langSwitch.addEventListener('change', function() {
            applyLanguage(this.value);
            try { localStorage.setItem('lang', this.value); } catch (e) { /* private rejim və s. — sükutla keçirik */ }
        });

        // Səhifə açılanda yadda saxlanmış dil varsa tətbiq edirik. main.js DOMContentLoaded-də
        // səhifə skriptlərindən (vacancies.js, cv.js...) ƏVVƏL qeydiyyatdan keçdiyi üçün,
        // onlar işə düşəndə <html lang> artıq doğru olur.
        let savedLang = 'az';
        try { savedLang = localStorage.getItem('lang') || 'az'; } catch (e) { /* ignore */ }
        if (SUPPORTED_LANGS.includes(savedLang) && savedLang !== 'az') {
            langSwitch.value = savedLang;
            applyLanguage(savedLang);
        }
    }

    // 2. Tünd / Açıq Rejim və LOQO idarəetməsi
    const themeCheckbox = document.getElementById('theme-toggle');
    const body = document.body;
    // querySelectorAll: yeni .site-logo əlavə olunsa, tema dəyişəndə avtomatik yenilənsin.
    const siteLogos = document.querySelectorAll('.site-logo');
    function setLogoSrc(src) {
        siteLogos.forEach(logo => { logo.src = src; });
    }

    if (themeCheckbox) {
        // Yaddaşdan mövzunu oxuyuruq (Əgər yoxdursa 'dark' qəbul edirik)
        const savedTheme = localStorage.getItem('theme') || 'dark';

        // Səhifə ilk dəfə açılanda loqonu və mövzunu tənzimləyirik
        if (savedTheme === 'light') {
            body.classList.add('light-theme');
            themeCheckbox.checked = true;
            setLogoSrc('logo_light.png'); // Gündüz rejimindəki loqo
        } else {
            body.classList.remove('light-theme');
            themeCheckbox.checked = false;
            setLogoSrc('logo.png'); // Gecə rejimindəki standart ağ loqo
        }

        // İstiafdəçi düyməyə basdıqda anında dəyişdiririk
        themeCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                // Gündüz rejiminə keçid
                body.classList.add('light-theme');
                localStorage.setItem('theme', 'light');
                setLogoSrc('logo_light.png');
            } else {
                // Gecə rejiminə keçid
                body.classList.remove('light-theme');
                localStorage.setItem('theme', 'dark');
                setLogoSrc('logo.png');
            }
        });
    }

    // 3. Mobil Hamburger Menyu
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const header = document.querySelector('.glass-header');

    if (hamburgerBtn && header) {
        hamburgerBtn.addEventListener('click', () => {
            const isActive = header.classList.toggle('active');
            hamburgerBtn.setAttribute('aria-expanded', isActive); // ekran oxuyucuları üçün menyu vəziyyəti
        });
    }
});