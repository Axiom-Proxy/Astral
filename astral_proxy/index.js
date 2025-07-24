const http = require('http');
const https = require('https');
const fs = require('fs');
const zlib = require('zlib');
const querystring = require('querystring');
const WebSocket = require('ws');
const { JSDOM } = require('./dom');

module.exports = class AstralProxy {
    // Constructor function.
    constructor(prefix = "/astral/", config = {}) {
        this.prefix = prefix;
        this.config = config;
        this.proxifyRequestURL = (url, type) => type ? atob(url.split('_').slice(1).splice(0, 1).join()) + url.split('_').slice(2).join('_') : `_${btoa(url.split('/').splice(0, 3).join('/'))}_/${url.split('/').splice(3).join('/')}`

        if (!prefix.startsWith('/')) this.prefix = '/' + prefix;
        if (!prefix.endsWith('/')) this.prefix = prefix + '/';   
    };
    // HTTP(S) proxy.
    http(req, res, next = () => res.end('')) {

        if (!req.url.startsWith(this.prefix)) return next();

        // Defining alternatives to `req.url` that don't contain web proxy prefix (req.path) and with the additional prop (req.pathname) not containing any hash or query params.
        req.path = req.url.replace(this.prefix.slice(1), '');
        req.pathname = req.path.split('#')[0].split('?')[0];
        
        if (req.pathname == '/client_hook' || req.pathname == '/client_hook/') return res.end(fs.readFileSync(__dirname + '/window.js', 'utf-8'));
    
        try {new URL(this.proxifyRequestURL(req.path, true))} catch {return res.end('URL Parse Error')};
    
        var proxyURL = {
            href: this.proxifyRequestURL(req.path, true),
            origin: this.proxifyRequestURL(req.path, true).split('/').splice(0, 3).join('/'),
            hostname: this.proxifyRequestURL(req.path, true).split('/').splice(0, 3).slice(2).join('/')
        },
            proxify = {},
            isBlocked = false,
            protocol = proxyURL.href.startsWith('https://') ? https : http, 
            proxyOptions = {
                headers: Object.assign({}, req.headers),
                method: req.method,
                rejectUnauthorized: false
            };
    
        if (proxyURL.href.startsWith('https://') || proxyURL.href.startsWith('http://')); else return res.end('URL Parse Error');
    
        delete proxyOptions.headers['host']; 
    
        // URL hostname blocklist.
        if (typeof this.config.blacklist == 'object' && this.config.blacklist.length != 0) this.config.blacklist.forEach(blacklisted => proxyURL.hostname == blacklisted ? isBlocked = true : isBlocked = false);
        if (isBlocked) return res.end('The URL you are trying to access is not permitted for use.')

        if (!req.path.startsWith(`/_${btoa(proxyURL.origin)}_/`)) return (res.writeHead(308, { location: this.prefix + `_${btoa(proxyURL.origin)}_/`}), res.end(''));
    
        // Proxifying "Origin" request header. Vital since some websites might have a failsafe for their API involving the "Origin" request header.
        if (proxyOptions.headers['origin']) {
            var proxified_header = this.proxifyRequestURL(`/${proxyOptions.headers['origin'].split('/').splice(3).join('/')}`.replace(this.prefix, ''), true);
            if (proxified_header.startsWith('https://') || proxified_header.startsWith('http://')) proxified_header = proxified_header.split('/').splice(0, 3).join('/');
            else proxified_header = proxyURL.origin;
            proxyOptions.headers['origin'] = proxified_header;
        }
    
        // Proxifying "Referer" request header. Vital since some websites might have a failsafe for their API involving the "Referer" request header.
        if (proxyOptions.headers['referer']) {
    
            var proxified_header = this.proxifyRequestURL('/' + proxyOptions.headers['referer'].split('/').splice(3).join('/').replace(this.prefix, ''), true);
            if (proxified_header.startsWith('https://') || proxified_header.startsWith('http://')) proxified_header = proxified_header;
            else proxified_header = proxyURL.href;
    
            proxyOptions.headers['referer'] = proxified_header;
    
        }
    
    
        if (proxyOptions.headers['cookie']) {        
            var new_cookie = [],
                cookie_array = proxyOptions.headers['cookie'].split('; ');
    
            cookie_array.forEach(cookie => {
    
                const cookie_name = cookie.split('=').splice(0, 1).join(),
                    cookie_value = cookie.split('=').splice(1).join();
    
                if (proxyURL.hostname.includes(cookie_name.split('@').splice(1).join())) new_cookie.push(cookie_name.split('@').splice(0, 1).join() + '=' + cookie_value);
    
            });
    
            proxyOptions.headers['cookie'] = new_cookie.join('; ');
        };

        if (typeof this.config.localAddress == 'object' &&  this.config.localAddress.length != 0) proxyOptions.localAddress = this.config.localAddress[Math.floor(Math.random() * this.config.localAddress.length)];
    
        var makeRequest = protocol.request(proxyURL.href, proxyOptions, proxyResponse => {
    
            var rawData = [],
                sendData = '';
        
            proxyResponse.on('data', data => rawData.push(data)).on('end', () => {
    
                const inject_config = {
                    prefix: this.prefix,
                    url: proxyURL.href
                }
















                








                // Pre-compiled regex patterns for performance
const PROTOCOL_EXCLUDED = /^(?:#|about:|data:|blob:|mailto:|javascript:|tel:|sms:|\{|\*)/i;
const RELATIVE_PROTOCOL = /^\/\//;
const HTTP_PROTOCOL = /^https?:\/\//i;
const SRCSET_PART = /(?:\S+|\s+)/g;
const SECURITY_ATTRS = ['nonce', 'integrity', 'csp', 'content-security-policy'];

// Enhanced security script (static)
const SECURITY_SCRIPT_CONTENT = `(function() {
    const rewriteUrl = u => {
        if (u.startsWith("/astral/")) {
            return u;
        } else if (u.startsWith("/")) {
            return location.origin + u;
        } else {
            return "/astral/" + btoa(u);
        }
    };
    
    // Override fetch API
    const nativeFetch = window.fetch;
    window.fetch = (u, o) => nativeFetch(rewriteUrl(u), o);
    
    // Override XHR
    const nativeXHR = window.XMLHttpRequest;
    window.XMLHttpRequest = class extends nativeXHR {
        open(m, u, ...args) { super.open(m, rewriteUrl(u), ...args); }
    };
    
    // Override window.open
    window.open = u => location.assign(rewriteUrl(u));
    
    // Remove new tab targets
    document.querySelectorAll('[target="_blank"]').forEach(e => e.removeAttribute('target'));
    
    // Disable WebSocket
    window.WebSocket = class { constructor() { throw new Error("WebSocket access disabled"); } };
    
    // Disable Workers
    window.Worker = class { constructor() { throw new Error("Worker access disabled"); } };
    window.SharedWorker = class { constructor() { throw new Error("SharedWorker access disabled"); } };
    
    // Disable ServiceWorker
    navigator.serviceWorker.register = () => Promise.reject(new Error("ServiceWorker disabled"));
    navigator.serviceWorker.getRegistrations = () => Promise.resolve([]);
    navigator.serviceWorker.getRegistration = () => Promise.resolve(null);
    
    // Override location methods
    const nativeAssign = window.location.assign;
    const nativeReplace = window.location.replace;
    window.location.assign = u => nativeAssign.call(window.location, rewriteUrl(u));
    window.location.replace = u => nativeReplace.call(window.location, rewriteUrl(u));
    Object.defineProperty(window.location, 'href', {
        set: function(u) { nativeAssign.call(window.location, rewriteUrl(u)); },
        get: () => Reflect.get(window.location, 'href')
    });
    
    // MutationObserver for dynamic elements
    const observer = new MutationObserver(mutations => {
        for (const m of mutations) {
            for (const node of m.addedNodes) {
                if (node.nodeType === 1) {
                    // Enhanced attribute list for dynamic rewriting
                    ['src', 'href', 'data-src', 'cite', 'longdesc', 'usemap', 'ping', 'action', 'formaction', 'data', 'poster'].forEach(attr => {
                        if (node.hasAttribute(attr)) {
                            node.setAttribute(attr, rewriteUrl(node.getAttribute(attr)));
                        }
                    });
                    
                    // Special handling for srcset
                    if (node.hasAttribute('srcset')) {
                        const value = node.getAttribute('srcset');
                        node.setAttribute('srcset', value.split(',').map(part => {
                            const trimmed = part.trim();
                            const spaceIndex = trimmed.search(/\s/);
                            return spaceIndex === -1 
                                ? rewriteUrl(trimmed) 
                                : rewriteUrl(trimmed.slice(0, spaceIndex)) + trimmed.slice(spaceIndex);
                        }).join(', '));
                    }
                }
            }
        }
    });
    observer.observe(document, { childList: true, subtree: true });
})();`;

// Initialize shared context
let proxyProtocol;
let baseOrigin;

const initContext = () => {
    if (!proxyProtocol) {
        proxyProtocol = proxyURL.href.startsWith('https://') ? 'https:' : 'http:';
    }
    if (!baseOrigin) {
        baseOrigin = inject_config.baseURL || proxyURL.href;
    }
};

// --- URL Proxifier ---
proxify.url = (url) => {
    if (!url || typeof url !== 'string') return url;
    const trimmed = url.trim();
    if (!trimmed || PROTOCOL_EXCLUDED.test(trimmed)) return url;
    if (trimmed.includes('/astral/') || trimmed.includes('_aHR0c')) return url;

    try {
        initContext();
        let absoluteUrl;

        if (RELATIVE_PROTOCOL.test(trimmed)) {
            absoluteUrl = new URL(proxyProtocol + trimmed);
        } else if (HTTP_PROTOCOL.test(trimmed)) {
            absoluteUrl = new URL(trimmed);
        } else {
            absoluteUrl = new URL(trimmed, baseOrigin);
        }

        if (absoluteUrl.protocol === 'http:' || absoluteUrl.protocol === 'https:') {
            const targetPath = absoluteUrl.pathname + absoluteUrl.search + absoluteUrl.hash;
            const encodedOrigin = btoa(absoluteUrl.origin);
            return `${this.prefix}_${encodedOrigin}_${targetPath}`;
        }

        return absoluteUrl.href;
    } catch (err) {
        console.warn(`URL proxification failed: ${url}`, err);
        return url;
    }
};

// --- JS Rewriter ---
proxify.js = (buffer) => {
    let jsCode;
    try {
        jsCode = buffer.toString();
    } catch {
        return buffer.toString();
    }

    const proxifyUrl = (match, quote, url) => {
        if (url.includes('astral') || /^(?:#|data:|blob:)/i.test(url)) return match;
        return match.replace(url, proxify.url(url));
    };

    try {
        // Service Worker
        jsCode = jsCode.replace(
            /navigator\.serviceWorker\.register\s*\(\s*([`'"])([^'"`]+?)\1/gi,
            (_, q, u) => `navigator.serviceWorker.register(${q}${proxify.url(u)}${q})`
        );
        // Dynamic Imports
        jsCode = jsCode.replace(
            /import\s*\(\s*([`'"])([^'"`]+?)\1\s*\)/gi,
            (_, q, u) => `import(${q}${proxify.url(u)}${q})`
        );
        // Fetch
        jsCode = jsCode.replace(/fetch\s*\(\s*([`'"])([^'"`]+?)\1/gi, proxifyUrl);
        // XHR .open
        jsCode = jsCode.replace(
            /\.open\s*\(\s*(['"])(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\1\s*,\s*(['"])([^'"\s]+?)\3/gi,
            (_, mq, m, uq, u) => `.open(${mq}${m}${mq}, ${uq}${proxify.url(u)}${uq})`
        );
        // WebSockets (disable)
        jsCode = jsCode.replace(/new\s+WebSocket\s*\(\s*([`'"])([^'"`]+?)\1/gi,
            'throw new Error("WebSockets are disabled for security")'
        );
        // Location assignments
        jsCode = jsCode.replace(
            /(window\.location|document\.location|location)\.(href|assign|replace)\s*\(([^)]+)\)/gi, 
            (match, loc, method, args) => {
                return `${loc}.${method}(${args.replace(/(['"])([^'"]+)\1/, (m, q, url) => `${q}${proxify.url(url)}${q}`)})`;
            }
        );
    } catch (err) {
        console.error("JS rewriting error", err);
    }

    return jsCode;
};

// --- CSS Rewriter ---
proxify.css = (buffer) => {
    let css;
    try {
        css = buffer.toString();
    } catch {
        return buffer.toString();
    }

    try {
        // url()
        css = css.replace(/url\s*\(\s*(['"]?)([^'")\s]+)\1?\s*\)/gi, (_, q, url) => {
            return /^(?:data:|#)/.test(url)
                ? `url(${q}${url}${q})`
                : `url("${proxify.url(url)}")`;
        });
        // @import "..."
        css = css.replace(/@import\s+(['"])([^'"]+)\1\s*;?/gi,
            (_, q, u) => `@import ${q}${proxify.url(u)}${q};`);
        // @import url(...)
        css = css.replace(/@import\s+url\s*\(\s*(['"]?)([^'")\s]+)\1?\s*\)\s*;?/gi,
            (_, q, u) => `@import url("${proxify.url(u)}");`);
    } catch (err) {
        console.error("CSS rewriting error", err);
        return buffer.toString();
    }

    return css;
};

// --- Attribute Rewriter ---
proxify.attribute = (value) => {
    if (!value || typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (!trimmed) return value;

    try {
        initContext();
        const resolved = trimmed.startsWith('/')
            ? new URL(trimmed, baseOrigin).href
            : trimmed;
        return proxify.url(resolved);
    } catch (err) {
        console.warn(`Attribute proxification failed: ${trimmed}`, err);
        return value;
    }
};

// --- HTML Rewriter ---
proxify.html = (body) => {
    const dom = new JSDOM(body, { contentType: 'text/html' });
    const doc = dom.window.document;

    // Process <base> tag
    const baseEl = doc.querySelector('base[href]');
    if (baseEl) {
        try {
            const href = baseEl.getAttribute('href').split(/[?#]/)[0];
            inject_config.baseURL = new URL(href, proxyURL.href).href;
            baseOrigin = null; // Reset to force re-init
        } catch (e) {
            console.warn('Base tag processing failed', e);
        }
    }

    // Clear cached context after base change
    baseOrigin = null;

    // Remove security attributes
    SECURITY_ATTRS.forEach(attr => {
        doc.querySelectorAll(`[${attr}]`).forEach(el => el.removeAttribute(attr));
    });

    // Process inline styles
    doc.querySelectorAll('[style]').forEach(el => {
        el.setAttribute('style', proxify.css(el.getAttribute('style')));
    });

    // Expanded URL attribute mapping
    const URL_ATTRS = {
        src: ['script', 'img', 'iframe', 'audio', 'video', 'source', 'track', 'embed'],
        href: ['a', 'link', 'area'],
        action: ['form'],
        formaction: ['button', 'input'],
        data: ['object'],
        poster: ['video'],
        srcset: ['img', 'source'],
        cite: ['blockquote', 'q', 'del', 'ins'],
        longdesc: ['img', 'iframe'],
        usemap: ['img', 'input', 'object'],
        ping: ['a', 'area']
    };

    Object.entries(URL_ATTRS).forEach(([attr, tags]) => {
        const selector = tags.map(t => `${t}[${attr}]`).join(', ');
        doc.querySelectorAll(selector).forEach(el => {
            const value = el.getAttribute(attr);
            if (!value) return;
            
            if (attr === 'srcset') {
                el.setAttribute(attr, value.split(',').map(part => {
                    const trimmed = part.trim();
                    const spaceIndex = trimmed.search(/\s/);
                    if (spaceIndex === -1) return proxify.attribute(trimmed);
                    const url = trimmed.slice(0, spaceIndex);
                    const desc = trimmed.slice(spaceIndex);
                    return `${proxify.attribute(url)}${desc}`;
                }).join(', '));
            } else if (attr === 'ping') {
                el.setAttribute(attr, value.split(/\s+/).map(proxify.attribute).join(' '));
            } else {
                el.setAttribute(attr, proxify.attribute(value));
            }
        });
    });

    // Rewrite script content
    doc.querySelectorAll('script:not([type]), script[type=""]')
        .forEach(s => s.textContent && (s.textContent = proxify.js(s.textContent)));

    // Handle module/script types
    doc.querySelectorAll('script[type="text/javascript"], script[type="application/javascript"]')
        .forEach(s => s.textContent && (s.textContent = proxify.js(s.textContent)));

    // Style tags
    doc.querySelectorAll('style').forEach(s => {
        s.textContent && (s.textContent = proxify.css(s.textContent));
    });

    // Meta refresh
    doc.querySelectorAll('meta[http-equiv="refresh"][content]').forEach(meta => {
        const content = meta.getAttribute('content');
        const match = /^\s*(\d+)\s*;\s*url\s*=\s*(.+)$/i.exec(content);
        if (match) {
            meta.setAttribute('content', `${match[1]}; url=${proxify.attribute(match[2])}`);
        }
    });

    // Import maps
    doc.querySelectorAll('script[type="importmap"]').forEach(script => {
        try {
            const map = JSON.parse(script.textContent);
            const rewrite = obj => Object.keys(obj).forEach(k => {
                if (typeof obj[k] === 'string') obj[k] = proxify.attribute(obj[k]);
            });
            if (map.imports) rewrite(map.imports);
            if (map.scopes) Object.values(map.scopes).forEach(rewrite);
            script.textContent = JSON.stringify(map);
        } catch (e) {
            console.warn('Import map processing failed', e);
        }
    });

    // Inject security sandbox script in HEAD
    const secScript = doc.createElement('script');
    secScript.textContent = SECURITY_SCRIPT_CONTENT;
    if (doc.head.firstChild) {
        doc.head.insertBefore(secScript, doc.head.firstChild);
    } else {
        doc.head.appendChild(secScript);
    }

    return dom.serialize();
};



























    
                // Handling response body Content-Encoding.
                if (rawData.length != 0) switch(proxyResponse.headers['content-encoding']) {
                    case 'gzip':
                        sendData = zlib.gunzipSync(Buffer.concat(rawData));
                    break;
                    case 'deflate':
                        sendData = zlib.inflateSync(Buffer.concat(rawData));
                    break;
                    case 'br':
                        sendData = zlib.brotliDecompressSync(Buffer.concat(rawData));
                    break;
                    default: sendData = Buffer.concat(rawData); break;
                };
    
                // Handling response headers.
                Object.entries(proxyResponse.headers).forEach(([header_name, header_value]) => {
                    if (header_name == 'set-cookie') {
                        const cookie_array = [];
                        header_value.forEach(cookie => cookie_array.push(cookie.replace(/Domain=(.*?);/gi, `Domain=` + req.headers['host'] + ';').replace(/(.*?)=(.*?);/, '$1' + '@' + proxyURL.hostname + `=` + '$2' + ';')));
                        proxyResponse.headers[header_name] = cookie_array;
            
                    };
            
                    if (header_name.startsWith('content-encoding') || header_name.startsWith('x-') || header_name.startsWith('cf-') || header_name.startsWith('strict-transport-security') || header_name.startsWith('content-security-policy') || header_name.startsWith('content-length')) delete proxyResponse.headers[header_name];
            
                    if (header_name == 'location') proxyResponse.headers[header_name] = proxify.url(header_value);
                });
    
                // Rewriting the response body based off of the Content-Type response header.
                if (proxyResponse.headers['content-type'] && proxyResponse.headers['content-type'].startsWith('text/html')) sendData = proxify.html(sendData.toString());
                else if (proxyResponse.headers['content-type'] && (proxyResponse.headers['content-type'].startsWith('application/javascript') || proxyResponse.headers['content-type'].startsWith('text/javascript'))) sendData = proxify.js(sendData.toString());
                else if (proxyResponse.headers['content-type'] && proxyResponse.headers['content-type'].startsWith('text/css')) sendData = proxify.css(sendData.toString());
    
                // Sending proxy response with processed headers and body.
                res.writeHead(proxyResponse.statusCode, proxyResponse.headers);
                res.end(sendData);
    
            });
    
        });
    
        makeRequest.on('error', err => res.end(err.toString()))
        
        if (!res.writableEnded) req.on('data', data => makeRequest.write(data)).on('end', () => makeRequest.end());
    
    };
    // Websocket Proxy
    ws(server) {
        new WebSocket.Server({server: server}).on('connection', (cli, req) => {

            var queryParams = querystring.parse(req.url.split('?').splice(1).join('?')), proxyURL, options = { 
                headers: {},
                followRedirects: true
            }, protocol = [];
        
            if (!queryParams.ws) return cli.close();
        
            proxyURL = atob(queryParams.ws);
        
            try { new URL(proxyURL) } catch{ return cli.close() };
        
            Object.entries(req.headers).forEach(([header_name, header_value]) => {
               if (header_name == 'sec-websocket-protocol') header_value.split(', ').forEach(proto => protocol.push(proto));
               if (header_name.startsWith('cf-') || header_name.startsWith('cdn-loop'));
               else if (!header_name.startsWith('sec-websocket'))  options.headers[header_name] = header_value;
            })
        
            if (queryParams.origin) (options.origin = atob(queryParams.origin), options.headers.origin = atob(queryParams.origin));        
        
            delete options.headers['host'];
            delete options.headers['cookie'];
        
            if (typeof this.config.localAddress == 'object' &&  this.config.localAddress.length != 0) options.localAddress = this.config.localAddress[Math.floor(Math.random() * this.config.localAddress.length)];

            const proxy = new WebSocket(proxyURL, protocol, options),
                before_open = [];
        
            if (proxy.readyState == 0) cli.on('message', data => before_open.push(data));
        
            cli.on('close', () => proxy.close());
            proxy.on('close', () => cli.close());
            cli.on('error', () => proxy.terminate())
            proxy.on('error', () => cli.terminate());
        
            proxy.on('open', () => {
        
                if (before_open.length != 0) before_open.forEach(data => proxy.send(data))
        
                cli.on('message', data => proxy.send(data));
                proxy.on('message', data => cli.send(data));
        
            
            });
        
        });
    };
};