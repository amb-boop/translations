const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = __dirname;
const INPUT_DIR = path.join(ROOT, "input");
const RAW_DIR = path.join(ROOT, "data", "raw");
const SNAPSHOT_DIR = path.join(ROOT, "data", "snapshots");
const BASELINE_DIR = path.join(ROOT, "data", "baseline");
const RUN_DATE = new Date().toISOString().slice(0, 10);
const TRANSLATION_CACHE_FILE = path.join(ROOT, "data", "translation_cache.json");
const PRODUCT_GLOSSARY_FILE = path.join(ROOT, "data", "lexicon", "product_glossary.json");
const REVIEW_SEASON_YEAR = "2026";
const REVIEW_SEASON_CODE = "002";
const REVIEW_SEASON_LABEL = "AH26";

const FEEDS = {
  fr_FR: {
    label: "France reference feed",
    fileName: "etam_fr_fr_productfeed_mcvt.csv",
    url: "https://productfeed.etam.com/dw/PROD/PRODUCT_FEED/PIM/etam_fr_fr_productfeed_mcvt.csv",
  },
  es_ES: {
    label: "Spain feed",
    fileName: "etam_es_es_lengow_mcvt.csv",
    url: "https://productfeed.etam.com/dw/PROD/PRODUCT_FEED/PIM/etam_es_es_lengow_mcvt.csv",
  },
  pl_PL: {
    label: "Poland feed",
    fileName: "etam_pl_pl_lengow_mcvt.csv",
    url: "https://productfeed.etam.com/dw/PROD/PRODUCT_FEED/PIM/etam_pl_pl_lengow_mcvt.csv",
  },
  cz_CZ: {
    label: "Czech Republic feed",
    fileName: "etam_cz_cz_lengow_mcvt.csv",
    url: "https://productfeed.etam.com/dw/PROD/PRODUCT_FEED/PIM/etam_cz_cz_lengow_mcvt.csv",
  },
  en_UK: {
    label: "United Kingdom feed",
    fileName: "etam_uk_en_gb_lengow_mcvt.csv",
    url: "https://productfeed.etam.com/dw/PROD/PRODUCT_FEED/PIM/etam_uk_en_gb_lengow_mcvt.csv",
  },
  nl_BE: {
    label: "Belgium Flemish feed",
    fileName: "etam_be_nl_be_lengow_mcvt.csv",
    url: "https://productfeed.etam.com/dw/PROD/PRODUCT_FEED/PIM/etam_be_nl_be_lengow_mcvt.csv",
  },
  de_CH: {
    label: "Switzerland German feed",
    fileName: "etam_ch_de_ch_lengow_mcvt.csv",
    url: "https://productfeed.etam.com/dw/PROD/PRODUCT_FEED/PIM/etam_ch_de_ch_lengow_mcvt.csv",
  },
  de_DE: {
    label: "Germany feed",
    fileName: "etam_de_de_lengow_mcvt.csv",
    url: "https://productfeed.etam.com/dw/PROD/PRODUCT_FEED/PIM/etam_de_de_lengow_mcvt.csv",
  },
};

const COUNTRIES = {
  es_ES: { name: "Spain", csv: "es_translation_queue.csv", exportLocale: "es_ES", toneLabel: "Spain" },
  pl_PL: { name: "Poland", csv: "pl_translation_queue.csv", exportLocale: "PL", toneLabel: "Poland" },
  cz_CZ: { name: "Czech Republic", csv: "cz_translation_queue.csv", exportLocale: "CZ", toneLabel: "Czech Republic" },
  en_UK: { name: "United Kingdom", csv: "uk_translation_queue.csv", exportLocale: "en_GB", toneLabel: "United Kingdom" },
  nl_BE: { name: "Belgium Flemish", csv: "be_nl_translation_queue.csv", exportLocale: "nl_BE", toneLabel: "Belgium Flemish" },
  de_CH: { name: "Switzerland DE", csv: "ch_de_translation_queue.csv", exportLocale: "de_CH", toneLabel: "Swiss German" },
  de_DE: { name: "Germany", csv: "de_translation_queue.csv", exportLocale: "de_DE", toneLabel: "Germany German" },
};

const LEGACY_LANG_TO_LOCALE = {
  es: "es_ES",
  pl: "pl_PL",
  cz: "cz_CZ",
  uk: "en_UK",
  nl: "nl_BE",
  be_nl: "nl_BE",
  ch_de: "de_CH",
  de: "de_DE",
  es_ES: "es_ES",
  pl_PL: "pl_PL",
  cz_CZ: "cz_CZ",
  en_UK: "en_UK",
  nl_BE: "nl_BE",
  de_CH: "de_CH",
  de_DE: "de_DE",
};

const TRANSLATE_TARGETS = {
  es_ES: "es",
  pl_PL: "pl",
  cz_CZ: "cs",
  en_UK: "en",
  nl_BE: "nl",
  de_CH: "de",
  de_DE: "de",
};

const PRODUCT_GLOSSARY = readJson(PRODUCT_GLOSSARY_FILE, { locales: {} });

const TITLE_DICTIONARY = {
  es_ES: [
    [/^Bandeau push-up$/i, "Sujetador bandeau push-up"],
    [/^Soutien-gorge bandeau push-up$/i, "Sujetador bandeau push-up"],
    [/^Soutien-gorge push-up$/i, "Sujetador push-up"],
    [/^Brassiere$/i, "Bralette"],
    [/^Culotte$/i, "Braguita"],
    [/^Shorty$/i, "Shorty"],
    [/^Body$/i, "Body"],
    [/^Nuisette$/i, "Picardias"],
    [/^Pyjama$/i, "Pijama"],
  ],
  pl_PL: [
    [/^Bandeau push-up$/i, "Biustonosz bandeau push-up"],
    [/^Soutien-gorge bandeau push-up$/i, "Biustonosz bandeau push-up"],
    [/^Soutien-gorge push-up$/i, "Biustonosz push-up"],
    [/^Brassiere$/i, "Braletka"],
    [/^Culotte$/i, "Majtki"],
    [/^Shorty$/i, "Szorty"],
    [/^Body$/i, "Body"],
    [/^Nuisette$/i, "Koszulka nocna"],
    [/^Pyjama$/i, "Piżama"],
  ],
  cz_CZ: [
    [/^Bandeau push-up$/i, "Podprsenka bandeau push-up"],
    [/^Soutien-gorge bandeau push-up$/i, "Podprsenka bandeau push-up"],
    [/^Soutien-gorge push-up$/i, "Push-up podprsenka"],
    [/^Brassiere$/i, "Braletka"],
    [/^Culotte$/i, "Kalhotky"],
    [/^Shorty$/i, "Shorty"],
    [/^Body$/i, "Body"],
    [/^Nuisette$/i, "Noční košilka"],
    [/^Pyjama$/i, "Pyžamo"],
  ],
  nl_BE: [
    [/^Bandeau push-up$/i, "Bandeau push-upbeha"],
    [/^Soutien-gorge bandeau push-up$/i, "Bandeau push-upbeha"],
    [/^Soutien-gorge push-up$/i, "Push-upbeha"],
    [/^Brassiere$/i, "Bralette"],
    [/^Culotte$/i, "Slip"],
    [/^Shorty$/i, "Shorty"],
    [/^Body$/i, "Body"],
    [/^Nuisette$/i, "Nachthemdje"],
    [/^Pyjama$/i, "Pyjama"],
  ],
  de_CH: [
    [/^Bandeau push-up$/i, "Bandeau-Push-up-BH"],
    [/^Soutien-gorge bandeau push-up$/i, "Bandeau-Push-up-BH"],
    [/^Soutien-gorge push-up$/i, "Push-up-BH"],
    [/^Brassiere$/i, "Bralette"],
    [/^Culotte$/i, "Slip"],
    [/^Shorty$/i, "Shorty"],
    [/^Body$/i, "Body"],
    [/^Nuisette$/i, "Neglige"],
    [/^Pyjama$/i, "Pyjama"],
  ],
  de_DE: [
    [/^Bandeau push-up$/i, "Bandeau-Push-up-BH"],
    [/^Soutien-gorge bandeau push-up$/i, "Bandeau-Push-up-BH"],
    [/^Soutien-gorge push-up$/i, "Push-up-BH"],
    [/^Brassiere$/i, "Bralette"],
    [/^Culotte$/i, "Slip"],
    [/^Shorty$/i, "Shorty"],
    [/^Body$/i, "Body"],
    [/^Nuisette$/i, "Neglige"],
    [/^Pyjama$/i, "Pyjama"],
  ],
};

const FRENCH_MARKERS = [
  "soutien-gorge",
  "culotte",
  "nuisette",
  "dentelle",
  "broderie",
  "maillot",
  "haut de maillot",
  "bas de maillot",
  "à motifs",
  "a motifs",
  "bandeau",
  "armatures",
  "sans armatures",
  "coque",
  "corbeille",
  "pyjama",
  "chemise",
  "coton",
  "microfibre",
  "brassière",
  "brassiere",
  "avec",
  "sous-vêtement",
  "vetement",
  "vêtement",
  "matière",
  "matiere",
  "bretelles",
  "amovibles",
  "invisible",
  "noir",
  "blanc",
  "beige",
];

const TITLE_TERMS = {
  es_ES: [
    [/T-shirt drapé avec noeud/gi, "Camiseta drapeada con nudo"],
    [/Body manches longues en velours/gi, "Body de manga larga de terciopelo"],
    [/Body manches courtes avec coton/gi, "Body de manga corta con algodón"],
    [/Soutien-gorge corbeille minimizer/gi, "Sujetador corbeille minimizer"],
    [/Bandeau push-up/gi, "Sujetador bandeau push-up"],
    [/Soutien-gorge/gi, "Sujetador"],
    [/Culotte/gi, "Braguita"],
    [/Nuisette/gi, "Picardías"],
    [/Pantalon de pyjama/gi, "Pantalón de pijama"],
    [/Chemise/gi, "Camisa"],
    [/Bas de maillot de bain/gi, "Braguita de bikini"],
    [/Maillot de bain/gi, "Bañador"],
    [/avec/gi, "con"],
    [/sans/gi, "sin"],
    [/dentelle/gi, "encaje"],
    [/broderie/gi, "bordado"],
    [/coton/gi, "algodón"],
    [/velours/gi, "terciopelo"],
    [/noeud|nœud/gi, "nudo"],
  ],
  pl_PL: [
    [/T-shirt drapé avec noeud/gi, "Drapowany T-shirt z wiązaniem"],
    [/Body manches longues en velours/gi, "Body z długim rękawem z weluru"],
    [/Soutien-gorge corbeille minimizer/gi, "Biustonosz corbeille minimizer"],
    [/Bandeau push-up/gi, "Biustonosz bandeau push-up"],
    [/Soutien-gorge/gi, "Biustonosz"],
    [/Culotte/gi, "Majtki"],
    [/Nuisette/gi, "Koszulka nocna"],
    [/Pantalon de pyjama/gi, "Spodnie od piżamy"],
    [/avec/gi, "z"],
    [/dentelle/gi, "koronką"],
    [/broderie/gi, "haftem"],
    [/coton/gi, "bawełną"],
    [/velours/gi, "weluru"],
  ],
  cz_CZ: [
    [/T-shirt drapé avec noeud/gi, "Drapované tričko s uzlem"],
    [/Body manches longues en velours/gi, "Sametové body s dlouhým rukávem"],
    [/Soutien-gorge corbeille minimizer/gi, "Podprsenka corbeille minimizer"],
    [/Bandeau push-up/gi, "Podprsenka bandeau push-up"],
    [/Soutien-gorge/gi, "Podprsenka"],
    [/Culotte/gi, "Kalhotky"],
    [/Nuisette/gi, "Noční košilka"],
    [/avec/gi, "s"],
    [/dentelle/gi, "krajkou"],
    [/broderie/gi, "výšivkou"],
    [/coton/gi, "bavlnou"],
    [/velours/gi, "sametu"],
  ],
  nl_BE: [
    [/T-shirt drapÃ© avec noeud/gi, "Gedrapeerd T-shirt met knoop"],
    [/Body manches longues en velours/gi, "Body met lange mouwen in fluweel"],
    [/Soutien-gorge corbeille minimizer/gi, "Minimizer corbeillebeha"],
    [/Bandeau push-up/gi, "Bandeau push-upbeha"],
    [/Soutien-gorge/gi, "Beha"],
    [/Culotte/gi, "Slip"],
    [/Nuisette/gi, "Nachthemdje"],
    [/Pantalon de pyjama/gi, "Pyjamabroek"],
    [/Chemise/gi, "Hemd"],
    [/Bas de maillot de bain/gi, "Bikinibroekje"],
    [/Maillot de bain/gi, "Badpak"],
    [/avec/gi, "met"],
    [/sans/gi, "zonder"],
    [/dentelle/gi, "kant"],
    [/broderie/gi, "borduursel"],
    [/coton/gi, "katoen"],
    [/velours/gi, "fluweel"],
  ],
  de_CH: [
    [/T-shirt drapÃ© avec noeud/gi, "Drapiertes T-Shirt mit Knoten"],
    [/Body manches longues en velours/gi, "Langarm-Body aus Samt"],
    [/Soutien-gorge corbeille minimizer/gi, "Minimizer-Corbeille-BH"],
    [/Bandeau push-up/gi, "Bandeau-Push-up-BH"],
    [/Soutien-gorge/gi, "BH"],
    [/Culotte/gi, "Slip"],
    [/Nuisette/gi, "Neglige"],
    [/Pantalon de pyjama/gi, "Pyjamahose"],
    [/Chemise/gi, "Hemd"],
    [/Bas de maillot de bain/gi, "Bikinihose"],
    [/Maillot de bain/gi, "Badeanzug"],
    [/avec/gi, "mit"],
    [/sans/gi, "ohne"],
    [/dentelle/gi, "Spitze"],
    [/broderie/gi, "Stickerei"],
    [/coton/gi, "Baumwolle"],
    [/velours/gi, "Samt"],
  ],
  de_DE: [
    [/T-shirt drapÃ© avec noeud/gi, "Drapiertes T-Shirt mit Knoten"],
    [/Body manches longues en velours/gi, "Langarm-Body aus Samt"],
    [/Soutien-gorge corbeille minimizer/gi, "Minimizer-Corbeille-BH"],
    [/Bandeau push-up/gi, "Bandeau-Push-up-BH"],
    [/Soutien-gorge/gi, "BH"],
    [/Culotte/gi, "Slip"],
    [/Nuisette/gi, "Neglige"],
    [/Pantalon de pyjama/gi, "Pyjamahose"],
    [/Chemise/gi, "Hemd"],
    [/Bas de maillot de bain/gi, "Bikinihose"],
    [/Maillot de bain/gi, "Badeanzug"],
    [/avec/gi, "mit"],
    [/sans/gi, "ohne"],
    [/dentelle/gi, "Spitze"],
    [/broderie/gi, "Stickerei"],
    [/coton/gi, "Baumwolle"],
    [/velours/gi, "Samt"],
  ],
};

const DESCRIPTION_PHRASES_ES = [
  [/Basique incontournable du vestiaire revisité, ce t-shirt manches courtes à col rond est noué et plissé sous la poitrine\./gi, "Básico imprescindible del armario revisitado, esta camiseta de manga corta con cuello redondo se anuda y se frunce bajo el pecho."],
  [/Sobre et élégant, ce body manches longues offre un effet velours et dévoile un subtil décolleté en V\./gi, "Sobrio y elegante, este body de manga larga ofrece un efecto terciopelo y revela un sutil escote en V."],
  [/Doux et agréable à porter/gi, "Suave y agradable de llevar"],
  [/confortable au quotidien/gi, "cómodo para el día a día"],
  [/met la poitrine en valeur/gi, "realza el pecho"],
  [/décolleté/gi, "escote"],
  [/dentelle/gi, "encaje"],
  [/broderie/gi, "bordado"],
  [/coton/gi, "algodón"],
  [/velours/gi, "terciopelo"],
  [/silhouette/gi, "silueta"],
];

function applyTermMap(text, locale) {
  let output = repairText(text);
  for (const [pattern, replacement] of TITLE_TERMS[locale] || []) {
    output = output.replace(pattern, replacement);
  }
  return output.trim();
}

