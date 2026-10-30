const https = require('https');
https.get('https://mediadock.leslychuo.me/docs', { rejectUnauthorized: false }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    // print text around /api/v1/upload
    const idx = data.indexOf('/api/v1/upload');
    if (idx !== -1) {
      console.log('--- AROUND /api/v1/upload ---');
      console.log(data.slice(Math.max(0, idx - 400), idx + 1800));
    }
  });
});
