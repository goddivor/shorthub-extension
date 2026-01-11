# 🚀 ShortHub Extension v2.0

> Extension de navigateur moderne pour ajouter des chaînes YouTube sources directement depuis YouTube vers votre backend ShortHub GraphQL.

![ShortHub Extension](https://img.shields.io/badge/version-2.0.0-red?style=for-the-badge&logo=youtube)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)
![Chrome](https://img.shields.io/badge/Chrome-supported-blue?style=for-the-badge&logo=googlechrome)
![Firefox](https://img.shields.io/badge/Firefox-supported-orange?style=for-the-badge&logo=firefox)

## ✨ Nouveautés v2.0

### 🎯 Refonte complète de l'architecture
- **Intégration GraphQL** - Communication directe avec le backend ShortHub
- **Plus de Supabase** - Nouveau système avec Apollo Server
- **Types de contenu** - Support des ContentType (VA/VF/VO avec/sans édition)
- **Analyse intelligente d'URL** - Fonctionne sur n'importe quelle page YouTube
- **Interface moderne** - Design épuré et responsive

### 🔧 Fonctionnalités améliorées
- **Authentification JWT** - Sécurité renforcée
- **YouTube API Integration** - Extraction précise des données
- **Parse avancé d'URL** - Support de tous les formats YouTube
- **Fallbacks intelligents** - Fonctionne même sans clé API
- **Gestion d'erreurs améliorée** - Feedback clair et mécanismes de retry

## 🎯 Fonctionnalités

### Fonctionnalités principales
- 🎬 **Support YouTube universel** - Fonctionne sur les chaînes, vidéos, shorts
- 🔄 **Analyse en temps réel** - Détection instantanée depuis n'importe quelle URL YouTube
- 📊 **Données précises** - Récupération du nombre d'abonnés et infos de chaîne
- 🏷️ **Types de contenu** - VA/VF/VO Sans Édition ou Avec Édition
- 💾 **Intégration GraphQL** - Stockage direct via mutations
- 🔐 **Authentification JWT** - Sécurité de niveau entreprise

### Expérience utilisateur
- 🎨 **Interface moderne** - Interface propre et intuitive
- ⚡ **Feedback instantané** - Mises à jour et validation en temps réel
- 🔧 **Configuration facile** - Setup simple pour backend et clés API
- 📱 **Design responsive** - Fonctionne parfaitement sur tous les écrans

## 🚀 Installation

### Pour les utilisateurs
1. **Télécharger** la dernière release depuis [GitHub Releases](https://github.com/goddivor/shorthub-extension/releases)
2. **Dézipper** le package d'extension
3. **Ouvrir** la page des extensions Chrome/Firefox
   - Chrome: `chrome://extensions/`
   - Firefox: `about:addons`
4. **Activer** le Mode développeur
5. **Charger** le dossier d'extension

### Pour les développeurs
```bash
# Cloner le repository
cd extension

# Installer les dépendances
npm install

# Builder l'extension
npm run build

# Développement avec hot reload
npm run dev
```

## ⚙️ Configuration

### 1. Backend ShortHub (Requis)

Assurez-vous que votre backend ShortHub GraphQL est en cours d'exécution:
```bash
cd server
npm run dev  # Démarre sur http://localhost:4000/graphql
```

### 2. Obtenir votre Token JWT (Requis)

1. Connectez-vous à ShortHub web (http://localhost:5173)
2. Ouvrez les DevTools (F12) → Console
3. Tapez: `localStorage.getItem('auth_token')`
4. Copiez le token (sans les guillemets)

### 3. Configurer l'extension

1. **Cliquez** sur l'icône ShortHub dans votre navigateur
2. **Allez** dans l'onglet **Settings**
3. **Remplissez** les champs:
   - **GraphQL Endpoint**: `http://localhost:4000/graphql` (développement)
   - **Authentication Token**: Collez votre token JWT
   - **YouTube API Key** (optionnel): Votre clé API YouTube

4. **Cliquez** sur **Save Configuration**
5. **Cliquez** sur **Test Connection** pour vérifier

### 4. YouTube API Key (Optionnel mais recommandé)

**Pour obtenir une clé API YouTube:**
1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un nouveau projet ou sélectionnez un existant
3. Activez YouTube Data API v3
4. Créez des credentials (Clé API)
5. Restreignez la clé à YouTube Data API v3

## 🔧 Utilisation

### Ajouter une chaîne source

1. **Visitez** n'importe quelle page YouTube (chaîne, vidéo, ou short)
2. **Cliquez** sur l'icône de l'extension ShortHub
3. **Vérifiez** les informations de chaîne détectées
4. **Sélectionnez** le type de contenu:
   - **VA Sans Édition**: Version Anglaise sans édition
   - **VA Avec Édition**: Version Anglaise avec édition
   - **VF Sans Édition**: Version Française sans édition
   - **VF Avec Édition**: Version Française avec édition
   - **VO Sans Édition**: Version Originale sans édition
   - **VO Avec Édition**: Version Originale avec édition
5. **Cliquez** sur "Add to ShortHub"

### Formats d'URL supportés
- `https://youtube.com/channel/UC...` - ID de chaîne direct
- `https://youtube.com/@username` - Handle de chaîne
- `https://youtube.com/c/channelname` - URL personnalisée
- `https://youtube.com/user/username` - Username legacy
- `https://youtube.com/watch?v=...` - Page de vidéo
- `https://youtube.com/shorts/...` - Page de shorts

## 🏗️ Architecture

### Background Script (`background/background.js`)
```typescript
class ModernShortHubBackground {
  // Intégration YouTube API
  extractChannelFromUrl(url: string)

  // Opérations GraphQL
  saveChannel(channelData: ChannelData)

  // Gestion de configuration
  updateConfiguration(config: Config)

  // Test de connexion
  testConnection()
}
```

### Popup Interface (`popup/popup.html` + `popup.js`)
```typescript
class ModernShortHubPopup {
  // Analyse d'URL et détection de chaîne
  analyzeCurrentPage()

  // Gestion de formulaire et validation
  validateForm()

  // Gestion des interactions utilisateur
  addChannel()
}
```

### Améliorations clés par rapport à v1.0
- ❌ **Pas de Supabase** - Migration vers GraphQL
- ✅ **Authentification JWT** - Sécurité renforcée
- ✅ **Types de contenu** - Système de ContentType
- ✅ **Traitement en arrière-plan** - Toute la logique dans le service worker
- ✅ **Approche API-first** - YouTube API pour données précises

## 📊 Schéma de données

### Objet SourceChannel
```typescript
interface CreateSourceChannelInput {
  youtubeUrl: string        // URL YouTube originale
  contentType: ContentType  // Type de contenu
}

enum ContentType {
  VA_SANS_EDIT   // Version Anglaise sans édition
  VA_AVEC_EDIT   // Version Anglaise avec édition
  VF_SANS_EDIT   // Version Française sans édition
  VF_AVEC_EDIT   // Version Française avec édition
  VO_SANS_EDIT   // Version Originale sans édition
  VO_AVEC_EDIT   // Version Originale avec édition
}
```

### Mutation GraphQL
```graphql
mutation CreateSourceChannel($input: CreateSourceChannelInput!) {
  createSourceChannel(input: $input) {
    id
    channelId
    channelName
    profileImageUrl
    contentType
    createdAt
  }
}
```

## 🔒 Confidentialité & Sécurité

- **Pas de collecte de données** - L'extension stocke uniquement ce que vous configurez
- **Stockage local** - Configuration stockée localement dans le navigateur
- **Appels API directs** - Pas de serveurs intermédiaires
- **Permissions minimales** - Uniquement YouTube et domaines configurés
- **JWT sécurisé** - Authentification de niveau entreprise

## 🛠️ Développement

### Structure du projet
```
extension/
├── manifest.json          # Manifest de l'extension
├── background/
│   └── background.js      # Service worker
├── popup/
│   ├── popup.html         # Interface popup moderne
│   └── popup.js           # Logique popup
├── icons/                 # Icônes de l'extension
└── dist/                  # Extension buildée
```

### Commandes de build
```bash
npm run build      # Build pour production
npm run dev        # Développement avec watch
npm run lint       # Linting du code
npm run test       # Lancer les tests
npm run package    # Créer le zip de distribution
```

### Tests
```bash
# Tests unitaires
npm run test

# Validation de l'extension
npm run validate

# Tests navigateur
npm run start:firefox  # Développement Firefox
npm run start:chrome   # Instructions Chrome
```

## 🔄 Migration depuis v1.0

### Ce qui a changé
1. **Supabase → GraphQL** - Nouveau backend
2. **Nouveau design popup** - Interface moderne et responsive
3. **Types de contenu** - Système ContentType au lieu de tag/type/domain
4. **Authentification JWT** - Plus sécurisé que les clés Supabase
5. **Intégration YouTube API** - Extraction de données plus précise

### Étapes de migration
1. **Désinstaller** l'ancienne extension
2. **Installer** l'extension v2.0
3. **Configurer** le GraphQL endpoint et token JWT
4. **Ajouter** la clé YouTube API (optionnel)
5. **Tester** avec vos chaînes favorites

## 🐛 Dépannage

### L'extension ne détecte pas la chaîne
- Vérifiez que vous êtes sur une page YouTube valide
- Rafraîchissez la page
- Vérifiez que votre clé YouTube API est valide

### Erreur "Backend not configured"
- Allez dans Settings
- Vérifiez le GraphQL Endpoint
- Vérifiez votre token JWT
- Cliquez sur "Test Connection"

### Erreur "Authentication failed"
- Votre token JWT a expiré
- Reconnectez-vous à ShortHub web
- Obtenez un nouveau token
- Mettez à jour dans Settings

### La chaîne existe déjà
- Le backend refuse d'ajouter une chaîne déjà présente
- Vérifiez dans l'interface admin

## 🤝 Contribution

Nous accueillons les contributions! Consultez notre [Guide de contribution](CONTRIBUTING.md) pour plus de détails.

### Setup de développement
1. Fork le repository
2. Créez une branche feature
3. Faites vos changements
4. Ajoutez des tests si applicable
5. Soumettez une pull request

## 📝 Licence

Ce projet est sous licence MIT - voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 🙏 Remerciements

- **YouTube API** - Pour les données complètes des chaînes
- **Apollo Server** - Pour l'excellente plateforme GraphQL
- **Chrome Extensions Team** - Pour la plateforme d'extension robuste
- **Nos contributeurs** - Pour améliorer ce projet

## 🔗 Liens

- [App ShortHub principale](https://github.com/goddivor/shorthub)
- [Store Extension](https://chrome.google.com/webstore/detail/shorthub) (Bientôt)
- [Documentation](https://docs.shorthub.dev)
- [Support](https://github.com/goddivor/shorthub-extension/issues)

---

**Fait avec ❤️ pour les créateurs YouTube par l'équipe ShortHub**
