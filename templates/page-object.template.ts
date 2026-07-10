import { expect, Locator, Page } from '@playwright/test';

/**
 * Template: page object.
 * Copy to pages/<FeaturePage>.ts if the project uses page objects.
 */
export class FeaturePage {
  readonly page: Page;
  readonly primaryActionButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.primaryActionButton = page.getByRole('button', { name: /action/i });
  }

  async open(): Promise<void> {
    await this.page.goto('/feature-url');
    await expect(this.page.locator('body')).toBeVisible();
  }

  async performPrimaryAction(): Promise<void> {
    await this.primaryActionButton.click();
  }
}
