import { expect, test } from '@playwright/test';

export const runUiSmoke = () => {
  test('UI smoke: home page responds', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/.+/);
  });
};
