// Əlaqə səhifəsi: form öz backend-imizə (POST /contact) göndərilir; alıcılar admin paneldən
// ("Forma alıcıları → Əlaqə forması") təyin olunur. Backend ünvanı (js/site-settings.js) hələ boşdursa
// köhnə Web3Forms yolu işləyir. İstifadəçinin email tətbiqi açılmır, hər şey səhifə daxilində baş verir.
// Yalnız contact.html-də işə düşür.
document.addEventListener('DOMContentLoaded', () => {

    const formEl = document.getElementById('contact-form');
    const statusEl = document.getElementById('contact-form-status');
    const submitBtn = document.getElementById('contact-submit-btn');

    if (!formEl || !statusEl || !submitBtn) return;

    // Mesajlar 4 dildədir (az/en burada, ru/zh js/translations.js lüğətində — açar az mətnidir)
    const t = (m) => (window.tcMsg ? window.tcMsg(m.az, m.en) : (document.documentElement.lang === 'az' ? m.az : m.en));

    const MESSAGES = {
        sending: { az: 'Göndərilir...', en: 'Sending...' },
        success: { az: 'Mesajınız uğurla göndərildi. Tezliklə sizinlə əlaqə saxlayacağıq.', en: 'Your message has been sent. We will get back to you soon.' },
        error: { az: 'Xəta baş verdi, zəhmət olmasa bir az sonra yenidən cəhd edin.', en: 'Something went wrong, please try again shortly.' },
        invalid: { az: 'Zəhmət olmasa adınızı, düzgün e-poçt ünvanınızı və mesajınızı yazın.', en: 'Please enter your name, a valid email address and a message.' },
        missingKey: { az: 'Form hələ qoşulmayıb (access key əlavə olunmayıb).', en: 'The form is not connected yet (missing access key).' }
    };

    function setStatus(text, kind) {
        statusEl.textContent = text;
        statusEl.classList.remove('status-success', 'status-error');
        if (kind) statusEl.classList.add(`status-${kind}`);
    }

    formEl.addEventListener('submit', async (e) => {
        e.preventDefault();

        const field = name => formEl.elements[name] ? formEl.elements[name].value.trim() : '';
        if (!field('name') || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field('email')) || !field('message')) {
            setStatus(t(MESSAGES.invalid), 'error');
            return;
        }

        const useBackend = Boolean(window.TC_API_BASE);

        if (!useBackend) {
            const accessKey = formEl.access_key.value.trim();
            if (!accessKey || accessKey === 'YOUR_WEB3FORMS_ACCESS_KEY') {
                setStatus(t(MESSAGES.missingKey), 'error');
                return;
            }
        }

        submitBtn.disabled = true;
        setStatus(t(MESSAGES.sending), null);

        try {
            let success;
            if (useBackend) {
                const formData = new FormData(formEl);
                formData.set('lang', document.documentElement.lang || 'az');
                const result = await window.tcSubmit('/contact', formData);
                success = result.ok;
                if (!success && result.data && result.data.message) {
                    setStatus(result.data.message, 'error');
                }
            } else {
                const response = await fetch('https://api.web3forms.com/submit', {
                    method: 'POST',
                    headers: { 'Accept': 'application/json' },
                    body: new FormData(formEl)
                });
                success = (await response.json()).success;
            }

            if (success) {
                setStatus(t(MESSAGES.success), 'success');
                formEl.reset();
                if (window.tcTrack) window.tcTrack('form_submit', { form_type: 'contact' });
            } else if (!statusEl.classList.contains('status-error') || statusEl.textContent === t(MESSAGES.sending)) {
                setStatus(t(MESSAGES.error), 'error');
            }
        } catch (err) {
            setStatus(t(MESSAGES.error), 'error');
        } finally {
            submitBtn.disabled = false;
            if (window.tcResetTurnstile) window.tcResetTurnstile();
        }
    });
});
