// Demo services attached to the admin account, created on demand from the Admin panel.
// Images use stable Unsplash CDN URLs.

const img = (id) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1400&q=80`

export const DEMO_SERVICES = [
  {
    key: 'hugographie',
    category: 'evenement',
    serviceType: 'photographe',
    businessName: 'Hugographie',
    title: 'Hugographie — Photographe & Vidéaste',
    tagline: 'Des images qui racontent votre histoire, avec élégance et émotion.',
    coverImage: img('photo-1452587925148-ce544e77e70d'),
    priceLabel: 'À partir de 350 €',
    priceComment: 'Tarif de départ pour une prestation photo de 2h. Devis personnalisé selon votre projet.',
    contact: {
      email: 'contact@hugoquiz.com',
      showEmail: true,
      phone: '',
      showPhone: false,
    },
    windows: [
      {
        title: 'Accueil',
        blocks: [
          {
            type: 'image',
            url: img('photo-1452587925148-ce544e77e70d'),
            caption: 'Capturer l’instant, sublimer le souvenir',
          },
          {
            type: 'text',
            content:
              "Bienvenue chez Hugographie. Photographe et vidéaste passionné, j'immortalise vos moments les plus précieux avec une approche moderne, naturelle et élégante. Chaque image est pensée pour raconter une histoire — la vôtre. Que ce soit pour un mariage, un portrait, un événement d'entreprise ou un projet créatif, je mets mon savoir-faire et mon matériel professionnel à votre service.",
          },
          {
            type: 'text',
            content:
              "✔ Matériel professionnel (boîtiers plein format, optiques lumineuses, éclairage studio)\n✔ Retouche soignée incluse\n✔ Livraison rapide en galerie privée haute définition\n✔ Déplacement possible dans toute la région",
          },
        ],
      },
      {
        title: 'Mariage',
        blocks: [
          {
            type: 'image',
            url: img('photo-1519741497674-611481863552'),
            caption: 'Votre plus beau jour, gravé pour toujours',
          },
          {
            type: 'text',
            content:
              "Le jour de votre mariage mérite un regard attentif et discret. Je vous accompagne des préparatifs jusqu'à la soirée pour capturer les émotions, les détails et les instants spontanés. Reportage complet, photos de couple, photos de groupe et film souvenir : tout est pensé pour revivre cette journée à l'infini.",
          },
          {
            type: 'image',
            url: img('photo-1511285560929-80b456fea0bc'),
            caption: 'Les détails qui font la différence',
          },
          {
            type: 'text',
            content:
              "Formules disponibles :\n• Essentielle — couverture de la cérémonie (4h)\n• Prestige — de la préparation à la première danse (8h)\n• Royale — reportage complet + film cinématique + album premium",
          },
        ],
      },
      {
        title: 'Portrait',
        blocks: [
          {
            type: 'image',
            url: img('photo-1554080353-a576cf803bda'),
            caption: 'Révélez votre personnalité',
          },
          {
            type: 'text',
            content:
              "Séances portrait en studio ou en extérieur : portraits individuels, photos de famille, shooting professionnel (LinkedIn, book, corporate). Je vous mets à l'aise pour des images authentiques qui vous ressemblent vraiment.",
          },
        ],
      },
      {
        title: 'Vidéo & Drone',
        blocks: [
          {
            type: 'image',
            url: img('photo-1473968512647-3e447244af8f'),
            caption: 'Des images aériennes spectaculaires',
          },
          {
            type: 'text',
            content:
              "Films d'événements, clips promotionnels, vidéos d'entreprise et prises de vue par drone (télépilote certifié). Montage professionnel, étalonnage des couleurs et habillage sonore inclus pour un rendu cinématographique.",
          },
          {
            type: 'image',
            url: img('photo-1606983340126-99ab4feaa64a'),
            caption: 'Studio & post-production',
          },
        ],
      },
      {
        title: 'Événements',
        blocks: [
          {
            type: 'image',
            url: img('photo-1492684223066-81342ee5ff30'),
            caption: 'Soirées, séminaires et célébrations',
          },
          {
            type: 'text',
            content:
              "Anniversaires, baptêmes, séminaires, lancements de produit ou soirées d'entreprise : je couvre vos événements avec réactivité et discrétion pour des souvenirs vivants et dynamiques.",
          },
        ],
      },
    ],
  },
  {
    key: 'hugo-eventplanner',
    category: 'evenement',
    serviceType: 'event-planner',
    businessName: 'Hugo',
    title: 'Hugo — Event-planner & Organisation d’événements',
    tagline: 'Vous rêvez l’événement, nous le réalisons dans les moindres détails.',
    coverImage: img('photo-1464366400600-7168b8af9bc3'),
    priceLabel: 'Sur devis',
    priceComment: 'Chaque projet est unique. Devis gratuit et personnalisé après un premier échange.',
    contact: {
      email: 'contact@hugoquiz.com',
      showEmail: true,
      phone: '',
      showPhone: false,
    },
    windows: [
      {
        title: 'Accueil',
        blocks: [
          {
            type: 'image',
            url: img('photo-1464366400600-7168b8af9bc3'),
            caption: 'Des événements sur mesure, sans stress',
          },
          {
            type: 'text',
            content:
              "Hugo est votre agence d'organisation d'événements clé en main. De la première idée à la dernière danse, nous concevons, coordonnons et orchestrons votre événement pour qu'il soit à la hauteur de vos rêves — pendant que vous profitez pleinement de l'instant. Mariages, anniversaires, séminaires, soirées d'entreprise : nous nous occupons de tout.",
          },
          {
            type: 'text',
            content:
              "✔ Un interlocuteur unique et disponible\n✔ Un réseau de prestataires de confiance\n✔ Gestion du budget transparente\n✔ Coordination le jour J de A à Z",
          },
        ],
      },
      {
        title: 'Mariages',
        blocks: [
          {
            type: 'image',
            url: img('photo-1519225421980-715cb0215aed'),
            caption: 'Le mariage de vos rêves, sans le stress',
          },
          {
            type: 'text',
            content:
              "Wedding planning complet ou partiel : recherche du lieu idéal, sélection des prestataires, scénographie, planning détaillé et coordination le jour J. Nous transformons votre vision en une journée fluide et inoubliable.",
          },
        ],
      },
      {
        title: 'Entreprise',
        blocks: [
          {
            type: 'image',
            url: img('photo-1505236858219-8359eb29e329'),
            caption: 'Séminaires & événements corporate',
          },
          {
            type: 'text',
            content:
              "Séminaires, conventions, soirées de gala, team-building, lancements de produit : nous concevons des événements professionnels qui marquent les esprits et renforcent votre image de marque. Logistique, lieu, traiteur, animation et technique : tout est géré.",
          },
        ],
      },
      {
        title: 'Décoration & Scénographie',
        blocks: [
          {
            type: 'image',
            url: img('photo-1478146896981-b80fe463b330'),
            caption: 'Une ambiance unique pour chaque événement',
          },
          {
            type: 'text',
            content:
              "Création d'univers décoratifs sur mesure : palette de couleurs, fleurs, mobilier, mise en lumière et signalétique. Chaque détail est pensé pour créer une atmosphère cohérente et mémorable.",
          },
        ],
      },
      {
        title: 'Traiteur & Animation',
        blocks: [
          {
            type: 'image',
            url: img('photo-1555244162-803834f70033'),
            caption: 'Gastronomie et expériences pour vos invités',
          },
          {
            type: 'text',
            content:
              "Nous sélectionnons pour vous les meilleurs traiteurs, DJ, artistes et animateurs afin d'offrir à vos invités une expérience gourmande et festive, parfaitement coordonnée avec le reste de l'événement.",
          },
        ],
      },
    ],
  },
]
