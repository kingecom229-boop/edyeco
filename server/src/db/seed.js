import bcrypt from 'bcryptjs';
import { query, withTransaction, closePool } from './pool.js';
import { runMigrations } from './migrate.js';
import config from '../config.js';

const img = (name) => `/products/${name}.png`;

const categories = [
  {
    slug: 'bois-de-chauffage',
    name: 'Bois de chauffage',
    tagline: 'Le classique, sec et performant',
    description:
      "Bûches de chêne, hêtre et charme séchées naturellement, prêtes à brûler. Livrées sur palette ou en ballot, en 25, 30, 33, 40 ou 50 cm selon votre appareil.",
    image_url: img('palette-50'),
    position: 1,
    seo_title: 'Bois de chauffage sec en palette et ballot | EdyEco',
    seo_description:
      "Achetez du bois de chauffage sec (moins de 20 % d'humidité) en palette ou ballot. Chêne, hêtre, charme. Livraison à domicile en France.",
  },
  {
    slug: 'granules-de-bois',
    name: 'Granulés de bois',
    tagline: 'Le confort automatique',
    description:
      "Pellets certifiés ENplus A1 pour poêles et chaudières. Un combustible homogène, propre et économique, livré en palettes filmées.",
    image_url: img('granules'),
    position: 2,
    seo_title: 'Granulés de bois ENplus A1 en palette | EdyEco',
    seo_description:
      'Granulés de bois premium ENplus A1, livrés en palette de 66 sacs de 15 kg. Puissance, propreté et économie pour votre poêle à pellets.',
  },
  {
    slug: 'buches-compressees',
    name: 'Bûches compressées',
    tagline: 'Haute densité, chaleur longue',
    description:
      "Bûches de bois densifié compactées sans additif, issues de résidus de scierie. Un pouvoir calorifique élevé, un stockage compact et une flamme régulière.",
    image_url: img('buches-compressees'),
    position: 3,
    seo_title: 'Bûches compressées haute densité | EdyEco',
    seo_description:
      'Bûches compressées écologiques à haute densité : plus de chaleur, moins de cendres, stockage compact. Palette disponible chez EdyEco.',
  },
  {
    slug: 'accessoires',
    name: 'Accessoires & allumage',
    tagline: 'Pour un feu réussi',
    description:
      "Allume-feu naturels, bûchettes de démarrage et accessoires pour entretenir votre feu et votre appareil de chauffage.",
    image_url: img('buches-compressees'),
    position: 4,
    seo_title: 'Accessoires de chauffage au bois et allume-feu | EdyEco',
    seo_description:
      "Allume-feu écologiques et accessoires pour cheminée, poêle à bois et inserts. Des essentiels simples pour un feu réussi.",
  },
];

