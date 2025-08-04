const http = require('http');
const url = require('url');
const fs = require('fs');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const DATA_FILE = './data.json';

let db = { users: [], posts: [] };
try {
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  db = JSON.parse(raw);
} catch (e) {
  // file doesn't exist
}

const tokens = {}; // token -> userId

function saveDB() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (e) {
        resolve({});
      }
    });
  });
}

function send(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

function generateToken() {
  return crypto.randomBytes(16).toString('hex');
}

function hash(pw) {
  return crypto.createHash('sha256').update(pw).digest('hex');
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const method = req.method;

  if (parsed.pathname === '/api/signup' && method === 'POST') {
    const body = await parseBody(req);
    if (!body.email || !body.password)
      return send(res, 400, { error: 'email and password required' });
    if (db.users.find((u) => u.email === body.email))
      return send(res, 400, { error: 'email exists' });
    const user = {
      id: crypto.randomUUID(),
      email: body.email,
      password: hash(body.password),
    };
    db.users.push(user);
    saveDB();
    return send(res, 200, { status: 'ok' });
  }

  if (parsed.pathname === '/api/login' && method === 'POST') {
    const body = await parseBody(req);
    const user = db.users.find(
      (u) => u.email === body.email && u.password === hash(body.password)
    );
    if (!user) return send(res, 401, { error: 'invalid credentials' });
    const token = generateToken();
    tokens[token] = user.id;
    return send(res, 200, { token });
  }

  if (parsed.pathname === '/api/posts' && method === 'POST') {
    const auth = req.headers['authorization'];
    const token = auth && auth.split(' ')[1];
    const userId = tokens[token];
    if (!userId) return send(res, 401, { error: 'unauthorized' });
    const body = await parseBody(req);
    const { title, description, category, offer, lat, lng } = body;
    if (!title || !category)
      return send(res, 400, { error: 'missing fields' });
    const post = {
      id: crypto.randomUUID(),
      userId,
      title,
      description: description || '',
      category,
      offer: offer || '',
      lat: Number(lat) || 0,
      lng: Number(lng) || 0,
      createdAt: Date.now(),
    };
    db.posts.push(post);
    saveDB();
    return send(res, 200, { status: 'ok', post });
  }

  if (parsed.pathname === '/api/posts' && method === 'GET') {
    let results = db.posts;
    const { category, q, lat, lng, radius } = parsed.query;
    if (category) results = results.filter((p) => p.category === category);
    if (q) {
      const lower = q.toLowerCase();
      results = results.filter(
        (p) =>
          p.title.toLowerCase().includes(lower) ||
          p.description.toLowerCase().includes(lower)
      );
    }
    if (lat && lng && radius) {
      const R = 6371; // km
      const lat0 = parseFloat(lat);
      const lng0 = parseFloat(lng);
      const rad = parseFloat(radius);
      results = results.filter((p) => {
        const dLat = ((p.lat - lat0) * Math.PI) / 180;
        const dLng = ((p.lng - lng0) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos((lat0 * Math.PI) / 180) *
            Math.cos((p.lat * Math.PI) / 180) *
            Math.sin(dLng / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c;
        return d <= rad;
      });
    }
    return send(res, 200, { posts: results });
  }

  if (parsed.pathname === '/' && method === 'GET') {
    try {
      const html = fs.readFileSync('./index.html');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      return res.end(html);
    } catch (e) {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      return res.end('Hyperlocal Community Barter API');
    }
  }

  send(res, 404, { error: 'not found' });
});

if (require.main === module) {
  server.listen(PORT, () => console.log(`Server running on ${PORT}`));
}

module.exports = server;
