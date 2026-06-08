<template>
  <q-page class="q-pa-md" v-if="oglas">
    <q-card>
      <q-img :src="oglas.slika_url || fallback" height="280px" />
      <q-card-section>
        <div class="row items-start justify-between">
          <div>
            <div class="text-h4">{{ oglas.naziv }}</div>
            <div class="text-h5 text-primary">{{ Number(oglas.cijena).toFixed(2) }} €</div>
            <div>{{ oglas.kategorija }} · {{ oglas.lokacija }} · status: <b>{{ oglas.status }}</b></div>
            <div>Prodavač: {{ oglas.ime }} {{ oglas.prezime }} ({{ oglas.email }}) <span v-if="oglas.prosjecna_ocjena">⭐ {{ oglas.prosjecna_ocjena }}</span></div>
          </div>
          <q-badge :color="oglas.status === 'aktivan' ? 'green' : 'grey'">{{ oglas.status }}</q-badge>
        </div>
        <q-separator class="q-my-md" />
        <p>{{ oglas.opis }}</p>
        <q-banner v-if="!store.isAuth" class="bg-orange-1 text-orange-10">Prijavi se ili registriraj za kupnju, favorite, prijavu oglasa, chat i recenzije.</q-banner>
        <div v-else class="q-gutter-sm">
          <q-btn color="positive" label="Kupi" :disable="oglas.status !== 'aktivan' || oglas.email === store.user.email" @click="kupi" />
          <q-btn color="primary" outline label="Dodaj u favorite" @click="fav" />
          <q-btn color="negative" outline label="Prijavi oglas" @click="report" />
          <q-btn color="secondary" outline label="Otvori razgovor" :disable="oglas.email === store.user.email" @click="openChat" />
          <q-btn v-if="oglas.email === store.user.email || store.isAdmin" color="warning" outline label="Uredi" :to="'/uredi-oglas/' + oglas.broj_oglasa" />
        </div>
      </q-card-section>
    </q-card>

    <q-card class="q-mt-md">
      <q-card-section>
        <div class="text-h6">Recenzije prodavača</div>
        <div v-if="!recenzije.length">Još nema recenzija.</div>
        <q-list>
          <q-item v-for="r in recenzije" :key="r.broj_oglasa + ':' + r.ime_ocjenjivaca">
            <q-item-section>
              <q-item-label>⭐ {{ r.ocjena }} — {{ r.ime_ocjenjivaca }}</q-item-label>
              <q-item-label caption>{{ r.komentar }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
        <div v-if="store.isAuth" class="row q-col-gutter-sm q-mt-sm">
          <div class="col-12 col-md-2"><q-rating v-model="review.ocjena" max="5" /></div>
          <div class="col"><q-input outlined dense v-model="review.komentar" label="Komentar nakon kupnje" /></div>
          <div><q-btn color="primary" label="Spremi" @click="reviewPost" /></div>
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script>
import { api, store } from '../store.js';

export default {
  name: 'DetailPage',
  data: () => ({
    oglas: null,
    recenzije: [],
    fallback: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=900',
    review: { ocjena: 5, komentar: '' }
  }),
  computed: {
    store() { return store; }
  },
  async mounted() {
    await this.load();
  },
  methods: {
    async load() {
      const { data } = await api.get('/oglasi/' + this.$route.params.id);
      this.oglas = data.oglas;
      this.recenzije = data.recenzije;
    },
    async kupi() {
      await api.post('/oglasi/' + this.oglas.broj_oglasa + '/kupi');
      this.$q.notify({ type: 'positive', message: 'Kupnja uspješna' });
      await this.load();
    },
    async fav() {
      await api.post('/oglasi/' + this.oglas.broj_oglasa + '/favorit');
      this.$q.notify({ type: 'positive', message: 'Spremljeno u favorite' });
    },
    report() {
      this.$q.dialog({ title: 'Prijava oglasa', prompt: { model: '', type: 'textarea', label: 'Razlog' }, cancel: true, persistent: true })
        .onOk(async razlog => { await api.post('/oglasi/' + this.oglas.broj_oglasa + '/prijava', { razlog }); });
    },
    openChat() {
      this.$router.push({ path: '/poruke', query: { oglas: this.oglas.broj_oglasa, email: this.oglas.email } });
    },
    async reviewPost() {
      await api.post('/oglasi/' + this.oglas.broj_oglasa + '/recenzija', this.review);
      await this.load();
    }
  }
};
</script>
