import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query } from './db.js';

const secret = process.env.JWT_SECRET || 'dev_secret';

export function signToken(user) {
  return jwt.sign({ email: user.email, uloga: user.uloga }, secret, { expiresIn: '7d' });
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password, stored) {
  if (!stored) return false;
  if (stored.startsWith('$2')) return bcrypt.compare(password, stored);
  const sha = crypto.createHash('sha256').update(password).digest('hex');
  return sha.toLowerCase() === String(stored).toLowerCase();
}

export async function authOptional(req, _res, next) {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    if (token) req.user = jwt.verify(token, secret);
  } catch {}
  next();
}

export async function requireAuth(req, res, next) {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Za ovu akciju moraš biti prijavljen.' });
    const payload = jwt.verify(token, secret);
    const users = await query('SELECT email, ime, prezime, lokacija, uloga FROM korisnik WHERE email=:email', { email: payload.email });
    if (!users.length) return res.status(401).json({ message: 'Korisnik ne postoji.' });
    req.user = users[0];
    next();
  } catch {
    res.status(401).json({ message: 'Neispravna ili istekla prijava.' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.uloga !== 'admin') return res.status(403).json({ message: 'Samo administrator ima pristup.' });
  next();
}
