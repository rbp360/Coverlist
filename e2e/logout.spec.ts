import { test, expect } from '@playwright/test';

test('user can sign up and then sign out', async ({ page }, testInfo) => {
  const uniq = `${Date.now()}-${testInfo.project.name}-${testInfo.workerIndex}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `user-${uniq}@test.local`;
  const password = 'password123';

  // Sign up via the UI
  await page.goto('/signup');
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password').fill(password);
  await page.getByRole('button', { name: /create account/i }).click();

  // Wait for redirect to /verify-email or /projects
  await page.waitForURL(/\/verify-email$|\/projects$/);

  if (page.url().endsWith('/verify-email')) {
    // Click the 'I'm verified → continue' link to proceed
    // Use a flexible selector for the verified link
    const verifiedLink = await page.getByRole('link', { name: /verified/i });
    await verifiedLink.click();
    await page.waitForURL(/\/projects$/);
  }
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();

  // Sign out via user menu in the header
  await page.getByRole('button', { name: /open user menu/i }).click();
  await page.getByRole('button', { name: /sign out/i }).click();

  // Trigger a navigation to a protected page; middleware should redirect us to /login
  const res = await page.goto('/projects');
  expect(res?.status()).toBe(200);
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();
});