const products = [
  {
    slug: 'bois-de-chauffage-50-cm-palette-18-m3',
    name: 'Bois de chauffage 50 cm — palette 1,8 m³',
    sku: 'BC-50-18',
    category: 'bois-de-chauffage',
    short:
      "Palette de 1,8 m³ de bois de chauffage en 50 cm, pour grandes cheminées, inserts et poêles à large foyer. Chêne et hêtre, extra sec.",
    description:
      "La palette de 50 cm est pensée pour les grandes cheminées et les inserts de forte puissance. Les bûches longues offrent une combustion plus lente et une chaleur diffuse pendant plusieurs heures.\n\nNotre bois est séché naturellement puis contrôlé : chaque lot affiche un taux d'humidité inférieur à 20 %, garantissant une flamme claire, peu de fumée et un rendement optimal. Les bûches sont rangées sur palette cerclée, prêtes à être stockées à l'abri.",
    price_cents: 43400,
    stock: 24,
    unit: 'palette',
    length: 50,
    volume: 1.8,
    featured: true,
    image: img('palette-50'),
    badges: ['Extra sec', 'Vente en circuit court'],
    position: 1,
  },
  {
    slug: 'bois-de-chauffage-40-cm-palette-26-steres',
    name: 'Bois de chauffage 40 cm — palette 2,6 stères',
    sku: 'BC-40-26',
    category: 'bois-de-chauffage',
    short:
      "2,6 stères de bûches de 40 cm sur palette, le bon compromis entre autonomie et encombrement pour les grands poêles et cheminées.",
    description:
      "Avec 2,6 stères, cette palette est notre référence pour passer l'hiver sereinement. Les bûches de 40 cm alimentent les appareils de taille moyenne à grande et produisent une braise durable.\n\nBois dur de qualité, fendu et rangé à la main. Livraison sur palette par camion porte-engin, dépose au plus près de votre lieu de stockage.",
    price_cents: 55700,
    compare_at_cents: 59900,
    stock: 18,
    unit: 'palette',
    length: 40,
    volume: 2.6,
    featured: true,
    image: img('palette-50'),
    badges: ['Meilleure vente'],
    position: 2,
  },
  {
    slug: 'bois-de-chauffage-33-cm-palette-27-steres',
    name: 'Bois de chauffage 33 cm — palette 2,7 stères',
    sku: 'BC-33-27',
    category: 'bois-de-chauffage',
    short:
      "La palette la plus généreuse de la gamme : 2,7 stères de bûches de 33 cm, idéales pour les appareils modernes de taille moyenne.",
    description:
      "Le 33 cm est la longueur la plus polyvalente : elle convient à la majorité des poêles et inserts vendus aujourd'hui. Cette palette offre un excellent rapport volume / prix pour chauffer une maison entière.\n\nLe bois est fendu, séché et contrôlé avant palettisation. Coupe irrégulière naturelle, mais un calibrage constant pour une combustion régulière.",
    price_cents: 57700,
    stock: 12,
    unit: 'palette',
    length: 33,
    volume: 2.7,
    featured: true,
    image: img('palette-33'),
    badges: ['Grand volume'],
    position: 3,
  },
  {
    slug: 'bois-de-chauffage-25-cm-palette-15-m3',
    name: 'Bois de chauffage 25 cm — palette 1,5 m³',
    sku: 'BC-25-15',
    category: 'bois-de-chauffage',
    short:
      "Bûches courtes de 25 cm, parfaites pour les poêles compacts, les inserts et les maisons de ville. Palette de 1,5 m³ extra sec.",
    description:
      "Les bûches de 25 cm sont faciles à manipuler et à ranger : elles optimisent l'emplacement de stockage à volume de bois identique. Idéales pour les petits poêles et les foyers fermés.\n\nUn séchage prolongé garantit une allumage rapide et une combustion propre, avec très peu de cendres.",
    price_cents: 47700,
    stock: 31,
    unit: 'palette',
    length: 25,
    volume: 1.5,
    featured: true,
    image: img('palette-25'),
    badges: ['Idéal poêle compact'],
    position: 4,
  },
  {
    slug: 'bois-de-chauffage-30-cm-ballot-13-m3',
    name: 'Bois de chauffage 30 cm — ballot 1,3 m³',
    sku: 'BB-30-13',
    category: 'bois-de-chauffage',
    short:
      "Ballot de 1,3 m³ en 30 cm, livré sur palette : la solution la plus simple pour une première commande ou un complément en cours de saison.",
    description:
      "Le ballot est conditionné dans un filet maintenu sur palette : le bois reste rangé, ventilé et se déplace facilement. 1,3 m³ représentent environ deux mois de chauffage d'appoint.\n\nBois mixte feuillus, sec, prêt à l'emploi. Livraison classique ou confort selon votre accès.",
    price_cents: 34900,
    stock: 42,
    unit: 'ballot',
    length: 30,
    volume: 1.3,
    image: img('sac-13'),
    badges: ['Pratique'],
    position: 5,
  },
  {
    slug: 'bois-de-chauffage-25-cm-ballot-13-m3',
    name: 'Bois de chauffage 25 cm — ballot 1,3 m³',
    sku: 'BB-25-13',
    category: 'bois-de-chauffage',
    short:
      "Ballot de 1,3 m³ en bûches de 25 cm. Compact, maniable, parfait pour les poêles de petite et moyenne puissance.",
    description:
      "Format ballot 25 cm : le meilleur choix pour les foyers compacts et les personnes qui préfèrent manipuler des bûches légères. Le filet sur palette protège le bois et facilite le stockage.\n\nBois de qualité, taux d'humidité contrôlé, vente directe producteur.",
    price_cents: 40400,
    stock: 27,
    unit: 'ballot',
    length: 25,
    volume: 1.3,
    image: img('sac-13'),
    badges: ['Extra sec'],
    position: 6,
  },
  {
    slug: 'bois-de-chauffage-25-cm-ballot-2-m3',
    name: 'Bois de chauffage 25 cm — ballot 2 m³',
    sku: 'BB-25-20',
    category: 'bois-de-chauffage',
    short:
      "Le grand ballot : 2 m³ de bûches de 25 cm pour une autonomie confortable, avec la souplesse d'un conditionnement compact.",
    description:
      "Deux mètres cubes de bûches courtes, c'est un hiver complet pour un poêle de 8 kW utilisé en chauffage principal. Le ballot reste sur palette, protégé par un filet robuste.\n\nBûches de feuillus denses, séchées à l'air libre et contrôlées lot par lot.",
    price_cents: 50400,
    stock: 15,
    unit: 'ballot',
    length: 25,
    volume: 2,
    image: img('sac-13'),
    badges: ['Autonomie hiver'],
    position: 7,
  },
  {
    slug: 'granules-de-bois-enplus-a1-palette-66-sacs',
    name: 'Granulés de bois ENplus A1 — palette 66 sacs',
    sku: 'GR-A1-66',
    category: 'granules-de-bois',
    short:
      "Palette de 990 kg de granulés ENplus A1, en 66 sacs de 15 kg. Le meilleur ratio chaleur / prix pour votre poêle à pellets.",
    description:
      "Nos granulés sont certifiés ENplus A1 : diamètre 6 mm, faible taux de cendres, pouvoir calorifique supérieur à 4,6 kWh/kg. Ils brûlent proprement et limitent l'encrassement de votre appareil.\n\nPalette filmée de 66 sacs de 15 kg (990 kg). Stockage en sac soudé étanche, à l'abri de l'humidité.",
    price_cents: 42900,
    stock: 36,
    unit: 'palette',
    volume: null,
    wood_type: 'Granulés résineux 100 %',
    moisture: 'Moins de 8 %',
    image: img('granules'),
    badges: ['ENplus A1', '66 sacs de 15 kg'],
    position: 8,
  },
  {
    slug: 'buches-compressees-palette-12-stere',
    name: 'Bûches compressées — palette 1,2 stère',
    sku: 'BX-COMP-12',
    category: 'buches-compressees',
    short:
      "Bûches de bois densifié haute performance : combustion longue, chaleur intense et stockage ultra compact.",
    description:
      "Fabriquées à partir de résidus de scieries françaises, nos bûches compressées ne contiennent aucun liant ni additif. Leur densité élevée (plus de 1 000 kg/m³) offre une flamme stable et un très haut pouvoir calorifique.\n\nUne palette de 1,2 stère équivaut à environ 2,5 stères de bois bûche en volume de chaleur. Idéales en complément ou en utilisation principale.",
    price_cents: 38900,
    stock: 22,
    unit: 'palette',
    volume: 1.2,
    wood_type: 'Bois densifié 100 % naturel',
    moisture: 'Moins de 8 %',
    image: img('buches-compressees'),
    badges: ['Haute densité', 'Écologique'],
    position: 9,
  },
  {
    slug: 'buches-de-nuit-palette-12-stere',
    name: 'Bûches de nuit — palette 1,2 stère',
    sku: 'BX-NUIT-12',
    category: 'buches-compressees',
    short:
      "Conçues pour tenir la nuit : des bûches denses à combustion lente qui maintiennent la chaleur jusqu'au matin.",
    description:
      "Les bûches de nuit sont plus longues et plus compactes, pensées pour les inserts et les poêles à combustion prolongée. Une flambée en fin de soirée suffit à conserver une chaleur agréable au réveil.\n\nSans additif, sans odeur, avec un taux de cendres très faible.",
    price_cents: 39600,
    stock: 14,
    unit: 'palette',
    volume: 1.4,
    wood_type: 'Bois densifié 100 % naturel',
    moisture: 'Moins de 8 %',
    image: img('buches-compressees'),
    badges: ['Combustion lente'],
    position: 10,
  },
  {
    slug: 'allume-feu-ecologique-32-buchettes',
    name: 'Allume-feu écologique — 32 bûchettes',
    sku: 'AC-ALLUM-32',
    category: 'accessoires',
    short:
      "Allume-feu naturels en cire végétale et sciure, sans odeur ni produit chimique. 32 bûchettes pour démarrer un feu proprement.",
    description:
      "Un feu réussi commence par un bon allumage. Nos bûchettes sont composées de sciure de bois et de cire végétale : elles s'allument d'une seule flamme, brûlent 8 à 10 minutes et ne laissent aucun résidu toxique.\n\nBoîte de 32 bûchettes, fabrication française.",
    price_cents: 1290,
    stock: 120,
    unit: 'boîte',
    image: img('buches-compressees'),
    badges: ['Sans chimie'],
    position: 11,
    gallery: [],
  },
  {
    slug: 'stere-de-bois-33-cm-vrac',
    name: 'Stère de bois 33 cm — vrac',
    sku: 'BC-33-VRAC',
    category: 'bois-de-chauffage',
    short:
      "Un stère de bûches de 33 cm livré en vrac, pour ceux qui souhaitent stocker et empiler eux-mêmes leur bois.",
    description:
      "Le vrac est la solution la plus économique : un stère (équivalent à 0,7 m³ apparent) de bûches de 33 cm en feuillus secs. Livraison par camion, dépose au pied de votre accès.\n\nDisponible sur notre entrepôt de Nantes-est et en livraison locale.",
    price_cents: 21900,
    stock: 60,
    unit: 'stère',
    length: 33,
    volume: 1,
    image: img('palette-33'),
    badges: ['Économique'],
    position: 12,
  },
];

