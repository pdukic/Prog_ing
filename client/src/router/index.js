import { createRouter, createWebHistory } from 'vue-router';
import { store } from '../store.js';

import Home from '../pages/Home.vue';
import Login from '../pages/Login.vue';
import Register from '../pages/Register.vue';
import Detail from '../pages/Detail.vue';
import OglasForm from '../pages/OglasForm.vue';
import Mine from '../pages/Mine.vue';
import Favorites from '../pages/Favorites.vue';
import Purchases from '../pages/Purchases.vue';
import Messages from '../pages/Messages.vue';
import Profile from '../pages/Profile.vue';
import Notices from '../pages/Notices.vue';
import Admin from '../pages/Admin.vue';

const routes = [
  { path: '/', component: Home },
  { path: '/login', component: Login },
  { path: '/register', component: Register },
  { path: '/oglasi/:id', component: Detail },
  { path: '/novi-oglas', component: OglasForm, meta: { auth: true } },
  { path: '/uredi-oglas/:id', component: OglasForm, meta: { auth: true } },
  { path: '/moje', component: Mine, meta: { auth: true } },
  { path: '/favoriti', component: Favorites, meta: { auth: true } },
  { path: '/kupnje', component: Purchases, meta: { auth: true } },
  { path: '/poruke', component: Messages, meta: { auth: true } },
  { path: '/profil', component: Profile, meta: { auth: true } },
  { path: '/obavijesti', component: Notices, meta: { auth: true } },
  { path: '/admin', component: Admin, meta: { auth: true, admin: true } }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to) => {
  if (to.meta.auth && !store.isAuth) return '/login';
  if (to.meta.admin && !store.isAdmin) return '/';
});

export default router;
