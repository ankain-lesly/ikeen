const https = require('https');
https.get('https://mediadock.leslychuo.me/docs', { rejectUnauthorized: false }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    const urls = data.match(/https?:\/\/[^\s"'<>]+/g) || [];
    const rels = data.match(/["'][^"']+\.(?:json|yaml|js)["']/g) || [];
    console.log('URLs:', [...new Set(urls)].slice(0, 15));
    console.log('Rels:', [...new Set(rels)].slice(0, 15));
  });
});
