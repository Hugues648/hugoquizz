import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { FiMessageCircle, FiX, FiSend, FiUser, FiHelpCircle, FiUsers, FiCheckCircle } from 'react-icons/fi'
import { useAuth } from '../contexts/AuthContext'
import {
  getOrCreateConversation,
  addChatMessage,
  subscribeToChatMessages,
  subscribeToConversation,
  escalateToHuman,
  markMessagesAsRead,
  shouldEscalateMessage,
  incrementBotResponseCount,
  updateChatConversation
} from '../services/chatService'

// ==================== ENHANCED KNOWLEDGE BASE ====================
const KNOWLEDGE_BASE = {
  fr: {
    patterns: [
      // ==================== QUIZ ====================
      {
        keywords: ['créer', 'quiz', 'nouveau quiz'],
        response: "📝 **Créer un quiz** :\n\n1. Tableau de bord → '+ Créer un quiz'\n2. Ajoutez titre et description\n3. Ajoutez vos questions (QCM, Vrai/Faux, Puzzle...)\n4. Définissez le temps par question (5-120 sec)\n5. Ajoutez des images si souhaité\n6. Publiez !\n\n💡 Astuce : Utilisez le raccourci N+Q pour créer rapidement.\n\n**Utilité** : Les quiz sont parfaits pour des animations de groupe, tests de connaissances, formations ludiques ou soirées entre amis !"
      },
      {
        keywords: ['question', 'type', 'qcm', 'vrai', 'faux', 'puzzle'],
        response: "📋 **Types de questions disponibles** :\n\n• **QCM** : 2 à 6 réponses possibles, une seule correcte\n• **Vrai/Faux** : Question binaire simple\n• **Puzzle** : Image découpée à reconstituer\n\nChaque type peut avoir :\n- Une image illustrative\n- Un temps limite personnalisé\n- Des points configurables\n\n**Utilité** : Variez les types pour rendre vos quiz plus dynamiques et engageants !"
      },
      {
        keywords: ['modifier', 'éditer', 'changer', 'quiz'],
        response: "✏️ **Modifier un quiz** :\n\n1. Tableau de bord → Trouvez votre quiz\n2. Cliquez sur l'icône crayon (Éditer)\n3. Modifiez titre, description, questions\n4. Réorganisez l'ordre des questions par glisser-déposer\n5. Sauvegardez les modifications\n\n⚠️ Les modifications n'affectent pas les parties déjà jouées."
      },
      {
        keywords: ['supprimer', 'effacer', 'quiz'],
        response: "🗑️ **Supprimer un quiz** :\n\n1. Tableau de bord → Trouvez votre quiz\n2. Cliquez sur l'icône poubelle\n3. Confirmez la suppression\n\n⚠️ Cette action est irréversible ! Toutes les réponses et scores seront perdus."
      },
      {
        keywords: ['partager', 'lien', 'code', 'quiz', 'jouer'],
        response: "🔗 **Partager un quiz** :\n\n1. Ouvrez votre quiz\n2. Cliquez sur 'Partager' ou 'Copier le lien'\n3. Envoyez le lien par email, WhatsApp, etc.\n\n**Modes de jeu** :\n• **Solo** : Chacun joue à son rythme\n• **Live** : Tous ensemble en temps réel (mode hôte)\n\nLe lien ressemble à : hugoquiz.web.app/play/quiz/xxx"
      },
      {
        keywords: ['temps', 'minuteur', 'timer', 'durée', 'question'],
        response: "⏱️ **Gestion du temps** :\n\n• Temps par question : 5 à 120 secondes\n• Valeur par défaut : 30 secondes\n• Le temps restant est affiché pendant le jeu\n• Si le temps expire → réponse comptée comme fausse\n\n💡 Adaptez le temps selon la difficulté de la question !"
      },
      {
        keywords: ['image', 'photo', 'illustration', 'quiz'],
        response: "🖼️ **Images dans les quiz** :\n\n• Ajoutez une image par question (optionnel)\n• Formats : JPG, PNG, GIF, WebP\n• Taille max : 60 Mo\n• L'image s'affiche pendant le jeu\n\n**Pour les puzzles** :\nL'image sera découpée et mélangée pour être reconstituée."
      },
      {
        keywords: ['score', 'point', 'résultat'],
        response: "🏆 **Système de scores** :\n\n• Chaque bonne réponse = points configurables\n• Bonus de rapidité (répondre vite = plus de points)\n• Score final = total des points\n\n**Résultats** :\n• Score total et pourcentage\n• Temps de réponse moyen\n• Détail par question\n• Mode révision pour revoir les erreurs"
      },
      {
        keywords: ['classement', 'leaderboard', 'top', 'meilleur'],
        response: "🥇 **Classement / Leaderboard** :\n\n1. Jouez au quiz\n2. Page résultats → 'Voir le classement'\n\n**Fonctionnalités** :\n• Podium Top 3 avec avatars\n• Liste complète des joueurs\n• Filtres : Aujourd'hui, 7 jours, 30 jours, Tous\n• Score et temps de jeu affichés"
      },
      {
        keywords: ['révision', 'revoir', 'erreur', 'mauvaise'],
        response: "📖 **Mode révision** :\n\nAprès avoir joué :\n1. Page résultats\n2. Cliquez 'Mode révision'\n3. Revoyez uniquement vos mauvaises réponses\n4. La bonne réponse est affichée en vert\n\n💡 Idéal pour apprendre de ses erreurs !"
      },
      {
        keywords: ['live', 'temps réel', 'hôte', 'ensemble', 'groupe'],
        response: "🎮 **Mode Live (temps réel)** :\n\n**Côté hôte** :\n1. Quiz → 'Lancer en mode Live'\n2. Un code de session s'affiche\n3. Attendez les joueurs\n4. Lancez quand prêt\n5. Tous voient la même question en même temps\n\n**Côté joueurs** :\n1. Entrez le code de session\n2. Attendez le lancement\n3. Répondez aux questions synchronisées\n\n**Utilité** : Parfait pour animations de soirées, team buildings, cours interactifs !"
      },
      {
        keywords: ['réponse', 'voir', 'statistique', 'analyse'],
        response: "📊 **Statistiques des réponses** :\n\n1. Tableau de bord → Quiz → 'Voir les réponses'\n\n**Vous verrez** :\n• Nombre de parties jouées\n• Score moyen\n• Question la plus réussie/ratée\n• Détail par participant\n• Graphiques de répartition"
      },

      // ==================== QUESTIONNAIRES ====================
      {
        keywords: ['questionnaire', 'créer', 'sondage', 'formulaire'],
        response: "📋 **Créer un questionnaire** :\n\n1. Tableau de bord → '+ Créer questionnaire'\n2. Ajoutez titre et description\n3. Ajoutez vos questions :\n   • Texte libre\n   • Choix unique\n   • Choix multiple\n   • Échelle de satisfaction\n4. Publiez et partagez le lien !\n\n💡 Idéal pour sondages, feedback, inscriptions...\n\n**Utilité** : Collectez des avis, organisez des inscriptions, mesurez la satisfaction de vos invités ou clients !"
      },
      {
        keywords: ['questionnaire', 'type', 'question', 'champ'],
        response: "📝 **Types de questions (questionnaire)** :\n\n• **Texte libre** : Réponse ouverte\n• **Choix unique** : Une seule réponse parmi plusieurs\n• **Choix multiple** : Plusieurs réponses possibles\n• **Échelle** : Note de 1 à 5 ou 1 à 10\n• **Email** : Validation format email\n• **Nombre** : Réponse numérique uniquement\n\n**Utilité** : Chaque type permet de collecter des données différentes selon vos besoins !"
      },
      {
        keywords: ['questionnaire', 'réponse', 'résultat', 'voir'],
        response: "📈 **Voir les réponses du questionnaire** :\n\n1. Tableau de bord → Votre questionnaire\n2. Cliquez 'Voir les réponses'\n\n**Vous verrez** :\n• Nombre total de réponses\n• Graphiques pour choix unique/multiple\n• Liste des réponses textuelles\n• Export possible en CSV"
      },
      {
        keywords: ['questionnaire', 'anonyme', 'confidentiel'],
        response: "🔒 **Questionnaires anonymes** :\n\n• Par défaut, les réponses sont anonymes\n• Aucune info personnelle collectée\n• Vous pouvez ajouter un champ 'Nom' optionnel\n• Les réponses sont stockées de façon sécurisée"
      },
      {
        keywords: ['questionnaire', 'partager', 'diffuser', 'lien'],
        response: "🔗 **Partager un questionnaire** :\n\n1. Ouvrez votre questionnaire\n2. Cliquez 'Partager'\n3. Copiez le lien\n\n**Méthodes de diffusion** :\n• Email\n• Réseaux sociaux\n• QR code (générez-le depuis le lien)\n• Intégration sur site web"
      },

      // ==================== ÉVÉNEMENTS - DÉTAILLÉ ====================
      {
        keywords: ['événement', 'créer', 'nouveau', 'fête', 'event'],
        response: "🎉 **Créer un événement** :\n\n1. Tableau de bord → '+ Créer événement'\n2. Choisissez le type :\n   • Mariage 💒\n   • Anniversaire 🎂\n   • Fête/Autre 🎊\n3. Remplissez : titre, date, lieu\n4. Ajoutez l'image d'invitation\n5. Créez !\n\n💡 Raccourci : N+E pour créer rapidement\n\n**Fonctionnalités incluses** :\n👥 Liste d'invités | 📋 Planification | 🎁 Liste de cadeaux | 📅 Programme | 🍽️ Menu | 🪑 Tables | 📖 Livre d'or | 🗺️ Plan de salle | 📱 Scanner QR | 🎫 Billets d'invitation"
      },
      {
        keywords: ['mariage', 'wedding'],
        response: "💒 **Événement Mariage** :\n\n**Fonctionnalités incluses** :\n• 👥 Liste d'invités avec RSVP et suivi\n• 📋 Planification des tâches de préparation\n• 🎁 Liste de cadeaux avec réservation\n• 📅 Programme détaillé de la journée\n• 🍽️ Menu personnalisable avec allergies\n• 🪑 Gestion des tables et placement\n• 📖 Livre d'or numérique\n• 🗺️ Plan de salle interactif\n• 📱 Scanner QR pour la présence\n• 🎫 Billets d'invitation PDF personnalisés\n\n**Utilité** : Gérez tout votre mariage depuis une seule interface, facilitez la coordination avec vos invités et votre équipe !"
      },
      {
        keywords: ['anniversaire', 'birthday'],
        response: "🎂 **Événement Anniversaire** :\n\n**Fonctionnalités** :\n• 👥 Liste d'invités\n• 📋 Planification\n• 🎁 Liste de cadeaux\n• 📅 Programme\n• 🍽️ Menu\n• 🪑 Plan de salle (optionnel)\n• 📖 Livre d'or\n• 📱 QR codes de présence\n• 🎫 Invitations personnalisées\n\n**Idéal pour** :\n• Anniversaires d'enfants\n• Anniversaires surprise\n• Fêtes thématiques"
      },

      // LISTE D'INVITÉS
      {
        keywords: ['invité', 'ajouter', 'guest', 'liste', 'invités', 'gestion invité'],
        response: "👥 **Liste d'invités - Guide complet** :\n\n**Ajouter un invité** :\n1. Événement → 'Gestion des invités'\n2. '+ Ajouter un invité'\n3. Remplissez :\n   • Prénom et nom\n   • Type : Single ou Couple\n   • Relation (famille, ami, collègue...)\n   • Email (optionnel)\n   • Table assignée (optionnel)\n4. Sauvegardez\n\n**Actions possibles** :\n• ✏️ Modifier les informations\n• 🗑️ Supprimer un invité\n• 🔄 Changer le statut (invité/confirmé/présent/absent)\n• 🪑 Assigner à une table\n• 📄 Générer invitation PDF\n\n**Utilité** : Centralisez toutes les informations de vos invités, suivez les confirmations et gérez facilement les changements de dernière minute !"
      },
      {
        keywords: ['statut', 'présent', 'absent', 'confirmé', 'rsvp'],
        response: "📍 **Statuts des invités** :\n\n• **Invité** 📨 : Invitation envoyée, en attente de réponse\n• **Confirmé** ✅ : A confirmé sa venue\n• **Présent** 🎉 : Vérifié sur place (via QR)\n• **Absent** ❌ : Ne viendra pas\n\n**Changer le statut** :\n1. Liste des invités\n2. Cliquez sur le statut actuel\n3. Sélectionnez le nouveau statut\n\n**Le jour J** :\nUtilisez le Scanner QR pour passer automatiquement les invités en 'Présent' !\n\n**Utilité** : Suivez en temps réel qui a confirmé et qui est présent, anticipez le nombre exact de couverts !"
      },

      // PLANIFICATION
      {
        keywords: ['planification', 'planning', 'tâche', 'taches', 'organiser', 'préparation'],
        response: "📋 **Planification d'événement** :\n\n**Accès** :\nÉvénement → 'Planification' ou 'Tâches'\n\n**Fonctionnalités** :\n• 📝 Créez des tâches avec dates limites\n• 👤 Assignez des responsables\n• ✅ Marquez comme terminé\n• 🔔 Recevez des rappels\n• 📊 Visualisez l'avancement\n\n**Catégories de tâches** :\n• Lieu et logistique\n• Traiteur et menu\n• Décoration\n• Musique et animation\n• Invitations\n• Et plus encore...\n\n**Utilité** : Ne rien oublier dans l'organisation, coordonner les tâches entre organisateurs, avoir une vue d'ensemble de l'avancement !"
      },

      // LISTE DE CADEAUX
      {
        keywords: ['cadeau', 'cadeaux', 'gift', 'liste de cadeaux', 'wishlist', 'souhaits'],
        response: "🎁 **Liste de cadeaux** :\n\n**Créer votre liste** :\n1. Événement → 'Liste de cadeaux'\n2. '+ Ajouter un cadeau'\n3. Remplissez : nom, description, prix, lien (optionnel), image\n4. Partagez le lien avec vos invités\n\n**Côté invités** :\n• Voient la liste complète\n• Peuvent réserver un cadeau\n• Évitent les doublons\n• Peuvent participer à plusieurs pour un cadeau cher\n\n**Fonctionnalités** :\n• 💰 Suivi des réservations\n• 🔗 Liens vers les boutiques\n• 📊 Statistiques des cadeaux réservés\n\n**Utilité** : Recevez des cadeaux qui vous font vraiment plaisir, évitez les doublons, facilitez la vie de vos invités !"
      },

      // PROGRAMME
      {
        keywords: ['programme', 'déroulé', 'horaire', 'planning journée', 'schedule'],
        response: "📅 **Programme de l'événement** :\n\n**Créer le programme** :\n1. Événement → 'Programme'\n2. '+ Ajouter un moment'\n3. Pour chaque étape :\n   • Heure de début\n   • Titre (ex: 'Cérémonie', 'Cocktail'...)\n   • Description\n   • Lieu (optionnel)\n   • Durée\n\n**Affichage** :\n• Timeline visuelle\n• Accessible aux invités\n• Responsive mobile\n\n**Exemples de moments** :\n🍾 Accueil | 💒 Cérémonie | 📸 Photos | 🥂 Cocktail | 🍽️ Dîner | 🎂 Dessert | 💃 Soirée\n\n**Utilité** : Informez vos invités du déroulement, évitez les questions répétitives, gardez tout le monde synchronisé !"
      },

      // MENU
      {
        keywords: ['menu', 'repas', 'plat', 'entrée', 'dessert', 'allergie', 'régime'],
        response: "🍽️ **Menu de l'événement** :\n\n**Créer le menu** :\n1. Événement → 'Menu'\n2. Ajoutez chaque plat :\n   • Type : Entrée, Plat, Dessert, Boisson\n   • Nom du plat\n   • Description\n   • Options végétariennes/allergies\n\n**Gestion des régimes** :\n• 🥗 Végétarien\n• 🌱 Vegan\n• 🚫 Sans gluten\n• 🥜 Sans arachides\n• Autres restrictions\n\n**Affichage invités** :\n• Menu complet visible\n• Peuvent indiquer leurs restrictions\n• Choix de menu si options multiples\n\n**Utilité** : Planifiez le repas, gérez les restrictions alimentaires, donnez l'eau à la bouche à vos invités !"
      },

      // TABLES
      {
        keywords: ['table', 'tables', 'gestion table', 'créer table', 'capacité'],
        response: "🪑 **Gestion des tables** :\n\n**Créer des tables** :\n1. Événement → 'Gestion des tables'\n2. '+ Ajouter une table'\n3. Configurez :\n   • Nom (Table 1, Table des mariés...)\n   • Capacité (nombre de places)\n   • Forme : Ronde, Carrée, Rectangulaire\n   • Couleur pour identification\n\n**Assigner des invités** :\n• Depuis la liste d'invités : sélectionnez la table\n• Depuis le plan de salle : glissez-déposez\n• Vérifiez la capacité restante\n\n**Visualisation** :\n• Liste des tables avec occupation\n• Places restantes par table\n• Export de la liste\n\n**Utilité** : Organisez le placement de vos invités, équilibrez les tables, évitez les places vides !"
      },

      // PLAN DE SALLE
      {
        keywords: ['plan', 'salle', 'placement', 'drag', 'drop', 'disposition', 'plan de salle'],
        response: "🗺️ **Plan de salle interactif** :\n\n**Accès** :\nÉvénement → 'Plan de salle'\n\n**Créer le plan** :\n1. Ajoutez vos tables sur le canvas\n2. Positionnez-les en glissant\n3. Redimensionnez si besoin\n4. Ajoutez des éléments :\n   • Scène\n   • Piste de danse\n   • Buffet\n   • DJ\n   • Etc.\n\n**Placement des invités** :\n• Glissez-déposez les invités sur les tables\n• Voyez la capacité en temps réel\n• Réorganisez librement\n\n**Formes de tables** :\n🔵 Ronde | ⬜ Carrée | ➖ Rectangulaire | ⬭ Ovale\n\n**Utilité** : Visualisez votre salle avant le jour J, planifiez le placement optimal, partagez le plan avec vos prestataires !"
      },

      // LIVRE D'OR
      {
        keywords: ['livre', 'or', 'guestbook', 'message', 'souvenir', 'livre d\'or', 'témoignage'],
        response: "📖 **Livre d'or numérique** :\n\n**Accès** :\nÉvénement → 'Livre d'or'\n\n**Pour les invités** :\n1. Accèdent via le lien partagé\n2. Écrivent un message personnel\n3. Ajoutent une photo (optionnel)\n4. Signent avec leur nom\n5. Envoient !\n\n**Pour l'organisateur** :\n• 👀 Voir tous les messages\n• 🛡️ Modérer si nécessaire\n• 📥 Télécharger les photos\n• 💾 Garder de précieux souvenirs\n\n**Conseils** :\n• Partagez le lien pendant l'événement\n• Affichez un QR code à l'entrée\n• Encouragez les photos !\n\n**Utilité** : Conservez les messages de vos proches pour toujours, remplacez le livre d'or papier qui se perd, permettez les messages même après l'événement !"
      },

      // SCANNER QR
      {
        keywords: ['qr', 'code', 'scanner', 'présence', 'scan', 'vérification'],
        response: "📱 **Scanner QR & Présence** :\n\n**Génération des QR codes** :\n• Chaque invité reçoit un QR code unique\n• Inclus dans le PDF d'invitation\n• Généré automatiquement\n\n**Scanner le jour J** :\n1. Événement → 'Scanner QR'\n2. Autorisez l'accès caméra\n3. Scannez le code de l'invité\n4. Le statut passe à 'Présent' automatiquement\n\n**Avantages** :\n• ⚡ Vérification instantanée\n• 📊 Comptage en temps réel\n• 🔒 Évite les intrus\n• 📶 Fonctionne même hors ligne\n\n**Utilité** : Accueillez vos invités rapidement, sachez exactement qui est arrivé, sécurisez votre événement !"
      },

      // BILLET D'INVITATION
      {
        keywords: ['billet', 'invitation', 'pdf', 'imprimer', 'ticket', 'carton'],
        response: "🎫 **Billets d'invitation PDF** :\n\n**Générer une invitation** :\n1. Gestion des invités\n2. Sur un invité → 'Télécharger PDF'\n\n**Le PDF contient** :\n• 🖼️ Image d'invitation personnalisée\n• 👤 Nom de l'invité\n• 📅 Date et lieu\n• ℹ️ Informations pratiques\n• 📱 QR code unique\n\n**Options** :\n• Imprimer et envoyer par courrier\n• Envoyer par email\n• Partager via WhatsApp\n\n**Personnalisation** :\n• Design selon le type d'événement\n• Votre image d'invitation\n• Couleurs assorties\n\n**Utilité** : Créez de belles invitations sans logiciel, chaque invité a son invitation personnalisée, le QR code intégré facilite le jour J !"
      },

      // ==================== GÉNÉRAL ====================
      {
        keywords: ['langue', 'language', 'changer', 'français', 'anglais'],
        response: "🌍 **Changer la langue** :\n\n1. Barre latérale → Sélecteur de langue\n2. Ou : Paramètres → Langue\n\n**4 langues disponibles** :\n🇫🇷 Français, 🇬🇧 English, 🇩🇪 Deutsch, 🇳🇱 Nederlands"
      },
      {
        keywords: ['raccourci', 'clavier', 'keyboard', 'rapide'],
        response: "⌨️ **Raccourcis clavier** :\n\n**Navigation** :\n• G + H → Accueil\n• G + D → Tableau de bord\n• G + S → Paramètres\n\n**Création** :\n• N + Q → Nouveau quiz\n• N + E → Nouvel événement\n• N + F → Nouveau questionnaire\n\n**Autres** :\n• / → Rechercher\n• ? → Afficher cette aide\n\n💡 Appuyez sur ? à tout moment !"
      },
      {
        keywords: ['tutoriel', 'guide', 'aide', 'apprendre', 'découvrir'],
        response: "📚 **Tutoriel interactif** :\n\n**Lancer le tutoriel** :\n• Paramètres → 'Relancer le tutoriel'\n• S'affiche automatiquement pour les nouveaux\n\n**Le tutoriel couvre** :\n• Navigation dans l'interface\n• Création de quiz\n• Création d'événements\n• Accès aux paramètres\n• Utilisation du chatbot"
      },
      {
        keywords: ['compte', 'profil', 'paramètre', 'email'],
        response: "⚙️ **Paramètres du compte** :\n\n1. Cliquez sur 'Paramètres' dans le menu\n\n**Vous pouvez** :\n• Modifier votre email\n• Changer la langue\n• Relancer le tutoriel\n• Voir vos informations\n\n💡 Raccourci : G+S"
      },
      {
        keywords: ['prix', 'tarif', 'gratuit', 'payant', 'abonnement'],
        response: "💰 **Tarification** :\n\nHugoQuiz propose des forfaits adaptés à vos besoins !\n\n**Inclus** :\n• Quiz et questionnaires\n• Gestion d'événements\n• Toutes les fonctionnalités\n• 4 langues\n\nConsultez la page Tarifs pour plus de détails !"
      },
      {
        keywords: ['sécurité', 'données', 'confidentialité', 'rgpd'],
        response: "🔒 **Sécurité & Confidentialité** :\n\n• Données stockées sur Firebase (Google Cloud)\n• Connexion sécurisée HTTPS\n• Mot de passe chiffré\n• Vos données vous appartiennent\n• Conforme RGPD\n\nVos données ne sont jamais vendues !"
      },
      {
        keywords: ['problème', 'bug', 'erreur', 'marche pas', 'fonctionne pas'],
        response: "🔧 **Résolution de problèmes** :\n\n**Essayez** :\n1. Rechargez la page (F5)\n2. Videz le cache du navigateur\n3. Essayez un autre navigateur\n4. Vérifiez votre connexion internet\n\n**Toujours bloqué ?**\nCliquez sur le bouton ci-dessous pour parler à un membre de notre équipe !"
      },
      {
        keywords: ['mobile', 'téléphone', 'tablette', 'responsive'],
        response: "📱 **Version mobile** :\n\nHugoQuiz est 100% responsive !\n\n• Fonctionne sur smartphone\n• Fonctionne sur tablette\n• Interface adaptée\n• Scanner QR natif\n\n💡 Ajoutez le site à votre écran d'accueil pour un accès rapide !"
      },
      {
        keywords: ['bonjour', 'salut', 'hello', 'hi', 'coucou', 'bonsoir'],
        response: "Bonjour ! 👋 Je suis l'assistant HugoQuiz.\n\n**Je peux vous aider avec** :\n\n📝 **Quiz** : création, partage, classement, mode live...\n📋 **Questionnaires** : sondages, formulaires, résultats...\n🎉 **Événements** : invités, planification, cadeaux, programme, menu, tables, livre d'or, plan de salle, scanner QR, invitations...\n\nQue souhaitez-vous savoir ?"
      },
      {
        keywords: ['merci', 'thanks', 'super', 'génial', 'parfait', 'excellent'],
        response: "Avec plaisir ! 😊\n\nN'hésitez pas si vous avez d'autres questions.\n\nBonne utilisation de HugoQuiz ! 🎉"
      },
      {
        keywords: ['fonctionnalité', 'feature', 'option', 'possibilité', 'que peut', 'capable'],
        response: "✨ **Toutes les fonctionnalités HugoQuiz** :\n\n**📝 Quiz** :\n• QCM, Vrai/Faux, Puzzle\n• Minuteur, scores, classement\n• Mode live synchronisé\n• Mode révision\n\n**📋 Questionnaires** :\n• Texte, choix, échelles\n• Résultats graphiques\n• Export CSV\n\n**🎉 Événements** :\n• 👥 Liste d'invités avec RSVP\n• 📋 Planification des tâches\n• 🎁 Liste de cadeaux\n• 📅 Programme détaillé\n• 🍽️ Menu avec allergies\n• 🪑 Gestion des tables\n• 📖 Livre d'or\n• 🗺️ Plan de salle interactif\n• 📱 Scanner QR\n• 🎫 Invitations PDF\n\nDemandez-moi des détails sur n'importe quelle fonctionnalité !"
      },
      {
        keywords: ['utilité', 'pourquoi', 'à quoi sert', 'intérêt', 'avantage'],
        response: "🌟 **Pourquoi utiliser HugoQuiz ?** :\n\n**Pour les Quiz** :\n• Animations de soirées\n• Team buildings\n• Cours interactifs\n• Tests de connaissances\n\n**Pour les Questionnaires** :\n• Sondages d'opinion\n• Feedback clients\n• Inscriptions à des événements\n• Enquêtes de satisfaction\n\n**Pour les Événements** :\n• Mariages : tout gérer au même endroit\n• Anniversaires : invitations et suivi faciles\n• Fêtes : organisation sans stress\n\n**Avantages** :\n✅ Tout centralisé\n✅ Accessible partout\n✅ Simple à utiliser\n✅ Multilingue\n✅ Collaboratif"
      }
    ],
    defaultResponse: "Je ne suis pas sûr de comprendre votre question. 🤔\n\n**Je peux vous aider avec** :\n\n📝 **Quiz** : Comment créer, partager, jouer...\n📋 **Questionnaires** : Comment créer, voir les réponses...\n🎉 **Événements** :\n• Liste d'invités\n• Planification\n• Liste de cadeaux\n• Programme\n• Menu\n• Tables\n• Livre d'or\n• Plan de salle\n• Scanner QR\n• Invitations\n\nPosez-moi une question précise ou cliquez sur 'Parler à l'équipe' pour de l'aide humaine !",
    systemMessages: {
      escalating: "🔄 Je transfère votre conversation à un membre de notre équipe...",
      waitingAdmin: "⏳ Un membre de l'équipe HugoQuiz va vous répondre très bientôt.\n\nMerci de patienter, votre demande est en cours de traitement.",
      adminJoined: "👤 Un membre de l'équipe HugoQuiz vous répond maintenant.",
      backToBot: "🤖 Vous êtes maintenant en conversation avec l'assistant automatique.",
      conversationClosed: "✅ Cette conversation a été clôturée. N'hésitez pas à en démarrer une nouvelle si besoin !"
    }
  },
  en: {
    patterns: [
      // QUIZ
      {
        keywords: ['create', 'quiz', 'new'],
        response: "📝 **Create a quiz**:\n\n1. Dashboard → '+ Create quiz'\n2. Add title and description\n3. Add questions (MCQ, True/False, Puzzle...)\n4. Set time per question (5-120 sec)\n5. Add images if desired\n6. Publish!\n\n💡 Tip: Use N+Q shortcut for quick creation.\n\n**Purpose**: Quizzes are perfect for group activities, knowledge tests, fun training or parties with friends!"
      },
      {
        keywords: ['question', 'type', 'mcq', 'true', 'false', 'puzzle'],
        response: "📋 **Question types**:\n\n• **MCQ**: 2-6 possible answers, one correct\n• **True/False**: Simple binary question\n• **Puzzle**: Image cut up to reassemble\n\nEach type can have:\n- An illustrative image\n- Custom time limit\n- Configurable points"
      },
      {
        keywords: ['share', 'link', 'code', 'quiz', 'play'],
        response: "🔗 **Share a quiz**:\n\n1. Open your quiz\n2. Click 'Share' or 'Copy link'\n3. Send link via email, WhatsApp, etc.\n\n**Game modes**:\n• **Solo**: Everyone plays at their own pace\n• **Live**: All together in real-time (host mode)"
      },
      {
        keywords: ['score', 'point', 'result', 'leaderboard'],
        response: "🏆 **Scoring system**:\n\n• Each correct answer = configurable points\n• Speed bonus (faster = more points)\n• Final score = total points\n\n**Leaderboard**:\n• Top 3 podium with avatars\n• Filter by: Today, 7 days, 30 days, All"
      },
      // EVENTS - DETAILED
      {
        keywords: ['event', 'create', 'party', 'wedding', 'birthday'],
        response: "🎉 **Create an event**:\n\n1. Dashboard → '+ Create event'\n2. Choose type: Wedding 💒, Birthday 🎂, Party 🎊\n3. Fill in: title, date, location\n4. Add invitation image\n5. Create!\n\n**Features included**:\n👥 Guest list | 📋 Planning | 🎁 Gift registry | 📅 Program | 🍽️ Menu | 🪑 Tables | 📖 Guestbook | 🗺️ Seating plan | 📱 QR Scanner | 🎫 Invitations"
      },
      {
        keywords: ['guest', 'add', 'invite', 'list', 'rsvp'],
        response: "👥 **Guest management - Complete guide**:\n\n**Add a guest**:\n1. Event → 'Guest Management'\n2. '+ Add guest'\n3. Fill in: name, type (Single/Couple), relation, email\n4. Assign table (optional)\n5. Save\n\n**Actions**: Edit, delete, change status, assign table, generate PDF\n\n**Purpose**: Centralize all guest info, track confirmations, manage last-minute changes!"
      },
      {
        keywords: ['planning', 'task', 'organize', 'preparation'],
        response: "📋 **Event planning**:\n\n**Access**: Event → 'Planning' or 'Tasks'\n\n**Features**:\n• 📝 Create tasks with deadlines\n• 👤 Assign responsible people\n• ✅ Mark as complete\n• 🔔 Receive reminders\n• 📊 Visualize progress\n\n**Purpose**: Don't forget anything, coordinate tasks between organizers!"
      },
      {
        keywords: ['gift', 'registry', 'wishlist', 'present'],
        response: "🎁 **Gift registry**:\n\n**Create your list**:\n1. Event → 'Gift list'\n2. '+ Add gift'\n3. Fill in: name, description, price, link, image\n4. Share the link with guests\n\n**For guests**:\n• See complete list\n• Reserve a gift\n• Avoid duplicates\n• Can contribute together for expensive items\n\n**Purpose**: Receive gifts you really want, make life easier for your guests!"
      },
      {
        keywords: ['program', 'schedule', 'timeline', 'agenda'],
        response: "📅 **Event program**:\n\n**Create the program**:\n1. Event → 'Program'\n2. '+ Add moment'\n3. For each step: time, title, description, location, duration\n\n**Examples**:\n🍾 Welcome | 💒 Ceremony | 📸 Photos | 🥂 Cocktail | 🍽️ Dinner | 🎂 Dessert | 💃 Party\n\n**Purpose**: Inform guests of the schedule, avoid repetitive questions!"
      },
      {
        keywords: ['menu', 'meal', 'food', 'allergy', 'diet'],
        response: "🍽️ **Event menu**:\n\n**Create the menu**:\n1. Event → 'Menu'\n2. Add each dish: type, name, description\n\n**Dietary management**:\n• 🥗 Vegetarian\n• 🌱 Vegan\n• 🚫 Gluten-free\n• 🥜 Nut-free\n\n**Purpose**: Plan the meal, manage dietary restrictions!"
      },
      {
        keywords: ['table', 'seating', 'capacity'],
        response: "🪑 **Table management**:\n\n**Create tables**:\n1. Event → 'Table management'\n2. '+ Add table'\n3. Configure: name, capacity, shape, color\n\n**Assign guests**:\n• From guest list: select table\n• From seating plan: drag and drop\n\n**Purpose**: Organize guest placement, balance tables!"
      },
      {
        keywords: ['seating', 'plan', 'floor', 'layout', 'drag', 'drop'],
        response: "🗺️ **Interactive seating plan**:\n\n**Access**: Event → 'Seating plan'\n\n**Create the plan**:\n1. Add tables to canvas\n2. Position by dragging\n3. Add elements: stage, dance floor, buffet, DJ...\n\n**Guest placement**:\n• Drag and drop guests onto tables\n• See capacity in real-time\n\n**Purpose**: Visualize your venue, plan optimal placement!"
      },
      {
        keywords: ['guestbook', 'message', 'memory', 'testimonial'],
        response: "📖 **Digital guestbook**:\n\n**For guests**:\n1. Access via shared link\n2. Write a personal message\n3. Add photo (optional)\n4. Sign and send!\n\n**For organizer**:\n• View all messages\n• Moderate if needed\n• Download photos\n• Keep precious memories\n\n**Purpose**: Keep loved ones' messages forever, replace paper guestbook!"
      },
      {
        keywords: ['qr', 'code', 'scanner', 'presence', 'check'],
        response: "📱 **QR Scanner & Presence**:\n\n**QR code generation**:\n• Each guest gets a unique QR code\n• Included in PDF invitation\n\n**Scan on event day**:\n1. Event → 'QR Scanner'\n2. Allow camera access\n3. Scan guest's code\n4. Status becomes 'Present' automatically\n\n**Benefits**: Instant verification, real-time counting, prevent gatecrasher!"
      },
      {
        keywords: ['invitation', 'pdf', 'ticket', 'print'],
        response: "🎫 **PDF invitations**:\n\n**Generate invitation**:\n1. Guest Management\n2. On a guest → 'Download PDF'\n\n**PDF contains**:\n• Custom invitation image\n• Guest's name\n• Date and location\n• Practical info\n• Unique QR code\n\n**Purpose**: Create beautiful invitations, personalized for each guest!"
      },
      // GENERAL
      {
        keywords: ['hello', 'hi', 'hey', 'good'],
        response: "Hello! 👋 I'm the HugoQuiz assistant.\n\n**I can help with**:\n\n📝 **Quizzes**: creation, sharing, leaderboard, live mode...\n📋 **Questionnaires**: surveys, forms, results...\n🎉 **Events**: guests, planning, gifts, program, menu, tables, guestbook, seating plan, QR scanner, invitations...\n\nWhat would you like to know?"
      },
      {
        keywords: ['thanks', 'thank', 'great', 'perfect', 'excellent'],
        response: "You're welcome! 😊\n\nFeel free to ask if you have more questions.\n\nEnjoy HugoQuiz! 🎉"
      },
      {
        keywords: ['feature', 'option', 'capability', 'what can'],
        response: "✨ **All HugoQuiz features**:\n\n**📝 Quizzes**:\n• MCQ, True/False, Puzzle\n• Timer, scores, leaderboard\n• Live synchronized mode\n• Review mode\n\n**📋 Questionnaires**:\n• Text, choices, scales\n• Graphic results\n• CSV export\n\n**🎉 Events**:\n• 👥 Guest list with RSVP\n• 📋 Task planning\n• 🎁 Gift registry\n• 📅 Detailed program\n• 🍽️ Menu with allergies\n• 🪑 Table management\n• 📖 Guestbook\n• 🗺️ Interactive seating plan\n• 📱 QR Scanner\n• 🎫 PDF invitations\n\nAsk me about any feature!"
      },
      {
        keywords: ['problem', 'bug', 'error', 'not working', 'issue'],
        response: "🔧 **Troubleshooting**:\n\n**Try**:\n1. Refresh the page (F5)\n2. Clear browser cache\n3. Try another browser\n4. Check your internet connection\n\n**Still stuck?**\nClick the button below to talk to a team member!"
      }
    ],
    defaultResponse: "I'm not sure I understand. 🤔\n\n**I can help with**:\n\n📝 **Quizzes**: How to create, share, play...\n📋 **Questionnaires**: How to create, see responses...\n🎉 **Events**:\n• Guest list\n• Planning\n• Gift registry\n• Program\n• Menu\n• Tables\n• Guestbook\n• Seating plan\n• QR Scanner\n• Invitations\n\nAsk me a specific question or click 'Talk to team' for human help!",
    systemMessages: {
      escalating: "🔄 Transferring your conversation to a team member...",
      waitingAdmin: "⏳ A HugoQuiz team member will respond very soon.\n\nPlease wait, your request is being processed.",
      adminJoined: "👤 A HugoQuiz team member is now responding.",
      backToBot: "🤖 You are now chatting with the automatic assistant.",
      conversationClosed: "✅ This conversation has been closed. Feel free to start a new one if needed!"
    }
  },
  de: {
    patterns: [
      {
        keywords: ['erstellen', 'quiz', 'neu'],
        response: "📝 **Quiz erstellen**:\n\n1. Dashboard → '+ Quiz erstellen'\n2. Titel und Beschreibung hinzufügen\n3. Fragen hinzufügen (MCQ, Wahr/Falsch, Puzzle...)\n4. Zeit pro Frage festlegen (5-120 Sek)\n5. Bilder hinzufügen (optional)\n6. Veröffentlichen!\n\n💡 Tipp: Verwenden Sie N+Q für schnelle Erstellung."
      },
      {
        keywords: ['event', 'veranstaltung', 'erstellen', 'hochzeit', 'geburtstag'],
        response: "🎉 **Veranstaltung erstellen**:\n\n1. Dashboard → '+ Veranstaltung erstellen'\n2. Typ wählen: Hochzeit 💒, Geburtstag 🎂, Party 🎊\n3. Ausfüllen: Titel, Datum, Ort\n4. Einladungsbild hinzufügen\n5. Erstellen!\n\n**Funktionen**:\n👥 Gästeliste | 📋 Planung | 🎁 Geschenkliste | 📅 Programm | 🍽️ Menü | 🪑 Tische | 📖 Gästebuch | 🗺️ Sitzplan | 📱 QR-Scanner | 🎫 Einladungen"
      },
      {
        keywords: ['gast', 'gäste', 'einladen', 'liste'],
        response: "👥 **Gästeverwaltung**:\n\n1. Veranstaltung → 'Gästeverwaltung'\n2. '+ Gast hinzufügen'\n3. Ausfüllen: Name, Typ, Beziehung\n4. Tisch zuweisen (optional)\n5. Speichern\n\n**Nutzen**: Alle Gastinformationen zentral verwalten!"
      },
      {
        keywords: ['geschenk', 'wunschliste', 'registry'],
        response: "🎁 **Geschenkliste**:\n\n1. Veranstaltung → 'Geschenkliste'\n2. '+ Geschenk hinzufügen'\n3. Name, Beschreibung, Preis, Link\n4. Link mit Gästen teilen\n\n**Nutzen**: Gewünschte Geschenke erhalten, Duplikate vermeiden!"
      },
      {
        keywords: ['sitzplan', 'tisch', 'platzierung'],
        response: "🗺️ **Interaktiver Sitzplan**:\n\n1. Veranstaltung → 'Sitzplan'\n2. Tische auf Canvas hinzufügen\n3. Per Drag & Drop positionieren\n4. Gäste auf Tische ziehen\n\n**Nutzen**: Ihre Veranstaltung visualisieren, optimal planen!"
      },
      {
        keywords: ['qr', 'scanner', 'anwesenheit'],
        response: "📱 **QR-Scanner**:\n\n1. Veranstaltung → 'QR-Scanner'\n2. Kamera erlauben\n3. Gast-Code scannen\n4. Status wird automatisch 'Anwesend'\n\n**Nutzen**: Schnelle Überprüfung, Echtzeit-Zählung!"
      },
      {
        keywords: ['hallo', 'guten tag', 'hi'],
        response: "Hallo! 👋 Ich bin der HugoQuiz-Assistent.\n\n**Ich kann helfen mit**:\n\n📝 **Quiz**: Erstellen, Teilen, Bestenliste...\n📋 **Fragebögen**: Umfragen, Formulare...\n🎉 **Veranstaltungen**: Gäste, Planung, Geschenke, Programm, Menü, Tische, Gästebuch, Sitzplan, QR-Scanner, Einladungen...\n\nWas möchten Sie wissen?"
      }
    ],
    defaultResponse: "Ich bin nicht sicher, ob ich verstehe. 🤔\n\nFragen Sie mich nach Quiz, Fragebögen oder Veranstaltungen!\n\nOder klicken Sie auf 'Mit Team sprechen' für menschliche Hilfe!",
    systemMessages: {
      escalating: "🔄 Übertrage Ihre Konversation an ein Teammitglied...",
      waitingAdmin: "⏳ Ein HugoQuiz-Teammitglied wird sehr bald antworten.",
      adminJoined: "👤 Ein HugoQuiz-Teammitglied antwortet jetzt.",
      backToBot: "🤖 Sie chatten jetzt mit dem automatischen Assistenten.",
      conversationClosed: "✅ Diese Konversation wurde geschlossen."
    }
  },
  nl: {
    patterns: [
      {
        keywords: ['maken', 'quiz', 'nieuw'],
        response: "📝 **Quiz maken**:\n\n1. Dashboard → '+ Quiz maken'\n2. Titel en beschrijving toevoegen\n3. Vragen toevoegen (MCQ, Waar/Onwaar, Puzzel...)\n4. Tijd per vraag instellen (5-120 sec)\n5. Afbeeldingen toevoegen (optioneel)\n6. Publiceren!"
      },
      {
        keywords: ['evenement', 'maken', 'bruiloft', 'verjaardag'],
        response: "🎉 **Evenement maken**:\n\n1. Dashboard → '+ Evenement maken'\n2. Type kiezen: Bruiloft 💒, Verjaardag 🎂, Feest 🎊\n3. Invullen: titel, datum, locatie\n4. Uitnodigingsafbeelding toevoegen\n5. Maken!\n\n**Functies**:\n👥 Gastenlijst | 📋 Planning | 🎁 Cadeaulijst | 📅 Programma | 🍽️ Menu | 🪑 Tafels | 📖 Gastenboek | 🗺️ Tafelschikking | 📱 QR-scanner | 🎫 Uitnodigingen"
      },
      {
        keywords: ['gast', 'gasten', 'uitnodigen', 'lijst'],
        response: "👥 **Gastenbeheer**:\n\n1. Evenement → 'Gastenbeheer'\n2. '+ Gast toevoegen'\n3. Invullen: naam, type, relatie\n4. Tafel toewijzen (optioneel)\n5. Opslaan"
      },
      {
        keywords: ['hallo', 'dag', 'hi'],
        response: "Hallo! 👋 Ik ben de HugoQuiz-assistent.\n\n**Ik kan helpen met**:\n\n📝 **Quiz**: maken, delen, scorebord...\n📋 **Vragenlijsten**: enquêtes, formulieren...\n🎉 **Evenementen**: gasten, planning, cadeaus, programma, menu, tafels, gastenboek, tafelschikking, QR-scanner, uitnodigingen...\n\nWat wilt u weten?"
      }
    ],
    defaultResponse: "Ik weet niet zeker of ik begrijp. 🤔\n\nVraag me over quiz, vragenlijsten of evenementen!\n\nOf klik op 'Praat met team' voor menselijke hulp!",
    systemMessages: {
      escalating: "🔄 Uw gesprek wordt overgedragen aan een teamlid...",
      waitingAdmin: "⏳ Een HugoQuiz-teamlid zal zeer snel reageren.",
      adminJoined: "👤 Een HugoQuiz-teamlid reageert nu.",
      backToBot: "🤖 U chat nu met de automatische assistent.",
      conversationClosed: "✅ Dit gesprek is gesloten."
    }
  }
}

