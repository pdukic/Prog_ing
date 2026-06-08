<template>
  <q-page class="q-pa-md">
    <q-card class="q-pa-md">
      <div class="text-h5 q-mb-md">Profil</div>
      <q-input outlined v-model="form.ime" label="Ime" />
      <q-input class="q-mt-sm" outlined v-model="form.prezime" label="Prezime" />
      <q-input class="q-mt-sm" outlined v-model="form.lokacija" label="Lokacija" />
      <q-input class="q-mt-sm" outlined type="password" v-model="form.lozinka" label="Nova lozinka (opcionalno)" />
      <q-btn class="q-mt-md" color="primary" label="Spremi" @click="save" />
    </q-card>
  </q-page>
</template>

<script>
import { api, store } from '../store.js';

export default {
  name: 'ProfilePage',
  data: () => ({ form: { ...store.user, lozinka: '' } }),
  methods: {
    async save() {
      const { data } = await api.put('/me', this.form);
      store.user = data.user;
      localStorage.setItem('user', JSON.stringify(data.user));
      this.$q.notify({ type: 'positive', message: 'Profil spremljen' });
    }
  }
};
</script>
