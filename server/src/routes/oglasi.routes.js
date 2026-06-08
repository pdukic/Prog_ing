import express from 'express';
import { query } from '../db.js';
import { authOptional, requireAuth } from '../auth.js';
import { oglasSelect, prodajaSelect } from '../constants/sql.js';
import { err, ok } from '../utils/http.js';
import { addNotification } from '../services/notificationService.js';

const router = express.Router();

// JAVNO: gosti smiju pregledavati, pretraživati i filtrirati oglase.
router.get('/oglasi', authOptional, async (req, res) => {
  try {
    const { q = '', kategorija = '', lokacija = '', min = '', max = '', sort = 'new' } = req.query;
    const where = ["o.STATUS IN ('aktivan', 'prodan')"];
    const p = { q: `%${q}%`, kategorija, lokacija: `%${lokacija}%`, min: Number(min) || 0, max: Number(max) || 999999999 };
    if (q) where.push('(o.NAZIV LIKE :q OR o.OPIS LIKE :q)');
    if (kategorija) where.push('o.KATEGORIJA = :kategorija');
    if (lokacija) where.push('o.LOKACIJA LIKE :lokacija');
    if (min) where.push('o.CIJENA >= :min');
    if (max) where.push('o.CIJENA <= :max');
    const order = sort === 'price_asc' ? 'o.CIJENA ASC' : sort === 'price_desc' ? 'o.CIJENA DESC' : 'o.BROJ_OGLASA DESC';

    const rows = await query(`
      SELECT ${oglasSelect},
        k.IME AS ime,
        k.PREZIME AS prezime,
        (
          SELECT ROUND(AVG(r.OCJENA), 1)
          FROM RECENZIJA r
          JOIN PRODAJA p ON p.BROJ_OGLASA = r.BROJ_OGLASA
          WHERE p.\`EMAIL_PRODAVAČA\` = o.EMAIL
        ) AS prosjecna_ocjena
      FROM OGLAS o
      JOIN KORISNIK k ON k.EMAIL = o.EMAIL
      WHERE ${where.join(' AND ')}
      ORDER BY ${order}
    `, p);

    ok(res, { oglasi: rows });
  } catch (e) { err(res, e); }
});

router.get('/oglasi/:id', authOptional, async (req, res) => {
  try {
    const rows = await query(`
      SELECT ${oglasSelect},
        k.IME AS ime,
        k.PREZIME AS prezime,
        k.LOKACIJA AS lokacija_korisnika,
        (
          SELECT ROUND(AVG(r.OCJENA), 1)
          FROM RECENZIJA r
          JOIN PRODAJA p ON p.BROJ_OGLASA = r.BROJ_OGLASA
          WHERE p.\`EMAIL_PRODAVAČA\` = o.EMAIL
        ) AS prosjecna_ocjena
      FROM OGLAS o
      JOIN KORISNIK k ON k.EMAIL = o.EMAIL
      WHERE o.BROJ_OGLASA = :id
    `, { id: req.params.id });
    if (!rows.length) return err(res, new Error('Oglas nije pronađen.'), 404);

    const recenzije = await query(`
      SELECT
        r.BROJ_OGLASA AS broj_oglasa,
        r.OCJENA AS ocjena,
        r.KOMENTAR AS komentar,
        p.DATUM_PRODAJE AS datum_recenzije,
        ko.IME AS ime_ocjenjivaca
      FROM RECENZIJA r
      JOIN PRODAJA p ON p.BROJ_OGLASA = r.BROJ_OGLASA
      JOIN KORISNIK ko ON ko.EMAIL = p.EMAIL_KUPCA
      WHERE p.\`EMAIL_PRODAVAČA\` = :email
      ORDER BY p.DATUM_PRODAJE DESC
    `, { email: rows[0].email });

    ok(res, { oglas: rows[0], recenzije });
  } catch (e) { err(res, e); }
});

// ZAŠTIĆENO: sve ostalo zahtijeva registraciju/prijavu.
router.post('/oglasi', requireAuth, async (req, res) => {
  try {
    const { naziv, opis, cijena, kategorija, lokacija, slika_url } = req.body;
    if (!naziv || !cijena) return err(res, new Error('Naziv i cijena su obavezni.'), 400);

    const idRows = await query('SELECT COALESCE(MAX(BROJ_OGLASA), 0) + 1 AS novi_id FROM OGLAS');
    const broj_oglasa = idRows[0].novi_id;

    await query(`
      INSERT INTO OGLAS (BROJ_OGLASA, EMAIL, NAZIV, OPIS, CIJENA, KATEGORIJA, STATUS, LOKACIJA, SLIKA_URL)
      VALUES (:broj_oglasa, :email, :naziv, :opis, :cijena, :kategorija, 'aktivan', :lokacija, :slika_url)
    `, {
      broj_oglasa,
      email: req.user.email,
      naziv,
      opis: opis || '',
      cijena,
      kategorija: kategorija || '',
      lokacija: lokacija || req.user.lokacija || '',
      slika_url: slika_url || ''
    });

    ok(res, { broj_oglasa });
  } catch (e) { err(res, e); }
});

