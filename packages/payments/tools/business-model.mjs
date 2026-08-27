#!/usr/bin/env node
/**
 * Modèle économique Sika — générateur de BUSINESS-MODEL.md
 *
 * Propriétaire : Dev 2.
 *
 * POURQUOI UN SCRIPT PLUTÔT QU'UN TABLEAU ÉCRIT À LA MAIN
 * ------------------------------------------------------
 * BR-004 interdit de présenter comme acquis ce qui ne l'est pas. Un tableau
 * de chiffres tapé à la main ne dit pas d'où viennent ses nombres, et personne
 * ne peut le recalculer quand une hypothèse change. Ici :
 *   - chaque entrée porte son statut (ancré / hypothèse) et sa source ;
 *   - toute l'arithmétique est dérivée, jamais saisie ;
 *   - `npm run business-model` régénère le document.
 *
 * Changer une hypothèse = changer une ligne de HYPOTHESES, relancer, committer.
 *
 * ⚠️ Aucun chiffre de coût ou de marché n'existe dans le dépôt à ce jour.
 *    Les valeurs ci-dessous marquées `hypothese` sont des ordres de grandeur
 *    à valider sur le terrain. Elles ne doivent pas être citées en présentation
 *    sans leur statut.
 */

import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'BUSINESS-MODEL.md');

// ---------------------------------------------------------------------------
// 1. Hypothèses — la seule zone à éditer
// ---------------------------------------------------------------------------

const ANCRE = 'ancré';
const HYPO = 'hypothèse';

const HYPOTHESES = {
  coutCompteurFcfa: {
    valeur: 15_000,
    unite: 'FCFA',
    statut: HYPO,
    libelle: 'Coût d’un compteur mécanique à bulles, posé',
    source:
      'ADR-0001 qualifie le compteur de « coût très faible » sans le chiffrer. À remplacer par un devis fournisseur.',
  },
  dureeVieCompteurAns: {
    valeur: 3,
    unite: 'ans',
    statut: HYPO,
    libelle: 'Durée de vie d’un compteur en usage terrain',
    source: 'Aucune donnée d’usure. À confirmer après une saison complète.',
  },
  visitesParProducteurAn: {
    valeur: 4,
    unite: 'visites/an',
    statut: HYPO,
    libelle: 'Visites de contrôle par producteur et par an',
    source: 'Une visite par trimestre. Le rythme réel dépendra du taux d’alerte observé (BR-002).',
  },
  coutVisiteFcfa: {
    valeur: 5_000,
    unite: 'FCFA',
    statut: HYPO,
    libelle: 'Coût complet d’une visite (transport + temps agent)',
    source: 'À caler sur la zone de déploiement réelle : la dispersion des sites domine ce coût.',
  },
  versementsParProducteurAn: {
    valeur: 12,
    unite: 'versements/an',
    statut: HYPO,
    libelle: 'Versements Mobile Money par producteur et par an',
    source: 'Hypothèse d’un versement mensuel. La périodicité n’est pas arbitrée.',
  },
  versementMoyenFcfa: {
    valeur: 15_000,
    unite: 'FCFA',
    statut: HYPO,
    libelle: 'Montant moyen d’un versement',
    source:
      'docs/api/specification.md utilise 15 000 comme EXEMPLE de payload, pas comme politique de versement. Borne technique ancrée : 500 – 500 000.',
  },
  tauxCommissionMobileMoney: {
    valeur: 0.015,
    unite: 'part du montant',
    statut: HYPO,
    libelle: 'Commission opérateur Mobile Money',
    source:
      'Varie fortement par opérateur et par palier. À obtenir PAR ÉCRIT avant tout engagement — voir PARTNERSHIPS.md.',
  },
  planchercommissionFcfa: {
    valeur: 100,
    unite: 'FCFA',
    statut: HYPO,
    libelle: 'Commission minimale par transaction',
    source: 'Les grilles Mobile Money sont souvent par paliers, pas linéaires. À confirmer.',
  },
  creditFacilitreParProducteurFcfa: {
    valeur: 300_000,
    unite: 'FCFA',
    statut: HYPO,
    libelle: 'Crédit moyen débloqué pour un producteur éligible',
    source: 'Ordre de grandeur d’un micro-crédit équipement. Aucune IMF n’a confirmé de fourchette.',
  },
  tauxCommissionCredit: {
    valeur: 0.03,
    unite: 'part du crédit',
    statut: HYPO,
    libelle: 'Commission Sika sur un crédit facilité',
    source: 'Aucune négociation engagée. Ce taux est une cible, pas un accord.',
  },
};