function applyCleanTitleTerms(text, locale) {
  let output = repairText(text);
  const rules = {
    es_ES: [
      [/Jupe longue à sequins/gi, "Falda larga de lentejuelas"],
      [/Top à sequins/gi, "Top de lentejuelas"],
      [/Ceinture en cuir/gi, "Cinturón de cuero"],
      [/Top bénitier à pois/gi, "Top con cuello drapeado de lunares"],
      [/Pantalon cropped/gi, "Pantalón cropped"],
      [/Pantalon fluide élastiqué/gi, "Pantalón fluido con cintura elástica"],
      [/Cycliste taille haute galbant/gi, "Short ciclista de talle alto moldeador"],
      [/Pantalon en gaze de coton/gi, "Pantalón de gasa de algodón"],
      [/Pantalon vichy à motif citron/gi, "Pantalón vichy con motivo de limón"],
      [/Pantalon vichy à motif cerise/gi, "Pantalón vichy con motivo de cereza"],
      [/Pantalon large à pinces/gi, "Pantalón ancho con pinzas"],
      [/Bermuda à plis et fines rayures/gi, "Bermuda plisado de raya fina"],
      [/Pantalon droit taille haute/gi, "Pantalón recto de talle alto"],
      [/Pantalon droit/gi, "Pantalón recto"],
      [/Pantalon coupe barrel/gi, "Pantalón barrel"],
      [/Pantalon fleuri/gi, "Pantalón floral"],
      [/Pantalon large en lin mélangé/gi, "Pantalón ancho de lino mezclado"],
      [/Short bermuda/gi, "Bermuda"],
      [/Pantalon coupe droite/gi, "Pantalón de corte recto"],
      [/Pantalon bouffant/gi, "Pantalón abullonado"],
      [/Pantalon large à carreaux/gi, "Pantalón ancho de cuadros"],
      [/Pantalon capri/gi, "Pantalón capri"],
      [/Pantalon portefeuille large/gi, "Pantalón ancho cruzado"],
      [/Pantalon palazzo fluide plissé/gi, "Pantalón palazzo fluido plisado"],
      [/Pantalon fluide/gi, "Pantalón fluido"],
      [/Short large/gi, "Short ancho"],
      [/Short en jean/gi, "Short vaquero"],
      [/Cycliste de sport taille haute à bords contrastés/gi, "Short ciclista deportivo de talle alto con ribetes en contraste"],
      [/Legging de sport taille haute à bords contrastés/gi, "Legging deportivo de talle alto con ribetes en contraste"],
      [/Combi-short de sport à bords contrastés/gi, "Mono short deportivo con ribetes en contraste"],
      [/Top en microfibre avec brassière intégrée/gi, "Top de microfibra con sujetador integrado"],
      [/Top en microfibre/gi, "Top de microfibra"],
      [/brassière intégrée/gi, "sujetador integrado"],
      [/Brassière de sport/gi, "Sujetador deportivo"],
      [/Brassière/gi, "Bralette"],
      [/Braga culotte/gi, "Braguita"],
      [/culotte/gi, "braguita"],
      [/T-shirt drapé avec noeud/gi, "Camiseta drapeada con nudo"],
      [/Body manches longues en velours/gi, "Body de manga larga de terciopelo"],
      [/Soutien-gorge corbeille minimizer/gi, "Sujetador corbeille minimizer"],
      [/Soutien-gorge bandeau/gi, "Sujetador bandeau"],
      [/Soutien-gorge/gi, "Sujetador"],
      [/Bas de maillot de bain bikini/gi, "Braguita de bikini"],
      [/Bas de maillot de bain/gi, "Braguita de bikini"],
      [/Haut de maillot de bain triangle/gi, "Top de bikini triangular"],
      [/Haut de maillot de bain bandeau/gi, "Top de bikini bandeau"],
      [/Bandeau haut de maillot de bain/gi, "Top de bikini bandeau"],
      [/Bandeau haut de maillot/gi, "Top de bikini bandeau"],
      [/Haut de maillot de bain/gi, "Top de bikini"],
      [/Maillot de bain 1 pièce/gi, "Bañador de una pieza"],
      [/Nuisette courte/gi, "Picardías corto"],
      [/Nuisette/gi, "Picardías"],
      [/Pantalon de pyjama/gi, "Pantalón de pijama"],
      [/Chemise de pyjama/gi, "Camisa de pijama"],
      [/Short de pyjama/gi, "Short de pijama"],
      [/Caraco/gi, "Top lencero"],
      [/Culotte/gi, "Braguita"],
      [/Tanga/gi, "Tanga"],
      [/Shorty/gi, "Shorty"],
      [/en dentelle/gi, "de encaje"],
      [/détails dentelle/gi, "con detalles de encaje"],
      [/en soie/gi, "de seda"],
      [/en coton/gi, "de algodón"],
      [/en velours/gi, "de terciopelo"],
      [/en microfibre/gi, "de microfibra"],
      [/à rayures/gi, "de rayas"],
      [/à motifs/gi, "estampado"],
      [/à nouer/gi, "con lazada"],
      [/avec/gi, "con"],
      [/sans couture/gi, "sin costuras"],
      [/sans armatures/gi, "sin aros"],
      [/manches courtes/gi, "de manga corta"],
      [/manches longues/gi, "de manga larga"],
      [/satiné(e)?/gi, "satinado"],
      [/coupe large/gi, "de corte ancho"],
      [/pailleté(e)?/gi, "brillante"],
      [/imprimé(e)?/gi, "estampado"],
      [/floral(e)?/gi, "floral"],
    ],
    pl_PL: [
      [/Top en microfibre avec brassière intégrée/gi, "Top z mikrofibry ze zintegrowanym biustonoszem"],
      [/Top en microfibre/gi, "Top z mikrofibry"],
      [/brassière intégrée/gi, "zintegrowany biustonosz"],
      [/Hipster V-shape en microfibre et dentelle/gi, "Hipstery V-shape z mikrofibry i koronki"],
      [/Hipster V-shape en dentelle/gi, "Hipstery V-shape z koronki"],
      [/Hipster en broderie florale/gi, "Hipstery z haftem kwiatowym"],
      [/Hipster avec broderie/gi, "Hipstery z haftem"],
      [/Hipster en broderie/gi, "Hipstery z haftem"],
      [/Brassière de sport/gi, "Biustonosz sportowy"],
      [/Brassière/gi, "Braletka"],
      [/brassiere/gi, "braletka"],
      [/T-shirt drapé avec noeud/gi, "Drapowany T-shirt z wiązaniem"],
      [/Body manches longues en velours/gi, "Body z długim rękawem z weluru"],
      [/Soutien-gorge corbeille minimizer/gi, "Biustonosz typu corbeille z efektem minimizer"],
      [/Soutien-gorge bandeau/gi, "Biustonosz bandeau"],
      [/Soutien-gorge/gi, "Biustonosz"],
      [/Bas de maillot de bain bikini/gi, "Dół od bikini"],
      [/Bas de maillot de bain/gi, "Dół od bikini"],
      [/Haut de maillot de bain triangle/gi, "Trójkątna góra od bikini"],
      [/Haut de maillot de bain bandeau/gi, "Góra od bikini bandeau"],
      [/Haut de maillot de bain/gi, "Góra od bikini"],
      [/Maillot de bain 1 pièce/gi, "Jednoczęściowy strój kąpielowy"],
      [/Nuisette courte/gi, "Krótka koszulka nocna"],
      [/Nuisette/gi, "Koszulka nocna"],
      [/Pantalon de pyjama/gi, "Spodnie od piżamy"],
      [/Chemise de pyjama/gi, "Koszula od piżamy"],
      [/Short de pyjama/gi, "Szorty piżamowe"],
      [/Caraco/gi, "Top na ramiączkach"],
      [/Culotte/gi, "Majtki"],
      [/Tanga/gi, "Stringi"],
      [/Shorty/gi, "Szorty"],
      [/en dentelle/gi, "z koronki"],
      [/détails dentelle/gi, "z koronkowymi detalami"],
      [/en soie/gi, "z jedwabiu"],
      [/en coton/gi, "z bawełny"],
      [/en velours/gi, "z weluru"],
      [/en microfibre/gi, "z mikrofibry"],
      [/à rayures/gi, "w paski"],
      [/à motifs/gi, "we wzory"],
      [/à nouer/gi, "wiązany"],
      [/avec/gi, "z"],
      [/sans couture/gi, "bezszwowe"],
      [/sans armatures/gi, "bez fiszbin"],
      [/manches courtes/gi, "z krótkim rękawem"],
      [/manches longues/gi, "z długim rękawem"],
      [/satiné(e)?/gi, "satynowy"],
      [/coupe large/gi, "o szerokim kroju"],
      [/pailleté(e)?/gi, "błyszczący"],
      [/imprimé(e)?/gi, "z nadrukiem"],
      [/floral(e)?/gi, "kwiatowy"],
    ],
    cz_CZ: [
      [/Bermuda taille haute élastiqué/gi, "Bermudy s vysokým elastickým pasem"],
      [/Sweat de sport court/gi, "Krátká sportovní mikina"],
      [/Top en microfibre avec brassière intégrée/gi, "Top z mikrovlákna s integrovanou podprsenkou"],
      [/Top en microfibre/gi, "Top z mikrovlákna"],
      [/brassière intégrée/gi, "integrovaná podprsenka"],
      [/Brassière de sport décolletée V à bords contrastés - Maintien moyen/gi, "Sportovní podprsenka s výstřihem do V a kontrastními lemy - střední opora"],
      [/Brassière croisée dans le dos - Maintien moyen/gi, "Sportovní podprsenka s překřížením na zádech - střední opora"],
      [/Brassière sans armature à encolure carrée/gi, "Podprsenka bez kostic se čtvercovým výstřihem"],
      [/Brassière de sport/gi, "Sportovní podprsenka"],
      [/Brassière/gi, "Braletka"],
      [/brassiere/gi, "braletka"],
      [/Tanga en broderie/gi, "Tanga s výšivkou"],
      [/String en tulle/gi, "String z tylu"],
      [/Hipster en tulle floqué à pois/gi, "Hipster z puntíkovaného tylu"],
      [/Tanga en tulle floqué à pois/gi, "Tanga z puntíkovaného tylu"],
      [/Pantalon fluide élastiqué/gi, "Splývavé kalhoty s elastickým pasem"],
      [/Legging de sport taille haute sculptant/gi, "Sportovní legíny s vysokým pasem a tvarujícím efektem"],
      [/Cycliste taille haute galbant/gi, "Cyklistické šortky s vysokým pasem a tvarujícím efektem"],
      [/Top de pyjama à volant brodé/gi, "Pyžamový top s vyšívaným volánem"],
      [/Débardeur de pyjama en pointelle/gi, "Pyžamové tílko z pointelle úpletu"],
      [/Trousse matelassée/gi, "Prošívaná taštička"],
      [/Pantalon vichy à motif cerise/gi, "Kalhoty s kostkovaným vzorem vichy a motivem třešní"],
      [/Ceinture en cuir/gi, "Kožený pásek"],
      [/Ensemble de pyjama 2 pièces motifs ananas pour enfant/gi, "Dvoudílné dětské pyžamo s motivem ananasů"],
      [/Ensemble de pyjama 2 pièces motifs pastèques pour enfant/gi, "Dvoudílné dětské pyžamo s motivem melounů"],
      [/Ensemble de pyjama 2 pièces motifs fraises pour enfant/gi, "Dvoudílné dětské pyžamo s motivem jahod"],
      [/Ensemble de pyjama 2 pièces/gi, "Dvoudílné pyžamo"],
      [/Bijoux anneaux pour paréo/gi, "Ozdobné kroužky na pareo"],
      [/Chouchou coloré/gi, "Barevná gumička do vlasů"],
      [/Jean coupe droite/gi, "Džíny rovného střihu"],
      [/Charms pour maillots de bain/gi, "Přívěsky na plavky"],
      [/Bijoux chaines de corps/gi, "Tělové řetízky"],
      [/Sac en raphia/gi, "Rafiová taška"],
      [/Short boyleg/gi, "Boyleg šortky"],
      [/Chaussons tongs/gi, "Žabkové pantofle"],
      [/Maillot de bain 2 pièces motif vichy pour enfant/gi, "Dvoudílné dětské plavky s károvaným vzorem vichy"],
      [/Maillot de bain 2 pièces à motif léopard pour enfant/gi, "Dvoudílné dětské plavky s leopardím vzorem"],
      [/Maillot de bain 2 pièces/gi, "Dvoudílné plavky"],
      [/motif vichy/gi, "károvaný vzor vichy"],
      [/motif léopard/gi, "leopardí vzor"],
      [/à motifs/gi, "se vzory"],
      [/a motifs/gi, "se vzory"],
      [/à bords contrastés/gi, "s kontrastními lemy"],
      [/décolletée V/gi, "s výstřihem do V"],
      [/Maintien moyen/gi, "střední opora"],
      [/pads amovibles/gi, "vyjímatelnými vycpávkami"],
      [/T-shirt drapé avec noeud/gi, "Drapované tričko s uzlem"],
      [/Body manches longues en velours/gi, "Sametové body s dlouhým rukávem"],
      [/Soutien-gorge corbeille minimizer/gi, "Podprsenka typu corbeille s efektem minimizer"],
      [/Soutien-gorge bandeau/gi, "Bandeau podprsenka"],
      [/Soutien-gorge/gi, "Podprsenka"],
      [/Bas de maillot de bain bikini/gi, "Spodní díl bikin"],
      [/Bas de maillot de bain/gi, "Spodní díl plavek"],
      [/Haut de maillot de bain triangle/gi, "Trojúhelníkový horní díl plavek"],
      [/Haut de maillot de bain bandeau/gi, "Bandeau horní díl plavek"],
      [/Haut de maillot de bain/gi, "Horní díl plavek"],
      [/Maillot de bain 1 pièce/gi, "Jednodílné plavky"],
      [/Nuisette courte/gi, "Krátká noční košilka"],
      [/Nuisette/gi, "Noční košilka"],
      [/Pantalon de pyjama/gi, "Pyžamové kalhoty"],
      [/Chemise de pyjama/gi, "Pyžamová košile"],
      [/Short de pyjama/gi, "Pyžamové šortky"],
      [/Caraco/gi, "Top na ramínka"],
      [/Culotte/gi, "Kalhotky"],
      [/Tanga/gi, "Tanga"],
      [/Shorty/gi, "Shorty"],
      [/en dentelle/gi, "z krajky"],
      [/détails dentelle/gi, "s krajkovými detaily"],
      [/en soie/gi, "z hedvábí"],
      [/en coton/gi, "z bavlny"],
      [/en velours/gi, "ze sametu"],
      [/en microfibre/gi, "z mikrovlákna"],
      [/à rayures/gi, "s proužky"],
      [/à motifs/gi, "se vzory"],
      [/à nouer/gi, "na zavazování"],
      [/avec/gi, "s"],
      [/sans couture/gi, "bezešvé"],
      [/sans armatures/gi, "bez kostic"],
      [/manches courtes/gi, "s krátkým rukávem"],
      [/manches longues/gi, "s dlouhým rukávem"],
      [/satiné(e)?/gi, "saténové"],
      [/coupe large/gi, "širokého střihu"],
      [/pailleté(e)?/gi, "třpytivé"],
      [/imprimé(e)?/gi, "s potiskem"],
      [/floral(e)?/gi, "květinové"],
    ],
  };
  for (const [pattern, replacement] of rules[locale] || []) output = output.replace(pattern, replacement);
  return repairText(output).replace(/\s+/g, " ").trim();
}

const QUALITY_MARKERS = [
  "TODO",
  "TBD",
  "Lorem ipsum",
  "traduction",
  "translation needed",
  "a traduire",
  "à traduire",
];

const SPELLING_WARNING_PATTERNS = {
  all: [
    { pattern: /[\u00c2\u00c3\uFFFD]|Ã|Â|ï¿½|â€™|â€œ|â€|&[#a-z0-9]+;/i, label: "Encoding, mojibake, or HTML entity detected" },
    { pattern: /\b([A-Za-zÀ-ÿ]{3,})\s+\1\b/i, label: "Repeated word" },
    { pattern: /\s+[,.!?;:]/, label: "Space before punctuation" },
    { pattern: /[!?]\s*\./, label: "Duplicated punctuation" },
  ],
  es_ES: [
    { pattern: /\bcaracco\b/i, label: "Possible typo: caracco" },
    { pattern: /\bencage\b/i, label: "Possible typo: encage" },
    { pattern: /\bbanador\b/i, label: "Possible typo: banador" },
    { pattern: /\balgodon\b/i, label: "Possible typo: algodon" },
    { pattern: /\bsujetador\s+sujetador\b/i, label: "Repeated product type in Spanish title" },
    { pattern: /\bpantalones cortos cortos\b/i, label: "Repeated product type in Spanish copy" },
    { pattern: /\b(corpiños|pel[ií]culas protectoras|brinda soporte|reemplazar las pel[ií]culas|meter en la lavadora)\b/i, label: "Literal Spanish machine translation" },
  ],
  pl_PL: [
    { pattern: /\bpizama\b/i, label: "Possible typo: pizama" },
    { pattern: /\bbawelna\b/i, label: "Possible typo: bawelna" },
    { pattern: /\bgleboki\b/i, label: "Possible typo: gleboki" },
    { pattern: /\ben\s+[a-ząćęłńóśźż]+\b/i, label: "French preposition left in Polish copy" },
    { pattern: /\btriangle en tulle\b/i, label: "French/English hybrid left in Polish title" },
    { pattern: /\bnie zak[łl]ada biustonosza\b/i, label: "Literal Polish machine translation" },
  ],
  cz_CZ: [
    { pattern: /\bmikrovlakno\b/i, label: "Possible typo: mikrovlakno" },
    { pattern: /\bpyzam/i, label: "Possible typo around pyzamo" },
    { pattern: /\bavec\s+[a-zá-ž]+\b/i, label: "French preposition left in Czech copy" },
    { pattern: /\btop en crochet\b/i, label: "French preposition left in Czech title" },
    { pattern: /\btop bikin\b/i, label: "Possible Czech product wording issue" },
    { pattern: /\bkoupelov[ýy]ch kapsl/i, label: "Literal Czech machine translation" },
  ],
  en_UK: [
    { pattern: /\bsoutien-gorge|culotte|nuisette|dentelle|broderie|maillot de bain\b/i, label: "French term left in English copy" },
  ],
  nl_BE: [
    { pattern: /\bsoutien-gorge\b/i, label: "French term left in Flemish copy" },
    { pattern: /\bdentelle\b/i, label: "French term left in Flemish copy" },
    { pattern: /\bgesatineerds\b/i, label: "Flemish adjective agreement issue" },
  ],
  de_CH: [
    { pattern: /\bsoutien-gorge\b/i, label: "French term left in German copy" },
    { pattern: /\bdentelle\b/i, label: "French term left in German copy" },
    { pattern: /\bunterstutzung\b/i, label: "Possible missing umlaut: Unterstützung" },
    { pattern: /\|\|\|/, label: "Feed separator left in German copy" },
  ],
  de_DE: [
    { pattern: /\bsoutien-gorge\b/i, label: "French term left in German copy" },
    { pattern: /\bdentelle\b/i, label: "French term left in German copy" },
    { pattern: /\bunterstutzung\b/i, label: "Possible missing umlaut: Unterstützung" },
    { pattern: /\|\|\|/, label: "Feed separator left in German copy" },
  ],
};

const SPELLING_ISSUE = "Spelling warning";
const LEGACY_SPELLING_ISSUE = "Spelling or terminology warning";
const NON_SPELLING_WARNING_LABEL = /French|Literal|hybrid|wording|machine translation/i;

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function parseArgs(argv) {
  const flags = new Set(argv.slice(2));
  const sheetUrlArg = argv.slice(2).find((arg) => arg.startsWith("--sheets-url="));
  return {
    online: flags.has("--local") ? false : true,
    local: flags.has("--local"),
    full: flags.has("--full"),
    incremental: flags.has("--full") ? false : true,
    publishSheets: flags.has("--publish-sheets"),
    sheetsUrl: sheetUrlArg ? sheetUrlArg.split("=").slice(1).join("=") : process.env.ETAM_SHEETS_WEBAPP_URL,
  };
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

function normalizeText(value) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&eacute;/gi, "e")
    .replace(/&egrave;/gi, "e")
    .replace(/&agrave;/gi, "a")
    .replace(/&ccedil;/gi, "c")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function compareText(value) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&reg;/gi, "®")
    .replace(/&copy;/gi, "©")
    .replace(/&euro;/gi, "€");
}

