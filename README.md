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

Le prototype utilise désormais le spritesheet kawaii original, des textures peintes compressées et la bande-son originale. Des matériaux procéduraux restent disponibles comme solutions de repli. Le gameplay est encore basé sur des séquences déterministes répétées, avant la mise en place du directeur de patterns.

Les poissons récoltés s'ajoutent à une réserve locale en fin de run. Le système de déverrouillage permanent reste à développer.

## Documentation gameplay

- [Gameplay Design Document — phases, patterns, difficulté et état réel des fonctionnalités](docs/GAMEPLAY.md)

## Version v0.8 — textures et gameplay

Le jeu charge désormais des textures raster compressées depuis `public/assets/textures/`, ainsi qu'un panorama AVIF depuis `public/assets/backgrounds/`. Un rendu de secours généré par Canvas reste disponible si un matériau ne peut pas être chargé.

Les poissons apparaissent en séquences variées : collecte simple, slalom, boost, sauts ordinaires, puis poissons dorés qui nécessitent un rebond sur caisse.

## Musique originale

La lecture de musique, la pause/reprise, la boucle et le bouton muet sont intégrés. Le fichier musical original est versionné sous le nom technique `public/assets/audio/soundtrack_1.mp3` et chargé par le jeu.

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

## Première rotation de patterns (v0.10)

`src/game/gameplayDirector.ts` choisit parmi 8 séquences écrites à la main, en fonction de la distance et d'une graine unique par run. Les caisses et les poissons sont générés depuis le même plan, ce qui garantit leur alignement. Le tutoriel des 200 premiers mètres reste reproductible. La génération des fossés, l'équilibrage temporel et le combo seront travaillés plus tard. Voir [docs/GAMEPLAY.md](docs/GAMEPLAY.md) pour les détails.

Le sprite du chat est désormais symétrisé lorsqu'il est à droite de l'écran. Un nouvel atlas de course vue arrière reste à produire. Les instructions tactiles disparaissent après 42 m.

## Embranchement expérimental v0.11

À environ **250 mètres**, le chat traverse deux portails : à gauche (à l'écran) la route des poissons et à droite la route des acrobaties. Le choix est automatiquement validé par la position latérale du chat, sans bouton. Une rotation cinématique d'environ une seconde annonce la section de 150 m qui suit. Ce premier essai conserve le système de piste droite et utilise un virage simulé par la caméra ; voir [docs/GAMEPLAY.md](docs/GAMEPLAY.md).

## Bifurcations spatiales v0.12

Les routes de Purrkour sont désormais **des courbes dans la scène 3D**, pas seulement une animation de caméra. Les deux branches de l'embranchement de 250 m tournent à 90°, parcourent une rue latérale, puis se réunissent près de 430 m. L'autre branche reste un décor sans collision. Voir [docs/GAMEPLAY.md](docs/GAMEPLAY.md).


## Court détour, faux raccord et cadrage adaptatif (v0.13)

La bifurcation v0.12 à longues courbes a été remplacée par une inflexion en S de 28 mètres avant une nouvelle ligne droite, afin de conserver la piste à l'écran en mobile. Une petite route visuelle de 19 mètres rejoint le tracé vers 410 m à 45°, en venant du côté non choisi. La caméra s'adapte à la courbure et à la largeur du viewport, et le sprite de profil est inversé sur le côté gauche. Voir [docs/GAMEPLAY.md](docs/GAMEPLAY.md).


## Caméra et personnage v0.14

Un cadrage anticipé avant la bifurcation et un lissage indépendant du FPS évitent le brusque recul de caméra au choix de branche. Le chat utilise au centre le spritesheet arrière illustré à quatre poses (`cat_rear_strip.webp`, alpha transparent) et l'atlas latéral existant à gauche/droite, avec UV inversés à gauche. Les sprites Canvas de secours restent disponibles. Voir [GAMEPLAY.md](docs/GAMEPLAY.md).


## Raccord continu du Y (v0.15)

La branche sélectionnée est désormais **dessinée en continu** : les deux tronçons courts du Y restent identiques avant/après le choix, puis se raccordent à la piste active au même point (288 m), sans redessiner le sol sous le joueur. Le contrôle est contraint à la voie choisie pendant la séparation, jusqu'à ce que les deux chemins soient visuellement distincts.


## Dégagement du raccord et orientation du chat (v0.16)

Les façades sont désormais filtrées contre la **géométrie réelle du raccord visuel à 45°** : lorsqu'une maison ou son toit empiéterait sur la rue entrante, cette maison et ses décorations ne sont pas générées. Les bâtiments hors de cette zone restent inchangés. Les sprites de profil du chat utilisent la même animation à gauche et à droite : originaux sur la **gauche de l'écran** (orientés vers la droite), miroir sur la **droite de l'écran** (orientés vers la gauche). La vue arrière reste utilisée au centre.
