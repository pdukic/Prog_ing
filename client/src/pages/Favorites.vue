<template>
  <q-page class="q-pa-md">
    <div class="text-h5 q-mb-md">Favoriti</div>
    <q-list bordered separator>
      <q-item v-for="o in rows" :key="o.broj_oglasa" clickable :to="'/oglasi/' + o.broj_oglasa">
        <q-item-section>
          <q-item-label>{{ o.naziv }} — {{ o.cijena }} €</q-item-label>
          <q-item-label caption>{{ o.kategorija }} · {{ o.lokacija }}</q-item-label>
        </q-item-section>
        <q-item-section side><q-btn flat color="negative" icon="delete" @click.prevent="remove(o)" /></q-item-section>
      </q-item>
    </q-list>
  </q-page>
</template>

<script>
import { api } from '../store.js';

export default {
  name: 'FavoritesPage',
  data: () => ({ rows: [] }),
  async mounted() { this.rows = (await api.get('/favoriti')).data.favoriti; },
  methods: {
    async remove(o) {
      await api.delete('/oglasi/' + o.broj_oglasa + '/favorit');
      this.rows = (await api.get('/favoriti')).data.favoriti;
    }
  }
};
</script>
