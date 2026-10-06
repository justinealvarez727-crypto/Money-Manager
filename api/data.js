const { sql, init, who } = require('./_lib');
module.exports = async (req, res) => {
  const id = who(req);
  if (!id) return res.status(401).json({ error: 'Signed out' });
  try {
    await init();
    if (req.method === 'PUT') {
      await sql`update users set data = ${JSON.stringify(req.body)}::jsonb where id = ${id}`;
      return res.json({ ok: 1 });
    }
    const r = await sql`select data from users where id = ${id}`;
    res.json({ data: r[0] ? r[0].data : null });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
};
