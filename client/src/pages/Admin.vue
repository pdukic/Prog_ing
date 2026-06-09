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
             <q-btn
      dense
      color="primary"
      label="Pogledaj"
      class="q-mr-sm"
      @click="otvoriDetaljeOglasa(p.row.broj_oglasa)"
    />
            <q-btn dense color="positive" label="Odobri" @click="obradi(p.row, 'odobrena', true)" />
            <q-btn dense flat label="Odbij" @click="obradi(p.row, 'odbijena', false)" />
          </q-td>
        </template>
      </q-table>
    </div>

    <div v-else class="q-mt-md">
  <q-table :rows="korisnici" :columns="kcols" row-key="email">
    <template #body-cell-actions="p">
      <q-td align="right">
        <q-btn
  dense
  color="primary"
  label="Uredi"
  class="q-mr-sm"
  @click="otvoriUredivanjeKorisnika(p.row)"
/>
        <q-btn
          dense
          color="negative"
          label="Obriši"
          @click="obrisiKorisnika(p.row)"
        />
      </q-td>
    </template>
  </q-table>
  <q-dialog v-model="editKorisnikDialog">
  <q-card style="min-width: 400px">
    <q-card-section>
      <div class="text-h6">Uredi korisnika</div>
    </q-card-section>

    <q-card-section class="q-gutter-md">
      <q-input
        v-model="editKorisnikForm.email"
        label="Email"
        readonly
      />

      <q-input
        v-model="editKorisnikForm.ime"
        label="Ime"
      />

      <q-input
        v-model="editKorisnikForm.prezime"
        label="Prezime"
      />

      <q-input
        v-model="editKorisnikForm.lokacija"
        label="Lokacija"
      />

      <q-select
        v-model="editKorisnikForm.uloga"
        label="Uloga"
        :options="['korisnik', 'admin']"
      />
    </q-card-section>

    <q-card-actions align="right">
      <q-btn flat label="Odustani" v-close-popup />
      <q-btn
        color="primary"
        label="Spremi"
        @click="spremiKorisnika"
      />
    </q-card-actions>
  </q-card>
</q-dialog>
</div>

<q-dialog v-model="oglasDialog">
  <q-card style="min-width: 600px; max-width: 900px">
    <q-card-section>
      <div class="text-h6">Detalji prijavljenog oglasa</div>
    </q-card-section>

    <q-card-section v-if="ucitavaOglas">
      Učitavanje oglasa...
    </q-card-section>

    <q-card-section v-else-if="odabraniOglas" class="q-gutter-sm">
      <div>
        <strong>ID oglasa:</strong>
        {{ odabraniOglas.broj_oglasa }}
      </div>

      <div>
        <strong>Naziv:</strong>
        {{ odabraniOglas.naziv }}
      </div>

      <div>
        <strong>Opis:</strong>
        {{ odabraniOglas.opis }}
      </div>

      <div>
        <strong>Kategorija:</strong>
        {{ odabraniOglas.kategorija }}
      </div>

      <div>
        <strong>Cijena:</strong>
        {{ odabraniOglas.cijena }} €
      </div>

      <div>
        <strong>Lokacija:</strong>
        {{ odabraniOglas.lokacija }}
      </div>

      <div>
        <strong>Status:</strong>
        {{ odabraniOglas.status }}
      </div>

      <div>
        <strong>Vlasnik oglasa:</strong>
        {{ odabraniOglas.email }}
      </div>
    </q-card-section>

    <q-card-section v-else>
      Oglas nije pronađen.
    </q-card-section>

    <q-card-actions align="right">
      <q-btn
        flat
        label="Otvori stranicu oglasa"
        color="primary"
        v-if="odabraniOglas"
        @click="idiNaOglas"
      />

      <q-btn flat label="Zatvori" v-close-popup />
    </q-card-actions>
  </q-card>
</q-dialog>

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
    oglasDialog: false,
    odabraniOglas: null,
    ucitavaOglas: false,
    editKorisnikDialog: false,
    editKorisnikForm: {
    email: '',
    ime: '',
    prezime: '',
    lokacija: '',
    uloga: 'korisnik'
},
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
      { name: 'uloga', label: 'Uloga', field: 'uloga' },
      { name: 'actions', label: 'Akcije', align: 'right' }
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
    },
    async otvoriDetaljeOglasa(brojOglasa) {
  this.oglasDialog = true;
  this.odabraniOglas = null;
  this.ucitavaOglas = true;

  try {
    const { data } = await api.get('/oglasi/' + brojOglasa);
    this.odabraniOglas = data.oglas;
  } catch (e) {
    this.$q.notify({
      type: 'negative',
      message: e.response?.data?.message || 'Dohvat oglasa nije uspio.'
    });
  } finally {
    this.ucitavaOglas = false;
  }
},

idiNaOglas() {
  if (!this.odabraniOglas) return;

  this.$router.push('/oglasi/' + this.odabraniOglas.broj_oglasa);
},

    otvoriUredivanjeKorisnika(korisnik) {
  this.editKorisnikForm = {
    email: korisnik.email,
    ime: korisnik.ime,
    prezime: korisnik.prezime,
    lokacija: korisnik.lokacija,
    uloga: korisnik.uloga
  };

  this.editKorisnikDialog = true;
},

async spremiKorisnika() {
  try {
    await api.put(
      '/admin/korisnici/' + encodeURIComponent(this.editKorisnikForm.email),
      {
        ime: this.editKorisnikForm.ime,
        prezime: this.editKorisnikForm.prezime,
        lokacija: this.editKorisnikForm.lokacija,
        uloga: this.editKorisnikForm.uloga
      }
    );

    this.$q.notify({
      type: 'positive',
      message: 'Podaci korisnika su spremljeni.'
    });

    this.editKorisnikDialog = false;
    await this.load();
  } catch (e) {
    this.$q.notify({
      type: 'negative',
      message: e.response?.data?.message || 'Uređivanje korisnika nije uspjelo.'
    });
  }
},

    async obrisiKorisnika(korisnik) {
  this.$q.dialog({
    title: 'Brisanje korisnika',
    message: `Jesi li siguran da želiš obrisati korisnika ${korisnik.email}?`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      await api.delete('/admin/korisnici/' + encodeURIComponent(korisnik.email));

      this.$q.notify({
        type: 'positive',
        message: 'Korisnik je obrisan.'
      });

      await this.load();
    } catch (e) {
      this.$q.notify({
        type: 'negative',
        message: e.response?.data?.message || 'Brisanje korisnika nije uspjelo.'
      });
    }
  });
}
  }
};
</script>
