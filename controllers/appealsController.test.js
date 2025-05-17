const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient, ObjectId } = require('mongodb');
const supertest = require('supertest');
const express = require('express');
const appealsController = require('./appealsController');

jest.mock('../config/db', () => {
  let db;
  return {
    collection: (name) => db.collection(name),
    setDb: (database) => { db = database; }, 
  };
});

const APPEAL_STATUSES = {
  NEW: 'new',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  CANCELED: 'canceled',
};

describe('Appeals Controller', () => {
  let mongoServer;
  let client;
  let db;
  let app;
  let request;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    client = new MongoClient(uri);
    await client.connect();
    db = client.db('test');
    require('../config/db').setDb(db); 

    app = express();
    app.use(express.json());
    app.post('/appeals', appealsController.createAppeal);
    app.get('/appeals', appealsController.getAppeals);
    app.patch('/appeals/:id/in-progress', appealsController.workOnAppeal);
    app.patch('/appeals/:id/complete', appealsController.completeAppeal);
    app.patch('/appeals/:id/cancel', appealsController.cancelAppeal);
    app.patch('/appeals/cancel-all-in-progress', appealsController.cancelAllAppealsWithInProgressStatus);

    request = supertest(app);
  });

  afterEach(async () => {
    await db.collection('appeals').deleteMany({});
  });

  afterAll(async () => {
    await client.close();
    await mongoServer.stop();
  });

  describe('POST /appeals', () => {
    it('should create a new appeal with valid data', async () => {
      const appealData = { title: 'Test Appeal', description: 'Test Description' };
      const response = await request.post('/appeals').send(appealData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'Appeal created successfully');
      expect(response.body).toHaveProperty('id');
      expect(ObjectId.isValid(response.body.id)).toBe(true);

      const appeal = await db.collection('appeals').findOne({ _id: new ObjectId(response.body.id) });
      expect(appeal).toMatchObject({
        title: appealData.title,
        description: appealData.description,
        createdAt: expect.any(Date),
      });
    });

    it('should return 400 if title or description is missing', async () => {
      const response = await request.post('/appeals').send({ title: 'Test' });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Title and description are required');
    });

    it('should handle database errors', async () => {
      jest.spyOn(db.collection('appeals'), 'insertOne').mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const response = await request.post('/appeals').send({ title: 'Test', description: 'Test' });
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('message', 'Internal server error');

      jest.spyOn(db.collection('appeals'), 'insertOne').mockRestore();
    });
  });

  describe('GET /appeals', () => {
    beforeEach(async () => {
      await db.collection('appeals').insertMany([
        {
          title: 'Appeal 1',
          description: 'Desc 1',
          status: APPEAL_STATUSES.NEW,
          createdAt: new Date('2025-05-17T12:00:00Z'),
        },
        {
          title: 'Appeal 2',
          description: 'Desc 2',
          status: APPEAL_STATUSES.IN_PROGRESS,
          createdAt: new Date('2025-05-18T12:00:00Z'),
        },
      ]);
    });

    it('should return all appeals without filters', async () => {
      const response = await request.get('/appeals');
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('title');
      expect(response.body[0]).toHaveProperty('description');
      expect(response.body[0]).toHaveProperty('status');
    });

    it('should filter appeals by specific date', async () => {
      const response = await request.get('/appeals?date=2025-05-17');
      expect(response.status).toBe(200); 
      expect(response.body).toHaveLength(1);
      expect(response.body[0].title).toBe('Appeal 1');
    });

    it('should filter appeals by date range', async () => {
      const response = await request.get('/appeals?startDate=2025-05-17&endDate=2025-05-17');
      expect(response.status).toBe(400);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].title).toBe('Appeal 1');
    });

    it('should filter appeals by status', async () => {
      const response = await request.get('/appeals?status=in-progress');
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].title).toBe('Appeal 2');
    });

    it('should return 400 for invalid date format', async () => {
      const response = await request.get('/appeals?date=invalid-date');
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid format of date');
    });
  });

  describe('PATCH /appeals/:id/in-progress', () => {
    let appealId;

    beforeEach(async () => {
      const result = await db.collection('appeals').insertOne({
        title: 'Test Appeal',
        description: 'Test Description',
        status: APPEAL_STATUSES.NEW,
        createdAt: new Date(),
      });
      appealId = result.insertedId;
    });

    it('should update appeal status to in-progress', async () => {
      const response = await request.patch(`/appeals/${appealId}/in-progress`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Appeal updated successfully');

      const appeal = await db.collection('appeals').findOne({ _id: appealId });
      expect(appeal.status).toBe(APPEAL_STATUSES.IN_PROGRESS);
      expect(appeal).toHaveProperty('updatedAt', expect.any(Date));
    });

    it('should return 404 if appeal not found', async () => {
      const response = await request.patch(`/appeals/${new ObjectId()}/in-progress`);
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Appeal not found');
    });
  });

  describe('PATCH /appeals/:id/complete', () => {
    let appealId;

    beforeEach(async () => {
      const result = await db.collection('appeals').insertOne({
        title: 'Test Appeal',
        description: 'Test Description',
        status: APPEAL_STATUSES.IN_PROGRESS,
        createdAt: new Date(),
      });
      appealId = result.insertedId;
    });

    it('should update appeal status to completed with solution', async () => {
      const response = await request.patch(`/appeals/${appealId}/complete`).send({ solution: 'Issue resolved' });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Appeal updated successfully');

      const appeal = await db.collection('appeals').findOne({ _id: appealId });
      expect(appeal.status).toBe(APPEAL_STATUSES.COMPLETED);
      expect(appeal).toHaveProperty('updatedAt', expect.any(Date));
    });

    it('should return 400 if solution is missing', async () => {
      const response = await request.patch(`/appeals/${appealId}/complete`).send({});
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Solution is required');
    });

    it('should return 404 if appeal not found', async () => {
      const response = await request.patch(`/appeals/${new ObjectId()}/complete`).send({ solution: 'Test' });
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Appeal not found');
    });
  });

  describe('PATCH /appeals/:id/cancel', () => {
    let appealId;

    beforeEach(async () => {
      const result = await db.collection('appeals').insertOne({
        title: 'Test Appeal',
        description: 'Test Description',
        status: APPEAL_STATUSES.IN_PROGRESS,
        createdAt: new Date(),
      });
      appealId = result.insertedId;
    });

    it('should update appeal status to canceled with reason', async () => {
      const response = await request.patch(`/appeals/${appealId}/cancel`).send({ reason: 'Not needed' });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Appeal updated successfully');

      const appeal = await db.collection('appeals').findOne({ _id: appealId });
      expect(appeal.status).toBe(APPEAL_STATUSES.CANCELED);
      expect(appeal).toHaveProperty('updatedAt', expect.any(Date));
    });

    it('should return 400 if reason is missing', async () => {
      const response = await request.patch(`/appeals/${appealId}/cancel`).send({});
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Reason is required');
    });

    it('should return 404 if appeal not found', async () => {
      const response = await request.patch(`/appeals/${new ObjectId()}/cancel`).send({ reason: 'Test' });
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'Appeal not found');
    });
  });

  describe('PATCH /appeals/cancel-all-in-progress', () => {
    beforeEach(async () => {
      await db.collection('appeals').insertMany([
        {
          title: 'Appeal 1',
          description: 'Desc 1',
          status: APPEAL_STATUSES.IN_PROGRESS,
          createdAt: new Date(),
        },
        {
          title: 'Appeal 2',
          description: 'Desc 2',
          status: APPEAL_STATUSES.IN_PROGRESS,
          createdAt: new Date(),
        },
        {
          title: 'Appeal 3',
          description: 'Desc 3',
          status: APPEAL_STATUSES.NEW,
          createdAt: new Date(),
        },
      ]);
    });

    it('should cancel all in-progress appeals', async () => {
      const response = await request.patch('/appeals/cancel-all-in-progress');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'All in-progress appeals updated successfully');

      const appeals = await db.collection('appeals').find({ status: APPEAL_STATUSES.IN_PROGRESS }).toArray();
      expect(appeals).toHaveLength(0);

      const canceledAppeals = await db.collection('appeals').find({ status: APPEAL_STATUSES.CANCELED }).toArray();
      expect(canceledAppeals).toHaveLength(2);
    });

    it('should return 404 if no in-progress appeals exist', async () => {
      await db.collection('appeals').deleteMany({ status: APPEAL_STATUSES.IN_PROGRESS });
      const response = await request.patch('/appeals/cancel-all-in-progress');
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message', 'No appeals found with in-progress status');
    });
  });
});