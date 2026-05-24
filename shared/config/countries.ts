/**
 * ISO-3166 alpha-2 country list, sorted by English name.
 *
 * Derived from the standard alpha-2 codes plus Node's
 * Intl.DisplayNames for English country names. Computed once at
 * module load and frozen.
 *
 * Used by the studio-admin form to pick the studio's country.
 * Names render in the admin UI only (English); public site copy
 * never displays the country name directly.
 */
// All officially-assigned ISO-3166-1 alpha-2 codes as of 2026.
// (Verified against https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2.
// Reserved / transitional codes intentionally excluded.)
const ALPHA2_CODES = [
  "AD","AE","AF","AG","AI","AL","AM","AO","AQ","AR","AS","AT","AU","AW","AX","AZ",
  "BA","BB","BD","BE","BF","BG","BH","BI","BJ","BL","BM","BN","BO","BQ","BR","BS",
  "BT","BV","BW","BY","BZ","CA","CC","CD","CF","CG","CH","CI","CK","CL","CM","CN",
  "CO","CR","CU","CV","CW","CX","CY","CZ","DE","DJ","DK","DM","DO","DZ","EC","EE",
  "EG","EH","ER","ES","ET","FI","FJ","FK","FM","FO","FR","GA","GB","GD","GE","GF",
  "GG","GH","GI","GL","GM","GN","GP","GQ","GR","GS","GT","GU","GW","GY","HK","HM",
  "HN","HR","HT","HU","ID","IE","IL","IM","IN","IO","IQ","IR","IS","IT","JE","JM",
  "JO","JP","KE","KG","KH","KI","KM","KN","KP","KR","KW","KY","KZ","LA","LB","LC",
  "LI","LK","LR","LS","LT","LU","LV","LY","MA","MC","MD","ME","MF","MG","MH","MK",
  "ML","MM","MN","MO","MP","MQ","MR","MS","MT","MU","MV","MW","MX","MY","MZ","NA",
  "NC","NE","NF","NG","NI","NL","NO","NP","NR","NU","NZ","OM","PA","PE","PF","PG",
  "PH","PK","PL","PM","PN","PR","PS","PT","PW","PY","QA","RE","RO","RS","RU","RW",
  "SA","SB","SC","SD","SE","SG","SH","SI","SJ","SK","SL","SM","SN","SO","SR","SS",
  "ST","SV","SX","SY","SZ","TC","TD","TF","TG","TH","TJ","TK","TL","TM","TN","TO",
  "TR","TT","TV","TW","TZ","UA","UG","UM","US","UY","UZ","VA","VC","VE","VG","VI",
  "VN","VU","WF","WS","YE","YT","ZA","ZM","ZW",
] as const satisfies readonly string[];

export type CountryCode = (typeof ALPHA2_CODES)[number];

export interface CountryEntry {
  code: CountryCode;
  nameEn: string;
}

const displayNames = new Intl.DisplayNames(["en"], { type: "region" });

export const COUNTRIES: readonly CountryEntry[] = Object.freeze(
  ALPHA2_CODES.map((code): CountryEntry => ({
    code,
    nameEn: displayNames.of(code) ?? code,
  }))
    .sort((a, b) => a.nameEn.localeCompare(b.nameEn, "en"))
    .map((entry) => Object.freeze(entry)),
);

const CODE_SET = new Set<CountryCode>(COUNTRIES.map((c) => c.code));

export function isValidCountryCode(code: string): boolean {
  return (CODE_SET as Set<string>).has(code);
}
