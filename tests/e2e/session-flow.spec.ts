import { test, expect } from '@playwright/test'

test.describe('Session Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Create a campaign for testing
    await page.goto('/campaigns')
    await page.click('button:has-text("Create Campaign")')
    await page.fill('input[id="name"]', 'Session Test Campaign')
    await page.fill('textarea[id="description"]', 'Campaign for session testing')
    await page.click('button[type="submit"]:has-text("Create Campaign")')
    await page.click('text=Session Test Campaign')
  })

  test('should create a new session', async ({ page }) => {
    // Given I am on a campaign detail page
    await expect(page.locator('h1:has-text("Session Test Campaign")')).toBeVisible()

    // When I click the new session button
    await page.click('button:has-text("New Session")')

    // Then I should see the create session modal
    await expect(page.locator('h2:has-text("Start New Session")')).toBeVisible()

    // When I fill in the session details
    await page.fill('input[id="sessionName"]', 'Epic Quest Session')
    await page.fill('textarea[id="notes"]', 'First session of the campaign')

    // And I submit the form
    await page.click('button[type="submit"]:has-text("Start Session")')

    // Then I should see the new session in the list
    await expect(page.locator('text=Epic Quest Session')).toBeVisible()
  })

  test('should navigate to session and see empty state', async ({ page }) => {
    // Given there is a session
    await page.click('button:has-text("New Session")')
    await page.fill('input[id="sessionName"]', 'Navigation Test Session')
    await page.click('button[type="submit"]:has-text("Start Session")')

    // When I click on the session
    await page.click('text=Navigation Test Session')

    // Then I should see the session page
    await expect(page.locator('h1:has-text("Navigation Test Session")')).toBeVisible()

    // And I should see the empty state message
    await expect(page.locator('text=No messages yet')).toBeVisible()
    await expect(page.locator('text=Start your adventure!')).toBeVisible()
  })
})

