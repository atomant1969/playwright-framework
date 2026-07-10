import { expect, test } from '@playwright/test';
import { ENV, LOGIN_TEST_CONFIG } from './config';

export function runSetup(kind: 'ui' | 'api' | 'mixed'): void {
  test.beforeEach('Framework setup', async ({ page }) => {
    if (kind === 'api' || !ENV.LOGIN_ENABLED) return;

    const { username, password } = LOGIN_TEST_CONFIG.TEST_CREDENTIALS;
    if (!username || !password) {
      throw new Error('LOGIN_ENABLED=true requires LOGIN_USERNAME and LOGIN_PASSWORD in environment.');
    }

    await page.goto('/login');
    await page.getByLabel(/username|login|email/i).fill(username);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole('button', { name: /log in|login|sign in/i }).click();
    await expect(page).toHaveURL((url) => !url.pathname.includes('/login'));
  });
}
