import { expect, test } from '@playwright/test';

/**
 * Template: UI suite runner.
 * Copy to testcases/ui/<feature>.spec.ts and rename runFeatureUi.
 */
export const runFeatureUi = () => {
  test('FEATURE_ID - should open the feature page', async ({ page }) => {
    await page.goto('/feature-url');
    await expect(page.locator('body')).toBeVisible();
  });

  test('FEATURE_ID - should perform the main user action', async ({ page }) => {
    await page.goto('/feature-url');
    await page.getByRole('button', { name: /action/i }).click();
    await expect(page.locator('body')).toContainText(/expected result/i);
  });
};
