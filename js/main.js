document.addEventListener('DOMContentLoaded', () => {
    
    const langSwitch = document.getElementById('lang-switch');
    if (langSwitch) {
        langSwitch.addEventListener('change', function() {
            const selectedLang = this.value;
            const elements = document.querySelectorAll('.lang');
            
            elements.forEach(el => {
                if(selectedLang === 'az') {
                    el.innerHTML = el.getAttribute('data-az');
                } else {
                    el.innerHTML = el.getAttribute('data-en');
                }
            });
        });
    }

    const themeCheckbox = document.getElementById('theme-toggle');
    const body = document.body;

    if (themeCheckbox) {
        themeCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                body.classList.add('light-theme');
                localStorage.setItem('theme', 'light');
            } else {
                body.classList.remove('light-theme');
                localStorage.setItem('theme', 'dark');
            }
        });

        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light') {
            body.classList.add('light-theme');
            themeCheckbox.checked = true; 
        }
    }
});