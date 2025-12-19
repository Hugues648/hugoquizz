# HugoQuiz 🎯

Application web complète pour créer et jouer à des quiz interactifs (type Kahoot) et des questionnaires conditionnels.

## 🚀 Stack Technique

- **Frontend**: React 18 + Vite
- **Backend**: Firebase (Authentication, Firestore, Hosting)
- **Styling**: Tailwind CSS
- **Langage**: JavaScript

## 📁 Structure du Projet

```
HugoQuiz/
├── public/                     # Fichiers statiques
├── src/
│   ├── components/             # Composants réutilisables
│   │   ├── AdminRoute.jsx      # Protection des routes admin
│   │   ├── Layout.jsx          # Layout principal avec sidebar
│   │   ├── LoadingSpinner.jsx  # Spinner de chargement
│   │   └── ProtectedRoute.jsx  # Protection des routes utilisateur
│   │
│   ├── config/
│   │   └── firebase.js         # Configuration Firebase
│   │
│   ├── contexts/
│   │   └── AuthContext.jsx     # Contexte d'authentification
│   │
│   ├── pages/
│   │   ├── Home.jsx            # Page d'accueil
│   │   ├── Login.jsx           # Connexion
│   │   ├── Register.jsx        # Inscription
│   │   ├── PendingValidation.jsx # En attente de validation
│   │   ├── Dashboard.jsx       # Tableau de bord utilisateur
│   │   ├── AdminPanel.jsx      # Panel d'administration
│   │   ├── CreateQuiz.jsx      # Créer un quiz
│   │   ├── EditQuiz.jsx        # Modifier un quiz
│   │   ├── PlayQuiz.jsx        # Jouer à un quiz
│   │   ├── QuizResults.jsx     # Résultats du quiz
│   │   ├── CreateQuestionnaire.jsx  # Créer un questionnaire
│   │   ├── EditQuestionnaire.jsx    # Modifier un questionnaire
│   │   ├── PlayQuestionnaire.jsx    # Répondre à un questionnaire
│   │   ├── QuestionnaireResults.jsx # Résultats du questionnaire
│   │   └── NotFound.jsx        # Page 404
│   │
│   ├── services/
│   │   └── firestore.js        # Services Firestore (CRUD)
│   │
│   ├── App.jsx                 # Application principale + Routes
│   ├── main.jsx                # Point d'entrée
│   └── index.css               # Styles globaux + Tailwind
│
├── .env.example                # Variables d'environnement (exemple)
├── firebase.json               # Configuration Firebase Hosting
├── firestore.rules             # Règles de sécurité Firestore
├── firestore.indexes.json      # Index Firestore
├── package.json                # Dépendances
├── tailwind.config.js          # Configuration Tailwind
├── vite.config.js              # Configuration Vite
└── README.md                   # Documentation
```

## 🔧 Installation

### 1. Cloner le projet

```bash
git clone <repo-url>
cd HugoQuiz
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configurer Firebase

1. Créez un projet sur [Firebase Console](https://console.firebase.google.com/)
2. Activez **Authentication** avec Email/Password
3. Créez une base **Firestore Database**
4. Récupérez les credentials dans Paramètres du projet > Général > Vos applications

### 4. Configurer les variables d'environnement

Copiez `.env.example` en `.env` et remplissez avec vos credentials Firebase :

```bash
cp .env.example .env
```

Contenu du `.env` :
```
VITE_FIREBASE_API_KEY=votre_api_key
VITE_FIREBASE_AUTH_DOMAIN=votre_projet.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=votre_project_id
VITE_FIREBASE_STORAGE_BUCKET=votre_projet.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=votre_sender_id
VITE_FIREBASE_APP_ID=votre_app_id
```

### 5. Déployer les règles Firestore

```bash
npm install -g firebase-tools
firebase login
firebase init # Sélectionnez Firestore et Hosting
firebase deploy --only firestore:rules
```

### 6. Créer le premier administrateur

Après avoir créé votre premier compte utilisateur, vous devez le promouvoir en admin manuellement dans Firestore :

1. Allez dans Firebase Console > Firestore
2. Trouvez le document utilisateur dans la collection `users`
3. Modifiez les champs :
   - `role`: "admin"
   - `validated`: true

### 7. Lancer l'application

```bash
npm run dev
```

L'application sera accessible sur `http://localhost:3000`

## 🚀 Déploiement

### Build de production

```bash
npm run build
```

### Déployer sur Firebase Hosting

```bash
firebase deploy --only hosting
```

## 📊 Base de Données (Firestore)

### Collections

#### `users`
| Champ | Type | Description |
|-------|------|-------------|
| id | string | UID Firebase Auth |
| email | string | Email de l'utilisateur |
| displayName | string | Nom affiché |
| role | string | "user" ou "admin" |
| validated | boolean | Compte validé par admin |
| createdAt | timestamp | Date de création |
| updatedAt | timestamp | Date de mise à jour |

#### `quizzes`
| Champ | Type | Description |
|-------|------|-------------|
| title | string | Titre du quiz |
| description | string | Description |
| userId | string | ID du créateur |
| userName | string | Nom du créateur |
| isPublic | boolean | Quiz public |
| timePerQuestion | number | Temps par question (sec) |
| randomizeQuestions | boolean | Ordre aléatoire |
| questionsCount | number | Nombre de questions |
| createdAt | timestamp | Date de création |

#### `questions`
| Champ | Type | Description |
|-------|------|-------------|
| quizId | string | ID du quiz parent |
| text | string | Texte de la question |
| options | array | Options de réponse |
| timeLimit | number | Temps limite (sec) |
| points | number | Points pour bonne réponse |
| order | number | Ordre d'affichage |

#### `questionnaires`
| Champ | Type | Description |
|-------|------|-------------|
| title | string | Titre |
| description | string | Description |
| userId | string | ID du créateur |
| questions | array | Questions avec conditions |
| createdAt | timestamp | Date de création |

#### `quizSessions` / `questionnaireSessions`
| Champ | Type | Description |
|-------|------|-------------|
| quizId/questionnaireId | string | ID du quiz/questionnaire |
| playerName/respondentName | string | Nom du joueur |
| score | number | Score (quiz only) |
| answers | array | Réponses données |
| status | string | "in_progress" ou "completed" |
| createdAt | timestamp | Date de création |

## 🔐 Sécurité

Les règles Firestore garantissent :
- Seuls les admins peuvent valider des comptes
- Un utilisateur ne peut modifier que ses propres données
- Les quiz publics peuvent être joués mais pas modifiés par d'autres
- Les sessions de jeu sont accessibles publiquement (pour permettre le jeu)

## ✨ Fonctionnalités

### Authentification
- ✅ Inscription avec email/mot de passe
- ✅ Validation manuelle par admin
- ✅ Rôles (admin/user)
- ✅ Réinitialisation de mot de passe

### Quiz (type Kahoot)
- ✅ Questions à choix multiples
- ✅ Timer par question
- ✅ Système de score avec bonus temps
- ✅ Ordre aléatoire des questions
- ✅ Résultats détaillés

### Questionnaire Conditionnel
- ✅ Questions Oui/Non
- ✅ Choix multiples
- ✅ Texte libre
- ✅ Logique conditionnelle (IF/ELSE)
- ✅ Navigation dynamique

### Administration
- ✅ Liste des utilisateurs
- ✅ Validation/blocage de comptes
- ✅ Promotion admin
- ✅ Vue des contenus créés

## 📝 License

MIT
