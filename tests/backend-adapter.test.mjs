import test from 'node:test';
import assert from 'node:assert/strict';
import { runScript } from './helpers.mjs';

const DAY = 86400000;
// Yerli saat qurşağına görə tarix (adapter da yerli gündən hesablayır)
const isoDay = offset => {
    const d = new Date(Date.now() + offset * DAY);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
// vm kontekstində yaranan massiv/obyektlər başqa prototipə malikdir — müqayisə üçün JSON-a çevrilir
const plain = value => JSON.parse(JSON.stringify(value));

function loadAdapter({ responses = {}, lang = 'az', storage } = {}) {
    const calls = [];
    const fetch = async url => {
        calls.push(url);
        const key = Object.keys(responses).find(k => url.includes(k));
        if (!key) throw new Error('network down: ' + url);
        const r = responses[key];
        if (r instanceof Error) throw r;
        return { ok: r.status === undefined || r.status < 400, status: r.status ?? 200, json: async () => r.body };
    };
    const localStorage = storage ?? { getItem: () => lang };
    const document = { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] };
    const sandbox = runScript('js/vacancies-backend.js', { fetch, localStorage, document, window: { TC_API_BASE: 'https://api.test' } });
    return { api: sandbox.window.tcVacanciesBackend, calls };
}

const item = (o = {}) => ({
    id: 7, slug: 'direktor', title: 'Direktor', company: { name: 'Firma', logo: 'https://api.test/logo.png' }, location: 'Bakı',
    employment: 'Tam ştat', mode: 'Ofis', category: 'Maliyyə', filters: { job_category: 'finance', sector: 'banking-finance', level: 'director' },
    is_premium: true, posted_at: new Date().toISOString(), expires_at: isoDay(5), apply: { method: 'email', url: null }, ...o,
});

test('esc neutralises all HTML-significant characters and tolerates non-strings', () => {
    const { api } = loadAdapter();
    assert.equal(api.esc('<script>alert("x")</script> & \'q\''), '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;q&#39;');
    assert.equal(api.esc(null), '');
    assert.equal(api.esc(undefined), '');
    assert.equal(api.esc(0), '0');
    assert.equal(api.esc('Əli Şirvanlı — ğüçö'), 'Əli Şirvanlı — ğüçö');
});

test('listIdFor maps the built-in groups and builds ids for admin-created ones', () => {
    const { api } = loadAdapter();
    assert.equal(api.listIdFor('sector'), 'sector-filter-list');
    assert.equal(api.listIdFor('work_mode'), 'format-filter-list');
    assert.equal(api.listIdFor('custom_group'), 'custom_group-filter-list');
});

test('load maps vacancies, escapes admin text and keeps raw values for URLs', async () => {
    const evil = item({ title: '<img src=x onerror=alert(1)>', company: { name: 'A & B', logo: 'https://x/"><script>.png' }, location: '<b>Bakı</b>' });
    const { api } = loadAdapter({ responses: { '/api/vacancies': { body: { data: [evil] } }, '/filters.json': { status: 500 } } });

    const { vacancies, groups, failed } = await api.load();

    const v = vacancies[0];
    assert.equal(failed, undefined);
    assert.equal(groups, null, 'filters.json xətası siyahını dayandırmamalıdır');
    assert.ok(!v.title.includes('<'));
    assert.ok(!v.company.includes('<') && v.company.includes('&amp;'));
    assert.ok(!v.logo.includes('<'));
    assert.ok(!v.location.includes('<'));
    assert.equal(v.titleRaw, '<img src=x onerror=alert(1)>');
    assert.equal(v.companyRaw, 'A & B');
});