/** Bornes techniques réellement ancrées dans le code et la spec. */
const ANCRAGES = [
  {
    fait: 'Versement borné à 500 – 500 000 FCFA, entier',
    statut: ANCRE,
    source: 'docs/api/specification.md + contrainte base',
  },
  {
    fait: 'Rendements de référence : 0,030 – 0,150 m³/kg selon substrat',
    statut: ANCRE,
    source: 'infra/migrations/0003 — ⚠️ valeurs elles-mêmes PROVISOIRES (D10, Dev 3)',
  },
  {
    fait: 'Précision du compteur mécanique : ±15–20 %',
    statut: ANCRE,
    source: 'ADR-0001',
  },
  {
    fait: 'Seuil d’éligibilité BR-003 : score ≥ 70 sur 100',
    statut: 'non ratifié',
    source: 'D1 — docs/decisions/DECISIONS-DEV2.md, appliqué par défaut',
  },
];

/** Enveloppes de charges fixes annuelles — scénarios, pas prévisions. */
const SCENARIOS_FIXES = [
  { nom: 'Pilote bénévole', montant: 1_500_000, detail: 'hébergement + frais, équipe non rémunérée' },
  { nom: 'Pilote encadré', montant: 12_000_000, detail: '1 coordinateur terrain + hébergement' },
  { nom: 'Déploiement', montant: 36_000_000, detail: '3 ETP + hébergement + support' },
];

const PALIERS_PRODUCTEURS = [50, 200, 500, 1_000, 2_000];

// ---------------------------------------------------------------------------
// 2. Modèle — arithmétique dérivée
// ---------------------------------------------------------------------------

const v = (k) => HYPOTHESES[k].valeur;

/**
 * Coût variable annuel d'un producteur suivi.
 *
 * Le VERSEMENT lui-même n'est pas un coût Sika : en phase 1 Sika décaisse une
 * incitation financée par le bailleur. Seule la COMMISSION opérateur est à
 * notre charge — et encore, sous réserve que l'opérateur la facture à
 * l'émetteur (question ouverte, cf. PARTNERSHIPS.md).
 */
function coutVariableParProducteur() {
  const amortissementCompteur = v('coutCompteurFcfa') / v('dureeVieCompteurAns');
  const visites = v('visitesParProducteurAn') * v('coutVisiteFcfa');
  const commissionUnitaire = Math.max(
    v('versementMoyenFcfa') * v('tauxCommissionMobileMoney'),
    v('planchercommissionFcfa'),
  );
  const fraisMobileMoney = v('versementsParProducteurAn') * commissionUnitaire;

  return {
    amortissementCompteur,
    visites,
    fraisMobileMoney,
    commissionUnitaire,
    total: amortissementCompteur + visites + fraisMobileMoney,
  };
}

/** Recette annuelle par producteur nécessaire pour couvrir tous les coûts. */
function recetteNecessaireParProducteur(nbProducteurs, chargesFixes) {
  return coutVariableParProducteur().total + chargesFixes / nbProducteurs;
}

/**
 * Nombre de producteurs au point mort, pour une recette annuelle donnée.
 * Retourne null si la recette ne couvre même pas le coût variable : dans ce
 * cas aucun volume ne rend le modèle viable — chaque producteur ajouté creuse.
 */
function pointMort(recetteParProducteur, chargesFixes) {
  const marge = recetteParProducteur - coutVariableParProducteur().total;
  if (marge <= 0) return null;
  return Math.ceil(chargesFixes / marge);
}

/** Recette de commission sur crédit, pour une part éligible donnée. */
function recetteCommissionParProducteur(partEligible) {
  return partEligible * v('creditFacilitreParProducteurFcfa') * v('tauxCommissionCredit');
}

/**
 * Inversion : ce qu'il faudrait pour que la commission couvre le seul coût
 * variable (plancher absolu — les charges fixes ne sont même pas comptées).
 * Répond à « à quelles conditions cette voie tient-elle debout ? ».
 */
