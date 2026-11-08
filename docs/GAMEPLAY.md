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
| Combo de compétence | ✅ v0.17 | Rebond → doré haut → réception ; multiplicateur de score ×2 à ×4, expirant après 13 s |
| Générateur de patterns / directeur de difficulté | 🟡 | Séquences choisies par graine depuis v0.10 ; pas encore de directeur adaptatif au temps de réaction |
| Pouvoirs, niveaux et déblocages globaux | 🟡 | Purr Rush temporaire ajouté en v0.17 ; niveaux de compétences et déblocages globaux non implémentés |
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


## 10. Première implémentation du directeur (v0.10)

**✅ Implémenté partiellement.** `src/game/gameplayDirector.ts` contient 8 patterns typés : Fish Lane, Jump & Grab, Bounce & Grab, Safe or Skill, Boost Trail, Slalom, Weave, Recovery Strip. Les quatre positions d'événement restent prévisibles dans chaque cycle de 100 m, et les fossés restent fixes ; **ce n'est pas encore un level designer procédural complet**.

- 0–100 m : tutoriel fixe ; 100–200 m : premier Bounce & Grab.
- Après 200 m : choix déterministe par graine de run et palier de distance, avec des variantes de trajectoires, caisses et poissons associées au même plan.
- Le code de simulation et Three.js utilisent le même run seed, évitant qu'un poisson soit dissocié de sa caisse.
- Les quatre phases Flow, Choix, Tension et Récompense sont représentées par quatre slots ; les timings en secondes et la densité adaptative ne sont pas encore implémentés.
- Les caisses sont individuelles et laissent un côté libre ; la faisabilité complète de toutes les trajectoires (notamment boost et récupération) n'est **pas encore validée par une simulation automatique**.
- Le sprite existant est inversé à droite. Il faudra créer un atlas spécifique de course vue arrière pour centrer proprement le personnage.
- Les consignes tactiles disparaissent au-delà de 42 m.

## 11. First Route Fork — v0.11

**✅ Prototype implémenté.** Une seule bifurcation expérimentale apparaît vers **250 m**.

- À partir de **229 m** : les deux parcours sont annoncés dans un bandeau mobile et par des portails en 3D.
- **À 250 m** : choix automatique selon la position latérale du chat. **Gauche écran = Poissons**, **droite écran = Acrobaties**. Aucune pression sur un bouton, aucun relâchement du pouce requis.
- Le virage est simulé pendant **0,95 seconde** avec une rotation douce de la caméra et un léger penchement du sprite, sans interrompre la course.
- Un système central `src/game/routeChoices.ts` assure la cohérence entre le choix, la simulation, le rendu et l'interface.
- Les segments entre 250 et **400 m** adoptent des ensembles de patterns différents : davantage de lignes/boosts côté poissons, davantage de caisses/rebonds côté acrobaties.
- La portion **200–300 m** exclut exceptionnellement son fossé pour sécuriser la lecture et la transition.
- Le directeur conserve les règles physiques et le couloir linéaire ; la géométrie de deux véritables routes qui tournent à 90° n'est **pas encore implémentée**.
- Les portails sont des éléments visuels non solides, et le passage entre deux univers est représenté par l'animation de caméra et le changement de patterns.
- Aucun choix de branche permanente ni de ressource consommable ; c'est une décision propre au run.
- Tests automatisés : direction droite/gauche (axes caméra), tutoriel conservé, mode actif, et alignement des caisses avec leurs récompenses.

**À tester sur téléphone :** compréhension immédiate des pictogrammes, distance réelle d'anticipation, absence de cinétose à la rotation, visibilité des couleurs du portail, différence perceptible de difficulté entre les deux voies. Une vraie route courbe nécessitera ensuite une adaptation des coordonnées de déplacement et de la caméra, sans la simuler par un simple écran de transition.

## 12. Bifurcation spatiale et réunion (v0.12)

**✅ Implémentation géométrique sans graphe routier.** `src/game/routeGeometry.ts` convertit la distance du runner en une position 3D et un angle. Les deux branches symétriques sont des courbes continues, virent à 90° et reviennent à un même point avec une orientation commune, vers **430 mètres**.

- Avant le choix, les deux rues sont visibles. Après validation, la rue choisie est dessinée et peuplée par `ArtWorld`, l'autre par `RouteForkView` comme décor exclusivement.
- La caméra suit la trajectoire de la route ; les pavés, bordures, bâtiments, caisses, poissons et le chat utilisent la même transformation spatiale.
- Les deux branches se rejoignent réellement en coordonnées du monde (même point et même tangente) ; seule la direction choisie est conservée en mémoire.
- La simulation reste exprimée en distance parcourue et largeur de piste locale. Aucun graphe ni collision sur la branche non choisie.
- La zone jusqu'au retour vers le tronc commun est volontairement sans fossé pour protéger les virages.
- **À valider sur téléphone :** raccords entre portions de bordures, lisibilité des portails, apparition visuelle de l'autre branche et fluidité de caméra.

