import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import {
  Quasar,
  Notify,
  Dialog,
  QLayout,
  QHeader,
  QToolbar,
  QToolbarTitle,
  QBtn,
  QBtnDropdown,
  QList,
  QItem,
  QItemSection,
  QItemLabel,
  QPageContainer,
  QPage,
  QCard,
  QCardSection,
  QCardActions,
  QImg,
  QBadge,
  QInput,
  QSelect,
  QBanner,
  QSeparator,
  QDialog,
  QRating,
  QTable,
  QTd,
  QTabs,
  QTab
} from 'quasar';
import '@quasar/extras/material-icons/material-icons.css';
import 'quasar/dist/quasar.css';
import './style.css';
import App from './App.vue';

import { api, store } from './store.js';

const Home = { template: `
<q-page class="q-pa-md">
  <div class="hero q-pa-lg q-mb-lg">
    <div><div class="text-h4 text-weight-bold">Marketplace / Oglasnik</div><div class="text-subtitle1">Gosti mogu pregledavati oglase. Za objavu, kupnju, prijave, favorite, chat i recenzije potrebna je registracija.</div></div>
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
      <q-card class="ad-card cursor-pointer" @click="$router.push('/oglasi/'+o.broj_oglasa)">
        <q-img :src="o.slika_url || fallback" height="180px"><q-badge class="q-ma-sm" :color="o.status==='aktivan'?'green':'grey'">{{ o.status }}</q-badge></q-img>
        <q-card-section><div class="text-h6 ellipsis">{{ o.naziv }}</div><div class="text-primary text-h6">{{ Number(o.cijena).toFixed(2) }} €</div><div class="text-grey-7">{{ o.kategorija }} · {{ o.lokacija }}</div><div class="text-caption">Prodavač: {{ o.ime }} {{ o.prezime }} <span v-if="o.prosjecna_ocjena">⭐ {{ o.prosjecna_ocjena }}</span></div></q-card-section>
      </q-card>
    </div>
  </div>
</q-page>`, data(){ return { store, oglasi: [], filters: {q:'',kategorija:'',lokacija:'',max:'',sort:'new'}, kategorije:['Elektronika','Sport','Namještaj','Glazba','Odjeća','Auto','Ostalo'], sortovi:[{label:'Najnovije',value:'new'},{label:'Cijena ↑',value:'price_asc'},{label:'Cijena ↓',value:'price_desc'}], fallback:'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=900' } }, async mounted(){ await this.load(); }, methods:{ async load(){ try { const {data}=await api.get('/oglasi',{params:this.filters}); this.oglasi=data.oglasi; } catch(e) { this.$q.notify({type:'warning', message:'Ne mogu dohvatiti oglase. Pokreni backend i provjeri bazu.'}); } } } };

const Login = { template:`<q-page class="auth"><q-card class="auth-card"><q-card-section><div class="text-h5">Prijava</div></q-card-section><q-card-section><q-input outlined v-model="email" label="Email"/><q-input class="q-mt-sm" outlined v-model="lozinka" type="password" label="Lozinka"/><q-btn class="q-mt-md full-width" color="primary" label="Prijavi se" @click="submit"/><div class="q-mt-sm">Nemaš račun? <router-link to="/register">Registracija</router-link></div></q-card-section></q-card></q-page>`, data:()=>({email:'admin@oglasnik.hr',lozinka:'admin123'}), methods:{async submit(){const {data}=await api.post('/auth/login',this.$data); store.login(data); this.$router.push('/');}} };
const Register = { template:`<q-page class="auth"><q-card class="auth-card"><q-card-section><div class="text-h5">Registracija</div></q-card-section><q-card-section><q-input outlined v-model="form.email" label="Email"/><q-input class="q-mt-sm" outlined v-model="form.ime" label="Ime"/><q-input class="q-mt-sm" outlined v-model="form.prezime" label="Prezime"/><q-input class="q-mt-sm" outlined v-model="form.lokacija" label="Lokacija"/><q-input class="q-mt-sm" outlined v-model="form.lozinka" type="password" label="Lozinka"/><q-btn class="q-mt-md full-width" color="primary" label="Kreiraj račun" @click="submit"/></q-card-section></q-card></q-page>`, data:()=>({form:{email:'',ime:'',prezime:'',lokacija:'',lozinka:''}}), methods:{async submit(){const {data}=await api.post('/auth/register',this.form); store.login(data); this.$router.push('/');}} };

