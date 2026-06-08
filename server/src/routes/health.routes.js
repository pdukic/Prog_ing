import express from 'express';
import { ok } from '../utils/http.js';

const router = express.Router();

router.get('/health', async (_req, res) =>
  ok(res, { status: 'OK', db: 'mysql/mariadb', database: process.env.DB_NAME || 'agasparov' })
);

export default router;
