<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div class="text-h5">Poruke</div>
      <q-btn flat icon="refresh" label="Osvježi" @click="loadRazgovori" />
    </div>

    <div class="row q-col-gutter-md">
      <div class="col-12 col-md-4">
        <q-card class="chat-panel">
          <q-card-section><div class="text-subtitle1 text-weight-bold">Razgovori</div></q-card-section>
          <q-separator />
          <q-list separator>
            <q-item v-if="!razgovori.length">
              <q-item-section>
                <q-item-label>Nema razgovora.</q-item-label>
                <q-item-label caption>Otvori oglas i klikni “Otvori razgovor”.</q-item-label>
              </q-item-section>
            </q-item>
            <q-item v-for="r in razgovori" :key="r.broj_oglasa + ':' + r.email" clickable :active="isActive(r)" active-class="bg-blue-1" @click="openConversation(r)">
              <q-item-section>
                <q-item-label>{{ r.ime }} {{ r.prezime }}</q-item-label>
                <q-item-label caption>{{ r.naziv }}</q-item-label>
                <q-item-label caption class="ellipsis">{{ r.zadnja_poruka }}</q-item-label>
              </q-item-section>
              <q-item-section side><q-badge outline color="primary">#{{ r.broj_oglasa }}</q-badge></q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>

      <div class="col-12 col-md-8">
        <q-card class="chat-panel column">
          <template v-if="active">
            <q-card-section class="row items-center justify-between">
              <div>
                <div class="text-subtitle1 text-weight-bold">{{ active.ime }} {{ active.prezime }}</div>
                <div class="text-caption">Oglas: {{ active.naziv }} · #{{ active.broj_oglasa }}</div>
              </div>
              <q-btn flat dense label="Otvori oglas" :to="'/oglasi/' + active.broj_oglasa" />
            </q-card-section>
            <q-separator />
            <div ref="messagesBox" class="chat-messages">
              <div v-if="!poruke.length" class="text-grey text-center q-mt-lg">Još nema poruka u ovom razgovoru.</div>
              <div v-for="p in poruke" :key="p.datum_vrijeme + ':' + p.email_posiljatelja" class="chat-row" :class="p.email_posiljatelja === store.user.email ? 'mine' : 'theirs'">
                <div class="chat-bubble">
                  <div>{{ p.tekst }}</div>
                  <div class="chat-time">{{ p.datum_vrijeme }}</div>
                </div>
              </div>
            </div>
            <q-separator />
            <q-card-section>
              <div class="row q-col-gutter-sm items-end">
                <div class="col"><q-input outlined autogrow v-model="tekst" label="Napiši poruku" @keydown.enter.exact.prevent="send" /></div>
                <div><q-btn color="primary" label="Pošalji" :loading="sending" :disable="!tekst.trim()" @click="send" /></div>
              </div>
            </q-card-section>
          </template>
          <q-card-section v-else class="text-center text-grey">Odaberi razgovor s lijeve strane.</q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script>
import { api, store, connectSocket } from '../store.js';

export default {
  name: 'MessagesPage',
  data: () => ({ razgovori: [], poruke: [], active: null, tekst: '', sending: false, socket: null }),
  computed: {
    store() { return store; }
  },
  async mounted() {
    this.socket = connectSocket();
    this.socket?.on('poruka:nova', this.handleNewMessage);
    await this.loadRazgovori();
    await this.openFromRoute();
  },
  unmounted() {
    this.socket?.off('poruka:nova', this.handleNewMessage);
  },
  methods: {
    async loadRazgovori() {
      const { data } = await api.get('/razgovori');
      this.razgovori = data.razgovori || [];
    },
    async openFromRoute() {
      const oglas = this.$route.query.oglas;
      const email = this.$route.query.email;
      if (!oglas || !email) return;
      let r = this.razgovori.find(x => String(x.broj_oglasa) === String(oglas) && x.email === email);
      if (!r) {
        const { data } = await api.get('/oglasi/' + oglas);
        r = { broj_oglasa: Number(oglas), email, ime: data.oglas.ime, prezime: data.oglas.prezime, naziv: data.oglas.naziv, zadnja_poruka: '' };
      }
      await this.openConversation(r, false);
    },
    isActive(r) {
      return this.active && String(this.active.broj_oglasa) === String(r.broj_oglasa) && this.active.email === r.email;
    },
    async openConversation(r, updateRoute = true) {
      this.active = { ...r };
      const { data } = await api.get('/poruke/' + r.broj_oglasa + '/' + encodeURIComponent(r.email));
      this.poruke = data.poruke || [];
      if (updateRoute) this.$router.replace({ path: '/poruke', query: { oglas: r.broj_oglasa, email: r.email } });
      this.$nextTick(this.scrollBottom);
    },
    addMessage(p) {
      if (!p) return;
      const exists = this.poruke.some(x => x.datum_vrijeme === p.datum_vrijeme && x.email_posiljatelja === p.email_posiljatelja);
      if (!exists) this.poruke.push(p);
      this.$nextTick(this.scrollBottom);
    },
    async send() {
      if (!this.active || !this.tekst.trim()) return;
      const payload = { broj_oglasa: this.active.broj_oglasa, email_primatelja: this.active.email, tekst: this.tekst.trim() };
      this.sending = true;
      const socket = this.socket || connectSocket();
      if (socket?.connected) {
        socket.emit('poruka:posalji', payload, async resp => {
          this.sending = false;
          if (!resp?.ok) {
            this.$q.notify({ type: 'negative', message: resp?.message || 'Poruka nije poslana.' });
            return;
          }
          this.tekst = '';
          await this.loadRazgovori();
        });
      } else {
        try {
          const { data } = await api.post('/poruke', payload);
          this.tekst = '';
          this.addMessage(data.poruka);
          await this.loadRazgovori();
        } finally {
          this.sending = false;
        }
      }
    },
    async handleNewMessage(p) {
      const me = store.user?.email;
      if (!me) return;
      const other = p.email_posiljatelja === me ? p.email_primatelja : p.email_posiljatelja;
      const current = this.active && String(this.active.broj_oglasa) === String(p.broj_oglasa) && this.active.email === other;
      if (current) this.addMessage(p);
      else if (p.email_posiljatelja !== me) this.$q.notify({ type: 'info', message: 'Stigla je nova poruka.' });
      await this.loadRazgovori();
    },
    scrollBottom() {
      const el = this.$refs.messagesBox;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }
};
</script>
