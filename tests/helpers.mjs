import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const pages = fs.readdirSync(root).filter(f => f.endsWith('.html')).sort();

export const read = file => fs.readFileSync(path.join(root, file), 'utf8');

export const exists = file => fs.existsSync(path.join(root, file));

/** HTML-dən şərhləri, script və style bloklarının içini çıxarır (sətir sayını pozmur). */
export function stripped(html) {
    return html
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '<script></script>')
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '<style></style>');
}

export function attr(tag, name) {
    const m = tag.match(new RegExp('\\s' + name + '\\s*=\\s*"([^"]*)"', 'i'));
    return m ? m[1] : null;
}

export const tags = (html, name) => [...stripped(html).matchAll(new RegExp('<' + name + '\\b[^>]*>', 'gi'))].map(m => m[0]);

/** Brauzer olmadan JS faylını sandbox-da işlədir. */
export function runScript(file, globals = {}, transform = s => s) {
    const sandbox = {
        window: {}, console, setTimeout, clearTimeout, Promise, JSON, Math, Date, Object, Array, String, Number,
        encodeURIComponent, decodeURIComponent, URL, Blob, ...globals,
    };
    sandbox.window.window = sandbox.window;
    for (const key of Object.keys(globals)) sandbox.window[key] = globals[key];
    sandbox.self = sandbox.window;
    vm.createContext(sandbox);
    vm.runInContext(transform(read(file)), sandbox, { filename: file });
    return sandbox;
}
