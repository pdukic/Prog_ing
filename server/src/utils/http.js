export const ok = (res, data = {}) => res.json(data);

export const err = (res, e, code = 500) =>
  res.status(code).json({ message: e.message || 'Greška na serveru.' });

export const toBool = v => v === true || v === 1 || v === '1';
