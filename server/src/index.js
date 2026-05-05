import express from 'express';
import http from 'http';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import { query } from './db.js';
import { authOptional, requireAuth, requireAdmin, hashPassword, verifyPassword, signToken, verifyToken } from './auth.js';

dotenv.config();
const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

const ok = (res, data = {}) => res.json(data);
const err = (res, e, code = 500) => res.status(code).json({ message: e.message || 'Greška na serveru.' });
const toBool = v => v === true || v === 1 || v === '1';

const userSelect = `
  EMAIL AS email,
  IME AS ime,
  PREZIME AS prezime,
  LOKACIJA AS lokacija,
  ULOGA AS uloga
`;

const oglasSelect = `
  o.BROJ_OGLASA AS broj_oglasa,
  o.EMAIL AS email,
  o.NAZIV AS naziv,
  o.OPIS AS opis,
  o.CIJENA AS cijena,
  o.KATEGORIJA AS kategorija,
  o.STATUS AS status,
  o.LOKACIJA AS lokacija,
  o.SLIKA_URL AS slika_url
`;

const prodajaSelect = `
  p.BROJ_OGLASA AS broj_oglasa,
  p.EMAIL_KUPCA AS email_kupca,
  p.\`EMAIL_PRODAVAČA\` AS email_prodavaca,
  p.DATUM_PRODAJE AS datum_prodaje
`;

async function addNotification(email, sadrzaj) {
  await query(`
    INSERT INTO OBAVIJEST (DATUM_VRIJEME, EMAIL, \`SADRŽAJ\`, \`PROČITANO\`)
    VALUES (NOW(6), :email, :sadrzaj, FALSE)
  `, { email, sadrzaj });
}

async function findUserByEmail(email) {
  const rows = await query(`
    SELECT ${userSelect}
    FROM KORISNIK
    WHERE EMAIL = :email
  `, { email });
  return rows[0] || null;
}

async function createMessage({ posiljatelj, broj_oglasa, email_primatelja, tekst }) {
  const trimmed = String(tekst || '').trim();
  if (!broj_oglasa || !email_primatelja || !trimmed) throw new Error('Oglas, primatelj i tekst su obavezni.');
  if (email_primatelja === posiljatelj) throw new Error('Ne možeš poslati poruku samom sebi.');

  const stamp = await query('SELECT NOW(6) AS datum_vrijeme');
  const datum_vrijeme = stamp[0].datum_vrijeme;

  await query(`
    INSERT INTO PORUKA (DATUM_VRIJEME, \`EMAIL_POŠILJATELJA\`, BROJ_OGLASA, EMAIL_PRIMATELJA, TEKST)
    VALUES (:datum_vrijeme, :posiljatelj, :broj_oglasa, :email_primatelja, :tekst)
  `, { datum_vrijeme, posiljatelj, broj_oglasa, email_primatelja, tekst: trimmed });

  return {
    datum_vrijeme,
    email_posiljatelja: posiljatelj,
    broj_oglasa: Number(broj_oglasa),
    email_primatelja,
    tekst: trimmed
  };
}

function emitMessage(poruka) {
  io.to(`user:${poruka.email_primatelja}`).emit('poruka:nova', poruka);
  io.to(`user:${poruka.email_posiljatelja}`).emit('poruka:nova', poruka);
}

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) throw new Error('Nema tokena.');

    const payload = verifyToken(token);
    const user = await findUserByEmail(payload.email);
    if (!user) throw new Error('Korisnik ne postoji.');

    socket.user = user;
    next();
  } catch {
    next(new Error('Neispravna ili istekla prijava.'));
  }
});

io.on('connection', socket => {
  socket.join(`user:${socket.user.email}`);
  socket.emit('socket:ready', { email: socket.user.email });

  socket.on('poruka:posalji', async (payload, callback) => {
    try {
      const poruka = await createMessage({
        posiljatelj: socket.user.email,
        broj_oglasa: payload?.broj_oglasa,
        email_primatelja: payload?.email_primatelja,
        tekst: payload?.tekst
      });

      await addNotification(poruka.email_primatelja, 'Imate novu poruku u oglasniku.');
      emitMessage(poruka);
      callback?.({ ok: true, poruka });
    } catch (e) {
      callback?.({ ok: false, message: e.message || 'Poruka nije poslana.' });
    }
  });
});

app.get('/api/health', async (_req, res) => ok(res, { status: 'OK', db: 'mysql/mariadb', database: process.env.DB_NAME || 'agasparov' }));

