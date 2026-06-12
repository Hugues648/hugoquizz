const functions = require('firebase-functions')
const admin = require('firebase-admin')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const cors = require('cors')({ origin: true })
const nodemailer = require('nodemailer')

admin.initializeApp()
const db = admin.firestore()

// Email transporter configuration
// SMTP credentials are provided via environment variables (functions/.env):
// SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
const smtpConfig = {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS
}
const transporter = nodemailer.createTransport({
  host: smtpConfig.host || 'smtp.gmail.com',
  port: parseInt(smtpConfig.port || '587'),
  secure: false,
  auth: {
    user: smtpConfig.user || '',
    pass: smtpConfig.pass || ''
  }
})

// Verify transporter on cold start (non-blocking)
transporter.verify().then(() => {
  console.log('Email transporter ready')
}).catch((err) => {
  console.log('Email transporter not configured:', err.message)
})

// Send email helper function
// Note: To send from contact@hugoquiz.com, this alias must be configured in Gmail settings
// Go to Gmail > Settings > Accounts > "Send mail as" > Add contact@hugoquiz.com
async function sendEmail(to, subject, htmlContent) {
  try {
    if (!smtpConfig.user) {
      console.log('SMTP not configured, skipping email to:', to)
      return false
    }
    
    await transporter.sendMail({
      from: '"HugoQuiz" <contact@hugoquiz.com>',
      to,
      subject,
      html: htmlContent
    })
    console.log('Email sent to:', to)
    return true
  } catch (error) {
    console.error('Error sending email:', error)
    return false
  }
}

// ==================== EMAIL TEMPLATES ====================

// Welcome email template (sent after email verification)
function getWelcomeEmailTemplate(userName, userLang = 'fr') {
  const templates = {
    fr: {
      subject: '🎉 Bienvenue sur HugoQuiz - Votre compte est prêt !',
      html: `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Bienvenue sur HugoQuiz !</h1>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Bonjour <strong>${userName}</strong>,</p>
      
      <p style="font-size: 16px; color: #555; line-height: 1.6;">
        Félicitations ! Votre compte HugoQuiz est maintenant activé et prêt à l'emploi. 
        Vous pouvez dès à présent créer des quiz interactifs, des événements mémorables 
        et des questionnaires captivants.
      </p>
      
      <!-- CTA Premium -->
      <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border-radius: 12px; padding: 25px; margin: 30px 0; text-align: center;">
        <h2 style="color: white; margin: 0 0 15px 0; font-size: 22px;">✨ Passez au Premium !</h2>
        <p style="color: white; margin: 0 0 20px 0; font-size: 15px; line-height: 1.5;">
          Débloquez toutes les fonctionnalités avancées : quiz illimités, événements personnalisés, 
          analytics détaillés, et bien plus encore.
        </p>
        <a href="https://hugoquiz.web.app/pricing" 
           style="display: inline-block; background-color: white; color: #f5576c; padding: 14px 30px; 
                  text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 16px;">
          Découvrir les offres Premium
        </a>
      </div>
      
      <!-- Trial offer -->
      <div style="background-color: #e8f5e9; border-left: 4px solid #4caf50; padding: 20px; margin: 30px 0; border-radius: 0 8px 8px 0;">
        <h3 style="color: #2e7d32; margin: 0 0 10px 0;">🎁 14 jours d'essai gratuit !</h3>
        <p style="color: #555; margin: 0; line-height: 1.5;">
          Profitez de <strong>14 jours gratuits</strong> pour tester toutes nos fonctionnalités premium. 
          <strong>Annulable à tout moment</strong>, sans engagement. Essayez, vous n'avez rien à perdre !
        </p>
      </div>
      
      <!-- Africa/Cameroon notice -->
      <div style="background-color: #fff3e0; border-left: 4px solid #ff9800; padding: 20px; margin: 30px 0; border-radius: 0 8px 8px 0;">
        <h3 style="color: #e65100; margin: 0 0 10px 0;">🌍 Résidents du Cameroun et d'Afrique</h3>
        <p style="color: #555; margin: 0; line-height: 1.5;">
          Des solutions de paiement adaptées sont disponibles pour vous ! 
          <strong>Répondez simplement à cet email</strong> en indiquant votre pays et le forfait souhaité, 
          et nous vous recontacterons avec les modalités de paiement.
        </p>
      </div>
      
      <!-- Quick links -->
      <div style="margin: 30px 0;">
        <h3 style="color: #333; margin-bottom: 15px;">🚀 Pour bien démarrer :</h3>
        <ul style="padding-left: 20px; color: #555; line-height: 2;">
          <li><a href="https://hugoquiz.web.app/dashboard" style="color: #667eea; text-decoration: none;">Accéder à votre tableau de bord</a></li>
          <li><a href="https://hugoquiz.web.app/create-quiz" style="color: #667eea; text-decoration: none;">Créer votre premier quiz</a></li>
          <li><a href="https://hugoquiz.web.app/create-event" style="color: #667eea; text-decoration: none;">Organiser un événement</a></li>
          <li><a href="https://hugoquiz.web.app/help" style="color: #667eea; text-decoration: none;">Consulter l'aide et la documentation</a></li>
        </ul>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #e0e0e0;">
      <p style="color: #888; margin: 0 0 10px 0; font-size: 14px;">
        Une question ? Répondez directement à cet email, nous sommes là pour vous aider !
      </p>
      <p style="color: #aaa; margin: 0; font-size: 12px;">
        © 2025 HugoQuiz - Tous droits réservés
      </p>
    </div>
  </div>
</body>
</html>
      `
    },
    en: {
      subject: '🎉 Welcome to HugoQuiz - Your account is ready!',
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Welcome to HugoQuiz!</h1>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Hello <strong>${userName}</strong>,</p>
      
      <p style="font-size: 16px; color: #555; line-height: 1.6;">
        Congratulations! Your HugoQuiz account is now activated and ready to use. 
        You can start creating interactive quizzes, memorable events, 
        and engaging questionnaires right away.
      </p>
      
      <!-- CTA Premium -->
      <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border-radius: 12px; padding: 25px; margin: 30px 0; text-align: center;">
        <h2 style="color: white; margin: 0 0 15px 0; font-size: 22px;">✨ Go Premium!</h2>
        <p style="color: white; margin: 0 0 20px 0; font-size: 15px; line-height: 1.5;">
          Unlock all advanced features: unlimited quizzes, customized events, 
          detailed analytics, and much more.
        </p>
        <a href="https://hugoquiz.web.app/pricing" 
           style="display: inline-block; background-color: white; color: #f5576c; padding: 14px 30px; 
                  text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 16px;">
          Discover Premium Plans
        </a>
      </div>
      
      <!-- Trial offer -->
      <div style="background-color: #e8f5e9; border-left: 4px solid #4caf50; padding: 20px; margin: 30px 0; border-radius: 0 8px 8px 0;">
        <h3 style="color: #2e7d32; margin: 0 0 10px 0;">🎁 14-day free trial!</h3>
        <p style="color: #555; margin: 0; line-height: 1.5;">
          Enjoy <strong>14 free days</strong> to test all our premium features. 
          <strong>Cancel anytime</strong>, no commitment. Try it, you have nothing to lose!
        </p>
      </div>
      
      <!-- Africa/Cameroon notice -->
      <div style="background-color: #fff3e0; border-left: 4px solid #ff9800; padding: 20px; margin: 30px 0; border-radius: 0 8px 8px 0;">
        <h3 style="color: #e65100; margin: 0 0 10px 0;">🌍 Residents of Cameroon and Africa</h3>
        <p style="color: #555; margin: 0; line-height: 1.5;">
          Adapted payment solutions are available for you! 
          <strong>Simply reply to this email</strong> with your country and desired plan, 
          and we will get back to you with payment options.
        </p>
      </div>
      
      <!-- Quick links -->
      <div style="margin: 30px 0;">
        <h3 style="color: #333; margin-bottom: 15px;">🚀 Quick start:</h3>
        <ul style="padding-left: 20px; color: #555; line-height: 2;">
          <li><a href="https://hugoquiz.web.app/dashboard" style="color: #667eea; text-decoration: none;">Access your dashboard</a></li>
          <li><a href="https://hugoquiz.web.app/create-quiz" style="color: #667eea; text-decoration: none;">Create your first quiz</a></li>
          <li><a href="https://hugoquiz.web.app/create-event" style="color: #667eea; text-decoration: none;">Organize an event</a></li>
          <li><a href="https://hugoquiz.web.app/help" style="color: #667eea; text-decoration: none;">View help and documentation</a></li>
        </ul>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #e0e0e0;">
      <p style="color: #888; margin: 0 0 10px 0; font-size: 14px;">
        Questions? Reply directly to this email, we're here to help!
      </p>
      <p style="color: #aaa; margin: 0; font-size: 12px;">
        © 2025 HugoQuiz - All rights reserved
      </p>
    </div>
  </div>
</body>
</html>
      `
    },
    de: {
      subject: '🎉 Willkommen bei HugoQuiz - Ihr Konto ist bereit!',
      html: `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Willkommen bei HugoQuiz!</h1>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Hallo <strong>${userName}</strong>,</p>
      
      <p style="font-size: 16px; color: #555; line-height: 1.6;">
        Herzlichen Glückwunsch! Ihr HugoQuiz-Konto ist jetzt aktiviert und einsatzbereit. 
        Sie können sofort interaktive Quiz, unvergessliche Events 
        und ansprechende Fragebögen erstellen.
      </p>
      
      <!-- CTA Premium -->
      <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border-radius: 12px; padding: 25px; margin: 30px 0; text-align: center;">
        <h2 style="color: white; margin: 0 0 15px 0; font-size: 22px;">✨ Werden Sie Premium!</h2>
        <p style="color: white; margin: 0 0 20px 0; font-size: 15px; line-height: 1.5;">
          Schalten Sie alle erweiterten Funktionen frei: unbegrenzte Quiz, personalisierte Events, 
          gedetailleerde Analysen und vieles mehr.
        </p>
        <a href="https://hugoquiz.web.app/pricing" 
           style="display: inline-block; background-color: white; color: #f5576c; padding: 14px 30px; 
                  text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 16px;">
          Premium-Pläne entdecken
        </a>
      </div>
      
      <!-- Trial offer -->
      <div style="background-color: #e8f5e9; border-left: 4px solid #4caf50; padding: 20px; margin: 30px 0; border-radius: 0 8px 8px 0;">
        <h3 style="color: #2e7d32; margin: 0 0 10px 0;">🎁 14 Tage kostenlos testen!</h3>
        <p style="color: #555; margin: 0; line-height: 1.5;">
          Genießen Sie <strong>14 gratis Tage</strong> um alle unsere Premium-Funktionen zu testen. 
          <strong>Op elk moment opzegbaar</strong>, geen verplichtingen. Probieren Sie es aus!
        </p>
      </div>
      
      <!-- Africa/Cameroon notice -->
      <div style="background-color: #fff3e0; border-left: 4px solid #ff9800; padding: 20px; margin: 30px 0; border-radius: 0 8px 8px 0;">
        <h3 style="color: #e65100; margin: 0 0 10px 0;">🌍 Einwohner von Kamerun und Afrika</h3>
        <p style="color: #555; margin: 0; line-height: 1.5;">
          Aangepaste betalingsoplossingen zijn beschikbaar voor u! 
          <strong>Antwoord gewoon op deze e-mail</strong> met uw land en gewenst abonnement, 
          en we nemen contact met u op met betalingsopties.
        </p>
      </div>
      
      <!-- Quick links -->
      <div style="margin: 30px 0;">
        <h3 style="color: #333; margin-bottom: 15px;">🚀 Schnellstart:</h3>
        <ul style="padding-left: 20px; color: #555; line-height: 2;">
          <li><a href="https://hugoquiz.web.app/dashboard" style="color: #667eea; text-decoration: none;">Naar uw dashboard</a></li>
          <li><a href="https://hugoquiz.web.app/create-quiz" style="color: #667eea; text-decoration: none;">Maak uw eerste quiz</a></li>
          <li><a href="https://hugoquiz.web.app/create-event" style="color: #667eea; text-decoration: none;">Organiseer een event</a></li>
          <li><a href="https://hugoquiz.web.app/help" style="color: #667eea; text-decoration: none;">Bekijk hulp en documentatie</a></li>
        </ul>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #e0e0e0;">
      <p style="color: #888; margin: 0 0 10px 0; font-size: 14px;">
        Vragen? Antwoord direct op deze e-mail, we helpen u graag!
      </p>
      <p style="color: #aaa; margin: 0; font-size: 12px;">
        © 2025 HugoQuiz - Alle rechten voorbehouden
      </p>
    </div>
  </div>
</body>
</html>
      `
    },
    nl: {
      subject: '🎉 Welkom bij HugoQuiz - Uw account is klaar!',
      html: `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Welkom bij HugoQuiz!</h1>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Hallo <strong>${userName}</strong>,</p>
      
      <p style="font-size: 16px; color: #555; line-height: 1.6;">
        Gefeliciteerd! Uw HugoQuiz-account is nu geactiveerd en klaar voor gebruik. 
        U kunt direct beginnen met het maken van interactieve quizzen, memorabele evenementen 
        en boeiende vragenlijsten.
      </p>
      
      <!-- CTA Premium -->
      <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border-radius: 12px; padding: 25px; margin: 30px 0; text-align: center;">
        <h2 style="color: white; margin: 0 0 15px 0; font-size: 22px;">✨ Ga Premium!</h2>
        <p style="color: white; margin: 0 0 20px 0; font-size: 15px; line-height: 1.5;">
          Ontgrendel alle geavanceerde functies: onbeperkte quizzen, gepersonaliseerde evenementen, 
          gedetailleerde analyses en nog veel meer.
        </p>
        <a href="https://hugoquiz.web.app/pricing" 
           style="display: inline-block; background-color: white; color: #f5576c; padding: 14px 30px; 
                  text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 16px;">
          Ontdek Premium-abonnementen
        </a>
      </div>
      
      <!-- Trial offer -->
      <div style="background-color: #e8f5e9; border-left: 4px solid #4caf50; padding: 20px; margin: 30px 0; border-radius: 0 8px 8px 0;">
        <h3 style="color: #2e7d32; margin: 0 0 10px 0;">🎁 14 dagen gratis proberen!</h3>
        <p style="color: #555; margin: 0; line-height: 1.5;">
          Geniet van <strong>14 gratis dagen</strong> om al onze premium functies te testen. 
          <strong>Op elk moment opzegbaar</strong>, geen verplichtingen. Probieren Sie es aus!
        </p>
      </div>
      
      <!-- Africa/Cameroon notice -->
      <div style="background-color: #fff3e0; border-left: 4px solid #ff9800; padding: 20px; margin: 30px 0; border-radius: 0 8px 8px 0;">
        <h3 style="color: #e65100; margin: 0 0 10px 0;">🌍 Inwoners van Kameroen en Afrika</h3>
        <p style="color: #555; margin: 0; line-height: 1.5;">
          Aangepaste betalingsoplossingen zijn beschikbaar voor u! 
          <strong>Antwoord gewoon op deze e-mail</strong> met uw land en gewenst abonnement, 
          en we nemen contact met u op met betalingsopties.
        </p>
      </div>
      
      <!-- Quick links -->
      <div style="margin: 30px 0;">
        <h3 style="color: #333; margin-bottom: 15px;">🚀 Snel starten:</h3>
        <ul style="padding-left: 20px; color: #555; line-height: 2;">
          <li><a href="https://hugoquiz.web.app/dashboard" style="color: #667eea; text-decoration: none;">Naar uw dashboard</a></li>
          <li><a href="https://hugoquiz.web.app/create-quiz" style="color: #667eea; text-decoration: none;">Maak uw eerste quiz</a></li>
          <li><a href="https://hugoquiz.web.app/create-event" style="color: #667eea; text-decoration: none;">Organiseer een event</a></li>
          <li><a href="https://hugoquiz.web.app/help" style="color: #667eea; text-decoration: none;">Bekijk hulp en documentatie</a></li>
        </ul>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #e0e0e0;">
      <p style="color: #888; margin: 0 0 10px 0; font-size: 14px;">
        Vragen? Antwoord direct op deze e-mail, we helpen u graag!
      </p>
      <p style="color: #aaa; margin: 0; font-size: 12px;">
        © 2025 HugoQuiz - Alle rechten voorbehouden
      </p>
    </div>
  </div>
</body>
</html>
      `
    }
  }
  
  return templates[userLang] || templates['fr']
}

// Verification reminder email template
function getVerificationReminderTemplate(userName, userLang = 'fr') {
  const templates = {
    fr: {
      subject: '📧 Finalisez votre inscription HugoQuiz',
      html: `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">📧 Vérifiez votre email</h1>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Bonjour <strong>${userName}</strong>,</p>
      
      <p style="font-size: 16px; color: #555; line-height: 1.6;">
        Nous avons remarqué que vous n'avez pas encore vérifié votre adresse email. 
        Pour profiter de toutes les fonctionnalités de HugoQuiz, veuillez compléter votre inscription.
      </p>
      
      <!-- Instructions -->
      <div style="background-color: #e3f2fd; border-radius: 12px; padding: 25px; margin: 30px 0;">
        <h3 style="color: #1565c0; margin: 0 0 15px 0;">Comment vérifier votre email ?</h3>
        <ol style="color: #555; line-height: 1.8; padding-left: 20px; margin: 0;">
          <li>Recherchez notre email de vérification dans votre boîte de réception (vérifiez aussi les spams)</li>
          <li>Cliquez sur le lien de vérification dans cet email</li>
          <li><strong>OU</strong> connectez-vous sur <a href="https://hugoquiz.web.app/login" style="color: #1565c0;">hugoquiz.web.app</a> et cliquez sur "Renvoyer le lien de vérification"</li>
        </ol>
      </div>
      
      <!-- CTA -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://hugoquiz.web.app/login" 
           style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                  color: white; padding: 14px 40px; text-decoration: none; border-radius: 30px; 
                  font-weight: bold; font-size: 16px;">
          Se connecter à HugoQuiz
        </a>
      </div>
      
      <p style="font-size: 14px; color: #888; text-align: center;">
        Si vous n'avez pas créé de compte HugoQuiz, ignorez simplement cet email.
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #e0e0e0;">
      <p style="color: #888; margin: 0 0 10px 0; font-size: 14px;">
        Besoin d'aide ? Répondez à cet email.
      </p>
      <p style="color: #aaa; margin: 0; font-size: 12px;">
        © 2025 HugoQuiz - Tous droits réservés
      </p>
    </div>
  </div>
</body>
</html>
      `
    },
    en: {
      subject: '📧 Complete your HugoQuiz registration',
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">📧 Verify your email</h1>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Hello <strong>${userName}</strong>,</p>
      
      <p style="font-size: 16px; color: #555; line-height: 1.6;">
        We noticed that you haven't verified your email address yet. 
        To enjoy all HugoQuiz features, please complete your registration.
      </p>
      
      <!-- Instructions -->
      <div style="background-color: #e3f2fd; border-radius: 12px; padding: 25px; margin: 30px 0;">
        <h3 style="color: #1565c0; margin: 0 0 15px 0;">How to verify your email?</h3>
        <ol style="color: #555; line-height: 1.8; padding-left: 20px; margin: 0;">
          <li>Look for our verification email in your inbox (also check spam)</li>
          <li>Click the verification link in that email</li>
          <li><strong>OR</strong> log in at <a href="https://hugoquiz.web.app/login" style="color: #1565c0;">hugoquiz.web.app</a> and click "Resend verification link"</li>
        </ol>
      </div>
      
      <!-- CTA -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://hugoquiz.web.app/login" 
           style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                  color: white; padding: 14px 40px; text-decoration: none; border-radius: 30px; 
                  font-weight: bold; font-size: 16px;">
          Log in to HugoQuiz
        </a>
      </div>
      
      <p style="font-size: 14px; color: #888; text-align: center;">
        If you didn't create a HugoQuiz account, simply ignore this email.
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #e0e0e0;">
      <p style="color: #888; margin: 0 0 10px 0; font-size: 14px;">
        Need help? Reply to this email.
      </p>
      <p style="color: #aaa; margin: 0; font-size: 12px;">
        © 2025 HugoQuiz - All rights reserved
      </p>
    </div>
  </div>
</body>
</html>
      `
    },
    de: {
      subject: '📧 Schließen Sie Ihre HugoQuiz-Registrierung ab',
      html: `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">📧 Bestätigen Sie Ihre E-Mail</h1>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Hallo <strong>${userName}</strong>,</p>
      
      <p style="font-size: 16px; color: #555; line-height: 1.6;">
        Wir haben festgestellt, dass Sie Ihre E-Mail-Adresse noch nicht bestätigt haben. 
        Um alle Funktionen von HugoQuiz nutzen zu können, schließen Sie bitte Ihre Registrierung ab.
      </p>
      
      <!-- Instructions -->
      <div style="background-color: #e3f2fd; border-radius: 12px; padding: 25px; margin: 30px 0;">
        <h3 style="color: #1565c0; margin: 0 0 15px 0;">Wie bestätigen Sie Ihre E-Mail?</h3>
        <ol style="color: #555; line-height: 1.8; padding-left: 20px; margin: 0;">
          <li>Suchen Sie unsere Bestätigungs-E-Mail in Ihrem Posteingang (auch Spam prüfen)</li>
          <li>Klicken Sie auf den Bestätigungslink in dieser E-Mail</li>
          <li><strong>ODER</strong> melden Sie sich bei <a href="https://hugoquiz.web.app/login" style="color: #1565c0;">hugoquiz.web.app</a> an und klicken Sie auf "Bestätigungslink erneut senden"</li>
        </ol>
      </div>
      
      <!-- CTA -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://hugoquiz.web.app/login" 
           style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                  color: white; padding: 14px 40px; text-decoration: none; border-radius: 30px; 
                  font-weight: bold; font-size: 16px;">
          Bei HugoQuiz anmelden
        </a>
      </div>
      
      <p style="font-size: 14px; color: #888; text-align: center;">
        Falls Sie kein HugoQuiz-Konto erstellt haben, ignorieren Sie diese E-Mail einfach.
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #e0e0e0;">
      <p style="color: #888; margin: 0 0 10px 0; font-size: 14px;">
        Brauchen Sie Hilfe? Antworten Sie auf diese E-Mail.
      </p>
      <p style="color: #aaa; margin: 0; font-size: 12px;">
        © 2025 HugoQuiz - Alle Rechte vorbehalten
      </p>
    </div>
  </div>
</body>
</html>
      `
    },
    nl: {
      subject: '📧 Voltooi uw HugoQuiz-registratie',
      html: `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">📧 Verifieer uw e-mail</h1>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Hallo <strong>${userName}</strong>,</p>
      
      <p style="font-size: 16px; color: #555; line-height: 1.6;">
        We hebben gemerkt dat u uw e-mailadres nog niet heeft geverifieerd. 
        Om van alle HugoQuiz-functies te genieten, voltooi uw registratie.
      </p>
      
      <!-- Instructions -->
      <div style="background-color: #e3f2fd; border-radius: 12px; padding: 25px; margin: 30px 0;">
        <h3 style="color: #1565c0; margin: 0 0 15px 0;">Hoe verifieert u uw e-mail?</h3>
        <ol style="color: #555; line-height: 1.8; padding-left: 20px; margin: 0;">
          <li>Zoek onze verificatie-e-mail in uw inbox (controleer ook spam)</li>
          <li>Klik op de verificatielink in die e-mail</li>
          <li><strong>OF</strong> log in op <a href="https://hugoquiz.web.app/login" style="color: #1565c0;">hugoquiz.web.app</a> en klik op "Verificatielink opnieuw verzenden"</li>
        </ol>
      </div>
      
      <!-- CTA -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://hugoquiz.web.app/login" 
           style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                  color: white; padding: 14px 40px; text-decoration: none; border-radius: 30px; 
                  font-weight: bold; font-size: 16px;">
          Inloggen bij HugoQuiz
        </a>
      </div>
      
      <p style="font-size: 14px; color: #888; text-align: center;">
        Als u geen HugoQuiz-account heeft aangemaakt, negeer deze e-mail gewoon.
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #e0e0e0;">
      <p style="color: #888; margin: 0 0 10px 0; font-size: 14px;">
        Hulp nodig? Antwoord direct op deze e-mail of neem contact met ons op via 
        <a href="mailto:contact@hugoquiz.com" style="color: #667eea;">contact@hugoquiz.com</a>
      </p>
      <p style="color: #aaa; margin: 0; font-size: 12px;">
        © 2025 HugoQuiz - Alle rechten voorbehouden
      </p>
    </div>
  </div>
</body>
</html>
      `
    }
  }
  
  return templates[userLang] || templates['fr']
}

