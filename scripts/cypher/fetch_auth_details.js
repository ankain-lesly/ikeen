const https = require('https');
https.get('https://mediadock.leslychuo.me/docs', { rejectUnauthorized: false }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    // print authentication section
    const idx = data.toLowerCase().indexOf('authentication') !== -1 
      ? data.toLowerCase().indexOf('authentication') 
      : data.toLowerCase().indexOf('api key');
    if (idx !== -1) {
      console.log('--- AUTH SECTION ---');
      console.log(data.slice(idx, idx + 1200));
    }
  });
});
