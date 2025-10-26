import { test, expect } from '@playwright/test';

test('user can sign up and then sign out', async ({ page }) => {
  // Sign up a new user
  await page.goto('/signup');
  await expect(page.getByRole('heading', { name: 'Sign up' })).toBeVisible();
  const email = `user${Date.now()}@test.local`;
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password').fill('password123');
  await page.getByRole('button', { name: 'Create account' }).click();

  // Lands on projects page
  await page.waitForURL('**/projects');
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();

  // Open profile menu and sign out
  await page.getByRole('button', { name: 'Open user menu' }).click();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.waitForURL('**/login');
  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();

  // Try to access a protected page -> redirected back to login
  await page.goto('/projects');
  await expect(page).toHaveURL(/\/login$/);
});
