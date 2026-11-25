import test from 'node:test';
import assert from 'node:assert/strict';
import { pages, read, exists, stripped, attr, tags, root, runScript } from './helpers.mjs';
import path from 'node:path';

const PUBLIC_PAGES = pages.filter(p => p !== '404.html');
// Vakansiyalar səhifəsində <h1> qəsdən yoxdur
const NO_H1 = new Set(['vacancies.html']);
const KNOWN_HEADING_SKIPS = new Set();

for (const page of pages) {
    const html = read(page);
    const body = stripped(html);

    test(`${page}: document basics (doctype, language, charset, viewport, title)`, () => {
        assert.match(html, /^<!DOCTYPE html>/i);
        assert.match(html, /<html lang="az"/);
        assert.match(html, /<meta charset="UTF-8"/i);
        assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1/);
        const title = body.match(/<title>([^<]*)<\/title>/);
        assert.ok(title && title[1].trim().length > 3, 'boş <title>');
        assert.ok(title[1].length <= 90, `<title> çox uzundur (${title[1].length})`);
    });

    test(`${page}: exactly one h1 (vacancies page intentionally has none)`, () => {
        const h1 = (body.match(/<h1\b/g) || []).length;
        assert.equal(h1, NO_H1.has(page) ? 0 : 1, `<h1> sayı: ${h1}`);
    });

    // Başlıq səviyyəsi atlanır (məs. h1 → h3). Bu səhifələrdə kart başlıqları birbaşa h3-dür; düzəliş CSS seçicilərini də
    // dəyişəcəyi üçün "todo" kimi işarələnib: nəticədə görünür, amma testləri sındırmır.
    test(`${page}: heading levels do not skip`, { todo: KNOWN_HEADING_SKIPS.has(page) ? 'h-səviyyələri atlanır' : false }, () => {
        const levels = [...body.matchAll(/<h([1-6])\b/g)].map(m => Number(m[1]));
        for (let i = 1; i < levels.length; i++) {
            assert.ok(levels[i] <= levels[i - 1] + 1, `başlıq səviyyəsi atlanıb: h${levels[i - 1]} → h${levels[i]}`);
        }
    });

    test(`${page}: images have alt text and valid sources`, () => {
        for (const img of tags(html, 'img')) {
            assert.notEqual(attr(img, 'alt'), null, `alt yoxdur: ${img.slice(0, 80)}`);
            const src = attr(img, 'src');
            if (src && !/^(https?:|data:)/.test(src)) assert.ok(exists(src.split('?')[0]), `şəkil tapılmadı: ${src}`);
        }
    });

    test(`${page}: ids are unique`, () => {
        const ids = [...body.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
        const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
        assert.deepEqual([...new Set(dup)], []);
    });

    test(`${page}: local links, scripts, styles and icons exist`, () => {
        const refs = [];
        for (const t of tags(html, 'a')) refs.push(attr(t, 'href'));
        for (const t of tags(html, 'link')) refs.push(attr(t, 'href'));
        for (const t of tags(html, 'script')) refs.push(attr(t, 'src'));
        for (const ref of refs.filter(Boolean)) {
            if (/^(https?:|mailto:|tel:|#|javascript:)/i.test(ref)) continue;
            assert.ok(exists(ref.split('#')[0].split('?')[0]), `istinad sınıb: ${ref}`);
        }
    });

    test(`${page}: external links opened in a new tab carry rel="noopener"`, () => {
        for (const a of tags(html, 'a').filter(t => /target="_blank"/.test(t))) {
            assert.match(attr(a, 'rel') || '', /noopener/, a.slice(0, 100));
        }
    });

    test(`${page}: every form control has a label`, () => {
        const labelled = new Set([...body.matchAll(/<label\b[^>]*\sfor="([^"]+)"/g)].map(m => m[1]));
        const wrapped = [...body.matchAll(/<label\b[^>]*>[\s\S]*?<\/label>/g)].map(m => m[0]);
        for (const c of [...tags(html, 'input'), ...tags(html, 'select'), ...tags(html, 'textarea')]) {
            const type = attr(c, 'type');
            if (['hidden', 'submit', 'button'].includes(type)) continue;
            if (/botcheck/.test(c)) continue; // honeypot gizlidir
            const id = attr(c, 'id');
            const ok = (id && labelled.has(id)) || attr(c, 'aria-label') || attr(c, 'aria-labelledby') || attr(c, 'placeholder') || wrapped.some(l => l.includes(c));
            assert.ok(ok, `etiketsiz sahə: ${c.slice(0, 90)}`);
        }
    });

    test(`${page}: theme script, shared scripts and styles are wired in the right order`, () => {
        assert.match(html, /localStorage\.getItem\('theme'\)|localStorage\.theme/, 'tema skripti (FOUC) yoxdur');
        const t = html.indexOf('js/translations.js');
        const m = html.indexOf('js/main.js');
        assert.ok(t > 0 && m > t, 'translations.js main.js-dən əvvəl yüklənməlidir');
        assert.match(html, /css\/global\.css/);
    });
}

for (const page of PUBLIC_PAGES) {
    test(`${page}: has a meta description and share image that exists`, () => {
        const html = read(page);
        const desc = tags(html, 'meta').find(t => /name="description"/.test(t));
        assert.ok(desc && attr(desc, 'content').length > 30, 'meta description yoxdur və ya çox qısadır');
        const og = tags(html, 'meta').find(t => /property="og:image"/.test(t));
        if (og) assert.ok(exists(path.basename(attr(og, 'content'))), 'og:image faylı yoxdur');
    });
}

test('404 page is excluded from search engines', () => {
    assert.match(read('404.html'), /<meta name="robots" content="noindex/);
});

test('all pages share the same navigation and footer links', () => {
    const navOf = p => tags(read(p), 'a').filter(t => /class="[^"]*"/.test(t) === false || true)
        .map(t => attr(t, 'href')).filter(h => /^[a-z-]+\.html$/.test(h || ''));
    const header = p => {
        const h = stripped(read(p)).match(/<nav\b[^>]*>[\s\S]*?<\/nav>/);
        return h ? [...h[0].matchAll(/href="([^"]+)"/g)].map(m => m[1]).join(',') : null;
    };
    const first = header('index.html');
    assert.ok(first, 'index.html-də <nav> yoxdur');
    for (const p of pages) assert.equal(header(p), first, `${p}: menyu fərqlidir`);
    void navOf;
});

test('every page has the footer with the brand tagline and social links', () => {
    for (const p of pages) {
        const body = stripped(read(p));
        assert.match(body, /class="footer-tagline-brand"/, p);
        assert.equal((body.match(/class="social-icon"/g) || []).length, 5, `${p}: 5 sosial ikon olmalıdır`);
    }
});

test('anchor links between pages point at ids that exist', () => {
    for (const p of pages) {
        for (const a of tags(read(p), 'a')) {
            const href = attr(a, 'href') || '';
            const m = href.match(/^([a-z-]+\.html)#(.+)$/);
            if (!m) continue;
            assert.match(stripped(read(m[1])), new RegExp(`\\sid="${m[2]}"`), `${p} → ${href}`);
        }
    }
});

test('sitemaps list only existing pages and robots.txt points at the sitemap index', () => {
    const index = read('sitemap.xml');
    assert.match(index, /sitemap-pages\.xml/);
    assert.match(index, /sitemap-vacancies\.xml/);
    for (const loc of [...read('sitemap-pages.xml').matchAll(/<loc>https:\/\/talentcore\.az\/?([^<]*)<\/loc>/g)].map(m => m[1])) {
        assert.ok(loc === '' || exists(loc), `sitemap-də olmayan səhifə: ${loc}`);
    }
    assert.match(read('robots.txt'), /Sitemap: https:\/\/talentcore\.az\/sitemap\.xml/);
    assert.ok(!read('sitemap-pages.xml').includes('404.html'), '404 sitemap-də olmamalıdır');
});

test('.cpanel.yml copies every page and asset the site needs', () => {
    const yml = read('.cpanel.yml');
    for (const p of pages) assert.ok(yml.includes(p), `${p} deploy siyahısında yoxdur`);
    for (const f of ['robots.txt', 'sitemap.xml', 'sitemap-pages.xml', 'logo.png', 'logo_light.png', 'favicon.png', 'og-image.png', 'baku_light.jpg']) {
        assert.ok(yml.includes(f), `${f} deploy siyahısında yoxdur`);
        assert.ok(exists(f), `${f} faylı yoxdur`);
    }
    for (const dir of ['css', 'js', 'images', 'fonts']) assert.ok(yml.includes(dir) && exists(dir));
    assert.equal(path.basename(root), 'frontend');
});

test('the request modal reads the package name from the heading level the pricing cards actually use', () => {
    const modal = read('js/request-modal.js').match(/const title = card\.querySelector\('(h[1-6])'\)/);
    assert.ok(modal, 'fillPackage başlıq seçicisi tapılmadı');
    const cards = [...stripped(read('post-job.html')).matchAll(/<div class="pricing-card[^"]*"[^>]*>[\s\S]*?<\/div>/g)].map(m => m[0]);
    assert.ok(cards.length >= 2);
    for (const card of cards) assert.match(card, new RegExp(`<${modal[1]}\\b`), 'kartda JS-in axtardığı başlıq yoxdur');
});

test('the CV form refuses to send without the personal-data consent checkbox', () => {
    const consent = tags(read('cv.html'), 'input').find(t => attr(t, 'id') === 'cv-consent');
    assert.ok(consent, 'razılıq qutusu yoxdur');
    assert.equal(attr(consent, 'name'), 'consent', 'qutunun name-i olmalıdır, yoxsa FormData-ya düşmür və backend razılığı görmür');
    assert.match(consent, /\brequired\b/);

    const js = read('js/cv.js');
    const check = js.indexOf('!consentEl.checked');
    assert.ok(check > 0, 'cv.js razılıq qutusunu yoxlamır');
    assert.ok(check < js.indexOf('tcSubmit('), 'razılıq yoxlaması serverə sorğudan əvvəl olmalıdır');
    assert.ok(check < js.indexOf('api.web3forms.com'), 'razılıq yoxlaması Web3Forms yolundan əvvəl olmalıdır');
    assert.match(js, /errs\.consent/, 'backend razılığı rədd edəndə istifadəçiyə mesaj göstərilməlidir');
});

test('the CV form never silently turns a vacancy application into a vacancy-less CV', () => {
    const js = read('js/cv.js');
    // link adı yoxdursa vakansiyanın adı serverə ayrıca gedir
    assert.match(js, /formData\.set\('vacancy_title', vacancy\)/);
    // link adı yalnız uzunluğa görə yoxlanılır: qəribə simvollu (məs. alt xətt) link adı müraciəti "vakansiyasız" etməsin
    assert.doesNotMatch(js, /\^\[a-z0-9-\]/, 'cv.js link adını dar regex ilə rədd etməməlidir');
    assert.match(js, /slugParam\.length <= 255/);
    // fayl limiti aşılanda aydın mesaj
    assert.match(js, /result\.status === 413/);
});

test('the CV and contact pages have a "follow us" Telegram/WhatsApp card under the left info card, with safe external links', () => {
    for (const [page, aside, info] of [['cv.html', 'cv-aside', 'cv-info'], ['contact.html', 'contact-aside', 'contact-info']]) {
        const html = read(page);
        assert.match(html, new RegExp(`<div class="${aside}">[\\s\\S]*class="${info} glass-effect"[\\s\\S]*class="follow-card[^"]* glass-effect"`), `${page}: kart sol məlumat kartının altında olmalıdır`);
        const links = tags(html, 'a').filter(t => /\bfollow-link\b/.test(attr(t, 'class') || ''));
        assert.deepEqual(links.map(t => attr(t, 'data-social')), ['telegram', 'whatsapp'], page);
        for (const link of links) {
            assert.match(attr(link, 'href'), /^https:\/\//, `${page}: ehtiyat ünvan https olmalıdır`);
            assert.equal(attr(link, 'target'), '_blank', page);
            assert.match(attr(link, 'rel'), /noopener/, page);
        }
    }
    // ikonların ölçüsü HTML-də də yazılıb: CSS keşdə köhnə qalsa (deploy-dan sonrakı ilk dəqiqələr) ikon səhifəni tutan nəhəng dairəyə çevrilməsin
    for (const page of ['cv.html', 'contact.html']) {
        const card = read(page).match(/class="follow-card[^"]*glass-effect"[\s\S]*?(?=Sağ: )/);
        assert.ok(card, `${page}: kart tapılmadı`);
        const sizes = [...card[0].matchAll(/<svg\b([^>]*)>/g)].map(m => /\bwidth="\d+"/.test(m[1]) && /\bheight="\d+"/.test(m[1]));
        assert.equal(sizes.length, 4, `${page}: kartda 4 ikon olmalıdır (2 marka + 2 ox)`);
        assert.ok(sizes.every(Boolean), `${page}: kartdakı hər svg-nin width/height atributu olmalıdır`);
    }
    // admin parametrləri bu düymələrə də tətbiq olunur; ortaq stil global.css-dədir
    assert.match(read('js/site-settings.js'), /\[data-social\]/);
    // kartın bütün stili AYRI css/follow.css-dədir və iki səhifə onu yükləyir: yeni faylın köhnə keşi olmur,
    // paylaşılan global/cv/contact.css isə deploy-dan sonra bir neçə dəqiqə köhnə qala bilər (o zaman kart pozulurdu)
    const follow = read('css/follow.css');
    for (const rule of ['.follow-card', '.follow-link', '.follow-icon', '.cv-aside', '.contact-aside']) assert.ok(follow.includes(rule), `follow.css-də ${rule} yoxdur`);
    for (const page of ['cv.html', 'contact.html']) assert.match(read(page), /<link rel="stylesheet" href="css\/follow\.css">/, `${page} follow.css-i yükləmir`);
    for (const shared of ['css/global.css', 'css/cv.css', 'css/contact.css']) assert.doesNotMatch(read(shared), /follow-|-aside/, `${shared}-də kartın qaydası olmamalıdır (follow.css-də olmalıdır)`);
});

test('two-column form rows can shrink with their card instead of pushing the second field out of it', () => {
    const css = read('css/global.css');
    const row = css.match(/\.form-row\s*\{[^}]*\}/)[0];
    assert.match(row, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/, '1fr 1fr xananın minimum enini aşa bilmir və kartdan çıxır');
    assert.match(css.match(/\.form-group\s*\{[^}]*\}/)[0], /min-width:\s*0/);
});

// ---- "Bizi sosial mediada izlə!" bildirişi (ilk dəfə gələnlərə, sağ aşağıda) ----

test('the follow notification is wired through main.js only for first-time visitors and never on pages that already have the card', () => {
    const main = read('js/main.js');
    const toast = read('js/follow-toast.js');
    // eyni yaddaş açarı: main.js "görüb" üçün faylı yükləmir, follow-toast.js onu yazır
    const key = toast.match(/var KEY = '([^']+)'/)[1];
    assert.ok(main.includes(`getItem('${key}')`), 'main.js eyni yaddaş açarına baxmalıdır');
    assert.match(main, /new URL\('follow-toast\.js', TC_MAIN_SRC/, 'skript main.js-in yanından yüklənməlidir (/vakansiya/... daxil)');
    assert.match(main, /querySelector\('\.follow-card'\)/, 'kart olan səhifələrdə (cv, contact) fayl yüklənməməlidir');
    assert.match(toast, /querySelector\('\.follow-card'\)/);
    // yaddaş yoxdursa (məxfi rejim) göstərilmir: hər səhifədə çıxıb bezdirməsin
    assert.match(toast, /catch \(e\) \{ return; \}/);
    // klaviatura, ayarlar, üslub faylı
    assert.match(toast, /e\.key === 'Escape'/);
    assert.match(toast, /addEventListener\('tc-settings'/);
    assert.match(toast, /follow-toast\.css/);
    assert.match(read('js/site-settings.js'), /window\.TC_SOCIALS = socials/);
    // yalnız http(s) ünvanlar qəbul edilir
    assert.match(toast, /\^https\?:/);
});

test('the follow notification styles cover themes, phones, reduced motion and stay under the request modal', () => {
    const css = read('css/follow-toast.css');
    assert.match(css, /\.tc-toast\.is-visible/);
    assert.match(css, /body\.light-theme \.tc-toast\b/);
    assert.match(css, /@media \(max-width: 560px\)/);
    assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
    assert.match(css, /@media print/);
    const z = Number(css.match(/\.tc-toast \{[^}]*z-index:\s*(\d+)/)[1]);
    assert.ok(z > 1001 && z < 2000, `z-index (${z}) başlığın (1001) üstündə, sorğu pəncərəsinin (2000) altında olmalıdır`);
});

test('every text of the follow notification has RU and ZH translations', () => {
    const toast = read('js/follow-toast.js');
    const sandbox = runScript('js/translations.js', { document: { documentElement: { lang: 'az' } } });
    const dict = sandbox.window.TC_I18N;
    const keys = [...toast.matchAll(/data-az="([^"]+)"/g)].map(m => m[1]);
    keys.push(...[...toast.matchAll(/msg\('([^']+)'/g)].map(m => m[1]));
    assert.ok(keys.length >= 4, 'bildirişin mətnləri tapılmadı');
    for (const key of keys) {
        for (const lang of ['ru', 'zh']) assert.ok(dict[lang][key], `${lang} tərcüməsi yoxdur: ${key}`);
    }
});