const posts = [
  {
    slug: 'quel-bois-de-chauffage-choisir-guide-2026',
    title: 'Quel bois de chauffage choisir ? Le guide complet 2026',
    excerpt:
      "Chêne, hêtre, charme, bouleau : chaque essence n'offre pas la même chaleur ni la même durée de combustion. Voici comment choisir le bois adapté à votre appareil et à votre budget.",
    category: 'Conseils',
    read: 9,
    cover: img('palette-33'),
    tags: ['bois de chauffage', 'essences', 'guide'],
    seo_title: 'Quel bois de chauffage choisir en 2026 ? Guide complet | EdyEco',
    seo_description:
      "Chêne, hêtre, charme : découvrez quelle essence de bois de chauffage choisir selon votre poêle, votre budget et votre besoin de chaleur. Guide 2026 signé EdyEco.",
    content: `## Pourquoi le choix de l'essence change tout

Tous les bois ne brûlent pas de la même manière. La **densité** du bois détermine sa masse pour un volume donné, donc la quantité d'énergie disponible. Plus un bois est dense, plus il produit de chaleur longtemps.

Le **chêne** et le **charme** figurent parmi les bois les plus densies : ils offrent une combustion longue, idéale pour les inserts et le chauffage principal. Le **hêtre** est un excellent compromis, avec une flamme claire et un bon rendement. Le **bouleau** et le **peuplier**, plus légers, s'allument vite : parfaits pour démarrer un feu.

## Le classement des essences par pouvoir calorifique

| Essence | Densité | Pouvoir calorifique | Usage idéal |
| --- | --- | --- | --- |
| Charme | Très élevée | Excellent | Chauffage principal |
| Chêne | Élevée | Très bon | Insert, poêle |
| Hêtre | Élevée | Très bon | Polyvalent |
| Frêne | Moyenne | Bon | Cheminée ouverte |
| Bouleau | Moyenne | Moyen | Allumage |

## Le critère numéro un : l'humidité

Un bois humide est un mauvais investissement. L'eau qu'il contient doit s'évaporer avant que le bois ne brûle : une partie de la chaleur produite est gaspillée, la fumée est opaque et l'appareil s'encrasse.

Recherchez un taux d'humidité **inférieur à 20 %**. Un bois bien sec sonne creux, présente des fentes sur les extrémités et pèse moins lourd qu'un bois fraîchement coupé.

## Bûches traditionnelles ou bûches compressées ?

Les bûches compressées offrent une densité constante, un stockage compact et une combustion très régulière. Les bûches traditionnelles apportent le plaisir de la flamme et un coût au stère souvent plus doux.

> Notre conseil : combinez les deux. Des bûches compressées pour la nuit et les longues absences, du bois bûche pour le plaisir et l'appoint.

## Adapter la longueur à votre appareil

- 25 cm : poêles compacts et inserts de petite taille
- 30 cm : la majorité des appareils de taille moyenne
- 33 cm : très polyvalent, idéal pour la plupart des poêles modernes
- 40 cm : grands poêles et cheminées
- 50 cm : cheminées à large foyer et inserts de forte puissance

## Notre check-list avant d'acheter

1. Mesurez la profondeur de votre foyer
2. Vérifiez le taux d'humidité annoncé
3. Comparez le volume réel, pas seulement le prix
4. Anticipez votre consommation annuelle
5. Privilégiez un producteur proche de chez vous

Besoin d'un coup de main ? Notre équipe répond en moins de 24 h et vous aide à dimensionner votre commande.`,
  },
  {
    slug: 'buches-25-30-50-cm-quelle-longueur-choisir',
    title: 'Bûches 25, 30 ou 50 cm : quelle longueur pour votre poêle ?',
    excerpt:
      "La longueur des bûches influence la combustion, la manipulation et le stockage. Voici comment mesurer et choisir sans se tromper.",
    category: 'Conseils',
    read: 5,
    cover: img('palette-50'),
    tags: ['bûches', 'poêle', 'longueur'],
    seo_title: 'Bûches 25, 30 ou 50 cm : quelle longueur choisir ? | EdyEco',
    seo_description:
      'Quelle longueur de bûche pour votre poêle ou cheminée ? 25, 30, 33, 40 ou 50 cm : nos conseils de mesure et de choix.',
    content: `## Commencez par mesurer votre foyer

La règle est simple : la bûche doit être **5 à 10 cm plus courte** que la profondeur intérieure de votre foyer. Cela évite que le bois ne touche la vitre et permet une combustion homogène.

## 25 cm : les petits espaces

Les bûches de 25 cm conviennent aux poêles compacts, aux inserts de petite taille et aux maisons de ville. Elles sont plus légères, donc faciles à porter et à ranger.

## 30 et 33 cm : la polyvalence

Ce sont les longueurs les plus vendues en France. Elles s'adaptent à la majorité des appareils et offrent un excellent compromis entre autonomie et encombrement.

## 40 et 50 cm : la puissance

Les grandes bûches produisent une flamme plus lente, une braise durable et une chaleur diffuse. Réservez-les aux appareils de forte puissance et aux grandes cheminées.

## Et pour le stockage ?

À volume de bois égal, des bûches plus courtes occupent moins de place une fois empilées : le rendement d'empilement est meilleur. Si votre espace de rangement est compté, le 25 ou 30 cm est un choix malin.`,
  },
  {
    slug: 'stere-m3-palette-comprendre-les-unites-de-bois',
    title: 'Stère, m³, palette : comprendre les unités de bois de chauffage',
    excerpt:
      "Un stère n'est pas un mètre cube. Avant de comparer les prix, il faut comprendre ce que vous achetez réellement. Explications simples et tableau de conversion.",
    category: 'Guides',
    read: 6,
    cover: img('palette-50'),
    tags: ['stère', 'm3', 'prix'],
    seo_title: 'Stère, m³, palette : bien comprendre les unités de bois | EdyEco',
    seo_description:
      "Un stère n'équivaut pas à un m³. Apprenez à convertir stère, m³ apparent et palette pour comparer les prix du bois de chauffage.",
    content: `## Le stère, une unité de volume apparent

Un **stère** correspond à 1 m³ de bûches empilées, espaces vides compris. Le volume réel de bois (dit « volume plein ») est donc inférieur : environ 0,7 m³ pour des bûches de 33 cm.

## Pourquoi la longueur change tout

Plus les bûches sont longues, plus il y a d'espaces dans une pile. Le volume réel d'un stère varie donc selon la longueur :

- Bûches de 50 cm : 1 stère ≈ 0,8 m³ de bois
- Bûches de 33 cm : 1 stère ≈ 0,7 m³
- Bûches de 25 cm : 1 stère ≈ 0,6 m³

## Comparer les prix correctement

Ne comparez jamais un prix au stère avec un prix à la palette sans ramener les deux à la même unité. Le bon réflexe : demander le **volume réel en m³** et le **taux d'humidité**, puis calculer un prix au m³ de bois sec.

## Vrac, ballot ou palette ?

- Vrac : le plus économique, mais à stocker soi-même
- Ballot : maniable et protégé, parfait pour les petites surfaces
- Palette : le meilleur rapport volume / prix, dépose au plus près du lieu de stockage`,
  },
  {
    slug: 'taux-humidite-bois-chauffage',
    title: "Taux d'humidité du bois : le critère qui change votre facture",
    excerpt:
      "Un bois trop humide peut faire perdre 30 % de rendement et encrasser votre appareil. Comment mesurer et obtenir un bois parfaitement sec ?",
    category: 'Conseils',
    read: 7,
    cover: img('palette-25'),
    tags: ['humidité', 'rendement', 'séchage'],
    seo_title: "Taux d'humidité du bois de chauffage : le guide | EdyEco",
    seo_description:
      "Quel taux d'humidité pour un bois de chauffage performant ? Mesure, séchage, rendement : nos explications pour mieux chauffer.",
    content: `## Pourquoi l'humidité coûte cher

Chaque kilogramme d'eau contenue dans le bois doit être chauffé puis vaporisé. Cette énergie est prise sur la chaleur que vous devriez ressentir dans la pièce. Un bois à 35 % d'humidité peut faire perdre **plus de 25 % de rendement**.

## Le bon taux : moins de 20 %

Un bois prêt à brûler affiche un taux d'humidité compris entre 12 et 20 %. Au-delà, la combustion est incomplète : fumée épaisse, dépôts de créosote dans le conduit et risque d'incendie.

## Comment vérifier simplement

1. **Le son** : deux bûches sèches qui s'entrechoquent sonnent creux
2. **L'aspect** : des fentes radiales apparaissent sur les extrémités
3. **Le poids** : un bois sec est nettement plus léger
4. **L'humidimètre** : le seul outil fiable, à planter dans le fil du bois

## Comment sécher son bois

- Fendez les bûches pour augmenter la surface d'échange
- Empilez à l'air libre, sur une palette, sans contact avec le sol
- Protégez uniquement le dessus
- Comptez 12 à 24 mois de séchage selon l'essence

Chez EdyEco, chaque lot est contrôlé avant expédition : le taux d'humidité est inférieur à 20 %, sans exception.`,
  },
  {
    slug: 'granules-de-bois-bien-choisir-ses-pellets',
    title: 'Granulés de bois : bien choisir ses pellets',
    excerpt:
      "ENplus A1, diamètre, cendres, puissance : les critères qui font la différence entre des granulés médiocres et un combustible performant.",
    category: 'Guides',
    read: 6,
    cover: img('granules'),
    tags: ['granulés', 'pellets', 'ENplus'],
    seo_title: 'Granulés de bois : bien choisir ses pellets (ENplus A1) | EdyEco',
    seo_description:
      'Comment choisir des granulés de bois de qualité ? Certification ENplus A1, taux de cendres, pouvoir calorifique : le guide EdyEco.',
    content: `## La certification ENplus A1, un socle minimum

ENplus A1 garantit un granulé de haute qualité : faible taux de cendres (moins de 0,7 %), pouvoir calorifique élevé et diamètre constant. Sans certification, la qualité peut varier fortement d'un lot à l'autre.

## Les critères à vérifier

- **Diamètre** : 6 mm pour la majorité des poêles, 8 mm pour certains appareils
- **Densité** : une densité élevée signifie moins de poussière et une combustion plus longue
- **Humidité** : inférieure à 8 %
- **Cendres** : plus le taux est bas, moins vous nettoyez
- **Origine** : privilégiez les circuits courts et le bois français

## Combien de sacs pour un hiver ?

Comptez en moyenne 1 sac de 15 kg par jour en plein hiver pour un poêle de 8 à 10 kW utilisé en chauffage principal, soit environ 80 à 100 sacs par saison. Une palette de 66 sacs couvre une bonne partie de l'hiver.

## Stockage

Gardez les sacs fermés, dans un endroit sec. Ne stockez pas les granulés directement au sol : une palette ou des cales suffisent à éviter l'humidité.`,
  },
  {
    slug: 'livraison-bois-classique-ou-confort',
    title: 'Livraison de bois : classique ou confort, que choisir ?',
    excerpt:
      "Camion porteur ou chariot élévateur embarqué : comprenez les différences entre nos deux options de livraison et choisissez la plus adaptée à votre accès.",
    category: 'Livraison',
    read: 4,
    cover: img('palette-50'),
    tags: ['livraison', 'confort', 'logistique'],
    seo_title: 'Livraison de bois de chauffage : classique ou confort ? | EdyEco',
    seo_description:
      'Livraison classique ou confort : accès, délais et conditions. Découvrez quelle option choisir pour votre livraison de bois de chauffage.',
    content: `## La livraison classique

Effectuée par un camion porteur de 19 tonnes, elle inclut un dépôt au pied du camion. C'est l'option la plus économique, adaptée aux accès dégagés et aux personnes équipées pour déplacer les palettes.

## La livraison confort

Un camion porteur de 44 tonnes avec chariot élévateur embarqué positionne la palette exactement là où vous le souhaitez, dans la limite de la propriété. Délai indicatif : environ deux semaines.

## Comment se déroule une livraison confort ?

Sous 10 jours, le transporteur valide l'accès et fixe la date de livraison. Deux jours avant, vous êtes contacté pour confirmer le créneau. Le jour J, le chauffeur vous prévient de son arrivée.

> Pensez à vérifier la largeur et la hauteur de votre accès, ainsi que la présence de câbles ou de branches.

## Retrait à l'entrepôt

Vous pouvez également retirer votre commande directement à notre entrepôt de Nantes-est, sur rendez-vous, pour économiser les frais de livraison.`,
  },
];

