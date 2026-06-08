import express from 'express';
import { query } from '../db.js';
import { err, ok } from '../utils/http.js';
import { hashPassword, signToken, verifyPassword } from '../auth.js';

const router = express.Router();

router.post('/auth/register', async (req, res) => {
  try {
    const { email, ime, prezime, lozinka, lokacija } = req.body;
    if (!email || !ime || !prezime || !lozinka) return err(res, new Error('Email, ime, prezime i lozinka su obavezni.'), 400);

    const exists = await query('SELECT EMAIL AS email FROM KORISNIK WHERE EMAIL = :email', { email });
    if (exists.length) return err(res, new Error('Korisnik s tim emailom već postoji.'), 409);

    await query(`
      INSERT INTO KORISNIK (EMAIL, IME, PREZIME, LOZINKA, LOKACIJA, ULOGA)
      VALUES (:email, :ime, :prezime, :lozinka, :lokacija, :uloga)
    `, {
      email,
      ime,
      prezime,
      lozinka: await hashPassword(lozinka),
      lokacija: lokacija || '',
      uloga: 'korisnik'
    });

    const user = { email, ime, prezime, lokacija: lokacija || '', uloga: 'korisnik' };
    ok(res, { token: signToken(user), user });
  } catch (e) { err(res, e); }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { email, lozinka } = req.body;
    const rows = await query(`
      SELECT
        EMAIL AS email,
        IME AS ime,
        PREZIME AS prezime,
        LOZINKA AS lozinka,
        LOKACIJA AS lokacija,
        ULOGA AS uloga
      FROM KORISNIK
      WHERE EMAIL = :email
    `, { email });

    const user = rows[0];
    if (!user || !(await verifyPassword(lozinka, user.lozinka))) return err(res, new Error('Pogrešan email ili lozinka.'), 401);

    const safe = { email: user.email, ime: user.ime, prezime: user.prezime, lokacija: user.lokacija, uloga: user.uloga };
    ok(res, { token: signToken(safe), user: safe });
  } catch (e) { err(res, e); }
});

export default router;
