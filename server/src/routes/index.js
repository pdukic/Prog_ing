import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import profileRoutes from './profile.routes.js';
import oglasiRoutes from './oglasi.routes.js';
import purchasesRoutes from './purchases.routes.js';
import favoritesRoutes from './favorites.routes.js';
import createMessagesRouter from './messages.routes.js';
import notificationsRoutes from './notifications.routes.js';
import adminRoutes from './admin.routes.js';

export function registerRoutes(app, io) {
  app.use('/api', healthRoutes);
  app.use('/api', authRoutes);
  app.use('/api', profileRoutes);
  app.use('/api', oglasiRoutes);
  app.use('/api', purchasesRoutes);
  app.use('/api', favoritesRoutes);
  app.use('/api', createMessagesRouter(io));
  app.use('/api', notificationsRoutes);
  app.use('/api', adminRoutes);
}
