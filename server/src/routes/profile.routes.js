import express from 'express';
import { query } from '../db.js';
import { requireAuth, hashPassword } from '../auth.js';
import { userSelect } from '../constants/sql.js';
import { err, ok } from '../utils/http.js';

const router = express.Router();

router.get('/me', requireAuth, async (req, res) => ok(res, { user: req.user }));

router.put('/me', requireAuth, async (req, res) => {
  try {
    const { ime, prezime, lokacija, lozinka } = req.body;
    if (!ime || !prezime) return err(res, new Error('Ime i prezime su obavezni.'), 400);

    if (lozinka) {
      await query(`
        UPDATE KORISNIK
        SET IME = :ime, PREZIME = :prezime, LOKACIJA = :lokacija, LOZINKA = :lozinka
        WHERE EMAIL = :email
      `, { ime, prezime, lokacija: lokacija || '', lozinka: await hashPassword(lozinka), email: req.user.email });
    } else {
      await query(`
        UPDATE KORISNIK
        SET IME = :ime, PREZIME = :prezime, LOKACIJA = :lokacija
        WHERE EMAIL = :email
      `, { ime, prezime, lokacija: lokacija || '', email: req.user.email });
    }

    const rows = await query(`SELECT ${userSelect} FROM KORISNIK WHERE EMAIL = :email`, { email: req.user.email });
    ok(res, { user: rows[0] });
  } catch (e) { err(res, e); }
});

export default router;
