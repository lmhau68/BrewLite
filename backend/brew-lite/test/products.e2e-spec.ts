import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

describe('Products API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /products -> 200 và là mảng', async () => {
    const res = await request(app.getHttpServer()).get('/products').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toMatchObject({ id: expect.any(Number), name: expect.any(String), price: expect.any(Number) });
  });

  it('GET /products?category=coffee -> chỉ cà phê', async () => {
    const res = await request(app.getHttpServer()).get('/products?category=coffee').expect(200);
    expect(res.body.every((p: { category: string }) => p.category === 'coffee')).toBe(true);
  });

  it('GET /products/1 -> 200', async () => {
    const res = await request(app.getHttpServer()).get('/products/1').expect(200);
    expect(res.body.id).toBe(1);
  });

  it('GET /products/9999 -> 404', async () => {
    await request(app.getHttpServer()).get('/products/9999').expect(404);
  });

  it('GET /products/abc -> 400', async () => {
    await request(app.getHttpServer()).get('/products/abc').expect(400);
  });

  it('GET /health -> ok', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
  });
});
