# Purrkour 🐈

Prototype mobile-first d'un jeu de course félin en 2.5D / 3D légère.

## Démo

GitHub Pages : https://salfab.github.io/Purrkour/

Le déploiement automatique est assuré par `.github/workflows/deploy-pages.yml`.

## Pile technique

- React pour l'interface.
- Three.js pour le couloir et le personnage en sprite.
- TypeScript strict pour les règles et les contrôles.
- Vite pour le développement et la compilation.
- pnpm et Vitest pour les dépendances et les tests.

## Lancer localement

```bash
pnpm install
pnpm dev
```

## Contrôles

- En bas de l'écran, **maintenir et glisser** le pouce pour choisir une position latérale.
- **Relever le pouce** pour sauter.
- Au clavier : flèches latérales et espace.
- Toucher le dessus d'une caisse déclenche un rebond ; une collision sur le côté termine le run.

## Architecture

- `src/game/core.ts` contient les règles pures et la génération déterministe.
- `src/game/ThumbControls.ts` contient les contrôles au pouce, souris et clavier.
- `src/game/ArtWorld.ts` génère le couloir, les matériaux et un chat kawaii par CanvasTexture.
- `src/game/PurrkourGame.ts` orchestre simulation, rendu Three.js et caméra.
- `src/App.tsx` affiche menus et HUD React.
- `tests/core.test.ts` vérifie la physique et la progression.

## État du prototype

Cette première version poussée directement depuis ChatGPT utilise des textures et un chat illustré **générés procéduralement dans le navigateur**, afin d'avoir un projet qui démarre sans dépendances d'assets téléchargés. Le spritesheet kawaii original, les textures peintes haute résolution et la musique de fond ont été conservés dans l'archive v0.7 créée précédemment, mais **ne sont pas encore présents dans ce dépôt**. Il faudra les importer séparément après vérification des droits de diffusion de la musique.

Les poissons récoltés s'ajoutent à une réserve locale en fin de run. Le système de déverrouillage permanent reste à développer.

## Version v0.8 — textures et gameplay

Le jeu charge désormais des textures raster compressées depuis `public/assets/textures/`, ainsi qu'un panorama AVIF depuis `public/assets/backgrounds/`. Un rendu de secours généré par Canvas reste disponible si un matériau ne peut pas être chargé.

Les poissons apparaissent en séquences variées : collecte simple, slalom, boost, sauts ordinaires, puis poissons dorés qui nécessitent un rebond sur caisse.

## Musique originale

La lecture de musique, la pause/reprise, la boucle et le bouton muet sont intégrés. Le lecteur attend le fichier `public/assets/audio/music.mp3`.

**Le MP3 original n'est pas encore présent dans le dépôt.** L'intégration GitHub permet les modifications de code et les petits fichiers, mais ne permet pas d'envoyer directement les 3,9 Mo de musique depuis les fichiers locaux de la conversation. Pour l'activer, envoyer l'enregistrement à ce chemin exact. Après le push, GitHub Actions publiera automatiquement la musique.

Les droits sur la composition ont été confirmés par son auteur. Conserver l'attribution et le fichier source lors de l'ajout.


## Décor et fossés (art pass v0.9)

Le panorama raster AVIF est rendu dans un plan lointain séparé, jamais comme
`scene.background`. Les proportions de l’image sont conservées, le bas de la
référence est recadré et les bords sont fondus dans le ciel. Le défilement
horizontal est lent et borné : il ne modifie ni la caméra ni la jouabilité.

Les fossés présentent désormais une rue inférieure pavée (comme les rues
latérales), des murs de descente aux deux lèvres et une bordure visible. La
simulation de chute et les collisions ne sont pas modifiées.

La piste et les façades utilisent les textures WebP générées et versionnées
dans `public/assets/textures/`; les textures Canvas intégrées au code restent
des solutions de repli si un chargement échoue.

La bande-son originale est versionnée sous le nom technique
`public/assets/audio/soundtrack_1.mp3` (fichier identique à la composition
fournie, renommé sans changement audio).