// ==================== WELCOME EMAIL ON EMAIL VERIFICATION ====================
// Triggered when a user document is updated (emailVerified changes from false to true)
exports.onEmailVerified = functions.firestore
  .document('users/{userId}')
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data()
    const afterData = change.after.data()
    
    // Check if emailVerified changed from false to true
    if (!beforeData.emailVerified && afterData.emailVerified === true) {
      console.log(`User ${context.params.userId} verified their email, sending welcome email`)
      
      // Check if welcome email was already sent
      if (afterData.welcomeEmailSent) {
        console.log('Welcome email already sent, skipping')
        return null
      }
      
      const userEmail = afterData.email
      const userName = afterData.displayName || afterData.firstName || 'Utilisateur'
      const userLang = afterData.preferredLanguage || 'fr'
      
      const template = getWelcomeEmailTemplate(userName, userLang)
      const emailSent = await sendEmail(userEmail, template.subject, template.html)
      
      if (emailSent) {
        // Mark welcome email as sent
        await change.after.ref.update({
          welcomeEmailSent: true,
          welcomeEmailSentAt: admin.firestore.FieldValue.serverTimestamp()
        })
        console.log(`Welcome email sent to ${userEmail}`)
      }
      
      return null
    }
    
    return null
  })

// ==================== VERIFICATION REMINDER EMAILS ====================
// Scheduled function that runs every day at 10:00 AM
exports.sendVerificationReminders = functions.pubsub
  .schedule('0 10 * * *')  // Every day at 10:00 AM
  .timeZone('Europe/Paris')
  .onRun(async (context) => {
    console.log('Running verification reminder emails job')
    
    // Get users who:
    // 1. Have emailVerified = false
    // 2. Were created more than 24 hours ago
    // 3. Haven't received a reminder in the last 3 days
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)
    
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    
    try {
      const usersSnapshot = await db.collection('users')
        .where('emailVerified', '==', false)
        .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(oneDayAgo))
        .get()
      
      console.log(`Found ${usersSnapshot.size} users with unverified email`)
      
      let remindersSent = 0
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data()
        
        // Skip if last reminder was sent less than 3 days ago
        const lastReminder = userData.lastVerificationReminder?.toDate?.()
        if (lastReminder && lastReminder > threeDaysAgo) {
          console.log(`Skipping ${userData.email} - reminder sent recently`)
          continue
        }
        
        // Skip if too many reminders sent (max 3)
        const reminderCount = userData.verificationReminderCount || 0
        if (reminderCount >= 3) {
          console.log(`Skipping ${userData.email} - max reminders reached`)
          continue
        }
        
        const userName = userData.displayName || userData.firstName || 'Utilisateur'
        const userLang = userData.preferredLanguage || 'fr'
        
        const template = getVerificationReminderTemplate(userName, userLang)
        const emailSent = await sendEmail(userData.email, template.subject, template.html)
        
        if (emailSent) {
          await userDoc.ref.update({
            lastVerificationReminder: admin.firestore.FieldValue.serverTimestamp(),
            verificationReminderCount: reminderCount + 1
          })
          remindersSent++
          console.log(`Reminder sent to ${userData.email}`)
        }
      }
      
      console.log(`Verification reminder job complete. Sent ${remindersSent} reminders.`)
      return null
    } catch (error) {
      console.error('Error in verification reminder job:', error)
      return null
    }
  })

// Subscription plan mapping
const PLAN_DURATIONS = {
  'quiz_monthly': 30,
  'events_monthly': 30,
  'complete_monthly': 30,
  'quiz_yearly': 365,
  'events_yearly': 365,
  'complete_yearly': 365,
  'admin_granted_monthly': 30,
  'admin_granted_yearly': 365
}

// Trial configuration
const TRIAL_PERIOD_DAYS = 14

// ==================== CHECK TRIAL ELIGIBILITY ====================
exports.checkTrialEligibility = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in')
  }

  const userId = context.auth.uid
  const userDoc = await db.collection('users').doc(userId).get()
  const userData = userDoc.data()

  // Check if user has already used trial
  if (userData?.hasUsedTrial) {
    return { 
      eligible: false, 
      reason: 'trial_already_used',
      trialUsedAt: userData.trialUsedAt?.toDate?.()?.toISOString() || null
    }
  }

  // Check if user has admin-granted access (current or past)
  if (userData?.subscription?.isAdminGranted || userData?.hadAdminGrantedAccess) {
    return { 
      eligible: false, 
      reason: 'admin_granted_access'
    }
  }

  return { 
    eligible: true,
    trialDays: TRIAL_PERIOD_DAYS
  }
})

// ==================== CREATE CHECKOUT SESSION ====================
exports.createCheckoutSession = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
      const { userId, priceId, userEmail, planId, successUrl, cancelUrl } = req.body

      if (!userId || !priceId || !planId) {
        return res.status(400).json({ error: 'Missing required fields' })
      }

      // Get or create Stripe customer
      const userDoc = await db.collection('users').doc(userId).get()
      let stripeCustomerId = userDoc.data()?.subscription?.stripeCustomerId

      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: userEmail,
          metadata: { firebaseUserId: userId }
        })
        stripeCustomerId = customer.id
        
        // Save customer ID
        await db.collection('users').doc(userId).update({
          'subscription.stripeCustomerId': stripeCustomerId
        })
      }

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        payment_method_types: ['card'],
        line_items: [{
          price: priceId,
          quantity: 1
        }],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId,
          planId
        },
        subscription_data: {
          metadata: {
            userId,
            planId
          }
        }
      })

      return res.json({ sessionId: session.id })
    } catch (error) {
      console.error('Checkout session error:', error)
      return res.status(500).json({ error: error.message })
    }
  })
})

// ==================== CREATE PORTAL SESSION ====================
exports.createPortalSession = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
      const { userId, returnUrl } = req.body

      const userDoc = await db.collection('users').doc(userId).get()
      const stripeCustomerId = userDoc.data()?.subscription?.stripeCustomerId

      if (!stripeCustomerId) {
        return res.status(400).json({ error: 'No Stripe customer found' })
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: returnUrl
      })

      return res.json({ url: session.url })
    } catch (error) {
      console.error('Portal session error:', error)
      return res.status(500).json({ error: error.message })
    }
  })
})

// ==================== CALLABLE VERSIONS FOR FRONTEND ====================

// Create checkout session (callable from frontend)
exports.createCheckoutSessionCallable = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in')
  }

  try {
    const { userId, priceId, userEmail, planId, successUrl, cancelUrl, withTrial } = data

    if (!userId || !priceId || !planId) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required fields')
    }

    // Get user data
    const userDoc = await db.collection('users').doc(userId).get()
    const userData = userDoc.data()
    
    // Check trial eligibility if trial is requested
    let applyTrial = false
    if (withTrial) {
      // Verify user hasn't already used trial
      if (userData?.hasUsedTrial) {
        throw new functions.https.HttpsError('failed-precondition', 'Trial already used')
      }
      // Verify user hasn't had admin-granted access
      if (userData?.subscription?.isAdminGranted || userData?.hadAdminGrantedAccess) {
        throw new functions.https.HttpsError('failed-precondition', 'Not eligible for trial due to admin-granted access')
      }
      applyTrial = true
    }
    
    // Get or create Stripe customer
    let stripeCustomerId = userData?.subscription?.stripeCustomerId

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { firebaseUserId: userId }
      })
      stripeCustomerId = customer.id
      
      // Save customer ID
      await db.collection('users').doc(userId).update({
        'subscription.stripeCustomerId': stripeCustomerId
      })
    }

    // Build subscription_data with optional trial
    const subscriptionData = {
      metadata: {
        userId,
        planId,
        withTrial: applyTrial.toString()
      }
    }
    
    if (applyTrial) {
      subscriptionData.trial_period_days = TRIAL_PERIOD_DAYS
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1
      }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        planId,
        withTrial: applyTrial.toString()
      },
      subscription_data: subscriptionData
    })

    return { sessionId: session.id, url: session.url }
  } catch (error) {
    console.error('Checkout session error:', error)
    throw new functions.https.HttpsError('internal', error.message)
  }
})

// Create portal session (callable from frontend)
exports.createPortalSessionCallable = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in')
  }

  try {
    const { userId, returnUrl } = data

    const userDoc = await db.collection('users').doc(userId).get()
    const stripeCustomerId = userDoc.data()?.subscription?.stripeCustomerId

    if (!stripeCustomerId) {
      throw new functions.https.HttpsError('failed-precondition', 'No Stripe customer found')
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl
    })

    return { url: session.url }
  } catch (error) {
    console.error('Portal session error:', error)
    throw new functions.https.HttpsError('internal', error.message)
  }
})

// ==================== PAYMENT EMAIL TEMPLATES ====================

// Helper function to get plan display name
function getPlanDisplayName(planId, lang = 'fr') {
  const planNames = {
    fr: {
      quiz_monthly: 'Quiz & Questionnaire (Mensuel)',
      events_monthly: 'Événements (Mensuel)',
      complete_monthly: 'Complet (Mensuel)',
      quiz_yearly: 'Quiz & Questionnaire (Annuel)',
      events_yearly: 'Événements (Annuel)',
      complete_yearly: 'Complet (Annuel)'
    },
    en: {
      quiz_monthly: 'Quiz & Questionnaire (Monthly)',
      events_monthly: 'Events (Monthly)',
      complete_monthly: 'Complete (Monthly)',
      quiz_yearly: 'Quiz & Questionnaire (Yearly)',
      events_yearly: 'Events (Yearly)',
      complete_yearly: 'Complete (Yearly)'
    },
    de: {
      quiz_monthly: 'Quiz & Fragebogen (Monatlich)',
      events_monthly: 'Events (Monatlich)',
      complete_monthly: 'Komplett (Monatlich)',
      quiz_yearly: 'Quiz & Fragebogen (Jährlich)',
      events_yearly: 'Events (Jährlich)',
      complete_yearly: 'Komplett (Jährlich)'
    },
    nl: {
      quiz_monthly: 'Quiz & Vragenlijst (Maandelijks)',
      events_monthly: 'Evenementen (Maandelijks)',
      complete_monthly: 'Compleet (Maandelijks)',
      quiz_yearly: 'Quiz & Vragenlijst (Jaarlijks)',
      events_yearly: 'Evenementen (Jaarlijks)',
      complete_yearly: 'Compleet (Jaarlijks)'
    }
  }
  return (planNames[lang] || planNames['fr'])[planId] || planId
}

// Localized notification messages
function getPaymentFailedNotification(lang = 'fr', attemptCount = 1) {
  const messages = {
    fr: `Votre paiement a échoué (tentative #${attemptCount}). Veuillez mettre à jour vos informations de paiement pour conserver votre abonnement.`,
    en: `Your payment has failed (attempt #${attemptCount}). Please update your payment information to keep your subscription.`,
    de: `Ihre Zahlung ist fehlgeschlagen (Versuch #${attemptCount}). Bitte aktualisieren Sie Ihre Zahlungsinformationen, um Ihr Abonnement beizubehalten.`,
    nl: `Uw betaling is mislukt (poging #${attemptCount}). Werk uw betalingsgegevens bij om uw abonnement te behouden.`
  }
  return messages[lang] || messages['fr']
}

function getPaymentRecoveredNotification(lang = 'fr') {
  const messages = {
    fr: 'Votre paiement a été effectué avec succès ! Votre abonnement est à nouveau actif.',
    en: 'Your payment was successful! Your subscription is active again.',
    de: 'Ihre Zahlung war erfolgreich! Ihr Abonnement ist wieder aktiv.',
    nl: 'Uw betaling is geslaagd! Uw abonnement is weer actief.'
  }
  return messages[lang] || messages['fr']
}

