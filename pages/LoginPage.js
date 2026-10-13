import { expect } from '@playwright/test';

/** The evaluation explicitly exercises the login UI for every scenario. */
export class LoginPage {
  constructor(page) {
    this.page = page;
  }

  async login({ username, password }) {
    await this.page.goto('/', { waitUntil: 'domcontentloaded' });

    // Both name="email" and a plain text username field are supported.
    // The actual demo uses the supplied username "admin" rather than an email address.
    const usernameInput = this.page.locator(
      'input[name="email"], input[name="username"], input[type="email"], input[type="text"]'
    ).first();
    const passwordInput = this.page.locator('input[type="password"]').first();

    await expect(usernameInput, 'Username input is visible').toBeVisible();
    await expect(passwordInput, 'Password input is visible').toBeVisible();
    await usernameInput.fill(username);
    await passwordInput.fill(password);

    const submit = this.page.getByRole('button', {
      name: /^(log\s*in|sign\s*in)$/i
    }).or(this.page.locator('button[type="submit"]')).first();
    await expect(submit, 'Login button is visible').toBeVisible();
    await submit.click();

    // Assert an authenticated UI state, not merely a click or elapsed delay.
    await expect(passwordInput, 'Login form should be hidden after authentication')
      .toBeHidden();
    await expect(this.page.getByText('Web Application', { exact: true }).first())
      .toBeVisible();
  }
}