### Animation du personnage au centre (v0.12)

Le chat utilise désormais deux orientations de sprite :

- **Centre** (`|x| < 0,48`) : animation arrière dédiée à **4 poses transparentes**, dessinée sur Canvas au chargement du jeu pour limiter le poids mobile.
- **Côtés** : atlas kawaii original à 8 poses, inversé horizontalement du côté droit.
- La caméra suit les virages géométriques tandis que le sprite reste lisible en billboard.

La version Canvas des poses arrière est un **premier jeu de sprites fonctionnel**. Le spritesheet illustré haute fidélité pourra remplacer ce rendu sans modifier la logique de sélection d'orientation.

Tests automatiques disponibles dans `tests/routeGeometry.test.ts` et `tests/routeFork.test.ts`.


## 13. Bifurcation simplifiée et cadrage mobile (v0.13)

Après retour utilisateur, la v0.12 ne correspondait pas à l’effet recherché : la caméra perdait la route lors des grandes boucles et la seconde branche était modélisée trop longtemps.

**v0.13** remplace donc ces grandes boucles par :

- **Un court S en 2 virages de 45°** immédiatement après le choix (250 m). Le tracé devient parfaitement rectiligne au bout d'environ **28 m**. Le gameplay et le monde continuent sur la même direction, légèrement décalée selon le choix.
- **Une courte voie d'accès factice de 19 m**, qui n’existe que près de 391–410 m et arrive du côté abandonné avec un angle de **45°**. Elle n'est jamais jouable et il n’y a aucun graphe de routes à maintenir.
- **Un cadrage adaptatif** (`routeCamera.ts`) : recul et ouverture du champ pendant le S, puis retour à la caméra d'origine. Les bords de la piste sur les 22 prochains mètres sont projetés pour dimensionner le champ horizontal même sur les écrans étroits.
- **Sprites latéraux** : vue arrière au centre, atlas kawaii de profil sur les bords, inversion du profil sur la **gauche visible à l’écran** (position locale positive) afin que l'orientation corresponde au sens du point de fuite.
- **Optimisation mobile :** seules deux très courtes prévisualisations de branches et le raccord factice sont dessinés. L'ancienne représentation complète des deux parcours est supprimée.

La branche alternative ne correspond pas à une route réellement empruntable : ce n'est qu'un leurre géométrique. Cette version doit encore être vérifiée sur téléphone pour le cadre, la perspective et la transition du décor.


## 14. Transition caméra et sprites arrière (v0.14)

- La caméra anticipe désormais le cadrage **avant** le choix de branche, même quand aucune direction n'est encore choisie. Le choix à 250 m ne déclenche donc plus soudainement un recul de plusieurs mètres.
- Recul supplémentaire pendant le S réduit à **1,5 m** (contre 5 m), variation de hauteur réduite à **0,45 m** ; champ un peu plus large pour préserver la piste entière.
- Position, orientation et FOV de la caméra sont interpolés exponentiellement avec demi-vie de 0,16 s, indépendante du taux de rafraîchissement.
- **Centre :** l'atlas illustré WebP avec quatre poses de course, vraie transparence, est chargé depuis `public/assets/character/cat_rear_strip.webp`. Le chat Canvas n'est conservé que comme secours.
- **Gauche et droite :** mêmes frames du spritesheet kawaii latéral, avec **UV miroir** à gauche plutôt qu'une échelle X négative qui pourrait perturber le rendu du billboard.
- La course et les collisions ne sont pas modifiées.


## 15. Correctif continuité du Y et contrôle de branche (v0.15)

Le Y n'est plus reconstruit à l'instant du choix. Les deux courtes prévisualisations restent dessinées avec **le même matériau et les mêmes UV** que la piste principale, et elles couvrent désormais l'intégralité du détour jusqu'à la limite exacte de **288 m** (frontière des chunks de 12 m). `ArtWorld` commence la section sélectionnée **à 288 m seulement**. Aucun remplacement brutal du sol n'a lieu sous le chat à 250 m.

Les deux voies commencent comme deux moitiés contiguës de la route commune et s'élargissent graduellement. Après le point de non-retour, `simulate()` limite le déplacement latéral à la partie de la route sélectionnée jusqu'à la fin du S. Le joueur ne peut plus traverser l'autre voie, même s'il garde le pouce à l'opposé. Les collectibles précédemment invisibles sous le Y sont neutralisés. Cette sécurisation est couverte par des tests de simulation.


## 16. Raccord dégagé et symétrie latérale (v0.16)

- Les maisons ne doivent jamais traverser la rue de raccordement factice à 45° : avant d'ajouter une façade, le générateur teste son emprise au sol et celle de son toit contre plusieurs points de la bande routière. Les seules façades trop proches sont supprimées, sans modifier les obstacles ou la route active.
- Le chat utilise le sprite arrière au centre ; sur le côté gauche de l'écran il conserve le profil original tourné vers la droite, et sur le côté droit il réutilise le **même profil** inversé horizontalement. La logique d'orientation est extraite dans `src/game/catView.ts` et couverte par des tests.

