# 📚 Compta Companion

Ton compagnon de révision propulsé par l'IA pour réussir ton examen de comptabilité — quelques minutes par jour suffisent.

## ✨ Fonctionnalités

- **📂 Sync Google Drive** : importe automatiquement tes cours (PDF, images, Google Docs) organisés en dossiers / sous-dossiers.
- **🤖 Génération IA (Claude)** : pour chaque chapitre, l'app génère :
  - un **résumé express** (TL;DR + points clés + glossaire)
  - une **fiche détaillée** en Markdown
  - des **flashcards** Q/R prêtes à réviser
  - des **QCM** et **cas pratiques comptables** (avec écritures et corrections)
- **🃏 Mode étude (SM-2)** : algorithme de répétition espacée à la Anki — chaque carte revient au bon moment.
- **⚡ Mode 5 minutes** : session ultra-courte ciblant tes cartes les plus urgentes.
- **📊 Tableau de bord motivant** : streak, heatmap calendrier, précision, progression par cours, cartes les plus difficiles, compte à rebours examen.
- **📱 Responsive & PWA-ready** : utilisable sur ordi, iPad et iPhone via le navigateur.

## 🚀 Démarrage rapide (local)

### 1. Pré-requis

- **Node.js 18+** (`node --version`)
- Un compte **Google** (pour le Drive)
- Une clé **Anthropic API** : https://console.anthropic.com/settings/keys

### 2. Cloner & installer

```bash
git clone <repo>
cd compta-companion
npm install
```

### 3. Créer les credentials Google OAuth

1. Va sur https://console.cloud.google.com → crée un projet « compta-companion ».
2. **APIs & Services → Library** → active **Google Drive API**.
3. **OAuth consent screen** : type « External », ajoute ton email comme test user, et ajoute le scope `https://www.googleapis.com/auth/drive.readonly`.
4. **Credentials → Create Credentials → OAuth client ID** :
   - Type : **Web application**
   - Authorized JavaScript origins : `http://localhost:3000`
   - Authorized redirect URIs : `http://localhost:3000/api/auth/callback/google`
5. Récupère le `Client ID` et le `Client Secret`.

### 4. Configurer l'environnement

```bash
cp .env.example .env.local
```

Édite `.env.local` avec :
- `NEXTAUTH_SECRET` : génère avec `openssl rand -base64 32`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (étape 3)
- `ANTHROPIC_API_KEY` : ta clé Anthropic
- (optionnel) `NEXT_PUBLIC_EXAM_DATE=2026-09-15`

### 5. Initialiser la base SQLite

```bash
npx prisma db push
```

### 6. Lancer l'app

```bash
npm run dev
```

Ouvre http://localhost:3000 → connecte-toi avec Google → importe un dossier Drive → génère un chapitre → étudie 🚀

## 📁 Organisation Drive recommandée

```
📂 Compta examen/
├── 📂 Comptabilité générale/
│   ├── 📂 Chapitre 1 - Le bilan/
│   │   ├── cours.pdf
│   │   └── exercices.pdf
│   └── 📂 Chapitre 2 - Le compte de résultat/
├── 📂 Comptabilité analytique/
└── 📂 Fiscalité/
```

→ chaque dossier de niveau 1 = un cours, chaque dossier de niveau 2 = un chapitre.

Si tes documents sont à plat dans un dossier, l'app crée un seul cours avec un chapitre « Général ».

## 🔄 Mettre à jour quand tu ajoutes des cours

Va dans **Mes cours** → bouton **Mettre à jour**. L'app re-scanne ton Drive et ajoute les nouveaux fichiers / chapitres. Pour générer le contenu IA d'un nouveau chapitre, ouvre-le et clique sur **Générer avec l'IA**.

## ⌨️ Raccourcis (mode étude)

- `Espace` : retourner la carte
- `1` Encore · `2` Difficile · `3` Bien · `4` Facile

## 🌐 Déploiement gratuit (iPad / iPhone)

L'app est prête à être déployée sur **Vercel** (gratuit) avec **Supabase** (gratuit) pour la base Postgres :

1. Crée un projet Supabase, récupère le `DATABASE_URL` (Postgres).
2. Dans `prisma/schema.prisma`, change `provider = "sqlite"` en `provider = "postgresql"`.
3. `npx prisma db push` une fois en local pointant vers Supabase.
4. Pousse le repo sur GitHub, importe-le sur https://vercel.com.
5. Ajoute les variables d'environnement (mêmes que `.env.local`, en remplaçant `NEXTAUTH_URL` par ton domaine Vercel).
6. **Important** : ajoute le redirect URI Vercel dans Google Cloud Console (`https://<ton-app>.vercel.app/api/auth/callback/google`).

Une fois déployée, tu peux l'« installer » sur ton iPhone/iPad en l'ajoutant à l'écran d'accueil (Safari → Partager → Sur l'écran d'accueil).

## 🛠️ Stack

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS** + **shadcn/ui**
- **Prisma** + **SQLite** (local) / **PostgreSQL** (prod)
- **NextAuth.js** + Google OAuth
- **Anthropic Claude SDK** (Sonnet 4.6 par défaut, avec prompt caching)
- **Recharts** pour les graphiques
- **pdf-parse** pour l'extraction de PDF, Claude vision pour les images

## 🧠 Algorithme SRS

L'app utilise **SM-2** (l'algo historique d'Anki/SuperMemo) :
- chaque carte a un **ease factor** (~2.5 par défaut) et un **interval** en jours.
- ta réponse (Encore / Difficile / Bien / Facile) ajuste l'ease et choisit la prochaine date de revoyure.
- les cartes ratées reviennent dès le lendemain ; les cartes connues s'espacent (1j → 6j → 14j → 30j → ...).

## 💡 Conseils pour bien réviser

1. **Régularité > durée** : 10 minutes par jour > 2h le dimanche.
2. **Mode 5 minutes** dans le métro : ne casse pas le streak !
3. Consulte la section **Cartes les plus difficiles** dans Stats → ce sont tes vraies zones de travail.
4. Refais les **cas pratiques** sur papier avant de regarder la correction.

Bonne révision et bonne réussite à ton examen ! 🎓
