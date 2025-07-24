const http = require('http');
const AstralProxy = require('./astral_proxy/optimized_proxy');

// Create a simple test server
const server = http.createServer((req, res) => {
  // Create proxy instance
  const proxy = new AstralProxy('/proxy/', {
    blacklist: ['example.com'],
    localAddress: ['127.0.0.1']
  });

  // Handle the request with our optimized proxy
  proxy.handleHttpRequest(req, res, () => {
    res.writeHead(404);
    res.end('Not Found');
  });
});

// Add WebSocket support
server.on('upgrade', (req, socket, head) => {
  const proxy = new AstralProxy('/proxy/');
  proxy.handleWebSocket({ server: server, req, socket, head });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Test proxy server running on http://localhost:${PORT}`);
  console.log('Try accessing: http://localhost:3000/proxy/httpbin.org/get');
});