# Suivi des partenariats — IMF / MMPE / opérateur Mobile Money

> Propriétaire : Dev 2 · Règle associée : **BR-004** (voir [`docs/architecture/contrat-systeme.md`](../../docs/architecture/contrat-systeme.md))
> Voir aussi : [`BUSINESS-MODEL.md`](./BUSINESS-MODEL.md) — les chiffres qui rendent ces conversations concrètes.

## 1. État réel au 27/08/2026

**Aucun partenariat n'est signé. Aucun interlocuteur n'est nommé.** Ce tableau
est la seule source de vérité sur ce point ; toute présentation doit s'y aligner.

| Organisation | Type | Interlocuteur | Statut | Prochaine action |
|---|---|---|---|---|
| ADVANS | IMF | — | À contacter | — |
| BAOBAB | IMF | — | À contacter | — |
| CREDIT ACCESS | IMF | — | À contacter | — |
| UNACOOPEC-CI | IMF | — | À contacter | — |
| MMPE | Bailleur / prescripteur | — | Interlocuteur du hackathon | — |
| *(opérateur Mobile Money)* | Opérateur | — | **Aucun opérateur identifié** | Identifier les opérateurs actifs sur la zone cible |

**Règle de mise à jour.** Une ligne ne change de statut que sur **preuve écrite**
(courriel, compte rendu, lettre). Un appel téléphonique encourageant n'est pas un
changement de statut : c'est un interlocuteur nommé, rien de plus.

## 2. Le trou le plus urgent : l'opérateur Mobile Money

Il ne figurait pas dans ce suivi. C'est pourtant la **seule dépendance externe
bloquante** du module : `packages/payments/` tourne aujourd'hui sur
`SimulatedMobileMoneyProvider`, et aucun argent ne circule.

Trois questions à poser **par écrit**, avant tout engagement :

1. **Qui supporte la commission — l'émetteur ou le bénéficiaire ?**
   Si c'est le bénéficiaire, le producteur reçoit moins que le montant annoncé.
   Ce n'est pas un détail comptable : c'est une **promesse rompue**, sur un
   projet dont le produit est la confiance. Le modèle économique suppose
   aujourd'hui que l'émetteur paie — hypothèse non vérifiée.
2. **Quelle est la grille tarifaire exacte, par palier ?**
   Le modèle suppose 1,5 % avec un plancher à 100 FCFA. Les grilles réelles sont
   rarement linéaires.
3. **L'API accepte-t-elle une clé d'idempotence fournie par l'appelant ?**
   Sans elle, notre filet n°1 disparaît et il ne reste que la dérivation, dont la
   limite est connue et documentée (README §4). Un doublon ici, c'est de l'argent
   versé deux fois.

Ajouter aussi : délai de règlement, plafonds par transaction et par jour,
procédure de réconciliation en cas de `pending` non résolu, conditions d'accès à
un environnement de test.

## 3. Ce qu'on demande vraiment à une IMF — et ce qu'on ne demande pas

Le calcul de [`BUSINESS-MODEL.md`](./BUSINESS-MODEL.md) §7 change l'objet de la
conversation. Une commission sur crédit **ne peut pas financer le suivi** :
même à 100 % d'éligibilité elle rapporte 9 000 FCFA par producteur et par an,
contre 27 700 de coût variable. Aller voir une IMF pour négocier un taux de
commission, c'est donc négocier la mauvaise chose.

**Ce qu'il faut obtenir, par ordre de valeur :**

| Demande | Pourquoi elle vaut plus qu'un taux de commission |
|---|---|
| Une **fourchette de crédit réelle** pour ce profil d'emprunteur | Fait tomber l'hypothèse la plus fragile du modèle (300 000 FCFA, inventée) |
| Les **critères d'octroi actuels** et le taux de refus | Dit si un score ≥ 70 déplace réellement une décision — sinon le produit n'a pas d'acheteur |
| Une **lettre d'intérêt** conditionnelle | Preuve écrite exploitable sans surpromettre (BR-004) |
| Un **pilote sur quelques dossiers** | La seule façon d'obtenir une distribution de scores réelle |

**Ce qu'on ne demande pas :** un engagement de volume, un partenariat annoncé
publiquement, ou un taux de commission — tant que les trois inconnues du §10 du
modèle ne sont pas levées.

## 4. Ce qu'on peut affirmer, et comment le dire

BR-004 se joue dans la formulation. Les deux colonnes décrivent la **même
réalité** ; seule celle de droite est défendable en cas de question.

| ❌ Ne pas dire | ✅ Dire |
|---|---|
| « Nous travaillons avec ADVANS » | « ADVANS fait partie des IMF que nous voulons approcher » |
| « Notre solution est intégrée à Mobile Money » | « L'intégration est prête côté code ; l'opérateur reste à conventionner » |
| « Notre scoring est validé » | « Nos rendements de référence sont provisoires et non calibrés » |
| « Nous versons aux producteurs » | « Le circuit de versement fonctionne de bout en bout en simulation » |
| « Le seuil d'éligibilité est de 70 » | « 70 est notre valeur de travail, non ratifiée — et c'est un paramètre économique, pas seulement technique » |

Une question de jury à laquelle on répond « c'est encore une hypothèse » coûte
beaucoup moins cher qu'une affirmation prise en défaut.

## 5. Avant chaque présentation

- [ ] Les statuts du §1 sont-ils à jour, preuve écrite à l'appui ?
- [ ] Un opérateur Mobile Money a-t-il été identifié ? Sinon le dire d'emblée.
- [ ] Les chiffres cités viennent-ils de `BUSINESS-MODEL.md` **avec leur statut** ?
- [ ] Le statut de calibration ([`packages/scoring-engine/README.md`](../scoring-engine/README.md)) est-il rappelé ?
- [ ] [`PITCH-OBJECTIONS.md`](./PITCH-OBJECTIONS.md) est-il cohérent avec ce fichier ?
