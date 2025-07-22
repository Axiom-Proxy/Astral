const http = require('http'),
      https = require('https'),
      fs = require('fs'),
      zlib = require('zlib'),
      querystring = require('querystring'),
      WebSocket = require('ws')

module.exports = class {
  constructor(prefix = "/astral/", config = {}) {
    this.prefix = prefix;
    this.config = config;

    // Normalize and prepend slash
    if (!prefix.startsWith('/')) this.prefix = '/' + prefix;
    if (!prefix.endsWith('/')) this.prefix += '/';

    this.proxifyRequestURL = (url, type) => 
      type ? atob(url.split('_').slice(1).splice(0, 1).join()) + url.split('_').slice(2).join('_') : 
      `_${btoa(url.split('/').splice(0, 3).join('/'))}_/${url.split('/').splice(3).join('/')}`;
  }

  http(req, res, next = () => res.end('')) {
    if (!req.url.startsWith(this.prefix)) return next();

    req.path = req.url.replace(this.prefix.slice(1), '');
    req.pathname = req.path.split('#')[0].split('?')[0];

    // Check for client hooks
    if (req.pathname === '/client_hook' || req.pathname === '/client_hook/') {
      return res.end(fs.readFileSync(__dirname + '/window.js', 'utf-8'));
    }

    try { new URL(this.proxifyRequestURL(req.path, true)) } catch { return res.end('URL Parse Error') };

    const proxyURL = {
      href: this.proxifyRequestURL(req.path, true),
      origin: this.proxifyRequestURL(req.path, true).split('/').splice(0, 3).join('/'),
      hostname: this.proxifyRequestURL(req.path, true).split('/').splice(0, 3).slice(2).join('/')
    };

    const protocol = proxyURL.href.startsWith('https://') ? https : http;
    const proxyOptions = {
      headers: { ...req.headers },
      method: req.method,
      rejectUnauthorized: false
    };

    if (!proxyURL.href.startsWith('http://') && !proxyURL.href.startsWith('https://')) 
      return res.end('URL Parse Error');

    delete proxyOptions.headers['host'];

    // Check for blacklisted origins
    const isBlocked = this.config.blacklist?.some(blacklisted => 
      proxyURL.hostname === blacklisted
    );
    if (isBlocked) {
      return res.end('The URL you are trying to access is not permitted for use.');
    }

    // Handle path formatting
    if (!req.path.startsWith(`_${btoa(proxyURL.origin)}_/`)) {
      return res.writeHead(308, { location: this.prefix + `_${btoa(proxyURL.origin)}_/${req.pathname}` }), 
        res.end('');
    }

    // Proxy headers (optimized)
    const proxyHeaders = {
      origin: this.proxifyRequestURL(req.path, true).split('/').splice(0, 3).join('/')
    };

    // Handle referer headers (optimized)
    if (proxyOptions.headers['referer']) {
      proxyOptions.headers['referer'] = this.proxifyRequestURL('/' + proxyOptions.headers['referer'].split('/').splice(3).join('/'), true);
    }

    // Handle cookies (optimized)
    const proxyCookies = {
      originCookie: proxyHeaders.origin
    };

    if (proxyOptions.headers['origin']) {
      proxyOptions.headers['origin'] = this.proxifyRequestURL(`/${proxyOptions.headers['origin'].split('/').splice(3).join('/')}`, true);
    }

    // Handle cookies (optimized)
    if (proxyOptions.headers['cookie']) {
      const newCookieEntries = [];
      proxyOptions.headers['cookie'].split('; ').forEach(cookie => {
        const [name, value] = cookie.split('=');
        const proxifiedName = name.split('@').join('') || name;
        const proxifiedValue = value.replace(/Domain=(.*?);/gi, `Domain=${proxyURL.hostname};`).replace(/\s*=[^;]+;$/, '$1@$' + proxyURL.hostname + '=' + '$2;');
        
        newCookieEntries.push(`${proxifiedName}=${proxifiedValue}`);
      });
      
      proxyOptions.headers['cookie'] = newCookieEntries.join('; ');
    }

    if (this.config.localAddress?.length) 
      proxyOptions.localAddress = this.config.localAddress[Math.floor(Math.random() * this.config.localAddress.length)];

    const makeRequest = protocol.request(proxyURL.href, proxyOptions, proxyResponse => {
      const rawData = [], sendData = '';
      
      // Handle data streams
      proxyResponse.on('data', (chunk) => rawData.push(chunk)).on('end', () => {
        const injectConfig = { prefix: this.prefix, url: proxyURL.href };
        
        // Proxy URL formatting for headers
        const proxifyUrl = (url) => {
          return new URL(url).protocol === 'https:' ? 
            this.prefix + this.proxifyRequestURL(url.href, true) : 
            url.href;
        };
        
        sendData += zlib.gunzipSync(Buffer.concat(rawData));
      });

      proxyResponse.on('error', (err) => res.end(err.toString()));

      // Handle response headers
      Object.entries(proxyResponse.headers).forEach(([h, v]) => {
        if (h === 'set-cookie') {
          const cookieArray = [];
          
          for (const cookie of v) {
            const proxified = proxyOptions.headers['origin'] || proxyURL.href;
            
            // Normalize cookies
            cookieArray.push(cookie.replace(/Domain=(.*?);/gi, `Domain=${proxyURL.hostname};`).replace(/\s*=[^;]+;$/, '$1@$' + proxyURL.hostname + '=' + '$2;'));
          }
          
          proxyResponse.headers[h] = cookieArray;
        }

        if (h === 'location') {
          const location = new URL(proxyResponse.headers['location']).href;
          proxyResponse.headers['location'] = proxifyUrl(location);
        }

        // Normalize headers
        if (h.startsWith('content-encoding')) {
          proxyResponse.headers[h] = v.replace(/(gzip|deflate)/gi, '');
        }
      });

      // Handle content type
      if (proxyResponse.headers['content-type'] && 
          proxyResponse.headers['content-type'].startsWith('text/html')) {
        sendData += proxify.html(sendData.toString());
      } else if (
          proxyResponse.headers['content-type'] &&
          proxyResponse.headers['content-type'].startsWith('application/javascript') ||
          proxyResponse.headers['content-type'] &&
          proxyResponse.headers['content-type'].startsWith('text/javascript')
        ) {
        sendData += proxify.js(sendData.toString());
      } else if (
          proxyResponse.headers['content-type'] &&
          proxyResponse.headers['content-type'].startsWith('text/css')
        ) {
        sendData += proxify.css(sendData.toString());
      }

      res.writeHead(proxyResponse.statusCode, proxyResponse.headers);
      res.end(sendData);
    });

    makeRequest.on('error', (err) => res.end(err.toString()));
  }

  ws(server) {
    new WebSocket.Server({ server }).on('connection', (cli, req) => {
      const queryParams = querystring.parse(req.url.split('?').splice(1).join('?'));
      
      if (!queryParams.ws) return cli.close();
      
      // Handle proxy URL
      const proxyURL = atob(queryParams.ws);
      
      try { new URL(proxyURL) } catch { return cli.close() };
      
      const options = {
        headers: {},
        followRedirects: true
      };
      
      for (const [h, v] of Object.entries(req.headers)) {
        if (h === 'sec-websocket-protocol') 
          v.split(', ').forEach(proto => options.protocol.push(proto));
        else if (!h.startsWith('sec-websocket')) 
          options.headers[h] = v;
      }
      
      // Set proxy headers
      delete options.headers['host'];
      delete options.headers['cookie'];

      // Handle local address
      const proxy = new WebSocket(proxyURL, options.protocol, options);
      const beforeOpen = [];
      
      if (proxy.readyState === 0) cli.on('message', data => beforeOpen.push(data));
      
      cli.on('close', () => proxy.close());
      proxy.on('close', () => cli.close());
      cli.on('error', () => proxy.terminate());
      proxy.on('error', () => cli.terminate());
      
      proxy.on('open', () => {
        if (beforeOpen.length) beforeOpen.forEach(data => proxy.send(data));
        
        cli.on('message', data => proxy.send(data));
        proxy.on('message', data => cli.send(data));
      });
    });
  }
};
