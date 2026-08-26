import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { COMPTES_DEMO, RUN_ID, createTestApp } from './helpers';

describe('E2E — auth & producers (matrice FRB-008 partielle)', () => {
  let app: INestApplication;

  const agent = COMPTES_DEMO.agent;
  const producteur = COMPTES_DEMO.producteur;
  const imf = COMPTES_DEMO.imf;

  // Index obligatoire : chaque appel doit avoir un compteur UNIQUE au sein du run.
  const producerPayload = (index: number) => ({
    name: `Producteur E2E ${RUN_ID}`,
    phoneNumber: `+22507${RUN_ID}${index}`,
    activityType: 'elevage_volaille',
    capacityDeclared: 500,
    zone: 'Yamoussoukro',
    climateZone: 'sud',
    meterSerialNumber: `MTR-E2E-${RUN_ID}-${index}`,
  });

  const login = (phoneNumber: string, pin: string) =>
    request(app.getHttpServer()).post('/api/auth/login').send({ phoneNumber, pin });

  async function tokenFor(compte: { phoneNumber: string; pin: string }): Promise<string> {
    const res = await login(compte.phoneNumber, compte.pin);
    expect(res.status).toBe(200);
    return res.body.accessToken as string;
  }

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/login', () => {
    it('authentifie un agent de démo → accessToken + rôle', async () => {
      const res = await login(agent.phoneNumber, agent.pin);

      expect(res.status).toBe(200);
      expect(res.body.role).toBe('agent');
      expect(typeof res.body.accessToken).toBe('string');
      expect(res.body.accessToken.split('.')).toHaveLength(3); // JWT bien formé
    });

    it('répond le même 401 générique pour PIN erroné et numéro inconnu', async () => {
      const mauvaisPin = await login(agent.phoneNumber, '9999');
      const inconnu = await login('+22507009999999', '2222');

      for (const res of [mauvaisPin, inconnu]) {
        expect(res.status).toBe(401);
        expect(res.body.error).toBe('ERR-401-UNAUTHORIZED');
        expect(res.body.message).toBe(mauvaisPin.body.message); // pas d'énumération de comptes
      }
    });

    it('rejette un payload invalide avec un 400 détaillé', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ phoneNumber: 123, extra: 'champ inconnu' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /producers', () => {
    it('crée un producteur + compte associé (201, PIN généré renvoyé une fois)', async () => {
      const token = await tokenFor(agent);
      const payload = producerPayload(1);

      const res = await request(app.getHttpServer())
        .post('/api/producers')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.producerId).toBeDefined();
      expect(res.body.meterSerialNumber).toBe(payload.meterSerialNumber);
      expect(res.body.generatedPin).toMatch(/^[0-9]{4}$/);
    });

    it('refuse un compteur déjà rattaché (INV-001)', async () => {
      const token = await tokenFor(agent);
      const payload = producerPayload(2);
      // Crée la référence…
      await request(app.getHttpServer())
        .post('/api/producers')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);
      // …puis tente de réutiliser le même compteur.
      const res = await request(app.getHttpServer())
        .post('/api/producers')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...payload, phoneNumber: `+22507${RUN_ID}02` });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('ERR-409-METER-ALREADY-ASSIGNED');
    });

    it('refuse un téléphone déjà rattaché à un compte', async () => {
      const token = await tokenFor(agent);

      const res = await request(app.getHttpServer())
        .post('/api/producers')
        .set('Authorization', `Bearer ${token}`)
        .send({ ...producerPayload(3), phoneNumber: producteur.phoneNumber });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('ERR-409-PHONE-ALREADY-REGISTERED');
    });

    it("applique la matrice des rôles : producteur/imf → 403, anonyme → 401", async () => {
      const tokenProducteur = await tokenFor(producteur);
      const tokenImf = await tokenFor(imf);
      const serveur = app.getHttpServer();

      const resProducteur = await request(serveur)
        .post('/api/producers')
        .set('Authorization', `Bearer ${tokenProducteur}`)
        .send(producerPayload(6));
      const resImf = await request(serveur)
        .post('/api/producers')
        .set('Authorization', `Bearer ${tokenImf}`)
        .send(producerPayload(7));
      const resAnonyme = await request(serveur).post('/api/producers').send(producerPayload(8));

      expect(resProducteur.status).toBe(403);
      expect(resImf.status).toBe(403);
      expect(resAnonyme.status).toBe(401);
    });
  });

  describe('GET /producers/:id', () => {
    it('renvoie la fiche du producteur créé', async () => {
      const token = await tokenFor(agent);
      const payload = { ...producerPayload(4), phoneNumber: `+22507${RUN_ID}03` };

      const cree = await request(app.getHttpServer())
        .post('/api/producers')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);
      expect(cree.status).toBe(201);

      const res = await request(app.getHttpServer())
        .get(`/api/producers/${cree.body.producerId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.name).toBe(payload.name);
      expect(res.body.climateZone).toBe('sud');
      expect(res.body.capacityDeclared).toBe(500);
    });

    it('renvoie ERR-404 sur un UUID inconnu', async () => {
      const token = await tokenFor(agent);

      const res = await request(app.getHttpServer())
        .get('/api/producers/00000000-0000-4000-8000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('ERR-404-PRODUCER-NOT-FOUND');
    });
  });

  describe('boucle complète producteur', () => {
    it('le producteur créé peut se connecter avec son PIN généré', async () => {
      const tokenAgent = await tokenFor(agent);
      const payload = { ...producerPayload(5), phoneNumber: `+22507${RUN_ID}04` };

      const cree = await request(app.getHttpServer())
        .post('/api/producers')
        .set('Authorization', `Bearer ${tokenAgent}`)
        .send(payload);
      const pinGenere = cree.body.generatedPin as string;
      expect(pinGenere).toBeDefined();

      const connexion = await login(payload.phoneNumber, pinGenere);

      expect(connexion.status).toBe(200);
      expect(connexion.body.role).toBe('producteur');
    });
  });

  describe('GET /alerts', () => {
    it("accessible à l'imf, liste éventuellement vide", async () => {
      const token = await tokenFor(imf);

      const res = await request(app.getHttpServer())
        .get('/api/alerts')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('interdit au producteur (FRB-008)', async () => {
      const token = await tokenFor(producteur);

      const res = await request(app.getHttpServer())
        .get('/api/alerts')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });
});
