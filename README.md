Repozitorij za aplikaciju "WEB MARKETPLACE"
kolegij: Programsko inženjerstvo
Sudionici: Andrej Gašparović, Patrik Dukić, Tomislav Mihelić

# Marketplace / Oglasnik — Quasar Vue + Node.js + MariaDB

Aplikacija koristi MariaDB bazu na serveru `ucka.veleri.hr`, korisnika `agasparov` i bazu `agasparov`. Chat između korisnika radi preko Socket.IO u realnom vremenu.

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
  - slati poruke i razgovarati u realnom vremenu
  - pisati recenziju nakon kupnje
  - pregledati kupnje, obavijesti i profil

- Administrator može:
  - pregledati korisnike
  - obrađivati prijave oglasa
  - ukloniti prijavljeni oglas

## 1. Baza u HeidiSQL-u

1. Otvori HeidiSQL.
2. Spoji se na MariaDB server:

```txt
Host: ucka.veleri.hr
User: agasparov
Password: 11
Database: agasparov
Port: 3306
```

3. Otvori file:

```txt
server/database/01_schema_and_seed.sql
```

4. Pokreni cijelu skriptu.

Skripta koristi tablice:

```txt
KORISNIK, OGLAS, PRODAJA, RECENZIJA, PORUKA, PRIJAVA, FAVORITI, OBAVIJEST
```

Skripta ne kreira novu bazu `marketplace_oglasnik`, nego koristi postojeću bazu `agasparov`.

## 2. Backend

`.env` datoteka u folderu `server`:

```env
PORT=3000
DB_HOST=ucka.veleri.hr
DB_PORT=3306
DB_USER=agasparov
DB_PASSWORD=11
DB_NAME=agasparov
JWT_SECRET=super_tajna_lozinka
```

Pokretanje backenda:

```bash
cd server
npm install
npm run dev
```

API i Socket.IO rade na:

```txt
http://localhost:3000/api
```

Socket.IO koristi isti backend host:

```txt
http://localhost:3000
```

Brza provjera:

```txt
http://localhost:3000/api/health
```

## 3. Frontend

U drugom terminalu:

```bash
cd client
npm install
npm run dev
```

Frontend radi na adresi koju Vite ispiše, najčešće:

```txt
http://localhost:5173
```

Frontend i dalje komunicira s lokalnim backendom na:

```txt
http://localhost:3000/api
```

Samo backend se spaja na udaljenu MariaDB bazu.

## Test računi

```txt
admin@oglasnik.hr / admin123
ivan.h@email.com / lozinka123
ana.m@email.com / lozinka123
marko.p@email.com / lozinka123
```

## Napomena za lozinke

Seed korisnici u SQL skripti imaju SHA2 hash radi jednostavnog importa kroz HeidiSQL. Backend podržava SHA2 seed lozinke i bcrypt lozinke novih registracija.

## Važna napomena o shemi

Aplikacija je prilagođena zadanoj shemi s velikim imenima tablica i stupaca. Budući da tablice `PORUKA` i `OBAVIJEST` imaju složeni primarni ključ koji uključuje `DATUM_VRIJEME`, u SQL skripti je korišten `DATETIME(6)` kako ne bi došlo do konflikta ako se više poruka ili obavijesti spremi u istoj sekundi.


## Real-time chat

U aplikaciji je dodana stranica:

```txt
/poruke
```

Korisnik može otvoriti oglas i kliknuti **Otvori razgovor**. Tada se otvara razgovor između prijavljenog korisnika i prodavača za taj oglas. Poruke se spremaju u tablicu `PORUKA`, a preko Socket.IO se odmah prikazuju drugom korisniku bez osvježavanja stranice.

Za test real-time chata najlakše je otvoriti aplikaciju u dva različita browsera ili jedan normalni prozor i jedan incognito prozor, zatim se prijaviti s dva različita korisnika.
