import { test, expect } from '@playwright/test';

test('redirects unauthenticated to /login', async ({ page }) => {
  const res = await page.goto('/projects');
  // In SPA, may get 200 with login page content
  expect(res?.status()).toBe(200);
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();
});