---

## 17. Nouvelle boucle de récompenses et feuille de route (novembre 2026)

### Le problème à résoudre

Après quelques minutes, le joueur connaît la course, les caisses et les ravins, mais n'a pas assez de raisons de risquer sa partie pour attraper les poissons. Le score existe et les poissons s'ajoutent à une banque, mais **la banque ne sert toujours à rien**. La difficulté plafonne trop vite et ne combine pas assez de mécaniques.

**Nouvelle boucle visée** : courir → prendre un risque lisible → réussir un enchaînement → gagner de l’Instinct → déclencher Purr Rush → atteindre des objectifs → obtenir des déblocages permanents → recommencer avec une nouvelle intention.

### v0.17 — Instinct, Purr Rush, combo (✅ implémentation initiale)

- **Poissons bleus : +4 Instinct**, poissons dorés simples : +15, **dorés hauts : +30** ; boost : +8. Ces valeurs sont des hypothèses d'équilibrage.
- À **100 Instinct**, activation **automatique** de **Purr Rush pendant 6 secondes**, sans nouveau bouton. Un compteur de déclenchements figure à l'écran.
- Pendant le Rush, le score des poissons est **doublé** et les **poissons bleus** proches sont attirés (rayon de prise latéral agrandi). Les poissons jaunes/dorés, notamment ceux qui exigent un rebond, **ne sont jamais attirés**.
- La collecte remplit encore la jauge pendant le Rush ; elle peut se déclencher de nouveau une fois le pouvoir terminé. Le compteur d'Instinct et le Rush se réinitialisent à chaque run.
- **Combo d'adresse : rebond sur caisse → poisson doré haut en vol → réception sur la piste** dans la fenêtre d'environ 4,5 s. La réception réussie offre un bonus de **150 × rang de combo** et fait augmenter le multiplicateur du score des prochains poissons (**×2 à ×4**).
- La chaîne expire après **13 secondes** sans nouvelle réception parfaite et est perdue en cas de mort. Un poisson manqué ne la casse pas. Les poissons conservés en banque ne sont pas multipliés par le combo.
- HUD dédié **Instinct / Purr Rush / combo**, message **PURRFECT!** lors d'un enchaînement réussi ; légère teinte chaude du chat pendant le Rush. Conservation du sprite kawaii existant.
- En présence d'un boost de vitesse, son multiplicateur de score et celui du Purr Rush peuvent se cumuler. Ce cumul est volontaire et sera rééquilibré à l'usage.
- **Tests automatiques requis :** seuil de la jauge, déclenchement et durée, aimant bleu uniquement, combo correct et ordre des actions, expiration, mort, remise à zéro entre runs, non-régression des contrôles et embranchements.

**Limite de la v0.17 :** la réserve persistante de poissons n'est pas encore dépensable ; il n'y a pas de magasin, de déblocage permanent ni de mission implémentée. Le HUD et les récompenses doivent être éprouvés sur téléphone.

### v0.18 — Plus de tension et de variété (⬜ prévu)

Introduire **deux nouveaux types d’obstacles non violents** :

1. **Pigeons qui traversent** : trajectoire visible/anticipable ; contact = perte de combo ou de vitesse plutôt qu'une mort automatique, à valider. Exiger une vraie décision latérale.
2. **Chariot roulant** : obstacle mobile qui peut être évité ou utilisé comme plateforme de rebond ; danger plus grand, récompense proportionnée.

Puis étendre la bibliothèque de patterns au directeur : approches de faible intensité, pics de tension courts, récupération, combinaisons apprises progressivement. Ajuster la densité **en temps de réaction**, pas seulement en mètres. Introduire la difficulté par couches (vitesse, positionnement, timing, risque, enchaînement, variété), sans pièges impossibles ni répétition trop rapide. Conserver une voie de survie et les contraintes de sécurité durant la bifurcation.

**Plus tard**, envisager les draps suspendus et les bourrasques de vent, après validation de la lisibilité et de la stabilité des contrôles.

### v0.19 — Objectifs, dépenses et roguelite (⬜ prévu)

- **Missions mesurables par run** : poissons, rebonds, dorés hauts, combo parfait, déclenchements de Rush, distance. Elles doivent demander des actions concrètes plutôt que du grind arbitraire.
- **Accomplissements permanents** déverrouillant les compétences disponibles au cours des runs (Aimant félin, Rebond amélioré, Instinct prolongé, etc.).
- **Niveaux 1–3 des compétences** : le niveau 1 existe d'abord ; les niveaux 2 et 3 doivent être déverrouillés globalement par des accomplissements avant d'être disponibles en run.
- **Boutique utilisant la réserve de poissons** pour des améliorations ou des skins kawaii ; l'économie doit être équilibrée pour ne pas éliminer le plaisir des runs sans achat.
- **Progression méta** : quelques déblocages permanents, pas une inflation illimitée du pouvoir du chat ; réconcilier la difficulté du parcours avec les améliorations obtenues.
- Faire participer les routes Poissons / Acrobaties à des objectifs différents, en gardant des récompenses équitables pour les deux styles de jeu.