// Payment Failed Email Template (4 languages)
function getPaymentFailedEmailTemplate(userName, lang = 'fr', updatePaymentUrl, attemptCount = 1, nextAttempt = null, planId = null) {
  const planName = getPlanDisplayName(planId, lang)
  const nextAttemptStr = nextAttempt 
    ? nextAttempt.toLocaleDateString(lang === 'fr' ? 'fr-FR' : lang === 'de' ? 'de-DE' : lang === 'nl' ? 'nl-NL' : 'en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      })
    : null

  const templates = {
    fr: {
      subject: '⚠️ Échec de paiement - Votre abonnement HugoQuiz est en danger',
      html: `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 20px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 26px;">⚠️ Échec de paiement</h1>
    </div>
    <div style="padding: 40px 30px;">
      <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Bonjour <strong>${userName}</strong>,</p>
      <p style="font-size: 16px; color: #555; line-height: 1.6;">
        Nous n'avons pas pu traiter le paiement pour votre abonnement 
        <strong>${planName}</strong> (tentative #${attemptCount}).
      </p>
      
      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
        <h3 style="color: #991b1b; margin: 0 0 10px 0;">🔴 Action requise</h3>
        <p style="color: #555; margin: 0; line-height: 1.5;">
          Votre abonnement est actuellement en <strong>période de grâce de 7 jours</strong>. 
          Vous conservez temporairement l'accès à vos fonctionnalités, mais si le paiement 
          n'est pas résolu, votre abonnement sera suspendu.
        </p>
      </div>

      ${nextAttemptStr ? `
      <div style="background-color: #fff7ed; border-left: 4px solid #f59e0b; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
        <h3 style="color: #92400e; margin: 0 0 10px 0;">🔄 Prochaine tentative automatique</h3>
        <p style="color: #555; margin: 0;">Stripe retentera automatiquement le prélèvement le <strong>${nextAttemptStr}</strong>.</p>
      </div>
      ` : ''}

      <div style="text-align: center; margin: 30px 0;">
        <a href="${updatePaymentUrl}" 
           style="display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); 
                  color: white; padding: 16px 40px; text-decoration: none; border-radius: 30px; 
                  font-weight: bold; font-size: 16px;">
          💳 Mettre à jour le paiement
        </a>
      </div>

      <div style="background-color: #f0f9ff; border-radius: 12px; padding: 20px; margin: 25px 0;">
        <h3 style="color: #0369a1; margin: 0 0 10px 0;">💡 Vérifiez ces points :</h3>
        <ul style="color: #555; line-height: 1.8; padding-left: 20px; margin: 0;">
          <li>Votre carte bancaire n'est pas expirée</li>
          <li>Il y a suffisamment de fonds sur votre compte</li>
          <li>Votre banque n'a pas bloqué la transaction</li>
          <li>Vous pouvez aussi essayer une autre carte</li>
        </ul>
      </div>

      <p style="font-size: 14px; color: #888; text-align: center; margin-top: 30px;">
        Besoin d'aide ? Répondez directement à cet email ou contactez-nous à 
        <a href="mailto:contact@hugoquiz.com" style="color: #667eea;">contact@hugoquiz.com</a>
      </p>
    </div>
    <div style="background-color: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #e0e0e0;">
      <p style="color: #aaa; margin: 0; font-size: 12px;">© ${new Date().getFullYear()} HugoQuiz - Tous droits réservés</p>
    </div>
  </div>
</body>
</html>`
    },
    en: {
      subject: '⚠️ Payment Failed - Your HugoQuiz subscription is at risk',
      html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 20px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 26px;">⚠️ Payment Failed</h1>
    </div>
    <div style="padding: 40px 30px;">
      <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Hello <strong>${userName}</strong>,</p>
      <p style="font-size: 16px; color: #555; line-height: 1.6;">
        We were unable to process the payment for your 
        <strong>${planName}</strong> subscription (attempt #${attemptCount}).
      </p>
      
      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
        <h3 style="color: #991b1b; margin: 0 0 10px 0;">🔴 Action required</h3>
        <p style="color: #555; margin: 0; line-height: 1.5;">
          Your subscription is currently in a <strong>7-day grace period</strong>. 
          You temporarily keep access to your features, but if the payment 
          issue is not resolved, your subscription will be suspended.
        </p>
      </div>

      ${nextAttemptStr ? `
      <div style="background-color: #fff7ed; border-left: 4px solid #f59e0b; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
        <h3 style="color: #92400e; margin: 0 0 10px 0;">🔄 Next automatic retry</h3>
        <p style="color: #555; margin: 0;">Stripe will automatically retry the payment on <strong>${nextAttemptStr}</strong>.</p>
      </div>
      ` : ''}

      <div style="text-align: center; margin: 30px 0;">
        <a href="${updatePaymentUrl}" 
           style="display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); 
                  color: white; padding: 16px 40px; text-decoration: none; border-radius: 30px; 
                  font-weight: bold; font-size: 16px;">
          💳 Update Payment Method
        </a>
      </div>

      <div style="background-color: #f0f9ff; border-radius: 12px; padding: 20px; margin: 25px 0;">
        <h3 style="color: #0369a1; margin: 0 0 10px 0;">💡 Please check:</h3>
        <ul style="color: #555; line-height: 1.8; padding-left: 20px; margin: 0;">
          <li>Your credit card has not expired</li>
          <li>There are sufficient funds on your account</li>
          <li>Your bank has not blocked the transaction</li>
          <li>You can also try a different card</li>
        </ul>
      </div>

      <p style="font-size: 14px; color: #888; text-align: center; margin-top: 30px;">
        Need help? Reply directly to this email or contact us at 
        <a href="mailto:contact@hugoquiz.com" style="color: #667eea;">contact@hugoquiz.com</a>
      </p>
    </div>
    <div style="background-color: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #e0e0e0;">
      <p style="color: #aaa; margin: 0; font-size: 12px;">© ${new Date().getFullYear()} HugoQuiz - All rights reserved</p>
    </div>
  </div>
</body>
</html>`
    },
    de: {
      subject: '⚠️ Zahlung fehlgeschlagen - Ihr HugoQuiz-Abonnement ist gefährdet',
      html: `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 20px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 26px;">⚠️ Zahlung fehlgeschlagen</h1>
    </div>
    <div style="padding: 40px 30px;">
      <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Hallo <strong>${userName}</strong>,</p>
      <p style="font-size: 16px; color: #555; line-height: 1.6;">
        Wir konnten die Zahlung für Ihr Abonnement 
        <strong>${planName}</strong> nicht verarbeiten (Versuch #${attemptCount}).
      </p>
      
      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
        <h3 style="color: #991b1b; margin: 0 0 10px 0;">🔴 Handlung erforderlich</h3>
        <p style="color: #555; margin: 0; line-height: 1.5;">
          Ihr Abonnement befindet sich derzeit in einer <strong>7-tägigen Kulanzfrist</strong>. 
          Sie behalten vorübergehend Zugang zu Ihren Funktionen, aber wenn das Zahlungsproblem 
          nicht wird gelöst, wird Ihr Abonnement ausgesetzt.
        </p>
      </div>

      ${nextAttemptStr ? `
      <div style="background-color: #fff7ed; border-left: 4px solid #f59e0b; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
        <h3 style="color: #92400e; margin: 0 0 10px 0;">🔄 Nächster automatischer Versuch</h3>
        <p style="color: #555; margin: 0;">Stripe wird die Zahlung automatisch am <strong>${nextAttemptStr}</strong> erneut versuchen.</p>
      </div>
      ` : ''}

      <div style="text-align: center; margin: 30px 0;">
        <a href="${updatePaymentUrl}" 
           style="display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); 
                  color: white; padding: 16px 40px; text-decoration: none; border-radius: 30px; 
                  font-weight: bold; font-size: 16px;">
          💳 Zahlungsmethode aktualisieren
        </a>
      </div>

      <div style="background-color: #f0f9ff; border-radius: 12px; padding: 20px; margin: 25px 0;">
        <h3 style="color: #0369a1; margin: 0 0 10px 0;">💡 Bitte überprüfen Sie:</h3>
        <ul style="color: #555; line-height: 1.8; padding-left: 20px; margin: 0;">
          <li>Ihre Kreditkarte ist nicht abgelaufen</li>
          <li>Es sind ausreichend Mittel auf Ihrem Konto</li>
          <li>Ihre Bank hat die Transaktion nicht blockiert</li>
          <li>Sie können auch eine andere Karte versuchen</li>
        </ul>
      </div>

      <p style="font-size: 14px; color: #888; text-align: center; margin-top: 30px;">
        Brauchen Sie Hilfe? Antworten Sie direkt auf diese E-Mail oder kontaktieren Sie uns unter 
        <a href="mailto:contact@hugoquiz.com" style="color: #667eea;">contact@hugoquiz.com</a>
      </p>
    </div>
    <div style="background-color: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #e0e0e0;">
      <p style="color: #aaa; margin: 0; font-size: 12px;">© ${new Date().getFullYear()} HugoQuiz - Alle Rechte vorbehalten</p>
    </div>
  </div>
</body>
</html>`
    },
    nl: {
      subject: '⚠️ Betaling mislukt - Uw HugoQuiz-abonnement loopt gevaar',
      html: `
<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 20px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 26px;">⚠️ Betaling mislukt</h1>
    </div>
    <div style="padding: 40px 30px;">
      <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Hallo <strong>${userName}</strong>,</p>
      <p style="font-size: 16px; color: #555; line-height: 1.6;">
        We konden de betaling voor uw abonnement 
        <strong>${planName}</strong> niet verwerken (poging #${attemptCount}).
      </p>
      
      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
        <h3 style="color: #991b1b; margin: 0 0 10px 0;">🔴 Actie vereist</h3>
        <p style="color: #555; margin: 0; line-height: 1.5;">
          Uw abonnement bevindt zich momenteel in een <strong>respijtperiode van 7 dagen</strong>. 
          U behoudt tijdelijk toegang tot uw functies, maar als het betalingsprobleem 
          niet wordt opgelost, wordt uw abonnement opgeschort.
        </p>
      </div>

      ${nextAttemptStr ? `
      <div style="background-color: #fff7ed; border-left: 4px solid #f59e0b; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
        <h3 style="color: #92400e; margin: 0 0 10px 0;">🔄 Volgende automatische poging</h3>
        <p style="color: #555; margin: 0;">Stripe zal de betaling automatisch opnieuw proberen op <strong>${nextAttemptStr}</strong>.</p>
      </div>
      ` : ''}

      <div style="text-align: center; margin: 30px 0;">
        <a href="${updatePaymentUrl}" 
           style="display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); 
                  color: white; padding: 16px 40px; text-decoration: none; border-radius: 30px; 
                  font-weight: bold; font-size: 16px;">
          💳 Betaalmethode bijwerken
        </a>
      </div>

      <div style="background-color: #f0f9ff; border-radius: 12px; padding: 20px; margin: 25px 0;">
        <h3 style="color: #0369a1; margin: 0 0 10px 0;">💡 Controleer het volgende:</h3>
        <ul style="color: #555; line-height: 1.8; padding-left: 20px; margin: 0;">
          <li>Uw creditcard is niet verlopen</li>
          <li>Er staan voldoende middelen op uw rekening</li>
          <li>Uw bank heeft de transactie niet geblokkeerd</li>
          <li>U kunt ook een andere kaart proberen</li>
        </ul>
      </div>

      <p style="font-size: 14px; color: #888; text-align: center; margin-top: 30px;">
        Hulp nodig? Antwoord direct op deze e-mail of neem contact met ons op via 
        <a href="mailto:contact@hugoquiz.com" style="color: #667eea;">contact@hugoquiz.com</a>
      </p>
    </div>
    <div style="background-color: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #e0e0e0;">
      <p style="color: #aaa; margin: 0; font-size: 12px;">© ${new Date().getFullYear()} HugoQuiz - Alle rechten voorbehouden</p>
    </div>
  </div>
</body>
</html>`
    }
  }
  
  return templates[lang] || templates['fr']
}

// Payment Recovered Email Template (4 languages)
function getPaymentRecoveredEmailTemplate(userName, lang = 'fr', planId = null) {
  const planName = getPlanDisplayName(planId, lang)
  
  const templates = {
    fr: {
      subject: '✅ Paiement réussi - Votre abonnement HugoQuiz est rétabli !',
      html: `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 26px;">✅ Paiement réussi !</h1>
    </div>
    <div style="padding: 40px 30px;">
      <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Bonjour <strong>${userName}</strong>,</p>
      <p style="font-size: 16px; color: #555; line-height: 1.6;">
        Bonne nouvelle ! Le paiement pour votre abonnement <strong>${planName}</strong> a été traité avec succès.
        Votre abonnement est à nouveau pleinement actif.
      </p>
      <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
        <h3 style="color: #065f46; margin: 0 0 10px 0;">✨ Tout est en ordre</h3>
        <p style="color: #555; margin: 0;">Vous avez retrouvé l'accès complet à toutes vos fonctionnalités premium. Profitez-en !</p>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://hugoquiz.com/dashboard" 
           style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
                  color: white; padding: 14px 40px; text-decoration: none; border-radius: 30px; 
                  font-weight: bold; font-size: 16px;">
          Accéder au tableau de bord
        </a>
      </div>
    </div>
    <div style="background-color: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #e0e0e0;">
      <p style="color: #aaa; margin: 0; font-size: 12px;">© ${new Date().getFullYear()} HugoQuiz - Tous droits réservés</p>
    </div>
  </div>
</body>
</html>`
    },
    en: {
      subject: '✅ Payment Successful - Your HugoQuiz subscription is restored!',
      html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 26px;">✅ Payment Successful!</h1>
    </div>
    <div style="padding: 40px 30px;">
      <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Hello <strong>${userName}</strong>,</p>
      <p style="font-size: 16px; color: #555; line-height: 1.6;">
        Great news! The payment for your <strong>${planName}</strong> subscription has been processed successfully.
        Your subscription is fully active again.
      </p>
      <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
        <h3 style="color: #065f46; margin: 0 0 10px 0;">✨ Everything is in order</h3>
        <p style="color: #555; margin: 0;">You have full access to all your premium features again. Enjoy!</p>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://hugoquiz.com/dashboard" 
           style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
                  color: white; padding: 14px 40px; text-decoration: none; border-radius: 30px; 
                  font-weight: bold; font-size: 16px;">
          Go to Dashboard
        </a>
      </div>
    </div>
    <div style="background-color: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #e0e0e0;">
      <p style="color: #aaa; margin: 0; font-size: 12px;">© ${new Date().getFullYear()} HugoQuiz - All rights reserved</p>
    </div>
  </div>
</body>
</html>`
    },
    de: {
      subject: '✅ Zahlung erfolgreich - Ihr HugoQuiz-Abonnement ist wiederhergestellt!',
      html: `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 26px;">✅ Zahlung erfolgreich!</h1>
    </div>
    <div style="padding: 40px 30px;">
      <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Hallo <strong>${userName}</strong>,</p>
      <p style="font-size: 16px; color: #555; line-height: 1.6;">
        Gute Nachrichten! Die Zahlung für Ihr Abonnement <strong>${planName}</strong> wurde erfolgreich verarbeitet.
        Ihr Abonnement ist wieder vollständig aktiv.
      </p>
      <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
        <h3 style="color: #065f46; margin: 0 0 10px 0;">✨ Alles in Ordnung</h3>
        <p style="color: #555; margin: 0;">Sie haben wieder vollen Zugang zu allen Ihren Premium-Funktionen. Viel Spaß!</p>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://hugoquiz.com/dashboard" 
           style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
                  color: white; padding: 14px 40px; text-decoration: none; border-radius: 30px; 
                  font-weight: bold; font-size: 16px;">
          Zum Dashboard
        </a>
      </div>
    </div>
    <div style="background-color: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #e0e0e0;">
      <p style="color: #aaa; margin: 0; font-size: 12px;">© ${new Date().getFullYear()} HugoQuiz - Alle Rechte vorbehalten</p>
    </div>
  </div>
</body>
</html>`
    },
    nl: {
      subject: '✅ Betaling geslaagd - Uw HugoQuiz-abonnement is hersteld!',
      html: `
<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 26px;">✅ Betaling geslaagd!</h1>
    </div>
    <div style="padding: 40px 30px;">
      <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Hallo <strong>${userName}</strong>,</p>
      <p style="font-size: 16px; color: #555; line-height: 1.6;">
        Goed nieuws! De betaling voor uw abonnement <strong>${planName}</strong> is succesvol verwerkt.
        Uw abonnement is weer volledig actief.
      </p>
      <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
        <h3 style="color: #065f46; margin: 0 0 10px 0;">✨ Alles in orde</h3>
        <p style="color: #555; margin: 0;">U heeft weer volledige toegang tot al uw premium functies. Veel plezier!</p>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://hugoquiz.com/dashboard" 
           style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
                  color: white; padding: 14px 40px; text-decoration: none; border-radius: 30px; 
                  font-weight: bold; font-size: 16px;">
          Naar Dashboard
        </a>
      </div>
    </div>
    <div style="background-color: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #e0e0e0;">
      <p style="color: #aaa; margin: 0; font-size: 12px;">© ${new Date().getFullYear()} HugoQuiz - Alle rechten voorbehouden</p>
    </div>
  </div>
</body>
</html>`
    }
  }
  
  return templates[lang] || templates['fr']
}

// ==================== STRIPE WEBHOOK ====================
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature']
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET
  
  let event

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      await handleCheckoutComplete(session)
      break
    }
    
    case 'customer.subscription.updated': {
      const subscription = event.data.object
      await handleSubscriptionUpdate(subscription)
      break
    }
    
    case 'customer.subscription.deleted': {
      const subscription = event.data.object
      await handleSubscriptionDeleted(subscription)
      break
    }
    
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object
      await handlePaymentSucceeded(invoice)
      break
    }
    
    case 'invoice.payment_failed': {
      const invoice = event.data.object
      await handlePaymentFailed(invoice)
      break
    }
    
    default:
      console.log(`Unhandled event type: ${event.type}`)
  }

  res.json({ received: true })
})

