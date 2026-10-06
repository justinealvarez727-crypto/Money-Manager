const { neon } = require('@neondatabase/serverless');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const sql = neon(process.env.DATABASE_URL);
const SECRET = process.env.AUTH_SECRET || '';
const mac = b => crypto.createHmac('sha256', SECRET).update(b).digest('base64url');
const hash = (p, salt = crypto.randomBytes(16).toString('hex')) => salt + ':' + crypto.scryptSync(p, salt, 64).toString('hex');
module.exports = {
  sql, hash,
  init: async () => { await sql`create table if not exists users (id serial primary key, login text unique not null, hash text not null, data jsonb)`; await sql`create table if not exists resets (user_id int, th text, exp bigint)`; },
  sendMail: (to, subject, html) => nodemailer.createTransport({ service: 'gmail', auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS } }).sendMail({ from: process.env.MAIL_USER, to, subject, html }),
  check: (p, h) => { const [s, k] = h.split(':'); return crypto.timingSafeEqual(Buffer.from(hash(p, s).split(':')[1], 'hex'), Buffer.from(k, 'hex')); },
  sign: id => { const b = Buffer.from(JSON.stringify({ id, exp: Date.now() + 30 * 864e5 })).toString('base64url'); return b + '.' + mac(b); },
  who: req => {
    try {
      const [b, s] = (req.headers.authorization || '').slice(7).split('.');
      if (!b || !s || !SECRET || mac(b) !== s) return null;
      const o = JSON.parse(Buffer.from(b, 'base64url').toString());
      return o.exp > Date.now() ? o.id : null;
    } catch (e) { return null; }
  }
};
