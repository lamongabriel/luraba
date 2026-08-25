import request from 'supertest';
import app from '@/app';

describe('reference data routes', () => {
  it('GET /api/v1/reference-data/locations serves country flags and timezone options', async () => {
    const response = await request(app).get('/api/v1/reference-data/locations');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.countries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'US',
          emoji: '🇺🇸',
          name: 'United States',
        }),
      ]),
    );
    expect(response.body.data.timezones).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          value: 'America/Los_Angeles',
          abbreviation: expect.any(String),
          label: expect.any(String),
        }),
      ]),
    );
  });
});
