# Purrkour — Gameplay Design Document

**Statut :** document de référence évolutif. **Mise à jour :** novembre 2026.  
**Prototype analysé :** branche `main`, après la passe panorama/fossés.  
**Principe :** une course féline mobile-first, rapide, kawaii, sans combat ni destruction. Le plaisir vient du placement au pouce, des sauts, des rebonds et des choix de prise de risque.

> **Légende** — ✅ implémenté dans le code ; 🟡 partiel/prototype ; ⬜ spécification, pas encore codé.

## 1. Les piliers

1. **Un seul doigt, un contrôle immédiat.** Glisser horizontalement dans la moitié basse de l'écran déplace le chat ; lever le doigt déclenche le saut. La caméra doit toujours rendre le sens du déplacement évident.
2. **Du flow entre les obstacles.** Il doit toujours y avoir une action agréable à faire : attraper des poissons, choisir une ligne, se repositionner, anticiper un rebond.
3. **Risque choisi, récompense visible.** Un parcours sûr reste possible ; un parcours plus difficile rapporte davantage. Ne jamais forcer un rebond exigeant pour survivre.
4. **Difficulté progressive, pas seulement vitesse.** Ajouter des types de décisions, puis des combinaisons, tout en conservant un bon temps de lecture sur téléphone.
5. **Roguelite léger.** Points et poissons de run maintenant ; améliorations de run et déverrouillages permanents plus tard.

## 2. Boucle de jeu actuellement disponible

| Système | Statut | Implémentation réelle |
| --- | --- | --- |
| Course auto, accélération | ✅ | `speedStart=3.8`, `acceleration=0.07`, plafond normal `speedMax=8.5` m/s dans `src/game/core.ts` |
| Direction latérale au pouce | ✅ | Position cible au contact et saut au relâchement |
| Saut / rebond sur caisse | ✅ | Choc latéral : fin de run ; atterrissage sur la face supérieure : rebond automatique et +35 points |
| Poissons au sol / en l'air | ✅ | Poissons simples, dorés accessibles au saut et dorés hauts (`sky`) demandant un rebond |
| Boost | ✅ | Accélération temporaire `+1.7` m/s ; score des poissons doublé pendant l'effet |
| Score et réserve permanente de poissons | ✅ | Conservation locale à la fin du run, pas de boutique |
| Cycles de séquences variées | 🟡 | Les séquences sont placées à des positions fixes et répétées tous les 100 m |
| Combo de compétence | ⬜ | Aucun multiplicateur basé sur une série d'actions réussies |
| Générateur de patterns / directeur de difficulté | ⬜ | Aucun choix dynamique de pattern ; toutes les caisses et fossés suivent un calendrier fixe |
| Pouvoirs, niveaux et déblocages globaux | ⬜ | Concept défini, non implémenté |
| Synchronisation musicale | ⬜ | Musique diffusée en boucle, pas de synchronisation du gameplay au tempo |

### Observation critique

À vitesse normale, le plafond de **8,5 m/s** est atteint au bout d'environ **67 secondes**, soit **environ 413 m** sans boost. Les caisses sont placées à 18, 41 et 88 m de chaque cycle de 100 m, et le fossé commence à 68,5 m et se termine à 70,8 m. Au-delà, une grande partie du parcours est répétée à difficulté comparable.

Il ne faut donc **pas** confondre l'alternance de quelques poissons bonus avec une véritable progression de la difficulté.

## 3. Les quatre phases d'un bon cycle

Ces phases décrivent le **ressenti recherché**, pas quatre niveaux distincts. Les durées sont des hypothèses à tester à la vitesse réelle du run.

| Phase | Durée cible (à tester) | Intention | Patterns exemples |
| --- | --- | --- | --- |
| **Flow** | 5–9 s | Déplacer le pouce, ramasser, se sentir compétent | Ligne de poissons, léger slalom, rebond facultatif |
| **Choix / risque** | 4–7 s | Choisir entre sûr et lucratif | Détour avec 4 poissons ou caisse + doré haut |
| **Tension** | 3–6 s | Demander une décision précise sans saturer l'écran | Deux obstacles décalés, saut de fossé annoncé, timing de réception |
| **Récompense / relâchement** | 3–6 s | Payer l'effort et restaurer la lisibilité | Traînée de poissons, boost, bonus sonore, espace ouvert |

