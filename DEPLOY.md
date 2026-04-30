# Déploiement gratuit (Vercel + Supabase)

Une seule base partagée : tes cours / fiches / flashcards sont stockés une fois,
accessibles depuis tous tes appareils (iPad, iPhone, ordi…).

## 1. Préparer la base PostgreSQL (Supabase, gratuit)

1. Créer un compte sur https://supabase.com (avec ton compte GitHub).
2. **New project** → choisis une région UE (`Frankfurt`), mot de passe au hasard, plan Free.
3. Une fois le projet prêt, ouvre **Project Settings → Database → Connection string → URI**.
4. Copie la chaîne. Elle ressemble à :

   ```
   postgresql://postgres:<TON-MDP>@db.xxxxx.supabase.co:5432/postgres
   ```

## 2. Adapter Prisma à PostgreSQL

Dans `prisma/schema.prisma`, remplace :

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

par :

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

(Garde le SQLite en local en gardant un fichier `.env.local` séparé si besoin.)

Puis pousse le schéma sur Supabase :

```bash
DATABASE_URL="postgresql://postgres:..." npx prisma db push
```

## 3. Réimporter une seule fois tes cours

Sur la base vide Supabase, après le déploiement :
1. connecte-toi à l'app sur Vercel,
2. va dans **Réglages → Dossier Drive → URL** et clique **Importer**.

Tes cours seront synchronisés une fois et persistés sur Supabase. Les autres
appareils verront les mêmes données — pas de réimport.

## 4. Déployer sur Vercel

1. Push ton repo sur GitHub.
2. Sur https://vercel.com → **Add New → Project** → sélectionne le repo.
3. Framework auto-détecté : **Next.js**.
4. **Environment Variables** — ajoute :

   | Nom | Valeur |
   |---|---|
   | `DATABASE_URL` | l'URI Supabase de l'étape 1 |
   | `NEXTAUTH_URL` | `https://<ton-projet>.vercel.app` |
   | `NEXTAUTH_SECRET` | `openssl rand -hex 32` |
   | `GOOGLE_CLIENT_ID` | depuis Google Cloud Console |
   | `GOOGLE_CLIENT_SECRET` | idem |
   | `ANTHROPIC_API_KEY` | depuis console.anthropic.com |
   | `SINGLE_USER_EMAIL` | ton email Google (verrouille l'accès) |
   | `DRIVE_FOLDER_URL` | (optionnel) URL du dossier Drive racine |

5. Dans **Google Cloud Console → Credentials → OAuth client**, ajoute l'URI :
   `https://<ton-projet>.vercel.app/api/auth/callback/google` aux URI de
   redirection autorisés.

6. Clique **Deploy**. Au bout de ~2 min c'est en ligne.

## 5. Installer sur iPhone / iPad

Safari → ouvre l'URL Vercel → bouton **Partager → Sur l'écran d'accueil**.
L'icône s'installe et l'app se lance en plein écran (PWA).

## Sur le coût

- Supabase Free : 500 Mo, largement assez pour des fiches comptables.
- Vercel Hobby : 100 GB de bande passante / mois, gratuit.
- Anthropic : tu paies ce que tu génères (plafond configurable dans la console).

## Limite de la base partagée vs multi-utilisateurs

Le `SINGLE_USER_EMAIL` empêche tout autre Google de se connecter. Si tu enlèves
cette variable, n'importe qui avec un compte Google pourra se connecter ET tout
le monde verra **les mêmes cours** (la BDD est globale par design ici, pas
isolée par user). Garde donc `SINGLE_USER_EMAIL` si tu veux rester seul.

Pour un vrai multi-tenant (chaque user voit ses propres cours), il faudrait
isoler `Course.userId` côté UI partout — pas le cas par défaut.
