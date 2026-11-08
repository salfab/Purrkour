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


## v0.17 — Récompenses immédiates et tests

Les poissons remplissent une **jauge d'Instinct**, qui déclenche automatiquement **Purr Rush** (aimant sur les poissons bleus et double score temporaire). Un combo **rebond → doré haut → réception** rapporte un bonus PURRFECT et augmente le multiplicateur de score. Le module pur `src/game/rewards.ts` porte ces règles, testées par Vitest ; la documentation complète des prochaines étapes (pigeons, chariots, missions, boutique et roguelite) est dans [docs/GAMEPLAY.md](docs/GAMEPLAY.md).

Les poissons de la réserve persistante **ne sont pas encore dépensables** : la boutique est prévue pour la v0.19.


## Retour visuel Purr Rush (v0.17.1)

Le pouvoir se voit désormais **sur le chat lui-même** : halo, impulsion dorée et étincelles de traînée, en plus d'un contour lumineux discret de l'écran. Le centre de la piste reste visible. La traînée suit même les embranchements courbes. Deux petites textures Canvas et des sprites recyclés limitent l'usage GPU ; aucun modèle 3D supplémentaire. Les effets sont testés dans `tests/rushVisualState.test.ts`.


## Sprites transparents sans artefacts (v0.17.2)

Les **8 poses de profil** conservent leur source PNG et les **4 poses arrière** leur source WebP. Les deux atlases sont découpés **une seule fois au chargement** en textures Canvas RGBA individuelles, avec `ClampToEdgeWrapping`, `LinearFilter` et mipmaps désactivées. Chaque pose est indépendante : le GPU ne peut plus échantillonner la pose voisine. Le miroir gauche/droite réutilise les mêmes poses de profil.

La source WebP arrière contient des pixels rouges saturés sous les pattes : un nettoyage ciblé des pixels du bas les rend transparents sans modifier les coussinets roses ou le pelage. Les poissons et décorations restent des sprites Canvas autonomes ; les matériaux de piste, façade et terrasse conservent leur répétition et leurs filtres adaptés aux surfaces 3D.


## Atlas arrière nettoyé (v0.17.3)

Le chat de dos utilise désormais `public/assets/character/cat_rear_clean.png` : quatre poses illustrées transparentes de 96×96 px sans parasites rouges sous les pattes. Le chargement en textures indépendantes reste identique. Les profils gauche/droite et les poissons ne sont pas modifiés.


## Animation de saut et panorama haute qualité (v0.17.4)

Le chat **vu de dos** joue désormais des poses différentes en montée, au sommet du saut, en descente et à la réception ; les sprites de profil et les poissons ne changent pas. Le module `src/game/catMotion.ts` est purement déterministe et couvert par des tests.

Pour le panorama, `ScenicBackdrop.ts` essaie en priorité `public/assets/backgrounds/mediterranean_horizon_hq.jpg`, une version JPEG haute qualité de l'image source originale 2172×724 (export ciblé 1536×512, qualité 92). **Il faut encore importer ce fichier JPEG dans le dépôt** : en son absence, le jeu se replie sur `mediterranean_horizon.avif` pour ne pas afficher un fond vide. L'ancien AVIF pourra être supprimé une fois le JPEG installé et validé sur téléphone.


## v0.17.5 — Visuels de boost et texture du terrain

Le jeu utilise bien le panorama HQ JPEG déjà présent dans `public/assets/backgrounds/`. Le boost de vitesse conserve le sprite de profil original à traits jaunes (image 7), ajoute de petites lignes de vitesse et utilise des versions enrichies des quatre poses arrière nettoyées. L'ombre diminue progressivement pendant les sauts. Le motif des terrasses en contrebas a été agrandi et ses UV sont continus entre les segments. Voir `docs/GAMEPLAY.md`.


## v0.17.6 — Boost lisible, pavés agrandis

Le boost de profil utilise l'image dessinée originale avec ses traits jaunes, sans la traînée de sprites flottants ajoutée en v0.17.5. Les variantes arrière gardent des accents dorés plus sobres. Le motif sur la piste est agrandi à 5,5 m par répétition, avec les mêmes UV sur la bifurcation pour éviter les faux raccords.


## v0.17.7 — PNG originaux kawaii restaurés

Les personnages utilisent désormais les deux grandes sources originales **1024×512 RGBA** dans `public/assets/character/`. Les atlas de profil et de dos contiennent chacun huit poses en **4×2** et conservent leur **boost illustré d'origine**, sans dessin ajouté sur les sprites ni suppression de couleurs au niveau des pattes. Voir [GAMEPLAY.md](docs/GAMEPLAY.md) pour le mapping des poses et les tests. La v0.18 ajoutera les obstacles mobiles.


## Purrkour v0.18 — Obstacles mobiles

Après 400 m, un groupe de pigeons traverse la piste. Après 500 m, un chariot de fruits roulant peut être évité ou utilisé comme trampoline pour attraper un poisson doré haut. Les collisions sont non mortelles : le chat perd son combo, 30 points et ralentit brièvement. Les patterns sont introduits séparément puis mélangés progressivement après 600 m. Les commandes et sprites restaurés du chat sont inchangés.


## v0.18.1 — Quartiers visuels (prototype de progression)

La ville change maintenant de quartier tous les **325 m** pour faciliter les tests : Vieille ville → Marché (auvents et étals) → Jardins suspendus (balcons et feuillage) → Toits du crépuscule (lanternes et couleurs nocturnes). Les maisons ont plusieurs silhouettes et leurs crépis utilisent les textures existantes. Le ciel, la brume, l'éclairage et la teinte du panorama HQ changent progressivement. Le réglage de production pourra être porté à 500 ou 1000 mètres en modifiant `DISTRICT_LENGTH_METRES` dans `src/game/districts.ts`. Cette passe est **purement visuelle** ; l'énergie des poissons et Griffe suivront après validation du décor.


## v0.18.2 — Des maisons qui ressemblent à des maisons

Refonte du décor autour de la piste : les parcelles sont distribuées tous les 12 m (au lieu d'un bâtiment fixe tous les 36 m), avec de petites cours, des maisons basses et hautes et cinq silhouettes géométriques vraiment différentes. Les toits en plaques inclinées ont été remplacés par des volumes de toiture corrects ; auvents rayés, balcons et tourelles appartiennent désormais aux volumes. Ces modules partagent leur géométrie et réutilisent les textures existantes pour rester adaptés aux téléphones. La route, les collisions et le Y sont inchangés. Plan d'assets et règles de densité détaillés dans [GAMEPLAY.md](docs/GAMEPLAY.md).


## v0.18.3 — Premier essai de façades peintes

Des **atlas PNG raster peints** sont maintenant appliqués aux murs et aux toits des maisons modulaires : quatre nuances de crépi issues des références illustrées et deux variantes de tuiles stylisées. Les atlas sont recadrés dans des textures GPU séparées sans compression WebP/AVIF et remplacent les anciens matériaux après chargement. Les façades sont rapprochées de 35 cm sans envahir le couloir de jeu. Pour inspecter les quatre quartiers rapidement, utilisez **[le mode aperçu 100 m](https://salfab.github.io/Purrkour/?districtPreview=1)**, sans modifier la progression normale à 325 m.

Cette première passe ne remplace pas encore les anciennes fenêtres, portes et accessoires par des illustrations nouvelles. Si l'effet reste trop générique, le prochain choix est la façade entièrement dessinée en sprite avec seulement les volumes interactifs en 3D. Voir [GAMEPLAY.md](docs/GAMEPLAY.md).
