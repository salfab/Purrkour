# Purrkour 🐈

Jeu de parkour félin **mobile-first**, développé avec **React, TypeScript et Three.js**.

Le dépôt a été initialisé et le workflow GitHub Pages est installé. **Le code du jeu v0.7 n'est pas encore importé** : seul le README et la configuration CI/CD sont présents pour le moment.

## Importer le projet v0.7

Télécharger l'archive `Purrkour_GitHub_Pages_ready.zip` fournie dans la conversation, puis, sur macOS/Linux :

```bash
git clone https://github.com/salfab/Purrkour.git
unzip -o ~/Downloads/Purrkour_GitHub_Pages_ready.zip -d Purrkour
cd Purrkour

# Garder le workflow de déploiement déjà installé sur GitHub.
git restore .github/workflows/deploy-pages.yml

git add .
git commit -m "feat: import Purrkour v0.7 mobile game"
git push origin main
```

Adapter le chemin de l'archive si elle se trouve ailleurs que dans `~/Downloads`.

## Développement

```bash
pnpm install
pnpm dev
```

## Déploiement GitHub Pages

Le workflow `.github/workflows/deploy-pages.yml` vérifie le projet, lance les tests et construit l'application avec `GITHUB_PAGES=true`, afin que Vite utilise le bon préfixe `/Purrkour/`.

Dans **Settings → Pages**, sélectionner **GitHub Actions** comme source.

Une fois un déploiement réussi, le jeu sera disponible à :

https://salfab.github.io/Purrkour/

Le workflow est volontairement conçu pour ne pas tenter le déploiement tant que `package.json`, `vite.config.ts` et `src/` sont absents.

## Droits des assets

Avant de diffuser publiquement la bande-son, vérifier que la musique et les éléments graphiques peuvent être distribués.
