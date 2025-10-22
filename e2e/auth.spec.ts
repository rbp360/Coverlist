import { test, expect } from '@playwright/test';

test('redirects unauthenticated to /login', async ({ page }) => {
  const res = await page.goto('/projects');
  expect(res?.ok()).toBeTruthy();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();
});
