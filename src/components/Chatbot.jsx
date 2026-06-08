import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FiMessageCircle, FiX, FiSend, FiUser, FiHelpCircle } from 'react-icons/fi'

// Base de connaissances complète du chatbot
const KNOWLEDGE_BASE = {
  fr: {
    patterns: [
      // ==================== QUIZ ====================
      {
        keywords: ['créer', 'quiz', 'nouveau quiz'],
        response: "📝 **Créer un quiz** :\n\n1. Tableau de bord → '+ Créer un quiz'\n2. Ajoutez titre et description\n3. Ajoutez vos questions (QCM, Vrai/Faux, Puzzle...)\n4. Définissez le temps par question (5-120 sec)\n5. Ajoutez des images si souhaité\n6. Publiez !\n\n💡 Astuce : Utilisez le raccourci N+Q pour créer rapidement."
      },
      {
        keywords: ['question', 'type', 'qcm', 'vrai', 'faux', 'puzzle'],
        response: "📋 **Types de questions disponibles** :\n\n• **QCM** : 2 à 6 réponses possibles, une seule correcte\n• **Vrai/Faux** : Question binaire simple\n• **Puzzle** : Image découpée à reconstituer\n\nChaque type peut avoir :\n- Une image illustrative\n- Un temps limite personnalisé\n- Des points configurables"
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
        response: "🎮 **Mode Live (temps réel)** :\n\n**Côté hôte** :\n1. Quiz → 'Lancer en mode Live'\n2. Un code de session s'affiche\n3. Attendez les joueurs\n4. Lancez quand prêt\n5. Tous voient la même question en même temps\n\n**Côté joueurs** :\n1. Entrez le code de session\n2. Attendez le lancement\n3. Répondez aux questions synchronisées"
      },
      {
        keywords: ['réponse', 'voir', 'statistique', 'analyse'],
        response: "📊 **Statistiques des réponses** :\n\n1. Tableau de bord → Quiz → 'Voir les réponses'\n\n**Vous verrez** :\n• Nombre de parties jouées\n• Score moyen\n• Question la plus réussie/ratée\n• Détail par participant\n• Graphiques de répartition"
      },

      // ==================== QUESTIONNAIRES ====================
      {
        keywords: ['questionnaire', 'créer', 'sondage', 'formulaire'],
        response: "📋 **Créer un questionnaire** :\n\n1. Tableau de bord → '+ Créer questionnaire'\n2. Ajoutez titre et description\n3. Ajoutez vos questions :\n   • Texte libre\n   • Choix unique\n   • Choix multiple\n   • Échelle de satisfaction\n4. Publiez et partagez le lien !\n\n💡 Idéal pour sondages, feedback, inscriptions..."
      },
      {
        keywords: ['questionnaire', 'type', 'question', 'champ'],
        response: "📝 **Types de questions (questionnaire)** :\n\n• **Texte libre** : Réponse ouverte\n• **Choix unique** : Une seule réponse parmi plusieurs\n• **Choix multiple** : Plusieurs réponses possibles\n• **Échelle** : Note de 1 à 5 ou 1 à 10\n• **Email** : Validation format email\n• **Nombre** : Réponse numérique uniquement"
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

      // ==================== ÉVÉNEMENTS ====================
      {
        keywords: ['événement', 'créer', 'nouveau', 'fête'],
        response: "🎉 **Créer un événement** :\n\n1. Tableau de bord → '+ Créer événement'\n2. Choisissez le type :\n   • Mariage 💒\n   • Anniversaire 🎂\n   • Fête/Autre 🎊\n3. Remplissez : titre, date, lieu\n4. Ajoutez l'image d'invitation\n5. Créez !\n\n💡 Raccourci : N+E pour créer rapidement"
      },
      {
        keywords: ['mariage', 'wedding'],
        response: "💒 **Événement Mariage** :\n\n**Fonctionnalités incluses** :\n• Liste d'invités avec RSVP\n• Plan de salle interactif\n• QR codes pour validation présence\n• Livre d'or numérique\n• Galerie photos\n• Export Excel des invités\n\n**Personnalisation** :\n• Image d'invitation\n• Message personnalisé\n• Informations pratiques"
      },
      {
        keywords: ['anniversaire', 'birthday'],
        response: "🎂 **Événement Anniversaire** :\n\n**Fonctionnalités** :\n• Liste d'invités\n• Plan de salle (optionnel)\n• QR codes de présence\n• Livre d'or pour messages\n• Partage facile\n\n**Idéal pour** :\n• Anniversaires d'enfants\n• Anniversaires surprise\n• Fêtes thématiques"
      },
      {
        keywords: ['invité', 'ajouter', 'guest', 'liste'],
        response: "👥 **Gestion des invités** :\n\n**Ajouter un invité** :\n1. Événement → 'Gestion des invités'\n2. '+ Ajouter un invité'\n3. Remplissez :\n   • Prénom et nom\n   • Type : Single ou Couple\n   • Relation (famille, ami, collègue...)\n   • Table assignée (optionnel)\n4. Sauvegardez\n\n**Actions possibles** :\n• Modifier, supprimer\n• Changer le statut (invité/confirmé/présent)\n• Assigner une table"
      },
      {
        keywords: ['statut', 'présent', 'absent', 'confirmé'],
        response: "📍 **Statuts des invités** :\n\n• **Invité** : Invitation envoyée\n• **Confirmé** : A confirmé sa venue\n• **Présent** : Vérifié sur place (QR)\n• **Absent** : Ne viendra pas\n\n**Changer le statut** :\n1. Liste des invités\n2. Cliquez sur le statut actuel\n3. Sélectionnez le nouveau statut\n\nOu utilisez le Scanner QR le jour J !"
      },
      {
        keywords: ['qr', 'code', 'scanner', 'présence'],
        response: "📱 **QR Codes & Scanner** :\n\n**Génération** :\n• Chaque invité a un QR code unique\n• Téléchargez le PDF d'invitation personnalisé\n• Le QR code est inclus dans le PDF\n\n**Scanner le jour J** :\n1. Événement → 'Scanner QR'\n2. Autorisez la caméra\n3. Scannez le code de l'invité\n4. Statut → 'Présent' automatiquement\n\n💡 Fonctionne aussi sans connexion !"
      },
      {
        keywords: ['table', 'plan', 'salle', 'placement'],
        response: "🪑 **Plan de salle interactif** :\n\n**Créer des tables** :\n1. Événement → 'Plan de salle'\n2. '+ Ajouter table'\n3. Nom, capacité, forme, couleur\n\n**Placement des invités** :\n• Glissez-déposez les invités sur les tables\n• Visualisez la capacité restante\n• Réorganisez librement\n\n**Formes disponibles** :\n• Ronde, Carrée, Rectangulaire, Ovale"
      },
      {
        keywords: ['livre', 'or', 'guestbook', 'message', 'souvenir'],
        response: "📖 **Livre d'or numérique** :\n\n**Pour les invités** :\n1. Lien du livre d'or partagé\n2. Écrivez un message\n3. Ajoutez une photo (optionnel)\n4. Envoyez !\n\n**Pour l'organisateur** :\n• Voir tous les messages\n• Modérer si nécessaire\n• Garder de précieux souvenirs\n\n💡 Partagez le lien pendant l'événement !"
      },
      {
        keywords: ['excel', 'export', 'télécharger', 'csv'],
        response: "📊 **Export Excel** :\n\n1. Événement → 'Gestion des invités'\n2. Cliquez 'Export Excel'\n\n**Le fichier contient** :\n• Liste complète des invités\n• Prénom, nom, relation\n• Type (single/couple)\n• Table assignée\n• Statut actuel\n• Résumé statistique\n\nFormat : .xlsx compatible Excel, Google Sheets..."
      },
      {
        keywords: ['pdf', 'invitation', 'télécharger', 'imprimer'],
        response: "📄 **PDF d'invitation** :\n\n1. Gestion des invités\n2. Sur un invité → 'Télécharger PDF'\n\n**Le PDF contient** :\n• Image d'invitation personnalisée\n• Nom de l'invité\n• Détails de l'événement\n• QR code unique\n\n💡 Imprimez ou envoyez par email !"
      },
      {
        keywords: ['photo', 'galerie', 'image', 'slideshow'],
        response: "📸 **Galerie photos** :\n\n• Ajoutez des photos à votre événement\n• Slideshow automatique\n• Les invités peuvent contribuer\n• Téléchargement des photos possible\n\nTaille max par photo : 60 Mo"
      },

      // ==================== GÉNÉRAL ====================
      {
        keywords: ['langue', 'language', 'changer', 'français', 'anglais'],
        response: "🌍 **Changer la langue** :\n\n1. Barre latérale → Sélecteur de langue\n2. Ou : Paramètres → Langue\n\n**15 langues disponibles** :\n🇫🇷 Français, 🇬🇧 English, 🇩🇪 Deutsch, 🇪🇸 Español, 🇮🇹 Italiano, 🇵🇹 Português, 🇳🇱 Nederlands, 🇵🇱 Polski, 🇷🇴 Română, 🇨🇿 Čeština, 🇸🇪 Svenska, 🇩🇰 Dansk, 🇫🇮 Suomi, 🇬🇷 Ελληνικά, 🇭🇺 Magyar"
      },
      {
        keywords: ['raccourci', 'clavier', 'keyboard', 'rapide'],
        response: "⌨️ **Raccourcis clavier** :\n\n**Navigation** :\n• G + H → Accueil\n• G + D → Tableau de bord\n• G + S → Paramètres\n\n**Création** :\n• N + Q → Nouveau quiz\n• N + E → Nouvel événement\n• N + F → Nouveau questionnaire\n\n**Autres** :\n• / → Rechercher\n• ? → Afficher cette aide\n\n💡 Appuyez sur ? à tout moment !"
      },
      {
        keywords: ['tutoriel', 'guide', 'aide', 'apprendre'],
        response: "📚 **Tutoriel interactif** :\n\n**Lancer le tutoriel** :\n• Paramètres → 'Relancer le tutoriel'\n• S'affiche automatiquement pour les nouveaux\n\n**Le tutoriel couvre** :\n• Navigation dans l'interface\n• Création de quiz\n• Création d'événements\n• Accès aux paramètres\n• Utilisation du chatbot"
      },
      {
        keywords: ['compte', 'profil', 'paramètre', 'email'],
        response: "⚙️ **Paramètres du compte** :\n\n1. Cliquez sur 'Paramètres' dans le menu\n\n**Vous pouvez** :\n• Modifier votre email\n• Changer la langue\n• Relancer le tutoriel\n• Voir vos informations\n\n💡 Raccourci : G+S"
      },
      {
        keywords: ['supprimer', 'compte', 'désinscription'],
        response: "🗑️ **Supprimer votre compte** :\n\nContactez l'administrateur pour supprimer votre compte.\n\n⚠️ Cette action supprimera :\n• Tous vos quiz\n• Tous vos questionnaires\n• Tous vos événements\n• Toutes les données associées"
      },
      {
        keywords: ['prix', 'tarif', 'gratuit', 'payant', 'abonnement'],
        response: "💰 **Tarification** :\n\nHugoQuiz est **100% gratuit** ! 🎉\n\n**Inclus gratuitement** :\n• Quiz illimités\n• Questionnaires illimités\n• Événements illimités\n• Toutes les fonctionnalités\n• 15 langues\n\nAucune carte bancaire requise !"
      },
      {
        keywords: ['sécurité', 'données', 'confidentialité', 'rgpd'],
        response: "🔒 **Sécurité & Confidentialité** :\n\n• Données stockées sur Firebase (Google Cloud)\n• Connexion sécurisée HTTPS\n• Mot de passe chiffré\n• Vos données vous appartiennent\n• Conforme RGPD\n\nVos données ne sont jamais vendues !"
      },
      {
        keywords: ['problème', 'bug', 'erreur', 'marche pas'],
        response: "🔧 **Résolution de problèmes** :\n\n**Essayez** :\n1. Rechargez la page (F5)\n2. Videz le cache du navigateur\n3. Essayez un autre navigateur\n4. Vérifiez votre connexion internet\n\n**Toujours bloqué ?**\n• Décrivez le problème en détail\n• Notez le message d'erreur\n• Indiquez votre navigateur"
      },
      {
        keywords: ['navigateur', 'compatible', 'chrome', 'firefox', 'safari'],
        response: "🌐 **Navigateurs compatibles** :\n\n✅ Chrome (recommandé)\n✅ Firefox\n✅ Safari\n✅ Edge\n✅ Opera\n\n📱 Fonctionne aussi sur mobile !\n\n💡 Utilisez un navigateur à jour pour la meilleure expérience."
      },
      {
        keywords: ['mobile', 'téléphone', 'tablette', 'responsive'],
        response: "📱 **Version mobile** :\n\nHugoQuiz est 100% responsive !\n\n• Fonctionne sur smartphone\n• Fonctionne sur tablette\n• Interface adaptée\n• Scanner QR natif\n\n💡 Ajoutez le site à votre écran d'accueil pour un accès rapide !"
      },
      {
        keywords: ['bonjour', 'salut', 'hello', 'hi', 'coucou', 'bonsoir'],
        response: "Bonjour ! 👋 Je suis l'assistant HugoQuiz.\n\n**Je peux vous aider avec** :\n\n📝 **Quiz** : création, partage, classement, mode live...\n📋 **Questionnaires** : sondages, formulaires, résultats...\n🎉 **Événements** : invités, QR codes, plan de salle, livre d'or...\n\nQue souhaitez-vous savoir ?"
      },
      {
        keywords: ['merci', 'thanks', 'super', 'génial', 'parfait'],
        response: "Avec plaisir ! 😊\n\nN'hésitez pas si vous avez d'autres questions.\n\nBonne utilisation de HugoQuiz ! 🎉"
      },
      {
        keywords: ['fonctionnalité', 'feature', 'option', 'possibilité'],
        response: "✨ **Fonctionnalités HugoQuiz** :\n\n**Quiz** :\n• QCM, Vrai/Faux, Puzzle\n• Minuteur, scores, classement\n• Mode live synchronisé\n• Mode révision\n\n**Questionnaires** :\n• Texte, choix, échelles\n• Résultats graphiques\n• Export CSV\n\n**Événements** :\n• Liste d'invités\n• QR codes & scanner\n• Plan de salle drag & drop\n• Livre d'or\n• Export Excel\n• PDF personnalisés"
      }
    ],
    defaultResponse: "Je ne suis pas sûr de comprendre. 🤔\n\n**Essayez de me demander** :\n\n📝 Quiz :\n• Comment créer un quiz ?\n• Comment voir le classement ?\n\n📋 Questionnaires :\n• Comment créer un questionnaire ?\n• Comment voir les réponses ?\n\n🎉 Événements :\n• Comment ajouter des invités ?\n• Comment fonctionne le QR code ?\n• Comment créer le plan de salle ?"
  },
  en: {
    patterns: [
      // QUIZ
      {
        keywords: ['create', 'quiz', 'new'],
        response: "📝 **Create a quiz**:\n\n1. Dashboard → '+ Create quiz'\n2. Add title and description\n3. Add questions (MCQ, True/False, Puzzle...)\n4. Set time per question (5-120 sec)\n5. Add images if desired\n6. Publish!\n\n💡 Tip: Use N+Q shortcut for quick creation."
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
      // QUESTIONNAIRES
      {
        keywords: ['questionnaire', 'create', 'survey', 'form'],
        response: "📋 **Create a questionnaire**:\n\n1. Dashboard → '+ Create questionnaire'\n2. Add title and description\n3. Add questions:\n   • Free text\n   • Single choice\n   • Multiple choice\n   • Satisfaction scale\n4. Publish and share!\n\n💡 Ideal for surveys, feedback, registrations..."
      },
      // EVENTS
      {
        keywords: ['event', 'create', 'party', 'wedding', 'birthday'],
        response: "🎉 **Create an event**:\n\n1. Dashboard → '+ Create event'\n2. Choose type: Wedding 💒, Birthday 🎂, Party 🎊\n3. Fill in: title, date, location\n4. Add invitation image\n5. Create!\n\n**Features**: Guest list, QR codes, seating plan, guestbook, Excel export"
      },
      {
        keywords: ['guest', 'add', 'invite', 'list'],
        response: "👥 **Guest management**:\n\n1. Event → 'Guest Management'\n2. '+ Add guest'\n3. Fill in: name, type (Single/Couple), relation\n4. Assign table (optional)\n5. Save\n\n**Actions**: Edit, delete, change status, scan QR"
      },
      {
        keywords: ['qr', 'code', 'scanner', 'presence'],
        response: "📱 **QR Codes & Scanner**:\n\n**Generation**:\n• Each guest has a unique QR code\n• Download personalized PDF invitation\n\n**Scan on event day**:\n1. Event → 'QR Scanner'\n2. Allow camera\n3. Scan guest's code\n4. Status → 'Present' automatically"
      },
      {
        keywords: ['table', 'seating', 'plan', 'floor'],
        response: "🪑 **Interactive seating plan**:\n\n**Create tables**:\n1. Event → 'Seating plan'\n2. '+ Add table'\n3. Name, capacity, shape, color\n\n**Guest placement**:\n• Drag and drop guests onto tables\n• Visualize remaining capacity\n• Reorganize freely"
      },
      {
        keywords: ['guestbook', 'message', 'memory'],
        response: "📖 **Digital guestbook**:\n\n**For guests**:\n1. Shared guestbook link\n2. Write a message\n3. Add photo (optional)\n4. Send!\n\n**For organizer**:\n• View all messages\n• Moderate if necessary\n• Keep precious memories"
      },
      {
        keywords: ['excel', 'export', 'download', 'csv'],
        response: "📊 **Excel export**:\n\n1. Event → 'Guest Management'\n2. Click 'Export Excel'\n\n**File contains**:\n• Complete guest list\n• Name, relation, type\n• Assigned table\n• Current status\n• Statistical summary"
      },
      // GENERAL
      {
        keywords: ['language', 'change', 'french', 'english'],
        response: "🌍 **Change language**:\n\n1. Sidebar → Language selector\n2. Or: Settings → Language\n\n**15 languages available**:\n🇫🇷 🇬🇧 🇩🇪 🇪🇸 🇮🇹 🇵🇹 🇳🇱 🇵🇱 🇷🇴 🇨🇿 🇸🇪 🇩🇰 🇫🇮 🇬🇷 🇭🇺"
      },
      {
        keywords: ['shortcut', 'keyboard', 'quick'],
        response: "⌨️ **Keyboard shortcuts**:\n\n**Navigation**:\n• G + H → Home\n• G + D → Dashboard\n• G + S → Settings\n\n**Creation**:\n• N + Q → New quiz\n• N + E → New event\n• N + F → New questionnaire\n\n**Other**:\n• / → Search\n• ? → Show help"
      },
      {
        keywords: ['hello', 'hi', 'hey', 'good'],
        response: "Hello! 👋 I'm the HugoQuiz assistant.\n\n**I can help with**:\n\n📝 **Quizzes**: creation, sharing, leaderboard, live mode...\n📋 **Questionnaires**: surveys, forms, results...\n🎉 **Events**: guests, QR codes, seating plan, guestbook...\n\nWhat would you like to know?"
      },
      {
        keywords: ['thanks', 'thank', 'great', 'perfect'],
        response: "You're welcome! 😊\n\nFeel free to ask if you have more questions.\n\nEnjoy HugoQuiz! 🎉"
      },
      {
        keywords: ['feature', 'option', 'possibility'],
        response: "✨ **HugoQuiz features**:\n\n**Quizzes**:\n• MCQ, True/False, Puzzle\n• Timer, scores, leaderboard\n• Live synchronized mode\n• Review mode\n\n**Questionnaires**:\n• Text, choices, scales\n• Graphic results\n• CSV export\n\n**Events**:\n• Guest list\n• QR codes & scanner\n• Drag & drop seating plan\n• Guestbook\n• Excel export\n• Custom PDFs"
      },
      {
        keywords: ['problem', 'bug', 'error', 'not working'],
        response: "🔧 **Troubleshooting**:\n\n**Try**:\n1. Refresh the page (F5)\n2. Clear browser cache\n3. Try another browser\n4. Check your internet connection\n\n**Still stuck?**\n• Describe the problem in detail\n• Note the error message\n• Indicate your browser"
      },
      {
        keywords: ['price', 'cost', 'free', 'subscription'],
        response: "💰 **Pricing**:\n\nHugoQuiz is **100% free**! 🎉\n\n**Included for free**:\n• Unlimited quizzes\n• Unlimited questionnaires\n• Unlimited events\n• All features\n• 15 languages\n\nNo credit card required!"
      }
    ],
    defaultResponse: "I'm not sure I understand. 🤔\n\n**Try asking me**:\n\n📝 Quizzes:\n• How to create a quiz?\n• How to see the leaderboard?\n\n📋 Questionnaires:\n• How to create a questionnaire?\n• How to see responses?\n\n🎉 Events:\n• How to add guests?\n• How does QR code work?\n• How to create seating plan?"
  }
}

// Simple pattern matching
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

export default function Chatbot() {
  const { t, i18n } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  
  // Hide chatbot on public guest pages
  const isPublicGuestPage = () => {
    const path = window.location.pathname
    // Hide on public planning view pages (for guests)
    if (path.includes('/planning/') && path.match(/\/event\/[^/]+\/planning\/[^/]+/)) {
      return true
    }
    // Hide on public event view pages (for guests)
    if (path.match(/\/event\/[^/]+$/) && !path.includes('/edit')) {
      return true
    }
    return false
  }
  
  // Don't render on public guest pages
  if (isPublicGuestPage()) {
    return null
  }
  
  // Add initial greeting when opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const lang = i18n.language?.split('-')[0] || 'fr'
      const greeting = KNOWLEDGE_BASE[lang]?.patterns.find(p => 
        p.keywords.includes('bonjour') || p.keywords.includes('hello')
      )?.response || t('chatbot.greeting')
      
      setMessages([{ type: 'bot', text: greeting }])
    }
  }, [isOpen])
  
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
  
  const handleSend = () => {
    if (!inputValue.trim()) return
    
    const userMessage = inputValue.trim()
    setInputValue('')
    setMessages(prev => [...prev, { type: 'user', text: userMessage }])
    
    // Simulate typing
    setIsTyping(true)
    
    setTimeout(() => {
      const lang = i18n.language?.split('-')[0] || 'fr'
      const response = findResponse(userMessage, lang)
      setMessages(prev => [...prev, { type: 'bot', text: response }])
      setIsTyping(false)
    }, 500 + Math.random() * 1000)
  }
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }
  
  // Suggestions localisées
  const getSuggestions = () => {
    const lang = i18n.language?.split('-')[0] || 'fr'
    if (lang === 'fr') {
      return [
        '📝 Créer un quiz',
        '🎉 Créer un événement',
        '📋 Questionnaires',
        '👥 Ajouter des invités',
        '📱 Scanner QR',
        '🪑 Plan de salle',
        '⌨️ Raccourcis clavier',
        '✨ Fonctionnalités'
      ]
    }
    return [
      '📝 Create a quiz',
      '🎉 Create event',
      '📋 Questionnaires',
      '👥 Add guests',
      '📱 QR Scanner',
      '🪑 Seating plan',
      '⌨️ Shortcuts',
      '✨ Features'
    ]
  }
  
  const suggestions = getSuggestions()
  
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
        <div className="fixed bottom-6 right-6 z-[1000] w-96 max-w-[calc(100vw-2rem)] h-[500px] max-h-[80vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <FiHelpCircle size={20} />
              </div>
              <div>
                <h3 className="font-bold">{t('chatbot.title')}</h3>
                <p className="text-xs text-white/70">En ligne</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-white/20 rounded-lg"
            >
              <FiX size={20} />
            </button>
          </div>
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    msg.type === 'user'
                      ? 'bg-purple-600 text-white rounded-br-none'
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
          
          {/* Suggestions */}
          {messages.length <= 1 && Array.isArray(suggestions) && (
            <div className="px-4 py-2 bg-white border-t">
              <p className="text-xs text-gray-500 mb-2">
                {i18n.language?.startsWith('fr') ? 'Suggestions rapides :' : 'Quick suggestions:'}
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {suggestions.map((suggestion, idx) => (
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
          
          {/* Input */}
          <div className="p-4 bg-white border-t">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('chatbot.placeholder')}
                className="flex-1 px-4 py-2 border rounded-full focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim()}
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
