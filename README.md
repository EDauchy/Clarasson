# Selon Toi

Application web pour jouer à deux : chacun répond en secret à un « Tu préfères… », puis tente de deviner ce que l’autre préfère.

## Fonctionnalités

- Inscription / connexion
- Rooms à **2 personnes** max, via code d’invitation
- Phases : choix secret → guess partenaire → révélation

## Démarrage local

```bash
npm install
npx prisma migrate dev
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000).

Variables dans `.env` (voir `.env.example`) :

- `DATABASE_URL` — par défaut SQLite `file:./dev.db`
- `NEXTAUTH_SECRET` — secret aléatoire
- `NEXTAUTH_URL` — `http://localhost:3000`

## Déploiement en ligne (Vercel + Neon)

1. Crée une base Postgres gratuite sur [Neon](https://neon.tech)
2. Dans `prisma/schema.prisma`, remplace le datasource :

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

3. Mets à jour `DATABASE_URL` avec l’URL Neon (`postgresql://…?sslmode=require`)
4. Lance `npx prisma migrate deploy`
5. Pousse le repo sur GitHub, importe-le sur [Vercel](https://vercel.com)
6. Ajoute les variables d’environnement Vercel :
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET` (génère une longue chaîne aléatoire)
   - `NEXTAUTH_URL` (URL de ton déploiement, ex. `https://selon-toi.vercel.app`)
7. Déploie — l’app est en ligne

## Scripts

| Commande | Description |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Build production |
| `npm start` | Serveur production |
| `npx prisma studio` | Explorer la base |
