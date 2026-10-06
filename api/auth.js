const { sql, init, hash, check, sign } = require('./_lib');
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    await init();
    const { a, u = '', p = '' } = req.body || {};
    const login = String(u).trim().toLowerCase();
    if (login.length < 3 || String(p).length < 6) return res.status(400).json({ error: 'Use at least 3 characters for the name and 6 for the password' });
    if (a === 'register') {
      const r = await sql`insert into users (login, hash) values (${login}, ${hash(String(p))}) on conflict do nothing returning id`;
      if (!r.length) return res.status(409).json({ error: 'That name is already taken' });
      return res.json({ token: sign(r[0].id) });
    }
    const r = await sql`select id, hash from users where login = ${login}`;
    if (!r.length || !check(String(p), r[0].hash)) return res.status(401).json({ error: 'Wrong name or password' });
    res.json({ token: sign(r[0].id) });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
};
