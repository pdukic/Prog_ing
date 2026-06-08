<template>
  <q-page class="q-pa-md">
    <div class="text-h5 q-mb-md">Povijest kupnji</div>
    <q-table :rows="rows" :columns="cols" row-key="broj_oglasa" />
  </q-page>
</template>

<script>
import { api } from '../store.js';

export default {
  name: 'PurchasesPage',
  data: () => ({
    rows: [],
    cols: [
      { name: 'broj_oglasa', label: 'Oglas', field: 'broj_oglasa' },
      { name: 'naziv', label: 'Naziv', field: 'naziv', align: 'left' },
      { name: 'cijena', label: 'Cijena', field: 'cijena' },
      { name: 'datum_prodaje', label: 'Datum', field: 'datum_prodaje' }
    ]
  }),
  async mounted() { this.rows = (await api.get('/kupnje')).data.kupnje; }
};
</script>
