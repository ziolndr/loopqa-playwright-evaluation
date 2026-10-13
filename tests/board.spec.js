import { test } from '@playwright/test';
import scenarios from '../data/scenarios.json' with { type: 'json' };
import { LoginPage } from '../pages/LoginPage.js';
import { BoardPage } from '../pages/BoardPage.js';

const credentials = {
  username: process.env.DEMO_USERNAME ?? 'admin',
  password: process.env.DEMO_PASSWORD ?? 'password123'
};

test.describe('Asana-like board acceptance criteria', () => {
  // Each JSON record becomes one independently reported Playwright test.
  // No scenario-specific branches, duplicated test bodies, or hidden assertions.
  for (const scenario of scenarios) {
    test(`${scenario.id} | ${scenario.project} | ${scenario.column} | ${scenario.task}`, async ({ page }) => {
      const login = new LoginPage(page);
      const board = new BoardPage(page);

      await test.step('Login with demo credentials', async () => {
        await login.login(credentials);
      });
      await test.step(`Open ${scenario.project}`, async () => {
        await board.openProject(scenario.project, scenario.task);
      });
      await test.step(`Assert ${scenario.task} in ${scenario.column} with ${scenario.tags.join(', ')}`, async () => {
        await board.assertTask(scenario);
      });
    });
  }
});
