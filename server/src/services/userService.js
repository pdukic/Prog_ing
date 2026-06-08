import { query } from '../db.js';
import { userSelect } from '../constants/sql.js';

export async function findUserByEmail(email) {
  const rows = await query(`
    SELECT ${userSelect}
    FROM KORISNIK
    WHERE EMAIL = :email
  `, { email });
  return rows[0] || null;
}