const Detail = { template:`
<q-page class="q-pa-md" v-if="oglas">
  <q-card><q-img :src="oglas.slika_url || fallback" height="280px"/><q-card-section><div class="row items-start justify-between"><div><div class="text-h4">{{ oglas.naziv }}</div><div class="text-h5 text-primary">{{ Number(oglas.cijena).toFixed(2) }} €</div><div>{{ oglas.kategorija }} · {{ oglas.lokacija }} · status: <b>{{ oglas.status }}</b></div><div>Prodavač: {{ oglas.ime }} {{ oglas.prezime }} ({{ oglas.email }}) <span v-if="oglas.prosjecna_ocjena">⭐ {{ oglas.prosjecna_ocjena }}</span></div></div><q-badge :color="oglas.status==='aktivan'?'green':'grey'">{{ oglas.status }}</q-badge></div><q-separator class="q-my-md"/><p>{{ oglas.opis }}</p>
  <q-banner v-if="!store.isAuth" class="bg-orange-1 text-orange-10">Prijavi se ili registriraj za kupnju, favorite, prijavu oglasa, chat i recenzije.</q-banner>
  <div v-else class="q-gutter-sm"><q-btn color="positive" label="Kupi" :disable="oglas.status!=='aktivan' || oglas.email===store.user.email" @click="kupi"/><q-btn color="primary" outline label="Dodaj u favorite" @click="fav"/><q-btn color="negative" outline label="Prijavi oglas" @click="report"/><q-btn color="secondary" outline label="Pošalji poruku" @click="chatOpen=true"/><q-btn v-if="oglas.email===store.user.email || store.isAdmin" color="warning" outline label="Uredi" :to="'/uredi-oglas/'+oglas.broj_oglasa"/></div></q-card-section></q-card>
  <q-card class="q-mt-md"><q-card-section><div class="text-h6">Recenzije prodavača</div><div v-if="!recenzije.length">Još nema recenzija.</div><q-list><q-item v-for="r in recenzije"><q-item-section><q-item-label>⭐ {{ r.ocjena }} — {{ r.ime_ocjenjivaca }}</q-item-label><q-item-label caption>{{ r.komentar }}</q-item-label></q-item-section></q-item></q-list><div v-if="store.isAuth" class="row q-col-gutter-sm q-mt-sm"><div class="col-12 col-md-2"><q-rating v-model="review.ocjena" max="5"/></div><div class="col"><q-input outlined dense v-model="review.komentar" label="Komentar nakon kupnje"/></div><div><q-btn color="primary" label="Spremi" @click="reviewPost"/></div></div></q-card-section></q-card>
  <q-dialog v-model="chatOpen"><q-card style="min-width:420px"><q-card-section><div class="text-h6">Poruka prodavaču</div></q-card-section><q-card-section><q-input type="textarea" outlined v-model="tekst" label="Tekst poruke"/></q-card-section><q-card-actions align="right"><q-btn flat label="Odustani" v-close-popup/><q-btn color="primary" label="Pošalji" @click="sendMsg"/></q-card-actions></q-card></q-dialog>
</q-page>`, data:()=>({oglas:null,recenzije:[],fallback:'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=900',chatOpen:false,tekst:'',review:{ocjena:5,komentar:''}}), computed:{store(){return store}}, async mounted(){await this.load()}, methods:{async load(){const {data}=await api.get('/oglasi/'+this.$route.params.id); this.oglas=data.oglas; this.recenzije=data.recenzije;}, async kupi(){await api.post('/oglasi/'+this.oglas.broj_oglasa+'/kupi'); this.$q.notify({type:'positive',message:'Kupnja uspješna'}); await this.load();}, async fav(){await api.post('/oglasi/'+this.oglas.broj_oglasa+'/favorit'); this.$q.notify({type:'positive',message:'Spremljeno u favorite'});}, report(){this.$q.dialog({title:'Prijava oglasa',prompt:{model:'',type:'textarea',label:'Razlog'},cancel:true,persistent:true}).onOk(async razlog=>{await api.post('/oglasi/'+this.oglas.broj_oglasa+'/prijava',{razlog});});}, async sendMsg(){await api.post('/poruke',{broj_oglasa:this.oglas.broj_oglasa,email_primatelja:this.oglas.email,tekst:this.tekst}); this.chatOpen=false; this.tekst='';}, async reviewPost(){await api.post('/oglasi/'+this.oglas.broj_oglasa+'/recenzija',this.review); await this.load();}} };

