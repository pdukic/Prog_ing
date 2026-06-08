import { query } from '../db.js';

export async function addNotification(email, sadrzaj) {
  await query(`
    INSERT INTO OBAVIJEST (DATUM_VRIJEME, EMAIL, \`SADRŽAJ\`, \`PROČITANO\`)
    VALUES (NOW(6), :email, :sadrzaj, FALSE)
  `, { email, sadrzaj });
}
