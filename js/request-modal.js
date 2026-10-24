// Ortaq "Müraciət et" modalı: post-job.html (paket kartları) və ad-banners.html (reklam bannerləri)
// istifadə edir. Açan düymə: [data-request-open]. Forma Web3Forms ilə info@talentcore.az-a
// göndərilir (contact.js/cv.js ilə eyni access key — bax CLAUDE.md).
//  - Düymə .pricing-card daxilindədirsə (post-job): sol panelə YALNIZ həmin paketin adı və
//    xidmətləri kopyalanır, dəyişdirilə bilməz.
//  - Əks halda (ad-banners): sol panel HTML-də statikdir, JS ona toxunmur.
//  - Məcburi sahələr `required` atributu ilə işarələnir (form novalidate-dir, yoxlama burada edilir);
//    required olmayan sahələr könüllüdür.
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
    const baseSubject = modal.dataset.subject || 'Talentcore.az — Yeni sorğu';
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    let lastTrigger = null;
    const durationBox = document.getElementById('rq-duration');
    const durationOpts = document.getElementById('rq-duration-options');
    let baseName = '';
    let currentPackage = { name: packageInput ? packageInput.value : '', subject: subjectInput.value };

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
            subject: `${baseSubject} (${title.getAttribute('data-az')})`
        };
        if (packageInput) packageInput.value = currentPackage.name;
        subjectInput.value = currentPackage.subject;
        baseName = currentPackage.name;
        buildDuration(card);
    }

    // Kartda qiymət seçimləri (.price-opt) varsa (Premium) forma yanında "3 gün / 30 gün"
    // seçimi göstərilir; seçim paket adına əlavə olunur: "Premium paket – iş elanı (30 gün – 60 AZN)".
    // Radio-lar eyni name daşıyır (yalnız biri seçilir), amma forma ilə əlaqələndirilməyib — nəticə paket adındadır.
    function buildDuration(card) {
        if (!durationBox) return;
        const opts = [...card.querySelectorAll('.price-opt')];
        durationOpts.replaceChildren();
        durationBox.hidden = opts.length === 0;
        durationBox.classList.remove('invalid');
        opts.forEach((opt, i) => {
            const term = opt.querySelector('.price-term');
            const price = opt.querySelector('.price-val').textContent.trim();
            const label = document.createElement('label');
            label.className = 'rq-duration-opt';
            const input = document.createElement('input');
            input.type = 'radio';
            // Eyni name — yalnız biri seçilsin; form="..." isə mövcud olmayan formaya bağlayır ki, bu radio
            // sorğu formasına ayrıca sahə kimi getməsin (nəticə paket adındadır)
            input.name = 'rq-duration';
            input.setAttribute('form', 'rq-duration-detached');
            input.value = String(i);
            input.dataset.termAz = term.getAttribute('data-az');
            input.dataset.price = price;
            input.addEventListener('change', () => { durationBox.classList.remove('invalid'); applyDuration(); });
            const termSpan = document.createElement('span');
            termSpan.className = 'rq-duration-term lang';
            termSpan.setAttribute('data-az', term.getAttribute('data-az'));
            termSpan.setAttribute('data-en', term.getAttribute('data-en'));
            termSpan.textContent = window.tcText ? window.tcText(term) : term.textContent;
            const priceEl = document.createElement('strong');
            priceEl.textContent = price;
            label.append(input, termSpan, priceEl);
            durationOpts.appendChild(label);
        });
        // Tək seçim varsa (Standart paket: 30 gün) seçilmiş sayılır — istifadəçidən ayrıca seçim tələb olunmasın
        if (opts.length === 1) {
            durationOpts.querySelector('input[type="radio"]').checked = true;
            applyDuration();
        }
    }

    function selectedDuration() {
        return durationOpts ? durationOpts.querySelector('input[type="radio"]:checked') : null;
    }

    function applyDuration() {
        const sel = selectedDuration();
        const name = sel ? baseName + ' (' + sel.dataset.termAz + ' – ' + sel.dataset.price + ')' : baseName;
        currentPackage = { name, subject: baseSubject + ' (' + name + ')' };
        if (packageInput) packageInput.value = currentPackage.name;
        subjectInput.value = currentPackage.subject;
    }

    function openModal(trigger) {
        lastTrigger = trigger;
        const card = trigger.closest('.pricing-card');
        if (card) fillPackage(card);
        setStatus('', null);
        modal.hidden = false;
        document.body.classList.add('request-open');
        const first = formEl.querySelector('input[type="text"]');
        if (first) first.focus();
    }

    function closeModal() {
        modal.hidden = true;
        document.body.classList.remove('request-open');
        if (lastTrigger) lastTrigger.focus();
    }

    document.querySelectorAll('[data-request-open]').forEach(btn => {
        btn.addEventListener('click', () => openModal(btn));
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

        // Backend ünvanı (js/site-settings.js) varsa sorğu öz backend-imizə (POST /request) gedir;
        // boşdursa köhnə Web3Forms yolu (access key tələb olunur).
        const useBackend = Boolean(window.TC_API_BASE);
        if (!useBackend) {
            const accessKey = formEl.access_key.value.trim();
            if (!accessKey || accessKey === 'YOUR_WEB3FORMS_ACCESS_KEY') {
                setStatus(t('Form hələ qoşulmayıb (access key əlavə olunmayıb).', 'The form is not connected yet (missing access key).'), 'error');
                return;
            }
        }

        // Məcburi sahələr = `required` atributu olanlar (mətn/e-poçt/telefon + fayl qutuları).
        const requiredEls = [...formEl.querySelectorAll('[required]')];
        const markInvalid = (el, on) => (el.type === 'file' ? el.closest('.rq-upload') : el).classList.toggle('invalid', on);
        requiredEls.forEach(el => markInvalid(el, false));
        const missing = requiredEls.filter(el => (el.type === 'file' ? !el.files[0] : !el.value.trim()));
        missing.forEach(el => markInvalid(el, true));
        if (missing.length) {
            missing[0].focus();
            setStatus(t('Zəhmət olmasa bütün məcburi xanaları doldurun (qeyd istisna olmaqla).', 'Please fill in all required fields (except the note).'), 'error');
            return;
        }

        if (durationBox && !durationBox.hidden && !selectedDuration()) {
            durationBox.classList.add('invalid');
            durationBox.scrollIntoView({ block: 'center' });
            setStatus(t('Zəhmət olmasa elanın müddətini seçin (3 gün və ya 30 gün).', 'Please choose the listing duration (3 or 30 days).'), 'error');
            return;
        }

        const emailEl = document.getElementById('rq-email');
        if (emailEl && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value.trim())) {
            emailEl.classList.add('invalid');
            emailEl.focus();
            setStatus(t('Zəhmət olmasa düzgün email ünvanı daxil edin.', 'Please enter a valid email address.'), 'error');
            return;
        }
        const phoneEl = document.getElementById('rq-phone');
        if (phoneEl && phoneEl.value.replace(/\D/g, '').length < 7) {
            phoneEl.classList.add('invalid');
            phoneEl.focus();
            setStatus(t('Zəhmət olmasa düzgün telefon nömrəsi daxil edin.', 'Please enter a valid phone number.'), 'error');
            return;
        }
        const files = [...formEl.querySelectorAll('input[type="file"]')].map(i => i.files[0]).filter(Boolean);
        if (files.some(f => f.size > MAX_FILE_SIZE)) {
            setStatus(t('Fayl 5MB-dan böyükdür, zəhmət olmasa daha kiçik fayl seçin.', 'File is larger than 5MB, please choose a smaller file.'), 'error');
            return;
        }

        // Web3Forms "name" sahəsini göndərən adı kimi göstərir — ad + soyad birləşdirilir
        document.getElementById('request-fullname').value =
            `${document.getElementById('rq-first').value.trim()} ${document.getElementById('rq-last').value.trim()}`;

        // Seçilməyən (könüllü) fayl sahələri boş fayl hissəsi kimi göndərilməsin
        const formData = new FormData(formEl);
        formEl.querySelectorAll('input[type="file"]').forEach(input => {
            if (!input.files[0]) formData.delete(input.name);
        });

        submitBtn.disabled = true;
        setStatus(t('Göndərilir...', 'Sending...'), null);

        // Sorğunun növü (backend alıcıları buna görə seçir): ad-banners.html → banner, qalanı → iş elanı
        const requestType = /ad-banners/i.test(location.pathname) ? 'banner_request' : 'job_post_request';

        try {
            let success;
            let serverMessage = '';
            if (useBackend) {
                formData.set('type', requestType);
                // backend "qeyd" sahəsini note adı ilə gözləyir
                formData.set('note', formData.get('message') || '');
                formData.delete('message');
                const result = await window.tcSubmit('/request', formData);
                success = result.ok;
                serverMessage = (result.data && result.data.message) || '';
            } else {
                const response = await fetch('https://api.web3forms.com/submit', {
                    method: 'POST',
                    headers: { 'Accept': 'application/json' },
                    body: formData
                });
                success = (await response.json()).success;
            }

            if (success) {
                if (window.tcTrack) window.tcTrack('form_submit', { form_type: requestType });
                setStatus(t('Sorğunuz uğurla göndərildi. Tezliklə sizinlə əlaqə saxlayacağıq.', 'Your request has been sent. We will contact you shortly.'), 'success');
                formEl.reset();
                // reset() fayl seçimlərini də təmizləyir — qutulardakı fayl adlarını ilkin yazıya qaytar
                formEl.querySelectorAll('.rq-upload input[type="file"]').forEach(input => input.dispatchEvent(new Event('change')));
                // reset() gizli sahələri (paket/mövzu) də ilkin boş dəyərə qaytarır — seçilmiş paketi yenidən yaz
                applyDuration();
            } else {
                setStatus(serverMessage || t('Xəta baş verdi, zəhmət olmasa bir az sonra yenidən cəhd edin.', 'Something went wrong, please try again shortly.'), 'error');
            }
        } catch (err) {
            setStatus(t('Xəta baş verdi, zəhmət olmasa bir az sonra yenidən cəhd edin.', 'Something went wrong, please try again shortly.'), 'error');
        } finally {
            submitBtn.disabled = false;
            if (window.tcResetTurnstile) window.tcResetTurnstile();
        }
    });
});