const OglasForm = { template:`<q-page class="q-pa-md"><q-card class="q-pa-md"><div class="text-h5 q-mb-md">{{ editing ? 'Uredi oglas' : 'Objavi oglas' }}</div><div class="row q-col-gutter-md"><q-input class="col-12 col-md-6" outlined v-model="form.naziv" label="Naziv"/><q-input class="col-12 col-md-3" outlined type="number" v-model="form.cijena" label="Cijena"/><q-select class="col-12 col-md-3" outlined v-model="form.kategorija" :options="kategorije" label="Kategorija"/><q-input class="col-12 col-md-6" outlined v-model="form.lokacija" label="Lokacija"/><q-input class="col-12 col-md-6" outlined v-model="form.slika_url" label="URL slike"/><q-input class="col-12" outlined type="textarea" v-model="form.opis" label="Opis"/></div><q-btn class="q-mt-md" color="primary" :label="editing?'Spremi':'Objavi'" @click="save"/></q-card></q-page>`, data:()=>({form:{naziv:'',opis:'',cijena:0,kategorija:'',lokacija:'',slika_url:''}, kategorije:['Elektronika','Sport','Namještaj','Glazba','Odjeća','Auto','Ostalo']}), computed:{editing(){return !!this.$route.params.id}}, async mounted(){if(this.editing){const {data}=await api.get('/oglasi/'+this.$route.params.id); this.form=data.oglas;}}, methods:{async save(){if(this.editing) await api.put('/oglasi/'+this.$route.params.id,this.form); else await api.post('/oglasi',this.form); this.$router.push('/moje');}} };
const Mine = { template:`<q-page class="q-pa-md"><div class="text-h5 q-mb-md">Moji oglasi</div><q-btn color="primary" label="Novi oglas" to="/novi-oglas" class="q-mb-md"/><q-table :rows="oglasi" :columns="cols" row-key="broj_oglasa"><template #body-cell-actions="p"><q-td><q-btn dense flat icon="edit" :to="'/uredi-oglas/'+p.row.broj_oglasa"/><q-btn dense flat color="negative" icon="delete" @click="del(p.row)"/></q-td></template></q-table></q-page>`, data:()=>({oglasi:[],cols:[{name:'broj_oglasa',label:'ID',field:'broj_oglasa'},{name:'naziv',label:'Naziv',field:'naziv',align:'left'},{name:'cijena',label:'Cijena',field:'cijena'},{name:'status',label:'Status',field:'status'},{name:'actions',label:'Akcije'}]}), async mounted(){await this.load()}, methods:{async load(){this.oglasi=(await api.get('/moji-oglasi')).data.oglasi}, async del(r){await api.delete('/oglasi/'+r.broj_oglasa); await this.load();}} };
const Favorites = { template:`<q-page class="q-pa-md"><div class="text-h5 q-mb-md">Favoriti</div><q-list bordered separator><q-item v-for="o in rows" clickable :to="'/oglasi/'+o.broj_oglasa"><q-item-section><q-item-label>{{o.naziv}} — {{o.cijena}} €</q-item-label><q-item-label caption>{{o.kategorija}} · {{o.lokacija}}</q-item-label></q-item-section><q-item-section side><q-btn flat color="negative" icon="delete" @click.prevent="remove(o)"/></q-item-section></q-item></q-list></q-page>`, data:()=>({rows:[]}), async mounted(){this.rows=(await api.get('/favoriti')).data.favoriti}, methods:{async remove(o){await api.delete('/oglasi/'+o.broj_oglasa+'/favorit'); this.rows=(await api.get('/favoriti')).data.favoriti}} };
const Purchases = { template:`<q-page class="q-pa-md"><div class="text-h5 q-mb-md">Povijest kupnji</div><q-table :rows="rows" :columns="cols" row-key="broj_oglasa"/></q-page>`, data:()=>({rows:[],cols:[{name:'broj_oglasa',label:'Oglas',field:'broj_oglasa'},{name:'naziv',label:'Naziv',field:'naziv',align:'left'},{name:'cijena',label:'Cijena',field:'cijena'},{name:'datum_prodaje',label:'Datum',field:'datum_prodaje'}]}), async mounted(){this.rows=(await api.get('/kupnje')).data.kupnje} };
const Profile = { template:`<q-page class="q-pa-md"><q-card class="q-pa-md"><div class="text-h5 q-mb-md">Profil</div><q-input outlined v-model="form.ime" label="Ime"/><q-input class="q-mt-sm" outlined v-model="form.prezime" label="Prezime"/><q-input class="q-mt-sm" outlined v-model="form.lokacija" label="Lokacija"/><q-input class="q-mt-sm" outlined type="password" v-model="form.lozinka" label="Nova lozinka (opcionalno)"/><q-btn class="q-mt-md" color="primary" label="Spremi" @click="save"/></q-card></q-page>`, data:()=>({form:{...store.user,lozinka:''}}), methods:{async save(){const {data}=await api.put('/me',this.form); store.user=data.user; localStorage.setItem('user',JSON.stringify(data.user)); this.$q.notify({type:'positive',message:'Profil spremljen'});}} };
const Notices = { template:`<q-page class="q-pa-md"><div class="text-h5 q-mb-md">Obavijesti</div><q-list bordered separator><q-item v-for="o in rows"><q-item-section><q-item-label>{{o.sadrzaj}}</q-item-label><q-item-label caption>{{o.datum_vrijeme}}</q-item-label></q-item-section><q-item-section side><q-badge :color="o.procitano?'grey':'primary'">{{o.procitano?'pročitano':'novo'}}</q-badge></q-item-section></q-item></q-list></q-page>`, data:()=>({rows:[]}), async mounted(){this.rows=(await api.get('/obavijesti')).data.obavijesti} };
const Admin = { template:`<q-page class="q-pa-md"><div class="text-h5 q-mb-md">Admin panel</div><q-tabs v-model="tab"><q-tab name="prijave" label="Prijave oglasa"/><q-tab name="korisnici" label="Korisnici"/></q-tabs><q-separator/><div v-if="tab==='prijave'" class="q-mt-md"><q-table :rows="prijave" :columns="pcols" row-key="broj_oglasa"><template #body-cell-actions="p"><q-td><q-btn dense color="positive" label="Odobri" @click="obradi(p.row,'odobrena',true)"/><q-btn dense flat label="Odbij" @click="obradi(p.row,'odbijena',false)"/></q-td></template></q-table></div><div v-else class="q-mt-md"><q-table :rows="korisnici" :columns="kcols" row-key="email"/></div></q-page>`, data:()=>({tab:'prijave',prijave:[],korisnici:[],pcols:[{name:'broj_oglasa',label:'Oglas',field:'broj_oglasa'},{name:'naziv',label:'Naziv',field:'naziv',align:'left'},{name:'email_prijavitelja',label:'Prijavio',field:'email_prijavitelja'},{name:'razlog',label:'Razlog',field:'razlog',align:'left'},{name:'status',label:'Status',field:'status'},{name:'actions',label:'Akcije'}],kcols:[{name:'email',label:'Email',field:'email',align:'left'},{name:'ime',label:'Ime',field:'ime'},{name:'prezime',label:'Prezime',field:'prezime'},{name:'lokacija',label:'Lokacija',field:'lokacija'},{name:'uloga',label:'Uloga',field:'uloga'}]}), async mounted(){await this.load()}, methods:{async load(){this.prijave=(await api.get('/admin/prijave')).data.prijave; this.korisnici=(await api.get('/admin/korisnici')).data.korisnici}, async obradi(r,status,ukloniOglas){await api.put('/admin/prijave',{...r,status,ukloniOglas}); await this.load();}} };

