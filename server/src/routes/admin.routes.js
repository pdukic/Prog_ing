import express from 'express';
import { query } from '../db.js';
import { requireAuth, requireAdmin } from '../auth.js';
import { userSelect } from '../constants/sql.js';
import { err, ok, toBool } from '../utils/http.js';

const router = express.Router();

router.get('/admin/korisnici', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const korisnici = await query(`SELECT ${userSelect} FROM KORISNIK ORDER BY EMAIL`);
    ok(res, { korisnici });
  } catch (e) { err(res, e); }
});

router.put('/admin/korisnici/:email', requireAuth, requireAdmin, async (req, res) => {
  try {
    await query('UPDATE KORISNIK SET ULOGA = :uloga WHERE EMAIL = :email', { email: req.params.email, uloga: req.body.uloga });
    ok(res, { message: 'Korisnik ažuriran.' });
  } catch (e) { err(res, e); }
});

router.delete('/admin/korisnici/:email', requireAuth, requireAdmin, async (req, res) => {
  try {
    const email = req.params.email;
    if (email === req.user.email) return err(res, new Error('Ne možeš obrisati samog sebe dok si prijavljen kao administrator.'), 400);

    // Ručno čišćenje zbog stranih ključeva bez ON DELETE CASCADE u zadanoj shemi.
    await query('DELETE FROM PORUKA WHERE `EMAIL_POŠILJATELJA` = :email OR EMAIL_PRIMATELJA = :email OR BROJ_OGLASA IN (SELECT BROJ_OGLASA FROM OGLAS WHERE EMAIL = :email)', { email });
    await query('DELETE FROM FAVORITI WHERE EMAIL = :email OR BROJ_OGLASA IN (SELECT BROJ_OGLASA FROM OGLAS WHERE EMAIL = :email)', { email });
    await query('DELETE FROM PRIJAVA WHERE EMAIL_PRIJAVITELJA = :email OR BROJ_OGLASA IN (SELECT BROJ_OGLASA FROM OGLAS WHERE EMAIL = :email)', { email });
    await query('DELETE FROM RECENZIJA WHERE BROJ_OGLASA IN (SELECT BROJ_OGLASA FROM PRODAJA WHERE EMAIL_KUPCA = :email OR `EMAIL_PRODAVAČA` = :email OR BROJ_OGLASA IN (SELECT BROJ_OGLASA FROM OGLAS WHERE EMAIL = :email))', { email });
    await query('DELETE FROM PRODAJA WHERE EMAIL_KUPCA = :email OR `EMAIL_PRODAVAČA` = :email OR BROJ_OGLASA IN (SELECT BROJ_OGLASA FROM OGLAS WHERE EMAIL = :email)', { email });
    await query('DELETE FROM OGLAS WHERE EMAIL = :email', { email });
    await query('DELETE FROM OBAVIJEST WHERE EMAIL = :email', { email });
    await query('DELETE FROM KORISNIK WHERE EMAIL = :email', { email });

    ok(res, { message: 'Korisnik obrisan.' });
  } catch (e) { err(res, e); }
});

router.get('/admin/prijave', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const prijave = await query(`
      SELECT
        p.BROJ_OGLASA AS broj_oglasa,
        p.EMAIL_PRIJAVITELJA AS email_prijavitelja,
        p.RAZLOG AS razlog,
        p.STATUS AS status,
        o.NAZIV AS naziv,
        o.EMAIL AS email_vlasnika
      FROM PRIJAVA p
      JOIN OGLAS o ON o.BROJ_OGLASA = p.BROJ_OGLASA
      ORDER BY p.STATUS, p.BROJ_OGLASA DESC
    `);

    ok(res, { prijave });
  } catch (e) { err(res, e); }
});

router.put('/admin/prijave', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { broj_oglasa, email_prijavitelja, status, ukloniOglas } = req.body;
    await query('UPDATE PRIJAVA SET STATUS = :status WHERE BROJ_OGLASA = :broj AND EMAIL_PRIJAVITELJA = :email', { status, broj: broj_oglasa, email: email_prijavitelja });
    if (toBool(ukloniOglas)) await query("UPDATE OGLAS SET STATUS = 'obrisan' WHERE BROJ_OGLASA = :broj", { broj: broj_oglasa });
    ok(res, { message: 'Prijava obrađena.' });
  } catch (e) { err(res, e); }
});

export default router;