const faqs = [
  {
    q: "Quel est le délai de livraison de mon bois de chauffage ?",
    a: "Le délai dépend de la gamme et du mode de livraison. Pour une livraison confort, le transporteur vous contacte sous 10 jours pour fixer une date, et la livraison intervient en général sous deux semaines. Pour une livraison classique, nous vous communiquons le créneau par email et SMS dans les 5 jours ouvrés.",
    category: 'Livraison',
  },
  {
    q: 'Puis-je choisir la date de livraison ?',
    a: "Oui. Vous êtes contacté deux jours avant la livraison pour confirmer la date et recevoir une tranche horaire indicative. Vous pouvez également nous écrire pour ajuster le créneau si nécessaire.",
    category: 'Livraison',
  },
  {
    q: 'Le bois est-il vraiment sec ?',
    a: "Tous nos lots sont contrôlés avant palettisation et affichent un taux d'humidité inférieur à 20 %. Nos bûches compressées et nos granulés sont sous 8 %. Le séchage est naturel pour le bois bûche, complété par une ventilation contrôlée en entrepôt.",
    category: 'Qualité',
  },
  {
    q: 'Quelles essences de bois proposez-vous ?',
    a: 'Nous proposons principalement du chêne, du hêtre et du charme, des feuillus denses reconnus pour leur combustion longue. Les bûches compressées sont issues de résidus de scieries françaises, sans additif.',
    category: 'Qualité',
  },
  {
    q: 'Quelle longueur de bûches choisir pour mon poêle ?',
    a: 'La bûche doit être 5 à 10 cm plus courte que la profondeur de votre foyer. En cas de doute, mesurez l\'intérieur de votre appareil et choisissez 25, 30 ou 33 cm pour la majorité des poêles modernes, 40 ou 50 cm pour les grandes cheminées.',
    category: 'Conseils',
  },
  {
    q: 'Puis-je décaler ou annuler ma commande ?',
    a: "Vous pouvez modifier ou annuler une commande jusqu'à 48 h avant la date de livraison, en nous contactant par email ou téléphone. Si la préparation a déjà commencé, nous recherchons la meilleure solution avec vous.",
    category: 'Commande',
  },
  {
    q: 'Proposez-vous le retrait à l\'entrepôt ?',
    a: "Oui, le retrait est gratuit sur rendez-vous à notre entrepôt de Nantes-est (44). Sélectionnez l'option « Retrait entrepôt » lors de la commande, nous vous confirmons le créneau par téléphone.",
    category: 'Livraison',
  },
  {
    q: 'Comment stocker mon bois après livraison ?',
    a: "Empilez les bûches sur une palette ou des cales, à l'abri du sol, si possible contre un mur exposé au vent. Protégez le dessus de la pile et laissez les côtés respirer. Évitez les bâches hermétiques qui retiennent l'humidité.",
    category: 'Conseils',
  },
  {
    q: 'Vos granulés sont-ils certifiés ?',
    a: 'Oui, nos granulés sont certifiés ENplus A1 : diamètre 6 mm, taux de cendres inférieur à 0,7 % et pouvoir calorifique supérieur à 4,6 kWh/kg.',
    category: 'Qualité',
  },
  {
    q: 'Le paiement en plusieurs fois est-il possible ?',
    a: 'Le paiement en 3 fois sans frais est disponible pour toute commande supérieure à 300 €. Le paiement en ligne est sécurisé et traité par notre prestataire de paiement.',
    category: 'Commande',
  },
];

