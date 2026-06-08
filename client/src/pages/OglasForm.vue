<template>
  <q-page class="q-pa-md">
    <q-card class="q-pa-md">
      <div class="text-h5 q-mb-md">{{ editing ? 'Uredi oglas' : 'Objavi oglas' }}</div>
      <div class="row q-col-gutter-md">
        <q-input class="col-12 col-md-6" outlined v-model="form.naziv" label="Naziv" />
        <q-input class="col-12 col-md-3" outlined type="number" v-model="form.cijena" label="Cijena" />
        <q-select class="col-12 col-md-3" outlined v-model="form.kategorija" :options="kategorije" label="Kategorija" />
        <q-input class="col-12 col-md-6" outlined v-model="form.lokacija" label="Lokacija" />
        <q-input class="col-12 col-md-6" outlined v-model="form.slika_url" label="URL slike" />
        <q-input class="col-12" outlined type="textarea" v-model="form.opis" label="Opis" />
      </div>
      <q-btn class="q-mt-md" color="primary" :label="editing ? 'Spremi' : 'Objavi'" @click="save" />
    </q-card>
  </q-page>
</template>

<script>
import { api } from '../store.js';

export default {
  name: 'OglasFormPage',
  data: () => ({
    form: { naziv: '', opis: '', cijena: 0, kategorija: '', lokacija: '', slika_url: '' },
    kategorije: ['Elektronika', 'Sport', 'Namještaj', 'Glazba', 'Odjeća', 'Auto', 'Ostalo']
  }),
  computed: {
    editing() { return !!this.$route.params.id; }
  },
  async mounted() {
    if (this.editing) {
      const { data } = await api.get('/oglasi/' + this.$route.params.id);
      this.form = data.oglas;
    }
  },
  methods: {
    async save() {
      if (this.editing) await api.put('/oglasi/' + this.$route.params.id, this.form);
      else await api.post('/oglasi', this.form);
      this.$router.push('/moje');
    }
  }
};
</script>
