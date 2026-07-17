# Selon Toi

Application web pour jouer à deux : chacun répond en secret, puis tente de deviner ce que l’autre préfère.

## Stockage

Pas de base de données. Tout est en fichiers JSON :

- [`src/data/questions.json`](src/data/questions.json) — 100 questions (statique)
- [`data/users.json`](data/users.json) — comptes
- [`data/rooms.json`](data/rooms.json) — rooms, questions en cours, réponses

## Démarrage local

```bash
npm install
npm run dev
```

Variables dans `.env` (voir `.env.example`) :

- `NEXTAUTH_SECRET` — secret aléatoire
- `NEXTAUTH_URL` — `http://localhost:3000`

## Déploiement (une seule app Node)

Vercel ne convient **pas** : le disque y est en lecture seule, donc les JSON ne peuvent pas être mis à jour.

Déploie la même app Next.js sur un hébergeur avec disque persistant, par ex. [Railway](https://railway.app) ou [Render](https://render.com) :

1. Connecte le repo GitHub
2. Build : `npm run build`
3. Start : `npm start`
4. Variables d’env :
   - `NEXTAUTH_SECRET` (chaîne longue aléatoire)
   - `NEXTAUTH_URL` (URL publique de l’app)

Une seule app, pas de service Postgres/Neon à côté.

## Scripts

| Commande | Description |
| --- | --- |
| `npm run dev` | Développement |
| `npm run build` | Build production |
| `npm start` | Serveur production |
