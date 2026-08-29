# Décisions en attente — Dev 1 ↔ Dev 3 (modèle de rendement)

> Référencé par `apps/backend/src/scoring/yield-model.adapter.ts` et
> `infra/migrations/0003_seed_yield_reference_provisoire.sql`.

## D6 — Qui appelle `estimateExpectedYield()` ✅ RATIFIÉE

**Statut** : **ratifiée** (D6 — ADR-0004).
**Décision retenue** : c'est **le backend** qui appelle le modèle de rendement et transmet la fourchette `{ minM3, maxM3 }` résultante au moteur de scoring. Le moteur n'importe jamais `yield-model/`.

**Pourquoi** : préserve la pureté du moteur (INV-005, déterminisme total, aucun accès base). Le moteur reste testable sans base ni mock de référentiel. Cohérent avec ADR-0002.

**Conséquence pour Dev 3** : `packages/scoring-engine/yield-model/` n'est **pas encore livré**. En attendant, `apps/backend/src/scoring/yield-model.adapter.ts` implémente la signature proposée en lisant `yield_reference` en base, sans coder aucun coefficient en dur. Quand Dev 3 livre son module, **ce seul fichier** est remplacé par un pont vers son implémentation.

## D10 — Propriété du référentiel `yield_reference`

**Statut** : appliqué, **à confirmer**.
**Décision retenue** : **schéma = Dev 1, contenu = Dev 3.**

**État réel du contenu** : 3 substrats provisoires (`fientes_volaille`, `lisier_porcin`, `dechets_alimentaires`), tous en `reliability = 'basse'`, sourcés « PROVISOIRE — ordre de grandeur littérature ». **Aucune calibration n'a été faite.** Les 3 autres substrats cités au dictionnaire (`fumier_bovin`, `dechets_graisses_iaa`, `dechets_poisson_marche`) sont absents du référentiel.

**Angle mort connu** : le coefficient climatique `nord` est provisoire et ne repose sur aucune source ivoirienne directe.

⚠️ Ces limites doivent être dites au jury si la question est posée — BR-004 : ne jamais présenter comme acquis ce qui ne l'est pas. La mesure croisée terrain est prévue en phase de présélection (oct. 2026).

## D11 — Vérification complète de l'origine de la photo (FRB-001)

**Statut** : ouvert, **bloqué sur la chaîne d'upload**.

FRB-001 exige de refuser une photo qui ne provient pas de l'appareil intégré à l'app. Depuis une simple URL, le serveur ne peut pas le prouver. `AntiFraudService` vérifie aujourd'hui que la photo réside dans le stockage objet Sika — utile, mais **ce n'est pas une garantie anti-fraude complète**.

**À décider avec Dev 3** : jeton d'upload à usage unique délivré au moment de la capture, et/ou contrôle EXIF côté serveur. Tant que ce point est ouvert, FRB-001 n'est que partiellement couvert et doit être présenté comme tel.
