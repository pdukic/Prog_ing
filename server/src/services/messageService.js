import { query } from '../db.js';

export async function createMessage({ posiljatelj, broj_oglasa, email_primatelja, tekst }) {
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

export function emitMessage(io, poruka) {
  io.to(`user:${poruka.email_primatelja}`).emit('poruka:nova', poruka);
  io.to(`user:${poruka.email_posiljatelja}`).emit('poruka:nova', poruka);
}
