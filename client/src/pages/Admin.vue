<template>
  <q-page class="q-pa-md">
    <div class="text-h5 q-mb-md">Admin panel</div>
    <q-tabs v-model="tab">
      <q-tab name="prijave" label="Prijave oglasa" />
      <q-tab name="korisnici" label="Korisnici" />
    </q-tabs>
    <q-separator />

    <div v-if="tab === 'prijave'" class="q-mt-md">
      <q-table :rows="prijave" :columns="pcols" row-key="broj_oglasa">
        <template #body-cell-actions="p">
          <q-td>
            <q-btn dense color="positive" label="Odobri" @click="obradi(p.row, 'odobrena', true)" />
            <q-btn dense flat label="Odbij" @click="obradi(p.row, 'odbijena', false)" />
          </q-td>
        </template>
      </q-table>
    </div>

    <div v-else class="q-mt-md">
      <q-table :rows="korisnici" :columns="kcols" row-key="email" />
    </div>
  </q-page>
</template>

<script>
import { api } from '../store.js';

export default {
  name: 'AdminPage',
  data: () => ({
    tab: 'prijave',
    prijave: [],
    korisnici: [],
    pcols: [
      { name: 'broj_oglasa', label: 'Oglas', field: 'broj_oglasa' },
      { name: 'naziv', label: 'Naziv', field: 'naziv', align: 'left' },
      { name: 'email_prijavitelja', label: 'Prijavio', field: 'email_prijavitelja' },
      { name: 'razlog', label: 'Razlog', field: 'razlog', align: 'left' },
      { name: 'status', label: 'Status', field: 'status' },
      { name: 'actions', label: 'Akcije' }
    ],
    kcols: [
      { name: 'email', label: 'Email', field: 'email', align: 'left' },
      { name: 'ime', label: 'Ime', field: 'ime' },
      { name: 'prezime', label: 'Prezime', field: 'prezime' },
      { name: 'lokacija', label: 'Lokacija', field: 'lokacija' },
      { name: 'uloga', label: 'Uloga', field: 'uloga' }
    ]
  }),
  async mounted() { await this.load(); },
  methods: {
    async load() {
      this.prijave = (await api.get('/admin/prijave')).data.prijave;
      this.korisnici = (await api.get('/admin/korisnici')).data.korisnici;
    },
    async obradi(r, status, ukloniOglas) {
      await api.put('/admin/prijave', { ...r, status, ukloniOglas });
      await this.load();
    }
  }
};
</script>
