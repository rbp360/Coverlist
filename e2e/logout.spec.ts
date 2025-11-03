import { test, expect } from '@playwright/test';

test('user can sign up and then sign out', async ({ page }, testInfo) => {
  const uniq = `${Date.now()}-${testInfo.project.name}-${testInfo.workerIndex}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `user-${uniq}@test.local`;
  const password = 'password123';

  // Robust signup using API to avoid flakiness with client-side flows on WebKit
  const signupRes = await page.request.post('/api/auth/signup', {
    data: { email, password },
  });
  expect(signupRes.ok()).toBeTruthy();
  // Navigate to a protected page to confirm we are authenticated
  await page.goto('/projects');
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();

  // Sign out via user menu in the header
  await page.getByRole('button', { name: /open user menu/i }).click();
  const [logoutResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().endsWith('/api/auth/logout') && res.ok()),
    page.getByRole('button', { name: /sign out/i }).click(),
  ]);
  expect(logoutResponse.ok()).toBeTruthy();
  // Wait until the app routes us to /login to ensure cookies are cleared and client state updated
  await page.waitForURL(/\/login$/, { timeout: 15000 });

  // Trigger a navigation to a protected page; middleware should redirect us to /login
  await page.goto('/projects');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();
});
