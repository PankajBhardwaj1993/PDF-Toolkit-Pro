const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const sitemapCode = `
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(\`User-agent: *
Allow: /
Sitemap: https://pdftoolkitpro.online/sitemap.xml\`);
});

app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml');
  const urls = [
    '/', '/tools', '/dashboard', '/pricing', '/donation', '/blog', '/contact', '/docs', '/about', '/privacy', '/terms', '/disclaimer', '/converter'
  ];
  
  // Actually we should dynamically generate tool routes too.
  // We can add them later or just output basic ones.
  // For now, let's do a basic one.
  const xml = \`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  \${urls.map(url => \`<url><loc>https://pdftoolkitpro.online\${url}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>\`).join('\\n  ')}
</urlset>\`;
  res.send(xml);
});
`;

code = code.replace(
  "  // ==========================================\n  // 3. VITE DEV SERVER OR STATIC FILE SERVING",
  sitemapCode + "\n  // ==========================================\n  // 3. VITE DEV SERVER OR STATIC FILE SERVING"
);

fs.writeFileSync('server.ts', code);
