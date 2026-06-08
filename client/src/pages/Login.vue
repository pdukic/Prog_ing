<template>
  <q-page class="auth">
    <q-card class="auth-card">
      <q-card-section><div class="text-h5">Prijava</div></q-card-section>
      <q-card-section>
        <q-input outlined v-model="email" label="Email" />
        <q-input class="q-mt-sm" outlined v-model="lozinka" type="password" label="Lozinka" />
        <q-btn class="q-mt-md full-width" color="primary" label="Prijavi se" @click="submit" />
        <div class="q-mt-sm">Nemaš račun? <router-link to="/register">Registracija</router-link></div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script>
import { api, store } from '../store.js';

export default {
  name: 'LoginPage',
  data: () => ({ email: 'admin@oglasnik.hr', lozinka: 'admin123' }),
  methods: {
    async submit() {
      const { data } = await api.post('/auth/login', this.$data);
      store.login(data);
      this.$router.push('/');
    }
  }
};
</script>
