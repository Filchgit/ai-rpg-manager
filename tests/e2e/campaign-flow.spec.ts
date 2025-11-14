import { test, expect } from '@playwright/test'

test.describe('Campaign Management Flow', () => {
  test('should create a new campaign and navigate to it', async ({ page }) => {
    // Given I am on the campaigns page
    await page.goto('/campaigns')

    // When I click the create campaign button
    await page.click('button:has-text("Create Campaign")')

    // Then I should see the create campaign modal
    await expect(page.locator('h2:has-text("Create New Campaign")')).toBeVisible()

    // When I fill in the campaign details
    await page.fill('input[id="name"]', 'Test Campaign')
    await page.fill('textarea[id="description"]', 'A test campaign for E2E testing')
    await page.fill(
      'textarea[id="worldSettings"]',
      'A fantasy world with dragons and magic'
    )
    await page.fill(
      'textarea[id="aiGuidelines"]',
      'Be dramatic and engaging, focus on storytelling'
    )

    // And I submit the form
    await page.click('button:has-text("Create Campaign")')

    // Then I should see the new campaign in the list
    await expect(page.locator('text=Test Campaign')).toBeVisible()
  })

  test('should view campaign details', async ({ page }) => {
    // Given there is a campaign
    await page.goto('/campaigns')
    await page.click('button:has-text("Create Campaign")')
    await page.fill('input[id="name"]', 'View Test Campaign')
    await page.click('button[type="submit"]:has-text("Create Campaign")')

    // When I click on the campaign
    await page.click('text=View Test Campaign')

    // Then I should see the campaign details page
    await expect(page.locator('h1:has-text("View Test Campaign")')).toBeVisible()
    await expect(page.locator('text=Sessions')).toBeVisible()
    await expect(page.locator('text=Characters')).toBeVisible()
  })
})

