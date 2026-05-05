import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'ucka.veleri.hr',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'agasparov',
  password: process.env.DB_PASSWORD || '11',
  database: process.env.DB_NAME || 'agasparov',
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
  dateStrings: true
});

export async function query(sql, params = {}) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}
