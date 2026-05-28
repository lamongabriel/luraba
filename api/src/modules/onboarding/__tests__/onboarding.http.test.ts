import request from 'supertest';
import app from '@/app';

describe('onboarding routes', () => {
  it('GET /api/v1/onboarding/options returns the public onboarding option lists', async () => {
    const response = await request(app).get('/api/v1/onboarding/options');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.languages).toEqual(expect.arrayContaining(['en', 'pt-BR']));
    expect(response.body.data.currencies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'BRL', symbol: 'R$', precision: 2 }),
        expect.objectContaining({ code: 'USD', symbol: '$', precision: 2 }),
      ]),
    );
    expect(response.body.data.timezones).toContain('UTC');
    expect(response.body.data.preferredThemes).toEqual(expect.arrayContaining(['light', 'dark', 'system']));
    expect(response.body.data.budgetMonthStartDays).toEqual(Array.from({ length: 31 }, (_, index) => index + 1));
  });

  it('GET /api/v1/onboarding/options does not require authentication', async () => {
    const response = await request(app).get('/api/v1/onboarding/options');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
