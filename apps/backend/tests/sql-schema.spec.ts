import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

/**
 * Garde-fou anti-« mock menteur ».
 *
 * Le bug qui a motivé ce test : `scoring.service.ts` interrogeait
 * `meter_readings.meter_reading_m3`, colonne qui n'existe nulle part au schéma
 * (`value_m3`). Le test unitaire ne l'a pas vu parce que son mock reproduisait
 * le MÊME nom erroné — il validait le bug au lieu de le révéler.
 *
 * Un mock ne peut structurellement pas détecter ça. Ce test compare donc le SQL
 * réellement écrit dans `src/` au schéma réellement déclaré dans
 * `infra/migrations/`, sans base de données.
 *
 * Portée assumée : on vérifie l'EXISTENCE des identifiants, pas leur
 * appartenance à la bonne table. C'est suffisant pour la classe de bug visée
 * (un nom de colonne qui n'existe pas du tout) et ça ne produit pas de faux
 * positifs sur les jointures.
 */

const RACINE = join(__dirname, '..', '..', '..');
const DOSSIER_MIGRATIONS = join(RACINE, 'infra', 'migrations');
const DOSSIER_SRC = join(__dirname, '..', 'src');

/** Mots SQL et alias qui ne sont jamais des colonnes. */
const NON_COLONNES = new Set([
  'select', 'from', 'where', 'insert', 'into', 'values', 'update', 'set',
  'delete', 'join', 'inner', 'left', 'on', 'and', 'or', 'not', 'null', 'is',
  'order', 'by', 'group', 'limit', 'offset', 'as', 'desc', 'asc', 'count',
  'distinct', 'returning', 'conflict', 'do', 'nothing', 'exists', 'case',
  'when', 'then', 'else', 'end', 'true', 'false', 'boolean', 'begin', 'commit',
  'rollback', 'union', 'all', 'having', 'with',
]);

function litColonnesDuSchema(): Set<string> {
  const colonnes = new Set<string>();
  const fichiers = readdirSync(DOSSIER_MIGRATIONS).filter((f) => f.endsWith('.sql'));
  for (const fichier of fichiers) {
    const sql = readFileSync(join(DOSSIER_MIGRATIONS, fichier), 'utf8');
    for (const bloc of sql.matchAll(/CREATE TABLE[^(]*\(([\s\S]*?)\n\);/gi)) {
      for (const ligne of bloc[1].split('\n')) {
        const nette = ligne.trim();
        if (!nette || nette.startsWith('--')) continue;
        // Contraintes de table : pas de définition de colonne.
        if (/^(CONSTRAINT|PRIMARY|UNIQUE|FOREIGN|CHECK)\b/i.test(nette)) continue;
        const nom = nette.match(/^([a-z_][a-z0-9_]*)\s/i);
        if (nom) colonnes.add(nom[1].toLowerCase());
      }
    }
  }
  return colonnes;
}

function litFichiersTs(dossier: string): string[] {
  const entrees = readdirSync(dossier, { withFileTypes: true });
  return entrees.flatMap((e) => {
    const chemin = join(dossier, e.name);
    if (e.isDirectory()) return litFichiersTs(chemin);
    return e.name.endsWith('.ts') ? [chemin] : [];
  });
}

/**
 * Extrait les identifiants qualifiés (`alias.colonne`) des littéraux SQL.
 *
 * Le littéral doit COMMENCER par un verbe SQL : sans cet ancrage, un backtick
 * de commentaire JSDoc ouvrait une fausse « chaîne » couvrant du vrai code TS.
 * Les identifiants contenant une majuscule sont ignorés — le SQL du projet est
 * intégralement en snake_case minuscule, une majuscule signale du TypeScript.
 */
function identifiantsSqlUtilises(): { fichier: string; colonne: string }[] {
  const trouves: { fichier: string; colonne: string }[] = [];
  const litterauxSql = /[`'"](\s*(?:SELECT|INSERT|UPDATE|DELETE)\b[^`'"]*)[`'"]/gi;
  for (const fichier of litFichiersTs(DOSSIER_SRC)) {
    const source = readFileSync(fichier, 'utf8');
    for (const bloc of source.matchAll(litterauxSql)) {
      const sql = bloc[1];
      for (const ref of sql.matchAll(/\b([a-z_][a-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)\b/g)) {
        const brut = ref[2];
        if (brut !== brut.toLowerCase()) continue; // identifiant TypeScript
        if (NON_COLONNES.has(brut)) continue;
        trouves.push({ fichier: fichier.replace(RACINE + '/', ''), colonne: brut });
      }
    }
  }
  return trouves;
}

describe('Conformité SQL ↔ schéma (garde-fou anti-mock-menteur)', () => {
  const colonnesDuSchema = litColonnesDuSchema();

  it('le schéma est bien lu depuis les migrations', () => {
    // Sentinelles : si la lecture casse, le test doit échouer bruyamment
    // plutôt que de valider un ensemble vide.
    expect(colonnesDuSchema.size).toBeGreaterThan(20);
    expect(colonnesDuSchema).toContain('value_m3');
    expect(colonnesDuSchema).toContain('meter_serial_number');
  });

  it('toute colonne référencée dans le SQL de src/ existe au schéma', () => {
    const inconnues = identifiantsSqlUtilises().filter(
      (r) => !colonnesDuSchema.has(r.colonne),
    );
    const message = inconnues
      .map((r) => `${r.fichier} référence la colonne inexistante « ${r.colonne} »`)
      .join('\n');
    expect(message).toBe('');
  });

  it('détecte bien une colonne fantôme (test du test)', () => {
    // Le nom exact du bug historique — il ne doit plus jamais exister au schéma.
    expect(colonnesDuSchema.has('meter_reading_m3')).toBe(false);
  });
});
