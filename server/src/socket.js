import { verifyToken } from './auth.js';
import { findUserByEmail } from './services/userService.js';
import { createMessage, emitMessage } from './services/messageService.js';
import { addNotification } from './services/notificationService.js';

export function setupSocket(io) {
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
        emitMessage(io, poruka);
        callback?.({ ok: true, poruka });
      } catch (e) {
        callback?.({ ok: false, message: e.message || 'Poruka nije poslana.' });
      }
    });
  });
}
