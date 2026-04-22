<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-toolbar-title class="cursor-pointer" @click="$router.push('/')">Marketplace Oglasnik</q-toolbar-title>
        <q-btn flat label="Oglasi" to="/" />
        <template v-if="store.isAuth">
          <q-btn flat label="Novi oglas" to="/novi-oglas" />
          <q-btn flat label="Moji oglasi" to="/moje" />
          <q-btn flat label="Favoriti" to="/favoriti" />
          <q-btn flat label="Kupnje" to="/kupnje" />
          <q-btn flat label="Obavijesti" to="/obavijesti" />
          <q-btn flat label="Admin" v-if="store.isAdmin" to="/admin" />
          <q-btn-dropdown flat :label="store.user?.ime || 'Profil'">
            <q-list>
              <q-item clickable v-close-popup to="/profil"><q-item-section>Profil</q-item-section></q-item>
              <q-item clickable v-close-popup @click="logout"><q-item-section>Odjava</q-item-section></q-item>
            </q-list>
          </q-btn-dropdown>
        </template>
        <template v-else>
          <q-btn flat label="Prijava" to="/login" />
          <q-btn color="white" text-color="primary" label="Registracija" to="/register" />
        </template>
      </q-toolbar>
    </q-header>
    <q-page-container><router-view /></q-page-container>
  </q-layout>
</template>
<script setup>
import { store } from './store.js';
import { useRouter } from 'vue-router';
const router = useRouter();
function logout(){ store.logout(); router.push('/'); }
</script>
