// Script pour réinitialiser le mot de passe admin
// Utilise Firebase Admin SDK

const admin = require('firebase-admin');

// Initialiser avec les credentials du projet
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const email = 'huguesnjomo@gmail.com';
const newPassword = 'N123456';

async function resetPassword() {
  try {
    // Trouver l'utilisateur par email
    const user = await admin.auth().getUserByEmail(email);
    console.log('Utilisateur trouvé:', user.uid);
    
    // Mettre à jour le mot de passe
    await admin.auth().updateUser(user.uid, {
      password: newPassword
    });
    
    console.log('✅ Mot de passe mis à jour avec succès pour:', email);
    console.log('Nouveau mot de passe:', newPassword);
    
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.error('❌ Aucun utilisateur trouvé avec cet email:', email);
    } else {
      console.error('❌ Erreur:', error.message);
    }
  }
  
  process.exit(0);
}

resetPassword();