function glossaryTitleFromFrench(frTitle, locale) {
  const glossary = PRODUCT_GLOSSARY.locales?.[locale];
  if (!glossary) return "";
  const source = compareText(frTitle);
  if (!source) return "";

  const entries = [
    ...Object.entries(glossary.product_types || {}).filter(([key]) => key !== "hipster_alt").map(([key, value]) => ({ bucket: "product_types", key, value })),
    ...Object.entries(glossary.forms || {}).map(([key, value]) => ({ bucket: "forms", key, value })),
    ...Object.entries(glossary.materials_and_details || {}).map(([key, value]) => ({ bucket: "materials_and_details", key, value })),
  ].sort((a, b) => b.key.length - a.key.length);

  const matched = [];
  for (const entry of entries) {
    if (hasGlossaryTerm(source, entry.key)) matched.push(entry);
  }
  const productType = matched.find((entry) => entry.bucket === "product_types");
  if (!productType) return "";

  const modifiers = matched
    .filter((entry) => entry !== productType)
    .map((entry) => entry.value)
    .filter((value, index, values) => value && values.indexOf(value) === index);

  if (locale === "pl_PL" && productType.key === "hipster") {
    const material = modifiers.find((value) => /^z |^bez|^w /.test(value));
    return [material ? "Majtki typu hipster" : productType.value, ...modifiers].join(" ").trim();
  }

  if (locale === "es_ES") {
    return [productType.value, ...modifiers].join(" ").replace(/\s+/g, " ").trim();
  }
  if (locale === "pl_PL") {
    return [productType.value, ...modifiers].join(" ").replace(/\s+/g, " ").trim();
  }
  if (locale === "cz_CZ") {
    return [productType.value, ...modifiers].join(" ").replace(/\s+/g, " ").trim();
  }
  return "";
}

function hasGlossaryTerm(normalizedSource, key) {
  const normalizedKey = compareText(key);
  if (!normalizedKey) return false;
  const escaped = escapeRegExp(normalizedKey).replace(/\s+/g, "\\s+");
  return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`, "i").test(normalizedSource);
}

function shouldForceGlossaryTitle(row) {
  const frTitle = compareText(row.current_fr_title);
  const proposed = compareText(row.proposed_title);
  if (!frTitle || !proposed) return false;
  if (row.locale === "pl_PL" && hasGlossaryTerm(frTitle, "hipster") && /\bhipster\b/i.test(proposed)) return true;
  if (row.locale === "cz_CZ" && hasGlossaryTerm(frTitle, "hipster") && /\bhipster\b/i.test(proposed)) return true;
  return false;
}

function repairText(value) {
  return decodeHtmlEntities(normalizeText(value))
    .replace(/&#0*39;/g, "'")
    .replace(/&#0*34;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/Ã©/g, "é")
    .replace(/Ã¨/g, "è")
    .replace(/Ãª/g, "ê")
    .replace(/Ã«/g, "ë")
    .replace(/Ã /g, "à")
    .replace(/Ã¢/g, "â")
    .replace(/Ã§/g, "ç")
    .replace(/Ã´/g, "ô")
    .replace(/Ã»/g, "û")
    .replace(/Ã¹/g, "ù")
    .replace(/Å‚/g, "ł")
    .replace(/Å›/g, "ś")
    .replace(/Å„/g, "ń")
    .replace(/Å¼/g, "ż")
    .replace(/Åº/g, "ź")
    .replace(/Ä…/g, "ą")
    .replace(/Ä™/g, "ę")
    .replace(/Ä‡/g, "ć")
    .replace(/Ã³/g, "ó")
    .replace(/ï¿½/g, "é")
    .replace(/\uFFFD/g, "é")
    .replace(/\bméme\b/g, "même")
    .replace(/\bMéme\b/g, "Même")
    .replace(/\bSinguliére\b/g, "Singulière")
    .replace(/\bsinguliére\b/g, "singulière")
    .replace(/\bgréce\b/g, "grâce")
    .replace(/\bGréce\b/g, "Grâce")
    .replace(/grâce é/g, "grâce à")
    .replace(/Grâce é/g, "Grâce à")
    .replace(/\bInspiràe\b/g, "Inspirée")
    .replace(/\binspiràe\b/g, "inspirée")
    .replace(/\bdàcolleté\b/g, "décolleté")
    .replace(/\bDàcolleté\b/g, "Décolleté");
}

function hashText(value) {
  const normalized = normalizeText(value).toLowerCase();
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

function csvParse(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === ";" && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }
  row.push(cell);
  if (row.some((value) => value !== "")) rows.push(row);
  if (rows.length === 0) return [];

  const headers = rows[0].map((header) => normalizeText(header).replace(/^"|"$/g, ""));
  return rows.slice(1).map((cells) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = cells[index] || "";
    });
    return record;
  });
}

function csvEscape(value) {
  const text = String(value ?? "")
    .replace(/\uFEFF/g, "")
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim()
    .normalize("NFC");
  if (/[",;\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function writeCsv(filePath, rows, columns) {
  ensureDir(path.dirname(filePath));
  const lines = [columns.join(";")];
  for (const row of rows) {
    lines.push(columns.map((column) => csvEscape(row[column])).join(";"));
  }
  const bom = Buffer.from([0xef, 0xbb, 0xbf]);
  const body = Buffer.from(lines.join("\r\n"), "utf8");
  fs.writeFileSync(filePath, Buffer.concat([bom, body]));
}

function localFeedCandidates(config) {
  const home = process.env.USERPROFILE || process.env.HOME || "";
  const downloadsDir = path.join(home, "Downloads");
  const extension = path.extname(config.fileName);
  const baseName = path.basename(config.fileName, extension);
  const candidates = [
    path.join(INPUT_DIR, config.fileName),
    path.join(ROOT, config.fileName),
    path.join(downloadsDir, config.fileName),
  ];
  if (fs.existsSync(downloadsDir)) {
    for (const name of fs.readdirSync(downloadsDir)) {
      if (name === config.fileName) continue;
      if (!name.startsWith(`${baseName} (`) || !name.endsWith(`)${extension}`)) continue;
      candidates.push(path.join(downloadsDir, name));
    }
  }
  return candidates;
}

async function downloadFeed(locale, config, rawRunDir) {
  const targetPath = path.join(rawRunDir, config.fileName);
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(config.url);
      if (!response.ok) throw new Error(`HTTP ${response.status} for ${config.url}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(targetPath, buffer);
      return { path: targetPath, sourceUrl: config.url, mode: "online" };
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
    }
  }
  throw lastError;
}

function localFeed(locale, config, rawRunDir) {
  for (const candidate of localFeedCandidates(config)) {
    if (fs.existsSync(candidate)) {
      const targetPath = path.join(rawRunDir, config.fileName);
      fs.copyFileSync(candidate, targetPath);
      return { path: targetPath, sourceUrl: `local:${candidate}`, mode: "local" };
    }
  }
  throw new Error(`Missing local file for ${locale}: place ${config.fileName} in input/ or Downloads/.`);
}

async function loadFeeds(options) {
  const rawRunDir = path.join(RAW_DIR, RUN_DATE);
  ensureDir(rawRunDir);
  const loaded = {};
  const messages = [];

  for (const [locale, config] of Object.entries(FEEDS)) {
    try {
      loaded[locale] = options.online
        ? await downloadFeed(locale, config, rawRunDir)
        : localFeed(locale, config, rawRunDir);
      messages.push(`[ok] ${locale}: ${loaded[locale].mode} feed loaded.`);
    } catch (onlineError) {
      if (options.online) {
        messages.push(`[warn] ${locale}: online download failed (${onlineError.message}). Trying local fallback.`);
        try {
          loaded[locale] = localFeed(locale, config, rawRunDir);
          messages.push(`[ok] ${locale}: local fallback loaded.`);
        } catch (localError) {
          messages.push(`[error] ${locale}: ${localError.message}`);
        }
      } else {
        messages.push(`[error] ${locale}: ${onlineError.message}`);
      }
    }
  }

  return { loaded, messages };
}

function pick(record, names) {
  for (const name of names) {
    if (record[name] !== undefined && record[name] !== "") return record[name];
  }
  return "";
}

function normalizeSeasonCode(value) {
  const cleaned = normalizeText(value);
  if (/^0*1$/.test(cleaned)) return "001";
  if (/^0*2$/.test(cleaned)) return "002";
  return "";
}

function deriveSeason(record) {
  const values = Object.values(record).map((value) => normalizeText(value));
  const namedYear = normalizeText(pick(record, ["sap_saisj", "season_year", "annee", "year"]));
  const namedCode = normalizeText(pick(record, ["sap_saiso", "season_code", "saison", "season"]));
  const seasonYear = /^20\d{2}$/.test(namedYear)
    ? namedYear
    : values.find((value) => /^20\d{2}$/.test(value)) || "";
  const seasonCode = normalizeSeasonCode(namedCode) ||
    normalizeSeasonCode(values.find((value) => /^0*(1|2)$/.test(value)) || "");
  const seasonLabel = seasonYear && seasonCode
    ? `${seasonCode === "001" ? "PE" : "AH"}${seasonYear.slice(-2)}`
    : "";
  return { seasonYear, seasonCode, seasonLabel };
}

function isReviewSeason(item) {
  return normalizeText(item?.season_year) === REVIEW_SEASON_YEAR &&
    normalizeSeasonCode(item?.season_code) === REVIEW_SEASON_CODE;
}

function seasonFeedCandidates() {
  const home = process.env.USERPROFILE || process.env.HOME || "";
  return [
    path.join(INPUT_DIR, FEEDS.fr_FR.fileName),
    path.join(ROOT, FEEDS.fr_FR.fileName),
    path.join(home, "Downloads", FEEDS.fr_FR.fileName),
    path.join(home, "Downloads", "etam_fr_fr_productfeed_mcvt (1).csv"),
  ];
}

function loadSeasonLookup() {
  for (const candidate of seasonFeedCandidates()) {
    if (!fs.existsSync(candidate)) continue;
    try {
      const text = fs.readFileSync(candidate, "utf8");
      const rows = csvParse(text);
      const lookup = new Map();
      for (const row of rows) {
        const reference = normalizeText(pick(row, ["reference_mc"]));
        if (!reference || lookup.has(reference)) continue;
        const season = deriveSeason(row);
        if (season.seasonLabel) lookup.set(reference, season);
      }
      if (lookup.size > 0) return { lookup, source: candidate };
    } catch {
      // Try the next candidate.
    }
  }
  return { lookup: new Map(), source: "" };
}

function makeSnapshot(locale, feedInfo, previousSnapshot) {
  const text = fs.readFileSync(feedInfo.path, "utf8");
  const records = csvParse(text);
  const byMc = new Map();
  const previousByMc = new Map((previousSnapshot || []).map((item) => [item.reference_mc, item]));

  for (const record of records) {
    const referenceMc = normalizeText(pick(record, ["reference_mc"]));
    if (!referenceMc) continue;
    if (!byMc.has(referenceMc)) {
      const previous = previousByMc.get(referenceMc);
      const season = deriveSeason(record);
      const title = normalizeText(pick(record, ["nom_court", "nom_compose", "google_title", "title"]));
      const longDescription = normalizeText(pick(record, ["description_longue", "long_description"]));
      byMc.set(referenceMc, {
        locale,
        reference_mc: referenceMc,
        model_id: referenceMc.slice(0, 7),
        color_id: referenceMc.slice(-2),
        reference_mcvt_count: 0,
        title,
        title_hash: hashText(title),
        long_description: longDescription,
        long_description_hash: hashText(longDescription),
        category: normalizeText(pick(record, ["categorie_defaut", "category", "breadcrumb"])),
        universe: normalizeText(pick(record, ["univers", "gamme"])),
        season_year: season.seasonYear,
        season_code: season.seasonCode,
        season_label: season.seasonLabel,
        product_url: normalizeText(pick(record, ["url", "product_url"])),
        image_url: normalizeText(pick(record, ["image_grande", "image_petite", "image_detail_1", "image_url"])),
        first_seen_at: previous?.first_seen_at || RUN_DATE,
        last_seen_at: RUN_DATE,
        source_file_date: RUN_DATE,
        source_url: feedInfo.sourceUrl,
      });
    }
    byMc.get(referenceMc).reference_mcvt_count += 1;
  }

  return Array.from(byMc.values()).sort((a, b) => a.reference_mc.localeCompare(b.reference_mc));
}

function mapByReference(snapshot) {
  return new Map((snapshot || []).map((item) => [item.reference_mc, item]));
}

function mapByModel(snapshot) {
  const byModel = new Map();
  for (const item of snapshot || []) {
    if (!byModel.has(item.model_id)) byModel.set(item.model_id, []);
    byModel.get(item.model_id).push(item);
  }
  return byModel;
}

function isFrenchLike(text) {
  const normalized = compareText(text);
  if (!normalized) return false;
  return FRENCH_MARKERS.some((marker) => normalized.includes(marker));
}

function hasFrenchResidue(text) {
  const normalized = compareText(text);
  if (!normalized) return false;
  const markers = [
    ...FRENCH_MARKERS,
    "imprime",
    "saison",
    "ce ",
    "cette ",
    " il ",
    " elle ",
    " est ",
    " sont ",
    "avec ",
    " sans ",
    " pour ",
    " dans ",
    " une ",
    " un ",
    " des ",
    " confectionne",
    "habille",
    "carreaux",
    "maille",
    "muni",
    "allure",
    "legere",
    "elegante",
    "rehausse",
    "delicat",
    "noeud",
    "quotidien",
    "vetements",
    "matiere",
    "col rond",
    "manches",
    "bretelles",
    "sequins",
    "paillettes",
  ];
  return markers.some((marker) => normalized.includes(compareText(marker)));
}

function needsTargetTranslation(value, frValue) {
  const text = normalizeText(value);
  if (!text) return true;
  return Boolean(frValue && compareText(text) === compareText(frValue)) || hasFrenchResidue(text);
}

