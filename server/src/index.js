import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { query } from './db.js';
import { authOptional, requireAuth, requireAdmin, hashPassword, verifyPassword, signToken } from './auth.js';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

const ok = (res, data = {}) => res.json(data);
const err = (res, e, code = 500) => res.status(code).json({ message: e.message || 'Greška na serveru.' });
const toBool = v => v === true || v === 1 || v === '1';

app.get('/api/health', async (_req, res) => ok(res, { status: 'OK', db: 'mysql/mariadb' }));

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, ime, prezime, lozinka, lokacija } = req.body;
    if (!email || !ime || !prezime || !lozinka) return err(res, new Error('Email, ime, prezime i lozinka su obavezni.'), 400);
    const exists = await query('SELECT email FROM korisnik WHERE email=:email', { email });
    if (exists.length) return err(res, new Error('Korisnik s tim emailom već postoji.'), 409);
    await query('INSERT INTO korisnik (email, ime, prezime, lozinka, lokacija, uloga) VALUES (:email,:ime,:prezime,:lozinka,:lokacija,:uloga)', {
      email, ime, prezime, lozinka: await hashPassword(lozinka), lokacija: lokacija || '', uloga: 'korisnik'
    });
    const user = { email, ime, prezime, lokacija: lokacija || '', uloga: 'korisnik' };
    ok(res, { token: signToken(user), user });
  } catch (e) { err(res, e); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, lozinka } = req.body;
    const rows = await query('SELECT * FROM korisnik WHERE email=:email', { email });
    const user = rows[0];
    if (!user || !(await verifyPassword(lozinka, user.lozinka))) return err(res, new Error('Pogrešan email ili lozinka.'), 401);
    const safe = { email: user.email, ime: user.ime, prezime: user.prezime, lokacija: user.lokacija, uloga: user.uloga };
    ok(res, { token: signToken(safe), user: safe });
  } catch (e) { err(res, e); }
});

app.get('/api/me', requireAuth, async (req, res) => ok(res, { user: req.user }));
app.put('/api/me', requireAuth, async (req, res) => {
  try {
    const { ime, prezime, lokacija, lozinka } = req.body;
    if (lozinka) await query('UPDATE korisnik SET ime=:ime, prezime=:prezime, lokacija=:lokacija, lozinka=:lozinka WHERE email=:email', { ime, prezime, lokacija, lozinka: await hashPassword(lozinka), email: req.user.email });
    else await query('UPDATE korisnik SET ime=:ime, prezime=:prezime, lokacija=:lokacija WHERE email=:email', { ime, prezime, lokacija, email: req.user.email });
    const rows = await query('SELECT email, ime, prezime, lokacija, uloga FROM korisnik WHERE email=:email', { email: req.user.email });
    ok(res, { user: rows[0] });
  } catch (e) { err(res, e); }
});

// JAVNO: gosti smiju pregledavati, pretraživati i filtrirati oglase.
app.get('/api/oglasi', authOptional, async (req, res) => {
  try {
    const { q='', kategorija='', lokacija='', min='', max='', sort='new' } = req.query;
    const where = ['o.status IN (\'aktivan\',\'prodan\')'];
    const p = { q: `%${q}%`, kategorija, lokacija: `%${lokacija}%`, min: Number(min)||0, max: Number(max)||999999999 };
    if (q) where.push('(o.naziv LIKE :q OR o.opis LIKE :q)');
    if (kategorija) where.push('o.kategorija=:kategorija');
    if (lokacija) where.push('o.lokacija LIKE :lokacija');
    if (min) where.push('o.cijena >= :min');
    if (max) where.push('o.cijena <= :max');
    const order = sort === 'price_asc' ? 'o.cijena ASC' : sort === 'price_desc' ? 'o.cijena DESC' : 'o.broj_oglasa DESC';
    const rows = await query(`SELECT o.*, k.ime, k.prezime,
      (SELECT ROUND(AVG(r.ocjena),1) FROM recenzija r WHERE r.email_ocjenjenog=o.email) prosjecna_ocjena
      FROM oglas o JOIN korisnik k ON k.email=o.email WHERE ${where.join(' AND ')} ORDER BY ${order}`, p);
    ok(res, { oglasi: rows });
  } catch (e) { err(res, e); }
});

