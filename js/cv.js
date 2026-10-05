// CV Göndər səhifəsi: form (CV faylı daxil olmaqla) Web3Forms (web3forms.com)
// vasitəsilə birbaşa info@talentcore.az ünvanına göndərilir — heç bir mail
// tətbiqi açılmır, hər şey səhifə daxilində baş verir. Yalnız cv.html-də işə düşür.
document.addEventListener('DOMContentLoaded', () => {

    const formEl = document.getElementById('cv-form');
    const statusEl = document.getElementById('cv-form-status');
    const submitBtn = document.getElementById('cv-submit-btn');

    if (!formEl || !statusEl || !submitBtn) return;

    const isAz = () => document.documentElement.lang !== 'en';

    const MESSAGES = {
        sending: { az: 'Göndərilir...', en: 'Sending...' },
        success: { az: 'CV-niz uğurla göndərildi. Sizə uyğun vakansiya olduqda əlaqə saxlayacağıq.', en: 'Your CV has been sent. We will contact you when a matching role opens up.' },
        successApply: { az: 'Müraciətiniz uğurla göndərildi. Uyğun olduqda sizinlə əlaqə saxlayacağıq.', en: 'Your application has been sent. We will contact you if you are a match.' },
        error: { az: 'Xəta baş verdi, zəhmət olmasa bir az sonra yenidən cəhd edin.', en: 'Something went wrong, please try again shortly.' },
        missingKey: { az: 'Form hələ qoşulmayıb (access key əlavə olunmayıb).', en: 'The form is not connected yet (missing access key).' },
        tooLarge: { az: 'Fayl 5MB-dan böyükdür, zəhmət olmasa daha kiçik fayl seçin.', en: 'File is larger than 5MB, please choose a smaller file.' },
        requiredFields: { az: 'Zəhmət olmasa məcburi sahələri doldurun: ad soyad, email, telefon və CV.', en: 'Please fill in the required fields: full name, email, phone and CV.' },
        invalidEmail: { az: 'Zəhmət olmasa düzgün email ünvanı daxil edin.', en: 'Please enter a valid email address.' },
        invalidPhone: { az: 'Zəhmət olmasa düzgün telefon nömrəsi daxil edin.', en: 'Please enter a valid phone number.' }
    };

    // vacancies.html-dəki "Müraciət Et" düyməsi ?company=...&vacancy=... ilə gəlir —
    // bu halda səhifə "vakansiyaya müraciət" məntiqinə keçir: hansı vakansiyaya
    // müraciət edildiyi kartda görünür, mətnlər/başlıq uyğunlaşır, "İstədiyiniz Vəzifə"
    // gizlənir. Parametr yoxdursa (menyudan gəliş) səhifə ümumi CV formu kimi qalır.
    const params = new URLSearchParams(window.location.search);
    const company = (params.get('company') || '').trim();
    const vacancy = (params.get('vacancy') || '').trim();

    // .lang mexanizmi data-az/data-en oxuyur (main.js) — mətni dəyişəndə hər ikisini yazırıq
    const setLang = (id, az, en) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.setAttribute('data-az', az);
        el.setAttribute('data-en', en);
        el.innerHTML = az;
    };

    const isApplyMode = Boolean(company && vacancy);
    if (isApplyMode) {
        document.body.classList.add('cv-apply-mode');

        // Gizli sahələr göndərişə düşür; defaultValue — formEl.reset() onları silməsin
        const companyInput = document.getElementById('cv-company');
        const vacancyInput = document.getElementById('cv-vacancy');
        companyInput.value = companyInput.defaultValue = company;
        vacancyInput.value = vacancyInput.defaultValue = vacancy;

        // textContent — URL-dən gələn dəyər HTML kimi şərh olunmasın
        document.getElementById('cv-apply-title').textContent = vacancy;
        document.getElementById('cv-apply-company').textContent = company;
        document.getElementById('cv-apply-target').hidden = false;

        // Vakansiyaya müraciətdə "İstədiyiniz Vəzifə" mənasızdır
        document.getElementById('cv-position-group').hidden = true;
        document.getElementById('cv-position').disabled = true;

        // Email-in mövzusu hansı vakansiyaya müraciət olduğunu göstərsin
        formEl.subject.value = formEl.subject.defaultValue = `Talentcore.az — Vakansiyaya Müraciət: ${vacancy} (${company})`;

        setLang('cv-hero-title', 'Vakansiyaya Müraciət', 'Apply for the Role');
        setLang('cv-hero-text',
            'CV-nizi göndərin — müraciətiniz seçdiyiniz vakansiya üzrə komandamıza çatacaq.',
            'Send your CV — your application will reach our team for the role you selected.');
        setLang('cv-form-title', 'Müraciət Formu', 'Application Form');
        setLang('cv-info-title', 'Müraciət Necə Baxılır?', 'What Happens Next?');
        const stepTexts = document.querySelectorAll('.cv-step-text');
        [
            ['Formu doldurun və CV-nizi (PDF və ya Word) əlavə edin.', 'Fill in the form and attach your CV (PDF or Word).'],
            ['Komandamız müraciətinizi vakansiyanın tələbləri ilə müqayisə edərək nəzərdən keçirir.', 'Our team reviews your application against the requirements of the role.'],
            ['Uyğun olduqda sizinlə birbaşa əlaqə saxlayırıq.', 'If you are a match, we contact you directly.']
        ].forEach(([az, en], i) => {
            if (!stepTexts[i]) return;
            stepTexts[i].setAttribute('data-az', az);
            stepTexts[i].setAttribute('data-en', en);
            stepTexts[i].innerHTML = az;
        });
        setLang('cv-privacy-note',
            'Müraciətiniz məxfi saxlanılır və yalnız bu vakansiya üzrə seçim prosesi üçün istifadə olunur.',
            'Your application is kept confidential and used only for this role’s selection process.');
        setLang('cv-submit-btn', 'Müraciət Et', 'Apply');
    }

    const MAX_FILE_SIZE = 5 * 1024 * 1024;

    function setStatus(text, kind) {
        statusEl.textContent = text;
        statusEl.classList.remove('status-success', 'status-error');
        if (kind) statusEl.classList.add(`status-${kind}`);
    }

    formEl.addEventListener('submit', async (e) => {
        e.preventDefault();

        const accessKey = formEl.access_key.value.trim();
        if (!accessKey || accessKey === 'YOUR_WEB3FORMS_ACCESS_KEY') {
            setStatus(MESSAGES.missingKey[isAz() ? 'az' : 'en'], 'error');
            return;
        }

        // Məcburi sahələr: ad soyad, email, telefon, CV. Form `novalidate`-dir,
        // ona görə yoxlama burada edilir. Motivasiya məktubu qəsdən məcburi DEYİL.
        const lang = isAz() ? 'az' : 'en';
        const nameEl = document.getElementById('cv-name');
        const emailEl = document.getElementById('cv-email');
        const phoneEl = document.getElementById('cv-phone');
        const fileInput = document.getElementById('cv-file');
        const motivationInput = document.getElementById('cv-motivation');

        [nameEl, emailEl, phoneEl, fileInput].forEach(el => el.classList.remove('invalid'));

        const missing = [nameEl, emailEl, phoneEl].filter(el => !el.value.trim());
        if (!fileInput.files[0]) missing.push(fileInput);
        if (missing.length) {
            missing.forEach(el => el.classList.add('invalid'));
            missing[0].focus();
            setStatus(MESSAGES.requiredFields[lang], 'error');
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value.trim())) {
            emailEl.classList.add('invalid');
            emailEl.focus();
            setStatus(MESSAGES.invalidEmail[lang], 'error');
            return;
        }
        if (phoneEl.value.replace(/\D/g, '').length < 7) {
            phoneEl.classList.add('invalid');
            phoneEl.focus();
            setStatus(MESSAGES.invalidPhone[lang], 'error');
            return;
        }

        if ((fileInput.files[0] && fileInput.files[0].size > MAX_FILE_SIZE) ||
            (motivationInput.files[0] && motivationInput.files[0].size > MAX_FILE_SIZE)) {
            setStatus(MESSAGES.tooLarge[lang], 'error');
            return;
        }

        submitBtn.disabled = true;
        setStatus(MESSAGES.sending[isAz() ? 'az' : 'en'], null);

        try {
            const formData = new FormData(formEl);
            // Boş seçilmiş motivasiya məktubu sahəsi boş fayl kimi göndərilməsin
            if (!motivationInput.files[0]) formData.delete('motivation_letter');
            const response = await fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                headers: { 'Accept': 'application/json' },
                body: formData
            });
            const result = await response.json();

            if (result.success) {
                setStatus(MESSAGES[isApplyMode ? 'successApply' : 'success'][isAz() ? 'az' : 'en'], 'success');
                formEl.reset();
            } else {
                setStatus(MESSAGES.error[isAz() ? 'az' : 'en'], 'error');
            }
        } catch (err) {
            setStatus(MESSAGES.error[isAz() ? 'az' : 'en'], 'error');
        } finally {
            submitBtn.disabled = false;
        }
    });
});