### Critères de réussite et instrumentations à venir

Mesurer durée moyenne de run, proportion de joueurs obtenant un Rush, fréquence des combos parfaits, distribution des morts par obstacle, choix des branches et taux de collecte des poissons hauts. Une mécanique attractive doit être comprise et tentée volontairement ; une mécanique qui conduit systématiquement à des morts frustrantes doit être revue.

### Stratégie de tests

Chaque modification significative doit inclure des tests **Vitest** des règles déterministes pures dans `src/game/`, plus des **tests d'intégration de simulation** pour les collisions, rebonds, collectibles, choix de route et score. Tests existants de caméra et de géométrie à conserver. Le pipeline GitHub Actions exécute **TypeScript strict → Vitest → Vite build → GitHub Pages** et le déploiement n'est déclaré réussi que si le workflow complet réussit.

Les tests automatisés **ne prouvent pas** la qualité perceptive sur mobile : cadrage, animation, contraste, sensation de risque, musique et ergonomie doivent toujours faire l'objet de tests réels.


### v0.17.1 — Effets visuels de Purr Rush (✅ ajoutés)

Retour d'usage : une jauge et une légère teinte du chat ne suffisent pas à rendre le Rush perceptible pendant le gameplay. Ajout d'une aura dorée persistante et d'une impulsion de déclenchement autour du chat, plus une traînée de 14 étincelles suivant la trajectoire réelle (même pendant le détour en Y). Un vignettage discret sur les bords, de petites lignes de vitesse et une bannière « ×2 POINTS / AIMANT » sont affichés uniquement pendant le Rush. Aucune modification de la physique, du cadrage ou de l'économie des poissons.

Implémentation : `src/game/RushEffects.ts` utilise deux textures Canvas réutilisées et 16 sprites mis à jour sans allocations géométriques par frame, pour limiter le coût sur mobile. Le module pur `rushVisualState.ts` fournit l'état du déclenchement, de l'aura et des traînées ; des tests Vitest vérifient leur durée, le masquage pendant la pause et le suivi des routes courbes. Les animations CSS sont coupées par `prefers-reduced-motion`.


### v0.17.2 — Correction technique des sprites du chat

Sur certains téléphones, les poses arrière présentaient des couleurs rouges parasites aux pattes. Vérification de l'asset : ces pixels existent dans l'image source et ne sont **pas seulement** causés par le filtrage. Le module `src/game/characterFrames.ts` découpe les 4 poses arrière WebP et 8 poses de profil PNG en textures **RGBA indépendantes**, configurées sans mipmaps, avec `LinearFilter` et `ClampToEdgeWrapping`. Il supprime, pour les poses arrière uniquement, les pixels rouges très saturés sous les pattes, tout en conservant le rose normal des coussinets. Ce nettoyage est déterministe et testé dans `tests/characterFrames.test.ts`.

Les poissons et objets décoratifs sont déjà des sprites à texture unique ; les textures de sol et de façades doivent, elles, continuer à se répéter. Aucun changement aux contrôles, au gameplay ou à la géométrie.


### v0.17.3 — Source de dos nettoyée (✅)

Le WebP arrière de 72 pixels par pose comportait du bruit de compression et des pixels colorés autour des pattes. Remplacement par un PNG transparent à quatre poses de 96 × 96 px, extrait de l'illustration originale plus grande, avec marge interne. Le découpage en textures séparées, le filtrage linéaire sans mipmaps et le clamp sont conservés. Les sprites de profil et les poissons ne sont pas modifiés. Tests : dimensions, canal alpha, chargement et chemin d'asset.


### v0.17.4 — Animation de saut du chat arrière et fond HQ (partiel)

La pose du chat vu de dos est désormais choisie selon la physique verticale : montée (étirement léger), sommet (pattes regroupées), descente et réception amortie (squash). Le comportement est encapsulé dans `catMotion.ts` et testé avec Vitest, avec conservation des textures nettoyées, de la transparence et des animations de profil existantes.

Le chargement du panorama est prêt à utiliser `mediterranean_horizon_hq.jpg` à partir de la **source PNG originale**, sans réencoder l'AVIF très compressé. En attendant l'import du JPEG dans `public/assets/backgrounds/`, un repli sur l'ancien AVIF préserve la scène publiée. Ce point n'est **pas encore terminé** tant que l'asset haute qualité n'est pas dans le dépôt.


### v0.17.5 — Boost de vitesse, ombre en saut et terrasses (✅ implémenté)