app.get('/api/oglasi/:id', authOptional, async (req, res) => {
  try {
    const rows = await query(`SELECT o.*, k.ime, k.prezime, k.lokacija lokacija_korisnika,
      (SELECT ROUND(AVG(r.ocjena),1) FROM recenzija r WHERE r.email_ocjenjenog=o.email) prosjecna_ocjena
      FROM oglas o JOIN korisnik k ON k.email=o.email WHERE o.broj_oglasa=:id`, { id: req.params.id });
    if (!rows.length) return err(res, new Error('Oglas nije pronađen.'), 404);
    const recenzije = await query('SELECT r.*, ko.ime ime_ocjenjivaca FROM recenzija r JOIN korisnik ko ON ko.email=r.email_ocjenjivaca WHERE r.email_ocjenjenog=:email ORDER BY r.datum_recenzije DESC', { email: rows[0].email });
    ok(res, { oglas: rows[0], recenzije });
  } catch (e) { err(res, e); }
});

// ZAŠTIĆENO: sve ostalo zahtijeva registraciju/prijavu.
app.post('/api/oglasi', requireAuth, async (req, res) => {
  try {
    const { naziv, opis, cijena, kategorija, lokacija, slika_url } = req.body;
    if (!naziv || !cijena) return err(res, new Error('Naziv i cijena su obavezni.'), 400);
    const result = await query('INSERT INTO oglas (email,naziv,opis,cijena,kategorija,status,lokacija,slika_url) VALUES (:email,:naziv,:opis,:cijena,:kategorija,\'aktivan\',:lokacija,:slika_url)', {
      email: req.user.email, naziv, opis: opis||'', cijena, kategorija: kategorija||'', lokacija: lokacija||req.user.lokacija||'', slika_url: slika_url||''
    });
    ok(res, { broj_oglasa: result.insertId });
  } catch (e) { err(res, e); }
});

app.put('/api/oglasi/:id', requireAuth, async (req, res) => {
  try {
    const rows = await query('SELECT * FROM oglas WHERE broj_oglasa=:id', { id: req.params.id });
    const o = rows[0];
    if (!o) return err(res, new Error('Oglas nije pronađen.'), 404);
    if (o.email !== req.user.email && req.user.uloga !== 'admin') return err(res, new Error('Možeš uređivati samo vlastite oglase.'), 403);
    const { naziv, opis, cijena, kategorija, lokacija, slika_url, status } = req.body;
    await query('UPDATE oglas SET naziv=:naziv, opis=:opis, cijena=:cijena, kategorija=:kategorija, lokacija=:lokacija, slika_url=:slika_url, status=:status WHERE broj_oglasa=:id', {
      id: req.params.id, naziv, opis, cijena, kategorija, lokacija, slika_url, status: status || o.status
    });
    ok(res, { message: 'Oglas je ažuriran.' });
  } catch (e) { err(res, e); }
});

app.delete('/api/oglasi/:id', requireAuth, async (req, res) => {
  try {
    const rows = await query('SELECT * FROM oglas WHERE broj_oglasa=:id', { id: req.params.id });
    const o = rows[0];
    if (!o) return err(res, new Error('Oglas nije pronađen.'), 404);
    if (o.email !== req.user.email && req.user.uloga !== 'admin') return err(res, new Error('Možeš brisati samo vlastite oglase.'), 403);
    await query('UPDATE oglas SET status=\'obrisan\' WHERE broj_oglasa=:id', { id: req.params.id });
    ok(res, { message: 'Oglas je obrisan/deaktiviran.' });
  } catch (e) { err(res, e); }
});

app.get('/api/moji-oglasi', requireAuth, async (req, res) => ok(res, { oglasi: await query('SELECT * FROM oglas WHERE email=:email ORDER BY broj_oglasa DESC', { email: req.user.email }) }));

