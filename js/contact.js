// Əlaqə səhifəsi: form Web3Forms (web3forms.com) vasitəsilə birbaşa
// info@talentcore.az ünvanına göndərilir — istifadəçinin email tətbiqi
// açılmır, hər şey səhifə daxilində baş verir. Yalnız contact.html-də işə düşür.
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
        missingKey: { az: 'Form hələ qoşulmayıb (access key əlavə olunmayıb).', en: 'The form is not connected yet (missing access key).' }
    };

    function setStatus(text, kind) {
        statusEl.textContent = text;
        statusEl.classList.remove('status-success', 'status-error');
        if (kind) statusEl.classList.add(`status-${kind}`);
    }

    formEl.addEventListener('submit', async (e) => {
        e.preventDefault();

        const accessKey = formEl.access_key.value.trim();
        if (!accessKey || accessKey === 'YOUR_WEB3FORMS_ACCESS_KEY') {
            setStatus(t(MESSAGES.missingKey), 'error');
            return;
        }

        submitBtn.disabled = true;
        setStatus(t(MESSAGES.sending), null);

        try {
            const response = await fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                headers: { 'Accept': 'application/json' },
                body: new FormData(formEl)
            });
            const result = await response.json();

            if (result.success) {
                setStatus(t(MESSAGES.success), 'success');
                formEl.reset();
            } else {
                setStatus(t(MESSAGES.error), 'error');
            }
        } catch (err) {
            setStatus(t(MESSAGES.error), 'error');
        } finally {
            submitBtn.disabled = false;
        }
    });
});