// Pattern matching function
const findResponse = (message, lang) => {
  const kb = KNOWLEDGE_BASE[lang] || KNOWLEDGE_BASE.en
  const lowerMessage = message.toLowerCase()
  
  for (const pattern of kb.patterns) {
    const matches = pattern.keywords.some(keyword => 
      lowerMessage.includes(keyword.toLowerCase())
    )
    if (matches) {
      return pattern.response
    }
  }
  
  return kb.defaultResponse
}

// Get system messages for language
const getSystemMessage = (key, lang) => {
  const kb = KNOWLEDGE_BASE[lang] || KNOWLEDGE_BASE.en
  return kb.systemMessages?.[key] || KNOWLEDGE_BASE.en.systemMessages[key]
}

export default function Chatbot() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [conversation, setConversation] = useState(null)
  const [chatMode, setChatMode] = useState('bot') // 'bot' or 'human'
  const [status, setStatus] = useState('open') // 'open', 'waiting_admin', 'closed'
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const unsubscribeMessagesRef = useRef(null)
  const unsubscribeConvRef = useRef(null)
  
  const lang = i18n.language?.split('-')[0] || 'fr'
  
  // Hide chatbot on public guest pages
  const isPublicGuestPage = () => {
    const path = window.location.pathname
    if (path.includes('/planning/') && path.match(/\/event\/[^/]+\/planning\/[^/]+/)) {
      return true
    }
    if (path.match(/\/event\/[^/]+$/) && !path.includes('/edit')) {
      return true
    }
    if (path.includes('/guestbook')) {
      return true
    }
    return false
  }
  
  if (isPublicGuestPage()) {
    return null
  }
  
  // Initialize conversation when opened and user is logged in
  useEffect(() => {
    if (isOpen && user) {
      initializeConversation()
    }
    
    return () => {
      if (unsubscribeMessagesRef.current) {
        unsubscribeMessagesRef.current()
      }
      if (unsubscribeConvRef.current) {
        unsubscribeConvRef.current()
      }
    }
  }, [isOpen, user])
  
  const initializeConversation = async () => {
    if (!user) {
      // For non-logged users, use local messages only
      if (messages.length === 0) {
        const greeting = KNOWLEDGE_BASE[lang]?.patterns.find(p => 
          p.keywords.includes('bonjour') || p.keywords.includes('hello') || p.keywords.includes('hallo')
        )?.response || t('chatbot.greeting')
        setMessages([{ type: 'bot', text: greeting }])
      }
      return
    }
    
    try {
      const conv = await getOrCreateConversation(
        user.uid,
        user.displayName || user.email?.split('@')[0],
        user.email
      )
      
      setConversation(conv)
      setChatMode(conv.chatMode || 'bot')
      setStatus(conv.status || 'open')
      
      // Subscribe to messages
      unsubscribeMessagesRef.current = subscribeToChatMessages(conv.id, (msgs) => {
        const formattedMessages = msgs.map(m => ({
          id: m.id,
          type: m.sender,
          text: m.text,
          timestamp: m.timestamp
        }))
        
        // Add greeting if no messages
        if (formattedMessages.length === 0) {
          const greeting = KNOWLEDGE_BASE[lang]?.patterns.find(p => 
            p.keywords.includes('bonjour') || p.keywords.includes('hello') || p.keywords.includes('hallo')
          )?.response || t('chatbot.greeting')
          setMessages([{ type: 'bot', text: greeting }])
        } else {
          setMessages(formattedMessages)
        }
        
        // Mark messages as read by user
        markMessagesAsRead(conv.id, 'user')
      })
      
      // Subscribe to conversation changes
      unsubscribeConvRef.current = subscribeToConversation(conv.id, (updatedConv) => {
        setChatMode(updatedConv.chatMode || 'bot')
        setStatus(updatedConv.status || 'open')
        
        // Show system message when mode changes
        if (updatedConv.chatMode !== chatMode) {
          if (updatedConv.chatMode === 'human' && updatedConv.status === 'waiting_admin') {
            // Admin hasn't joined yet
          } else if (updatedConv.chatMode === 'human') {
            // Admin joined
          } else if (updatedConv.chatMode === 'bot') {
            // Back to bot
          }
        }
      })
    } catch (error) {
      console.error('Error initializing conversation:', error)
      // Fallback to local-only mode
      if (messages.length === 0) {
        const greeting = KNOWLEDGE_BASE[lang]?.patterns.find(p => 
          p.keywords.includes('bonjour') || p.keywords.includes('hello')
        )?.response || t('chatbot.greeting')
        setMessages([{ type: 'bot', text: greeting }])
      }
    }
  }
  
  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])
  
  // Add initial greeting for non-logged users
  useEffect(() => {
    if (isOpen && !user && messages.length === 0) {
      const greeting = KNOWLEDGE_BASE[lang]?.patterns.find(p => 
        p.keywords.includes('bonjour') || p.keywords.includes('hello') || p.keywords.includes('hallo')
      )?.response || t('chatbot.greeting')
      setMessages([{ type: 'bot', text: greeting }])
    }
  }, [isOpen, user])
  
  const handleSend = async () => {
    if (!inputValue.trim()) return
    
    const userMessage = inputValue.trim()
    setInputValue('')
    
    // For non-logged users, handle locally
    if (!user || !conversation) {
      setMessages(prev => [...prev, { type: 'user', text: userMessage }])
      setIsTyping(true)
      
      setTimeout(() => {
        const response = findResponse(userMessage, lang)
        setMessages(prev => [...prev, { type: 'bot', text: response }])
        setIsTyping(false)
      }, 500 + Math.random() * 1000)
      return
    }
    
    // Add message to Firebase
    try {
      await addChatMessage(conversation.id, {
        text: userMessage,
        sender: 'user',
        senderName: user.displayName || user.email
      })
      
      // If in bot mode, generate response
      if (chatMode === 'bot') {
        // Check if should escalate
        if (shouldEscalateMessage(userMessage, lang)) {
          // Escalate to human
          await handleEscalate()
          return
        }
        
        setIsTyping(true)
        
        setTimeout(async () => {
          const response = findResponse(userMessage, lang)
          await addChatMessage(conversation.id, {
            text: response,
            sender: 'bot'
          })
          
          // Increment bot response count
          const { shouldEscalate } = await incrementBotResponseCount(conversation.id)
          
          if (shouldEscalate) {
            // Auto-escalate after too many bot responses
            setTimeout(() => {
              addChatMessage(conversation.id, {
                text: lang === 'fr' 
                  ? "🤔 Il semble que je n'arrive pas à résoudre votre problème. Souhaitez-vous parler à un membre de notre équipe ?"
                  : "🤔 It seems I'm not able to solve your issue. Would you like to talk to a team member?",
                sender: 'bot'
              })
            }, 500)
          }
          
          setIsTyping(false)
        }, 500 + Math.random() * 1000)
      }
      // If in human mode, just wait for admin response
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }
  
  const handleEscalate = async () => {
    if (!conversation) return
    
    try {
      // Add system message
      await addChatMessage(conversation.id, {
        text: getSystemMessage('escalating', lang),
        sender: 'bot'
      })
      
      // Escalate the conversation
      await escalateToHuman(conversation.id)
      
      // Add waiting message
      setTimeout(async () => {
        await addChatMessage(conversation.id, {
          text: getSystemMessage('waitingAdmin', lang),
          sender: 'bot'
        })
      }, 500)
    } catch (error) {
      console.error('Error escalating:', error)
    }
  }
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }
  
  // Suggestions localisées
  const getSuggestions = () => {
    if (lang === 'fr') {
      return [
        '📝 Créer un quiz',
        '🎉 Créer un événement',
        '👥 Liste d\'invités',
        '🎁 Liste de cadeaux',
        '📅 Programme',
        '🍽️ Menu',
        '🗺️ Plan de salle',
        '📱 Scanner QR',
        '📖 Livre d\'or',
        '✨ Fonctionnalités'
      ]
    }
    if (lang === 'de') {
      return [
        '📝 Quiz erstellen',
        '🎉 Veranstaltung',
        '👥 Gästeliste',
        '🎁 Geschenkliste',
        '🗺️ Sitzplan',
        '📱 QR-Scanner'
      ]
    }
    if (lang === 'nl') {
      return [
        '📝 Quiz maken',
        '🎉 Evenement',
        '👥 Gastenlijst',
        '🎁 Cadeaulijst',
        '🗺️ Tafelschikking',
        '📱 QR-scanner'
      ]
    }
    return [
      '📝 Create a quiz',
      '🎉 Create event',
      '👥 Guest list',
      '🎁 Gift registry',
      '📅 Program',
      '🍽️ Menu',
      '🗺️ Seating plan',
      '📱 QR Scanner',
      '📖 Guestbook',
      '✨ Features'
    ]
  }
  
  const suggestions = getSuggestions()
  
  // Get status indicator
  const getStatusIndicator = () => {
    if (status === 'waiting_admin') {
      return {
        text: lang === 'fr' ? 'En attente de l\'équipe...' : 'Waiting for team...',
        color: 'text-yellow-400',
        pulse: true
      }
    }
    if (chatMode === 'human') {
      return {
        text: lang === 'fr' ? 'Équipe HugoQuiz' : 'HugoQuiz Team',
        color: 'text-green-400',
        pulse: false
      }
    }
    return {
      text: lang === 'fr' ? 'En ligne' : 'Online',
      color: 'text-green-400',
      pulse: false
    }
  }
  
  const statusIndicator = getStatusIndicator()
  
  return (
    <>
      {/* Chat Button */}
      <button
        data-tutorial="chatbot"
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-[900] w-14 h-14 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center ${
          isOpen ? 'hidden' : ''
        }`}
      >
        <FiMessageCircle size={24} />
      </button>
      
      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-[1000] w-96 max-w-[calc(100vw-2rem)] h-[550px] max-h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-up">
          {/* Header */}
          <div className={`${chatMode === 'human' ? 'bg-gradient-to-r from-green-600 to-teal-600' : 'bg-gradient-to-r from-purple-600 to-pink-600'} text-white p-4 flex items-center justify-between transition-colors duration-300`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                {chatMode === 'human' ? <FiUsers size={20} /> : <FiHelpCircle size={20} />}
              </div>
              <div>
                <h3 className="font-bold">{chatMode === 'human' ? (lang === 'fr' ? 'Support HugoQuiz' : 'HugoQuiz Support') : t('chatbot.title')}</h3>
                <p className={`text-xs ${statusIndicator.color} flex items-center gap-1`}>
                  {statusIndicator.pulse && <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />}
                  {statusIndicator.text}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-white/20 rounded-lg"
            >
              <FiX size={20} />
            </button>
          </div>
          
          {/* Human mode banner */}
          {chatMode === 'human' && (
            <div className="bg-green-50 border-b border-green-200 px-4 py-2 flex items-center gap-2">
              <FiCheckCircle className="text-green-600" />
              <span className="text-sm text-green-800">
                {status === 'waiting_admin' 
                  ? (lang === 'fr' ? 'Un membre de l\'équipe va vous répondre...' : 'A team member will respond...')
                  : (lang === 'fr' ? 'Vous parlez avec un membre de l\'équipe' : 'You\'re talking with a team member')
                }
              </span>
            </div>
          )}
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((msg, idx) => (
              <div
                key={msg.id || idx}
                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.type === 'admin' && (
                  <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white mr-2 flex-shrink-0">
                    <FiUser size={14} />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    msg.type === 'user'
                      ? 'bg-purple-600 text-white rounded-br-none'
                      : msg.type === 'admin'
                      ? 'bg-green-600 text-white rounded-bl-none'
                      : 'bg-white text-gray-800 shadow-sm rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm">{msg.text}</p>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-800 shadow-sm rounded-2xl rounded-bl-none px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          {/* Suggestions - only show in bot mode and at start */}
          {chatMode === 'bot' && messages.length <= 2 && Array.isArray(suggestions) && (
            <div className="px-4 py-2 bg-white border-t">
              <p className="text-xs text-gray-500 mb-2">
                {lang === 'fr' ? 'Suggestions rapides :' : lang === 'de' ? 'Schnelle Vorschläge:' : lang === 'nl' ? 'Snelle suggesties:' : 'Quick suggestions:'}
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {suggestions.slice(0, 6).map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInputValue(suggestion)
                      setTimeout(() => handleSend(), 100)
                    }}
                    className="flex-shrink-0 px-3 py-1.5 bg-purple-50 text-purple-600 rounded-full text-xs hover:bg-purple-100 transition-colors whitespace-nowrap"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Talk to human button - only in bot mode */}
          {chatMode === 'bot' && user && conversation && (
            <div className="px-4 py-2 bg-white border-t">
              <button
                onClick={handleEscalate}
                className="w-full py-2 px-4 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg text-sm font-medium hover:from-green-600 hover:to-teal-600 transition-all flex items-center justify-center gap-2"
              >
                <FiUsers size={16} />
                {lang === 'fr' ? 'Parler à un membre de l\'équipe' : lang === 'de' ? 'Mit Team sprechen' : lang === 'nl' ? 'Praat met team' : 'Talk to a team member'}
              </button>
            </div>
          )}
          
          {/* Input */}
          <div className="p-4 bg-white border-t">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={status === 'closed' 
                  ? (lang === 'fr' ? 'Conversation terminée' : 'Conversation ended')
                  : t('chatbot.placeholder')
                }
                disabled={status === 'closed'}
                className="flex-1 px-4 py-2 border rounded-full focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || status === 'closed'}
                className="p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:hover:bg-purple-600"
              >
                <FiSend size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Animations */}
      <style>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  )
}