**Règle :** la séquence doit être lisible en **temps**, pas seulement en mètres. À vitesse élevée, les espacements augmentent si nécessaire. Le but n'est pas de générer davantage d'obstacles par seconde à l'infini.

## 4. Bibliothèque de patterns

| Pattern | Statut | Chemin sûr / enjeu / récompense |
| --- | --- | --- |
| **Fish Lane** — ligne au sol | ✅ | Ligne facile, sans danger ; récompense de flow |
| **Jump & Grab** — caisse + doré moyen | ✅ | Saut simple au-dessus de la caisse, poisson accessible sans rebond |
| **Bounce & Grab** — caisse + doré haut | ✅ | Route à risque : rebond obligatoire pour le doré ; trajectoire latérale sûre conservée |
| **Boost Trail** — étoile + traînée | ✅ | Accélération et poissons immédiatement après la collecte |
| **Simple Slalom** — poissons en zigzag | ✅ | Petites corrections latérales |
| **Safe or Skill** — deux trajets visuellement parallèles | 🟡 | Quelques lignes sûres existent ; la présentation comme vrai choix spatial n'est pas systématique |
| **Bounce Staircase** — rebond, arc de poissons, réception | 🟡 | Quelques arcs de poissons existent ; pas de double rebond orchestré |
| **Double Bounce** — deux caisses consécutives | ⬜ | Événement signature exigeant, surtout après apprentissage |
| **Gap Choice** — traversée sûre ou rebond de traversée | ⬜ | Avertissement visuel en amont ; risque optionnel |
| **Boost Corridor** — vitesse + alignements ouverts | ⬜ | Sensation de récompense à haute vitesse, sans rendre les obstacles impossibles |
| **Recovery Strip** — ligne facile après pic | ⬜ | Garantit un retour au calme / à la maîtrise |

### Moments signatures à produire en priorité

1. **Le grand poisson doré.** Reconnaissable depuis l'amorce, placé sur une trajectoire de rebond avec atterrissage facile derrière.
2. **Le collier de poissons.** Série de collectibles qui accompagne naturellement un arc de saut et renforce le rythme.
3. **La ruelle turbo.** Étoile de boost suivie d'une trajectoire généreuse à fort rendement.
4. **Le choix du chat agile.** À gauche une route sûre et modeste, à droite un rebond risqué et un gros bonus ; la décision doit se lire avant la bifurcation.

## 5. Difficulté progressive par couches — cible, PAS encore implémentée

| Progression indicative | Ce qui évolue | Ce qui doit rester garanti |
| --- | --- | --- |
| **0–100 m : découvrir** | Fish Lane, caisses isolées, dorés atteignables au saut simple | Temps pour expérimenter saut / déplacement |
| **100–250 m : choisir** | Premiers dorés rebond obligatoire, voies sûres opposées | Le joueur peut ignorer la récompense risquée |
| **250–500 m : enchaîner** | Slaloms, rebonds avec réception orientée, variation des espacements | Pas de piège impossible au sortir d'un boost |
| **500–900 m : maîtriser** | Nouveaux agencements de 2 mécaniques, montée douce de précision | Une action claire à la fois quand l'écran est chargé |
| **900 m et + : endurance** | Variété et précision supplémentaires, événements signature rares | Pas de progression infinie de vitesse / densité |

Ces paliers sont **des objectifs**, pas la règle actuelle. À implémenter via un directeur de difficulté et des patterns validés séparément.

### Les six couches proposées

1. **Vitesse :** progression jusqu'au plafond, puis maintenir la lisibilité.
2. **Complexité du placement :** décalages latéraux, trajectoires courtes puis longues.
3. **Timing vertical :** saut, saut au-dessus d'une caisse, rebond et réception.
4. **Choix de risque :** route sûre / route riche ; jamais seulement « réussir ou mourir ».
5. **Enchaînement :** deux mécaniques apprises séparément avant combinaison.
6. **Variation :** sélection de patterns par familles, sans répétition trop proche.

