const assert = require('assert');
const http = require('http');
const fs = require('fs');
const server = require('./server');

const PORT = 4000;

// start fresh
try { fs.unlinkSync('./data.json'); } catch (e) {}
fs.writeFileSync('./data.json', JSON.stringify({users:[], posts:[]}, null, 2));

function request(method, path, data, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path,
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (token) options.headers['Authorization'] = 'Bearer ' + token;
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (d) => (body += d));
      res.on('end', () => {
        try {
          const json = JSON.parse(body || '{}');
          if (res.statusCode >= 400) return reject(json);
          resolve(json);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

server.listen(PORT, async () => {
  try {
    await request('POST', '/api/signup', { email: 'a@test.com', password: 'pw' });
    const login = await request('POST', '/api/login', { email: 'a@test.com', password: 'pw' });
    assert(login.token);
    await request('POST', '/api/posts', { title: 'Yoga Lesson', category: 'service', lat: 0, lng: 0 }, login.token);
    const list = await request('GET', '/api/posts');
    assert(list.posts.length === 1);
    console.log('All tests passed');
  } catch (err) {
    console.error('Test failed', err);
    process.exit(1);
  } finally {
    server.close();
  }
});
