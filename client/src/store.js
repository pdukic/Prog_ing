import { reactive } from 'vue';
import axios from 'axios';
import { Notify } from 'quasar';

export const api = axios.create({ baseURL: 'http://localhost:3000/api', timeout: 8000 });

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
  },
  logout() {
    this.token = '';
    this.user = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
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
