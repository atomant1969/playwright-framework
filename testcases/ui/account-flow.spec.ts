import { expect, test } from '@playwright/test';

export const runAccountFlow = () => {
  test('Account flow: example step 1', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });

  test('Account flow: example step 2', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toContainText(/./);
  });
};
