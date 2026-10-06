const crypto = require('crypto');
const { sql, init, hash, sign, sendMail } = require('./_lib');
const h = t => crypto.createHash('sha256').update(t).digest('hex');
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    await init();
    const { a, u = '', t = '', p = '' } = req.body || {};
    if (a === 'request') {
      const login = String(u).trim().toLowerCase();
      const r = await sql`select id from users where login = ${login}`;
      if (r.length && login.includes('@')) {
        const tok = crypto.randomBytes(32).toString('hex');
        await sql`insert into resets (user_id, th, exp) values (${r[0].id}, ${h(tok)}, ${Date.now() + 36e5})`;
        await sendMail(login, 'Reset your password', `<p>Open this link to choose a new password. It works for 1 hour.</p><p><a href="https://${req.headers.host}/?reset=${tok}">Reset password</a></p>`);
      }
      return res.json({ ok: 1 });
    }
    if (String(p).length < 6) return res.status(400).json({ error: 'Use at least 6 characters' });
    const r = await sql`delete from resets where th = ${h(String(t))} and exp > ${Date.now()} returning user_id`;
    if (!r.length) return res.status(400).json({ error: 'This link has expired. Request a new one.' });
    await sql`update users set hash = ${hash(String(p))} where id = ${r[0].user_id}`;
    res.json({ token: sign(r[0].user_id) });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
};