- Le panorama `mediterranean_horizon_hq.jpg` est désormais présent dans le dépôt et chargé en priorité. Son canevas de rendu est porté à **1536 px** maximum pour les écrans mobiles haute densité, avec recadrage non déformant ; l'ancien AVIF ne reste qu'un repli de chargement.
- **Boost de profil** : on conserve l'illustration d'origine de l'atlas kawaii (frame 7 avec ses traits jaunes) sans altérer l'animation normale. Des traits jaunes additionnels recyclés, peu coûteux, donnent une impression de vitesse.
- **Boost vu de dos** : quatre versions distinctes des quatre poses PNG nettoyées sont composées une seule fois dans le navigateur, avec des traits jaunes derrière le chat, puis sélectionnées uniquement pendant le boost de vitesse. L'animation de saut vue de dos reste active pendant le boost.
- **Ombre** : elle rétrécit continûment jusqu'à environ **75 %** et devient légèrement moins opaque lorsque le chat monte ; la taille revient à 100 % à la réception. Logique pure dans `visualPolish.ts`.
- **Terrain en contrebas** : la texture `terrace_pavers.webp` n'est plus répétée plusieurs fois à chaque mètre. Les coordonnées UV utilisent désormais une échelle cohérente de **8 mètres par motif**, sans répétition supplémentaire sur le matériau, avec continuité entre les chunks et dans les fossés.
- Tests de non-régression : limites de l'ombre, animation de profil boost (frame 7), largeur de motif et points de traînée de vitesse dans une courbe. Les sprites de profil non boostés et les poissons restent inchangés.


### v0.17.6 — Recul sur les particules du boost et piste agrandie

Le retour téléphone a montré que les traînées flottantes de la v0.17.5 rendaient le boost moins esthétique et gênaient la lisibilité de la pose du chat. **Suppression du système de 10 sprites de traits de vitesse dans le monde** : le profil utilise de nouveau uniquement **la frame boost originale du sprite kawaii (n°7, traits jaunes inclus)**. La vue arrière conserve quatre poses dédiées avec seulement deux accents dorés discrets par côté. Purr Rush et ses effets distincts ne sont pas modifiés.

Les pavés de la piste centrale utilisent désormais des coordonnées UV mondiales à raison d'une répétition de la texture tous les **5,5 mètres**, au lieu de plusieurs répétitions par largeur de piste. La piste principale, la branche du Y et le raccord à 45° utilisent une seule fonction `trackRibbonUV` et le même matériau, sans rupture de texture à 288 mètres. Le terrain en contrebas conserve sa taille de motif de 8 mètres.

Tests Vitest : échelle de motif, continuité des UV à 288 m, conservation de la frame boost d'origine et absence de nouveaux effets de gameplay.


### v0.17.7 — Retour aux sprites dessinés originaux (✅ intégré)

Les deux PNG originaux de **1024×512 pixels**, **RGBA véritable**, sont désormais stockés sans recompression dans `public/assets/character/` : `cat_side_original_hq.png` et `cat_rear_original_hq.png`. Chacun comprend **4 colonnes × 2 lignes de 256×256 pixels**. Les huit poses de profil et les huit poses de dos sont isolées dans des textures GPU indépendantes, avec les pixels originaux copiés sans retouche destructive.

- Profil : six frames de course, la frame 6 pour les sauts et **la frame 7 pour le boost original illustré avec ses propres traits jaunes**. Le miroir utilise la même image des deux côtés.
- Dos : six frames de course, la frame 6 comme pose de saut principale (avec transitions prises dans les frames 4 et 5) et **la frame 7 pour le boost**. Les transformations légères de squash et tilt restent pour la réception ; aucun trait supplémentaire n'est peint sur le chat.
- Suppression du nettoyage colorimétrique destructif `cleanRearFootArtifacts` et de `createRearBoostFrames`. Le dessin du chat par Canvas demeure uniquement un fallback si un PNG ne peut pas être chargé.
- Tests automatisés des deux PNGs, de leurs dimensions et de leur format RGBA, de la bonne sélection des huit poses, des miroirs, de la transparence et des changements d'état de la course et du saut. Les poissons, textures du sol et contrôles ne sont pas modifiés.

**v0.18 reste la prochaine étape**, pour les pigeons et chariots mobiles. Priorité d'abord à la validation visuelle de cette restauration sur téléphone.


## 18. Objets mobiles et difficulté par étapes (v0.18, première version)