// ==================== WEBHOOK HANDLERS ====================

async function handleCheckoutComplete(session) {
  const userId = session.metadata.userId
  const planId = session.metadata.planId
  const withTrial = session.metadata.withTrial === 'true'
  
  if (!userId || !planId) {
    console.error('Missing metadata in session:', session.id)
    return
  }

  // Get subscription details from Stripe to check trial status
  let isInTrial = false
  let trialEnd = null
  
  if (session.subscription) {
    const stripeSubscription = await stripe.subscriptions.retrieve(session.subscription)
    isInTrial = stripeSubscription.status === 'trialing'
    trialEnd = stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null
  }

  const durationDays = PLAN_DURATIONS[planId] || 30
  const expiresAt = trialEnd || new Date()
  if (!trialEnd) {
    expiresAt.setDate(expiresAt.getDate() + durationDays)
  }

  const updateData = {
    validated: true,
    'subscription.planId': planId,
    'subscription.status': isInTrial ? 'trialing' : 'active',
    'subscription.stripeSubscriptionId': session.subscription,
    'subscription.stripeCustomerId': session.customer,
    'subscription.startedAt': admin.firestore.FieldValue.serverTimestamp(),
    'subscription.expiresAt': admin.firestore.Timestamp.fromDate(expiresAt),
    'subscription.cancelAtPeriodEnd': false,
    'subscription.isTrialing': isInTrial,
    'subscription.trialEnd': trialEnd ? admin.firestore.Timestamp.fromDate(trialEnd) : null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }

  // If this was a trial subscription, mark trial as used permanently
  if (withTrial || isInTrial) {
    updateData.hasUsedTrial = true
    updateData.trialUsedAt = admin.firestore.FieldValue.serverTimestamp()
    updateData.trialPlanId = planId
  }

  await db.collection('users').doc(userId).update(updateData)

  console.log(`Subscription activated for user ${userId}, plan: ${planId}, trial: ${isInTrial}`)
}

async function handleSubscriptionUpdate(subscription) {
  const userId = subscription.metadata.userId
  
  if (!userId) {
    // Find user by customer ID
    let usersSnapshot = await db.collection('users')
      .where('subscription.stripeCustomerId', '==', subscription.customer)
      .get()
    
    if (usersSnapshot.empty) {
      console.log('Customer ID not found in update, trying subscription ID:', subscription.id)
      usersSnapshot = await db.collection('users')
        .where('subscription.stripeSubscriptionId', '==', subscription.id)
        .get()
    }
    
    if (usersSnapshot.empty) {
      console.error('No user found for customer:', subscription.customer)
      return
    }
    
    const userDoc = usersSnapshot.docs[0]
    await updateUserSubscription(userDoc.id, subscription)
  } else {
    await updateUserSubscription(userId, subscription)
  }
}

async function updateUserSubscription(userId, subscription) {
  const planId = subscription.metadata.planId || subscription.items.data[0]?.price?.metadata?.planId
  const status = subscription.status
  const cancelAtPeriodEnd = subscription.cancel_at_period_end
  
  const updateData = {
    'subscription.status': status,
    'subscription.cancelAtPeriodEnd': cancelAtPeriodEnd,
    'subscription.stripeCustomerId': subscription.customer,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }
  
  if (planId) {
    updateData['subscription.planId'] = planId
  }
  
  if (subscription.current_period_end) {
    updateData['subscription.expiresAt'] = admin.firestore.Timestamp.fromMillis(
      subscription.current_period_end * 1000
    )
  }
  
  // If subscription becomes active again (e.g. payment retry succeeded), clear failure flags
  if (status === 'active') {
    updateData['subscription.paymentFailed'] = false
    updateData['subscription.paymentFailedAt'] = null
    updateData['subscription.pastDueNotifiedAt'] = null
    updateData['subscription.pastDueEmailSent'] = false
    updateData['subscription.paymentAttemptCount'] = null
    updateData['subscription.nextPaymentAttempt'] = null
    updateData['subscription.gracePeriodEnd'] = null
  }
  
  // If subscription becomes past_due, set grace period if not already set
  if (status === 'past_due') {
    const userDoc = await db.collection('users').doc(userId).get()
    const userData = userDoc.data()
    if (!userData?.subscription?.gracePeriodEnd) {
      const gracePeriodEnd = new Date()
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7)
      updateData['subscription.gracePeriodEnd'] = admin.firestore.Timestamp.fromDate(gracePeriodEnd)
    }
  }
  
  await db.collection('users').doc(userId).update(updateData)
  console.log(`Subscription updated for user ${userId}, status: ${status}`)
}

async function handleSubscriptionDeleted(subscription) {
  const usersSnapshot = await db.collection('users')
    .where('subscription.stripeSubscriptionId', '==', subscription.id)
    .get()
  
  if (usersSnapshot.empty) {
    console.error('No user found for subscription:', subscription.id)
    return
  }
  
  const userDoc = usersSnapshot.docs[0]
  
  // Downgrade to free plan
  await db.collection('users').doc(userDoc.id).update({
    'subscription.planId': 'free',
    'subscription.status': 'expired',
    'subscription.stripeSubscriptionId': null,
    'subscription.expiresAt': null,
    'subscription.dataDeleteScheduledAt': admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    ),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  })
  
  console.log(`Subscription cancelled for user ${userDoc.id}`)
}

async function handlePaymentSucceeded(invoice) {
  console.log('Payment succeeded for invoice:', invoice.id)
  
  if (!invoice.subscription) {
    console.log('Not a subscription invoice, skipping')
    return
  }
  
  let usersSnapshot = await db.collection('users')
    .where('subscription.stripeCustomerId', '==', invoice.customer)
    .get()
  
  if (usersSnapshot.empty) {
    console.log('Customer ID not found, trying subscription ID:', invoice.subscription)
    usersSnapshot = await db.collection('users')
      .where('subscription.stripeSubscriptionId', '==', invoice.subscription)
      .get()
  }
  
  if (usersSnapshot.empty) {
    console.error('No user found for customer:', invoice.customer, 'or subscription:', invoice.subscription)
    return
  }
  
  const userDoc = usersSnapshot.docs[0]
  const userData = userDoc.data()
  const userId = userDoc.id
  
  let stripeSubscription
  try {
    stripeSubscription = await stripe.subscriptions.retrieve(invoice.subscription)
  } catch (err) {
    console.error('Error retrieving subscription:', err)
    return
  }
  
  // Get planId from Stripe metadata first, then from price metadata, then from Firestore
  // Important: userData.subscription.planId may be 'free' if checkExpiredSubscriptions already ran
  const stripePriceplanId = stripeSubscription.items?.data?.[0]?.price?.metadata?.planId
  const planId = stripeSubscription.metadata?.planId || stripePriceplanId || 
    (userData.subscription?.planId !== 'free' ? userData.subscription?.planId : null) ||
    userData.subscription?.previousPlanId || 'complete_monthly'
  
  // Use invoice line item period.end for accurate new period date
  // This is more reliable than subscription.current_period_end which may be stale
  const invoiceLineEnd = invoice.lines?.data?.[0]?.period?.end
  const currentPeriodEnd = stripeSubscription.current_period_end
    ? new Date(stripeSubscription.current_period_end * 1000)
    : null
  const invoicePeriodEnd = invoiceLineEnd
    ? new Date(invoiceLineEnd * 1000)
    : null
  
  // Prefer invoice line period end (most accurate for renewals), then subscription current_period_end
  let expiresAt = invoicePeriodEnd || currentPeriodEnd
  const now = new Date()
  
  if (!expiresAt || expiresAt <= now) {
    const durationDays = PLAN_DURATIONS[planId] || 30
    expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + durationDays)
    console.log(`Period end not in future, calculated expiresAt: ${expiresAt.toISOString()} for plan ${planId}`)
  }
  
  console.log(`Payment succeeded: invoicePeriodEnd=${invoicePeriodEnd?.toISOString()}, currentPeriodEnd=${currentPeriodEnd?.toISOString()}, final expiresAt=${expiresAt.toISOString()}`)
  
  const updateData = {
    'subscription.status': 'active',
    'subscription.stripeCustomerId': invoice.customer,
    'subscription.paymentFailed': false,
    'subscription.paymentFailedAt': null,
    'subscription.pastDueNotifiedAt': null,
    'subscription.pastDueEmailSent': false,
    'subscription.paymentAttemptCount': null,
    'subscription.nextPaymentAttempt': null,
    'subscription.gracePeriodEnd': null,
    'subscription.expiresAt': admin.firestore.Timestamp.fromDate(expiresAt),
    'subscription.planId': planId,
    'subscription.dataDeleteScheduledAt': null,
    'subscription.previousPlanId': null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }
  
  if (invoice.billing_reason === 'subscription_cycle') {
    updateData['subscription.hasBeenRenewed'] = true
    updateData['subscription.lastRenewedAt'] = admin.firestore.FieldValue.serverTimestamp()
  }
  
  await db.collection('users').doc(userId).update(updateData)
  
  if (userData.subscription?.paymentFailed) {
    const userName = userData.displayName || userData.firstName || 'Utilisateur'
    const userLang = userData.preferredLanguage || 'fr'
    const template = getPaymentRecoveredEmailTemplate(userName, userLang, planId)
    await sendEmail(userData.email, template.subject, template.html)
    
    await db.collection('notifications').add({
      userId: userId,
      type: 'payment_recovered',
      message: getPaymentRecoveredNotification(userLang),
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    })
  }
  
  console.log(`Payment succeeded and subscription restored for user ${userId}, plan: ${planId}`)
}

async function handlePaymentFailed(invoice) {
  console.log('Payment failed for invoice:', invoice.id)
  
  let usersSnapshot = await db.collection('users')
    .where('subscription.stripeCustomerId', '==', invoice.customer)
    .get()
  
  if (usersSnapshot.empty && invoice.subscription) {
    console.log('Customer ID not found in payment failed, trying subscription ID:', invoice.subscription)
    usersSnapshot = await db.collection('users')
      .where('subscription.stripeSubscriptionId', '==', invoice.subscription)
      .get()
  }
  
  if (usersSnapshot.empty) {
    console.error('No user found for customer:', invoice.customer)
    return
  }
  
  const userDoc = usersSnapshot.docs[0]
  const userData = userDoc.data()
  const userId = userDoc.id
  const userLang = userData.preferredLanguage || 'fr'
  const userName = userData.displayName || userData.firstName || 'Utilisateur'
  
  // Determine attempt number from Stripe invoice
  const attemptCount = invoice.attempt_count || 1
  const nextAttempt = invoice.next_payment_attempt 
    ? new Date(invoice.next_payment_attempt * 1000) 
    : null
  
  // Update user subscription with payment failure info
  // Keep subscription status as 'past_due' (grace period) instead of immediately revoking
  const updateData = {
    'subscription.paymentFailed': true,
    'subscription.paymentFailedAt': admin.firestore.FieldValue.serverTimestamp(),
    'subscription.status': 'past_due',
    'subscription.paymentAttemptCount': attemptCount,
    'subscription.nextPaymentAttempt': nextAttempt 
      ? admin.firestore.Timestamp.fromDate(nextAttempt) 
      : null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }
  
  // Grant a 7-day grace period from the first failure
  if (!userData.subscription?.paymentFailed) {
    const gracePeriodEnd = new Date()
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7)
    updateData['subscription.gracePeriodEnd'] = admin.firestore.Timestamp.fromDate(gracePeriodEnd)
  }
  
  await db.collection('users').doc(userId).update(updateData)
  
  // Get the Stripe customer portal URL for updating payment method
  let updatePaymentUrl = 'https://hugoquiz.com/settings'
  try {
    if (userData.subscription?.stripeCustomerId) {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: userData.subscription.stripeCustomerId,
        return_url: 'https://hugoquiz.com/settings'
      })
      updatePaymentUrl = portalSession.url
    }
  } catch (portalError) {
    console.error('Error creating portal session for failed payment email:', portalError)
  }
  
  // Add in-app notification for user
  await db.collection('notifications').add({
    userId: userId,
    type: 'payment_failed',
    message: getPaymentFailedNotification(userLang, attemptCount),
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  })
  
  // Send email notification with payment update link
  const template = getPaymentFailedEmailTemplate(
    userName, 
    userLang, 
    updatePaymentUrl, 
    attemptCount, 
    nextAttempt,
    userData.subscription?.planId
  )
  const emailSent = await sendEmail(userData.email, template.subject, template.html)
  
  if (emailSent) {
    await db.collection('users').doc(userId).update({
      'subscription.pastDueEmailSent': true,
      'subscription.pastDueNotifiedAt': admin.firestore.FieldValue.serverTimestamp()
    })
  }
  
  // Notify admins about the failed payment
  const adminsSnapshot = await db.collection('users').where('role', '==', 'admin').get()
  for (const adminDoc of adminsSnapshot.docs) {
    await db.collection('adminNotifications').add({
      type: 'payment_failed',
      userId: userId,
      userEmail: userData.email,
      userName: userName,
      attemptCount: attemptCount,
      message: `Échec de paiement pour ${userName} (${userData.email}) - Tentative #${attemptCount}`,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    })
  }
  
  console.log(`Payment failed for user ${userId}, attempt #${attemptCount}. Email sent: ${emailSent}`)
}

// ==================== ADMIN: SYNC SUBSCRIPTION FROM STRIPE ====================
exports.adminSyncSubscription = functions.https.onCall(async (data, context) => {
  // Verify caller is admin
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required')
  }
  
  const callerDoc = await db.collection('users').doc(context.auth.uid).get()
  if (!callerDoc.exists || callerDoc.data().role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required')
  }
  
  const { userId } = data
  if (!userId) {
    throw new functions.https.HttpsError('invalid-argument', 'userId is required')
  }
  
  const userDoc = await db.collection('users').doc(userId).get()
  if (!userDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'User not found')
  }
  
  const userData = userDoc.data()
  const sub = userData.subscription || {}
  
  if (!sub.stripeSubscriptionId) {
    throw new functions.https.HttpsError('failed-precondition', 'User has no Stripe subscription')
  }
  
  try {
    const stripeSub = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId)
    
    const planId = stripeSub.metadata?.planId || 
      stripeSub.items?.data?.[0]?.price?.metadata?.planId || 
      sub.planId
    
    const expiresAt = stripeSub.current_period_end 
      ? new Date(stripeSub.current_period_end * 1000) 
      : null
    
    const updateData = {
      'subscription.status': stripeSub.status,
      'subscription.planId': planId,
      'subscription.cancelAtPeriodEnd': stripeSub.cancel_at_period_end,
      'subscription.stripeCustomerId': stripeSub.customer,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }
    
    if (expiresAt) {
      updateData['subscription.expiresAt'] = admin.firestore.Timestamp.fromDate(expiresAt)
    }
    
    // Clear failure flags if active
    if (stripeSub.status === 'active') {
      updateData['subscription.paymentFailed'] = false
      updateData['subscription.paymentFailedAt'] = null
      updateData['subscription.pastDueEmailSent'] = false
      updateData['subscription.pastDueNotifiedAt'] = null
      updateData['subscription.paymentAttemptCount'] = null
      updateData['subscription.gracePeriodEnd'] = null
      updateData['subscription.dataDeleteScheduledAt'] = null
      updateData['subscription.previousPlanId'] = null
    }
    
    await db.collection('users').doc(userId).update(updateData)
    
    console.log(`Admin synced subscription for user ${userId}: status=${stripeSub.status}, planId=${planId}, expiresAt=${expiresAt?.toISOString()}`)
    
    return { 
      success: true, 
      status: stripeSub.status, 
      planId, 
      expiresAt: expiresAt?.toISOString(),
      cancelAtPeriodEnd: stripeSub.cancel_at_period_end
    }
  } catch (err) {
    console.error(`Error syncing subscription for user ${userId}:`, err)
    throw new functions.https.HttpsError('internal', `Stripe error: ${err.message}`)
  }
})

// ==================== SCHEDULED FUNCTIONS ====================

// Check for expired grace periods (past_due subscriptions past 7-day grace)
exports.checkExpiredGracePeriods = functions.pubsub
  .schedule('every 6 hours')
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now()
    
    // Find users with past_due status whose grace period has ended
    const pastDueSnapshot = await db.collection('users')
      .where('subscription.status', '==', 'past_due')
      .where('subscription.gracePeriodEnd', '<=', now)
      .get()
    
    console.log(`Found ${pastDueSnapshot.size} users with expired grace period`)
    
    for (const userDoc of pastDueSnapshot.docs) {
      const userData = userDoc.data()
      const userId = userDoc.id
      const userLang = userData.preferredLanguage || 'fr'
      const userName = userData.displayName || userData.firstName || 'Utilisateur'
      
      // Downgrade to free plan
      await db.collection('users').doc(userId).update({
        'subscription.planId': 'free',
        'subscription.status': 'expired',
        'subscription.paymentFailed': false,
        'subscription.gracePeriodEnd': null,
        'subscription.dataDeleteScheduledAt': admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        ),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })
      
      // Send notification
      const notifMessages = {
        fr: 'Votre abonnement a été suspendu suite à un échec de paiement non résolu. Renouvelez pour retrouver l\'accès.',
        en: 'Your subscription has been suspended due to unresolved payment failure. Renew to regain access.',
        de: 'Ihr Abonnement wurde aufgrund einer nicht behobenen Zahlungsstörung ausgesetzt. Verlängern Sie, um wieder Zugang zu erhalten.',
        nl: 'Uw abonnement is opgeschort vanwege een onopgelost betalingsprobleem. Verleng om weer toegang te krijgen.'
      }
      
      await db.collection('notifications').add({
        userId: userId,
        type: 'subscription_suspended',
        message: notifMessages[userLang] || notifMessages['fr'],
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      })
      
      // Send email about suspension
      const template = getSubscriptionSuspendedEmailTemplate(userName, userLang)
      await sendEmail(userData.email, template.subject, template.html)
      
      console.log(`Grace period expired for user ${userId}, subscription suspended`)
    }
    
    console.log(`Processed ${pastDueSnapshot.size} expired grace periods`)
    return null
  })

