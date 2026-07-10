import { expect, test } from '@playwright/test';
import { ENV } from '../config';

/**
 * Template: API suite runner.
 * Copy to testcases/api/<feature>.spec.ts and rename runFeatureApi.
 */
export const runFeatureApi = () => {
  test('FEATURE_API_ID - should return a successful response', async ({ request }) => {
    const response = await request.get(`${ENV.API_BASE_URL}/replace-with-endpoint`);
    expect(response.ok()).toBeTruthy();
  });
};
