-- Marketplace/Oglasnik baza za MariaDB/MySQL na serveru ucka.veleri.hr
-- Baza se već zove agasparov, zato se NE kreira nova baza.
-- U HeidiSQL-u se spoji na bazu agasparov i pokreni cijelu skriptu.
-- Skripta ne briše tablice ni podatke; za čist početak tablice prethodno obriši ručno ako želiš.

USE agasparov;

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 1. Tablica KORISNIK
CREATE TABLE IF NOT EXISTS KORISNIK (
    EMAIL VARCHAR(100) PRIMARY KEY,
    IME VARCHAR(50) NOT NULL,
    PREZIME VARCHAR(50) NOT NULL,
    LOZINKA VARCHAR(255) NOT NULL,
    LOKACIJA VARCHAR(100),
    ULOGA VARCHAR(20)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tablica OGLAS
CREATE TABLE IF NOT EXISTS OGLAS (
    BROJ_OGLASA INT PRIMARY KEY,
    EMAIL VARCHAR(100) NOT NULL,
    NAZIV VARCHAR(100) NOT NULL,
    OPIS TEXT,
    CIJENA DECIMAL(10, 2) NOT NULL,
    KATEGORIJA VARCHAR(50),
    STATUS VARCHAR(20),
    LOKACIJA VARCHAR(100),
    SLIKA_URL VARCHAR(500),
    FOREIGN KEY (EMAIL) REFERENCES KORISNIK(EMAIL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tablica PRODAJA
CREATE TABLE IF NOT EXISTS PRODAJA (
    BROJ_OGLASA INT PRIMARY KEY,
    EMAIL_KUPCA VARCHAR(100) NOT NULL,
    `EMAIL_PRODAVAČA` VARCHAR(100) NOT NULL,
    DATUM_PRODAJE DATE NOT NULL,
    FOREIGN KEY (BROJ_OGLASA) REFERENCES OGLAS(BROJ_OGLASA),
    FOREIGN KEY (EMAIL_KUPCA) REFERENCES KORISNIK(EMAIL),
    FOREIGN KEY (`EMAIL_PRODAVAČA`) REFERENCES KORISNIK(EMAIL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tablica RECENZIJA
CREATE TABLE IF NOT EXISTS RECENZIJA (
    BROJ_OGLASA INT PRIMARY KEY,
    OCJENA INT CHECK (OCJENA BETWEEN 1 AND 5),
    KOMENTAR TEXT,
    FOREIGN KEY (BROJ_OGLASA) REFERENCES PRODAJA(BROJ_OGLASA)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tablica PORUKA
-- DATETIME(6) je korišten jer je DATUM_VRIJEME dio primarnog ključa i aplikacija može poslati više poruka u istoj sekundi.
CREATE TABLE IF NOT EXISTS PORUKA (
    DATUM_VRIJEME DATETIME(6),
    `EMAIL_POŠILJATELJA` VARCHAR(100),
    BROJ_OGLASA INT NOT NULL,
    EMAIL_PRIMATELJA VARCHAR(100) NOT NULL,
    TEKST TEXT NOT NULL,
    PRIMARY KEY (DATUM_VRIJEME, `EMAIL_POŠILJATELJA`),
    FOREIGN KEY (`EMAIL_POŠILJATELJA`) REFERENCES KORISNIK(EMAIL),
    FOREIGN KEY (EMAIL_PRIMATELJA) REFERENCES KORISNIK(EMAIL),
    FOREIGN KEY (BROJ_OGLASA) REFERENCES OGLAS(BROJ_OGLASA)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Tablica PRIJAVA
CREATE TABLE IF NOT EXISTS PRIJAVA (
    BROJ_OGLASA INT,
    EMAIL_PRIJAVITELJA VARCHAR(100),
    RAZLOG TEXT NOT NULL,
    STATUS VARCHAR(20),
    PRIMARY KEY (BROJ_OGLASA, EMAIL_PRIJAVITELJA),
    FOREIGN KEY (BROJ_OGLASA) REFERENCES OGLAS(BROJ_OGLASA),
    FOREIGN KEY (EMAIL_PRIJAVITELJA) REFERENCES KORISNIK(EMAIL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Tablica FAVORITI
CREATE TABLE IF NOT EXISTS FAVORITI (
    EMAIL VARCHAR(100),
    BROJ_OGLASA INT,
    DATUM_SPREMANJA DATE,
    PRIMARY KEY (EMAIL, BROJ_OGLASA),
    FOREIGN KEY (EMAIL) REFERENCES KORISNIK(EMAIL),
    FOREIGN KEY (BROJ_OGLASA) REFERENCES OGLAS(BROJ_OGLASA)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Tablica OBAVIJEST
-- DATETIME(6) je korišten jer je DATUM_VRIJEME dio primarnog ključa i može postojati više obavijesti za isti email u istoj sekundi.
CREATE TABLE IF NOT EXISTS OBAVIJEST (
    DATUM_VRIJEME DATETIME(6),
    EMAIL VARCHAR(100),
    `SADRŽAJ` TEXT NOT NULL,
    `PROČITANO` BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (DATUM_VRIJEME, EMAIL),
    FOREIGN KEY (EMAIL) REFERENCES KORISNIK(EMAIL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Početni korisnici. Lozinke su SHA2 hash zbog lakog importiranja kroz HeidiSQL.
-- Backend podržava SHA2 seed lozinke i bcrypt lozinke novih registracija.
INSERT IGNORE INTO KORISNIK (EMAIL, IME, PREZIME, LOZINKA, LOKACIJA, ULOGA) VALUES
('admin@oglasnik.hr','Admin','Oglasnik', SHA2('admin123',256), 'Zagreb', 'admin'),
('ivan.h@email.com','Ivan','Horvat', SHA2('lozinka123',256), 'Rijeka', 'korisnik'),
('ana.m@email.com','Ana','Matić', SHA2('lozinka123',256), 'Split', 'korisnik'),
('marko.p@email.com','Marko','Perić', SHA2('lozinka123',256), 'Osijek', 'korisnik');

INSERT IGNORE INTO OGLAS (BROJ_OGLASA, EMAIL, NAZIV, OPIS, CIJENA, KATEGORIJA, STATUS, LOKACIJA, SLIKA_URL) VALUES
(1,'ivan.h@email.com','Bicikl Nakamura','Malo rabljen gradski bicikl, crne boje, očuvan.',150.00,'Sport','aktivan','Rijeka','https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=900'),
(2,'ana.m@email.com','Laptop Lenovo ThinkPad','Pouzdan laptop, 16 GB RAM, SSD 512 GB.',420.00,'Elektronika','aktivan','Split','https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=900'),
(3,'marko.p@email.com','Kauč trosjed','Udoban trosjed, potrebno osobno preuzimanje.',95.00,'Namještaj','aktivan','Osijek','https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=900'),
(4,'ivan.h@email.com','Gitara Yamaha','Akustična gitara u odličnom stanju.',180.00,'Glazba','aktivan','Rijeka','https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=900'),
(5,'ana.m@email.com','Mobitel Samsung','Rabljeni mobitel, sitne ogrebotine, radi uredno.',210.00,'Elektronika','aktivan','Split','https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=900');

INSERT IGNORE INTO FAVORITI (EMAIL, BROJ_OGLASA, DATUM_SPREMANJA) VALUES
('ana.m@email.com',1,CURDATE()),
('ivan.h@email.com',2,CURDATE());

INSERT IGNORE INTO PRIJAVA (BROJ_OGLASA, EMAIL_PRIJAVITELJA, RAZLOG, STATUS) VALUES
(3,'ivan.h@email.com','Opis je premalo detaljan, moguće netočne informacije.','na cekanju');

INSERT IGNORE INTO OBAVIJEST (DATUM_VRIJEME, EMAIL, `SADRŽAJ`, `PROČITANO`) VALUES
('2025-01-01 08:00:00.000000', 'ivan.h@email.com','Dobrodošli u oglasnik.', FALSE),
('2025-01-01 08:00:01.000000', 'ana.m@email.com','Imate spremljen oglas u favoritima.', FALSE);
