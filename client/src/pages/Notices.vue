<template>
  <q-page class="q-pa-md">
    <div class="text-h5 q-mb-md">Obavijesti</div>
    <q-list bordered separator>
      <q-item v-for="o in rows" :key="o.datum_vrijeme">
        <q-item-section>
          <q-item-label>{{ o.sadrzaj }}</q-item-label>
          <q-item-label caption>{{ o.datum_vrijeme }}</q-item-label>
        </q-item-section>
        <q-item-section side><q-badge :color="o.procitano ? 'grey' : 'primary'">{{ o.procitano ? 'pročitano' : 'novo' }}</q-badge></q-item-section>
      </q-item>
    </q-list>
  </q-page>
</template>

<script>
import { api } from '../store.js';

export default {
  name: 'NoticesPage',
  data: () => ({ rows: [] }),
  async mounted() { this.rows = (await api.get('/obavijesti')).data.obavijesti; }
};
</script>
