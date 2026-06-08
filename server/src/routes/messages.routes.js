import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../auth.js';
import { err, ok } from '../utils/http.js';
import { createMessage, emitMessage } from '../services/messageService.js';
import { addNotification } from '../services/notificationService.js';

export default function createMessagesRouter(io) {
  const router = express.Router();

  router.get('/razgovori', requireAuth, async (req, res) => {
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
    } catch (e) { err(res, e); }
  });

  router.get('/poruke/:oglasId/:email', requireAuth, async (req, res) => {
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
      `, { id: req.params.oglasId, me: req.user.email, other });

      ok(res, { poruke: rows });
    } catch (e) { err(res, e); }
  });

  router.post('/poruke', requireAuth, async (req, res) => {
    try {
      const poruka = await createMessage({
        posiljatelj: req.user.email,
        broj_oglasa: req.body.broj_oglasa,
        email_primatelja: req.body.email_primatelja,
        tekst: req.body.tekst
      });

      await addNotification(poruka.email_primatelja, 'Imate novu poruku u oglasniku.');
      emitMessage(io, poruka);
      ok(res, { message: 'Poruka je poslana.', poruka });
    } catch (e) { err(res, e); }
  });

  return router;
}