// Subscription Suspended Email Template (after grace period expires)
function getSubscriptionSuspendedEmailTemplate(userName, lang = 'fr') {
  const templates = {
    fr: {
      subject: '🔴 Abonnement suspendu - HugoQuiz',
      html: `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #991b1b 0%, #dc2626 100%); padding: 40px 20px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 26px;">🔴 Abonnement suspendu</h1>
    </div>
    <div style="padding: 40px 30px;">
      <p style="font-size: 18px; color: #333;">Bonjour <strong>${userName}</strong>,</p>
      <p style="font-size: 16px; color: #555; line-height: 1.6;">
        La période de grâce de 7 jours est terminée et votre paiement n'a pas pu être traité. 
        Votre abonnement a été suspendu et vous êtes revenu au forfait gratuit.
      </p>
      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
        <h3 style="color: #991b1b; margin: 0 0 10px 0;">⏰ Vos données seront supprimées dans 30 jours</h3>
        <p style="color: #555; margin: 0;">Réabonnez-vous dès maintenant pour conserver tous vos questionnaires, événements et données.</p>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://hugoquiz.com/pricing" 
           style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                  color: white; padding: 16px 40px; text-decoration: none; border-radius: 30px; 
                  font-weight: bold; font-size: 16px;">Se réabonner</a>
      </div>
    </div>
    <div style="background-color: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #e0e0e0;">
      <p style="color: #aaa; margin: 0; font-size: 12px;">© ${new Date().getFullYear()} HugoQuiz - Tous droits réservés</p>
    </div>
  </div>
</body>
</html>`
    },
    en: {
      subject: '🔴 Subscription Suspended - HugoQuiz',
      html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #991b1b 0%, #dc2626 100%); padding: 40px 20px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 26px;">🔴 Subscription Suspended</h1>
    </div>
    <div style="padding: 40px 30px;">
      <p style="font-size: 18px; color: #333;">Hello <strong>${userName}</strong>,</p>
      <p style="font-size: 16px; color: #555; line-height: 1.6;">
        The 7-day grace period has ended and your payment could not be processed. 
        Your subscription has been suspended and you have been reverted to the free plan.
      </p>
      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
        <h3 style="color: #991b1b; margin: 0 0 10px 0;">⏰ Your data will be deleted in 30 days</h3>
        <p style="color: #555; margin: 0;">Resubscribe now to keep all your questionnaires, events, and data.</p>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://hugoquiz.com/pricing" 
           style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                  color: white; padding: 16px 40px; text-decoration: none; border-radius: 30px; 
                  font-weight: bold; font-size: 16px;">Resubscribe</a>
      </div>
    </div>
    <div style="background-color: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #e0e0e0;">
      <p style="color: #aaa; margin: 0; font-size: 12px;">© ${new Date().getFullYear()} HugoQuiz - All rights reserved</p>
    </div>
  </div>
</body>
</html>`
    },
    de: {
      subject: '🔴 Abonnement ausgesetzt - HugoQuiz',
      html: `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #991b1b 0%, #dc2626 100%); padding: 40px 20px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 26px;">🔴 Abonnement ausgesetzt</h1>
    </div>
    <div style="padding: 40px 30px;">
      <p style="font-size: 18px; color: #333;">Hallo <strong>${userName}</strong>,</p>
      <p style="font-size: 16px; color: #555; line-height: 1.6;">
        Die 7-tägige Kulanzfrist ist abgelaufen und Ihre Zahlung konnte nicht verarbeitet werden. 
        Ihr Abonnement wurde ausgesetzt und Sie wurden auf den kostenlosen Plan zurückgesetzt.
      </p>
      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
        <h3 style="color: #991b1b; margin: 0 0 10px 0;">⏰ Ihre Daten werden in 30 Tagen gelöscht</h3>
        <p style="color: #555; margin: 0;">Abonnieren Sie jetzt erneut, um alle Ihre Fragebögen, Events und Daten zu behalten.</p>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://hugoquiz.com/pricing" 
           style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                  color: white; padding: 16px 40px; text-decoration: none; border-radius: 30px; 
                  font-weight: bold; font-size: 16px;">Erneut abonnieren</a>
      </div>
    </div>
    <div style="background-color: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #e0e0e0;">
      <p style="color: #aaa; margin: 0; font-size: 12px;">© ${new Date().getFullYear()} HugoQuiz - Alle Rechte vorbehalten</p>
    </div>
  </div>
</body>
</html>`
    },
    nl: {
      subject: '🔴 Abonnement opgeschort - HugoQuiz',
      html: `
<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #991b1b 0%, #dc2626 100%); padding: 40px 20px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 26px;">🔴 Abonnement opgeschort</h1>
    </div>
    <div style="padding: 40px 30px;">
      <p style="font-size: 18px; color: #333;">Hallo <strong>${userName}</strong>,</p>
      <p style="font-size: 16px; color: #555; line-height: 1.6;">
        De respijtperiode van 7 dagen is verlopen en uw betaling kon niet worden verwerkt. 
        Uw abonnement is opgeschort en u bent teruggezet naar het gratis plan.
      </p>
      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
        <h3 style="color: #991b1b; margin: 0 0 10px 0;">⏰ Uw gegevens worden over 30 dagen verwijderd</h3>
        <p style="color: #555; margin: 0;">Abonneer u nu opnieuw om al uw vragenlijsten, evenementen en gegevens te behouden.</p>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://hugoquiz.com/pricing" 
           style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                  color: white; padding: 16px 40px; text-decoration: none; border-radius: 30px; 
                  font-weight: bold; font-size: 16px;">Opnieuw abonneren</a>
      </div>
    </div>
    <div style="background-color: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #e0e0e0;">
      <p style="color: #aaa; margin: 0; font-size: 12px;">© ${new Date().getFullYear()} HugoQuiz - Alle rechten voorbehouden</p>
    </div>
  </div>
</body>
</html>`
    }
  }
  return templates[lang] || templates['fr']
}

// Check for expired subscriptions daily
exports.checkExpiredSubscriptions = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now()
    
    // Find expired subscriptions
    const expiredSnapshot = await db.collection('users')
      .where('subscription.status', '==', 'active')
      .where('subscription.expiresAt', '<=', now)
      .get()
    
    const batch = db.batch()
    let processedCount = 0
    let skippedCount = 0
    
    for (const doc of expiredSnapshot.docs) {
      const userData = doc.data()
      const sub = userData.subscription || {}
      
      // IMPORTANT: Skip Stripe-managed subscriptions that are NOT cancelled at period end
      // Stripe handles renewal automatically - the webhook will update expiresAt
      // Only expire if: no stripeSubscriptionId (admin-granted) OR cancelAtPeriodEnd is true
      if (sub.stripeSubscriptionId && !sub.cancelAtPeriodEnd) {
        // Double-check with Stripe if the subscription is still active
        try {
          const stripeSub = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId)
          if (stripeSub.status === 'active' || stripeSub.status === 'trialing') {
            // Stripe says it's still active - update expiresAt from Stripe and skip
            const newExpiresAt = new Date(stripeSub.current_period_end * 1000)
            if (newExpiresAt > new Date()) {
              batch.update(doc.ref, {
                'subscription.expiresAt': admin.firestore.Timestamp.fromDate(newExpiresAt),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
              })
              skippedCount++
              console.log(`Skipped user ${doc.id}: Stripe subscription still active until ${newExpiresAt.toISOString()}`)
              continue
            }
          }
        } catch (stripeErr) {
          console.log(`Could not verify Stripe subscription ${sub.stripeSubscriptionId} for user ${doc.id}:`, stripeErr.message)
          // If we can't verify, give a 2-hour grace period to allow webhook to process
          const expiresAt = sub.expiresAt?.toDate ? sub.expiresAt.toDate() : new Date(sub.expiresAt)
          const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
          if (expiresAt > twoHoursAgo) {
            skippedCount++
            console.log(`Skipped user ${doc.id}: expired less than 2 hours ago, waiting for Stripe webhook`)
            continue
          }
        }
      }
      
      // Save the previous planId before downgrading (in case webhook arrives late)
      batch.update(doc.ref, {
        'subscription.previousPlanId': sub.planId,
        'subscription.planId': 'free',
        'subscription.status': 'expired',
        'subscription.dataDeleteScheduledAt': admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        ),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })
      processedCount++
      
      // Send expiration notification
      db.collection('notifications').add({
        userId: doc.id,
        type: 'subscription_expired',
        message: 'Votre abonnement a expiré. Vos données seront supprimées dans 30 jours si vous ne renouvelez pas.',
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      })
    }
    
    await batch.commit()
    console.log(`Processed ${processedCount} expired subscriptions, skipped ${skippedCount} Stripe-managed`)
    
    return null
  })

// Delete data for non-renewed subscriptions after 30 days
exports.cleanupExpiredData = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now()
    
    // Find users with scheduled data deletion
    const toDeleteSnapshot = await db.collection('users')
      .where('subscription.dataDeleteScheduledAt', '<=', now)
      .get()
    
    for (const userDoc of toDeleteSnapshot.docs) {
      const userId = userDoc.id
      
      // Delete questionnaires
      const questionnairesSnapshot = await db.collection('questionnaires')
        .where('userId', '==', userId)
        .get()
      
      for (const qDoc of questionnairesSnapshot.docs) {
        await qDoc.ref.delete()
      }
      
      // Delete events
      const eventsSnapshot = await db.collection('events')
        .where('userId', '==', userId)
        .get()
      
      for (const eDoc of eventsSnapshot.docs) {
        await eDoc.ref.delete()
      }
      
      // Clear the deletion schedule
      await userDoc.ref.update({
        'subscription.dataDeleteScheduledAt': null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })
      
      // Notify user
      await db.collection('notifications').add({
        userId: userId,
        type: 'data_deleted',
        message: 'Vos questionnaires et événements ont été supprimés suite à l\'expiration de votre abonnement.',
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      })
      
      console.log(`Deleted data for user ${userId}`)
    }
    
    return null
  })

// Send expiration warning 7 days before
exports.sendExpirationWarnings = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const sevenDaysFromNow = new Date()
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
    
    const warningSnapshot = await db.collection('users')
      .where('subscription.status', '==', 'active')
      .where('subscription.expiresAt', '<=', admin.firestore.Timestamp.fromDate(sevenDaysFromNow))
      .where('subscription.expiresAt', '>', admin.firestore.Timestamp.now())
      .get()
    
    for (const userDoc of warningSnapshot.docs) {
      const userData = userDoc.data()
      
      // Check if we already sent a warning
      const existingWarning = await db.collection('notifications')
        .where('userId', '==', userDoc.id)
        .where('type', '==', 'subscription_expiring_soon')
        .where('createdAt', '>', admin.firestore.Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000)))
        .get()
      
      if (existingWarning.empty) {
        await db.collection('notifications').add({
          userId: userDoc.id,
          type: 'subscription_expiring_soon',
          message: 'Votre abonnement expire dans 7 jours. Renouvelez pour conserver vos données.',
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        })
      }
    }
    
    console.log(`Sent ${warningSnapshot.size} expiration warnings`)
    return null
  })

// ==================== ADMIN FUNCTIONS ====================

// Plan types available for admin to grant
const ADMIN_GRANT_PLANS = {
  'free': { duration: null, name: 'Gratuit', access: ['quiz'] },
  'quiz_monthly': { duration: 30, name: 'Quiz Pro (1 mois)', access: ['quiz'] },
  'quiz_yearly': { duration: 365, name: 'Quiz Pro (1 an)', access: ['quiz'] },
  'events_monthly': { duration: 30, name: 'Événements Pro (1 mois)', access: ['events', 'questionnaires'] },
  'events_yearly': { duration: 365, name: 'Événements Pro (1 an)', access: ['events', 'questionnaires'] },
  'complete_monthly': { duration: 30, name: 'Complet Pro (1 mois)', access: ['quiz', 'events', 'questionnaires'] },
  'complete_yearly': { duration: 365, name: 'Complet Pro (1 an)', access: ['quiz', 'events', 'questionnaires'] }
}

// Grant free access to a user (callable by admin)
exports.grantFreeAccess = functions.https.onCall(async (data, context) => {
  // Check if caller is admin
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in')
  }
  
  const callerDoc = await db.collection('users').doc(context.auth.uid).get()
  if (callerDoc.data()?.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Must be admin')
  }
  
  const { targetUserId, planType } = data // planType: 'quiz_monthly', 'quiz_yearly', 'events_monthly', etc.
  
  if (!targetUserId || !planType) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing targetUserId or planType')
  }
  
  const planConfig = ADMIN_GRANT_PLANS[planType]
  if (!planConfig) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid planType. Must be one of: ' + Object.keys(ADMIN_GRANT_PLANS).join(', '))
  }
  
  // Handle free plan (no expiration) vs pro plans
  let updateData = {
    validated: true,
    'subscription.planId': planType,
    'subscription.status': 'active',
    'subscription.startedAt': admin.firestore.FieldValue.serverTimestamp(),
    'subscription.grantedBy': context.auth.uid,
    'subscription.isAdminGranted': planType !== 'free',
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }
  
  // Mark that user has had admin-granted access (disables trial permanently)
  if (planType !== 'free') {
    updateData.hadAdminGrantedAccess = true
    updateData.adminGrantedAt = admin.firestore.FieldValue.serverTimestamp()
  }
  
  if (planType === 'free') {
    // Free plan - no expiration, reset to free tier
    updateData['subscription.expiresAt'] = null
    updateData['subscription.stripeSubscriptionId'] = null
    updateData['subscription.cancelAtPeriodEnd'] = false
  } else {
    // Pro plan - set expiration date
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + planConfig.duration)
    updateData['subscription.expiresAt'] = admin.firestore.Timestamp.fromDate(expiresAt)
  }
  
  await db.collection('users').doc(targetUserId).update(updateData)
  
  // Notify user
  const notificationMessage = planType === 'free' 
    ? `Votre abonnement a été remis au plan Gratuit par l'administrateur.`
    : `L'administrateur vous a accordé un accès "${planConfig.name}".`
    
  await db.collection('notifications').add({
    userId: targetUserId,
    type: planType === 'free' ? 'plan_reset' : 'access_granted',
    message: notificationMessage,
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  })
  
  return { success: true, planName: planConfig.name }
})

// Revoke admin-granted access (callable by admin only)
exports.revokeAccess = functions.https.onCall(async (data, context) => {
  // Check if caller is admin
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in')
  }
  
  const callerDoc = await db.collection('users').doc(context.auth.uid).get()
  if (callerDoc.data()?.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Must be admin')
  }
  
  const { targetUserId } = data
  
  if (!targetUserId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing targetUserId')
  }
  
  // Get user's current subscription
  const targetUserDoc = await db.collection('users').doc(targetUserId).get()
  const subscription = targetUserDoc.data()?.subscription
  
  if (!subscription?.isAdminGranted) {
    throw new functions.https.HttpsError('failed-precondition', 'Cet utilisateur n\'a pas de forfait accordé par un admin')
  }
  
  // Reset to free plan
  await db.collection('users').doc(targetUserId).update({
    'subscription.planId': 'free',
    'subscription.status': 'active',
    'subscription.expiresAt': null,
    'subscription.isAdminGranted': false,
    'subscription.grantedBy': null,
    'subscription.revokedAt': admin.firestore.FieldValue.serverTimestamp(),
    'subscription.revokedBy': context.auth.uid,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  })
  
  // Notify user
  await db.collection('notifications').add({
    userId: targetUserId,
    type: 'access_revoked',
    message: 'Votre accès premium a été révoqué par l\'administrateur. Vous êtes revenu au plan Gratuit.',
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  })
  
  return { success: true, message: 'Accès révoqué avec succès' }
})

// Renounce admin-granted access (callable by user themselves)
exports.renounceAccess = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in')
  }
  
  const userId = context.auth.uid
  const userDoc = await db.collection('users').doc(userId).get()
  const subscription = userDoc.data()?.subscription
  
  if (!subscription?.isAdminGranted) {
    throw new functions.https.HttpsError('failed-precondition', 'Vous n\'avez pas de forfait accordé par un admin')
  }
  
  // Reset to free plan
  await db.collection('users').doc(userId).update({
    'subscription.planId': 'free',
    'subscription.status': 'active',
    'subscription.expiresAt': null,
    'subscription.isAdminGranted': false,
    'subscription.grantedBy': null,
    'subscription.renouncedAt': admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  })
  
  return { success: true, message: 'Vous êtes revenu au plan Gratuit' }
})

// ==================== CANCELLATION FUNCTIONS ====================

// Check if user can get a refund (within 30 minutes of initial subscription)
exports.checkRefundEligibility = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in')
  }
  
  const userId = context.auth.uid
  const userDoc = await db.collection('users').doc(userId).get()
  const subscription = userDoc.data()?.subscription
  
  if (!subscription || !subscription.startedAt) {
    return { 
      canRefund: false, 
      canCancelRenewal: false,
      message: 'Aucun abonnement actif'
    }
  }
  
  const startedAt = subscription.startedAt.toDate()
  const now = new Date()
  const minutesSinceStart = (now - startedAt) / (1000 * 60)
  
  // Check if within 30 minutes of initial subscription
  const canRefund = minutesSinceStart <= 30 && !subscription.hasBeenRenewed
  
  // Check if can cancel renewal (48 hours before next renewal)
  let canCancelRenewal = false
  let hoursUntilRenewal = null
  
  if (subscription.expiresAt) {
    const expiresAt = subscription.expiresAt.toDate()
    const hoursRemaining = (expiresAt - now) / (1000 * 60 * 60)
    hoursUntilRenewal = Math.floor(hoursRemaining)
    canCancelRenewal = hoursRemaining > 48 && !subscription.cancelAtPeriodEnd
  }
  
  return {
    canRefund,
    canCancelRenewal,
    hoursUntilRenewal,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd || false,
    minutesSinceStart: Math.floor(minutesSinceStart),
    message: canRefund 
      ? `Remboursement possible (${Math.floor(30 - minutesSinceStart)} minutes restantes)`
      : canCancelRenewal 
        ? `Vous pouvez annuler le renouvellement (${hoursUntilRenewal} heures avant le renouvellement)`
        : subscription.cancelAtPeriodEnd
          ? 'Le renouvellement est déjà annulé'
          : 'Annulation du renouvellement non possible (moins de 48h avant le renouvellement)'
  }
})