app.post('/api/oglasi/:id/kupi', requireAuth, async (req, res) => {
  try {
    const rows = await query('SELECT * FROM oglas WHERE broj_oglasa=:id', { id: req.params.id });
    const o = rows[0];
    if (!o) return err(res, new Error('Oglas nije pronađen.'), 404);
    if (o.status !== 'aktivan') return err(res, new Error('Oglas nije dostupan za kupnju.'), 400);
    if (o.email === req.user.email) return err(res, new Error('Ne možeš kupiti vlastiti oglas.'), 400);
    await query('INSERT INTO prodaja (broj_oglasa,email_kupca,email_prodavaca,datum_prodaje) VALUES (:id,:kupac,:prodavac,CURDATE())', { id: req.params.id, kupac: req.user.email, prodavac: o.email });
    await query('UPDATE oglas SET status=\'prodan\' WHERE broj_oglasa=:id', { id: req.params.id });
    await query('INSERT INTO obavijest (email,sadrzaj) VALUES (:email,:s)', { email: o.email, s: `Vaš oglas "${o.naziv}" je prodan.` });
    ok(res, { message: 'Kupnja je uspješno evidentirana.' });
  } catch (e) { err(res, e); }
});

app.get('/api/kupnje', requireAuth, async (req, res) => {
  try { ok(res, { kupnje: await query('SELECT p.*, o.naziv, o.cijena, o.kategorija FROM prodaja p JOIN oglas o ON o.broj_oglasa=p.broj_oglasa WHERE p.email_kupca=:email ORDER BY p.datum_prodaje DESC', { email: req.user.email }) }); }
  catch (e) { err(res, e); }
});

app.post('/api/oglasi/:id/favorit', requireAuth, async (req, res) => {
  try {
    await query('INSERT IGNORE INTO favoriti (email,broj_oglasa,datum_spremanja) VALUES (:email,:id,CURDATE())', { email: req.user.email, id: req.params.id });
    ok(res, { message: 'Dodano u favorite.' });
  } catch(e) { err(res,e); }
});
app.delete('/api/oglasi/:id/favorit', requireAuth, async (req, res) => { await query('DELETE FROM favoriti WHERE email=:email AND broj_oglasa=:id', { email:req.user.email, id:req.params.id }); ok(res,{message:'Uklonjeno iz favorita.'}); });
app.get('/api/favoriti', requireAuth, async (req, res) => ok(res, { favoriti: await query('SELECT o.*, f.datum_spremanja FROM favoriti f JOIN oglas o ON o.broj_oglasa=f.broj_oglasa WHERE f.email=:email ORDER BY f.datum_spremanja DESC', { email: req.user.email }) }));

app.post('/api/oglasi/:id/prijava', requireAuth, async (req, res) => {
  try {
    const { razlog } = req.body;
    if (!razlog) return err(res, new Error('Razlog prijave je obavezan.'), 400);
    await query('INSERT INTO prijava (broj_oglasa,email_prijavitelja,razlog,status) VALUES (:id,:email,:razlog,\'na cekanju\') ON DUPLICATE KEY UPDATE razlog=:razlog, status=\'na cekanju\'', { id: req.params.id, email: req.user.email, razlog });
    ok(res, { message: 'Prijava je poslana administratoru.' });
  } catch(e) { err(res,e); }
});

app.post('/api/oglasi/:id/recenzija', requireAuth, async (req, res) => {
  try {
    const { ocjena, komentar } = req.body;
    const prodaje = await query('SELECT * FROM prodaja WHERE broj_oglasa=:id AND email_kupca=:email', { id:req.params.id, email:req.user.email });
    if (!prodaje.length) return err(res, new Error('Recenziju može ostaviti samo kupac nakon kupnje.'), 403);
    const p = prodaje[0];
    await query('INSERT INTO recenzija (broj_oglasa,email_ocjenjivaca,email_ocjenjenog,ocjena,komentar) VALUES (:id,:ocj,:ocjenjen,:ocjena,:komentar) ON DUPLICATE KEY UPDATE ocjena=:ocjena, komentar=:komentar', { id:req.params.id, ocj:req.user.email, ocjenjen:p.email_prodavaca, ocjena, komentar:komentar||'' });
    ok(res, { message: 'Recenzija je spremljena.' });
  } catch(e) { err(res,e); }
});

