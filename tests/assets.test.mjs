import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { read, root, exists } from './helpers.mjs';

const jsFiles = fs.readdirSync(path.join(root, 'js')).filter(f => f.endsWith('.js'));
const cssFiles = fs.readdirSync(path.join(root, 'css')).filter(f => f.endsWith('.css'));

for (const file of jsFiles) {
    test(`js/${file} parses without syntax errors`, () => {
        assert.doesNotThrow(() => new vm.Script(read('js/' + file), { filename: file }));
    });

    test(`js/${file} leaves no debugging calls behind`, () => {
        const code = read('js/' + file).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
        assert.doesNotMatch(code, /\bconsole\.(log|debug)\(|\bdebugger\b/);
    });
}

for (const file of cssFiles) {
    test(`css/${file} has balanced braces and no empty rules`, () => {
        const css = read('css/' + file).replace(/\/\*[\s\S]*?\*\//g, '').replace(/url\("data:[^)]*\)/g, 'url()');
        assert.equal((css.match(/\{/g) || []).length, (css.match(/\}/g) || []).length);
        assert.doesNotMatch(css, /[^{}]*\{\s*\}/, 'boş qayda var');
    });

    test(`css/${file} only references files that exist`, () => {
        const css = read('css/' + file).replace(/\/\*[\s\S]*?\*\//g, '');
        for (const m of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
            const ref = m[1];
            if (/^(data:|https?:|#|var\()/.test(ref)) continue;
            const candidates = [path.join('css', ref), ref];
            assert.ok(candidates.some(c => exists(c)), `${file}: fayl yoxdur ${ref}`);
        }
    });
}

test('brand images are small enough for fast loading', () => {
    const limits = { 'baku_light.jpg': 400, 'logo.png': 100, 'logo_light.png': 100, 'favicon.png': 30, 'og-image.png': 200, 'images/hero-banner.jpg': 150 };
    for (const [file, kb] of Object.entries(limits)) {
        const size = fs.statSync(path.join(root, file)).size / 1024;
        assert.ok(size <= kb, `${file}: ${size.toFixed(0)} KB > ${kb} KB`);
    }
});

test('company logos used by the sample vacancies exist and are PNG files', () => {
    const logos = [...read('js/vacancies.js').matchAll(/logo: 'logos\/([^']+)'/g)].map(m => m[1]);
    assert.ok(logos.length > 5);
    for (const name of new Set(logos)) {
        const buf = fs.readFileSync(path.join(root, 'logos', name));
        assert.equal(buf.subarray(1, 4).toString(), 'PNG', `${name}: PNG deyil`);
    }
});

test('brand logos are transparent PNGs with the wordmark proportions', () => {
    for (const file of ['logo.png', 'logo_light.png']) {
        const buf = fs.readFileSync(path.join(root, file));
        const width = buf.readUInt32BE(16), height = buf.readUInt32BE(20), colorType = buf[25];
        assert.equal(colorType, 6, `${file}: alfa kanal (RGBA) yoxdur`);
        assert.ok(width / height > 5 && width / height < 8, `${file}: nisbət ${(width / height).toFixed(1)}`);
    }
    const fav = fs.readFileSync(path.join(root, 'favicon.png'));
    assert.equal(fav.readUInt32BE(16), fav.readUInt32BE(20), 'favicon kvadrat olmalıdır');
});

test('public repository files contain no secrets', () => {
    const pattern = /(secret|password|passwd|api[_-]?key|token)\s*[:=]\s*['"][A-Za-z0-9_\-]{12,}['"]/i;
    for (const file of [...jsFiles.map(f => 'js/' + f), '.cpanel.yml', 'index.html', 'contact.html', 'cv.html']) {
        assert.doesNotMatch(read(file), pattern, `${file}: gizli məlumat ola bilər`);
    }
});

test('the backend address is derived from the host, not hard-coded to a development value', () => {
    const code = read('js/site-settings.js');
    assert.doesNotMatch(code, /var API_BASE = '[^']+';/, 'API_BASE sabit ünvan olmamalıdır');
    assert.match(code, /location\.hostname/);
});

test('every project function called in a script is defined somewhere (catches accidentally deleted helpers)', () => {
    const globalsAndKeywords = new Set(['if', 'for', 'while', 'switch', 'catch', 'return', 'typeof', 'function', 'new', 'await', 'async', 'void', 'delete',
        'String', 'Number', 'Boolean', 'Array', 'Object', 'JSON', 'Math', 'Date', 'Promise', 'RegExp', 'Error', 'TypeError', 'Set', 'Map', 'URL', 'URLSearchParams',
        'Blob', 'CustomEvent', 'FormData', 'parseInt', 'parseFloat', 'isNaN', 'encodeURIComponent', 'decodeURIComponent', 'setTimeout', 'clearTimeout',
        'setInterval', 'clearInterval', 'Event', 'of', 'deyil', 'requestAnimationFrame', 'cancelAnimationFrame', 'fetch', 'alert', 'prompt', 'confirm', 'require']);
    const sources = Object.fromEntries(jsFiles.map(f => [f, read('js/' + f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/(['"`])(?:\\.|(?!\1)[^\\\n])*\1/g, '""')]));
    const defined = new Set();
    for (const src of Object.values(sources)) {
        for (const m of src.matchAll(/function\s+([A-Za-z_$][\w$]*)/g)) defined.add(m[1]);
        for (const m of src.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)) defined.add(m[1]);
        for (const m of src.matchAll(/(?:const|let|var)\s*\{([^}]*)\}/g)) m[1].split(',').forEach(n => defined.add(n.split(':').pop().trim()));
        for (const m of src.matchAll(/\(([^()]*)\)\s*=>|([A-Za-z_$][\w$]*)\s*=>/g)) (m[1] ?? m[2]).split(',').forEach(n => defined.add(n.trim().replace(/=.*$/, '').trim()));
        for (const m of src.matchAll(/function\s*[A-Za-z_$]*\s*\(([^()]*)\)/g)) m[1].split(',').forEach(n => defined.add(n.trim()));
        for (const m of src.matchAll(/catch\s*\(\s*([A-Za-z_$][\w$]*)/g)) defined.add(m[1]);
    }
    const missing = [];
    for (const [file, src] of Object.entries(sources)) {
        for (const m of src.matchAll(/(?<![\w$.])([A-Za-z_$][\w$]*)\s*\(/g)) {
            const name = m[1];
            if (!globalsAndKeywords.has(name) && !defined.has(name)) missing.push(`${file}: ${name}()`);
        }
    }
    assert.deepEqual([...new Set(missing)], []);
});

test('values placed inside href attributes by template strings are attribute-escaped', () => {
    const code = read('js/vacancies.js');
    const raw = [...code.matchAll(/href="\$\{(?!escapeAttr\()([^}]*)\}/g)].map(m => m[1]).filter(expr => !/^o\.id|^v\.id|^encodeURIComponent/.test(expr));
    assert.deepEqual(raw, [], 'ekranlaşdırılmamış href interpolyasiyası');
});
