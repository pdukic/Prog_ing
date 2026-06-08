import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../auth.js';
import { err, ok } from '../utils/http.js';

const router = express.Router();

router.get('/obavijesti', requireAuth, async (req, res) => {
  try {
    const obavijesti = await query(`
      SELECT
        DATUM_VRIJEME AS datum_vrijeme,
        EMAIL AS email,
        \`SADRŽAJ\` AS sadrzaj,
        \`PROČITANO\` AS procitano
      FROM OBAVIJEST
      WHERE EMAIL = :email
      ORDER BY DATUM_VRIJEME DESC
    `, { email: req.user.email });

    ok(res, { obavijesti });
  } catch (e) { err(res, e); }
});

router.put('/obavijesti/procitano', requireAuth, async (req, res) => {
  try {
    await query('UPDATE OBAVIJEST SET `PROČITANO` = 1 WHERE EMAIL = :email', { email: req.user.email });
    ok(res, { message: 'Sve obavijesti su označene kao pročitane.' });
  } catch (e) { err(res, e); }
});

router.put('/obavijesti/:datum/procitano', requireAuth, async (req, res) => {
  try {
    await query('UPDATE OBAVIJEST SET `PROČITANO` = 1 WHERE DATUM_VRIJEME = :datum AND EMAIL = :email', { datum: req.params.datum, email: req.user.email });
    ok(res, { message: 'Označeno kao pročitano.' });
  } catch (e) { err(res, e); }
});

export default router;
