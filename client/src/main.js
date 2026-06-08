import { createApp } from 'vue';
import '@quasar/extras/material-icons/material-icons.css';
import 'quasar/dist/quasar.css';
import './style.css';
import App from './App.vue';
import router from './router/index.js';
import { Quasar, Notify, Dialog, quasarComponents } from './quasar.js';

createApp(App)
  .use(router)
  .use(Quasar, {
    plugins: { Notify, Dialog },
    components: quasarComponents
  })
  .mount('#app');
