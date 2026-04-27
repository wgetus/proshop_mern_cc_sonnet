import { expect, test } from '@playwright/test'

test.describe('ProShop smoke flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('homepage renders seeded products', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Latest Products' })
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'E2E Camera', exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'E2E Headphones', exact: true })
    ).toBeVisible()
  })

  test('product detail opens from the homepage', async ({ page }) => {
    await page.getByRole('link', { name: 'E2E Camera', exact: true }).click()

    await expect(page.getByRole('heading', { name: 'E2E Camera' })).toBeVisible()
    await expect(
      page.getByText('Description: A camera seeded for E2E tests')
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add To Cart' })).toBeEnabled()
  })

  test('seeded user can log in', async ({ page }) => {
    await page.getByRole('link', { name: /sign in/i }).click()
    await page.getByLabel('Email Address').fill('john@example.com')
    await page.getByLabel('Password').fill('123456')
    await page.getByRole('button', { name: 'Sign In' }).click()

    await expect(page.getByText('E2E User')).toBeVisible()
  })

  test('user can add a product to cart and reach checkout login redirect', async ({
    page,
  }) => {
    await page.getByRole('link', { name: 'E2E Camera', exact: true }).click()
    await page.getByRole('button', { name: 'Add To Cart' }).click()

    await expect(page.getByRole('heading', { name: 'Shopping Cart' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'E2E Camera' })).toBeVisible()
    await expect(page.getByText('Subtotal (1) items')).toBeVisible()

    await page.getByRole('button', { name: 'Proceed To Checkout' }).click()

    await expect(page).toHaveURL(/\/login\?redirect=shipping/)
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible()
  })
})
