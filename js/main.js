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
    const siteLogo = document.querySelector('.site-logo'); // Loqonu tapırıq

    if (themeCheckbox) {
        // Yaddaşdan mövzunu oxuyuruq (Əgər yoxdursa 'dark' qəbul edirik)
        const savedTheme = localStorage.getItem('theme') || 'dark';

        // Səhifə ilk dəfə açılanda loqonu və mövzunu tənzimləyirik
        if (savedTheme === 'light') {
            body.classList.add('light-theme');
            themeCheckbox.checked = true;
            if (siteLogo) siteLogo.src = 'logo_light.png'; // Gündüz rejimindəki loqo
        } else {
            body.classList.remove('light-theme');
            themeCheckbox.checked = false;
            if (siteLogo) siteLogo.src = 'logo.png'; // Gecə rejimindəki standart ağ loqo
        }

        // İstiafdəçi düyməyə basdıqda anında dəyişdiririk
        themeCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                // Gündüz rejiminə keçid
                body.classList.add('light-theme');
                localStorage.setItem('theme', 'light');
                if (siteLogo) siteLogo.src = 'logo_light.png'; 
            } else {
                // Gecə rejiminə keçid
                body.classList.remove('light-theme');
                localStorage.setItem('theme', 'dark');
                if (siteLogo) siteLogo.src = 'logo.png';
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