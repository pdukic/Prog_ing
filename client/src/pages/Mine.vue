<template>
  <q-page class="q-pa-md">
    <div class="text-h5 q-mb-md">Moji oglasi</div>
    <q-btn color="primary" label="Novi oglas" to="/novi-oglas" class="q-mb-md" />
    <q-table :rows="oglasi" :columns="cols" row-key="broj_oglasa">
      <template #body-cell-actions="p">
        <q-td>
          <q-btn dense flat icon="edit" :to="'/uredi-oglas/' + p.row.broj_oglasa" />
          <q-btn dense flat color="negative" icon="delete" @click="del(p.row)" />
        </q-td>
      </template>
    </q-table>
  </q-page>
</template>

<script>
import { api } from '../store.js';

export default {
  name: 'MinePage',
  data: () => ({
    oglasi: [],
    cols: [
      { name: 'broj_oglasa', label: 'ID', field: 'broj_oglasa' },
      { name: 'naziv', label: 'Naziv', field: 'naziv', align: 'left' },
      { name: 'cijena', label: 'Cijena', field: 'cijena' },
      { name: 'status', label: 'Status', field: 'status' },
      { name: 'actions', label: 'Akcije' }
    ]
  }),
  async mounted() { await this.load(); },
  methods: {
    async load() { this.oglasi = (await api.get('/moji-oglasi')).data.oglasi; },
    async del(r) { await api.delete('/oglasi/' + r.broj_oglasa); await this.load(); }
  }
};
</script>
