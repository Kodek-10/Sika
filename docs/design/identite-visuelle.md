# Identité visuelle

> Question à laquelle ce document répond : comment l'interface doit-elle se présenter et se comporter ?
> Statut : proposition de cadrage — à ratifier par l'équipe avant implémentation du design (voir règle de maintenance dans `../README.md`).

## 1. Direction

Le nom **Sika** ("or" en akan) ancre l'identité sur la valeur créée pour le producteur — la production devient un actif. La direction visuelle doit éviter deux pièges : (1) ressembler à une app bancaire froide et impersonnelle, (2) ressembler à un gadget agri-tech générique. L'objectif est une interface sobre, lisible dans des conditions terrain difficiles (plein soleil, connexion faible, utilisateur pressé), avec une touche chaleureuse liée au thème de l'or/la valeur.

## 2. Palette proposée

| Usage | Couleur | Justification |
|---|---|---|
| Couleur principale | Or/ambre profond | Rappel direct du nom Sika, se détache bien en plein soleil |
| Couleur secondaire | Vert terre | Ancrage agricole, associé positivement à la croissance/production |
| Fond | Blanc cassé / gris très clair | Lisibilité maximale sur écran bas de gamme en extérieur |
| Alerte maintenance | Orange | Distinct du rouge — signale "à vérifier", pas "danger" (cohérent avec BR-001 : ce n'est pas une accusation) |
| Alerte sur-déclaration | Rouge | Réservé strictement à ce cas, pour ne pas diluer le signal (FRB-005) |

## 3. Principes d'interface pour l'app terrain

- Boutons larges, un seul champ actionnable à l'écran à la fois quand possible (contexte : usage à une main, en extérieur).
- État hors-ligne toujours visible explicitement (bannière ou icône persistante) — l'utilisateur ne doit jamais se demander si sa déclaration est partie ou non (lié à FR-008).
- Aucune dépendance à la couleur seule pour distinguer les alertes (accessibilité) — toujours un texte ou une icône en plus de la couleur.

## 4. Ton et langage

- Français simple, phrases courtes, éviter le jargon technique dans l'app producteur (réserver "score de cohérence" au dashboard IMF/MMPE, préférer "confiance" ou une jauge visuelle côté producteur).
- Les messages d'alerte `maintenance` doivent être formulés de façon non punitive (ex. "Vérifiez votre installation" plutôt que "Anomalie détectée"), cohérent avec BR-001.

## 5. Statut

Aucun de ces choix n'est implémenté. Cette section sera mise à jour avec les décisions réelles (maquettes, tokens de design) au fur et à mesure — actuellement une hypothèse de cadrage, pas un design ratifié.
