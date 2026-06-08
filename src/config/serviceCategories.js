// Service categories & types configuration for the HugoQuiz "Services" marketplace.
// Each category groups a set of service types. Labels are resolved via i18n with
// fallbacks (see translations `services.categories.*` and `services.types.*`).

export const SERVICE_CATEGORIES = [
  {
    id: 'evenement',
    emoji: '🎉',
    color: 'from-pink-500 to-rose-500',
    types: [
      'photographe',
      'videaste',
      'event-planner',
      'dj',
      'traiteur',
      'decoration',
      'animation',
      'location-salle',
      'fleuriste',
      'musicien',
      'mc',
      'securite',
    ],
  },
  {
    id: 'maison',
    emoji: '🏠',
    color: 'from-amber-500 to-orange-500',
    types: [
      'plombier',
      'electricien',
      'menuisier',
      'peintre',
      'jardinier',
      'demenagement',
      'nettoyage',
      'bricolage',
    ],
  },
  {
    id: 'beaute',
    emoji: '💄',
    color: 'from-fuchsia-500 to-pink-500',
    types: [
      'coiffeur',
      'maquilleur',
      'estheticienne',
      'manucure',
      'massage',
      'coach-sportif',
    ],
  },
  {
    id: 'formation',
    emoji: '📚',
    color: 'from-blue-500 to-indigo-500',
    types: [
      'cours-particuliers',
      'langues',
      'musique',
      'soutien-scolaire',
      'coaching',
    ],
  },
  {
    id: 'digital',
    emoji: '💻',
    color: 'from-violet-500 to-purple-600',
    types: [
      'developpeur',
      'graphiste',
      'webdesign',
      'marketing',
      'redaction',
      'community-manager',
    ],
  },
  {
    id: 'mode',
    emoji: '👗',
    color: 'from-rose-500 to-red-500',
    types: ['couture', 'stylisme', 'retouche', 'creation'],
  },
  {
    id: 'transport',
    emoji: '🚗',
    color: 'from-teal-500 to-cyan-500',
    types: ['chauffeur', 'livraison', 'vtc', 'demenageur'],
  },
  {
    id: 'autre',
    emoji: '✨',
    color: 'from-slate-500 to-gray-600',
    types: ['autre'],
  },
]

export const getCategoryById = (id) =>
  SERVICE_CATEGORIES.find((c) => c.id === id) || null

// Translation helpers — return a key + fallback label.
export const categoryLabel = (t, id) =>
  t(`services.categories.${id}`, CATEGORY_FALLBACK[id] || id)

export const typeLabel = (t, id) =>
  t(`services.types.${id}`, TYPE_FALLBACK[id] || id)

// French fallbacks (used when a translation key is missing)
export const CATEGORY_FALLBACK = {
  evenement: 'Événement',
  maison: 'Maison & Travaux',
  beaute: 'Beauté & Bien-être',
  formation: 'Cours & Formation',
  digital: 'Informatique & Digital',
  mode: 'Mode & Couture',
  transport: 'Transport & Livraison',
  autre: 'Autres services',
}

export const TYPE_FALLBACK = {
  photographe: 'Photographe',
  videaste: 'Vidéaste',
  'event-planner': 'Event-planner',
  dj: 'DJ',
  traiteur: 'Traiteur',
  decoration: 'Décoration',
  animation: 'Animation',
  'location-salle': 'Location de salle',
  fleuriste: 'Fleuriste',
  musicien: 'Musicien',
  mc: 'Maître de cérémonie',
  securite: 'Sécurité',
  plombier: 'Plombier',
  electricien: 'Électricien',
  menuisier: 'Menuisier',
  peintre: 'Peintre',
  jardinier: 'Jardinier',
  demenagement: 'Déménagement',
  nettoyage: 'Nettoyage',
  bricolage: 'Bricolage',
  coiffeur: 'Coiffeur',
  maquilleur: 'Maquilleur',
  estheticienne: 'Esthéticienne',
  manucure: 'Manucure',
  massage: 'Massage',
  'coach-sportif': 'Coach sportif',
  'cours-particuliers': 'Cours particuliers',
  langues: 'Langues',
  musique: 'Musique',
  'soutien-scolaire': 'Soutien scolaire',
  coaching: 'Coaching',
  developpeur: 'Développeur',
  graphiste: 'Graphiste',
  webdesign: 'Web design',
  marketing: 'Marketing',
  redaction: 'Rédaction',
  'community-manager': 'Community manager',
  couture: 'Couture',
  stylisme: 'Stylisme',
  retouche: 'Retouche',
  creation: 'Création',
  chauffeur: 'Chauffeur',
  livraison: 'Livraison',
  vtc: 'VTC',
  demenageur: 'Déménageur',
  autre: 'Autre',
}

// Accepted identity document types for becoming a service provider.
export const ID_DOCUMENT_TYPES = [
  'carte-identite',
  'passeport-ue',
  'carte-sejour',
  'visa',
  'permis-conduire',
]

export const ID_DOCUMENT_FALLBACK = {
  'carte-identite': "Carte d'identité",
  'passeport-ue': 'Passeport (Union européenne)',
  'carte-sejour': 'Carte de séjour',
  visa: 'Visa',
  'permis-conduire': 'Permis de conduire',
}
