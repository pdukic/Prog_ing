import { reactive } from 'vue';
import axios from 'axios';
import { io } from 'socket.io-client';
import { Notify } from 'quasar';

export const BACKEND_URL = 'http://localhost:3000';
export const api = axios.create({ baseURL: `${BACKEND_URL}/api`, timeout: 8000 });

let socket = null;

export function connectSocket() {
  if (!store.token) return null;
  if (socket?.connected) return socket;
  if (socket) socket.disconnect();

  socket = io(BACKEND_URL, {
    auth: { token: store.token },
    transports: ['websocket', 'polling']
  });

  socket.on('connect_error', () => {
    Notify.create({ type: 'warning', message: 'Chat trenutno nije spojen na server.' });
  });

  return socket;
}

export function getSocket() {
  return socket || connectSocket();
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export const store = reactive({
  token: localStorage.getItem('token') || '',
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  get isAuth() { return !!this.token; },
  get isAdmin() { return this.user?.uloga === 'admin'; },
  login(data) {
    this.token = data.token;
    this.user = data.user;
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    connectSocket();
  },
  logout() {
    this.token = '';
    this.user = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    disconnectSocket();
  }
});

api.interceptors.request.use(config => {
  if (store.token) config.headers.Authorization = `Bearer ${store.token}`;
  return config;
});

api.interceptors.response.use(
  r => r,
  e => {
    Notify.create({
      type: 'negative',
      message: e.response?.data?.message || 'Greška: backend nije pokrenut ili baza nije spojena.'
    });
    return Promise.reject(e);
  }
);

if (store.token) connectSocket();
