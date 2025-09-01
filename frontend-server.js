const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

// Create server
const server = http.createServer((req, res) => {
  // Get the requested URL
  const url = req.url;
  const method = req.method;
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Serve the main HTML file
  if (url === '/' || url === '/index.html') {
    serveFile(res, 'frontend-app/public/index.html', 'text/html');
    return;
  }
  
  // Serve static files
  const filePath = path.join(__dirname, 'frontend-app/public', url);
  
  // Check if file exists
  if (fs.existsSync(filePath)) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = getContentType(ext);
    serveFile(res, filePath, contentType);
  } else {
    // File not found, serve 404
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>404 - Page Not Found</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .error { color: #e74c3c; font-size: 24px; margin-bottom: 20px; }
            .message { color: #7f8c8d; }
          </style>
        </head>
        <body>
          <div class="error">404 - Page Not Found</div>
          <div class="message">The requested page could not be found.</div>
          <div class="message">
            <a href="/">Return to Dashboard</a>
          </div>
        </body>
      </html>
    `);
  }
});

// Function to serve files
function serveFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end('<h1>500 - Internal Server Error</h1>');
      return;
    }
    
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
}

// Function to get content type based on file extension
function getContentType(ext) {
  const types = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
  };
  
  return types[ext] || 'application/octet-stream';
}

// Start the server
server.listen(PORT, HOST, () => {
  console.log(`🌐 DaorsAgro Frontend Server started on http://${HOST}:${PORT}`);
  console.log(`🏠 Dashboard: http://${HOST}:${PORT}`);
  console.log(`🔗 Backend API: http://localhost:8080`);
  console.log(`✨ Frontend is running in full mode!`);
});

// Handle server errors
server.on('error', (error) => {
  console.error('Frontend server error:', error);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down frontend gracefully...');
  server.close(() => {
    console.log('Frontend server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down frontend gracefully...');
  server.close(() => {
    console.log('Frontend server closed');
    process.exit(0);
  });
});