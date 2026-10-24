import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        product: { findMany: vi.fn().mockResolvedValue([]) },
        topping: {
          findMany: vi.fn().mockResolvedValue([{ code: 'pearl', name: 'Trân châu đen', price: 8000 }]),
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/products (GET)', () => {
    return request(app.getHttpServer())
      .get('/products')
      .expect(200)
      .expect([]);
  });

  it('/options (GET) trả size kèm phụ thu và topping đang bán', async () => {
    const res = await request(app.getHttpServer()).get('/options').expect(200);
    expect(res.body.sizes).toEqual([
      { id: 'S', label: 'Nhỏ', extra: 0 },
      { id: 'M', label: 'Vừa', extra: 5000 },
      { id: 'L', label: 'Lớn', extra: 10000 },
    ]);
    expect(res.body.toppings).toEqual([{ id: 'pearl', name: 'Trân châu đen', price: 8000 }]);
  });

  afterEach(async () => {
    await app.close();
  });
});
