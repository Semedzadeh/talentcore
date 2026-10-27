import test from 'node:test';
import assert from 'node:assert/strict';
import { runScript } from './helpers.mjs';

const plain = value => JSON.parse(JSON.stringify(value));
const tick = () => new Promise(resolve => setTimeout(resolve, 5));

function loadSite({ hostname = 'talentcore.az', origin = 'https://talentcore.az', siteKey, settings, settingsStatus = 200, beacon = true, beaconThrows = false, fetchImpl } = {}) {
    const fetchCalls = [];
    const beacons = [];
    const props = {};
    const appended = [];
    const inserted = [];
    const icons = ['Instagram', 'LinkedIn', 'Facebook'].map(label => ({
        label, href: '#', getAttribute(n) { return n === 'aria-label' ? label : null; }, setAttribute(n, v) { if (n === 'href') this.href = v; },
    }));
    const forms = Object.fromEntries(['contact-form', 'cv-form', 'request-form'].map(id => {
        const button = { parentNode: { insertBefore: (box, btn) => inserted.push({ id, box, btn }) } };
        return [id, { querySelector: () => button }];
    }));
    const dispatched = [];
    const fetch = fetchImpl || (async (url, opts) => {
        fetchCalls.push({ url, opts });
        if (String(url).endsWith('/site-settings.json')) {
            return { ok: settingsStatus < 400, status: settingsStatus, json: async () => settings };
        }
        return { ok: true, status: 200, json: async () => ({ ok: true }) };
    });
    const navigator = beacon ? { sendBeacon: (url, blob) => { if (beaconThrows) throw new Error('blocked'); beacons.push({ url, blob }); return true; } } : {};
    const document = {
        referrer: 'https://google.com/',
        getElementById: id => forms[id] || null,
        createElement: () => ({ style: {}, setAttribute() {}, className: '' }),
        head: { appendChild: el => appended.push(el) },
        documentElement: { style: { setProperty: (k, v) => { props[k] = v; } } },
        querySelectorAll: sel => (sel === '.social-icon' ? icons : []),
    };
    const window = { dispatchEvent: e => dispatched.push(e.type) };
    const sandbox = runScript('js/site-settings.js', {
        window, document, fetch, navigator, location: { hostname, origin, pathname: '/vakansiyalar', search: '?x=1' },
        CustomEvent: class { constructor(type) { this.type = type; } },
    }, src => src.replace(/var TURNSTILE_SITE_KEY = '[^']*';/, `var TURNSTILE_SITE_KEY = '${siteKey ?? ''}';`));
    return { w: sandbox.window, fetchCalls, beacons, props, icons, inserted, appended, dispatched };
}

test('without a known host (GitHub Pages, local file) the script stays inert: no requests, no tracking', async () => {
    for (const hostname of ['semedzadeh.github.io', '', 'example.com']) {
        const { w, fetchCalls, beacons } = loadSite({ hostname, origin: 'https://' + hostname });
        await tick();

        assert.equal(w.TC_API_BASE, '', hostname);
        assert.equal(fetchCalls.length, 0);
        assert.equal(beacons.length, 0);
    }
});

test('the backend address follows the host the page was opened on', () => {
    const cases = [
        ['talentcore.az', 'https://talentcore.az', 'https://talentcore.az'],
        ['www.talentcore.az', 'https://www.talentcore.az', 'https://www.talentcore.az'],
        ['127.0.0.1', 'http://127.0.0.1:8080', 'http://127.0.0.1:8000'],
        ['localhost', 'http://localhost:8080', 'http://127.0.0.1:8000'],
        ['talentcore.az.evil.example', 'https://talentcore.az.evil.example', ''],
        ['evil-talentcore.az', 'https://evil-talentcore.az', ''],
    ];
    for (const [hostname, origin, expected] of cases) {
        assert.equal(loadSite({ hostname, origin, settings: {} }).w.TC_API_BASE, expected, hostname);
    }
});

test('page views are sent as beacons with path, query and referrer', async () => {
    const { beacons } = loadSite({ settings: {} });
    await tick();

    assert.equal(beacons.length, 1);
    assert.equal(beacons[0].url, 'https://talentcore.az/t');
});

test('tcTrack falls back to fetch when sendBeacon is missing and never throws', async () => {
    const { w, fetchCalls } = loadSite({ beacon: false, settings: {} });
    await tick();

    w.tcTrack('vacancy_view', { vacancy: 'direktor' });
    const sent = fetchCalls.filter(c => c.url.endsWith('/t'));
    assert.equal(sent.length, 2);
    const body = JSON.parse(sent[1].opts.body);
    assert.equal(body.event, 'vacancy_view');
    assert.equal(body.vacancy, 'direktor');
    assert.equal(body.path, '/vakansiyalar?x=1');
    assert.equal(sent[1].opts.keepalive, true);

    assert.doesNotThrow(() => loadSite({ beaconThrows: true, settings: {} }).w.tcTrack('x'), 'sendBeacon xətası sayta təsir etməməlidir');
    assert.doesNotThrow(() => loadSite({ beacon: false, fetchImpl: () => Promise.reject(new Error('offline')) }).w.tcTrack('x'));
});

test('tcSubmit posts the form data and reports success', async () => {
    const { w, fetchCalls } = loadSite({ settings: {} });
    const form = { marker: 'form-data' };

    const result = await w.tcSubmit('/contact', form);

    const call = fetchCalls.find(c => c.url === 'https://talentcore.az/contact');
    assert.equal(call.opts.method, 'POST');
    assert.equal(call.opts.body, form);
    assert.equal(call.opts.headers.Accept, 'application/json');
    assert.deepEqual(plain(result), { ok: true, status: 200, data: { ok: true } });
});

test('tcSubmit reports validation errors, server errors and non-JSON replies', async () => {
    const respond = (status, body) => ({ ok: status < 400, status, json: body === undefined ? async () => { throw new Error('not json'); } : async () => body });
    const cases = [
        [respond(422, { ok: false, errors: { email: ['x'] } }), false, 422],
        [respond(200, { ok: false, message: 'robot' }), false, 200],
        [respond(503, { ok: false, message: 'alıcı yoxdur' }), false, 503],
        [respond(500, undefined), false, 500],
        [respond(200, undefined), true, 200],
    ];
    for (const [response, ok, status] of cases) {
        const { w } = loadSite({ fetchImpl: async url => (String(url).endsWith('/site-settings.json') ? { ok: false } : response) });
        const result = await w.tcSubmit('/apply', {});
        assert.equal(result.ok, ok, `status ${status}`);
        assert.equal(result.status, status);
    }
});

test('tcSubmit rejects on network failure so the form can show its error message', async () => {
    const { w } = loadSite({ fetchImpl: async url => { if (String(url).endsWith('/apply')) throw new TypeError('Failed to fetch'); return { ok: false }; } });

    await assert.rejects(() => w.tcSubmit('/apply', {}), /Failed to fetch/);
});

test('site settings apply social links, hero and banner images and publish ads and popular searches', async () => {
    const settings = {
        socials: { instagram: 'https://instagram.com/talentcore', linkedin: 'javascript:alert(1)', facebook: null },
        hero_image: "https://cdn.test/it's a photo.jpg", banner_image: 'https://cdn.test/banner.jpg',
        ads: [{ image: 'https://cdn.test/a.png', url: 'https://x.az' }, { image: 'javascript:alert(1)' }, { image: '' }],
        popular_searches: [{ keyword: 'CEO' }],
    };
    const { w, props, icons, dispatched } = loadSite({ settings });
    await tick();

    assert.equal(icons[0].href, 'https://instagram.com/talentcore');
    assert.equal(icons[1].href, '#', 'javascript: linki qəbul edilməməlidir');
    assert.equal(icons[2].href, '#');
    assert.equal(props['--hero-photo'], "url('https://cdn.test/it%27s a photo.jpg')");
    assert.equal(props['--banner-photo'], "url('https://cdn.test/banner.jpg')");
    assert.equal(plain(w.TC_ADS).length, 1);
    assert.deepEqual(plain(w.TC_POPULAR), [{ keyword: 'CEO' }]);
    assert.deepEqual(dispatched, ['tc-settings']);
});

test('unsafe image addresses never reach the CSS variables', async () => {
    const { props } = loadSite({ settings: { hero_image: "javascript:alert('x')", banner_image: 'data:text/html;base64,AAA' } });
    await tick();

    assert.deepEqual(props, {});
});

test('an unavailable settings endpoint leaves the site on its defaults', async () => {
    for (const settingsStatus of [404, 500]) {
        const { props, dispatched, w } = loadSite({ settings: {}, settingsStatus });
        await tick();
        assert.deepEqual(props, {});
        assert.deepEqual(dispatched, []);
        assert.equal(w.TC_ADS, undefined);
    }
    const failing = loadSite({ fetchImpl: async url => { if (String(url).endsWith('.json')) throw new Error('offline'); return { ok: true, json: async () => ({}) }; } });
    await tick();
    assert.deepEqual(failing.props, {});
});

test('the robot check widget is added before the submit button of each form when a site key is set', async () => {
    const { inserted, appended } = loadSite({ siteKey: '0xTESTKEY', settings: {} });
    await tick();

    assert.deepEqual(inserted.map(i => i.id), ['contact-form', 'cv-form', 'request-form']);
    assert.equal(appended.length, 1);
    assert.equal(appended[0].src, 'https://challenges.cloudflare.com/turnstile/v0/api.js');
});

test('no widget or script is added without a site key', async () => {
    const { inserted, appended } = loadSite({ siteKey: '', settings: {} });
    await tick();

    assert.equal(inserted.length, 0);
    assert.equal(appended.length, 0);
});
