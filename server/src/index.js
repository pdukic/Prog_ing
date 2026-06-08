import express from 'express';
import http from 'http';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import { registerRoutes } from './routes/index.js';
import { setupSocket } from './socket.js';

dotenv.config();

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

setupSocket(io);
registerRoutes(app, io);

app.use((req, res) => res.status(404).json({ message: 'Ruta ne postoji.' }));

const port = Number(process.env.PORT || 3000);
httpServer.listen(port, () => console.log(`API i Socket.IO rade na http://localhost:${port}`));
