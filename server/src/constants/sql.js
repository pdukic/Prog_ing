export const userSelect = `
  EMAIL AS email,
  IME AS ime,
  PREZIME AS prezime,
  LOKACIJA AS lokacija,
  ULOGA AS uloga
`;

export const oglasSelect = `
  o.BROJ_OGLASA AS broj_oglasa,
  o.EMAIL AS email,
  o.NAZIV AS naziv,
  o.OPIS AS opis,
  o.CIJENA AS cijena,
  o.KATEGORIJA AS kategorija,
  o.STATUS AS status,
  o.LOKACIJA AS lokacija,
  o.SLIKA_URL AS slika_url
`;

export const prodajaSelect = `
  p.BROJ_OGLASA AS broj_oglasa,
  p.EMAIL_KUPCA AS email_kupca,
  p.\`EMAIL_PRODAVAČA\` AS email_prodavaca,
  p.DATUM_PRODAJE AS datum_prodaje
`;