// Request refund (only within 30 minutes)
exports.requestRefund = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in')
  }
  
  const userId = context.auth.uid
  const userDoc = await db.collection('users').doc(userId).get()
  const subscription = userDoc.data()?.subscription
  
  if (!subscription?.startedAt) {
    throw new functions.https.HttpsError('failed-precondition', 'Aucun abonnement actif')
  }
  
  const startedAt = subscription.startedAt.toDate()
  const now = new Date()
  const minutesSinceStart = (now - startedAt) / (1000 * 60)
  
  // Check 30 minute window
  if (minutesSinceStart > 30) {
    throw new functions.https.HttpsError(
      'failed-precondition', 
      'Le délai de 30 minutes pour le remboursement est dépassé'
    )
  }
  
  // Check if already renewed
  if (subscription.hasBeenRenewed) {
    throw new functions.https.HttpsError(
      'failed-precondition', 
      'Le remboursement n\'est pas possible après un renouvellement'
    )
  }
  
  try {
    // Cancel the subscription immediately in Stripe
    if (subscription.stripeSubscriptionId) {
      await stripe.subscriptions.cancel(subscription.stripeSubscriptionId, {
        prorate: true,
        invoice_now: false
      })
      
      // Issue refund for the payment
      const subscriptionData = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId)
      if (subscriptionData.latest_invoice) {
        const invoice = await stripe.invoices.retrieve(subscriptionData.latest_invoice)
        if (invoice.payment_intent) {
          await stripe.refunds.create({
            payment_intent: invoice.payment_intent
          })
        }
      }
    }
    
    // Update user subscription to free
    await db.collection('users').doc(userId).update({
      'subscription.planId': 'FREE',
      'subscription.status': 'refunded',
      'subscription.stripeSubscriptionId': null,
      'subscription.refundedAt': admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    })
    
    return { success: true, message: 'Remboursement effectué avec succès' }
  } catch (error) {
    console.error('Refund error:', error)
    throw new functions.https.HttpsError('internal', 'Erreur lors du remboursement')
  }
})

// Cancel renewal (must be at least 48 hours before renewal)
exports.cancelRenewal = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in')
  }
  
  const userId = context.auth.uid
  const userDoc = await db.collection('users').doc(userId).get()
  const subscription = userDoc.data()?.subscription
  
  if (!subscription?.stripeSubscriptionId) {
    throw new functions.https.HttpsError('failed-precondition', 'Aucun abonnement Stripe actif')
  }
  
  if (!subscription.expiresAt) {
    throw new functions.https.HttpsError('failed-precondition', 'Date d\'expiration non définie')
  }
  
  const expiresAt = subscription.expiresAt.toDate()
  const now = new Date()
  const hoursRemaining = (expiresAt - now) / (1000 * 60 * 60)
  
  // Check 48 hour window
  if (hoursRemaining <= 48) {
    throw new functions.https.HttpsError(
      'failed-precondition', 
      `Annulation impossible : moins de 48 heures avant le renouvellement (${Math.floor(hoursRemaining)}h restantes). Le prochain paiement sera effectué.`
    )
  }
  
  try {
    // Cancel at period end in Stripe
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true
    })
    
    // Update user subscription
    await db.collection('users').doc(userId).update({
      'subscription.cancelAtPeriodEnd': true,
      'subscription.cancelledAt': admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    })
    
    return { 
      success: true, 
      message: 'Renouvellement annulé. Votre abonnement reste actif jusqu\'à la fin de la période en cours.' 
    }
  } catch (error) {
    console.error('Cancel renewal error:', error)
    throw new functions.https.HttpsError('internal', 'Erreur lors de l\'annulation')
  }
})

// Cancel trial subscription immediately (during trial period only)
exports.cancelTrial = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in')
  }
  
  const userId = context.auth.uid
  const userDoc = await db.collection('users').doc(userId).get()
  const userData = userDoc.data()
  const subscription = userData?.subscription
  
  if (!subscription?.stripeSubscriptionId) {
    throw new functions.https.HttpsError('failed-precondition', 'Aucun abonnement Stripe actif')
  }
  
  // Check if user is in trial
  if (!subscription.isTrialing && subscription.status !== 'trialing') {
    throw new functions.https.HttpsError(
      'failed-precondition', 
      'Cette fonction est réservée aux utilisateurs en période d\'essai'
    )
  }
  
  try {
    // Cancel subscription immediately in Stripe
    await stripe.subscriptions.cancel(subscription.stripeSubscriptionId)
    
    // Update user subscription to free
    await db.collection('users').doc(userId).update({
      'subscription.planId': 'free',
      'subscription.status': 'cancelled',
      'subscription.stripeSubscriptionId': null,
      'subscription.isTrialing': false,
      'subscription.trialEnd': null,
      'subscription.cancelledAt': admin.firestore.FieldValue.serverTimestamp(),
      'subscription.expiresAt': null,
      // Keep hasUsedTrial = true so they can't use trial again
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    })
    
    return { 
      success: true, 
      message: 'Votre essai gratuit a été résilié. Vous êtes revenu au forfait gratuit.' 
    }
  } catch (error) {
    console.error('Cancel trial error:', error)
    throw new functions.https.HttpsError('internal', 'Erreur lors de la résiliation de l\'essai')
  }
})

// Reactivate subscription (undo cancel at period end)
exports.reactivateSubscription = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in')
  }
  
  const userId = context.auth.uid
  const userDoc = await db.collection('users').doc(userId).get()
  const subscription = userDoc.data()?.subscription
  
  if (!subscription?.stripeSubscriptionId || !subscription.cancelAtPeriodEnd) {
    throw new functions.https.HttpsError('failed-precondition', 'Aucun abonnement à réactiver')
  }
  
  try {
    // Remove cancel at period end in Stripe
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: false
    })
    
    // Update user subscription
    await db.collection('users').doc(userId).update({
      'subscription.cancelAtPeriodEnd': false,
      'subscription.cancelledAt': null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    })
    
    return { 
      success: true, 
      message: 'Votre abonnement sera renouvelé automatiquement.' 
    }
  } catch (error) {
    console.error('Reactivate error:', error)
    throw new functions.https.HttpsError('internal', 'Erreur lors de la réactivation')
  }
})

// ==================== STORAGE LIMIT FUNCTIONS ====================

const STORAGE_LIMIT_BYTES = 2 * 1024 * 1024 * 1024 // 2 GB
const STORAGE_WARNING_THRESHOLD = 0.9 // 90%

// Helper function to format bytes
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

// Trigger when user document is updated (storage, email, etc.)
exports.onUserUpdated = functions.firestore
  .document('users/{userId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data()
    const after = change.after.data()
    const userId = context.params.userId
    
    // ========== SYNC EMAIL WITH STRIPE ==========
    // Check if email changed
    if (before.email !== after.email && after.email) {
      const stripeCustomerId = after.subscription?.stripeCustomerId
      
      if (stripeCustomerId) {
        try {
          // Update customer email in Stripe
          await stripe.customers.update(stripeCustomerId, {
            email: after.email
          })
          console.log(`Updated Stripe customer ${stripeCustomerId} email to ${after.email}`)
        } catch (error) {
          console.error('Error updating Stripe customer email:', error)
        }
      }
    }
    
    // ========== STORAGE USAGE TRACKING ==========
    // Check if storage usage changed
    const beforeUsage = before.storageUsed || 0
    const afterUsage = after.storageUsed || 0
    
    if (beforeUsage === afterUsage) return null
    
    const limit = after.storageLimit || STORAGE_LIMIT_BYTES
    const percentage = (afterUsage / limit) * 100
    
    // Check if user crossed warning threshold
    const beforePercentage = (beforeUsage / limit) * 100
    
    if (percentage >= STORAGE_WARNING_THRESHOLD * 100 && beforePercentage < STORAGE_WARNING_THRESHOLD * 100) {
      // User just crossed 90% threshold - notify admin
      await notifyAdminAboutStorageWarning(userId, after, afterUsage, limit)
    }
    
    // Check if user reached limit
    if (percentage >= 100 && beforePercentage < 100) {
      // User just reached limit - notify admin
      await notifyAdminAboutStorageLimit(userId, after, afterUsage, limit)
    }
    
    return null
  })

// Send email to admin about storage warning
async function notifyAdminAboutStorageWarning(userId, userData, used, limit) {
  try {
    const adminsSnapshot = await db.collection('users').where('role', '==', 'admin').get()
    
    for (const adminDoc of adminsSnapshot.docs) {
      const adminEmail = adminDoc.data().email
      
      // Create notification in database
      await db.collection('adminNotifications').add({
        type: 'storage_warning',
        userId,
        userEmail: userData.email,
        userName: userData.displayName,
        storageUsed: used,
        storageLimit: limit,
        percentage: ((used / limit) * 100).toFixed(1),
        message: `L'utilisateur ${userData.displayName} (${userData.email}) a atteint ${((used / limit) * 100).toFixed(1)}% de son quota de stockage (${formatBytes(used)} / ${formatBytes(limit)}).`,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      })
      
      console.log(`Storage warning notification sent to admin for user ${userId}`)
    }
    
    // Send email to user about approaching limit
    if (userData.email) {
      const lastNotified = userData.storageNotifiedAt?.toDate?.()
      const now = new Date()
      
      // Only send email if not notified in the last 24 hours
      if (!lastNotified || (now - lastNotified) > 24 * 60 * 60 * 1000) {
        const emailSent = await sendEmail(
          userData.email,
          '⚠️ Espace de stockage HugoQuiz presque plein',
          `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
              .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
              .warning-box { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0; }
              .progress-bar { background: #e5e7eb; border-radius: 10px; height: 20px; margin: 15px 0; }
              .progress-fill { background: linear-gradient(90deg, #f59e0b, #ef4444); height: 100%; border-radius: 10px; }
              .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
              .btn { display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 15px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>⚠️ Espace de stockage presque plein</h1>
              </div>
              <div class="content">
                <p>Bonjour <strong>${userData.displayName || 'cher utilisateur'}</strong>,</p>
                
                <div class="warning-box">
                  <strong>Attention :</strong> Votre espace de stockage HugoQuiz est presque plein.
                </div>
                
                <p><strong>Utilisation actuelle :</strong> ${formatBytes(used)} sur ${formatBytes(limit)}</p>
                
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${Math.min(100, (used / limit) * 100)}%"></div>
                </div>
                <p style="text-align: center; font-weight: bold;">${((used / limit) * 100).toFixed(1)}% utilisé</p>
                
                <p>Pour continuer à télécharger des fichiers, vous pouvez :</p>
                <ul>
                  <li>Supprimer des fichiers non utilisés</li>
                  <li>Contacter notre équipe pour augmenter votre quota</li>
                </ul>
                
                <p>Pour toute demande d'augmentation de stockage, contactez-nous à <a href="mailto:contact@hugoquiz.com">contact@hugoquiz.com</a>.</p>
                
                <a href="https://hugoquiz.web.app/dashboard" class="btn">Gérer mon espace</a>
                
                <div class="footer">
                  <p>Cet email a été envoyé automatiquement par HugoQuiz.</p>
                  <p>© ${new Date().getFullYear()} HugoQuiz - Tous droits réservés</p>
                </div>
              </div>
            </div>
          </body>
          </html>
          `
        )
        
        if (emailSent) {
          // Update user with notification timestamp
          await db.collection('users').doc(userId).update({
            storageNotifiedAt: admin.firestore.FieldValue.serverTimestamp(),
            storageNotificationType: 'warning'
          })
        }
      }
    }
  } catch (error) {
    console.error('Error sending storage warning:', error)
  }
}

// Send email to admin about storage limit reached
async function notifyAdminAboutStorageLimit(userId, userData, used, limit) {
  try {
    const adminsSnapshot = await db.collection('users').where('role', '==', 'admin').get()
    
    for (const adminDoc of adminsSnapshot.docs) {
      // Create notification in database
      await db.collection('adminNotifications').add({
        type: 'storage_limit_reached',
        userId,
        userEmail: userData.email,
        userName: userData.displayName,
        storageUsed: used,
        storageLimit: limit,
        message: `URGENT: L'utilisateur ${userData.displayName} (${userData.email}) a atteint sa limite de stockage de ${formatBytes(limit)}. Il ne peut plus télécharger de fichiers.`,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      })
      
      console.log(`Storage limit notification sent to admin for user ${userId}`)
    }
    
    // Send email to user about limit reached
    if (userData.email) {
      const emailSent = await sendEmail(
        userData.email,
        '🛑 Espace de stockage HugoQuiz épuisé',
        `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .error-box { background: #fee2e2; border: 1px solid #ef4444; border-radius: 8px; padding: 15px; margin: 20px 0; }
            .progress-bar { background: #e5e7eb; border-radius: 10px; height: 20px; margin: 15px 0; }
            .progress-fill { background: #ef4444; height: 100%; border-radius: 10px; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
            .btn { display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 15px; }
            .contact-box { background: #e0e7ff; border: 1px solid #818cf8; border-radius: 8px; padding: 15px; margin: 20px 0; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🛑 Espace de stockage épuisé</h1>
            </div>
            <div class="content">
              <p>Bonjour <strong>${userData.displayName || 'cher utilisateur'}</strong>,</p>
              
              <div class="error-box">
                <strong>Important :</strong> Votre espace de stockage HugoQuiz est épuisé. Vous ne pouvez plus télécharger de nouveaux fichiers.
              </div>
              
              <p><strong>Utilisation :</strong> ${formatBytes(used)} sur ${formatBytes(limit)}</p>
              
              <div class="progress-bar">
                <div class="progress-fill" style="width: 100%"></div>
              </div>
              <p style="text-align: center; font-weight: bold; color: #ef4444;">100% utilisé</p>
              
              <p>Pour débloquer votre compte et pouvoir à nouveau télécharger des fichiers :</p>
              <ul>
                <li>Supprimez des fichiers non utilisés pour libérer de l'espace</li>
                <li>Ou contactez-nous pour augmenter votre quota de stockage</li>
              </ul>
              
              <div class="contact-box">
                <p><strong>Besoin de plus d'espace ?</strong></p>
                <p>Contactez notre équipe à <a href="mailto:contact@hugoquiz.com">contact@hugoquiz.com</a></p>
                <p>Nous pourrons augmenter votre quota selon vos besoins.</p>
              </div>
              
              <a href="https://hugoquiz.com/dashboard" class="btn">Gérer mon espace</a>
              
              <div class="footer">
                <p>Cet email a été envoyé automatiquement par HugoQuiz.</p>
                <p>© ${new Date().getFullYear()} HugoQuiz - Tous droits réservés</p>
              </div>
            </div>
          </div>
        </body>
        </html>
        `
      )
      
      if (emailSent) {
        // Update user with notification timestamp
        await db.collection('users').doc(userId).update({
          storageNotifiedAt: admin.firestore.FieldValue.serverTimestamp(),
          storageNotificationType: 'limit_reached'
        })
      }
    }
  } catch (error) {
    console.error('Error sending storage limit notification:', error)
  }
}

// Admin function to increase user storage limit
exports.updateUserStorageLimit = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in')
  }
  
  // Check if caller is admin
  const callerDoc = await db.collection('users').doc(context.auth.uid).get()
  if (callerDoc.data()?.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required')
  }
  
  const { userId, newLimitGB } = data
  
  if (!userId || typeof newLimitGB !== 'number' || newLimitGB < 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid parameters')
  }
  
  try {
    const newLimitBytes = newLimitGB * 1024 * 1024 * 1024
    
    await db.collection('users').doc(userId).update({
      storageLimit: newLimitBytes,
      storageLimitUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      storageLimitUpdatedBy: context.auth.uid
    })
    
    return { 
      success: true, 
      message: `Limite de stockage mise à jour à ${newLimitGB} GB` 
    }
  } catch (error) {
    console.error('Update storage limit error:', error)
    throw new functions.https.HttpsError('internal', 'Erreur lors de la mise à jour')
  }
})

// Get user storage info (for admin)
exports.getUserStorageInfo = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in')
  }
  
  const { userId } = data
  const requesterId = context.auth.uid
  
  // User can only get their own info, unless admin
  const requesterDoc = await db.collection('users').doc(requesterId).get()
  const isAdmin = requesterDoc.data()?.role === 'admin'
  
  if (!isAdmin && userId !== requesterId) {
    throw new functions.https.HttpsError('permission-denied', 'Cannot access other user data')
  }
  
  try {
    const userDoc = await db.collection('users').doc(userId || requesterId).get()
    const userData = userDoc.data()
    
    const used = userData?.storageUsed || 0
    const limit = userData?.storageLimit || STORAGE_LIMIT_BYTES
    
    return {
      used,
      limit,
      usedFormatted: formatBytes(used),
      limitFormatted: formatBytes(limit),
      percentage: ((used / limit) * 100).toFixed(1),
      isAtLimit: used >= limit,
      isNearLimit: used >= limit * STORAGE_WARNING_THRESHOLD
    }
  } catch (error) {
    console.error('Get storage info error:', error)
    throw new functions.https.HttpsError('internal', 'Error getting storage info')
  }
})

// ==================== ACCOUNT DELETION FUNCTIONS ====================

/**
 * Delete user account
 * 
 * Logic:
 * - Free accounts: Immediate deletion
 * - Admin-granted accounts: Immediate deletion
 * - Stripe paid accounts: 
 *   - If renewal is in more than 48h OR already cancelled: immediate deletion
 *   - If renewal is in less than 48h AND not cancelled: mark as deleted, 
 *     allow Stripe to charge, then complete deletion
 */