test('load computes premium flag, defaults, posted text and deadline', async () => {
    const data = [
        item({ id: 1, expires_at: isoDay(0), posted_at: new Date(Date.now() - 3 * DAY).toISOString() }),
        item({ id: 2, expires_at: isoDay(-2), is_premium: false, filters: {}, company: { name: 'Logosuz' }, apply: undefined, location: null }),
        item({ id: 3, expires_at: null }),
    ];
    const { api } = loadAdapter({ responses: { '/api/vacancies': { body: { data } }, '/filters.json': { body: { groups: [] } } } });

    const [today, past, noDeadline] = (await api.load()).vacancies;

    assert.equal(today.deadlineIn, 0);
    assert.equal(today.posted, '3 gün əvvəl');
    assert.equal(today.premium, true);
    assert.equal(past.deadlineIn, -2);
    assert.equal(past.premium, false);
    assert.equal(past.category, 'other', 'kateqoriyasız vakansiya "other" olur');
    assert.equal(past.logo, '');
    assert.equal(past.location, '');
    assert.deepEqual(plain(past.apply), { method: 'email', url: null });
    assert.equal(noDeadline.deadlineIn, undefined);
});

test('load never throws: an unreachable or failing API yields an empty, flagged result', async () => {
    for (const responses of [{}, { '/api/vacancies': new Error('timeout') }, { '/api/vacancies': { status: 500 } }, { '/api/vacancies': { status: 404 } }]) {
        const { api } = loadAdapter({ responses });
        const result = await api.load();
        assert.deepEqual(plain(result.vacancies), []);
        assert.equal(result.failed, true);
    }
});

test('load tolerates a response without a data field', async () => {
    const { api } = loadAdapter({ responses: { '/api/vacancies': { body: {} }, '/filters.json': { body: { groups: [] } } } });

    assert.deepEqual(plain((await api.load()).vacancies), []);
});

test('the selected language is sent to the API and invalid stored values fall back to az', async () => {
    for (const [stored, expected] of [['ru', 'ru'], ['zh', 'zh'], ['fr', 'az'], ['', 'az'], [null, 'az'], ['<script>', 'az']]) {
        const { api, calls } = loadAdapter({ lang: stored, responses: { '/api/vacancies': { body: { data: [] } }, '/filters.json': { body: { groups: [] } } } });
        await api.load();
        assert.ok(calls.some(c => c.endsWith('/api/vacancies?lang=' + expected)), `${stored} → ${expected}`);
    }
});

test('a throwing localStorage does not break loading', async () => {
    const storage = { getItem() { throw new Error('blocked'); } };
    const { api, calls } = loadAdapter({ storage, responses: { '/api/vacancies': { body: { data: [] } }, '/filters.json': { body: { groups: [] } } } });

    await api.load();

    assert.ok(calls[0].endsWith('lang=az'));
});

test('loadDetail escapes text, keeps line breaks, encodes the slug and marks the vacancy loaded', async () => {
    const detail = { description: 'Birinci sətir\n<script>x</script>', responsibilities: ['<b>a</b>', 'b'], requirements: [], offer: null, about_company: 'Şirkət\nhaqqında' };
    const { api, calls } = loadAdapter({ lang: 'en', responses: { '/api/vacancies/': { body: { data: detail } } } });
    const v = { slug: 'ə ş/ğ?x=1' };

    await api.loadDetail(v);

    assert.ok(calls[0].includes(encodeURIComponent('ə ş/ğ?x=1')), 'slug kodlanmalıdır');
    assert.ok(calls[0].endsWith('?lang=en'));
    assert.equal(v.description, 'Birinci sətir<br>&lt;script&gt;x&lt;/script&gt;');
    assert.deepEqual(plain(v.responsibilities), ['&lt;b&gt;a&lt;/b&gt;', 'b']);
    assert.deepEqual(plain(v.requirements), []);
    assert.deepEqual(plain(v.offer), []);
    assert.equal(v.companyAbout, 'Şirkət<br>haqqında');
    assert.equal(v._detailLoaded, true);
});

test('loadDetail rejects on HTTP errors so the caller can recover', async () => {
    const { api } = loadAdapter({ responses: { '/api/vacancies/': { status: 404 } } });

    await assert.rejects(() => api.loadDetail({ slug: 'yoxdur' }), /HTTP 404/);
});