const settings = [
  ['store', {
    name: 'EdyEco',
    legalName: 'EdyEco SAS',
    email: 'contact@edyeco.fr',
    phone: '05 56 09 90 99',
    address: '68 route de Bordeaux, 33780 Soulac-sur-Mer',
    warehouse: 'Entrepôt Nantes-Est — 44',
    hours: 'Du lundi au vendredi, 8h30 – 18h00',
    siret: 'SIRET 000 000 000 00000',
    vat: 'TVA FR00000000000',
  }],
  ['delivery', {
    classique: { fee_cents: 4900, label: 'Livraison classique', eta: '5 à 8 jours ouvrés' },
    confort: { fee_cents: 8900, label: 'Livraison confort', eta: 'environ 2 semaines' },
    retrait: { fee_cents: 0, label: 'Retrait entrepôt', eta: 'sur rendez-vous' },
    freeAboveCents: 150000,
    zones: ['France métropolitaine'],
  }],
  ['announcement', {
    enabled: true,
    text: 'Livraison offerte dès 1 500 € d’achat • Bois sec garanti moins de 20 % d’humidité',
    link: '/boutique',
  }],
  ['seo', {
    title: 'EdyEco — Bois de chauffage sec, granulés et bûches compressées',
    description:
      "Bois de chauffage sec en palette ou ballot, granulés ENplus A1 et bûches compressées. Vente directe producteur, livraison à domicile, paiement sécurisé.",
    keywords: 'bois de chauffage, granulés de bois, bûches compressées, pellets, palette de bois, livraison bois',
    ogImage: '/media/hero-fire-poster.jpg',
  }],
  ['social', {
    facebook: 'https://www.facebook.com/',
    instagram: 'https://www.instagram.com/',
    youtube: 'https://www.youtube.com/',
  }],
  ['features', {
    showFloatingStars: true,
    reviewsAverage: 4.5,
    reviewsCount: 6882,
  }],
];

