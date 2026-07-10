import { expect, test } from '@playwright/test';
import { ENV } from '../../config';

export const runApiSmoke = () => {
  test('API smoke: base endpoint responds', async ({ request }) => {
    const response = await request.get(ENV.API_BASE_URL);
    expect(response.status()).toBeLessThan(500);
  });
};
