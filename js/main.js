document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Dil Dəyişdirici
    const langSwitch = document.getElementById('lang-switch');
    if (langSwitch) {
        langSwitch.addEventListener('change', function() {
            const selectedLang = this.value;
            document.querySelectorAll('.lang').forEach(el => {
                el.innerHTML = selectedLang === 'az' ? el.getAttribute('data-az') : el.getAttribute('data-en');
            });
            document.documentElement.lang = selectedLang; // <html lang> də yenilənir (əlçatanlıq/SEO üçün)
        });
    }

    // 2. Tünd / Açıq Rejim və LOQO idarəetməsi
    const themeCheckbox = document.getElementById('theme-toggle');
    const body = document.body;
    // querySelectorAll: header-dəki loqodan başqa footer-də də eyni .site-logo
    // klassı ilə bir loqo var (css/global.css-də .footer-logo ilə ölçüləndirilir),
    // ikisi də tema dəyişəndə birlikdə yenilənməlidir.
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