exports.deleteAccount = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in')
  }
  
  const userId = context.auth.uid
  const userDoc = await db.collection('users').doc(userId).get()
  const userData = userDoc.data()
  
  if (!userData) {
    throw new functions.https.HttpsError('not-found', 'User not found')
  }
  
  const subscription = userData.subscription || {}
  const isStripeSubscription = subscription.stripeSubscriptionId && !subscription.isAdminGranted
  
  let pendingCharge = false
  let deletionDate = new Date()
  
  // Check if there's a pending Stripe charge
  if (isStripeSubscription && subscription.expiresAt) {
    const expiresAt = subscription.expiresAt.toDate()
    const now = new Date()
    const hoursUntilRenewal = (expiresAt - now) / (1000 * 60 * 60)
    
    // If less than 48h before renewal AND renewal is not cancelled
    if (hoursUntilRenewal <= 48 && !subscription.cancelAtPeriodEnd) {
      pendingCharge = true
      // Deletion will happen after the charge is processed
      deletionDate = new Date(expiresAt.getTime() + 24 * 60 * 60 * 1000) // 1 day after renewal
    }
  }
  
  try {
    // Cancel Stripe subscription if exists (prevent future renewals after the pending one)
    if (subscription.stripeSubscriptionId) {
      try {
        if (pendingCharge) {
          // Cancel at period end - the charge will still happen
          await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
            cancel_at_period_end: true
          })
        } else {
          // Cancel immediately
          await stripe.subscriptions.cancel(subscription.stripeSubscriptionId)
        }
      } catch (stripeError) {
        console.error('Stripe cancellation error:', stripeError)
        // Continue with deletion even if Stripe fails
      }
    }
    
    // Mark user as deleted in Firestore
    await db.collection('users').doc(userId).update({
      deleted: true,
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
      pendingCharge: pendingCharge,
      scheduledDeletionDate: pendingCharge 
        ? admin.firestore.Timestamp.fromDate(deletionDate)
        : null,
      // Keep minimal info for audit
      deletionInfo: {
        email: userData.email,
        displayName: userData.displayName,
        planId: subscription.planId,
        wasStripeSubscription: isStripeSubscription
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    })
    
    // Schedule complete data deletion (quizzes, events, etc.)
    if (!pendingCharge) {
      await scheduleCompleteDataDeletion(userId)
    }
    
    return {
      success: true,
      pendingCharge,
      message: pendingCharge
        ? 'Votre compte est marqué comme supprimé. Comme le renouvellement est prévu dans moins de 48h et n\'a pas été annulé, le dernier prélèvement sera effectué avant la suppression complète.'
        : 'Votre compte a été supprimé avec succès.'
    }
  } catch (error) {
    console.error('Delete account error:', error)
    throw new functions.https.HttpsError('internal', 'Erreur lors de la suppression du compte')
  }
})

// Helper function to delete all user data
async function scheduleCompleteDataDeletion(userId) {
  const batch = db.batch()
  
  // Delete quizzes
  const quizzesSnapshot = await db.collection('quizzes').where('userId', '==', userId).get()
  quizzesSnapshot.forEach(doc => batch.delete(doc.ref))
  
  // Delete questionnaires
  const questionnairesSnapshot = await db.collection('questionnaires').where('userId', '==', userId).get()
  questionnairesSnapshot.forEach(doc => batch.delete(doc.ref))
  
  // Delete events and related data
  const eventsSnapshot = await db.collection('events').where('userId', '==', userId).get()
  for (const eventDoc of eventsSnapshot.docs) {
    // Delete guests
    const guestsSnapshot = await db.collection('guests').where('eventId', '==', eventDoc.id).get()
    guestsSnapshot.forEach(doc => batch.delete(doc.ref))
    
    // Delete tables
    const tablesSnapshot = await db.collection('eventTables').where('eventId', '==', eventDoc.id).get()
    tablesSnapshot.forEach(doc => batch.delete(doc.ref))
    
    // Delete room layout
    const layoutSnapshot = await db.collection('roomLayouts').where('eventId', '==', eventDoc.id).get()
    layoutSnapshot.forEach(doc => batch.delete(doc.ref))
    
    // Delete guestbook messages
    const guestbookSnapshot = await db.collection('guestbookMessages').where('eventId', '==', eventDoc.id).get()
    guestbookSnapshot.forEach(doc => batch.delete(doc.ref))
    
    batch.delete(eventDoc.ref)
  }
  
  // Delete notifications
  const notificationsSnapshot = await db.collection('notifications').where('userId', '==', userId).get()
  notificationsSnapshot.forEach(doc => batch.delete(doc.ref))
  
  await batch.commit()
  
  // Finally, delete the user document
  await db.collection('users').doc(userId).delete()
  
  // Delete Firebase Auth user
  try {
    await admin.auth().deleteUser(userId)
  } catch (authError) {
    console.error('Error deleting auth user:', authError)
  }
  
  console.log(`Completed data deletion for user ${userId}`)
}

// Scheduled function to complete deletion for users with pending charges
exports.completeScheduledDeletions = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now()
    
    // Find users with scheduled deletions that are due
    const snapshot = await db.collection('users')
      .where('deleted', '==', true)
      .where('pendingCharge', '==', true)
      .where('scheduledDeletionDate', '<=', now)
      .get()
    
    for (const userDoc of snapshot.docs) {
      try {
        await scheduleCompleteDataDeletion(userDoc.id)
        console.log(`Completed scheduled deletion for user ${userDoc.id}`)
      } catch (error) {
        console.error(`Error completing deletion for user ${userDoc.id}:`, error)
      }
    }
    
    console.log(`Processed ${snapshot.size} scheduled deletions`)
    return null
  })

// Check if account is deleted (for login)
exports.checkAccountStatus = functions.https.onCall(async (data, context) => {
  const { email } = data
  
  if (!email) {
    throw new functions.https.HttpsError('invalid-argument', 'Email required')
  }
  
  // Find user by email
  const usersSnapshot = await db.collection('users')
    .where('email', '==', email)
    .limit(1)
    .get()
  
  if (usersSnapshot.empty) {
    return { exists: false, deleted: false }
  }
  
  const userData = usersSnapshot.docs[0].data()
  
  return {
    exists: true,
    deleted: userData.deleted === true,
    pendingCharge: userData.pendingCharge === true
  }
})

// ==================== TERMS OF SERVICE UPDATE NOTIFICATIONS ====================

/**
 * Terms of Service Update Notification System
 * 
 * Structure:
 * - settings/legalConfig: { termsVersion: "1.0", termsUpdatedAt: Timestamp, termsSummary: "..." }
 * - users/{userId}: { lastNotifiedTermsVersion: "1.0" }
 * 
 * Trigger: When termsVersion changes in settings/legalConfig
 * Action: Send email to all users who haven't been notified of this version
 */

// Trigger when legal config is updated
exports.onTermsUpdate = functions.firestore
  .document('settings/legalConfig')
  .onWrite(async (change, context) => {
    const before = change.before.exists ? change.before.data() : null
    const after = change.after.exists ? change.after.data() : null
    
    // Only proceed if termsVersion changed
    if (!after || !after.termsVersion) {
      console.log('No terms version in update, skipping')
      return null
    }
    
    const oldVersion = before?.termsVersion || null
    const newVersion = after.termsVersion
    
    if (oldVersion === newVersion) {
      console.log('Terms version unchanged, skipping notification')
      return null
    }
    
    console.log(`Terms version changed from ${oldVersion} to ${newVersion}`)
    
    // Create a notification job
    await db.collection('termsNotificationJobs').add({
      termsVersion: newVersion,
      termsSummary: after.termsSummary || 'Our Terms of Service have been updated.',
      termsUrl: 'https://hugoquiz.com/cgu',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'pending',
      processedCount: 0,
      totalCount: 0
    })
    
    console.log('Terms notification job created')
    return null
  })

// Process terms notification jobs (runs every 5 minutes)
exports.processTermsNotifications = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async (context) => {
    // Get pending notification jobs
    const jobsSnapshot = await db.collection('termsNotificationJobs')
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'asc')
      .limit(1)
      .get()
    
    if (jobsSnapshot.empty) {
      console.log('No pending terms notification jobs')
      return null
    }
    
    const jobDoc = jobsSnapshot.docs[0]
    const job = jobDoc.data()
    
    // Mark job as processing
    await jobDoc.ref.update({ status: 'processing' })
    
    try {
      // Get users who haven't been notified of this version
      // Process in batches of 100 to avoid timeouts
      const usersSnapshot = await db.collection('users')
        .where('email', '!=', null)
        .limit(100)
        .get()
      
      if (usersSnapshot.empty) {
        await jobDoc.ref.update({ status: 'completed' })
        console.log('No users to notify')
        return null
      }
      
      let notifiedCount = 0
      let skippedCount = 0
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data()
        
        // Skip if user was already notified of this version
        if (userData.lastNotifiedTermsVersion === job.termsVersion) {
          skippedCount++
          continue
        }
        
        // Skip deleted users
        if (userData.deleted === true) {
          skippedCount++
          continue
        }
        
        // Skip users without valid email
        if (!userData.email || !userData.email.includes('@')) {
          skippedCount++
          continue
        }
        
        // Send notification email
        const emailSent = await sendTermsUpdateEmail(
          userData.email,
          userData.displayName || userData.firstName || 'Utilisateur',
          job.termsVersion,
          job.termsSummary,
          job.termsUrl
        )
        
        if (emailSent) {
          // Update user's lastNotifiedTermsVersion
          await userDoc.ref.update({
            lastNotifiedTermsVersion: job.termsVersion,
            termsNotifiedAt: admin.firestore.FieldValue.serverTimestamp()
          })
          notifiedCount++
        }
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      // Check if more users need processing
      const remainingSnapshot = await db.collection('users')
        .where('lastNotifiedTermsVersion', '!=', job.termsVersion)
        .limit(1)
        .get()
      
      if (remainingSnapshot.empty) {
        await jobDoc.ref.update({
          status: 'completed',
          processedCount: admin.firestore.FieldValue.increment(notifiedCount),
          completedAt: admin.firestore.FieldValue.serverTimestamp()
        })
        console.log(`Terms notification job completed. Notified: ${notifiedCount}, Skipped: ${skippedCount}`)
      } else {
        // More users to process, keep job pending
        await jobDoc.ref.update({
          status: 'pending',
          processedCount: admin.firestore.FieldValue.increment(notifiedCount)
        })
        console.log(`Terms notification batch processed. Notified: ${notifiedCount}, Skipped: ${skippedCount}. More users pending.`)
      }
      
    } catch (error) {
      console.error('Error processing terms notifications:', error)
      await jobDoc.ref.update({
        status: 'failed',
        error: error.message
      })
    }
    
    return null
  })

// Send Terms Update Email (English only, transactional)
async function sendTermsUpdateEmail(email, displayName, version, summary, termsUrl) {
  const subject = 'HugoQuiz Terms of Service Update'
  
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Terms of Service Update</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; margin-top: 20px; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%); padding: 30px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">
          🎯 HugoQuiz
        </h1>
      </td>
    </tr>
    
    <!-- Content -->
    <tr>
      <td style="padding: 30px;">
        <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 22px;">Terms of Service Update</h2>
        
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
          Dear ${displayName},
        </p>
        
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
          We have updated our Terms of Service (Version ${version}). We value transparency and want to keep you informed about any changes that may affect your use of HugoQuiz.
        </p>
        
        <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 20px; margin-bottom: 25px; border-left: 4px solid #f59e0b;">
          <h2 style="color: #92400e; font-size: 18px; margin: 0 0 10px 0;">
            ${summary}
          </h2>
          <p style="color: #78350f; font-size: 14px; line-height: 1.5; margin: 0;">
            ${summary}
          </p>
        </div>
        
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
          By continuing to use HugoQuiz, you agree to the updated Terms of Service. We encourage you to review the full document.
        </p>
        
        <!-- CTA Button -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center">
              <a href="${termsUrl}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%); color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Read Updated Terms
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="background-color: #f9fafb; padding: 25px 30px; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 12px; line-height: 1.5; margin: 0; text-align: center;">
          This is a transactional email regarding important changes to our Terms of Service.<br>
          You are receiving this because you have an account on HugoQuiz.<br><br>
          © ${new Date().getFullYear()} HugoQuiz. All rights reserved.<br>
          <a href="https://hugoquiz.com" style="color: #7c3aed; text-decoration: none;">hugoquiz.com</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `
  
  return await sendEmail(email, subject, htmlContent)
}

// Admin function to manually trigger terms notification (for testing)
exports.triggerTermsNotification = functions.https.onCall(async (data, context) => {
  // Verify admin
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated')
  }
  
  const userDoc = await db.collection('users').doc(context.auth.uid).get()
  if (!userDoc.exists || userDoc.data().role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required')
  }
  
  const { version, summary } = data
  
  if (!version) {
    throw new functions.https.HttpsError('invalid-argument', 'Version required')
  }
  
  // Update legal config to trigger the notification
  await db.collection('settings').doc('legalConfig').set({
    termsVersion: version,
    termsSummary: summary || 'Our Terms of Service have been updated.',
    termsUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true })
  
  return { success: true, message: `Terms notification triggered for version ${version}` }
})

// ==================== TASK REMINDERS ====================

// Cloud Function that runs every 5 minutes to check for due reminders
exports.processTaskReminders = functions.pubsub.schedule('every 5 minutes').onRun(async (context) => {
  const now = new Date()
  console.log('Processing task reminders at:', now.toISOString())
  
  try {
    // Get all notifications that are scheduled and not yet sent
    const notificationsSnapshot = await db.collection('notifications')
      .where('type', '==', 'task_reminder')
      .where('sent', '==', false)
      .get()
    
    console.log(`Found ${notificationsSnapshot.size} pending reminders`)
    
    const batch = db.batch()
    const emailPromises = []
    
    for (const notifDoc of notificationsSnapshot.docs) {
      const notification = notifDoc.data()
      const scheduledFor = new Date(notification.scheduledFor)
      
      // Check if it's time to send this reminder
      if (scheduledFor <= now) {
        console.log(`Processing reminder: ${notifDoc.id} for user ${notification.userId}`)
        
        // Mark notification as sent and visible (unread)
        batch.update(notifDoc.ref, {
          sent: true,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          read: false
        })
        
        // Get user email for sending notification
        const userDoc = await db.collection('users').doc(notification.userId).get()
        if (userDoc.exists) {
          const userData = userDoc.data()
          const userEmail = userData.email
          
          if (userEmail) {
            // Send email notification
            emailPromises.push(
              sendTaskReminderEmail(
                userEmail,
                userData.displayName || userData.firstName || 'Utilisateur',
                notification.title,
                notification.message,
                notification.eventId,
                notification.taskId
              )
            )
          }
        }
      }
    }
    
    // Commit batch updates
    await batch.commit()
    
    // Send all emails
    await Promise.all(emailPromises)
    
    console.log('Task reminders processed successfully')
    return null
  } catch (error) {
    console.error('Error processing task reminders:', error)
    return null
  }
})

// Send task reminder email
async function sendTaskReminderEmail(email, userName, title, message, eventId, taskId) {
  const subject = `🔔 ${title}`
  const taskUrl = `https://hugoquiz.web.app/event/${eventId}/tasks`
  
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">💬 Nouveau chat en attente</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Bonjour <strong>${userName}</strong>,
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Un utilisateur demande de l'aide humaine via le chat HugoQuiz.
              </p>
              
              <!-- User Info Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="color: #166534; font-size: 14px; margin: 0 0 10px 0; font-weight: 600;">
                      👤 Informations de l'utilisateur
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0; color: #374151; font-size: 14px;">
                          <strong>Nom :</strong>
                        </td>
                        <td style="padding: 8px 0; color: #374151; font-size: 14px;">
                          ${userName}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #374151; font-size: 14px;">
                          <strong>Email :</strong>
                        </td>
                        <td style="padding: 8px 0; color: #374151; font-size: 14px;">
                          <a href="mailto:${userEmail}" style="color: #10b981; text-decoration: none;">${userEmail}</a>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #374151; font-size: 14px;">
                          <strong>Date :</strong>
                        </td>
                        <td style="padding: 8px 0; color: #374151; font-size: 14px;">
                          ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0;">
                Rendez-vous sur le panneau d'administration pour répondre à cette demande.
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="https://hugoquiz.web.app/fr/admin/chat" 
                       style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Répondre au chat
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #9ca3af; font-size: 12px; line-height: 1.6; margin: 30px 0 0 0; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                ⚡ Plus vous répondez vite, plus l'utilisateur sera satisfait !
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} HugoQuiz. Tous droits réservés.<br>
                <a href="https://hugoquiz.web.app" style="color: #10b981; text-decoration: none;">hugoquiz.web.app</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `
  
  return await sendEmail(email, subject, htmlContent)
}

// Manual trigger to process reminders (for testing)
exports.triggerTaskReminders = functions.https.onCall(async (data, context) => {
  // Verify authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated')
  }
  
  const userDoc = await db.collection('users').doc(context.auth.uid).get()
  if (!userDoc.exists || userDoc.data().role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required')
  }
  
  // Process reminders now
  const now = new Date()
  const notificationsSnapshot = await db.collection('notifications')
    .where('type', '==', 'task_reminder')
    .where('sent', '==', false)
    .get()
  
  let processed = 0
  
  for (const notifDoc of notificationsSnapshot.docs) {
    const notification = notifDoc.data()
    const scheduledFor = new Date(notification.scheduledFor)
    
    if (scheduledFor <= now) {
      await notifDoc.ref.update({
        sent: true,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        read: false
      })
      
      const userDocData = await db.collection('users').doc(notification.userId).get()
      if (userDocData.exists) {
        const userData = userDocData.data()
        await sendTaskReminderEmail(
          userData.email,
          userData.displayName || userData.firstName || 'Utilisateur',
          notification.title,
          notification.message,
          notification.eventId,
          notification.taskId
        )
      }
      processed++
    }
  }
  
  return { success: true, processed }
})

// ==================== CHAT SUPPORT FUNCTIONS ====================

/**
 * Notify admins when a user escalates to human support
 * Creates in-app notification + sends email
 */
exports.notifyAdminsOnChatEscalation = functions.firestore
  .document('chatConversations/{conversationId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data()
    const after = change.after.data()
    const conversationId = context.params.conversationId
    
    // Check if conversation was just escalated to waiting_admin
    if (before.status !== 'waiting_admin' && after.status === 'waiting_admin') {
      console.log(`Chat escalated to human support: ${conversationId}`)
      
      const userName = after.userName || 'Utilisateur'
      const userEmail = after.userEmail || 'Email non disponible'
      
      // Get all admin users
      const adminsSnapshot = await db.collection('users')
        .where('role', '==', 'admin')
        .get()
      
      if (adminsSnapshot.empty) {
        console.log('No admins found to notify')
        return null
      }
      
      const notifications = []
      const emails = []
      
      for (const adminDoc of adminsSnapshot.docs) {
        const adminData = adminDoc.data()
        
        // Create in-app notification
        notifications.push(
          db.collection('notifications').add({
            userId: adminDoc.id,
            type: 'chat_escalation',
            title: '💬 Nouveau chat en attente',
            message: `${userName} demande de l'aide humaine`,
            conversationId: conversationId,
            userName: userName,
            userEmail: userEmail,
            read: false,
            sent: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          })
        )
        
        // Send email to admin
        if (adminData.email) {
          emails.push(
            sendChatEscalationEmail(
              adminData.email,
              adminData.displayName || adminData.firstName || 'Admin',
              userName,
              userEmail,
              conversationId
            )
          )
        }
      }
      
      await Promise.all([...notifications, ...emails])
      console.log(`Notified ${adminsSnapshot.size} admin(s) about chat escalation`)
    }
    
    return null
  })

