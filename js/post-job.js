// İş elanı paketləri: "Müraciət et" düyməsi modal sorğu formu açır. Yalnız post-job.html-də işə düşür.
// Sol paneldə YALNIZ seçilmiş paket göstərilir (dəyişdirilə bilməz); forma Web3Forms ilə
// info@talentcore.az-a göndərilir (contact.js/cv.js ilə eyni access key — bax CLAUDE.md).
document.addEventListener('DOMContentLoaded', () => {

    const modal = document.getElementById('request-modal');
    const formEl = document.getElementById('request-form');
    if (!modal || !formEl) return;

    const t = (az, en) => (window.tcMsg ? window.tcMsg(az, en) : (document.documentElement.lang === 'az' ? az : en));

    const nameEl = document.getElementById('request-package-name');
    const listEl = document.getElementById('request-package-list');
    const packageInput = document.getElementById('request-package-input');
    const subjectInput = document.getElementById('request-subject');
    const statusEl = document.getElementById('request-status');
    const submitBtn = document.getElementById('request-submit');
    const closeBtn = document.getElementById('request-close');
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    let lastTrigger = null;
    let currentPackage = { name: '', subject: '' };

    function setStatus(text, kind) {
        statusEl.textContent = text;
        statusEl.classList.remove('status-success', 'status-error');
        if (kind) statusEl.classList.add(`status-${kind}`);
    }

    // Seçilmiş kartın adını və xidmətlərini sol panelə KOPYALAYIR. Kopyalanan
    // elementlər .lang olaraq qalır, ona görə dil dəyişəndə (AZ/EN/RU/ZH) onlar da tərcümə olunur.
    function fillPackage(card) {
        const title = card.querySelector('h3');
        const span = document.createElement('span');
        span.className = 'lang';
        span.setAttribute('data-az', title.getAttribute('data-az'));
        span.setAttribute('data-en', title.getAttribute('data-en'));
        span.textContent = window.tcText ? window.tcText(title) : title.textContent;
        nameEl.replaceChildren(span);
        listEl.innerHTML = card.querySelector('ul').innerHTML;
        currentPackage = {
            name: title.getAttribute('data-az'),
            subject: `Talentcore.az — Yeni elan sorğusu (${title.getAttribute('data-az')})`
        };
        packageInput.value = currentPackage.name;
        subjectInput.value = currentPackage.subject;
    }

    function openModal(card, trigger) {
        lastTrigger = trigger;
        fillPackage(card);
        setStatus('', null);
        modal.hidden = false;
        document.body.classList.add('request-open');
        const first = document.getElementById('rq-first');
        if (first) first.focus();
    }

    function closeModal() {
        modal.hidden = true;
        document.body.classList.remove('request-open');
        if (lastTrigger) lastTrigger.focus();
    }

    document.querySelectorAll('.pricing-cta[data-package]').forEach(btn => {
        btn.addEventListener('click', () => openModal(btn.closest('.pricing-card'), btn));
    });

    closeBtn.addEventListener('click', closeModal);
    // Qaranlıq fona (modalın özünə, kartın xaricinə) basanda bağlanır
    modal.addEventListener('mousedown', (e) => {
        if (e.target === modal) closeModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.hidden) closeModal();
    });

    // Fayl seçiləndə qutuda faylın adı göstərilir; seçim ləğv olunsa ilkin yazı qayıdır.
    formEl.querySelectorAll('.rq-upload input[type="file"]').forEach(input => {
        const label = input.closest('.rq-upload');
        const strong = label.querySelector('strong');
        const original = { az: strong.getAttribute('data-az'), en: strong.getAttribute('data-en') };
        input.addEventListener('change', () => {
            label.classList.remove('invalid');
            if (input.files[0]) {
                strong.classList.remove('lang'); // dil dəyişəndə fayl adı üzərinə yazılmasın
                strong.textContent = input.files[0].name;
            } else {
                strong.classList.add('lang');
                strong.setAttribute('data-az', original.az);
                strong.setAttribute('data-en', original.en);
                strong.textContent = window.tcText ? window.tcText(strong) : original.az;
            }
        });
    });

    formEl.addEventListener('submit', async (e) => {
        e.preventDefault();

        const accessKey = formEl.access_key.value.trim();
        if (!accessKey || accessKey === 'YOUR_WEB3FORMS_ACCESS_KEY') {
            setStatus(t('Form hələ qoşulmayıb (access key əlavə olunmayıb).', 'The form is not connected yet (missing access key).'), 'error');
            return;
        }

        // Məcburi: ad, soyad, şirkət adı, telefon, e-poçt, vakansiya faylı, şirkət loqosu.
        // Yalnız "Əlavə qeyd" könüllüdür. (Form novalidate-dir, yoxlama burada edilir.)
        const textFields = ['rq-first', 'rq-last', 'rq-company', 'rq-phone', 'rq-email'].map(id => document.getElementById(id));
        const vacancyFile = document.getElementById('rq-vacancy-file');
        const logoFile = document.getElementById('rq-logo-file');
        textFields.forEach(el => el.classList.remove('invalid'));
        [vacancyFile, logoFile].forEach(el => el.closest('.rq-upload').classList.remove('invalid'));

        const missing = textFields.filter(el => !el.value.trim());
        missing.forEach(el => el.classList.add('invalid'));
        const missingFiles = [vacancyFile, logoFile].filter(el => !el.files[0]);
        missingFiles.forEach(el => el.closest('.rq-upload').classList.add('invalid'));
        if (missing.length || missingFiles.length) {
            (missing[0] || missingFiles[0]).focus();
            setStatus(t('Zəhmət olmasa bütün məcburi xanaları doldurun (qeyd istisna olmaqla).', 'Please fill in all required fields (except the note).'), 'error');
            return;
        }

        const emailEl = document.getElementById('rq-email');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value.trim())) {
            emailEl.classList.add('invalid');
            emailEl.focus();
            setStatus(t('Zəhmət olmasa düzgün email ünvanı daxil edin.', 'Please enter a valid email address.'), 'error');
            return;
        }
        const phoneEl = document.getElementById('rq-phone');
        if (phoneEl.value.replace(/\D/g, '').length < 7) {
            phoneEl.classList.add('invalid');
            phoneEl.focus();
            setStatus(t('Zəhmət olmasa düzgün telefon nömrəsi daxil edin.', 'Please enter a valid phone number.'), 'error');
            return;
        }
        if (vacancyFile.files[0].size > MAX_FILE_SIZE || logoFile.files[0].size > MAX_FILE_SIZE) {
            setStatus(t('Fayl 5MB-dan böyükdür, zəhmət olmasa daha kiçik fayl seçin.', 'File is larger than 5MB, please choose a smaller file.'), 'error');
            return;
        }

        // Web3Forms "name" sahəsini göndərən adı kimi göstərir — ad + soyad birləşdirilir
        document.getElementById('request-fullname').value =
            `${document.getElementById('rq-first').value.trim()} ${document.getElementById('rq-last').value.trim()}`;

        submitBtn.disabled = true;
        setStatus(t('Göndərilir...', 'Sending...'), null);

        try {
            const response = await fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                headers: { 'Accept': 'application/json' },
                body: new FormData(formEl)
            });
            const result = await response.json();

            if (result.success) {
                setStatus(t('Sorğunuz uğurla göndərildi. Tezliklə sizinlə əlaqə saxlayacağıq.', 'Your request has been sent. We will contact you shortly.'), 'success');
                formEl.reset();
                // reset() fayl seçimlərini də təmizləyir — qutulardakı fayl adlarını ilkin yazıya qaytar
                formEl.querySelectorAll('.rq-upload input[type="file"]').forEach(input => input.dispatchEvent(new Event('change')));
                // reset() gizli sahələri (paket/mövzu) də ilkin boş dəyərə qaytarır — seçilmiş paketi yenidən yaz
                packageInput.value = currentPackage.name;
                subjectInput.value = currentPackage.subject;
            } else {
                setStatus(t('Xəta baş verdi, zəhmət olmasa bir az sonra yenidən cəhd edin.', 'Something went wrong, please try again shortly.'), 'error');
            }
        } catch (err) {
            setStatus(t('Xəta baş verdi, zəhmət olmasa bir az sonra yenidən cəhd edin.', 'Something went wrong, please try again shortly.'), 'error');
        } finally {
            submitBtn.disabled = false;
        }
    });
});
