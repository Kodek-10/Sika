# Exigences produit

> Question à laquelle ce document répond : que construit-on, pour qui, et dans quel périmètre ?
> Chaque exigence a un identifiant `FR-xxx` stable. Ne jamais réutiliser un identifiant retiré — le marquer `[RETIRÉ]` ou `[REMPLACÉ PAR FR-xxx]`.

## 1. Utilisateurs et rôles concernés

| Rôle | Besoin principal |
|---|---|
| Producteur | Déclarer sa production, consulter son score et son historique |
| Agent terrain | Déclarer pour un producteur, gérer les producteurs de sa zone |
| IMF (institution de microfinance) | Consulter les scores des producteurs qu'elle suit, prioriser des audits |
| MMPE | Vue agrégée, priorisation d'audits, suivi du programme |

## 2. Exigences fonctionnelles

### FR-001 — Déclaration structurée
Un producteur ou un agent peut soumettre une déclaration composée de : type de substrat, quantité (kg), durée de fonctionnement du digesteur (heures).
**Pour qui** : producteur, agent. **Statut** : cible MVP.

### FR-002 — Capture de la lecture du compteur
Une déclaration est accompagnée d'une lecture du compteur à bulles, capturée via une photo prise dans l'app (jamais importée), avec horodatage et géolocalisation automatiques.
**Pour qui** : producteur, agent. **Statut** : cible MVP. **Lié à** : INV-002, FRB-001.

### FR-003 — Calcul du score de confiance
Chaque déclaration valide déclenche un recalcul du score de confiance du producteur, visible en quelques secondes.
**Pour qui** : tous rôles (lecture selon permissions). **Statut** : cible MVP. **Lié à** : BR-001, BR-002, FRB-004.

### FR-004 — Génération d'alerte
Le système génère une alerte de type `maintenance` (sous-performance) ou `sur_declaration` (au-dessus de la fourchette attendue), jamais l'inverse.
**Pour qui** : agent, IMF, MMPE. **Statut** : cible MVP. **Lié à** : BR-001, BR-002.

### FR-005 — Consultation du score et de l'historique
Un producteur consulte son propre score et son historique ; IMF/MMPE consultent les scores des producteurs dans leur périmètre.
**Pour qui** : producteur, IMF, MMPE. **Statut** : cible MVP.

### FR-006 — Gestion des rôles et permissions
Chaque action de l'API est restreinte selon le rôle de l'appelant, vérifié côté serveur.
**Pour qui** : tous rôles. **Statut** : cible MVP.

### FR-007 — Déclenchement d'un versement Mobile Money
Un producteur dont le score dépasse le seuil d'éligibilité et qui n'a pas d'alerte non résolue peut recevoir un versement d'incitation.
**Pour qui** : agent, MMPE (déclencheurs) ; producteur (bénéficiaire). **Statut** : cible MVP (version simulée acceptable pour la démo). **Lié à** : BR-003.

### FR-008 — Fonctionnement hors-ligne
L'app terrain permet de créer une déclaration sans connexion réseau ; elle est mise en file d'attente et synchronisée dès que la connexion revient.
**Pour qui** : producteur, agent. **Statut** : cible MVP, contrainte non négociable pour la cible rurale. **Lié à** : FRB-002.

### FR-009 — Référentiel de rendement versionné
Le système s'appuie sur une table de référence de rendement par substrat, chaque valeur étant sourcée et le référentiel dans son ensemble étant versionné (`v0.1` au lancement).
**Pour qui** : moteur de scoring (usage interne). **Statut** : cible MVP, précision non garantie et assumée comme telle.

### FR-010 — Priorisation d'audits
IMF et MMPE peuvent consulter la liste des alertes actives pour prioriser les vérifications terrain.
**Pour qui** : IMF, MMPE. **Statut** : cible MVP.

## 3. Hors périmètre explicite (MVP hackathon)

- Vérification carbone certifiée (Verra, Gold Standard) — nécessite une norme tierce, non couverte par ce document.
- Intégration Mobile Money en production réelle (une simulation suffit).
- Dashboard IMF complet et priorisation automatisée avancée.

## 4. Traçabilité

Le détail composant-par-composant de chaque `FR-xxx` est dans [`architecture/exigences-tracabilite.md`](../architecture/exigences-tracabilite.md). Le comportement testable associé est dans [`exigences-produit/logiciel.md`](../exigences-produit/logiciel.md).
