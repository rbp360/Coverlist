import { test, expect } from '@playwright/test';

test('user can sign up and then sign out', async ({ page }, testInfo) => {
  // Sign up a new user via API to avoid any browser-specific form quirks
  const uniq = `${Date.now()}-${testInfo.project.name}-${testInfo.workerIndex}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const email = `user-${uniq}@test.local`;
  const password = 'password123';
  const signupRes = await page.request.post('/api/auth/signup', {
    data: { email, password },
  });
  expect(signupRes.ok()).toBeTruthy();

  // Lands on projects page
  // WebKit sometimes delays the window "load" event due to pending font/assets; wait for URL without requiring full load.
  await page.goto('/projects');
  await page.waitForURL('**/projects', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();

  // Sign out via API to avoid flakiness with dropdown timing across browsers
  await page.request.post('/api/auth/logout');
  // Trigger a navigation to a protected page; middleware should redirect us to /login
  await page.goto('/projects');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();

  // Try to access a protected page -> redirected back to login
  await page.goto('/projects');
  await expect(page).toHaveURL(/\/login$/);
});