function cleanMachineTranslationArtifacts(text) {
  return repairText(text)
    .replace(/\s+([,.!?;:])/g, "$1")
    .replace(/([!?])\s*\./g, "$1")
    .replace(/\b24hBra\.\s*:/gi, "24hBra:")
    .replace(/\s*\|\|\|\s*/g, " ")
    .replace(/\s*•\s*/g, " • ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function polishTranslatedText(text, locale) {
  let output = cleanMachineTranslationArtifacts(text);
  if (locale === "es_ES") {
    output = output
      .replace(/Ligeros y elegantes, estos shorts están confeccionados en encaje\. Está realzado con un delicado lazo\./gi, "Ligero y elegante, este shorty está confeccionado en encaje y realzado con un delicado lazo.")
      .replace(/Tiene bolsillos de parche\./gi, "Cuenta con bolsillos de parche.")
      .replace(/Estampado de estrellas de la temporada/gi, "El estampado estrella de la temporada")
      .replace(/Sin sujetador\. Nueva sensación\./gi, "No bra. New feel.")
      .replace(/\bSoporte de silicona sin tirantes\b/gi, "Sujetador adhesivo de silicona sin tirantes")
      .replace(/\bSujetador\s+sujetador\b/gi, "Sujetador")
      .replace(/\bpantalones cortos cortos\b/gi, "shorts")
      .replace(/\bbrinda soporte\b/gi, "ofrece sujeción")
      .replace(/\bcorpiños\b/gi, "prendas bustier")
      .replace(/\bpelículas protectoras\b/gi, "láminas protectoras")
      .replace(/\bReemplazar las láminas protectoras\b/g, "Volver a colocar las láminas protectoras")
      .replace(/\breemplazar las láminas protectoras\b/g, "volver a colocar las láminas protectoras")
      .replace(/\bNo meter en la lavadora\b/gi, "No lavar a máquina")
      .replace(/\bSoporte medio\b/g, "Sujeción media");
  }
  if (locale === "pl_PL") {
    output = output
      .replace(/\bBiustonosz triangle en tulle\b/gi, "Biustonosz trójkątny z tiulu")
      .replace(/\btriangle en tulle\b/gi, "trójkątny z tiulu");
  }
  if (locale === "cz_CZ") {
    output = output
      .replace(/\bTop en crochet\b/gi, "Háčkovaný top")
      .replace(/\btop bikin\b/gi, "horní díl bikin")
      .replace(/\bkoupelových kapslí\b/gi, "plavkové kapsule");
  }
  if (locale === "en_UK") {
    output = output
      .replace(/\bpanties\b/gi, "knickers")
      .replace(/\bpajamas\b/gi, "pyjamas")
      .replace(/\bpajama\b/gi, "pyjama")
      .replace(/\bwireless\b/gi, "non-wired");
  }
  if (locale === "nl_BE") {
    output = output
      .replace(/\bgesatineerds\b/gi, "gesatineerd")
      .replace(/\bLycraÂ®\b/g, "Lycra®");
  }
  if (locale === "de_CH" || locale === "de_DE") {
    output = output
      .replace(/\bMittlere Unterstützung\b/g, "Mittlerer Halt")
      .replace(/\bmittlere Unterstützung\b/g, "mittlerer Halt");
  }
  if (locale === "de_CH") {
    output = output.replace(/ß/g, "ss");
  }
  return output;
}

function polishUkLocalizationText(text) {
  return repairText(text)
    .replace(/&#43;1 size/gi, "A visibly fuller shape")
    .replace(/\+1 size/gi, "A visibly fuller shape")
    .replace(/\bin the blink of an eye\b/gi, "instantly")
    .replace(/\bsurrounds the neckline with delicately flowered lace\b/gi, "frames the neckline with delicate floral lace")
    .replace(/A visibly fuller shape instantly with this bra, which frames the neckline with delicate floral lace\./gi, "This push-up bra enhances the cleavage and frames the neckline with delicate floral lace.")
    .replace(/\bMicrofiber\b/gi, "Microfibre")
    .replace(/\bTanga\b/gi, "Thong")
    .replace(/\bLace Tanga\b/gi, "Lace Thong")
    .replace(/\bIridescent lace tanga\b/gi, "Iridescent lace thong")
    .replace(/\bIridescent-effect lace tanga\b/gi, "Iridescent lace thong")
    .replace(/\blace edge\b/gi, "lace-trimmed")
    .replace(/\blace-edged\b/gi, "lace-trimmed")
    .replace(/\bshorty\b/gi, "boyshort")
    .replace(/\bboyshort with lace trim in microfibre\b/gi, "Lace-Trimmed Microfibre Boyshorts")
    .replace(/\bmicrofibre lace-trimmed boyshort\b/gi, "Lace-Trimmed Microfibre Boyshorts")
    .replace(/\bmicrofibre lace-trimmed thong\b/gi, "Lace-Trimmed Microfibre Thong")
    .replace(/\bunder clothing\b/gi, "under clothes")
    .replace(/\bpleasant support\b/gi, "comfortable support")
    .replace(/\bsoft underwear\b/gi, "soft everyday essentials")
    .replace(/The strips of lace delicately follow the contours of our shapes\./gi, "Delicate lace trims gently follow the curves of the body.")
    .replace(/We love these soft everyday essentials!/gi, "A soft, comfortable style for everyday wear.");
}

function isClearlyFrenchTitle(text, frTitle = "") {
  const title = compareText(text);
  const french = compareText(frTitle);
  if (!title) return false;
  if (french && title === french) return true;
  return /^(bandeau|soutien-gorge|culotte|nuisette|tanga en|shorty en|pantalon|chemise|bas de maillot|maillot|lot de|chaussettes|body avec|robe|top en|débardeur|debardeur)\b/i.test(title) ||
    /\b(avec|sans armatures|sans couture|dentelle|broderie|maillot de bain|à nouer|a nouer|en coton|en soie|en velours|en microfibre|manches courtes|manches longues|à rayures|a rayures|à motifs|a motifs|coupe large)\b/i.test(title);
}

function hasQualityWarning(item) {
  const content = `${item?.title || ""} ${item?.long_description || ""}`;
  return QUALITY_MARKERS.some((marker) => content.toLowerCase().includes(marker.toLowerCase()));
}

function spellingWarningsForItem(item, locale) {
  const content = repairText(`${item?.title || ""} ${item?.long_description || ""}`);
  if (!content) return [];
  const patterns = [
    ...SPELLING_WARNING_PATTERNS.all,
    ...(SPELLING_WARNING_PATTERNS[locale] || []),
  ];
  return patterns
    .filter(({ pattern, label }) => pattern.test(content) && !NON_SPELLING_WARNING_LABEL.test(label))
    .map(({ label }) => label);
}

function hasSpellingWarning(item, locale) {
  return spellingWarningsForItem(item, locale).length > 0;
}

function localizationSimilarityScore(localText, frText) {
  const localExact = normalizeText(localText).toLowerCase();
  const frenchExact = normalizeText(frText).toLowerCase();
  if (!localExact || !frenchExact) return 0;
  return localExact === frenchExact ? 1 : 0;
}

function isTitleNotLocalized(localItem, frItem, locale) {
  const title = normalizeText(localItem?.title || "");
  if (!title) return true;
  const frTitle = normalizeText(frItem?.title || "");
  const similarity = localizationSimilarityScore(title, frTitle);
  return similarity >= 1;
}

function translateTitle(frTitle, locale, localItem) {
  const localTitle = normalizeText(localItem?.title || "");
  if (localTitle && !isClearlyFrenchTitle(localTitle, frTitle) && !isFrenchLike(localTitle)) return localTitle;
  const source = normalizeText(frTitle);
  for (const [pattern, replacement] of TITLE_DICTIONARY[locale] || []) {
    if (pattern.test(source)) return replacement;
  }
  const cleanProposal = applyCleanTitleTerms(source, locale);
  if (cleanProposal && cleanProposal !== source && !isClearlyFrenchTitle(cleanProposal, source)) return cleanProposal;
  const glossaryProposal = glossaryTitleFromFrench(source, locale);
  if (locale === "pl_PL" && hasGlossaryTerm(compareText(source), "hipster") && glossaryProposal) return glossaryProposal;
  if (glossaryProposal && !isClearlyFrenchTitle(glossaryProposal, source) && !hasFrenchResidue(glossaryProposal)) return glossaryProposal;
  const termProposal = applyTermMap(source, locale);
  if (termProposal && termProposal !== source && !isClearlyFrenchTitle(termProposal, source)) return termProposal;
  let proposal = source;
  for (const [pattern, replacement] of TITLE_DICTIONARY[locale] || []) {
    proposal = proposal.replace(pattern, replacement);
  }
  if (proposal && proposal !== source && !isFrenchLike(proposal)) return proposal;

  const generic = {
    es_ES: "Título localizado pendiente",
    pl_PL: "Tytuł lokalny do walidacji",
    cz_CZ: "Lokalizovaný název k ověření",
    nl_BE: "Lokale titel te controleren",
    de_CH: "Lokaler Titel zur Prüfung",
    de_DE: "Lokaler Titel zur Prüfung",
  };
  const lowered = repairText(source).toLowerCase();
  if (locale === "es_ES") {
    if (lowered.includes("t-shirt") && lowered.includes("noeud")) return "Camiseta drapeada con nudo";
    if (lowered.includes("body manches longues") && lowered.includes("velours")) return "Body de manga larga de terciopelo";
    if (lowered.includes("body manches courtes") && lowered.includes("coton")) return "Body de manga corta con algodon";
    if (lowered.includes("soutien-gorge") && lowered.includes("minimizer")) return "Sujetador corbeille minimizer";
    if (lowered.includes("t-shirt")) return "Camiseta";
    if (lowered.includes("body")) return "Body";
    if (lowered.includes("soutien-gorge")) return "Sujetador";
    if (lowered.includes("culotte")) return "Braguita";
    if (lowered.includes("nuisette")) return "Picardias";
  }
  if (locale === "pl_PL") {
    if (lowered.includes("brassière") || lowered.includes("brassiere")) return applyCleanTitleTerms(source, locale);
    if (lowered.includes("t-shirt") && lowered.includes("noeud")) return "Drapowany T-shirt z wiazaniem";
    if (lowered.includes("body manches longues") && lowered.includes("velours")) return "Body z dlugim rekawem z weluru";
    if (lowered.includes("soutien-gorge") && lowered.includes("minimizer")) return "Biustonosz corbeille minimizer";
    if (lowered.includes("t-shirt")) return "T-shirt";
    if (lowered.includes("body")) return "Body";
    if (lowered.includes("soutien-gorge")) return "Biustonosz";
    if (lowered.includes("culotte")) return "Majtki";
    if (lowered.includes("nuisette")) return "Koszulka nocna";
  }
  if (locale === "cz_CZ") {
    if (lowered.includes("brassière") || lowered.includes("brassiere") || lowered.includes("maillot de bain 2")) return applyCleanTitleTerms(source, locale);
    if (lowered.includes("t-shirt") && lowered.includes("noeud")) return "Drapovane tricko s uzlem";
    if (lowered.includes("body manches longues") && lowered.includes("velours")) return "Sametove body s dlouhym rukavem";
    if (lowered.includes("soutien-gorge") && lowered.includes("minimizer")) return "Podprsenka corbeille minimizer";
    if (lowered.includes("t-shirt")) return "Tricko";
    if (lowered.includes("body")) return "Body";
    if (lowered.includes("soutien-gorge")) return "Podprsenka";
    if (lowered.includes("culotte")) return "Kalhotky";
    if (lowered.includes("nuisette")) return "Nocni kosilka";
  }
  if (locale === "nl_BE") {
    if (lowered.includes("t-shirt")) return "T-shirt";
    if (lowered.includes("body")) return "Body";
    if (lowered.includes("soutien-gorge")) return "Beha";
    if (lowered.includes("culotte")) return "Slip";
    if (lowered.includes("nuisette")) return "Nachthemdje";
    if (lowered.includes("pyjama")) return "Pyjama";
  }
  if (locale === "de_CH" || locale === "de_DE") {
    if (lowered.includes("t-shirt")) return "T-Shirt";
    if (lowered.includes("body")) return "Body";
    if (lowered.includes("soutien-gorge")) return "BH";
    if (lowered.includes("culotte")) return "Slip";
    if (lowered.includes("nuisette")) return "Neglige";
    if (lowered.includes("pyjama")) return "Pyjama";
  }
  return cleanProposal || termProposal || source;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function adaptFrenchDescription(frDescription, frTitle, locale) {
  const source = repairText(frDescription);
  if (!source) return "";
  let output = source;

  if (locale === "es_ES") {
    const exact = [
      [/No bra\. New feel\. Ultra doux, ultra extensible, ultra invisible, d[eé]couvrez Pure Soft, une collection sensation no bra\. [ÀA] la fronti[eè]re entre sous-v[eê]tement et v[eê]tement, elle est con[cç]ue pour se porter jour et nuit, dessous comme dessus\. Des pi[eè]ces aux coupes mode et minimalistes, pens[eé]es pour suivre le corps, une mati[eè]re ultra douce, ultra stretch, ultra invisible\. Une nouvelle fa[cç]on de penser la lingerie\. Confectionn[eé] dans une mati[eè]re seconde peau, douce et invisible, ce caraco en microfibre se porte aussi bien en top qu[’']en lingerie\. Dot[eé] d[’']une brassi[eè]re int[eé]gr[eé]e et de pads amovibles, il offre un effet no bra confortable, tandis que ses fines bretelles r[eé]glables s[’']ajustent [aà] vos envies\. Ultra extensible, il [eé]pouse les courbes et sublime la silhouette\./i, "No bra. New feel. Ultra suave, ultra extensible, ultra invisible: descubre Pure Soft, una colección con sensación no bra. A medio camino entre prenda interior y prenda exterior, está diseñada para llevarse día y noche, por dentro o por fuera. Piezas de cortes modernos y minimalistas, pensadas para acompañar el cuerpo, con un tejido ultra suave, ultra stretch y ultra invisible. Una nueva forma de entender la lencería. Confeccionado en un tejido efecto segunda piel, suave e invisible, este top de microfibra se lleva tanto como top como lencería. Con sujetador integrado y copas extraíbles, ofrece un efecto no bra cómodo, mientras sus finos tirantes ajustables se adaptan a tus deseos. Ultra extensible, abraza las curvas y realza la silueta."],
      [/Brassi[eè]re tricot[eé]e sans coutures pour un confort optimal et une grande libert[eé] de mouvement ! • Brassi[eè]re • Coussinets amovibles, pour un galbe adapt[eé] [aà] chaque morphologie • Sans coques • Bretelles ajustables • Sans coutures/i, "Bralette de punto sin costuras para una comodidad óptima y una gran libertad de movimiento. Bralette. Copas extraíbles para un realce adaptado a cada silueta. Sin relleno. Tirantes ajustables. Sin costuras."],
      [/100% l[eé]g[eè]ret[eé] et d[eé]licatesse, ce string en tulle brod[eé] offre un confort optimal tout en [eé]tant discret sous les v[eê]tements\. Sa finition en dentelle apporte une touche raffin[eé]e, id[eé]ale pour le quotidien\./i, "100% ligereza y delicadeza: este tanga de tul bordado ofrece una comodidad óptima y se mantiene discreto bajo la ropa. Su acabado de encaje aporta un toque refinado, ideal para el día a día."],
      [/100% d[eé]licatesse et confort, cette brassi[eè]re sans armature en broderie offre un maintien l[eé]ger tout en ajoutant une touche de romantisme [aà] la silhouette\. Sa teinte rose poudr[eé] et sa finition [eé]l[eé]gante en font un essentiel doux pour le quotidien\./i, "100% delicadeza y comodidad: esta bralette sin aros con bordado ofrece una sujeción ligera y aporta un toque romántico a la silueta. Su tono rosa empolvado y su acabado elegante la convierten en un básico suave para el día a día."],
      [/Basique incontournable du vestiaire revisit[eé],? ce t-shirt manches courtes [aà] col rond est nou[eé] et pliss[eé] sous la poitrine\./i, "Basico imprescindible del armario revisitado, esta camiseta de manga corta con cuello redondo se anuda y se frunce bajo el pecho."],
      [/Sobre et [eé]l[eé]gant,? ce body manches longues offre un effet velours et d[eé]voile un subtil d[eé]collet[eé] en V\./i, "Sobrio y elegante, este body de manga larga ofrece un efecto terciopelo y revela un sutil escote en V."],
    ];
    for (const [pattern, replacement] of exact) output = output.replace(pattern, replacement);

    const terms = [
      [/\bBasique incontournable du vestiaire revisit[eé]\b/gi, "Basico imprescindible del armario revisitado"],
      [/\bce t-shirt manches courtes\b/gi, "esta camiseta de manga corta"],
      [/\bt-shirt manches courtes\b/gi, "camiseta de manga corta"],
      [/\bcol rond\b/gi, "cuello redondo"],
      [/\best nou[eé] et pliss[eé]\b/gi, "se anuda y se frunce"],
      [/\bsous la poitrine\b/gi, "bajo el pecho"],
      [/\bSobre et [eé]l[eé]gant\b/gi, "Sobrio y elegante"],
      [/\bce body manches longues\b/gi, "este body de manga larga"],
      [/\bbody manches longues\b/gi, "body de manga larga"],
      [/\beffet velours\b/gi, "efecto terciopelo"],
      [/\bd[eé]voile\b/gi, "revela"],
      [/\bun subtil d[eé]collet[eé] en V\b/gi, "un sutil escote en V"],
      [/\bdentelle\b/gi, "encaje"],
      [/\bbroderie\b/gi, "bordado"],
      [/\bcoton\b/gi, "algodon"],
      [/\bvelours\b/gi, "terciopelo"],
      [/\bd[eé]collet[eé]\b/gi, "escote"],
      [/\bsilhouette\b/gi, "silueta"],
    ];
    for (const [pattern, replacement] of terms) output = output.replace(pattern, replacement);
  } else {
    output = applyTermMap(output, locale);
  }

  const cleanFrTitle = repairText(frTitle);
  if (cleanFrTitle) {
    output = output.replace(new RegExp(escapeRegExp(cleanFrTitle), "gi"), translateTitle(cleanFrTitle, locale, {}));
  }
  return repairText(output);
}

function proposalFromSameModel(item, sameModelItems) {
  return sameModelItems.find((candidate) =>
    candidate.reference_mc !== item.reference_mc &&
    normalizeText(candidate.long_description) &&
    !isFrenchLike(candidate.long_description)
  );
}

function proposeDescription(localItem, frItem, locale, localByModel, frByModel) {
  if (frItem?.long_description) {
    return {
      text: adaptFrenchDescription(frItem.long_description, frItem.title, locale),
      source: "FR exact",
      note: "Uses the exact French long description as source for localization."
    };
  }
  const localSameModel = proposalFromSameModel(localItem || frItem, localByModel.get((localItem || frItem)?.model_id) || []);
  if (localSameModel) {
    return {
      text: localSameModel.long_description,
      source: "local same-model/colorway compatible",
      note: `Uses ${localSameModel.reference_mc}, another colorway from the same model.`,
    };
  }
  const frSameModel = proposalFromSameModel(frItem || localItem, frByModel.get((frItem || localItem)?.model_id) || []);
  if (frSameModel) {
    return {
      text: adaptFrenchDescription(frSameModel.long_description, frSameModel.title, locale),
      source: "FR same-model",
      note: `Uses French description from ${frSameModel.reference_mc}, another colorway from the same model.`,
    };
  }
  return {
    text: assistedDescription(localItem || frItem, locale),
    source: "assisted creation",
    note: "No same-model or exact French long description found.",
  };
}

function assistedDescription(item, locale) {
  return "";
  const title = normalizeText(item?.title || "Etam product");
  const material = `${item?.category || ""} ${item?.universe || ""}`.toLowerCase();
  const invisible = material.includes("pure fit") || material.includes("invisible");
  const endings = {
    es_ES: invisible
      ? "Diseñado para un efecto segunda piel, discreto y cómodo bajo la ropa."
      : "Una propuesta femenina y cómoda, pensada para acompañar el día a día con estilo.",
    pl_PL: invisible
      ? "Zaprojektowany z efektem drugiej skóry, dyskretny i wygodny pod ubraniem."
      : "Kobieca i wygodna propozycja, stworzona z myślą o codziennym komforcie.",
    cz_CZ: invisible
      ? "Navrženo s efektem druhé kůže, diskrétní a pohodlné pod oblečením."
      : "Ženský a pohodlný kousek pro každodenní nošení.",
  };
  return `${title}. ${endings[locale] || endings.es_ES}`;
}

async function translateFromFrench(text, locale, cache) {
  const source = repairText(text);
  const target = TRANSLATE_TARGETS[locale];
  if (!source || !target) return source;
  const key = `${locale}:${hashText(source)}`;
  if (cache[key]) return cache[key];
  const pieces = splitForTranslation(source);
  const translatedPieces = [];
  for (const piece of pieces) {
    const pieceKey = `${locale}:${hashText(piece)}`;
    if (!cache[pieceKey]) cache[pieceKey] = await translateFrenchChunk(piece, target);
    translatedPieces.push(cache[pieceKey]);
  }
  const translated = repairText(translatedPieces.join(" "));
  cache[key] = translated;
  return translated;
}

function splitForTranslation(text) {
  const source = repairText(text);
  if (source.length <= 900) return [source];
  const sentences = source.match(/[^.!?•]+[.!?]?|•[^•]+/g) || [source];
  const chunks = [];
  let current = "";
  for (const sentence of sentences) {
    const clean = sentence.trim();
    if (!clean) continue;
    if ((current + " " + clean).trim().length > 850 && current) {
      chunks.push(current.trim());
      current = clean;
    } else {
      current = `${current} ${clean}`.trim();
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
}

async function translateFrenchChunk(source, target) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=fr&tl=${target}&dt=t&q=${encodeURIComponent(source)}`;
  let lastError = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`translation HTTP ${response.status}`);
      const payload = await response.json();
      return repairText((payload?.[0] || []).map((part) => part?.[0] || "").join(""));
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }
  throw lastError;
}

async function enforceTargetLanguage(rows, messages) {
  const cache = readJson(TRANSLATION_CACHE_FILE, {});
  let translatedFields = 0;
  let translationFailures = 0;
  const tasks = [];
  for (const row of rows) {
    if (!TRANSLATE_TARGETS[row.locale]) continue;
    const frTitle = repairText(row.current_fr_title);
    const frDescription = repairText(row.current_fr_long_description);

    const titleNeedsLocalization = /Title not localized|Missing translation/i.test(row.change_type || "");
    if (titleNeedsLocalization && frTitle && needsTargetTranslation(row.proposed_title, frTitle)) {
      tasks.push(async () => {
        row.proposed_title = await translateFromFrench(frTitle, row.locale, cache);
      });
    }
    const curatedTitle = applyCleanTitleTerms(frTitle, row.locale);
    const glossaryTitle = curatedTitle && curatedTitle !== frTitle && !hasFrenchResidue(curatedTitle)
      ? curatedTitle
      : glossaryTitleFromFrench(frTitle, row.locale);
    if (glossaryTitle && shouldForceGlossaryTitle(row)) {
      row.proposed_title = glossaryTitle;
    }
    if (frDescription && needsTargetTranslation(row.proposed_long_description, frDescription)) {
      tasks.push(async () => {
        row.proposed_long_description = await translateFromFrench(frDescription, row.locale, cache);
      });
    }
  }
  const results = await runLimited(tasks, 12);
  translatedFields = results.ok;
  translationFailures = results.failed;
  for (const row of rows) {
    row.proposed_title = polishTranslatedText(row.proposed_title, row.locale);
    row.proposed_long_description = polishTranslatedText(row.proposed_long_description, row.locale);
    if (row.locale === "en_UK") {
      row.proposed_title = polishUkLocalizationText(row.proposed_title);
      row.proposed_long_description = polishUkLocalizationText(row.proposed_long_description);
    }
    markProposedTextQuality(row);
    row.recommended_content_block = contentBlock(row.proposed_title, row.proposed_long_description);
  }
  writeJson(TRANSLATION_CACHE_FILE, cache);
  if (translatedFields) messages.push(`[ok] translated ${translatedFields} target-language fields from French source.`);
  if (translationFailures) messages.push(`[warn] ${translationFailures} fields could not be translated automatically and still need review.`);
}

async function runLimited(tasks, limit) {
  let cursor = 0;
  let ok = 0;
  let failed = 0;
  async function worker() {
    while (cursor < tasks.length) {
      const index = cursor;
      cursor += 1;
      try {
        await tasks[index]();
        ok += 1;
      } catch {
        failed += 1;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return { ok, failed };
}

function compareSnapshots(current, previous) {
  const currentMap = mapByReference(current);
  const previousMap = mapByReference(previous);
  const newRefs = new Set();
  const removedRefs = new Set();
  const titleChanged = new Set();
  const longDescriptionChanged = new Set();
  const localChanged = new Set();

  for (const [reference, item] of currentMap) {
    const previousItem = previousMap.get(reference);
    if (!previousItem) {
      newRefs.add(reference);
      continue;
    }
    if (item.title_hash !== previousItem.title_hash) titleChanged.add(reference);
    if (item.long_description_hash !== previousItem.long_description_hash) longDescriptionChanged.add(reference);
    if (item.title_hash !== previousItem.title_hash || item.long_description_hash !== previousItem.long_description_hash) {
      localChanged.add(reference);
    }
  }
  for (const reference of previousMap.keys()) {
    if (!currentMap.has(reference)) removedRefs.add(reference);
  }
  return { newRefs, removedRefs, titleChanged, longDescriptionChanged, localChanged };
}

function issueListForItem(params) {
  const {
    reference,
    locale,
    localItem,
    frItem,
    previousLocalItem,
    newLocalRefs,
    newFrRefs,
    frTitleChanged,
    frDescriptionChanged,
  } = params;
  const issues = [];
  if (newLocalRefs.has(reference) || newFrRefs.has(reference)) issues.push("New MC reference");
  if (frTitleChanged.has(reference) || frDescriptionChanged.has(reference)) issues.push("French source changed");
  if (frTitleChanged.has(reference)) issues.push("French title changed");
  if (frDescriptionChanged.has(reference)) issues.push("French long description changed");

  const titleNotLocalized = isTitleNotLocalized(localItem, frItem, locale);
  const missingDescription = !normalizeText(localItem?.long_description || "");
  const qualityWarning = hasQualityWarning(localItem);
  const spellingWarning = hasSpellingWarning(localItem, locale);

  if (titleNotLocalized) issues.push("Title not localized");
  if (missingDescription) issues.push("Missing long description");
  if (qualityWarning) issues.push("Critical quality warning");
  if (spellingWarning) issues.push(SPELLING_ISSUE);

  const previousHadIssue = previousLocalItem && (
    isTitleNotLocalized(previousLocalItem, frItem, locale) ||
    !normalizeText(previousLocalItem.long_description || "") ||
    hasQualityWarning(previousLocalItem) ||
    hasSpellingWarning(previousLocalItem, locale)
  );
  if (previousHadIssue && (titleNotLocalized || missingDescription || qualityWarning || spellingWarning)) issues.push("Persistent issue");

  if ((frTitleChanged.has(reference) || frDescriptionChanged.has(reference)) && localItem) {
    issues.push("Local content may need update");
  }

  return [...new Set(issues)];
}

function confidenceForIssues(issues, proposalSource) {
  if (issues.includes("Critical quality warning")) return 74;
  if (issues.includes(SPELLING_ISSUE) || issues.includes(LEGACY_SPELLING_ISSUE)) return 76;
  if (proposalSource === "local same-model/colorway compatible") return 94;
  if (proposalSource === "FR exact") return 88;
  if (issues.includes("French source changed")) return 82;
  if (proposalSource === "assisted creation") return 68;
  return 90;
}

function splitIssues(value) {
  return String(value || "")
    .split("|")
    .map((issue) => issue.trim())
    .filter(Boolean);
}

function addIssue(row, issue) {
  const issues = splitIssues(row.change_type);
  if (!issues.includes(issue)) issues.push(issue);
  row.change_type = issues.join(" | ");
}

function markProposedTextQuality(row) {
  const warnings = spellingWarningsForItem({
    title: row.proposed_title,
    long_description: row.proposed_long_description,
  }, row.locale);
  if (!warnings.length) return;
  addIssue(row, SPELLING_ISSUE);
  const note = `Proposed spelling check: ${[...new Set(warnings)].join(", ")}.`;
  row.source_logic = row.source_logic ? `${row.source_logic} ${note}` : note;
  row.confidence = Math.min(Number(row.confidence) || 90, 76);
}

function refreshQualityMetrics(countryResults) {
  for (const result of Object.values(countryResults)) {
    result.metrics.quality_warnings = result.rows.filter((row) =>
      /Critical quality warning|Spelling warning|Spelling or terminology warning/i.test(row.change_type)
    ).length;
  }
}

function countReviewSeasonRefs(refs, primaryMap, fallbackMap = new Map()) {
  let count = 0;
  for (const reference of refs) {
    if (isReviewSeason(primaryMap.get(reference)) || isReviewSeason(fallbackMap.get(reference))) count += 1;
  }
  return count;
}

function buildQueues(snapshots, previousSnapshots, options) {
  const frCurrent = snapshots.fr_FR || [];
  const frPrevious = previousSnapshots.fr_FR || [];
  const frCurrentMap = mapByReference(frCurrent);
  const frPreviousMap = mapByReference(frPrevious);
  const frDiff = compareSnapshots(frCurrent, frPrevious);
  const frByModel = mapByModel(frCurrent);
  const frCurrentInScope = frCurrent.filter(isReviewSeason);
  const firstRun = frPrevious.length === 0;

  const countryResults = {};
  const allQueueRows = [];

  for (const [locale, country] of Object.entries(COUNTRIES)) {
    const current = snapshots[locale] || [];
    const previous = previousSnapshots[locale] || [];
    const currentInScope = current.filter(isReviewSeason);
    const previousInScope = previous.filter(isReviewSeason);
    const currentMap = mapByReference(current);
    const previousMap = mapByReference(previous);
    const localDiff = compareSnapshots(current, previous);
    const localByModel = mapByModel(current);
    const references = new Set([
      ...currentMap.keys(),
      ...frDiff.newRefs,
      ...frDiff.titleChanged,
      ...frDiff.longDescriptionChanged,
    ]);

    const rows = [];
    let titleIssues = 0;
    let missingDescriptions = 0;
    let sameModelReusable = 0;
    let persistentIssues = 0;
    let qualityWarnings = 0;

    for (const reference of references) {
      const localItem = currentMap.get(reference);
      const frItem = frCurrentMap.get(reference);
      if (!localItem && !frItem) continue;
      const previousLocalItem = previousMap.get(reference);
      const effectiveLocal = localItem || {
        locale,
        reference_mc: reference,
        model_id: (frItem?.model_id || reference).slice(0, 7),
        color_id: (frItem?.color_id || reference.slice(-2)),
        title: "",
        long_description: "",
        product_url: "",
        image_url: frItem?.image_url || "",
        category: frItem?.category || "",
        universe: frItem?.universe || "",
        season_year: frItem?.season_year || "",
        season_code: frItem?.season_code || "",
        season_label: frItem?.season_label || "",
      };
      if (!isReviewSeason(effectiveLocal) && !isReviewSeason(frItem)) continue;
      const issues = issueListForItem({
        reference,
        locale,
        localItem: effectiveLocal,
        frItem,
        previousLocalItem,
        newLocalRefs: localDiff.newRefs,
        newFrRefs: frDiff.newRefs,
        frTitleChanged: frDiff.titleChanged,
        frDescriptionChanged: frDiff.longDescriptionChanged,
      });
      const hasLocalizedTitle = !isTitleNotLocalized(effectiveLocal, frItem, locale);
      const hasLocalDescription = !!normalizeText(effectiveLocal.long_description || "");
      const hasRealContentIssue = issues.some((issue) => [
        "French source changed",
        "Title not localized",
        "Missing long description",
        "Critical quality warning",
        SPELLING_ISSUE,
        "Persistent issue",
        "Local content may need update",
      ].includes(issue));
      if (hasLocalizedTitle && hasLocalDescription && !hasRealContentIssue) continue;
      const mustProcess = options.full || issues.some((issue) => [
        "New MC reference",
        "French source changed",
        "Title not localized",
        "Missing long description",
        "Critical quality warning",
        SPELLING_ISSUE,
        "Persistent issue",
      ].includes(issue));
      if (!mustProcess || issues.length === 0) continue;

      const titleNotLocalized = issues.includes("Title not localized");
      const missingDescription = issues.includes("Missing long description");
      const frSourceChanged = issues.includes("French source changed");
      const qualityWarning = issues.includes("Critical quality warning");
      const spellingWarning = issues.includes(SPELLING_ISSUE) || issues.includes(LEGACY_SPELLING_ISSUE);
      const needsValidation = titleNotLocalized || missingDescription || frSourceChanged || qualityWarning || spellingWarning;
      if (!needsValidation) continue;
      const proposal = frSourceChanged && frItem?.long_description
        ? {
          text: adaptFrenchDescription(frItem.long_description, frItem.title, locale),
          source: "FR exact",
          note: "French source changed. Existing local content is kept, with a localized update proposed for review.",
        }
        : proposeDescription(effectiveLocal, frItem, locale, localByModel, frByModel);
      const proposedTitle = titleNotLocalized ? translateTitle(frItem?.title || effectiveLocal.title, locale, effectiveLocal) : effectiveLocal.title;
      const proposedDescription = missingDescription || frSourceChanged
        ? proposal.text
        : effectiveLocal.long_description;
      const currentSpellingWarnings = spellingWarning ? spellingWarningsForItem(effectiveLocal, locale) : [];
      const sourceLogicNotes = [proposal.note];
      if (currentSpellingWarnings.length) {
        sourceLogicNotes.push(`Current spelling check: ${[...new Set(currentSpellingWarnings)].join(", ")}.`);
      }

      if (titleNotLocalized) titleIssues += 1;
      if (missingDescription) missingDescriptions += 1;
      if (proposal.source === "local same-model/colorway compatible") sameModelReusable += 1;
      if (issues.includes("Persistent issue")) persistentIssues += 1;
      if (issues.includes("Critical quality warning")) qualityWarnings += 1;

      const previousFrItem = frPreviousMap.get(reference);
      const row = {
        run_date: RUN_DATE,
        locale,
        country: country.name,
        reference_mc: reference,
        model_id: effectiveLocal.model_id,
        color_id: effectiveLocal.color_id,
        product_url: effectiveLocal.product_url || frItem?.product_url || "",
        image_url: effectiveLocal.image_url || frItem?.image_url || "",
        category: effectiveLocal.category || frItem?.category || "",
        universe: effectiveLocal.universe || frItem?.universe || "",
        season_year: effectiveLocal.season_year || frItem?.season_year || "",
        season_code: effectiveLocal.season_code || frItem?.season_code || "",
        season_label: effectiveLocal.season_label || frItem?.season_label || "",
        change_type: issues.join(" | "),
        is_new_mc: issues.includes("New MC reference") ? "true" : "false",
        fr_title_changed: issues.includes("French title changed") ? "true" : "false",
        fr_long_description_changed: issues.includes("French long description changed") ? "true" : "false",
        previous_fr_title: repairText(previousFrItem?.title || ""),
        current_fr_title: repairText(frItem?.title || ""),
        previous_fr_long_description: repairText(previousFrItem?.long_description || ""),
        current_fr_long_description: repairText(frItem?.long_description || ""),
        previous_local_title: repairText(previousLocalItem?.title || ""),
        current_local_title: repairText(effectiveLocal.title || ""),
        previous_local_long_description: repairText(previousLocalItem?.long_description || ""),
        current_local_long_description: repairText(effectiveLocal.long_description || ""),
        proposed_title: repairText(proposedTitle),
        proposed_long_description: repairText(proposedDescription),
        current_content_block: contentBlock(repairText(effectiveLocal.title), repairText(effectiveLocal.long_description)),
        recommended_content_block: contentBlock(repairText(proposedTitle), repairText(proposedDescription)),
        source_logic: sourceLogicNotes.filter(Boolean).join(" "),
        proposal_source: proposal.source,
        confidence: confidenceForIssues(issues, proposal.source),
        status: "Draft",
        title_validation: "Draft",
        description_validation: "Draft",
        reviewer_comment: "",
        approved_title: "",
        approved_long_description: "",
        last_reviewed_at: "",
      };
      rows.push(row);
    }

    const currentAnomalies = currentInScope.filter((item) =>
      isTitleNotLocalized(item, frCurrentMap.get(item.reference_mc), locale) ||
      !normalizeText(item.long_description) ||
      hasQualityWarning(item) ||
      hasSpellingWarning(item, locale)
    );
    const previousAnomalies = previousInScope.filter((item) =>
      isTitleNotLocalized(item, frPreviousMap.get(item.reference_mc), locale) ||
      !normalizeText(item.long_description) ||
      hasQualityWarning(item) ||
      hasSpellingWarning(item, locale)
    );

    countryResults[locale] = {
      locale,
      name: country.name,
      csv: country.csv,
      rows,
      metrics: {
        total_mc_references: currentInScope.length,
        title_translation_issues: titleIssues,
        missing_long_descriptions: missingDescriptions,
        same_model_colorway_reusable_descriptions: sameModelReusable,
        mc_to_review: rows.length,
        new_mc_references_today: countReviewSeasonRefs(localDiff.newRefs, currentMap) + countReviewSeasonRefs(frDiff.newRefs, frCurrentMap),
        french_titles_changed: countReviewSeasonRefs(frDiff.titleChanged, frCurrentMap, currentMap),
        french_long_descriptions_changed: countReviewSeasonRefs(frDiff.longDescriptionChanged, frCurrentMap, currentMap),
        country_content_gaps_detected: currentAnomalies.length,
        persistent_issues: persistentIssues,
        resolved_since_last_run: firstRun ? 0 : Math.max(0, previousAnomalies.length - currentAnomalies.length),
        products_removed_from_feed: localDiff.removedRefs.size,
        quality_warnings: qualityWarnings + rows.filter((row) => /Spelling warning|Spelling or terminology warning/i.test(row.change_type)).length,
      },
    };
    allQueueRows.push(...rows);
  }

  return {
    firstRun,
    frMetrics: {
      total_mc_references: frCurrentInScope.length,
      new_mc_references_today: countReviewSeasonRefs(frDiff.newRefs, frCurrentMap),
      french_titles_changed: countReviewSeasonRefs(frDiff.titleChanged, frCurrentMap),
      french_long_descriptions_changed: countReviewSeasonRefs(frDiff.longDescriptionChanged, frCurrentMap),
      products_removed_from_feed: countReviewSeasonRefs(frDiff.removedRefs, frPreviousMap),
    },
    countryResults,
    allQueueRows,
  };
}

function contentBlock(title, description) {
  return `TITLE\n${normalizeText(title)}\n\nLong description\n${normalizeText(description)}`;
}

function legacyReviewCandidates() {
  const home = process.env.USERPROFILE || process.env.HOME || "";
  return [
    path.join(ROOT, "legacy_review_interface.html"),
    path.join(home, "Downloads", "review_interface.html"),
    path.join(home, "Downloads", "review_interface (1).html"),
  ];
}

function extractLegacyData(html) {
  const marker = "const data = ";
  const start = html.indexOf(marker);
  if (start === -1) return null;
  const jsonStart = start + marker.length;
  let inString = false;
  let escaped = false;
  let depth = 0;
  let jsonEnd = -1;
  for (let i = jsonStart; i < html.length; i += 1) {
    const char = html[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        jsonEnd = i + 1;
        break;
      }
    }
  }
  if (jsonEnd === -1) return null;
  const jsonText = html.slice(jsonStart, jsonEnd).trim();
  return JSON.parse(jsonText);
}

function normalizeLegacyIssue(value) {
  const text = normalizeText(value);
  if (!text) return "";
  if (text.toLowerCase() === "missing title") return "Missing translation";
  if (text.toLowerCase() === "missing name") return "Missing translation";
  return text;
}

function splitLegacyIssues(item) {
  const issues = [
    normalizeLegacyIssue(item.title_status),
    normalizeLegacyIssue(item.description_status),
  ].filter((issue) => issue && !/^existing/i.test(issue));

  const reason = normalizeText(item.reason);
  if (/title not localized/i.test(reason) && !issues.includes("Title not localized")) issues.push("Title not localized");
  if (/missing title/i.test(reason) && !issues.includes("Missing translation")) issues.push("Missing translation");
  if (/missing long description/i.test(reason) && !issues.includes("Missing long description")) issues.push("Missing long description");
  return [...new Set(issues.length ? issues : ["Persistent issue"])];
}

function convertLegacyRows(legacyData, seasonLookup = new Map()) {
  const rows = [];
  for (const [legacyLang, items] of Object.entries(legacyData || {})) {
    const locale = LEGACY_LANG_TO_LOCALE[legacyLang];
    if (!locale || !Array.isArray(items)) continue;
    for (const item of items) {
      const reference = normalizeText(item.reference_mc);
      if (!reference) continue;
      const season = seasonLookup.get(reference) || {};
      const currentTitle = repairText(item.current_name);
      const currentDescription = repairText(item.current_description);
      const proposedTitleRaw = repairText(item.proposed_name);
      const frTitle = repairText(item.fr_name);
      const frDescription = repairText(item.fr_description);
      const titleIsAlreadyLocal = Boolean(currentTitle && !isClearlyFrenchTitle(currentTitle, frTitle));
      const hasLocalLongDescription = Boolean(currentDescription);
      const titleNeedsLocalization = !titleIsAlreadyLocal && (
        !currentTitle ||
        isFrenchLike(currentTitle) ||
        isClearlyFrenchTitle(currentTitle, frTitle) ||
        isClearlyFrenchTitle(proposedTitleRaw, frTitle)
      );
      let proposedTitle = titleNeedsLocalization
        ? translateTitle(frTitle || proposedTitleRaw || currentTitle, locale, { title: currentTitle })
        : currentTitle;
      if (proposedTitle && isFrenchLike(proposedTitle)) {
        proposedTitle = applyCleanTitleTerms(proposedTitle, locale);
      }
      if (proposedTitle && isFrenchLike(proposedTitle) && frTitle) {
        proposedTitle = translateTitle(frTitle, locale, {});
      }
      const legacyProposalDescription = repairText(item.proposed_description);
      const proposedDescription = hasLocalLongDescription
        ? currentDescription
        : frDescription
          ? adaptFrenchDescription(frDescription, frTitle, locale)
          : "";
      const issues = splitLegacyIssues(item).filter((issue) => {
        if (/Title not localized|Missing translation/i.test(issue)) return !titleIsAlreadyLocal && titleNeedsLocalization;
        if (/Missing long description/i.test(issue)) return !hasLocalLongDescription;
        return true;
      });
      if (titleIsAlreadyLocal && hasLocalLongDescription && !issues.some((issue) => /French source changed|quality warning|Spelling warning|New MC reference|Persistent issue/i.test(issue))) {
        continue;
      }
      const source = normalizeText(item.source_type || "legacy review data");
      rows.push({
        run_date: RUN_DATE,
        locale,
        country: COUNTRIES[locale].name,
        reference_mc: reference,
        model_id: reference.slice(0, 7),
        color_id: reference.slice(-2),
        product_url: normalizeText(item.product_url),
        image_url: normalizeText(item.image),
        category: normalizeText(item.category),
        universe: normalizeText(item.universe),
        season_year: normalizeText(item.season_year) || season.seasonYear || "",
        season_code: normalizeText(item.season_code) || season.seasonCode || "",
        season_label: normalizeText(item.season_label) || season.seasonLabel || "",
        change_type: issues.join(" | "),
        is_new_mc: "false",
        fr_title_changed: "false",
        fr_long_description_changed: "false",
        previous_fr_title: "",
        current_fr_title: repairText(item.fr_name),
        previous_fr_long_description: "",
        current_fr_long_description: repairText(item.fr_description),
        previous_local_title: "",
        current_local_title: currentTitle,
        previous_local_long_description: "",
        current_local_long_description: currentDescription,
        proposed_title: proposedTitle,
        proposed_long_description: proposedDescription,
        current_content_block: contentBlock(currentTitle, currentDescription),
        recommended_content_block: contentBlock(proposedTitle, proposedDescription),
        source_logic: repairText(item.source_label || item.lexicon_logic),
        proposal_source: source,
        confidence: Number(item.confidence || 80),
        status: "Draft",
        title_validation: "Draft",
        description_validation: "Draft",
        reviewer_comment: "",
        approved_title: "",
        approved_long_description: "",
        last_reviewed_at: "",
      });
    }
  }
  return rows;
}

function buildSummaryFromRows(rows, messages, legacyPath) {
  const countries = {};
  for (const [locale, country] of Object.entries(COUNTRIES)) {
    const countryRows = rows.filter((row) => row.locale === locale);
    countries[locale] = {
      locale,
      name: country.name,
      csv: country.csv,
      metrics: {
        total_mc_references: new Set(countryRows.map((row) => row.reference_mc)).size,
        title_translation_issues: countryRows.filter((row) => /Title not localized|Missing translation/i.test(row.change_type)).length,
        missing_long_descriptions: countryRows.filter((row) => /Missing long description/i.test(row.change_type)).length,
        same_model_colorway_reusable_descriptions: countryRows.filter((row) => /same model|colorway|local_model/i.test(`${row.proposal_source} ${row.source_logic}`)).length,
        mc_to_review: countryRows.length,
        new_mc_references_today: countryRows.filter((row) => row.is_new_mc === "true").length,
        french_titles_changed: 0,
        french_long_descriptions_changed: 0,
        country_content_gaps_detected: countryRows.length,
        persistent_issues: countryRows.filter((row) => /Persistent issue/i.test(row.change_type)).length,
        resolved_since_last_run: 0,
        products_removed_from_feed: 0,
        quality_warnings: countryRows.filter((row) => /Critical quality warning|Spelling warning|Spelling or terminology warning/i.test(row.change_type)).length,
      },
    };
  }
  return {
    run_date: RUN_DATE,
    mode: "legacy fallback",
    first_run: false,
    first_run_message: `Live feeds could not be loaded in this session. The review queue was rebuilt from ${legacyPath}.`,
    messages,
    feeds: {
      legacy_review_interface: { source_url: `local:${legacyPath}`, raw_copy: "" },
    },
    france: {
      total_mc_references: new Set(rows.map((row) => row.reference_mc)).size,
      new_mc_references_today: 0,
      french_titles_changed: 0,
      french_long_descriptions_changed: 0,
      products_removed_from_feed: 0,
    },
    countries,
  };
}

function tryLegacyFallback(messages) {
  const seasonLookupResult = loadSeasonLookup();
  if (seasonLookupResult.source) {
    messages.push(`[ok] season lookup loaded from ${seasonLookupResult.source}.`);
  } else {
    messages.push("[warn] no season lookup feed found; season filter will show unavailable rows.");
  }
  for (const candidate of legacyReviewCandidates()) {
    if (!fs.existsSync(candidate)) continue;
    try {
      const legacyData = extractLegacyData(fs.readFileSync(candidate, "utf8"));
      const rows = convertLegacyRows(legacyData, seasonLookupResult.lookup);
      if (rows.length === 0) continue;
      messages.push(`[ok] legacy fallback loaded ${rows.length} review rows from ${candidate}.`);
      return { rows, summary: buildSummaryFromRows(rows, messages, candidate) };
    } catch (error) {
      messages.push(`[warn] legacy fallback failed for ${candidate}: ${error.message}`);
    }
  }
  return null;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderDashboard(summary) {
  const countries = Object.values(summary.countries);
  const totalQueue = countries.reduce((sum, country) => sum + country.metrics.mc_to_review, 0);
  const totalGaps = countries.reduce((sum, country) => sum + country.metrics.country_content_gaps_detected, 0);
  const totalPersistent = countries.reduce((sum, country) => sum + country.metrics.persistent_issues, 0);
  const totalResolved = countries.reduce((sum, country) => sum + country.metrics.resolved_since_last_run, 0);
  const cards = [
    ["France MC references", summary.france.total_mc_references],
    ["New MC references today", summary.france.new_mc_references_today],
    ["French titles changed", summary.france.french_titles_changed],
    ["French long descriptions changed", summary.france.french_long_descriptions_changed],
    ["Country content gaps detected", totalGaps],
    ["Queue items", totalQueue],
  ];
  const countryHtml = countries.map((country) => `
    <section class="country">
      <div class="country-head">
        <div>
          <h2>${escapeHtml(country.name)} <span>${escapeHtml(country.locale)}</span></h2>
          <p>${escapeHtml(country.metrics.mc_to_review)} MC references need review. Export: <a href="${escapeHtml(country.csv)}">${escapeHtml(country.csv)}</a></p>
        </div>
      </div>
      <div class="metrics">
        ${metric("Total MC references", country.metrics.total_mc_references)}
        ${metric("Title translation issues", country.metrics.title_translation_issues)}
        ${metric("Missing long descriptions", country.metrics.missing_long_descriptions)}
        ${metric("Same-model/colorway reusable", country.metrics.same_model_colorway_reusable_descriptions)}
        ${metric("Persistent issues", country.metrics.persistent_issues)}
        ${metric("Resolved since last run", country.metrics.resolved_since_last_run)}
      </div>
    </section>
  `).join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Etam PIM Localization Validation Tool</title>
  <style>
    :root { --ink:#25282d; --muted:#6e6663; --line:#eadfdd; --paper:#fff; --soft:#fbf7f6; --rose:#f3e3e1; --accent:#9b7a72; }
    * { box-sizing:border-box; }
    body { margin:0; font-family:Arial,sans-serif; color:var(--ink); background:var(--soft); }
    header { padding:26px 34px; background:var(--paper); border-bottom:1px solid var(--line); }
    h1 { margin:0 0 8px; font-size:28px; }
    p { color:var(--muted); line-height:1.45; }
    main { padding:22px 34px 42px; }
    .notice, .country, .daily { background:var(--paper); border:1px solid var(--line); border-radius:8px; padding:18px; margin-bottom:16px; }
    .metrics { display:grid; grid-template-columns:repeat(6,minmax(130px,1fr)); gap:10px; margin-top:14px; }
    .metric { background:#fffaf8; border:1px solid var(--line); border-radius:6px; padding:12px; }
    .metric strong { display:block; font-size:22px; margin-bottom:4px; }
    .metric span { color:var(--muted); font-size:12px; }
    h2 { margin:0 0 8px; font-size:20px; }
    h2 span { color:var(--muted); font-size:13px; font-weight:400; }
    a { color:#7b2d26; font-weight:700; text-decoration:none; }
    .daily-grid { display:grid; grid-template-columns:repeat(4,minmax(140px,1fr)); gap:10px; }
    @media (max-width:900px){ header,main{padding-left:16px;padding-right:16px}.metrics,.daily-grid{grid-template-columns:1fr 1fr} }
    @media (max-width:560px){ .metrics,.daily-grid{grid-template-columns:1fr} }
  </style>
</head>
<body>
  <header>
    <h1>Etam PIM Localization Validation Tool</h1>
    <p>This week’s queue focuses on product/color references that need localization validation before PIM import.</p>
  </header>
  <main>
    <section class="notice">
      <h2>Run status</h2>
      <p>${escapeHtml(summary.first_run_message || "Incremental baseline comparison completed.")}</p>
      <p><a href="review_interface.html">Open PIM localization validation tool</a></p>
    </section>
    <section class="daily">
      <h2>Daily changes</h2>
      <div class="daily-grid">
        ${cards.map(([label, value]) => metric(label, value)).join("")}
        ${metric("Persistent issues", totalPersistent)}
        ${metric("Resolved since last run", totalResolved)}
        ${metric("Products removed from feed", summary.france.products_removed_from_feed)}
      </div>
    </section>
    ${countryHtml}
  </main>
</body>
</html>`;
}

function metric(label, value) {
  return `<div class="metric"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`;
}

function renderReviewInterface(summary, rows) {
  const rowsJson = JSON.stringify(rows).replace(/</g, "\\u003c");
  const summaryJson = JSON.stringify(summary.countries).replace(/</g, "\\u003c");
  const exportLocalesJson = JSON.stringify(Object.fromEntries(
    Object.entries(COUNTRIES).map(([locale, country]) => [locale, country.exportLocale || locale])
  )).replace(/</g, "\\u003c");
  const seasonOptions = Array.from(new Set(rows.map((row) => row.season_label).filter(Boolean))).sort();
  const seasonOptionsHtml = seasonOptions.map((season) => `<option value="${escapeHtml(season)}">${escapeHtml(season)}</option>`).join("");
  const countries = Object.values(summary.countries).map((country) => `<button class="tab" data-locale="${country.locale}">${escapeHtml(country.name)}</button>`).join("") +
    '<button class="tab" data-locale="tone">Tone of voice</button>';
  const toneCards = Object.entries(COUNTRIES)
    .map(([locale, country]) => `<div class="tone-card"><h2>${escapeHtml(country.toneLabel || country.name)}</h2><textarea class="tone-field" data-locale="${locale}"></textarea></div>`)
    .join("");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Etam PIM Localization Validation Tool</title>
  <style>
    :root { --ink:#25282d; --muted:#746c6a; --line:#eadfdd; --paper:#fff; --soft:#fbf7f6; --header:#f5edeb; --rose:#f3e3e1; --warn:#f8eee9; --ok:#edf6f0; --accent:#9b7a72; }
    * { box-sizing:border-box; }
    body { margin:0; font-family:Arial,sans-serif; color:var(--ink); background:var(--soft); }
    header { padding:18px 22px; background:var(--paper); border-bottom:1px solid var(--line); }
    h1 { margin:0 0 5px; font-size:22px; }
    header p { margin:0; color:var(--muted); font-size:13px; line-height:1.4; }
    main { padding:16px 22px 28px; }
    button { border:1px solid var(--line); border-radius:5px; background:var(--paper); color:var(--ink); padding:8px 11px; font-weight:700; cursor:pointer; }
    button:hover { border-color:#d8c4c1; background:#fffafa; }
    .primary { background:var(--accent); border-color:var(--accent); color:#fff; }
    .tabs { display:flex; gap:6px; margin-bottom:12px; flex-wrap:wrap; }
    .tab.active { background:var(--rose); border-color:#d8c4c1; }
    .recap { background:var(--paper); border:1px solid var(--line); border-radius:8px; padding:12px; margin-bottom:12px; }
    .recap h2 { margin:0 0 8px; font-size:16px; }
    .recap-grid { display:grid; grid-template-columns:repeat(5,minmax(130px,1fr)); gap:8px; }
    .recap-item { background:#fffaf8; border:1px solid var(--line); border-radius:6px; padding:9px; }
    .recap-item strong { display:block; font-size:18px; }
    .recap-item span { color:var(--muted); font-size:11px; }
    .toolbar { display:flex; flex-wrap:wrap; gap:10px; align-items:center; margin-bottom:12px; }
    .toolbar input { flex:1 1 320px; }
    .toolbar select { flex:0 1 240px; }
    .toolbar button { flex:0 1 190px; min-height:42px; }
    .toolbar .primary { flex:1 1 260px; }
    input, select { width:100%; border:1px solid var(--line); border-radius:5px; padding:9px 10px; font-size:13px; background:var(--paper); }
    .count { color:var(--muted); font-size:13px; }
    .sheet { background:var(--paper); border:1px solid var(--line); border-radius:8px; overflow:auto; max-height:calc(100vh - 190px); }
    table { width:100%; border-collapse:separate; border-spacing:0; min-width:1720px; table-layout:fixed; font-size:13px; }
    th { position:sticky; top:0; z-index:3; background:var(--header); color:#655c5a; text-align:left; border-bottom:1px solid var(--line); padding:8px; font-size:11px; text-transform:uppercase; font-weight:700; }
    td { border-bottom:1px solid #f1e9e7; border-right:1px solid #f1e9e7; padding:10px; vertical-align:top; background:var(--paper); }
    tr.ready td { background:var(--ok); }
    .sticky { position:sticky; left:0; z-index:2; background:inherit; }
    th.sticky { z-index:4; background:var(--header); }
    .product { display:grid; grid-template-columns:58px 1fr; gap:10px; align-items:start; }
    .thumb { width:58px; height:76px; object-fit:cover; border:1px solid var(--line); border-radius:6px; background:#f1f3f5; }
    .ref { font-weight:700; margin-bottom:4px; }
    .meta { color:var(--muted); line-height:1.25; }
    .issue-list { display:flex; flex-direction:column; gap:5px; }
    .tag { display:inline-block; background:var(--warn); border:1px solid #ead0c8; color:#755a54; border-radius:999px; padding:4px 7px; line-height:1.2; font-size:12px; width:fit-content; }
    .tag-title { background:#f4e2df; border-color:#debab4; color:#744c45; }
    .tag-description { background:#f7eee4; border-color:#e5cdb5; color:#6f563d; }
    .tag-other { background:#f4f0ed; border-color:#ddd2ce; color:#655c5a; }
    .tag-quality { background:#fff2cf; border-color:#e9cf7f; color:#6b561f; }
    .confidence { display:inline-block; background:#f4f0ed; border:1px solid var(--line); border-radius:4px; padding:4px 6px; color:#655c5a; font-weight:700; }
    textarea, .title-field { width:100%; border:1px solid #dfd3d0; border-radius:4px; font:inherit; line-height:1.35; padding:7px; background:#fff; }
    textarea { min-height:145px; resize:vertical; }
    .edit-block label { display:block; color:#473f3d; font-size:11px; font-weight:700; text-transform:uppercase; margin:0 0 5px; }
    .edit-block label + input, .edit-block label + textarea { margin-bottom:12px; }
    .source, .logic, .diff { max-height:170px; overflow:auto; color:#3f464e; line-height:1.4; white-space:pre-wrap; }
    .logic { color:var(--muted); }
    .row-actions { display:flex; flex-direction:column; gap:6px; min-width:96px; }
    .checks { display:flex; flex-direction:column; gap:8px; }
    .checks label { display:flex; gap:7px; align-items:flex-start; color:#3f464e; font-size:12px; line-height:1.25; }
    .checks input { width:auto; margin-top:1px; }
    .small { padding:6px 8px; font-size:12px; }
    .tone-panel { background:var(--paper); border:1px solid var(--line); border-radius:8px; padding:14px; margin-bottom:12px; }
    .tone-grid { display:grid; grid-template-columns:repeat(3,minmax(220px,1fr)); gap:12px; }
    .tone-card { border:1px solid var(--line); border-radius:6px; padding:12px; background:#fffaf8; }
    .tone-card h2 { margin:0 0 8px; font-size:15px; }
    .tone-card textarea { min-height:150px; }
    .learned, .export-status { margin-top:12px; color:var(--muted); font-size:13px; }
    @media (max-width:900px){ main,header{padding-left:12px;padding-right:12px}.recap-grid{grid-template-columns:1fr 1fr}.toolbar input,.toolbar select,.toolbar button,.toolbar .primary{flex:1 1 100%}.toolbar .count{flex:1 1 100%}.sheet{max-height:none} }
  </style>
</head>
<body>
  <header>
    <h1>Etam PIM Localization Validation Tool</h1>
    <p>Validate localized titles and long descriptions, then export only approved content in the PIM import format.</p>
  </header>
  <main>
    <div class="tabs">${countries}</div>
    <section class="recap" id="recap"></section>
    <section class="tone-panel" id="tonePanel" hidden>
      <div class="tone-grid">${toneCards}</div>
      <p class="learned" id="learnedCount"></p>
    </section>
    <div class="toolbar" id="toolbar">
      <input id="search" placeholder="Search reference, issue, title, category">
      <select id="seasonFilter"><option value="">All seasons</option>${seasonOptionsHtml}<option value="__unknown">Season not available</option></select>
      <span class="count" id="count"></span>
      <button id="draftOnly">To review</button>
      <button id="approveTitles">Validate visible titles</button>
      <button id="approveDescriptions">Validate visible descriptions</button>
      <button id="approveAllVisible">Ready visible for PIM</button>
      <button class="primary" id="exportCsv">Export approved for PIM</button>
      <span class="export-status" id="exportStatus"></span>
    </div>
    <div class="sheet" id="sheet">
      <table>
        <thead>
          <tr>
            <th class="sticky" style="width:280px">Product</th>
            <th style="width:90px">Confidence</th>
            <th style="width:210px">Issue</th>
            <th style="width:360px">Recommended content</th>
            <th style="width:280px">French source before / after</th>
            <th style="width:240px">Source & logic</th>
            <th style="width:180px">Validation</th>
          </tr>
        </thead>
        <tbody id="body"></tbody>
      </table>
    </div>
  </main>
  <script>
    const rows = ${rowsJson};
    const countrySummary = ${summaryJson};
    const exportLocales = ${exportLocalesJson};
    let activeLocale = rows[0]?.locale || "es_ES";
    let draftOnly = false;
    const tabs = Array.from(document.querySelectorAll(".tab"));
    const body = document.getElementById("body");
    const search = document.getElementById("search");
    const seasonFilter = document.getElementById("seasonFilter");
    const count = document.getElementById("count");
    const recap = document.getElementById("recap");
    const toolbar = document.getElementById("toolbar");
    const sheet = document.getElementById("sheet");
    const tonePanel = document.getElementById("tonePanel");
    const learnedCount = document.getElementById("learnedCount");
    const exportStatus = document.getElementById("exportStatus");
    const toneDefaults = {
      es_ES: "Espagne - tone of voice Etam\\n\\nStyle: clair, naturel, feminin, e-commerce, avec des phrases fluides et courtes. Le texte doit rester proche du francais source: ne jamais ajouter un usage, une saison, une occasion ou un conseil de style absent du FR.\\n\\nVocabulaire observe dans Lengow: sujetador, braguita, tanga, bikini, top de bikini, banador, pantalon de pijama, camiseta, camisa, picardias/camison, encaje, bordado, algodon, microfibra, satinado, brillante, copas, aros, escote, cintura, manga corta, manga larga.\\n\\nFormulations naturelles: de encaje, de algodon, con lazada, sin costuras, sin aros, de corte ancho, estampado, de rayas, floral. Garder les noms de collection et les noms anglais de modele quand ils sont un vrai nom produit.\\n\\nA eviter: titre francais dans la description, traduction mot a mot, promesses inventees, phrases lifestyle trop longues, references plage/ete si le FR ne les mentionne pas.",
      pl_PL: "Pologne - tone of voice Etam\\n\\nStyle: chaleureux, precis, feminin, oriente benefice produit. Le polonais utilise volontiers des groupes nominaux courts pour les titres et des descriptions concretes. Rester strictement base sur le FR: type produit, matiere, forme, maintien, confort, effet visuel.\\n\\nVocabulaire observe dans Lengow: biustonosz, majtki, stringi, figi, body, bikini, gora od bikini, dol od bikini, jednoczesciowy stroj kapielowy, koszulka nocna, spodnie od pizamy, koszula od pizamy, szorty pizama/piżamowe, koronka, haft, bawelna, mikrofibra, jedwab, satyna, welur, fiszbiny, miseczki, ramiaczka, gleboki dekolt.\\n\\nFormulations naturelles: z koronki, z bawelny, z mikrofibry, z haftem, z koronkowymi detalami, bezszwowe, bez fiszbin, z odpinanymi ramiaczkami, z glebokim dekoltem, w paski, we wzory, z nadrukiem.\\n\\nA eviter: hybrides FR/PL comme 'courte a motifs', 'en bawelna', 'avec', 'dentelle'. Ne pas creer de claims nouveaux; si la description FR manque, laisser vide pour review plutot que d'inventer.",
      cz_CZ: "Republique tcheque - tone of voice Etam\\n\\nStyle: clair, naturel, feminin, informatif. Les titres sont descriptifs et directs, les descriptions restent proches du benefice produit. Conserver le contexte FR sans ajouter d'occasion, de saison ou de conseil de look absent du texte source.\\n\\nVocabulaire observe dans Lengow: podprsenka, kalhotky, tanga, body, horni dil plavek, spodni dil plavek, jednodilne plavky, pyzamove kalhoty, pyzamova kosile, pyzamove sortky, nocni kosilka, tricko, krajka, vysivka, bavlna, mikrovlakno, hedvabi, satén, samet, kostice, kosicky, raminka, hluboky vystrih.\\n\\nFormulations naturelles: z krajky, z bavlny, z mikrovlakna, s krajkovymi detaily, s vysivkou, bezesve, bez kostic, s odnimatelnymi raminky, s hlubokym vystrihem, s prouzky, se vzory, s potiskem, se zavazovanim.\\n\\nA eviter: hybrides FR/CZ comme 'en soie', 'details dentelle', 'pantalon de pyjama', 'avec'. Ne pas proposer une description inventee quand la source FR est absente.",
      en_UK: "United Kingdom - tone of voice Etam\\n\\nCustomer need first: in the UK lingerie market, comfort is the leading expectation, with fit next and style still important. Write copy that sounds reassuring, flattering and easy to shop: comfort, fit, support, smoothness under clothes and confidence should come before decorative detail.\\n\\nStyle: polished, feminine and product-first, with a confident UK retail feel. Keep the copy close to the French source, but make it sound natural for a British lingerie customer: clean, lightly sensorial, never overblown, never too American.\\n\\nStrong UK vocabulary to prefer: knickers rather than panties, non-wired rather than wireless, balcony and plunge for bra shapes, full briefs, high-leg, thong, Brazilian knickers, no-VPL, pyjama set, dressing gown, nightdress, bikini top, bikini bottoms, swimsuit, multipack. Use microfibre, cotton-rich, lace, embroidered, seamless, lightly padded, underwired, removable straps, second-skin and barely-there when the French source supports it.\\n\\nTitle pattern: lead with the product type, then the key material, shape or detail. Keep titles short, retail-ready and concrete: Lace Balcony Bra, Cotton-Rich Full Briefs, Seamless Microfibre Thong, Satin Pyjama Set. Prioritise fit-led and problem-led wording when relevant, such as smoothing, seamless, non-wired, full coverage, plunge or high-leg. Avoid literal French structure and avoid piling up too many descriptors.\\n\\nDescription pattern: start with comfort, fit, feel or finish, then mention the main material or feature, then close with discretion, support, confidence or silhouette if the French source supports it. The rhythm should be fluid and understated, like Boux Avenue and M&S: soft on skin, easy to wear, smooth under clothes, flattering shape, everyday comfort. Matching sets can be mentioned only if the French source genuinely supports it.\\n\\nAvoid: panties, pajama, robe, overly sexy copy, invented styling advice, unsupported benefits, and translations that keep French syntax. Do not add claims unless they are clearly present in the French source.",
      nl_BE: "Belgium Flemish - tone of voice Etam\\n\\nSource insight: the Belgium Flemish feed uses polite Belgian retail copy with u/uw, while Hunkemoller Belgium combines everyday basics, elegant sets, feminine and sexy lingerie, plus fit-led categories such as comfort bh's, bh pasvorm and multipack slips. Keep Etam more refined and less promotional than Hunkemoller, but still clear and easy to shop.\\n\\nStyle: warm, direct, polished Flemish retail copy for Belgium. Use u/uw rather than je/jouw for body copy. Prioritise comfort, pasvorm, zachte materialen, ondersteuning, onzichtbaarheid onder kleding and elegant detail. Keep sentences natural and compact. Do not normalise Flemish wording into Netherlands Dutch when it is idiomatic in Belgium.\\n\\nStrong vocabulary to prefer: beha, push-upbeha, balconettebeha, bralette, slip, string, brazilian, hoge tailleslip, body, pyjama, nachthemdje, badpak, bikinitop, bikinibroekje, kant, borduursel, katoen, microvezel, satijn, naadloos, met beugel, zonder beugel, verstelbare bandjes, zachte cups, multipack.\\n\\nTitle pattern: product type first, then pack/material/shape/detail: 3-pack katoenen slips, Kanten balconettebeha, Naadloze microvezelstring, Satijnen pyjamaset. Avoid French order and avoid overlong adjective stacks.\\n\\nDescription pattern: open with comfort, fit or feel, then material/detail, then practical benefit such as discreet under clothes, everyday wear, support or silhouette.\\n\\nAvoid: literal French syntax, Dutch/French hybrids, over-sexy copy, and invented styling advice.",
      de_CH: "Switzerland German - tone of voice Etam\\n\\nSource insight: the Swiss German feed is concise and benefit-led around Komfort, Weichheit, Halt and Alltag. Competitor cues from Triumph/Beldona in Switzerland emphasise Komfort, Stil, Passform and Qualitat, while German Intimissimi foregrounds Eleganz, Weiblichkeit, weiche elastische Spitze and Unterstützung.\\n\\nStyle: precise, premium, understated Swiss e-commerce German. Use standard German spelling for the feed; avoid ß in Swiss-facing copy where possible by using ss. Sound calm, practical and high-quality, less promotional than German marketplace copy.\\n\\nStrong vocabulary to prefer: BH, Push-up-BH, Balconette-BH, Bralette, Slip, String, Brazilian, High-Waist-Slip, Body, Pyjama, Neglige, Badeanzug, Bikinioberteil, Bikinihose, Spitze, Stickerei, Baumwolle, Mikrofaser, Satin, nahtlos, mit Buegeln, ohne Buegel, verstellbare Traeger, weiche Cups, angenehmer Halt, bequeme Passform.\\n\\nTitle pattern: product type first, with German compounds where natural: 3er-Pack Baumwollslips, Balconette-BH aus Spitze, Nahtloser String aus Mikrofaser, Pyjama-Set aus Satin.\\n\\nDescription pattern: start with comfort/passform/feel, then material and construction, then benefit for Alltag, discreet wear, support or silhouette. Keep it factual and elegant.\\n\\nAvoid: ß, overclaiming, literal French structure, unsupported seduction language, and German that sounds machine-translated.",
      de_DE: "Germany German - tone of voice Etam\\n\\nSource insight: the German feed is benefit-led around Komfort, Weichheit, Halt and Alltag. Competitor cues from Intimissimi Germany emphasise Eleganz, Weiblichkeit, weiche bequeme elastische Spitze, perfekte Passform and Unterstützung; Hunkemoller Germany/Hunkemoller category language is fit-led and easy to shop.\\n\\nStyle: confident German e-commerce copy, polished but concrete. Lead with comfort, fit, support and material quality, then feminine detail. Slightly more retail-energy than Switzerland, but still concise and product-first.\\n\\nStrong vocabulary to prefer: BH, Push-up-BH, Balconette-BH, Buegel-BH, buegelloser BH, Bralette, Slip, String, Brazilian, Taillenslip, Body, Pyjama, Neglige, Badeanzug, Bikinioberteil, Bikinihose, Spitze, Stickerei, Baumwolle, Mikrofaser, Satin, nahtlos, wattiert, ungepolstert, verstellbare Traeger, sicherer Halt, schmeichelnde Form, angenehmer Tragekomfort.\\n\\nTitle pattern: product type first, then material/shape/detail: 3er-Pack Baumwollslips, Balconette-BH aus Spitze, Nahtloser Mikrofaser-String, Satin-Pyjama-Set.\\n\\nDescription pattern: open with comfort, fit, support or feel, then material and detail, then the benefit: everyday comfort, smooth under clothing, flattering shape or natural support.\\n\\nAvoid: literal French syntax, French nouns left in German, invented occasion claims, overly sensual wording, and clumsy agreement such as dieser 3er-Pack Baumwollslips."
    };
    const toneState = { ...toneDefaults, ...(JSON.parse(localStorage.getItem("etamToneOfVoice") || "null") || {}) };
    const learnedLexicon = JSON.parse(localStorage.getItem("etamLexiconLearning") || "[]");
    const validationStorageKey = "etamLocalizationValidation:" + "${RUN_DATE}";
    const savedValidationState = JSON.parse(localStorage.getItem(validationStorageKey) || "{}");
    function baseTitle(row) {
      return row.proposed_title || row.current_local_title || row.current_fr_title || "";
    }
    function baseDescription(row) {
      return row.proposed_long_description || row.current_local_long_description || row.current_fr_long_description || "";
    }
    function reusableSavedState(row) {
      const saved = savedValidationState[rowKey(row)];
      if (!saved) return {};
      const titleStillCurrent = saved.baseTitle === baseTitle(row);
      const descriptionStillCurrent = saved.baseDescription === baseDescription(row);
      return {
        titleOk: titleStillCurrent ? saved.titleOk : false,
        descriptionOk: descriptionStillCurrent ? saved.descriptionOk : false,
        title: titleStillCurrent ? saved.title : undefined,
        description: descriptionStillCurrent ? saved.description : undefined,
      };
    }
    const state = new Map(rows.map((row, index) => {
      const saved = reusableSavedState(row);
      return [index, {
        titleOk: saved.titleOk ?? (row.title_validation === "Approved" || row.status === "Approved"),
        descriptionOk: saved.descriptionOk ?? (row.description_validation === "Approved" || row.status === "Approved"),
        titleRequired: titleRequiresValidation(row),
        descriptionRequired: descriptionRequiresValidation(row),
        title: saved.title ?? baseTitle(row),
        description: saved.description ?? baseDescription(row)
      }];
    }));
    document.querySelectorAll(".tone-field").forEach(field => {
      field.value = toneState[field.dataset.locale] || "";
      field.addEventListener("input", () => {
        toneState[field.dataset.locale] = field.value;
        localStorage.setItem("etamToneOfVoice", JSON.stringify(toneState));
      });
    });

    function html(value) {
      return String(value ?? "").replace(/[&<>"]/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[char]));
    }
    function browserCsvEscape(value) {
      return String(value ?? "").replace(/\\r\\n/g, "\\n").replace(/\\r/g, "\\n");
    }
    function pimRichText(value) {
      return String(value ?? "")
        .replace(/\\r\\n/g, "\\n")
        .replace(/\\r/g, "\\n")
        .replace(/\\s*•\\s*/g, "\\n• ")
        .replace(/\\n{3,}/g, "\\n\\n")
        .trim()
        .replace(/\\n/g, "<br>");
    }
    function rowKey(row) {
      return [row.locale, row.reference_mc, row.change_type].join("|");
    }
    function persistValidationState() {
      const snapshot = {};
      rows.forEach((row, index) => {
        const saved = state.get(index);
        if (!saved) return;
        if (saved.titleOk || saved.descriptionOk || saved.title !== baseTitle(row) || saved.description !== baseDescription(row)) {
          snapshot[rowKey(row)] = {
            titleOk: saved.titleOk,
            descriptionOk: saved.descriptionOk,
            title: saved.title,
            description: saved.description,
            baseTitle: baseTitle(row),
            baseDescription: baseDescription(row)
          };
        }
      });
      localStorage.setItem(validationStorageKey, JSON.stringify(snapshot));
    }
    function filteredRows() {
      const term = search.value.trim().toLowerCase();
      return rows.map((row, index) => ({ row, index })).filter(({ row, index }) => {
        const saved = state.get(index);
        const haystack = [row.reference_mc, row.change_type, row.current_local_title, row.current_fr_title, row.category, row.universe].join(" ").toLowerCase();
        const season = seasonFilter.value;
        const seasonMatch = !season || (season === "__unknown" ? !row.season_label : row.season_label === season);
        return row.locale === activeLocale && seasonMatch && (!draftOnly || !isReady(saved)) && (!term || haystack.includes(term));
      });
    }
    function isReady(saved) {
      return Boolean((saved.titleOk || !saved.titleRequired) && (saved.descriptionOk || !saved.descriptionRequired));
    }
    function titleRequiresValidation(row) {
      return /Title not localized|Missing translation/i.test(row.change_type || "");
    }
    function descriptionRequiresValidation(row) {
      return /Missing long description|French source changed|French long description changed|Local content may need update|Critical quality warning|Spelling warning|Spelling or terminology warning/i.test(row.change_type || "");
    }
    function issueClass(issue) {
      if (/Title not localized|Missing translation/i.test(issue)) return "tag-title";
      if (/Missing long description/i.test(issue)) return "tag-description";
      if (/Spelling warning|Spelling or terminology warning|Critical quality warning/i.test(issue)) return "tag-quality";
      return "tag-other";
    }
    function renderRecap(visible) {
      const country = Object.values(countrySummary).find(item => item.locale === activeLocale);
      const metrics = country?.metrics || {};
      const countryRows = rows.map((row, index) => ({ row, index })).filter(({ row }) => row.locale === activeLocale);
      const ready = countryRows.filter(({ index }) => isReady(state.get(index))).length;
      const descriptionsUpToDate = countryRows.filter(({ index }) => !state.get(index).descriptionRequired || state.get(index).descriptionOk).length;
      recap.innerHTML = '<h2>' + html(country?.name || activeLocale) + ' recap</h2>' +
        '<div class="recap-grid">' +
          '<div class="recap-item"><strong>' + html(metrics.mc_to_review ?? countryRows.length) + '</strong><span>MC references to review</span></div>' +
          '<div class="recap-item"><strong>' + html(metrics.title_translation_issues ?? 0) + '</strong><span>Title translation issues</span></div>' +
          '<div class="recap-item"><strong>' + html(metrics.missing_long_descriptions ?? 0) + '</strong><span>Missing long descriptions</span></div>' +
          '<div class="recap-item"><strong>' + html(metrics.same_model_colorway_reusable_descriptions ?? 0) + '</strong><span>Same-model/colorway reusable</span></div>' +
          '<div class="recap-item"><strong>' + html(ready) + '</strong><span>Ready for PIM export</span></div>' +
          '<div class="recap-item"><strong>' + html(descriptionsUpToDate) + '</strong><span>Descriptions up to date</span></div>' +
        '</div>';
    }
    function render() {
      tabs.forEach(tab => tab.classList.toggle("active", tab.dataset.locale === activeLocale));
      const toneMode = activeLocale === "tone";
      tonePanel.hidden = !toneMode;
      toolbar.hidden = toneMode;
      sheet.hidden = toneMode;
      if (toneMode) {
        recap.innerHTML = '<h2>Tone of voice</h2><p class="learned">These notes stay editable and help reviewers keep the same local style across languages.</p>';
        learnedCount.textContent = learnedLexicon.length + " reviewer edits stored locally for lexicon learning.";
        return;
      }
      const visible = filteredRows();
      renderRecap(visible);
      count.textContent = visible.length + " rows";
      body.innerHTML = visible.map(({ row, index }) => {
        const saved = state.get(index);
        const ready = isReady(saved);
        saved.titleRequired = titleRequiresValidation(row);
        if (!saved.titleRequired) saved.titleOk = true;
        saved.descriptionRequired = descriptionRequiresValidation(row);
        if (!saved.descriptionRequired) saved.descriptionOk = true;
        const issues = row.change_type.split(" | ").filter(Boolean).map(issue => '<span class="tag ' + issueClass(issue) + '">' + html(issue) + '</span>').join("");
        const diff = [
          row.previous_fr_title && row.previous_fr_title !== row.current_fr_title ? "Previous FR title\\n" + row.previous_fr_title : "",
          row.current_fr_title ? "Current FR title\\n" + row.current_fr_title : "",
          row.previous_fr_long_description && row.previous_fr_long_description !== row.current_fr_long_description ? "Previous FR long description\\n" + row.previous_fr_long_description : "",
          row.current_fr_long_description ? "Current FR long description\\n" + row.current_fr_long_description : "",
        ].filter(Boolean).join("\\n\\n");
        return '<tr class="' + (ready ? "ready" : "") + '">' +
          '<td class="sticky"><div class="product"><img class="thumb" src="' + html(row.image_url) + '" alt=""><div><div class="ref">' + html(row.reference_mc) + '</div><div class="meta">' + html(row.current_local_title || row.current_fr_title || "No title") + '<br>' + html(row.universe || row.category) + '</div></div></div></td>' +
          '<td><span class="confidence">' + html(row.confidence) + '%</span></td>' +
          '<td><div class="issue-list">' + issues + '</div></td>' +
          '<td><div class="edit-block">' +
            '<label>TITLE</label><input class="title-field" data-index="' + index + '" value="' + html(saved.title) + '">' +
            '<label>Description</label><textarea class="desc-field" data-index="' + index + '">' + html(saved.description) + '</textarea>' +
          '</div></td>' +
          '<td><div class="diff">' + html(diff) + '</div></td>' +
          '<td><div class="logic"><strong>' + html(row.proposal_source) + '</strong>\\n' + html(row.source_logic) + '</div></td>' +
          '<td><div class="checks">' +
            (saved.titleRequired ? '<label><input type="checkbox" class="title-ok" data-index="' + index + '" ' + (saved.titleOk ? "checked" : "") + '> Title OK</label>' : '<span class="tag tag-other">Title already localized</span>') +
            (saved.descriptionRequired ? '<label><input type="checkbox" class="desc-ok" data-index="' + index + '" ' + (saved.descriptionOk ? "checked" : "") + '> Description OK</label>' : '<span class="tag tag-other">Description already available</span>') +
            '<span class="tag">' + (ready ? "Ready for PIM" : "Draft") + '</span>' +
          '</div></td>' +
        '</tr>';
      }).join("");
    }
    body.addEventListener("input", event => {
      if (event.target.matches(".title-field,.desc-field")) {
        const index = Number(event.target.dataset.index);
        const item = state.get(index);
        const row = rows[index];
        const field = event.target.matches(".title-field") ? "title" : "description";
        item[field] = event.target.value;
        learnedLexicon.push({
          locale: row.locale,
          reference_mc: row.reference_mc,
          field,
          previous_proposal: field === "title" ? row.proposed_title : row.proposed_long_description,
          reviewer_value: event.target.value,
          saved_at: new Date().toISOString()
        });
        localStorage.setItem("etamLexiconLearning", JSON.stringify(learnedLexicon.slice(-1000)));
        persistValidationState();
      }
    });
    body.addEventListener("change", event => {
      if (event.target.matches(".title-ok,.desc-ok")) {
        const item = state.get(Number(event.target.dataset.index));
        if (event.target.matches(".title-ok")) item.titleOk = event.target.checked;
        if (event.target.matches(".desc-ok")) item.descriptionOk = event.target.checked;
        persistValidationState();
        render();
      }
    });
    tabs.forEach(tab => tab.addEventListener("click", () => { activeLocale = tab.dataset.locale; render(); }));
    search.addEventListener("input", render);
    seasonFilter.addEventListener("change", render);
    document.getElementById("draftOnly").addEventListener("click", () => { draftOnly = !draftOnly; render(); });
    document.getElementById("approveTitles").addEventListener("click", () => {
      filteredRows().forEach(({ index }) => { state.get(index).titleOk = true; });
      persistValidationState();
      render();
    });
    document.getElementById("approveDescriptions").addEventListener("click", () => {
      filteredRows().forEach(({ index }) => { state.get(index).descriptionOk = true; });
      persistValidationState();
      render();
    });
    document.getElementById("approveAllVisible").addEventListener("click", () => {
      filteredRows().forEach(({ index }) => {
        state.get(index).titleOk = true;
        state.get(index).descriptionOk = true;
      });
      persistValidationState();
      render();
    });
    document.getElementById("exportCsv").addEventListener("click", () => {
      const visible = rows.map((row, index) => ({ row, index })).filter(({ row, index }) => row.locale === activeLocale && isReady(state.get(index)));
      if (visible.length === 0) {
        alert("No approved rows to export for this country.");
        exportStatus.textContent = "No approved rows to export.";
        return;
      }
      const columns = ["code MC","locale","displayName fr","shortDescription fr","longDescription fr","coreGlobalModelDescription fr","productColor FR","whyWeLoveIt fr","ourStyleAdvice fr","productDetails fr","weCareDescription fr","ourProduct fr","confectionAndTransparency fr","respectAnimalWelfare fr"];
      const csv = [columns.join(";")].concat(visible.map(({ row, index }) => {
        const saved = state.get(index);
        const output = {
          "code MC": row.reference_mc,
          "locale": exportLocales[row.locale] || row.locale,
          "displayName fr": saved.title,
          "shortDescription fr": saved.title,
          "longDescription fr": pimRichText(saved.description),
          "coreGlobalModelDescription fr": "",
          "productColor FR": "",
          "whyWeLoveIt fr": "",
          "ourStyleAdvice fr": "",
          "productDetails fr": "",
          "weCareDescription fr": "",
          "ourProduct fr": "",
          "confectionAndTransparency fr": "",
          "respectAnimalWelfare fr": ""
        };
        return columns.map((column) => '"' + browserCsvEscape(output[column]).replace(/"/g, '""') + '"').join(";");
      })).join("\\r\\n");
      const encoder = new TextEncoder();
      const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
      const blob = new Blob([bom, encoder.encode(csv)], { type: "text/csv;charset=utf-8" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      const exportLocale = exportLocales[activeLocale] || activeLocale;
      link.download = "pim_import_" + exportLocale + "_" + "${RUN_DATE}".replaceAll("-", "") + ".csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      exportStatus.textContent = "Export generated: " + visible.length + " rows.";
    });
    render();
  </script>
</body>
</html>`;
}

function writeOutputs(summary, countryResults, queueRows) {
  const columns = [
    "run_date",
    "locale",
    "country",
    "reference_mc",
    "model_id",
    "color_id",
    "product_url",
    "image_url",
    "category",
    "universe",
    "season_year",
    "season_code",
    "season_label",
    "change_type",
    "is_new_mc",
    "fr_title_changed",
    "fr_long_description_changed",
    "previous_fr_title",
    "current_fr_title",
    "previous_fr_long_description",
    "current_fr_long_description",
    "previous_local_title",
    "current_local_title",
    "previous_local_long_description",
    "current_local_long_description",
    "proposed_title",
    "proposed_long_description",
    "current_content_block",
    "recommended_content_block",
    "source_logic",
    "proposal_source",
    "confidence",
    "status",
    "title_validation",
    "description_validation",
    "reviewer_comment",
    "approved_title",
    "approved_long_description",
    "last_reviewed_at",
  ];
  for (const country of Object.values(countryResults)) {
    writeCsv(path.join(ROOT, country.csv), country.rows, columns);
  }
  writeCsv(path.join(ROOT, "daily_translation_queue.csv"), queueRows, columns);
  writeJson(path.join(ROOT, "summary.json"), summary);
  fs.writeFileSync(path.join(ROOT, "dashboard.html"), renderDashboard(summary), "utf8");
  fs.writeFileSync(path.join(ROOT, "review_interface.html"), renderReviewInterface(summary, queueRows), "utf8");
}

function sheetRowsForCountry(rows) {
  return rows.map((row) => ({
    key: `${row.locale}|${row.reference_mc}|${row.change_type}`,
    run_date: row.run_date,
    locale: row.locale,
    country: row.country,
    reference_mc: row.reference_mc,
    model_id: row.model_id,
    color_id: row.color_id,
    issue: row.change_type,
    confidence: row.confidence,
    product_url: row.product_url,
    image_url: row.image_url,
    category: row.category,
    universe: row.universe,
    season_year: row.season_year,
    season_code: row.season_code,
    season_label: row.season_label,
    current_title: row.current_local_title,
    current_long_description: row.current_local_long_description,
    recommended_title: row.proposed_title,
    recommended_long_description: row.proposed_long_description,
    source_logic: row.source_logic,
    proposal_source: row.proposal_source,
    fr_title_changed: row.fr_title_changed,
    fr_long_description_changed: row.fr_long_description_changed,
    previous_fr_title: row.previous_fr_title,
    current_fr_title: row.current_fr_title,
    previous_fr_long_description: row.previous_fr_long_description,
    current_fr_long_description: row.current_fr_long_description,
    status: row.status || "Draft",
    title_validation: row.title_validation || "Draft",
    description_validation: row.description_validation || "Draft",
    reviewer_comment: row.reviewer_comment || "",
    approved_title: row.approved_title || "",
    approved_long_description: row.approved_long_description || "",
    last_reviewed_at: row.last_reviewed_at || "",
  }));
}

function buildSheetsPayload(summary, queueRows) {
  const countryRows = {};
  for (const [locale, country] of Object.entries(COUNTRIES)) {
    countryRows[country.name] = sheetRowsForCountry(queueRows.filter((row) => row.locale === locale));
  }
  return {
    run_date: RUN_DATE,
    summary,
    sheets: {
      Summary: [
        { metric: "Run date", value: summary.run_date },
        { metric: "Mode", value: summary.mode },
        { metric: "France MC references", value: summary.france.total_mc_references },
        { metric: "Queue items", value: queueRows.length },
        { metric: "Status", value: summary.first_run_message },
      ],
      "Daily changes": [
        {
          run_date: summary.run_date,
          new_mc_references_today: summary.france.new_mc_references_today,
          french_titles_changed: summary.france.french_titles_changed,
          french_long_descriptions_changed: summary.france.french_long_descriptions_changed,
          country_content_gaps_detected: Object.values(summary.countries).reduce((sum, country) => sum + country.metrics.country_content_gaps_detected, 0),
          persistent_issues: Object.values(summary.countries).reduce((sum, country) => sum + country.metrics.persistent_issues, 0),
          resolved_since_last_run: Object.values(summary.countries).reduce((sum, country) => sum + country.metrics.resolved_since_last_run, 0),
          products_removed_from_feed: summary.france.products_removed_from_feed,
        },
      ],
      ...countryRows,
    },
  };
}

async function publishToGoogleSheets(options, summary, queueRows) {
  if (!options.publishSheets) return;
  if (!options.sheetsUrl) {
    console.log("[warn] --publish-sheets was requested, but ETAM_SHEETS_WEBAPP_URL or --sheets-url=... is missing.");
    return;
  }
  const payload = buildSheetsPayload(summary, queueRows);
  const response = await fetch(options.sheetsUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Google Sheets publish failed: HTTP ${response.status} ${text}`);
  }
  console.log(`[ok] Google Sheets publish completed: ${text}`);
}

function updateBaselines(snapshots) {
  ensureDir(BASELINE_DIR);
  for (const [locale, snapshot] of Object.entries(snapshots)) {
    writeJson(path.join(BASELINE_DIR, `latest_${locale}_mc_snapshot.json`), snapshot);
  }
}

async function main() {
  const options = parseArgs(process.argv);
  ensureDir(INPUT_DIR);
  ensureDir(RAW_DIR);
  ensureDir(SNAPSHOT_DIR);
  ensureDir(BASELINE_DIR);

  const previousSnapshots = {};
  for (const locale of Object.keys(FEEDS)) {
    previousSnapshots[locale] = readJson(path.join(BASELINE_DIR, `latest_${locale}_mc_snapshot.json`), []);
  }

  const { loaded, messages } = await loadFeeds(options);
  if (Object.keys(loaded).length === 0) {
    const legacyFallback = tryLegacyFallback(messages);
    if (legacyFallback) {
      await enforceTargetLanguage(legacyFallback.rows, messages);
      const rowsByLocale = {};
      for (const row of legacyFallback.rows) {
        if (!rowsByLocale[row.locale]) rowsByLocale[row.locale] = [];
        rowsByLocale[row.locale].push(row);
      }
      const countryResults = Object.fromEntries(Object.entries(COUNTRIES).map(([locale, country]) => [locale, {
        locale,
        name: country.name,
        csv: country.csv,
        rows: rowsByLocale[locale] || [],
      }]));
      writeOutputs(legacyFallback.summary, countryResults, legacyFallback.rows);
      await publishToGoogleSheets(options, legacyFallback.summary, legacyFallback.rows);
      console.log(messages.join("\n"));
      console.log(legacyFallback.summary.first_run_message);
      console.log(`Review interface: ${path.join(ROOT, "review_interface.html")}`);
      console.log(`Dashboard: ${path.join(ROOT, "dashboard.html")}`);
      return;
    }
  }
  const snapshots = {};
  for (const [locale, feedInfo] of Object.entries(loaded)) {
    snapshots[locale] = makeSnapshot(locale, feedInfo, previousSnapshots[locale]);
    writeJson(path.join(SNAPSHOT_DIR, RUN_DATE, `${locale}_mc_snapshot.json`), snapshots[locale]);
  }

  const queue = buildQueues(snapshots, previousSnapshots, options);
  await enforceTargetLanguage(queue.allQueueRows, messages);
  refreshQualityMetrics(queue.countryResults);
  messages.push(`[ok] review scope limited to ${REVIEW_SEASON_LABEL} (${REVIEW_SEASON_YEAR}, season code ${REVIEW_SEASON_CODE}).`);
  const noFeedsLoaded = Object.keys(loaded).length === 0;
  const firstRunMessage = noFeedsLoaded
    ? "No feed could be loaded. Add local files to input/ or retry online mode when the URLs respond."
    : queue.firstRun
    ? "No previous baseline found. Today's run has been saved as the first baseline."
    : "Incremental baseline comparison completed.";

  const summary = {
    run_date: RUN_DATE,
    mode: `${options.online ? "online" : "local"} ${options.full ? "full" : "incremental"}`,
    first_run: queue.firstRun && !noFeedsLoaded,
    first_run_message: firstRunMessage,
    messages,
    feeds: Object.fromEntries(Object.entries(loaded).map(([locale, feed]) => [locale, {
      source_url: feed.sourceUrl,
      raw_copy: path.relative(ROOT, feed.path),
    }])),
    france: queue.frMetrics,
    countries: Object.fromEntries(Object.entries(queue.countryResults).map(([locale, result]) => [locale, {
      locale,
      name: result.name,
      csv: result.csv,
      metrics: result.metrics,
    }])),
  };

  writeOutputs(summary, queue.countryResults, queue.allQueueRows);
  updateBaselines(snapshots);
  await publishToGoogleSheets(options, summary, queue.allQueueRows);

  console.log(messages.join("\n"));
  console.log(firstRunMessage);
  console.log(`Review interface: ${path.join(ROOT, "review_interface.html")}`);
  console.log(`Dashboard: ${path.join(ROOT, "dashboard.html")}`);
}

main().catch((error) => {
  console.error(`Generation failed: ${error.message}`);
  process.exitCode = 1;
});
