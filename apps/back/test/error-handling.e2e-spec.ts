import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Logger } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';

// E2E test of change 261126-1154. Names come from
// openspec/changes/261126-1154-http-error-response/specs/error-handling/spec.md.

describe('Global exception filter', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  it('Unknown route', async () => {
    const result = await request(app.getHttpServer())
      .get('/no-such-route?token=abc')
      .expect(404);

    expect(result.body).toMatchObject({
      success: false,
      data: null,
      statusCode: 404,
      message: 'Cannot GET /no-such-route',
      metadata: { errorCode: 'NOT_FOUND', path: '/no-such-route' },
    });
    expect(result.text).not.toContain('token=abc');
    expect(result.body.metadata).not.toHaveProperty('debug');
  });
});