router.put('/oglasi/:id', requireAuth, async (req, res) => {
  try {
    const rows = await query(`SELECT ${oglasSelect} FROM OGLAS o WHERE o.BROJ_OGLASA = :id`, { id: req.params.id });
    const o = rows[0];
    if (!o) return err(res, new Error('Oglas nije pronađen.'), 404);
    if (o.email !== req.user.email && req.user.uloga !== 'admin') return err(res, new Error('Možeš uređivati samo vlastite oglase.'), 403);

    const { naziv, opis, cijena, kategorija, lokacija, slika_url, status } = req.body;
    await query(`
      UPDATE OGLAS
      SET NAZIV = :naziv,
          OPIS = :opis,
          CIJENA = :cijena,
          KATEGORIJA = :kategorija,
          LOKACIJA = :lokacija,
          SLIKA_URL = :slika_url,
          STATUS = :status
      WHERE BROJ_OGLASA = :id
    `, {
      id: req.params.id,
      naziv,
      opis: opis || '',
      cijena,
      kategorija: kategorija || '',
      lokacija: lokacija || '',
      slika_url: slika_url || '',
      status: status || o.status
    });

    ok(res, { message: 'Oglas je ažuriran.' });
  } catch (e) { err(res, e); }
});

router.delete('/oglasi/:id', requireAuth, async (req, res) => {
  try {
    const rows = await query(`SELECT ${oglasSelect} FROM OGLAS o WHERE o.BROJ_OGLASA = :id`, { id: req.params.id });
    const o = rows[0];
    if (!o) return err(res, new Error('Oglas nije pronađen.'), 404);
    if (o.email !== req.user.email && req.user.uloga !== 'admin') return err(res, new Error('Možeš brisati samo vlastite oglase.'), 403);

    await query("UPDATE OGLAS SET STATUS = 'obrisan' WHERE BROJ_OGLASA = :id", { id: req.params.id });
    ok(res, { message: 'Oglas je obrisan/deaktiviran.' });
  } catch (e) { err(res, e); }
});

router.get('/moji-oglasi', requireAuth, async (req, res) => {
  try {
    const oglasi = await query(`
      SELECT ${oglasSelect}
      FROM OGLAS o
      WHERE o.EMAIL = :email
      ORDER BY o.BROJ_OGLASA DESC
    `, { email: req.user.email });

    ok(res, { oglasi });
  } catch (e) { err(res, e); }
});

router.post('/oglasi/:id/kupi', requireAuth, async (req, res) => {
  try {
    const rows = await query(`SELECT ${oglasSelect} FROM OGLAS o WHERE o.BROJ_OGLASA = :id`, { id: req.params.id });
    const o = rows[0];
    if (!o) return err(res, new Error('Oglas nije pronađen.'), 404);
    if (o.status !== 'aktivan') return err(res, new Error('Oglas nije dostupan za kupnju.'), 400);
    if (o.email === req.user.email) return err(res, new Error('Ne možeš kupiti vlastiti oglas.'), 400);

    await query(`
      INSERT INTO PRODAJA (BROJ_OGLASA, EMAIL_KUPCA, \`EMAIL_PRODAVAČA\`, DATUM_PRODAJE)
      VALUES (:id, :kupac, :prodavac, CURDATE())
    `, { id: req.params.id, kupac: req.user.email, prodavac: o.email });

    await query("UPDATE OGLAS SET STATUS = 'prodan' WHERE BROJ_OGLASA = :id", { id: req.params.id });
    await addNotification(o.email, `Vaš oglas "${o.naziv}" je prodan.`);
    ok(res, { message: 'Kupnja je uspješno evidentirana.' });
  } catch (e) { err(res, e); }
});

router.post('/oglasi/:id/prijava', requireAuth, async (req, res) => {
  try {
    const { razlog } = req.body;
    if (!razlog) return err(res, new Error('Razlog prijave je obavezan.'), 400);

    await query(`
      INSERT INTO PRIJAVA (BROJ_OGLASA, EMAIL_PRIJAVITELJA, RAZLOG, STATUS)
      VALUES (:id, :email, :razlog, 'na cekanju')
      ON DUPLICATE KEY UPDATE RAZLOG = :razlog, STATUS = 'na cekanju'
    `, { id: req.params.id, email: req.user.email, razlog });

    ok(res, { message: 'Prijava je poslana administratoru.' });
  } catch (e) { err(res, e); }
});

router.post('/oglasi/:id/recenzija', requireAuth, async (req, res) => {
  try {
    const { ocjena, komentar } = req.body;
    const rating = Number(ocjena);
    if (!rating || rating < 1 || rating > 5) return err(res, new Error('Ocjena mora biti između 1 i 5.'), 400);

    const prodaje = await query(`
      SELECT ${prodajaSelect}
      FROM PRODAJA p
      WHERE p.BROJ_OGLASA = :id AND p.EMAIL_KUPCA = :email
    `, { id: req.params.id, email: req.user.email });
    if (!prodaje.length) return err(res, new Error('Recenziju može ostaviti samo kupac nakon kupnje.'), 403);

    await query(`
      INSERT INTO RECENZIJA (BROJ_OGLASA, OCJENA, KOMENTAR)
      VALUES (:id, :ocjena, :komentar)
      ON DUPLICATE KEY UPDATE OCJENA = :ocjena, KOMENTAR = :komentar
    `, { id: req.params.id, ocjena: rating, komentar: komentar || '' });

    ok(res, { message: 'Recenzija je spremljena.' });
  } catch (e) { err(res, e); }
});

export default router;
