<template>
  <q-page class="auth">
    <q-card class="auth-card">
      <q-card-section><div class="text-h5">Registracija</div></q-card-section>
      <q-card-section>
        <q-input outlined v-model="form.email" label="Email" />
        <q-input class="q-mt-sm" outlined v-model="form.ime" label="Ime" />
        <q-input class="q-mt-sm" outlined v-model="form.prezime" label="Prezime" />
        <q-input class="q-mt-sm" outlined v-model="form.lokacija" label="Lokacija" />
        <q-input class="q-mt-sm" outlined v-model="form.lozinka" type="password" label="Lozinka" />
        <q-btn class="q-mt-md full-width" color="primary" label="Kreiraj račun" @click="submit" />
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script>
import { api, store } from '../store.js';

export default {
  name: 'RegisterPage',
  data: () => ({ form: { email: '', ime: '', prezime: '', lokacija: '', lozinka: '' } }),
  methods: {
    async submit() {
      const { data } = await api.post('/auth/register', this.form);
      store.login(data);
      this.$router.push('/');
    }
  }
};
</script>