function conditionsViabiliteCommission(partEligible) {
  const cible = coutVariableParProducteur().total;
  return {
    tauxRequis: cible / (partEligible * v('creditFacilitreParProducteurFcfa')),
    creditRequis: cible / (partEligible * v('tauxCommissionCredit')),
  };
}

// ---------------------------------------------------------------------------
// 3. Rendu
// ---------------------------------------------------------------------------

function fmt(n, decimales = 0) {
  if (n === null || !Number.isFinite(n)) return '—';
  const s = Math.abs(n).toFixed(decimales);
  const [entier, dec] = s.split('.');
  const groupe = entier.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const signe = n < 0 ? '-' : '';
  return dec ? `${signe}${groupe},${dec}` : `${signe}${groupe}`;
}

const pct = (x) => `${fmt(x * 100, 1)} %`;

function tableauHypotheses() {
  const lignes = Object.values(HYPOTHESES).map((h) => {
    const valeur =
      h.unite === 'part du montant' || h.unite === 'part du crédit'
        ? pct(h.valeur)
        : `${fmt(h.valeur)} ${h.unite}`;
    return `| ${h.libelle} | ${valeur} | \`${h.statut}\` | ${h.source} |`;
  });
  return ['| Paramètre | Valeur | Statut | Pourquoi cette valeur / comment la valider |', '|---|---|---|---|', ...lignes].join('\n');
}

function tableauAncrages() {
  const lignes = ANCRAGES.map((a) => `| ${a.fait} | \`${a.statut}\` | ${a.source} |`);
  return ['| Fait | Statut | Source |', '|---|---|---|', ...lignes].join('\n');
}

function tableauCoutVariable() {
  const c = coutVariableParProducteur();
  return [
    '| Poste | FCFA / producteur / an | Détail du calcul |',
    '|---|---:|---|',
    `| Amortissement du compteur | ${fmt(c.amortissementCompteur)} | ${fmt(v('coutCompteurFcfa'))} ÷ ${v('dureeVieCompteurAns')} ans |`,
    `| Visites de contrôle | ${fmt(c.visites)} | ${v('visitesParProducteurAn')} × ${fmt(v('coutVisiteFcfa'))} |`,
    `| Commissions Mobile Money | ${fmt(c.fraisMobileMoney)} | ${v('versementsParProducteurAn')} × ${fmt(c.commissionUnitaire)} |`,
    `| **Total variable** | **${fmt(c.total)}** | |`,
  ].join('\n');
}

function tableauRecetteNecessaire() {
  const entete = ['| Charges fixes annuelles | ' + PALIERS_PRODUCTEURS.map((n) => `${fmt(n)} prod.`).join(' | ') + ' |'];
  const sep = ['|---|' + PALIERS_PRODUCTEURS.map(() => '---:').join('|') + '|'];
  const lignes = SCENARIOS_FIXES.map((s) => {
    const cells = PALIERS_PRODUCTEURS.map((n) => fmt(recetteNecessaireParProducteur(n, s.montant)));
    return `| **${s.nom}** — ${fmt(s.montant)} | ${cells.join(' | ')} |`;
  });
  return [...entete, ...sep, ...lignes].join('\n');
}

function tableauCommission() {
  const parts = [0.2, 0.4, 0.6, 0.8];
  const lignes = parts.map((p) => {
    const recette = recetteCommissionParProducteur(p);
    const cells = SCENARIOS_FIXES.map((s) => {
      const n = pointMort(recette, s.montant);
      return n === null ? 'jamais' : fmt(n);
    });
    return `| ${pct(p)} | ${fmt(recette)} | ${cells.join(' | ')} |`;
  });
  return [
    '| Part de producteurs éligibles | Recette / producteur / an | ' +
      SCENARIOS_FIXES.map((s) => `Point mort — ${s.nom}`).join(' | ') +
      ' |',
    '|---|---:|' + SCENARIOS_FIXES.map(() => '---:').join('|') + '|',
    ...lignes,
  ].join('\n');
}

