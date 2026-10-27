import test from 'node:test';
import assert from 'node:assert/strict';
import { pages, read, stripped, attr, runScript, exists } from './helpers.mjs';

function loadI18n(lang = 'az') {
    const document = { documentElement: { lang } };
    const sandbox = runScript('js/translations.js', { document });
    return { w: sandbox.window, document };
}

const element = attrs => ({ getAttribute: name => (name in attrs ? attrs[name] : null) });

// Xidmət kartlarının başlıqları (ingilis adlar) çin dilində də eyni qalır — data-en-ə düşür
const ZH_FALLBACK_OK = new Set(['Executive Search', 'Professional Recruitment', 'Talent Assessment', 'Immigration Services']);

test('every translated element has data-az and data-en, and RU/ZH translations exist', () => {
    const { w } = loadI18n();
    const missing = [];
    let checked = 0;
    for (const page of pages) {
        for (const m of stripped(read(page)).matchAll(/<[^>]*class="[^"]*\blang\b[^"]*"[^>]*>/g)) {
            const tag = m[0];
            const az = attr(tag, 'data-az');
            if (az === null) continue;
            checked++; // data-az-placeholder və s. ayrıca yoxlanılır
            const key = az.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
            if (attr(tag, 'data-en') === null && !w.TC_I18N.en[key]) missing.push(`${page}: EN yoxdur — ${key.slice(0, 50)}`);
            for (const lang of ['ru', 'zh']) {
                if (!w.TC_I18N[lang][key] && !w.TC_I18N[lang][az] && attr(tag, 'data-' + lang) === null && !(lang === 'zh' && ZH_FALLBACK_OK.has(key))) {
                    missing.push(`${page}: ${lang} yoxdur — ${key.slice(0, 60)}`);
                }
            }
        }
    }
    assert.ok(checked > 300, `çox az element yoxlanıb: ${checked}`);
    assert.deepEqual(missing, []);
});

test('placeholders marked for translation have RU and ZH entries', () => {
    const { w } = loadI18n();
    const missing = [];
    for (const page of pages) {
        for (const m of stripped(read(page)).matchAll(/<[^>]*lang-placeholder[^>]*>/g)) {
            const az = attr(m[0], 'data-az-placeholder');
            for (const lang of ['ru', 'zh']) if (az && !w.TC_I18N[lang][az]) missing.push(`${page}: ${lang} — ${az}`);
        }
    }
    assert.deepEqual(missing, []);
});

test('dictionary has no empty values and no duplicate keys inside a language', () => {
    const src = read('js/translations.js');
    for (const lang of ['ru', 'zh']) {
        const start = src.indexOf(`\n  ${lang}: {`);
        const next = lang === 'ru' ? src.indexOf('\n  zh: {') : src.indexOf('\n};', start);
        const block = src.slice(start, next > 0 ? next : undefined);
        const keys = [...block.matchAll(/\n    "((?:[^"\\\n]|\\.)*)":\s*"((?:[^"\\\n]|\\.)*)"/g)];
        assert.ok(keys.length > 150, `${lang}: açarlar oxunmadı`);
        const seen = new Set();
        for (const [, key, value] of keys) {
            assert.ok(value.trim().length > 0, `${lang}: boş tərcümə — ${key.slice(0, 50)}`);
            assert.ok(!seen.has(key), `${lang}: təkrar açar — ${key.slice(0, 60)}`);
            seen.add(key);
        }
    }
});

test('translated HTML uses only safe inline tags with balanced pairs', () => {
    const { w } = loadI18n();
    for (const lang of ['en', 'ru', 'zh']) {
        for (const [key, value] of Object.entries(w.TC_I18N[lang])) {
            for (const tag of value.matchAll(/<\/?([a-z0-9]+)/gi)) {
                assert.ok(['a', 'br', 'strong', 'span'].includes(tag[1].toLowerCase()), `${lang}: icazəsiz tag <${tag[1]}> — ${key.slice(0, 50)}`);
            }
            for (const t of ['a', 'strong', 'span']) {
                assert.equal((value.match(new RegExp(`<${t}[\\s>]`, 'g')) || []).length, (value.match(new RegExp(`</${t}>`, 'g')) || []).length, `${lang}: ${t} bağlanmayıb — ${key.slice(0, 50)}`);
            }
            for (const href of value.matchAll(/href='([^']+)'/g)) {
                if (/^https?:/.test(href[1])) continue;
                assert.ok(exists(href[1].split('#')[0]), `${lang}: link sınıb ${href[1]}`);
            }
        }
    }
});

test('tcText picks the selected language and falls back step by step', () => {
    const { w } = loadI18n();
    const el = element({ 'data-az': 'Bakı', 'data-en': 'Baku' });
    assert.equal(w.tcText(el, 'az'), 'Bakı');
    assert.equal(w.tcText(el, 'en'), 'Baku');
    assert.equal(w.tcText(el, 'ru'), 'Баку');
    assert.equal(w.tcText(el, 'zh'), '巴库');

    const unknown = element({ 'data-az': 'Tamamilə yeni mətn', 'data-en': 'Brand new text' });
    assert.equal(w.tcText(unknown, 'ru'), 'Brand new text', 'RU yoxdursa EN göstərilir');
    assert.equal(w.tcText(unknown, 'zh'), 'Brand new text');

    const onlyAz = element({ 'data-az': 'Yalnız Azərbaycanca' });
    assert.equal(w.tcText(onlyAz, 'en'), 'Yalnız Azərbaycanca');
    assert.equal(w.tcText(onlyAz, 'ru'), 'Yalnız Azərbaycanca');
});

test('tcText honours a per-element data-ru / data-zh override before the dictionary', () => {
    const { w } = loadI18n();
    const el = element({ 'data-az': 'Xidmətin əsas üstünlükləri', 'data-en': 'Key Service Offerings', 'data-ru': 'Основные услуги' });

    assert.equal(w.tcText(el, 'ru'), 'Основные услуги');
    assert.notEqual(w.tcText(element({ 'data-az': 'Xidmətin əsas üstünlükləri', 'data-en': 'Key Points' }), 'ru'), 'Основные услуги');
    assert.equal(w.tcText(el, 'en'), 'Key Service Offerings');
});

test('tcText defaults to the page language and tcMsg / tcPlaceholder follow the same rules', () => {
    const { w, document } = loadI18n('ru');
    assert.equal(w.tcText(element({ 'data-az': 'Bakı', 'data-en': 'Baku' })), 'Баку');
    assert.equal(w.tcMsg('Bakı', 'Baku'), 'Баку');
    assert.equal(w.tcMsg('Tamamilə yeni mətn', 'Brand new'), 'Brand new');

    document.documentElement.lang = 'az';
    assert.equal(w.tcMsg('Bakı', 'Baku'), 'Bakı');
    document.documentElement.lang = 'en';
    assert.equal(w.tcMsg('Bakı', 'Baku'), 'Baku');
    assert.equal(w.tcMsg('Bakı'), 'Bakı', 'EN verilməyibsə AZ qalır');

    const input = element({ 'data-az-placeholder': 'Vakansiya və ya şirkət axtar...', 'data-en-placeholder': 'Search job title or company...' });
    assert.equal(w.tcPlaceholder(input, 'en'), 'Search job title or company...');
    assert.equal(w.tcPlaceholder(input, 'az'), 'Vakansiya və ya şirkət axtar...');
});