/**
 * Send email to admin when chat is escalated
 */
async function sendChatEscalationEmail(adminEmail, adminName, userName, userEmail, conversationId) {
  const subject = `🔔 HugoQuiz - ${userName} demande de l'aide`
  
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">💬 Nouveau chat en attente</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Bonjour <strong>${adminName}</strong>,
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Un utilisateur demande de l'aide humaine via le chat HugoQuiz.
              </p>
              
              <!-- User Info Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="color: #166534; font-size: 14px; margin: 0 0 10px 0; font-weight: 600;">
                      👤 Informations de l'utilisateur
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0; color: #374151; font-size: 14px;">
                          <strong>Nom :</strong>
                        </td>
                        <td style="padding: 8px 0; color: #374151; font-size: 14px;">
                          ${userName}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #374151; font-size: 14px;">
                          <strong>Email :</strong>
                        </td>
                        <td style="padding: 8px 0; color: #374151; font-size: 14px;">
                          <a href="mailto:${userEmail}" style="color: #10b981; text-decoration: none;">${userEmail}</a>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #374151; font-size: 14px;">
                          <strong>Date :</strong>
                        </td>
                        <td style="padding: 8px 0; color: #374151; font-size: 14px;">
                          ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0;">
                Rendez-vous sur le panneau d'administration pour répondre à cette demande.
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="https://hugoquiz.web.app/fr/admin/chat" 
                       style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Répondre au chat
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #9ca3af; font-size: 12px; line-height: 1.6; margin: 30px 0 0 0; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                ⚡ Plus vous répondez vite, plus l'utilisateur sera satisfait !
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} HugoQuiz. Tous droits réservés.<br>
                <a href="https://hugoquiz.com" style="color: #10b981; text-decoration: none;">hugoquiz.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `
  
  return await sendEmail(adminEmail, subject, htmlContent)
}

/**
 * Clean up old chat messages (older than 72 hours)
 * Runs every hour
 */
exports.cleanupOldChatMessages = functions.pubsub.schedule('every 1 hours').onRun(async (context) => {
  console.log('Starting cleanup of old chat messages...')
  
  const now = new Date()
  const cutoffDate = new Date(now.getTime() - 72 * 60 * 60 * 1000) // 72 hours ago
  
  let deletedConversations = 0
  let deletedMessages = 0
  
  try {
    // Get all conversations that have been closed or inactive for 72h
    const conversationsSnapshot = await db.collection('chatConversations').get()
    
    for (const convDoc of conversationsSnapshot.docs) {
      const convData = convDoc.data()
      const lastMessageAt = convData.lastMessageAt?.toDate?.() || convData.createdAt?.toDate?.()
      
      // Delete if closed and older than 72h, or if inactive for 72h
      const shouldDelete = lastMessageAt && lastMessageAt < cutoffDate
      
      if (shouldDelete) {
        // Delete all messages in this conversation
        const messagesSnapshot = await db.collection('chatConversations')
          .doc(convDoc.id)
          .collection('messages')
          .get()
        
        const batch = db.batch()
        
        for (const msgDoc of messagesSnapshot.docs) {
          batch.delete(msgDoc.ref)
          deletedMessages++
        }
        
        // Delete the conversation itself
        batch.delete(convDoc.ref)
        deletedConversations++
        
        await batch.commit()
      }
    }
    
    console.log(`Cleanup complete: ${deletedConversations} conversations and ${deletedMessages} messages deleted`)
    return { deletedConversations, deletedMessages }
  } catch (error) {
    console.error('Error during chat cleanup:', error)
    throw error
  }
})

/**
 * Manual trigger to clean up old chats (for testing)
 */
exports.triggerChatCleanup = functions.https.onCall(async (data, context) => {
  // Verify authenticated admin
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated')
  }
  
  const userDoc = await db.collection('users').doc(context.auth.uid).get()
  if (!userDoc.exists || userDoc.data().role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required')
  }
  
  const now = new Date()
  const cutoffDate = new Date(now.getTime() - 72 * 60 * 60 * 1000)
  
  let deletedConversations = 0
  let deletedMessages = 0
  
  const conversationsSnapshot = await db.collection('chatConversations').get()
  
  for (const convDoc of conversationsSnapshot.docs) {
    const convData = convDoc.data()
    const lastMessageAt = convData.lastMessageAt?.toDate?.() || convData.createdAt?.toDate?.()
    
    if (lastMessageAt && lastMessageAt < cutoffDate) {
      const messagesSnapshot = await db.collection('chatConversations')
        .doc(convDoc.id)
        .collection('messages')
        .get()
      
      const batch = db.batch()
      
      for (const msgDoc of messagesSnapshot.docs) {
        batch.delete(msgDoc.ref)
        deletedMessages++
      }
      
      batch.delete(convDoc.ref)
      deletedConversations++
      
      await batch.commit()
    }
  }
  
  return { 
    success: true, 
    deletedConversations, 
    deletedMessages,
    message: `Supprimé ${deletedConversations} conversations et ${deletedMessages} messages de plus de 72h`
  }
})

// ====================================================================
// ==================== SERVICES MARKETPLACE ==========================
// ====================================================================

const SERVICES_ADMIN_EMAIL = 'contact@hugoquiz.com'

// Create an in-app notification for a user (bypasses Firestore rules via admin SDK).
async function createUserNotification(userId, type, message) {
  if (!userId) return
  try {
    await db.collection('notifications').add({
      userId,
      type,
      message,
      read: false,
      sent: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    })
  } catch (err) {
    console.error('Failed to create notification:', err)
  }
}

// Fetch basic contact info for a user document.
async function getUserContact(userId) {
  try {
    const snap = await db.collection('users').doc(userId).get()
    if (!snap.exists) return null
    const d = snap.data()
    return {
      email: d.email,
      name: d.displayName || d.firstName || 'Utilisateur',
      lang: d.preferredLanguage || 'fr'
    }
  } catch (err) {
    console.error('Failed to get user contact:', err)
    return null
  }
}

// Minimal branded email wrapper.
function serviceEmailWrapper(title, bodyHtml, accent = '#7c3aed') {
  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <div style="background: ${accent}; padding: 32px 20px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 22px;">${title}</h1>
    </div>
    <div style="padding: 32px 30px; color: #374151; font-size: 15px; line-height: 1.6;">
      ${bodyHtml}
    </div>
    <div style="padding: 20px 30px; background:#f9fafb; color:#9ca3af; font-size:12px; text-align:center;">
      HugoQuiz — Services
    </div>
  </div>
</body>
</html>`
}

// ---- Verification submitted: notify admin ----
exports.onServiceVerificationCreated = functions.firestore
  .document('serviceVerifications/{verificationId}')
  .onCreate(async (snap) => {
    const v = snap.data()
    const body = `
      <p>Une nouvelle demande de vérification d'identité prestataire a été soumise.</p>
      <ul>
        <li><strong>Utilisateur :</strong> ${v.userName || ''} (${v.userEmail || ''})</li>
        <li><strong>Type de document :</strong> ${v.idType || ''}</li>
      </ul>
      <p>Connectez-vous au panneau d'administration pour examiner la demande.</p>`
    await sendEmail(SERVICES_ADMIN_EMAIL, '🪪 Nouvelle demande de vérification prestataire', serviceEmailWrapper('Vérification prestataire', body))
    return null
  })

// ---- Verification reviewed: notify + email the user ----
exports.onServiceVerificationUpdated = functions.firestore
  .document('serviceVerifications/{verificationId}')
  .onUpdate(async (change) => {
    const before = change.before.data()
    const after = change.after.data()
    if (before.status === after.status) return null
    if (after.status !== 'approved' && after.status !== 'rejected') return null

    const contact = await getUserContact(after.userId)
    if (after.status === 'approved') {
      await createUserNotification(after.userId, 'service_verification', '✅ Votre identité a été vérifiée. Vous pouvez maintenant publier vos services.')
      if (contact?.email) {
        const body = `
          <p>Bonjour <strong>${contact.name}</strong>,</p>
          <p>Bonne nouvelle ! Votre identité a été vérifiée avec succès. Vous pouvez désormais créer et publier vos services sur HugoQuiz.</p>`
        await sendEmail(contact.email, '✅ Votre identité prestataire est vérifiée', serviceEmailWrapper('Identité vérifiée', body, '#16a34a'))
      }
    } else {
      const reason = after.adminMessage ? `<p><strong>Motif :</strong> ${after.adminMessage}</p>` : ''
      await createUserNotification(after.userId, 'service_verification', `❌ Votre demande de vérification a été refusée.${after.adminMessage ? ' ' + after.adminMessage : ''} Vous pouvez soumettre une nouvelle demande.`)
      if (contact?.email) {
        const body = `
          <p>Bonjour <strong>${contact.name}</strong>,</p>
          <p>Votre demande de vérification d'identité n'a pas pu être validée.</p>
          ${reason}
          <p>Vous pouvez soumettre une nouvelle demande depuis votre espace.</p>`
        await sendEmail(contact.email, 'Demande de vérification refusée', serviceEmailWrapper('Vérification refusée', body, '#dc2626'))
      }
    }
    return null
  })

// ---- New service submitted: notify admin ----
exports.onServiceCreated = functions.firestore
  .document('services/{serviceId}')
  .onCreate(async (snap) => {
    const s = snap.data()
    const body = `
      <p>Un nouveau service a été soumis et attend votre validation.</p>
      <ul>
        <li><strong>Nom commercial :</strong> ${s.businessName || ''}</li>
        <li><strong>Catégorie :</strong> ${s.category || ''} / ${s.serviceType || ''}</li>
        <li><strong>Titre :</strong> ${s.title || ''}</li>
      </ul>
      <p>Examinez-le dans le panneau d'administration.</p>`
    await sendEmail(SERVICES_ADMIN_EMAIL, '🆕 Nouveau service à valider', serviceEmailWrapper('Nouveau service', body))
    return null
  })

// ---- Service status changed by admin: notify + email owner ----
exports.onServiceStatusChanged = functions.firestore
  .document('services/{serviceId}')
  .onUpdate(async (change) => {
    const before = change.before.data()
    const after = change.after.data()
    if (before.status === after.status) return null

    const contact = await getUserContact(after.userId)
    const adminMsg = after.adminMessage ? `<p><strong>Message de l'administrateur :</strong> ${after.adminMessage}</p>` : ''

    let notifMsg = null
    let emailSubject = null
    let emailTitle = null
    let accent = '#7c3aed'

    switch (after.status) {
      case 'approved':
        notifMsg = `✅ Votre service "${after.businessName}" a été validé et est maintenant en ligne.`
        emailSubject = '✅ Votre service est en ligne'
        emailTitle = 'Service publié'
        accent = '#16a34a'
        break
      case 'rejected':
        notifMsg = `❌ Votre service "${after.businessName}" a été refusé.${after.adminMessage ? ' ' + after.adminMessage : ''}`
        emailSubject = 'Votre service a été refusé'
        emailTitle = 'Service refusé'
        accent = '#dc2626'
        break
      case 'restricted':
        notifMsg = `⚠️ Votre service "${after.businessName}" a été restreint et n'est plus visible publiquement.${after.adminMessage ? ' ' + after.adminMessage : ''}`
        emailSubject = 'Votre service a été restreint'
        emailTitle = 'Service restreint'
        accent = '#d97706'
        break
      case 'deleted':
        notifMsg = `🗑️ Votre service "${after.businessName}" a été supprimé par l'administration.${after.adminMessage ? ' ' + after.adminMessage : ''}`
        emailSubject = 'Votre service a été supprimé'
        emailTitle = 'Service supprimé'
        accent = '#dc2626'
        break
      default:
        return null
    }

    await createUserNotification(after.userId, 'service_status', notifMsg)
    if (contact?.email) {
      const body = `
        <p>Bonjour <strong>${contact.name}</strong>,</p>
        <p>${notifMsg}</p>
        ${adminMsg}`
      await sendEmail(contact.email, emailSubject, serviceEmailWrapper(emailTitle, body, accent))
    }
    return null
  })

// ---- New contact message: notify + email service owner ----
exports.onServiceMessageCreated = functions.firestore
  .document('serviceMessages/{messageId}')
  .onCreate(async (snap) => {
    const m = snap.data()
    if (!m.ownerId) return null

    // Increment the service messages counter
    if (m.serviceId) {
      try {
        await db.collection('services').doc(m.serviceId).update({
          messagesCount: admin.firestore.FieldValue.increment(1)
        })
      } catch (err) {
        console.error('Failed to increment messagesCount:', err)
      }
    }

    await createUserNotification(m.ownerId, 'service_message', `✉️ Nouvelle demande de contact pour "${m.serviceTitle || 'votre service'}" de ${m.fullName || ''}.`)

    const contact = await getUserContact(m.ownerId)
    if (contact?.email) {
      const clientType = m.clientType === 'entreprise' ? 'Entreprise' : 'Particulier'
      const body = `
        <p>Bonjour <strong>${contact.name}</strong>,</p>
        <p>Vous avez reçu une nouvelle demande concernant votre service <strong>${m.serviceTitle || ''}</strong>.</p>
        <div style="background:#f9fafb; border-radius:8px; padding:16px; margin:16px 0;">
          <p style="margin:4px 0;"><strong>Nom :</strong> ${m.fullName || ''}</p>
          <p style="margin:4px 0;"><strong>Téléphone :</strong> ${m.phone || ''}</p>
          <p style="margin:4px 0;"><strong>Type de client :</strong> ${clientType}</p>
          <p style="margin:4px 0;"><strong>Objet :</strong> ${m.subject || ''}</p>
          <p style="margin:12px 0 4px;"><strong>Message :</strong></p>
          <p style="margin:0; white-space:pre-line;">${(m.message || '').replace(/</g, '&lt;')}</p>
        </div>
        <p>Connectez-vous à votre espace pour répondre.</p>`
      await sendEmail(contact.email, `✉️ Nouvelle demande pour ${m.serviceTitle || 'votre service'}`, serviceEmailWrapper('Nouvelle demande de contact', body))
    }
    return null
  })

// ==================== ADMIN MESSAGING ====================

// Professional email template with a CTA button linking to hugoquiz.com.
function adminMessageEmail(subject, messageHtml, recipientName) {
  const accent = '#7c3aed'
  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 6px 18px rgba(0,0,0,0.08); margin-top:24px; margin-bottom:24px;">
    <div style="background: linear-gradient(135deg, #7c3aed 0%, #9333ea 100%); padding: 36px 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">HugoQuiz</h1>
      <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">${subject}</p>
    </div>
    <div style="padding: 32px 34px; color: #374151; font-size: 15px; line-height: 1.7;">
      <p style="margin-top:0;">Bonjour <strong>${recipientName || ''}</strong>,</p>
      <div style="white-space: pre-line;">${messageHtml}</div>
      <div style="text-align: center; margin: 32px 0 8px;">
        <a href="https://hugoquiz.com" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #9333ea 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 15px;">Aller sur HugoQuiz</a>
      </div>
    </div>
    <div style="padding: 22px 30px; background:#f9fafb; color:#9ca3af; font-size:12px; text-align:center; line-height:1.6;">
      <p style="margin:0 0 6px;">Cet e-mail vous a été envoyé par l'équipe HugoQuiz.</p>
      <p style="margin:0;">
        <a href="https://hugoquiz.com" style="color:${accent}; text-decoration:none;">Accueil</a> &nbsp;•&nbsp;
        <a href="https://hugoquiz.com/dashboard" style="color:${accent}; text-decoration:none;">Mon espace</a> &nbsp;•&nbsp;
        <a href="https://hugoquiz.com/help" style="color:${accent}; text-decoration:none;">Aide</a>
      </p>
    </div>
  </div>
</body>
</html>`
}

// Admin sends a message (email + in-app notification) to one, several or all users.
exports.sendAdminMessage = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in')
  }
  const callerDoc = await db.collection('users').doc(context.auth.uid).get()
  if (callerDoc.data()?.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Must be admin')
  }

  const { userIds, allUsers, subject, message } = data
  if (!subject || !message || !String(message).trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing subject or message')
  }

  // Resolve the list of recipient user documents.
  let recipients = []
  if (allUsers) {
    const snap = await db.collection('users').get()
    recipients = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  } else if (Array.isArray(userIds) && userIds.length > 0) {
    const reads = await Promise.all(
      userIds.map(uid => db.collection('users').doc(uid).get())
    )
    recipients = reads.filter(s => s.exists).map(s => ({ id: s.id, ...s.data() }))
  } else {
    throw new functions.https.HttpsError('invalid-argument', 'No recipients specified')
  }

  // Escape user-provided text to avoid HTML injection, keep line breaks.
  const safeMessage = String(message)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  const safeSubject = String(subject).replace(/</g, '&lt;').replace(/>/g, '&gt;')

  let sent = 0
  let failed = 0
  for (const r of recipients) {
    const name = r.displayName || r.firstName || r.email || ''
    // In-app notification
    await createUserNotification(r.id, 'admin_message', `📢 ${safeSubject}`)
    // Email
    if (r.email) {
      const ok = await sendEmail(r.email, safeSubject, adminMessageEmail(safeSubject, safeMessage, name))
      if (ok) { sent++ } else { failed++ }
    } else {
      failed++
    }
  }

  return { total: recipients.length, sent, failed }
})