## 6. Futures règles d'un directeur de patterns

**Pas codé pour le moment.** Proposition d'architecture TypeScript :

- Définir les patterns comme données typées (ID, catégorie, difficulté, durée, largeur utile, récompenses, conditions d'éligibilité).
- Utiliser une sélection pseudo-aléatoire **à graine déterministe**, compatible avec des tests reproductibles et la génération de chunks.
- Ne sélectionner que les patterns dont les contraintes de vitesse, largeur, durée du saut et distance de récupération sont satisfaites.
- Imposer des transitions lisibles entre phases ; ne pas placer automatiquement deux pics de tension consécutifs.
- Ajouter un modificateur de variété (éviter les 2–3 derniers patterns) sans rendre la distribution imprévisible.
- Conserver les collisions et les trajectoires dans `core.ts`, indépendamment de Three.js.
- Prévoir un outil de simulation automatique qui vérifie l'existence d'au moins **une route sûre** à chaque vitesse et avec ou sans boost.

**Ne pas commencer par un générateur aléatoire complet.** Première étape : bibliothèque de 6–8 patterns définis à la main, puis directeur léger qui les choisit.

## 7. Combo et game feel — à produire

- **Combo de collecte (⬜)** : série de poissons attrapés sans interruption trop longue ; petit multiplicateur de score, distinct de la monnaie permanente.
- **Combo d'adresse (⬜)** : « rebond → poisson haut → réception » ; bonus visuel/sonore ponctuel, jamais obligatoire.
- **Retours immédiats (⬜)** : micro-pop du score, particules peu coûteuses, squash & stretch du chat, légère accentuation au rebond.
- **Boost (✅ / 🟡)** : effet de vitesse et de points déjà codé ; VFX et son de boost dédiés à produire.
- **Musique (✅)** : bande-son originale en boucle ; contrôles sonores. Couplage audio-événement non implémenté.

**Attention :** le combo ne doit pas punir les joueurs qui ratent un poisson décoratif ou choisissent une voie sûre.

## 8. Critères de validation sur mobile

Avant de produire plus de mécaniques :

1. À 3,8 / 6 / 8,5 m/s, identifier au premier regard les caisses, dorés hauts et fossés.
2. Tester la distance d'anticipation et le temps pour déplacer le pouce entre les deux bords.
3. Tester qu'un doré de rebond est accessible par sa trajectoire et non par un saut normal.
4. Vérifier qu'un changement de voie forcé reste faisable après collecte d'un boost.
5. Vérifier qu'une nouvelle séquence apparaît perceptiblement au-delà de 500 m.
6. Mesurer la distribution des morts et des poissons manqués, par pattern et par palier.
7. Tester les effets et le son sur un téléphone milieu de gamme, sans perdre la fluidité.

## 9. Priorités proposées pour les prochaines versions

### Étape A — davantage de rythme (priorité haute)
- Extraire du `core.ts` le calendrier fixe des caisses / poissons en patterns typés.
- Ajouter **Safe or Skill** et **Recovery Strip**.
- Créer une première rotation de 6–8 motifs, avec transition entre Flow, Choix, Tension et Récompense.
- Préserver les règles physiques actuelles.

### Étape B — premières récompenses d'adresse
- Ajouter combos courts et VFX ponctuels.
- Compléter **Bounce Staircase** et **Boost Corridor**.

### Étape C — difficulté en couches et roguelite
- Ajouter le directeur avec une progression conditionnée au palier et aux contraintes physiques.
- Introduire les accomplissements qui déverrouillent des compétences accessibles en run et leurs niveaux 2–3.
- Utiliser la banque de poissons pour des déblocages permanents, à équilibrer après les tests.

---

**Règle de maintenance :** mettre à jour les colonnes « Statut » et « Implémentation réelle » à chaque changement majeur du gameplay. Ne jamais présenter les mécaniques de cette spécification comme fonctionnelles avant leurs tests et leur déploiement.