/** Sensibilité : quelle hypothèse déplace le plus le coût variable ? */
function tableauConditionsCommission() {
  const parts = [0.2, 0.4, 0.6, 0.8];
  const lignes = parts.map((p) => {
    const { tauxRequis, creditRequis } = conditionsViabiliteCommission(p);
    return `| ${pct(p)} | ${pct(tauxRequis)} | ${fmt(creditRequis)} |`;
  });
  return [
    `| Part éligible | Taux de commission requis (à crédit de ${fmt(v('creditFacilitreParProducteurFcfa'))}) | Crédit moyen requis (à taux de ${pct(v('tauxCommissionCredit'))}) |`,
    '|---|---:|---:|',
    ...lignes,
  ].join('\n');
}

function tableauSensibilite() {
  const base = coutVariableParProducteur().total;
  const cles = [
    'coutCompteurFcfa',
    'dureeVieCompteurAns',
    'visitesParProducteurAn',
    'coutVisiteFcfa',
    'versementsParProducteurAn',
    'tauxCommissionMobileMoney',
  ];

  const resultats = cles.map((cle) => {
    const initial = HYPOTHESES[cle].valeur;
    HYPOTHESES[cle].valeur = initial * 1.3;
    const haut = coutVariableParProducteur().total;
    HYPOTHESES[cle].valeur = initial * 0.7;
    const bas = coutVariableParProducteur().total;
    HYPOTHESES[cle].valeur = initial;
    return { cle, libelle: HYPOTHESES[cle].libelle, amplitude: Math.abs(haut - bas), haut, bas };
  });

  resultats.sort((a, b) => b.amplitude - a.amplitude);

  const lignes = resultats.map(
    (r) =>
      `| ${r.libelle} | ${fmt(r.bas)} | ${fmt(r.haut)} | **${fmt(r.amplitude)}** | ${pct(r.amplitude / base)} |`,
  );
  return [
    '| Hypothèse variée de ±30 % | Coût à −30 % | Coût à +30 % | Amplitude | En part du coût de base |',
    '|---|---:|---:|---:|---:|',
    ...lignes,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// 4. Document
// ---------------------------------------------------------------------------

const c = coutVariableParProducteur();
/**
 * Hypothèse(s) dominante(s). Plusieurs paramètres peuvent être à égalité —
 * typiquement « nombre de visites » et « coût par visite », symétriques dans un
 * produit. Ne nommer que l'un des deux ferait croire à tort que l'autre compte
 * moins : on les restitue ensemble.
 */
const sensibiliteTop = (() => {
  const base = coutVariableParProducteur().total;
  const cles = ['coutCompteurFcfa', 'dureeVieCompteurAns', 'visitesParProducteurAn', 'coutVisiteFcfa', 'versementsParProducteurAn', 'tauxCommissionMobileMoney'];
  const mesures = cles.map((cle) => {
    const initial = HYPOTHESES[cle].valeur;
    HYPOTHESES[cle].valeur = initial * 1.3;
    const haut = coutVariableParProducteur().total;
    HYPOTHESES[cle].valeur = initial * 0.7;
    const bas = coutVariableParProducteur().total;
    HYPOTHESES[cle].valeur = initial;
    return { libelle: HYPOTHESES[cle].libelle, amplitude: Math.abs(haut - bas) };
  });

  const max = Math.max(...mesures.map((m) => m.amplitude));
  const exAequo = mesures.filter((m) => Math.abs(m.amplitude - max) < 1);
  return {
    libelles: exAequo.map((m) => m.libelle),
    amplitude: max,
    part: max / base,
    egalite: exAequo.length > 1,
  };
})();

const doc = `# Modèle économique — Sika

> ⚠️ **Document généré.** Ne pas éditer à la main : modifier \`tools/business-model.mjs\` puis lancer \`npm run business-model\`.
> Propriétaire : Dev 2 · Règle associée : **BR-004** — ne jamais présenter comme acquis ce qui ne l'est pas.

## 0. À lire avant de citer un seul chiffre

Le dépôt ne contient, à ce jour, **aucune donnée de coût ni de marché**. Tous les
montants de ce document sont **dérivés d'hypothèses déclarées**, pas mesurés.

Ce document n'est donc pas une prévision. C'est **un modèle de raisonnement** :
il rend explicite ce qu'il faudrait vérifier pour que le projet tienne, et il
recalcule tout dès qu'une hypothèse change.

En présentation, la formulation correcte est : « à telle hypothèse, le coût est
de tant » — jamais « le coût est de tant ».

## 1. Ce qui est réellement ancré

${tableauAncrages()}

## 2. Hypothèses du modèle

Chacune est à valider. La colonne de droite dit **comment**.

${tableauHypotheses()}

## 3. Ce que le modèle ne compte pas comme un coût

**Le versement lui-même n'est pas une charge Sika.** En phase 1, Sika décaisse
une incitation financée par un bailleur : l'argent transite, il ne sort pas de
nos fonds propres. Seule la **commission de l'opérateur** est à notre charge.

Cette dernière affirmation repose sur une hypothèse non vérifiée : *que
l'opérateur facture l'émetteur et non le bénéficiaire*. Si c'est l'inverse, le
producteur reçoit moins que le montant annoncé — ce qui est un **problème de
confiance**, pas seulement de comptabilité. C'est la première question à poser
à tout opérateur Mobile Money (voir \`PARTNERSHIPS.md\`).

## 4. Coût variable d'un producteur suivi

${tableauCoutVariable()}

## 5. Recette annuelle nécessaire par producteur

Combien chaque producteur doit rapporter par an pour couvrir coût variable **et**
charges fixes. Les enveloppes de charges fixes sont des **scénarios déclarés**,
pas des budgets validés.

${SCENARIOS_FIXES.map((s) => `- **${s.nom}** — ${fmt(s.montant)} FCFA/an : ${s.detail}`).join('\n')}

${tableauRecetteNecessaire()}

**Lecture.** La décroissance est brutale au début puis s'aplatit : au-delà de
quelques centaines de producteurs, la recette nécessaire tend vers le coût
variable (${fmt(c.total)} FCFA). Ce plancher ne descend pas avec le volume —
**seul un coût variable plus bas le fait descendre.** C'est là que se joue la
viabilité, pas dans la croissance du nombre de producteurs.

## 6. Voie 1 — Subvention / contrat pilote MMPE

C'est la voie prioritaire (README §6). Le modèle l'exprime comme une **demande
chiffrable** plutôt que comme un espoir :

> Pour suivre **N** producteurs sous l'enveloppe **E**, Sika a besoin de
> **recette_nécessaire(N, E)** FCFA par producteur et par an.

Le tableau §5 est donc directement l'argumentaire de financement : il dit ce
qu'on demande, pour combien de producteurs, et de quoi c'est fait.

## 7. Voie 2 — Commission sur crédit facilité (IMF)

Recette = part éligible × crédit moyen × taux de commission.

La **part éligible** est l'inconnue majeure : elle dépend de la distribution
réelle des scores, qu'aucune donnée ne permet aujourd'hui d'estimer. Elle dépend
aussi directement du **seuil D1 (score ≥ 70)**, qui n'est pas ratifié.

${tableauCommission()}

**Le lien à ne pas manquer.** Monter le seuil D1 réduit la part éligible, donc la
recette, mais réduit aussi le risque de défaut — donc la valeur perçue par l'IMF.
Le seuil n'est pas qu'un réglage technique : **c'est un paramètre économique.**
Il ne devrait pas être arbitré par Dev 1 seul.

*« jamais »* signifie que la recette ne couvre pas le coût variable
(${fmt(c.total)} FCFA) : aucun volume ne rend ce scénario viable — chaque
producteur ajouté aggrave la perte.

### Le résultat qu'il faut assumer

Sous les hypothèses déclarées, **cette voie ne finance jamais le suivi à elle
seule** : même à 100 % d'éligibilité, elle rapporte
${fmt(recetteCommissionParProducteur(1))} FCFA par producteur, contre
${fmt(c.total)} FCFA de coût variable. Ce n'est pas un problème d'échelle : le
volume n'y change rien.

Voici ce qu'il faudrait pour qu'elle tienne debout — en ne couvrant *que* le
coût variable, charges fixes exclues :

${tableauConditionsCommission()}

**Lecture.** Les taux requis sont hors de tout usage de marché. La colonne de
droite est la lecture utile : cette voie ne devient cohérente que sur des
crédits **d'un tout autre ordre de grandeur** que l'hypothèse retenue —
c'est-à-dire un équipement lourd, pas un micro-crédit.

**Conséquence pour le pitch.** Présenter la commission IMF comme une source de
revenu autonome ne résiste pas au calcul. Sa vraie valeur est ailleurs : elle
**complète** la subvention et surtout elle **prouve l'utilité du score** à un
tiers payeur. C'est un argument de traction, pas une ligne de recette. Le
README §6 doit être lu dans ce sens.

## 8. Voie 3 — Vérification carbone

**Non activée, et volontairement absente des chiffres.** Les standards carbone
exigent une vérification physique tierce que Sika ne remplace pas (cf.
\`PITCH-OBJECTIONS.md\`). L'inscrire dans un plan de recettes serait exactement
ce que BR-004 interdit.

## 9. Sensibilité — où porter l'effort

Chaque hypothèse varie de ±30 %, les autres restant fixes.

${tableauSensibilite()}

**Conclusion.** ${
  sensibiliteTop.egalite
    ? `Deux hypothèses sont à égalité en tête — ${sensibiliteTop.libelles
        .map((l) => `**${l.toLowerCase()}**`)
        .join(' et ')} — ce qui est attendu : elles se multiplient l'une l'autre. Il faut donc lire non pas « un paramètre » mais **un poste** : le coût des visites terrain`
    : `Le poste le plus déterminant est **${sensibiliteTop.libelles[0]}**`
}, à lui seul ${fmt(sensibiliteTop.amplitude)} FCFA d'amplitude, soit
${pct(sensibiliteTop.part)} du coût de base.

C'est la première hypothèse à faire tomber par une mesure réelle, avant toute
autre discussion budgétaire. Concrètement : **une tournée terrain chronométrée
sur une dizaine de sites réels** vaut plus que n'importe quel raffinement de ce
modèle. Tout le reste — compteur, commissions — pèse trois à sept fois moins.

## 10. Les trois inconnues qui portent tout le modèle

1. **Le coût réel d'une visite terrain.** Il dépend de la dispersion des sites,
   qu'aucun déploiement n'a encore mesurée.
2. **La part de producteurs franchissant le seuil D1.** Inconnue tant qu'il
   n'existe pas de déclarations réelles en volume.
3. **Qui paie la commission Mobile Money.** Question fermée, à poser par écrit
   à l'opérateur — elle change à la fois le coût et la promesse faite au producteur.

Tant que ces trois-là ne sont pas répondues, ce document sert à **cadrer la
discussion**, pas à la conclure.
`;

/**
 * Garde-fou anti-dérive.
 *
 * PITCH-OBJECTIONS.md et PARTNERSHIPS.md citent des montants en dur, parce
 * qu'un argumentaire ne se lit pas sous forme de tableau généré. Le risque est
 * qu'une hypothèse change ici et que ces deux documents continuent d'annoncer
 * l'ancien chiffre en présentation — exactement le genre d'écart que BR-004
 * cherche à éviter.
 *
 * On ne réécrit pas ces fichiers automatiquement : leur rédaction est un travail
 * éditorial. On signale, et le rédacteur tranche.
 */
function verifierCoherenceDocs() {
  const aVerifier = [
    { fichier: 'PITCH-OBJECTIONS.md', valeurs: [fmt(c.total), fmt(recetteCommissionParProducteur(1))] },
    { fichier: 'PARTNERSHIPS.md', valeurs: [fmt(c.total), fmt(recetteCommissionParProducteur(1))] },
  ];

  const ecarts = [];
  for (const { fichier, valeurs } of aVerifier) {
    const chemin = join(dirname(fileURLToPath(import.meta.url)), '..', fichier);
    let contenu;
    try {
      contenu = readFileSync(chemin, 'utf8');
    } catch {
      continue; // fichier absent : rien à vérifier
    }
    for (const valeur of valeurs) {
      if (!contenu.includes(valeur)) ecarts.push(`${fichier} ne mentionne plus « ${valeur} »`);
    }
  }

  if (ecarts.length > 0) {
    console.warn('\n⚠️  Chiffres possiblement périmés dans les documents rédigés :');
    for (const e of ecarts) console.warn(`     - ${e}`);
    console.warn('     Relire ces passages avant toute présentation (BR-004).\n');
  }
  return ecarts.length;
}

writeFileSync(OUT, doc, 'utf8');
console.log(`BUSINESS-MODEL.md régénéré (${doc.split('\n').length} lignes)`);
console.log(`  coût variable / producteur / an : ${fmt(c.total)} FCFA`);
verifierCoherenceDocs();
console.log(`  poste le plus sensible          : ${sensibiliteTop.libelles.join(' + ')}`);
