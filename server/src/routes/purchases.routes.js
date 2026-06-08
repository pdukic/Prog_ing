import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../auth.js';
import { prodajaSelect } from '../constants/sql.js';
import { err, ok } from '../utils/http.js';

const router = express.Router();

router.get('/kupnje', requireAuth, async (req, res) => {
  try {
    const kupnje = await query(`
      SELECT ${prodajaSelect},
        o.NAZIV AS naziv,
        o.CIJENA AS cijena,
        o.KATEGORIJA AS kategorija
      FROM PRODAJA p
      JOIN OGLAS o ON o.BROJ_OGLASA = p.BROJ_OGLASA
      WHERE p.EMAIL_KUPCA = :email
      ORDER BY p.DATUM_PRODAJE DESC
    `, { email: req.user.email });

    ok(res, { kupnje });
  } catch (e) { err(res, e); }
});

export default router;
