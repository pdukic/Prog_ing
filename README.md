
Repozitorij za aplikaciju "WEB MARKETPLACE" 
kolegij: Programsko inženjerstvo
Sudionici: Andrej Gašparović, Patrik Dukić, Tomislav Mihelić

Marketplace / Oglasnik — Quasar Vue + Node.js + MySQL/MariaDB

Aplikacija je prilagođena za MySQL/MariaDB i HeidiSQL.

## Pravila pristupa

- Neregistrirani korisnik/gost može:
  - pregledavati oglase
  - pretraživati, filtrirati i sortirati oglase
  - otvoriti detalje oglasa
  - registrirati se ili prijaviti

- Registrirani korisnik može:
  - objaviti oglas
  - uređivati i brisati svoje oglase
  - kupiti oglas drugog korisnika
  - spremati favorite
  - prijaviti neprimjeren oglas
  - slati poruke
  - pisati recenziju nakon kupnje
  - pregledati kupnje, obavijesti i profil

- Administrator može:
  - pregledati korisnike
  - obrađivati prijave oglasa
  - ukloniti prijavljeni oglas

## 1. Baza u HeidiSQL-u

1. Otvori HeidiSQL.
2. Spoji se na MySQL ili MariaDB server.
3. Otvori file:

```txt
server/database/01_schema_and_seed.sql
```

4. Pokreni cijelu skriptu.

Skripta kreira bazu `marketplace_oglasnik`, sve tablice i početne podatke.

## 2. Backend

U folderu `server` kopiraj `.env.example` u `.env` i prilagodi podatke:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=marketplace_oglasnik
JWT_SECRET=promijeni_ovo_u_neki_dugi_tajni_tekst
```

Zatim:

```bash
cd server
npm install
npm run dev
```

API radi na:

```txt
http://localhost:3000/api
```

## 3. Frontend

U drugom terminalu:

```bash
cd client
npm install
npm run dev
```

Frontend radi na adresi koju Vite ispiše, obično:

```txt
http://localhost:5173
```

## Test računi

```txt
admin@oglasnik.hr / admin123
ivan.h@email.com / lozinka123
ana.m@email.com / lozinka123
marko.p@email.com / lozinka123
```

## Napomena za lozinke

Seed korisnici u SQL skripti imaju SHA2 hash radi jednostavnog importa kroz HeidiSQL. Backend to podržava. Novi korisnici registrirani kroz aplikaciju spremaju se sigurnije, pomoću bcrypt hasha.

## Popravak prikaza stranice

Ova verzija uklanja kružni import `App.vue -> main.js -> App.vue`, dodaje `src/store.js`,
puni `index.html` i Quasar Vite plugin. Ako se stranica prikazuje kao goli tekst,
obriši `client/node_modules` i `client/package-lock.json`, zatim ponovno pokreni `npm install`.


## V4 napomena

Frontend sada eksplicitno registrira Quasar komponente koje se koriste u inline Vue komponentama.
Ako browser javi `ERR_CONNECTION_REFUSED` za `localhost:3000`, backend nije pokrenut ili se ugasio.
>>>>>>> fba0d43 (Initial commit)
