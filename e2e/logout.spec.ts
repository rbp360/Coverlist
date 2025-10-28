import { test, expect } from '@playwright/test';

test('user can sign up and then sign out', async ({ page }, testInfo) => {
  // Sign up a new user
  await page.goto('/signup');
  await expect(page.getByRole('heading', { name: 'Sign up' })).toBeVisible();
  const uniq = `${Date.now()}-${testInfo.project.name}-${testInfo.workerIndex}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const email = `user-${uniq}@test.local`;
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();

  // Lands on projects page
  // WebKit sometimes delays the window "load" event due to pending font/assets; wait for URL without requiring full load.
  await page.waitForURL('**/projects', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();

  // Sign out via API to avoid flakiness with dropdown timing across browsers
  await page.request.post('/api/auth/logout');
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();

  // Try to access a protected page -> redirected back to login
  await page.goto('/projects');
  await expect(page).toHaveURL(/\/login$/);
});