- **Pigeons à partir de 441 m :** trois pigeons kawaii traversent latéralement le toit et battent des ailes. Ils se déplacent en fonction de la distance parcourue par le joueur, pas du temps réel, afin que les collisions et les images restent synchronisées à n'importe quel FPS. Le passage est anticipé par un symbole d'alerte. Une voie latérale reste libre, et le saut peut aussi les éviter.
- **Chariots à partir de 541 m :** un petit chariot de fruits se déplace lentement de gauche à droite. Le joueur peut l'éviter ou rebondir sur son dessus pour prendre un poisson doré haut (+45 points au rebond, combo d'adresse possible). Une voie de poissons bleus reste accessible sans rebond.
- **Pénalité douce :** un contact frontal coûte 30 points, interrompt le combo et ralentit le chat de 28 % pendant 1,25 seconde. Il ne provoque ni mort ni perte des poissons ou de l'Instinct. Chaque obstacle ne peut infliger qu'une seule pénalité par run.
- **Progression :** 0–400 m : mécanique précédente préservée ; 400–500 m : pigeons ; 500–600 m : chariot ; 600 m et plus : les nouveaux obstacles entrent dans le catalogue du directeur, avec parfois deux pressions par segment de 100 m. Chaque pattern conserve au moins une voie libre.
- **Architecture :** `movingObstacles.ts` contient la logique pure et déterministe, `MovingObstacleArt.ts` les représentations 2.5D de faible coût avec textures Canvas, et `ArtWorld` tient leurs visuels synchronisés avec la simulation. Les textures Canvas des pigeons et les chariots 3D simples sont une première version artistique qui pourra être remplacée plus tard.
- **Tests :** premiers obstacles garantis, variété déterministe, voie libre, collision unique, saut évitant les oiseaux, rebond de chariot, conservation du combo en cas d'évitement et perte en cas de choc, préservation des contraintes de l'embranchement. La jouabilité sur téléphone reste à valider.

Les tissus et bourrasques ainsi qu'un véritable directeur de vagues de tension seront évalués après cette première version, afin de ne pas multiplier les nouveautés sans mesure.


## 19. Prototype de quartiers visuels — v0.18.1

**Objectif de test :** faire ressentir une progression esthétique dans un run, sans modifier les obstacles, le comportement du chat, les contrôles ni les embranchements. Pour faciliter l'évaluation, les quartiers durent provisoirement **325 mètres**. La seule constante à modifier plus tard pour passer à **500 ou 1 000 mètres** est `DISTRICT_LENGTH_METRES` dans `src/game/districts.ts`. Les quartiers alternent et se répètent après quatre étapes (prototype de contenu, pas quatre biomes infinis uniques).

| Distance test | Quartier | Signes visuels |
|---|---|---|
| 0–324 m | Vieille ville | Crépi clair/rose, toits à deux pans, corniches et volets bleutés |
| 325–649 m | Marché | Façades chaudes, auvents rayés, petites échoppes, lumière de fin d'après-midi |
| 650–974 m | Jardins suspendus | Balcons multiples, rampes et jardinières, lierre et feuillage vert, lumière plus fraîche |
| 975–1299 m | Toits du crépuscule | Toitures plus hautes, lanternes chaudes, façades lavande et ciel bleu-violet |

Les silhouettes de maisons sont créées à partir de composants de faible coût (toits, volets, terrasses, auvents, pots, lanternes), selon la distance et une graine de run. Les façades réutilisent les deux textures de crépi déjà présentes ; plusieurs matériaux colorés réutilisent une même image, pour minimiser la mémoire GPU. L'évitement des façades qui traverseraient le faux raccord à 45° est conservé, avec marge supplémentaire pour les balcons.

Le panorama JPEG haute qualité existant est réutilisé **sans étirement** et reçoit une teinte légère différente selon le quartier. La couleur du ciel, le brouillard et la lumière passent progressivement d'un quartier au suivant sur les **55 derniers mètres** de la zone : pas de changement brutal au franchissement d'une limite. Les bâtiments, eux, changent par morceaux de piste pour que les deux styles puissent apparaître ensemble à la frontière. Un discret nom de quartier et une annonce d'arrivée s'affichent dans le HUD.

**Limites conscientes :** ce premier prototype ne comporte pas encore de nouveaux panoramas illustrés distincts ni de capacité Griffe ; les balconnières et corniches sont purement décoratives, donc sans collisions ni faux sentiment de parcours accessible. Les poissons ne sont pas encore un consommable : ces sujets nécessitent un équilibrage et une itération séparés.

**Tests prévus :** limites de distance 325/650/975, continuité du fondu atmosphérique, diversité et déterminisme des profils, marges de sécurité par rapport à la piste, et conservation des tests du Y, des obstacles, de la caméra et des contrôles. Vérifier visuellement le niveau de détail et les performances sur téléphone avant d'allonger les quartiers à 500–1000 m.



## 20. Refondre les maisons en véritables bâtiments modulaires — v0.18.2

**Constat visuel :** les anciennes maisons étaient des boîtes quasi identiques espacées de 36 m, avec de longues plaques inclinées au-dessus du volume principal. Leur fréquence donnait de larges zones vides et leurs toits ressemblaient à des paravents décollés. Corriger seulement les couleurs ne suffisait pas.

**Nouvelle approche géométrique :** les façades sont désormais implantées par parcelles tous les **12 mètres** (ancienne génération : 36 m), mais avec des cours vides et quelques bâtiments secondaires. Elles alternent sur les deux côtés pour éviter de former une muraille continue ; les maisons compactes partagent parfois le même bloc, avec suffisamment d'espace entre leurs emprises. La variation est déterministe à partir de la graine du run et ne dépend d'aucun frame rate.

