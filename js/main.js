document.addEventListener('DOMContentLoaded', () => {
    
    // Dil Dəyişdirici
    const langSwitch = document.getElementById('lang-switch');
    if (langSwitch) {
        langSwitch.addEventListener('change', function() {
            const selectedLang = this.value;
            document.querySelectorAll('.lang').forEach(el => {
                el.innerHTML = selectedLang === 'az' ? el.getAttribute('data-az') : el.getAttribute('data-en');
            });
        });
    }

    // Tünd / Açıq Rejim İdarəetməsi (Düzəliş edildi)
    const themeCheckbox = document.getElementById('theme-toggle');
    const body = document.body;

    if (themeCheckbox) {
        // Yaddaşda 'light' varsa gündüz, yoxsa qaranlıq olsun
        const savedTheme = localStorage.getItem('theme') || 'dark';

        if (savedTheme === 'light') {
            body.classList.add('light-theme');
            themeCheckbox.checked = true; // Gündüz rejimində düymə tam sağda olmalıdır
        } else {
            body.classList.remove('light-theme');
            themeCheckbox.checked = false; // Gecə rejimində düymə tam solda olmalıdır
        }

        // Düyməyə basıldıqda anında reaksiya
        themeCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                body.classList.add('light-theme');
                localStorage.setItem('theme', 'light');
            } else {
                body.classList.remove('light-theme');
                localStorage.setItem('theme', 'dark');
            }
        });
    }

    // Mobil Hamburger Menyu
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const header = document.querySelector('.glass-header');

    if (hamburgerBtn && header) {
        hamburgerBtn.addEventListener('click', () => {
            header.classList.toggle('active');
        });
    }
});