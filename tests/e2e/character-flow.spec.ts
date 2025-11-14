import { test, expect } from '@playwright/test'

test.describe('Character Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Create a campaign for testing
    await page.goto('/campaigns')
    await page.click('button:has-text("Create Campaign")')
    await page.fill('input[id="name"]', 'Character Test Campaign')
    await page.fill('textarea[id="description"]', 'Campaign for character testing')
    await page.click('button[type="submit"]:has-text("Create Campaign")')
    await page.click('text=Character Test Campaign')
  })

  test('should create a new character', async ({ page }) => {
    // Given I am on a campaign detail page
    await expect(page.locator('h1:has-text("Character Test Campaign")')).toBeVisible()

    // When I click the new character button
    await page.click('button:has-text("New Character")')

    // Then I should see the create character modal
    await expect(page.locator('h2:has-text("Create New Character")')).toBeVisible()

    // When I fill in the character details
    await page.fill('input[id="charName"]', 'Aragorn')
    await page.fill('input[id="race"]', 'Human')
    await page.fill('input[id="class"]', 'Ranger')
    await page.fill('input[id="level"]', '5')
    await page.fill('textarea[id="backstory"]', 'A mysterious ranger from the north')

    // And I submit the form
    await page.click('button[type="submit"]:has-text("Create Character")')

    // Then I should see the new character in the list
    await expect(page.locator('text=Aragorn')).toBeVisible()
    await expect(page.locator('text=Human Ranger Level 5')).toBeVisible()
  })

  test('should create multiple characters', async ({ page }) => {
    // Given I am on a campaign detail page
    await expect(page.locator('h1:has-text("Character Test Campaign")')).toBeVisible()

    // When I create the first character
    await page.click('button:has-text("New Character")')
    await page.fill('input[id="charName"]', 'Gandalf')
    await page.fill('input[id="race"]', 'Wizard')
    await page.fill('input[id="class"]', 'Mage')
    await page.click('button[type="submit"]:has-text("Create Character")')

    // And I create the second character
    await page.click('button:has-text("New Character")')
    await page.fill('input[id="charName"]', 'Legolas')
    await page.fill('input[id="race"]', 'Elf')
    await page.fill('input[id="class"]', 'Archer')
    await page.click('button[type="submit"]:has-text("Create Character")')

    // Then I should see both characters in the list
    await expect(page.locator('text=Gandalf')).toBeVisible()
    await expect(page.locator('text=Legolas')).toBeVisible()
  })
})