### Kit de volumes réutilisables (faits dans le moteur)

| Module | Silhouette et utilité |
|---|---|
| **Maison à pignon** | Deux vraies surfaces inclinées rejoignent une arête de toit ; pas de barres détachées |
| **Maison à terrasse** | Toiture plate avec petit parapet réellement posé sur le périmètre |
| **Maison à étages** | Volume supérieur décalé et plus étroit, toiture secondaire et vraie terrasse |
| **Tourelle** | Masse basse et étage supérieur plus petit, couronnement pyramidal |
| **Échoppe** | Bâtiment bas avec toit plat et auvent rayé constitué d'une surface continue |

Les volumes et les proportions se combinent avec différents crépis, volets, portes, seuils, feuilles de lierre, lanternes, balcons et étals de fruits. Les matériaux réutilisent les fichiers peints existants ; les toiles d'auvent utilisent une seule petite texture Canvas 128×64 réutilisée. Pour le rendu sur mobile, les boîtes utilisent un **seul maillage partagé** plutôt qu'une géométrie distincte pour chaque accessoire. Les toitures à pignon, les feuillages simples et les toits pyramidaux ont eux aussi des géométries partagées et leurs matériaux sont recyclés. Aucune nouvelle texture lourde n'est chargée pour chaque bâtiment.

### Différenciation des quartiers

- **Vieille ville :** surtout pignons, quelques tourelles et maisons décalées, seuils en pierre et plantes discrètes.
- **Quartier du marché :** davantage d'échoppes, auvents rayés continus, étals bas et volumes plats.
- **Jardins suspendus :** maisons en terrasse, balcons appuyés sur le mur, feuillages et vignes. Décoration seulement : les rebords ne sont PAS encore grimpables.
- **Toits du crépuscule :** silhouettes de tourelles, lanternes lumineuses et façades mauves/bleutées.

### Sécurité, limites et rendu

- La piste jouable reste strictement identique. L'emprise visuelle (notamment les auvents) commence à au moins **1,05 m au-delà du bord de piste**.
- Le raccord de la route secondaire à **45°** conserve l'exclusion géométrique des maisons, élargie aux corniches et accessoires.
- La géométrie du Y et la caméra ne changent pas. Le nombre de maisons visibles augmente : la fluidité devra être contrôlée sur téléphone et, si nécessaire, le nombre de draw calls réduit avec des lots instanciés.
- Le changement de quartier reste tous les **325 mètres pendant les tests**. Une seule constante suffira pour passer à 500 ou 1 000 m.
- Les bâtiments utilisent pour cette passe de vrais volumes 2.5D et les textures existantes, **pas** de grandes illustrations générées transformées en panoramas plats. Un futur atlas de façades illustrées améliorera encore l'aspect.

### Inventaire d'assets pour une passe graphique ultérieure

| Priorité | Asset | Règle |
|---|---|---|
| 1 | Atlas partagé de portes, arches, fenêtres, volets et encadrements | 1 atlas PNG/WebP haute qualité, 4–8 variantes, transparence propre |
| 2 | Tuiles de toit méditerranéennes dessinées | Texture partageable sur les deux pans et petites tourelles, pas de barres déconnectées |
| 3 | Deux bandes d'auvents illustrés (marché) | Surfaces légères attachées au mur, UV stables, 2 palettes |
| 4 | Feuillages, pots, fleurs et lanternes | Sprites 2.5D à transparence contrôlée, affichés seulement près du joueur |
| 5 | Éléments de Griffe | Rebord, gouttière, prise et balisage distinctif, **uniquement** quand leurs collisions et commandes existeront |

**Tests ajoutés :** densité et cours ouvertes, formes variées par quartier, génération reproductible, distance entre maisons voisines sur un côté, marge devant la piste, exclusion du faux raccord et véritables surfaces inclinées partageant les maillages. Cette refonte ne modifie ni les poissons, ni le timing des obstacles mobiles, ni les commandes tactiles.


## 21. Art pass de façades peintes — v0.18.3 (prototype à évaluer)

Ce premier essai privilégie **de véritables textures raster** plutôt que le code Canvas/SVG qui dessinait auparavant les murs. Le pack de référence a été généré en cohérence avec le style chaleureux, peint à la main, des captures de concept. Quatre échantillons de crépi (crème, pêche, doré, rose) ont été extraits de cette planche et recadrés pour en faire un atlas PNG 256×256, avec **quatre cases isolées de 128×128 pixels**. L'atlas de deux toitures méditerranéennes (terre cuite et claire), au même format raster, complète le test. Ce second atlas est une texture de tuiles stylisée produite pour l'essai, et non une photographie. Il faudra juger le résultat réellement affiché sur téléphone : la qualité des échantillons source reste limitée et ils ne remplacent pas encore l'ensemble des textures de fenêtres, portes et accessoires.