export async function seed({ reset = false, silent = false } = {}) {
  await runMigrations({ silent });
  const log = (...a) => !silent && console.log('[seed]', ...a);

  const { rows: existing } = await query('SELECT count(*)::int AS n FROM products');
  if (existing[0].n > 0 && !reset) {
    log('données déjà présentes, seed ignoré');
    return { skipped: true };
  }

  await withTransaction(async (db) => {
    if (reset) {
      await db.query(
        'TRUNCATE order_items, orders, cart_items, carts, reviews, products, categories, blog_posts, faqs, analytics_events, audit_log, newsletter_campaigns, contact_messages RESTART IDENTITY CASCADE'
      );
      await db.query('DELETE FROM discount_codes');
      await db.query('DELETE FROM users WHERE email <> $1', [config.admin.email]);
    }

    // Admin (idempotent)
    const hash = await bcrypt.hash(config.admin.password, 12);
    await db.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, email_opt_in)
       VALUES ($1,$2,$3,$4,'admin',true)
       ON CONFLICT (email) DO UPDATE SET role = 'admin'`,
      [config.admin.email, hash, 'Admin', 'EdyEco']
    );

    // Categories
    const catIds = {};
    for (const c of categories) {
      const { rows } = await db.query(
        `INSERT INTO categories (slug, name, tagline, description, image_url, position, seo_title, seo_description)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        [c.slug, c.name, c.tagline, c.description, c.image_url, c.position, c.seo_title, c.seo_description]
      );
      catIds[c.slug] = rows[0].id;
    }

    // Products
    const productIds = {};
    for (const p of products) {
      const { rows } = await db.query(
        `INSERT INTO products
          (slug, name, sku, category_id, short_description, description, price_cents, compare_at_cents,
           stock, unit, log_length_cm, volume_m3, wood_type, moisture, image_url, badges, is_active,
           is_featured, delivery_class, position, seo_title, seo_description)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,true,$17,'classique',$18,$19,$20)
         RETURNING id`,
        [
          p.slug, p.name, p.sku, catIds[p.category], p.short, p.description, p.price_cents,
          p.compare_at_cents ?? null, p.stock, p.unit, p.length ?? null, p.volume ?? null,
          p.wood_type ?? 'Chêne & hêtre', p.moisture ?? 'Moins de 20 %', p.image,
          JSON.stringify(p.badges ?? []), p.featured ?? false, p.position,
          `${p.name} | EdyEco`, p.short.slice(0, 155),
        ]
      );
      productIds[p.slug] = rows[0].id;
    }

    // Reviews
    const reviewSeeds = [
      ['bois-de-chauffage-33-cm-palette-27-steres', 'Camille L.', 5, 'Bois impeccable', "Livraison confort parfaite, palette déposée exactement où je voulais. Le bois est très sec, ça se voit à la flamme."],
      ['bois-de-chauffage-33-cm-palette-27-steres', 'Thomas R.', 5, 'Excellent rapport qualité prix', 'Deuxième commande, toujours aussi satisfait. Le 33 cm est parfait pour mon poêle.'],
      ['bois-de-chauffage-50-cm-palette-18-m3', 'Isabelle M.', 4, 'Très bon bois', "Belles bûches, un peu de perte mais rien d'anormal. Le service client a répondu en 2 h."],
      ['bois-de-chauffage-25-cm-palette-15-m3', 'Julien P.', 5, 'Idéal pour petit poêle', 'Enfin des bûches à la bonne longueur pour mon appareil. Très sec et facile à allumer.'],
      ['granules-de-bois-enplus-a1-palette-66-sacs', 'Nathalie D.', 5, 'Pellets au top', 'Peu de poussière, combustion très propre. Je recommande.'],
      ['buches-compressees-palette-12-stere', 'Marc B.', 5, 'Chaleur impressionnante', "Ça tient toute la nuit, franchement bluffé par la densité."],
      ['bois-de-chauffage-30-cm-ballot-13-m3', 'Sophie G.', 4, 'Pratique et propre', 'Le ballot est très pratique, pas besoin de tout déplacer.'],
    ];
    for (const [slug, name, rating, title, content] of reviewSeeds) {
      if (!productIds[slug]) continue;
      await db.query(
        `INSERT INTO reviews (product_id, author_name, rating, title, content, is_published)
         VALUES ($1,$2,$3,$4,$5,true)`,
        [productIds[slug], name, rating, title, content]
      );
    }

    // Blog
    for (const b of posts) {
      await db.query(
        `INSERT INTO blog_posts (slug, title, excerpt, content, cover_url, author, category, tags, status, read_minutes,
          seo_title, seo_description, published_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'published',$9,$10,$11, now() - ($12 || ' days')::interval)`,
        [
          b.slug, b.title, b.excerpt, b.content, b.cover, 'Équipe EdyEco', b.category, b.tags, b.read,
          b.seo_title, b.seo_description, String(posts.indexOf(b) * 11 + 3),
        ]
      );
    }

    // FAQs
    for (const [i, f] of faqs.entries()) {
      await db.query(
        'INSERT INTO faqs (question, answer, category, position) VALUES ($1,$2,$3,$4)',
        [f.q, f.a, f.category, i]
      );
    }

    // Settings
    for (const [key, value] of settings) {
      await db.query(
        `INSERT INTO settings (key, value) VALUES ($1,$2::jsonb)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
        [key, JSON.stringify(value)]
      );
    }

    // Discount codes
    await db.query(
      `INSERT INTO discount_codes (code, type, value, min_order_cents, max_uses, is_active)
       VALUES ('BIENVENUE10','percent',10,30000,500,true),
              ('LIVRAISONOFFERTE','fixed',4900,60000,200,true)
       ON CONFLICT (code) DO NOTHING`
    );

    if (config.seedDemoData) {
      const demoCustomers = [
        ['claire.martin@example.com', 'Claire', 'Martin', '0612345678', true],
        ['hugo.bernard@example.com', 'Hugo', 'Bernard', '0623456789', true],
        ['lea.dubois@example.com', 'Léa', 'Dubois', '0634567890', false],
        ['nathan.thomas@example.com', 'Nathan', 'Thomas', '0645678901', true],
        ['emma.robert@example.com', 'Emma', 'Robert', '0656789012', true],
        ['lucas.petit@example.com', 'Lucas', 'Petit', '0667890123', false],
        ['chloe.richard@example.com', 'Chloé', 'Richard', '0678901234', true],
        ['gabriel.moreau@example.com', 'Gabriel', 'Moreau', '0689012345', true],
        ['manon.simon@example.com', 'Manon', 'Simon', '0690123456', false],
        ['arthur.laurent@example.com', 'Arthur', 'Laurent', '0601234567', true],
      ];
      const customerIds = [];
      const demoHash = await bcrypt.hash('demo12345', 12);
      for (const [email, first, last, phone, optIn] of demoCustomers) {
        const { rows } = await db.query(
          `INSERT INTO users (email, password_hash, first_name, last_name, phone, email_opt_in, created_at)
           VALUES ($1,$2,$3,$4,$5,$6, now() - ($7 || ' days')::interval) RETURNING id`,
          [email, demoHash, first, last, phone, optIn, String(Math.floor(Math.random() * 120) + 10)]
        );
        customerIds.push({ id: rows[0].id, email, name: `${first} ${last}`, phone });
      }

      for (let i = 0; i < 10; i++) {
        await db.query(
          `INSERT INTO newsletter_subscribers (email, source, first_name, created_at)
           VALUES ($1,'site',$2, now() - ($3 || ' days')::interval) ON CONFLICT DO NOTHING`,
          [demoCustomers[i][0], demoCustomers[i][1], String(i * 4 + 1)]
        );
      }

      // Historic orders over the last 90 days, deterministic-ish
      const statuses = ['paid', 'shipped', 'delivered', 'delivered', 'delivered', 'pending', 'cancelled'];
      const productList = Object.entries(productIds);
      let seedN = 7;
      const rand = () => {
        seedN = (seedN * 9301 + 49297) % 233280;
        return seedN / 233280;
      };
      for (let i = 0; i < 34; i++) {
        const cust = customerIds[Math.floor(rand() * customerIds.length)];
        const dayAgo = Math.floor(rand() * 88) + 1;
        const status = statuses[Math.floor(rand() * statuses.length)];
        const nbItems = 1 + Math.floor(rand() * 2.4);
        const picked = new Map();
        for (let k = 0; k < nbItems; k++) {
          const [slug, pid] = productList[Math.floor(rand() * productList.length)];
          const qty = 1 + Math.floor(rand() * 2);
          picked.set(pid, { slug, qty });
        }
        let subtotal = 0;
        const lines = [];
        for (const [pid, { slug, qty }] of picked) {
          const p = products.find((x) => x.slug === slug);
          const line = p.price_cents * qty;
          subtotal += line;
          lines.push({ pid, slug, name: p.name, price: p.price_cents, qty, line, image: p.image });
        }
        const deliveryFee = status === 'cancelled' && rand() > 0.6 ? 0 : 4900;
        const total = subtotal + deliveryFee;
        const paid = ['paid', 'shipped', 'delivered'].includes(status);
        const { rows: orderRows } = await db.query(
          `INSERT INTO orders (reference, user_id, email, customer_name, phone, shipping_address, delivery_method,
            delivery_fee_cents, subtotal_cents, total_cents, status, payment_method, paid_at, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6::jsonb,'classique',$7,$8,$9,$10,'simulation',$11,
             now() - ($12 || ' days')::interval, now() - ($12 || ' days')::interval)
           RETURNING id`,
          [
            `EDY-${String(100000 + i)}`, cust.id, cust.email, cust.name, cust.phone,
            JSON.stringify({ line1: `${1 + i} rue des Chênes`, postal_code: '44300', city: 'Nantes', country: 'France' }),
            deliveryFee, subtotal, total, status, paid ? new Date() : null, String(dayAgo),
          ]
        );
        for (const l of lines) {
          await db.query(
            `INSERT INTO order_items (order_id, product_id, product_slug, name, image_url, unit_price_cents, quantity, line_total_cents)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [orderRows[0].id, l.pid, l.slug, l.name, l.image, l.price, l.qty, l.line]
          );
        }
      }

      // Abandoned carts
      for (let i = 0; i < 4; i++) {
        const cust = customerIds[i];
        const { rows: cartRows } = await db.query(
          `INSERT INTO carts (user_id, email, status, last_activity_at, created_at)
           VALUES ($1,$2,'abandoned', now() - ($3 || ' hours')::interval, now() - ($4 || ' hours')::interval)
           RETURNING id`,
          [cust.id, cust.email, String(2 + i * 3), String(4 + i * 3)]
        );
        for (const [idx, [slug, pid]] of productList.slice(i, i + 2).entries()) {
          const p = products.find((x) => x.slug === slug);
          if (!p) continue;
          await db.query(
            'INSERT INTO cart_items (cart_id, product_id, quantity) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
            [cartRows[0].id, pid, idx + 1]
          );
        }
        await db.query('INSERT INTO cart_items (cart_id, product_id, quantity) VALUES ($1,$2,1) ON CONFLICT DO NOTHING', [cartRows[0].id, productIds['allume-feu-ecologique-32-buchettes']]);
      }

      // Contact messages
      await db.query(
        `INSERT INTO contact_messages (name, email, phone, subject, message, status, created_at) VALUES
         ('Claire Martin','claire.martin@example.com','0612345678','Livraison 50 cm', 'Bonjour, est-il possible d''avoir une livraison confort en semaine ? Merci.', 'new', now() - interval '2 days'),
         ('Hugo Bernard','hugo.bernard@example.com','0623456789','Conseil poêle', 'Quelle longueur de bûche pour un poêle Jøtul F 305 ?', 'read', now() - interval '6 days')`
      );
    }
  });

  log('seed terminé');
  return { skipped: false };
}

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  const reset = process.argv.includes('--reset');
  seed({ reset })
    .then(() => closePool())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

export default seed;