app.get('/api/poruke/:oglasId/:email', requireAuth, async (req, res) => {
  try {
    const other = req.params.email;
    const rows = await query(`SELECT * FROM poruka WHERE broj_oglasa=:id AND ((email_posiljatelja=:me AND email_primatelja=:other) OR (email_posiljatelja=:other AND email_primatelja=:me)) ORDER BY datum_vrijeme`, { id:req.params.oglasId, me:req.user.email, other });
    ok(res, { poruke: rows });
  } catch(e) { err(res,e); }
});
app.post('/api/poruke', requireAuth, async (req, res) => {
  try {
    const { broj_oglasa, email_primatelja, tekst } = req.body;
    if (!broj_oglasa || !email_primatelja || !tekst) return err(res, new Error('Oglas, primatelj i tekst su obavezni.'), 400);
    await query('INSERT INTO poruka (datum_vrijeme,email_posiljatelja,broj_oglasa,email_primatelja,tekst) VALUES (NOW(6),:pos,:broj,:prim,:tekst)', { pos:req.user.email, broj:broj_oglasa, prim:email_primatelja, tekst });
    await query('INSERT INTO obavijest (email,sadrzaj) VALUES (:email,:s)', { email:email_primatelja, s:'Imate novu poruku u oglasniku.' });
    ok(res, { message: 'Poruka je poslana.' });
  } catch(e) { err(res,e); }
});

app.get('/api/obavijesti', requireAuth, async (req, res) => ok(res, { obavijesti: await query('SELECT * FROM obavijest WHERE email=:email ORDER BY datum_vrijeme DESC', { email:req.user.email }) }));
app.put('/api/obavijesti/:id/procitano', requireAuth, async (req, res) => { await query('UPDATE obavijest SET procitano=1 WHERE id=:id AND email=:email', { id:req.params.id, email:req.user.email }); ok(res,{message:'Označeno kao pročitano.'}); });

app.get('/api/admin/korisnici', requireAuth, requireAdmin, async (_req, res) => ok(res, { korisnici: await query('SELECT email, ime, prezime, lokacija, uloga FROM korisnik ORDER BY email') }));
app.put('/api/admin/korisnici/:email', requireAuth, requireAdmin, async (req, res) => { await query('UPDATE korisnik SET uloga=:uloga WHERE email=:email', { email:req.params.email, uloga:req.body.uloga }); ok(res,{message:'Korisnik ažuriran.'}); });
app.delete('/api/admin/korisnici/:email', requireAuth, requireAdmin, async (req, res) => { await query('DELETE FROM korisnik WHERE email=:email', { email:req.params.email }); ok(res,{message:'Korisnik obrisan.'}); });
app.get('/api/admin/prijave', requireAuth, requireAdmin, async (_req, res) => ok(res, { prijave: await query('SELECT p.*, o.naziv, o.email email_vlasnika FROM prijava p JOIN oglas o ON o.broj_oglasa=p.broj_oglasa ORDER BY p.status, p.broj_oglasa DESC') }));
app.put('/api/admin/prijave', requireAuth, requireAdmin, async (req, res) => {
  const { broj_oglasa, email_prijavitelja, status, ukloniOglas } = req.body;
  await query('UPDATE prijava SET status=:status WHERE broj_oglasa=:broj AND email_prijavitelja=:email', { status, broj:broj_oglasa, email:email_prijavitelja });
  if (toBool(ukloniOglas)) await query('UPDATE oglas SET status=\'obrisan\' WHERE broj_oglasa=:broj', { broj:broj_oglasa });
  ok(res,{message:'Prijava obrađena.'});
});

app.use((req, res) => res.status(404).json({ message: 'Ruta ne postoji.' }));
const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`API radi na http://localhost:${port}`));