const routes = [
  {path:'/',component:Home}, {path:'/login',component:Login}, {path:'/register',component:Register}, {path:'/oglasi/:id',component:Detail},
  {path:'/novi-oglas',component:OglasForm,meta:{auth:true}}, {path:'/uredi-oglas/:id',component:OglasForm,meta:{auth:true}}, {path:'/moje',component:Mine,meta:{auth:true}}, {path:'/favoriti',component:Favorites,meta:{auth:true}}, {path:'/kupnje',component:Purchases,meta:{auth:true}}, {path:'/profil',component:Profile,meta:{auth:true}}, {path:'/obavijesti',component:Notices,meta:{auth:true}}, {path:'/admin',component:Admin,meta:{auth:true,admin:true}}
];
const router = createRouter({ history:createWebHistory(), routes });
router.beforeEach((to)=>{ if(to.meta.auth && !store.isAuth) return '/login'; if(to.meta.admin && !store.isAdmin) return '/'; });

createApp(App)
  .use(router)
  .use(Quasar, {
    plugins: { Notify, Dialog },
    components: {
      QLayout,
      QHeader,
      QToolbar,
      QToolbarTitle,
      QBtn,
      QBtnDropdown,
      QList,
      QItem,
      QItemSection,
      QItemLabel,
      QPageContainer,
      QPage,
      QCard,
      QCardSection,
      QCardActions,
      QImg,
      QBadge,
      QInput,
      QSelect,
      QBanner,
      QSeparator,
      QDialog,
      QRating,
      QTable,
      QTd,
      QTabs,
      QTab
    }
  })
  .mount('#app');