**Intégration :**
- `public/assets/textures/facades_painted_v1.png` et `roofs_painted_v1.png` sont de vrais PNG, pas des SVG ni une image de fond.
- `DistrictBuildings.loadPaintedTextures()` découpe les atlas en textures GPU indépendantes **une seule fois**, avec sRGB, clamp-to-edge et mipmaps par case pour éviter les bavures aux bords.
- Les matériaux existants se mettent à jour dès que les images chargent. Si elles sont indisponibles, les anciens crépis et tuiles restent visibles. Un chargement tardif des anciennes textures ne peut pas rétablir par accident le rendu antérieur.
- Les quatre quartiers utilisent des combinaisons différentes des crépis. Leurs couleurs d'ambiance restent indépendantes. Aucune nouvelle géométrie physique ou collision n'est introduite par cet art pass.

**Mode d'évaluation rapide :** [Purrkour aperçu 100 m](https://salfab.github.io/Purrkour/?districtPreview=1). Avec le paramètre `districtPreview=1`, le quartier change tous les **100 m** au lieu de 325. Sans ce paramètre, la progression normale reste à **325 m**. Le simulateur d'obstacles, l'énergie, les scores, les récompenses et le trajet en Y sont inchangés ; seul le thème visuel se renouvelle plus vite.

**Resserrement prudent :** les façades gagnent 35 cm vers la piste, en conservant plus d'un mètre de dégagement devant les accessoires. Il n'y a pas encore de façades grimpables : Griffe nécessitera une vraie implémentation de collisions et de signalétique.

**Critère de décision sur mobile :** vérifier le caractère peint des murs, la lisibilité des fenêtres et des toits et la cohérence stylistique avec le chat. Si les panneaux texture + géométrie restent trop artificiels, passer à des **maisons illustrées en sprites 2.5D** avec seulement les hitboxes de balcons, rebords et auvents interactifs en 3D. Ne pas transformer les maisons en coûteux modèles 3D complexes.

**Tests :** validité PNG et dimensions exactes, extraction 2×2/2×1 sans chevauchement, association des palettes par quartier, activation opt-in des changements à 100 m, retrait contrôlé des façades, plus tous les tests de collision et d'embranchement.


### v0.18.4 — Complément du pack : ouvertures illustrées et transparence

Une troisième planche **`openings_painted_v1.png` (256×256 RGBA)** contient deux fenêtres illustrées et deux portes extraites du même design de référence que les crépis. La transparence est obtenue en retirant soigneusement le fond ivoire autour des dessins et en conservant la couleur originale des cadres et volets. La source et un aperçu de transparence sont disponibles dans le pack de travail. La résolution des illustrations a été réduite pour l'essai mobile ; la qualité exacte doit être jugée à l'écran.

Les fenêtres et portes utilisent désormais des plans 2.5D avec matériaux partagés : les volets dessinés remplacent les anciens blocs 3D collés de part et d'autre des fenêtres. Les balcons, auvents et autres volumes non peints restent de vrais éléments de décor en 3D. La structure des bâtiments, les collisions et les obstacles restent inchangés.

**Critère de passage à l'alternative :** après comparaison réelle à partir de captures du téléphone, si les maisons semblent toujours constituées de volumes avec des autocollants plutôt que de façades illustrées, privilégier une façade complète en sprite (une image par archétype et quartier), et conserver uniquement les surfaces nécessaires à Griffe comme éléments 3D interactifs. Il ne s'agit pas encore de construire ces sprites complets dans cette version.


### v0.18.5 — Comparaison A/B de textures peintes, sans remplacer le pack v0.18.4

Un second ensemble de **cinq textures PNG 512×512** a été ajouté dans `public/assets/architecture/` : crépis crème, pêche, ocre et rose, plus des tuiles terre cuite. Les quatre crépis dérivent d'une **illustration originale haute résolution** avec craquelures et variations peintes, recolorisée puis rendue répétable ; les tuiles sont retravaillées à partir du précédent atlas illustré.

**Pour l'essayer :** ouvrir `?facadePreview=stucco`, et éventuellement `?districtPreview=1&facadePreview=stucco` pour changer de quartier tous les 100 m. Cette variante remplace seulement les maps de crépi et de toiture : les fenêtres, portes, volumes des bâtiments, collisions, poissons et autres systèmes de gameplay ne changent pas. La version normale conserve les atlas illustrés de la **v0.18.4**, ce qui permet de comparer à partir des mêmes conditions et de revenir en arrière instantanément.

Les textures alternatives sont chargées avec `RepeatWrapping` et des mipmaps. Elles n'utilisent ni transparence détourée ni compression AVIF/WebP destructrice. Si la nouvelle version reste trop artificielle, l'alternative de façades entièrement dessinées sur sprites avec éléments interactifs 3D pourra être évaluée sur captures mobiles.
