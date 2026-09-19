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
        error: { az: 'Xəta baş verdi, zəhmət olmasa bir az sonra yenidən cəhd edin.', en: 'Something went wrong, please try again shortly.' },
        missingKey: { az: 'Form hələ qoşulmayıb (access key əlavə olunmayıb).', en: 'The form is not connected yet (missing access key).' },
        tooLarge: { az: 'Fayl 5MB-dan böyükdür, zəhmət olmasa daha kiçik fayl seçin.', en: 'File is larger than 5MB, please choose a smaller file.' }
    };

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

        const fileInput = document.getElementById('cv-file');
        if (fileInput.files[0] && fileInput.files[0].size > MAX_FILE_SIZE) {
            setStatus(MESSAGES.tooLarge[isAz() ? 'az' : 'en'], 'error');
            return;
        }

        submitBtn.disabled = true;
        setStatus(MESSAGES.sending[isAz() ? 'az' : 'en'], null);

        try {
            const response = await fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                headers: { 'Accept': 'application/json' },
                body: new FormData(formEl)
            });
            const result = await response.json();

            if (result.success) {
                setStatus(MESSAGES.success[isAz() ? 'az' : 'en'], 'success');
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