app.post('/api/auth/register', async (req, res) => {
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

app.post('/api/auth/login', async (req, res) => {
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

app.get('/api/me', requireAuth, async (req, res) => ok(res, { user: req.user }));
app.put('/api/me', requireAuth, async (req, res) => {
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

// JAVNO: gosti smiju pregledavati, pretraživati i filtrirati oglase.
app.get('/api/oglasi', authOptional, async (req, res) => {
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

app.get('/api/oglasi/:id', authOptional, async (req, res) => {
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
app.post('/api/oglasi', requireAuth, async (req, res) => {
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

app.put('/api/oglasi/:id', requireAuth, async (req, res) => {
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

app.delete('/api/oglasi/:id', requireAuth, async (req, res) => {
  try {
    const rows = await query(`SELECT ${oglasSelect} FROM OGLAS o WHERE o.BROJ_OGLASA = :id`, { id: req.params.id });
    const o = rows[0];
    if (!o) return err(res, new Error('Oglas nije pronađen.'), 404);
    if (o.email !== req.user.email && req.user.uloga !== 'admin') return err(res, new Error('Možeš brisati samo vlastite oglase.'), 403);
    await query("UPDATE OGLAS SET STATUS = 'obrisan' WHERE BROJ_OGLASA = :id", { id: req.params.id });
    ok(res, { message: 'Oglas je obrisan/deaktiviran.' });
  } catch (e) { err(res, e); }
});

app.get('/api/moji-oglasi', requireAuth, async (req, res) => {
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

app.post('/api/oglasi/:id/kupi', requireAuth, async (req, res) => {
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

app.get('/api/kupnje', requireAuth, async (req, res) => {
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

app.post('/api/oglasi/:id/favorit', requireAuth, async (req, res) => {
  try {
    await query(`
      INSERT IGNORE INTO FAVORITI (EMAIL, BROJ_OGLASA, DATUM_SPREMANJA)
      VALUES (:email, :id, CURDATE())
    `, { email: req.user.email, id: req.params.id });
    ok(res, { message: 'Dodano u favorite.' });
  } catch(e) { err(res,e); }
});

app.delete('/api/oglasi/:id/favorit', requireAuth, async (req, res) => {
  try {
    await query('DELETE FROM FAVORITI WHERE EMAIL = :email AND BROJ_OGLASA = :id', { email: req.user.email, id: req.params.id });
    ok(res, { message: 'Uklonjeno iz favorita.' });
  } catch(e) { err(res,e); }
});

app.get('/api/favoriti', requireAuth, async (req, res) => {
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

app.post('/api/oglasi/:id/prijava', requireAuth, async (req, res) => {
  try {
    const { razlog } = req.body;
    if (!razlog) return err(res, new Error('Razlog prijave je obavezan.'), 400);
    await query(`
      INSERT INTO PRIJAVA (BROJ_OGLASA, EMAIL_PRIJAVITELJA, RAZLOG, STATUS)
      VALUES (:id, :email, :razlog, 'na cekanju')
      ON DUPLICATE KEY UPDATE RAZLOG = :razlog, STATUS = 'na cekanju'
    `, { id: req.params.id, email: req.user.email, razlog });
    ok(res, { message: 'Prijava je poslana administratoru.' });
  } catch(e) { err(res,e); }
});

app.post('/api/oglasi/:id/recenzija', requireAuth, async (req, res) => {
  try {
    const { ocjena, komentar } = req.body;
    const rating = Number(ocjena);
    if (!rating || rating < 1 || rating > 5) return err(res, new Error('Ocjena mora biti između 1 i 5.'), 400);
    const prodaje = await query(`
      SELECT ${prodajaSelect}
      FROM PRODAJA p
      WHERE p.BROJ_OGLASA = :id AND p.EMAIL_KUPCA = :email
    `, { id:req.params.id, email:req.user.email });
    if (!prodaje.length) return err(res, new Error('Recenziju može ostaviti samo kupac nakon kupnje.'), 403);
    await query(`
      INSERT INTO RECENZIJA (BROJ_OGLASA, OCJENA, KOMENTAR)
      VALUES (:id, :ocjena, :komentar)
      ON DUPLICATE KEY UPDATE OCJENA = :ocjena, KOMENTAR = :komentar
    `, { id:req.params.id, ocjena: rating, komentar: komentar || '' });
    ok(res, { message: 'Recenzija je spremljena.' });
  } catch(e) { err(res,e); }
});

app.get('/api/razgovori', requireAuth, async (req, res) => {
  try {
    const razgovori = await query(`
      SELECT
        t.BROJ_OGLASA AS broj_oglasa,
        t.drugi_email AS email,
        k.IME AS ime,
        k.PREZIME AS prezime,
        o.NAZIV AS naziv,
        o.SLIKA_URL AS slika_url,
        o.STATUS AS status,
        p.DATUM_VRIJEME AS datum_vrijeme,
        p.\`EMAIL_POŠILJATELJA\` AS email_posiljatelja,
        p.EMAIL_PRIMATELJA AS email_primatelja,
        p.TEKST AS zadnja_poruka
      FROM (
        SELECT
          BROJ_OGLASA,
          CASE
            WHEN \`EMAIL_POŠILJATELJA\` = :me THEN EMAIL_PRIMATELJA
            ELSE \`EMAIL_POŠILJATELJA\`
          END AS drugi_email,
          MAX(DATUM_VRIJEME) AS zadnji_datum
        FROM PORUKA
        WHERE \`EMAIL_POŠILJATELJA\` = :me OR EMAIL_PRIMATELJA = :me
        GROUP BY
          BROJ_OGLASA,
          CASE
            WHEN \`EMAIL_POŠILJATELJA\` = :me THEN EMAIL_PRIMATELJA
            ELSE \`EMAIL_POŠILJATELJA\`
          END
      ) t
      JOIN PORUKA p ON p.BROJ_OGLASA = t.BROJ_OGLASA
        AND p.DATUM_VRIJEME = t.zadnji_datum
        AND (
          (p.\`EMAIL_POŠILJATELJA\` = :me AND p.EMAIL_PRIMATELJA = t.drugi_email)
          OR
          (p.\`EMAIL_POŠILJATELJA\` = t.drugi_email AND p.EMAIL_PRIMATELJA = :me)
        )
      JOIN KORISNIK k ON k.EMAIL = t.drugi_email
      JOIN OGLAS o ON o.BROJ_OGLASA = t.BROJ_OGLASA
      ORDER BY t.zadnji_datum DESC
    `, { me: req.user.email });
    ok(res, { razgovori });
  } catch(e) { err(res,e); }
});

app.get('/api/poruke/:oglasId/:email', requireAuth, async (req, res) => {
  try {
    const other = req.params.email;
    const rows = await query(`
      SELECT
        DATUM_VRIJEME AS datum_vrijeme,
        \`EMAIL_POŠILJATELJA\` AS email_posiljatelja,
        BROJ_OGLASA AS broj_oglasa,
        EMAIL_PRIMATELJA AS email_primatelja,
        TEKST AS tekst
      FROM PORUKA
      WHERE BROJ_OGLASA = :id
        AND (
          (\`EMAIL_POŠILJATELJA\` = :me AND EMAIL_PRIMATELJA = :other)
          OR
          (\`EMAIL_POŠILJATELJA\` = :other AND EMAIL_PRIMATELJA = :me)
        )
      ORDER BY DATUM_VRIJEME
    `, { id:req.params.oglasId, me:req.user.email, other });
    ok(res, { poruke: rows });
  } catch(e) { err(res,e); }
});

app.post('/api/poruke', requireAuth, async (req, res) => {
  try {
    const poruka = await createMessage({
      posiljatelj: req.user.email,
      broj_oglasa: req.body.broj_oglasa,
      email_primatelja: req.body.email_primatelja,
      tekst: req.body.tekst
    });
    await addNotification(poruka.email_primatelja, 'Imate novu poruku u oglasniku.');
    emitMessage(poruka);
    ok(res, { message: 'Poruka je poslana.', poruka });
  } catch(e) { err(res,e); }
});

app.get('/api/obavijesti', requireAuth, async (req, res) => {
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
    `, { email:req.user.email });
    ok(res, { obavijesti });
  } catch (e) { err(res, e); }
});

app.put('/api/obavijesti/procitano', requireAuth, async (req, res) => {
  try {
    await query('UPDATE OBAVIJEST SET `PROČITANO` = 1 WHERE EMAIL = :email', { email:req.user.email });
    ok(res, { message:'Sve obavijesti su označene kao pročitane.' });
  } catch (e) { err(res, e); }
});

app.put('/api/obavijesti/:datum/procitano', requireAuth, async (req, res) => {
  try {
    await query('UPDATE OBAVIJEST SET `PROČITANO` = 1 WHERE DATUM_VRIJEME = :datum AND EMAIL = :email', { datum:req.params.datum, email:req.user.email });
    ok(res, { message:'Označeno kao pročitano.' });
  } catch (e) { err(res, e); }
});

app.get('/api/admin/korisnici', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const korisnici = await query(`SELECT ${userSelect} FROM KORISNIK ORDER BY EMAIL`);
    ok(res, { korisnici });
  } catch (e) { err(res, e); }
});

app.put('/api/admin/korisnici/:email', requireAuth, requireAdmin, async (req, res) => {
  try {
    await query('UPDATE KORISNIK SET ULOGA = :uloga WHERE EMAIL = :email', { email:req.params.email, uloga:req.body.uloga });
    ok(res, { message:'Korisnik ažuriran.' });
  } catch (e) { err(res, e); }
});

app.delete('/api/admin/korisnici/:email', requireAuth, requireAdmin, async (req, res) => {
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
    ok(res, { message:'Korisnik obrisan.' });
  } catch (e) { err(res, e); }
});

app.get('/api/admin/prijave', requireAuth, requireAdmin, async (_req, res) => {
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

app.put('/api/admin/prijave', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { broj_oglasa, email_prijavitelja, status, ukloniOglas } = req.body;
    await query('UPDATE PRIJAVA SET STATUS = :status WHERE BROJ_OGLASA = :broj AND EMAIL_PRIJAVITELJA = :email', { status, broj:broj_oglasa, email:email_prijavitelja });
    if (toBool(ukloniOglas)) await query("UPDATE OGLAS SET STATUS = 'obrisan' WHERE BROJ_OGLASA = :broj", { broj:broj_oglasa });
    ok(res, { message:'Prijava obrađena.' });
  } catch (e) { err(res, e); }
});

app.use((req, res) => res.status(404).json({ message: 'Ruta ne postoji.' }));
const port = Number(process.env.PORT || 3000);
httpServer.listen(port, () => console.log(`API i Socket.IO rade na http://localhost:${port}`));
