-- Marketplace/Oglasnik baza za MySQL ili MariaDB
-- U HeidiSQL-u pokreni cijelu skriptu: Query -> Run.

CREATE DATABASE IF NOT EXISTS marketplace_oglasnik
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE marketplace_oglasnik;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS obavijest;
DROP TABLE IF EXISTS poruka;
DROP TABLE IF EXISTS recenzija;
DROP TABLE IF EXISTS prodaja;
DROP TABLE IF EXISTS favoriti;
DROP TABLE IF EXISTS prijava;
DROP TABLE IF EXISTS oglas;
DROP TABLE IF EXISTS korisnik;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE korisnik (
  email VARCHAR(100) PRIMARY KEY,
  ime VARCHAR(50) NOT NULL,
  prezime VARCHAR(50) NOT NULL,
  lozinka VARCHAR(255) NOT NULL,
  lokacija VARCHAR(100),
  uloga ENUM('korisnik','admin') NOT NULL DEFAULT 'korisnik',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE oglas (
  broj_oglasa INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(100) NOT NULL,
  naziv VARCHAR(120) NOT NULL,
  opis TEXT,
  cijena DECIMAL(10,2) NOT NULL,
  kategorija VARCHAR(60),
  status ENUM('aktivan','prodan','obrisan','neaktivan') NOT NULL DEFAULT 'aktivan',
  lokacija VARCHAR(100),
  slika_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (email) REFERENCES korisnik(email) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE prodaja (
  broj_oglasa INT PRIMARY KEY,
  email_kupca VARCHAR(100) NOT NULL,
  email_prodavaca VARCHAR(100) NOT NULL,
  datum_prodaje DATE NOT NULL,
  FOREIGN KEY (broj_oglasa) REFERENCES oglas(broj_oglasa) ON DELETE CASCADE,
  FOREIGN KEY (email_kupca) REFERENCES korisnik(email) ON DELETE CASCADE,
  FOREIGN KEY (email_prodavaca) REFERENCES korisnik(email) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE recenzija (
  broj_oglasa INT PRIMARY KEY,
  email_ocjenjivaca VARCHAR(100) NOT NULL,
  email_ocjenjenog VARCHAR(100) NOT NULL,
  ocjena INT NOT NULL CHECK (ocjena BETWEEN 1 AND 5),
  komentar TEXT,
  datum_recenzije TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (broj_oglasa) REFERENCES prodaja(broj_oglasa) ON DELETE CASCADE,
  FOREIGN KEY (email_ocjenjivaca) REFERENCES korisnik(email) ON DELETE CASCADE,
  FOREIGN KEY (email_ocjenjenog) REFERENCES korisnik(email) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE prijava (
  broj_oglasa INT NOT NULL,
  email_prijavitelja VARCHAR(100) NOT NULL,
  razlog TEXT NOT NULL,
  status ENUM('na cekanju','odobrena','odbijena','obradena') NOT NULL DEFAULT 'na cekanju',
  datum_prijave TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (broj_oglasa, email_prijavitelja),
  FOREIGN KEY (broj_oglasa) REFERENCES oglas(broj_oglasa) ON DELETE CASCADE,
  FOREIGN KEY (email_prijavitelja) REFERENCES korisnik(email) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE favoriti (
  email VARCHAR(100) NOT NULL,
  broj_oglasa INT NOT NULL,
  datum_spremanja DATE NOT NULL,
  PRIMARY KEY (email, broj_oglasa),
  FOREIGN KEY (email) REFERENCES korisnik(email) ON DELETE CASCADE,
  FOREIGN KEY (broj_oglasa) REFERENCES oglas(broj_oglasa) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE poruka (
  datum_vrijeme DATETIME(6) NOT NULL,
  email_posiljatelja VARCHAR(100) NOT NULL,
  broj_oglasa INT NOT NULL,
  email_primatelja VARCHAR(100) NOT NULL,
  tekst TEXT NOT NULL,
  PRIMARY KEY (datum_vrijeme, email_posiljatelja),
  FOREIGN KEY (email_posiljatelja) REFERENCES korisnik(email) ON DELETE CASCADE,
  FOREIGN KEY (email_primatelja) REFERENCES korisnik(email) ON DELETE CASCADE,
  FOREIGN KEY (broj_oglasa) REFERENCES oglas(broj_oglasa) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE obavijest (
  id INT AUTO_INCREMENT PRIMARY KEY,
  datum_vrijeme DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  email VARCHAR(100) NOT NULL,
  sadrzaj TEXT NOT NULL,
  procitano BOOLEAN NOT NULL DEFAULT FALSE,
  FOREIGN KEY (email) REFERENCES korisnik(email) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Seed korisnici. Lozinke su SHA2 hash zbog lakog importiranja u HeidiSQL.
-- Backend podržava i SHA2 seed lozinke i bcrypt lozinke novih registracija.
INSERT INTO korisnik (email, ime, prezime, lozinka, lokacija, uloga) VALUES
('admin@oglasnik.hr','Admin','Oglasnik', SHA2('admin123',256), 'Zagreb', 'admin'),
('ivan.h@email.com','Ivan','Horvat', SHA2('lozinka123',256), 'Rijeka', 'korisnik'),
('ana.m@email.com','Ana','Matić', SHA2('lozinka123',256), 'Split', 'korisnik'),
('marko.p@email.com','Marko','Perić', SHA2('lozinka123',256), 'Osijek', 'korisnik');

INSERT INTO oglas (email,naziv,opis,cijena,kategorija,status,lokacija,slika_url) VALUES
('ivan.h@email.com','Bicikl Nakamura','Malo rabljen gradski bicikl, crne boje, očuvan.',150.00,'Sport','aktivan','Rijeka','https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=900'),
('ana.m@email.com','Laptop Lenovo ThinkPad','Pouzdan laptop, 16 GB RAM, SSD 512 GB.',420.00,'Elektronika','aktivan','Split','https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=900'),
('marko.p@email.com','Kauč trosjed','Udoban trosjed, potrebno osobno preuzimanje.',95.00,'Namještaj','aktivan','Osijek','https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=900'),
('ivan.h@email.com','Gitara Yamaha','Akustična gitara u odličnom stanju.',180.00,'Glazba','aktivan','Rijeka','https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=900'),
('ana.m@email.com','Mobitel Samsung','Rabljeni mobitel, sitne ogrebotine, radi uredno.',210.00,'Elektronika','aktivan','Split','https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=900');

INSERT INTO favoriti (email, broj_oglasa, datum_spremanja) VALUES
('ana.m@email.com',1,CURDATE()),
('ivan.h@email.com',2,CURDATE());

INSERT INTO prijava (broj_oglasa,email_prijavitelja,razlog,status) VALUES
(3,'ivan.h@email.com','Opis je premalo detaljan, moguće netočne informacije.','na cekanju');

INSERT INTO obavijest (email,sadrzaj) VALUES
('ivan.h@email.com','Dobrodošli u oglasnik.'),
('ana.m@email.com','Imate spremljen oglas u favoritima.');
