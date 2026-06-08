<template>
  <q-page class="q-pa-md">
    <div class="hero q-pa-lg q-mb-lg">
      <div>
        <div class="text-h4 text-weight-bold">Marketplace / Oglasnik</div>
        <div class="text-subtitle1">Gosti mogu pregledavati oglase. Za objavu, kupnju, prijave, favorite, chat i recenzije potrebna je registracija.</div>
      </div>
      <q-btn v-if="!store.isAuth" color="primary" label="Registriraj se" to="/register" />
    </div>

    <q-card flat bordered class="q-pa-md q-mb-md">
      <div class="row q-col-gutter-sm">
        <div class="col-12 col-md-3"><q-input dense outlined v-model="filters.q" label="Pretraga" @keyup.enter="load" /></div>
        <div class="col-6 col-md-2"><q-select dense outlined v-model="filters.kategorija" label="Kategorija" :options="kategorije" clearable /></div>
        <div class="col-6 col-md-2"><q-input dense outlined v-model="filters.lokacija" label="Lokacija" /></div>
        <div class="col-6 col-md-2"><q-input dense outlined v-model="filters.max" type="number" label="Max cijena" /></div>
        <div class="col-6 col-md-2"><q-select dense outlined v-model="filters.sort" :options="sortovi" emit-value map-options label="Sort" /></div>
        <div class="col-12 col-md-1"><q-btn class="full-width" color="primary" label="Traži" @click="load" /></div>
      </div>
    </q-card>

    <div class="row q-col-gutter-md">
      <div v-for="o in oglasi" :key="o.broj_oglasa" class="col-12 col-sm-6 col-md-4">
        <q-card class="ad-card cursor-pointer" @click="$router.push('/oglasi/' + o.broj_oglasa)">
          <q-img :src="o.slika_url || fallback" height="180px">
            <q-badge class="q-ma-sm" :color="o.status === 'aktivan' ? 'green' : 'grey'">{{ o.status }}</q-badge>
          </q-img>
          <q-card-section>
            <div class="text-h6 ellipsis">{{ o.naziv }}</div>
            <div class="text-primary text-h6">{{ Number(o.cijena).toFixed(2) }} €</div>
            <div class="text-grey-7">{{ o.kategorija }} · {{ o.lokacija }}</div>
            <div class="text-caption">Prodavač: {{ o.ime }} {{ o.prezime }} <span v-if="o.prosjecna_ocjena">⭐ {{ o.prosjecna_ocjena }}</span></div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script>
import { api, store } from '../store.js';

export default {
  name: 'HomePage',
  data() {
    return {
      store,
      oglasi: [],
      filters: { q: '', kategorija: '', lokacija: '', max: '', sort: 'new' },
      kategorije: ['Elektronika', 'Sport', 'Namještaj', 'Glazba', 'Odjeća', 'Auto', 'Ostalo'],
      sortovi: [
        { label: 'Najnovije', value: 'new' },
        { label: 'Cijena ↑', value: 'price_asc' },
        { label: 'Cijena ↓', value: 'price_desc' }
      ],
      fallback: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=900'
    };
  },
  async mounted() {
    await this.load();
  },
  methods: {
    async load() {
      try {
        const { data } = await api.get('/oglasi', { params: this.filters });
        this.oglasi = data.oglasi;
      } catch (e) {
        this.$q.notify({ type: 'warning', message: 'Ne mogu dohvatiti oglase. Pokreni backend i provjeri bazu.' });
      }
    }
  }
};
</script>
