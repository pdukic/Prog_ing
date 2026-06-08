import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../auth.js';
import { oglasSelect } from '../constants/sql.js';
import { err, ok } from '../utils/http.js';

const router = express.Router();

router.post('/oglasi/:id/favorit', requireAuth, async (req, res) => {
  try {
    await query(`
      INSERT IGNORE INTO FAVORITI (EMAIL, BROJ_OGLASA, DATUM_SPREMANJA)
      VALUES (:email, :id, CURDATE())
    `, { email: req.user.email, id: req.params.id });
    ok(res, { message: 'Dodano u favorite.' });
  } catch (e) { err(res, e); }
});

router.delete('/oglasi/:id/favorit', requireAuth, async (req, res) => {
  try {
    await query('DELETE FROM FAVORITI WHERE EMAIL = :email AND BROJ_OGLASA = :id', { email: req.user.email, id: req.params.id });
    ok(res, { message: 'Uklonjeno iz favorita.' });
  } catch (e) { err(res, e); }
});

router.get('/favoriti', requireAuth, async (req, res) => {
  try {
    const favoriti = await query(`
      SELECT ${oglasSelect}, f.DATUM_SPREMANJA AS datum_spremanja
      FROM FAVORITI f
      JOIN OGLAS o ON o.BROJ_OGLASA = f.BROJ_OGLASA
      WHERE f.EMAIL = :email
      ORDER BY f.DATUM_SPREMANJA DESC
    `, { email: req.user.email });

    ok(res, { favoriti });
  } catch (e) { err(res, e); }
});

export default router;
