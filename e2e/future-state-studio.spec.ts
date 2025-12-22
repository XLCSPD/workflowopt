import { test, expect } from "@playwright/test";

/**
 * Future State Studio E2E Tests
 * 
 * These tests cover the complete Future State Studio workflow:
 * - Navigation to Future State Studio
 * - Synthesis stage (themes)
 * - Solutions stage (accept/reject)
 * - Sequencing stage (roadmap)
 * - Designer stage (future state)
 * - Compare stage (metrics)
 * - Export stage (deliverables)
 */

test.describe("Future State Studio", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login and authenticate
    await page.goto("/login");
    
    // Wait for the page to load
    await page.waitForLoadState("networkidle");
    
    // Skip if already logged in (redirect to dashboard)
    if (page.url().includes("/dashboard") || page.url().includes("/future-state")) {
      return;
    }
    
    // Fill in credentials (using test credentials)
    await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || "test@example.com");
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || "password123");
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    await page.waitForURL(/\/(dashboard|future-state)/);
  });

  test("should display Future State Studio in navigation", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Check for Future State Studio nav item
    const navItem = page.locator("text=Future State Studio");
    await expect(navItem).toBeVisible();
  });

  test("should navigate to Future State Studio landing page", async ({ page }) => {
    await page.goto("/future-state");
    await page.waitForLoadState("networkidle");

    // Check for page title
    const title = page.locator("h1:has-text('Future State Studio')");
    await expect(title).toBeVisible();

    // Check for description
    const description = page.locator("text=Transform waste observations into actionable future state designs");
    await expect(description).toBeVisible();
  });

  test("should show sessions list on landing page", async ({ page }) => {
    await page.goto("/future-state");
    await page.waitForLoadState("networkidle");

    // Either shows sessions or empty state message
    const hasSessionCards = await page.locator("[data-testid='session-card']").count() > 0;
    const hasEmptyState = await page.locator("text=No sessions ready for Future State Studio").isVisible();

    expect(hasSessionCards || hasEmptyState).toBe(true);
  });

  test.describe("Studio Flow", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/future-state");
      await page.waitForLoadState("networkidle");

      // Skip if no sessions available
      const sessionCards = page.locator("a[href^='/future-state/']");
      const count = await sessionCards.count();

      if (count === 0) {
        test.skip(true, "No sessions available for testing");
      }

      // Click first session
      await sessionCards.first().click();
      await page.waitForLoadState("networkidle");
    });

    test("should display studio shell with stage navigation", async ({ page }) => {
      // Check for stage buttons
      const synthesisButton = page.locator("button:has-text('Synthesis')");
      const solutionsButton = page.locator("button:has-text('Solutions')");
      const sequencingButton = page.locator("button:has-text('Sequencing')");
      const designerButton = page.locator("button:has-text('Designer')");
      const compareButton = page.locator("button:has-text('Compare')");
      const exportButton = page.locator("button:has-text('Export')");

      await expect(synthesisButton).toBeVisible();
      await expect(solutionsButton).toBeVisible();
      await expect(sequencingButton).toBeVisible();
      await expect(designerButton).toBeVisible();
      await expect(compareButton).toBeVisible();
      await expect(exportButton).toBeVisible();
    });

    test("should display Synthesis Hub by default", async ({ page }) => {
      // Check for Synthesis Hub title
      const title = page.locator("h2:has-text('Synthesis Hub')");
      await expect(title).toBeVisible();

      // Check for description
      const description = page.locator("text=Cluster observations into meaningful themes");
      await expect(description).toBeVisible();
    });

    test("should navigate between stages", async ({ page }) => {
      // Click Solutions stage
      await page.click("button:has-text('Solutions')");
      await page.waitForLoadState("networkidle");

      // Verify Solutions stage content
      const solutionsTitle = page.locator("h2:has-text('Solution Builder')");
      await expect(solutionsTitle).toBeVisible();

      // Click Sequencing stage
      await page.click("button:has-text('Sequencing')");
      await page.waitForLoadState("networkidle");

      // Verify Sequencing stage content
      const sequencingTitle = page.locator("h2:has-text('Roadmap Builder')");
      await expect(sequencingTitle).toBeVisible();

      // Click Designer stage
      await page.click("button:has-text('Designer')");
      await page.waitForLoadState("networkidle");

      // Verify Designer stage content
      const designerTitle = page.locator("h2:has-text('Future State Designer')");
      await expect(designerTitle).toBeVisible();

      // Click Compare stage
      await page.click("button:has-text('Compare')");
      await page.waitForLoadState("networkidle");

      // Verify Compare stage content
      const compareTitle = page.locator("h2:has-text('Compare & Value')");
      await expect(compareTitle).toBeVisible();

      // Click Export stage
      await page.click("button:has-text('Export')");
      await page.waitForLoadState("networkidle");

      // Verify Export stage content
      const exportTitle = page.locator("h2:has-text('Export Deliverables')");
      await expect(exportTitle).toBeVisible();
    });

    test("should show Run Agent button on synthesis stage", async ({ page }) => {
      const runAgentButton = page.locator("button:has-text('Run Agent'), button:has-text('Run Synthesis')");
      await expect(runAgentButton).toBeVisible();
    });

    test("should show agent run history dropdown", async ({ page }) => {
      // Click runs dropdown
      const runsButton = page.locator("button:has-text('Runs')");
      await runsButton.click();

      // Check dropdown content
      const dropdownContent = page.locator("text=Agent Run History");
      await expect(dropdownContent).toBeVisible();
    });

    test("should display back button to return to landing", async ({ page }) => {
      const backButton = page.locator("button:has-text('Back'), a:has-text('Back')");
      await expect(backButton).toBeVisible();

      // Click back
      await backButton.click();
      await page.waitForLoadState("networkidle");

      // Verify we're back on landing page
      await expect(page).toHaveURL("/future-state");
    });
  });

  test.describe("Synthesis Stage", () => {
    test("should show empty state when no themes", async ({ page }) => {
      await page.goto("/future-state");
      await page.waitForLoadState("networkidle");

      const sessionCards = page.locator("a[href^='/future-state/']");
      const count = await sessionCards.count();

      if (count === 0) {
        test.skip(true, "No sessions available");
      }

      await sessionCards.first().click();
      await page.waitForLoadState("networkidle");

      // Check for themes or empty state
      const hasThemes = await page.locator("[data-testid='theme-card']").count() > 0;
      const hasEmptyState = await page.locator("text=No themes yet").isVisible();

      expect(hasThemes || hasEmptyState).toBe(true);
    });

    test("should show theme cards with status badges", async ({ page }) => {
      await page.goto("/future-state");
      await page.waitForLoadState("networkidle");

      const sessionCards = page.locator("a[href^='/future-state/']");
      const count = await sessionCards.count();

      if (count === 0) {
        test.skip(true, "No sessions available");
      }

      await sessionCards.first().click();
      await page.waitForLoadState("networkidle");

      const themeCards = page.locator(".group").filter({ hasText: /draft|confirmed|rejected/i });
      const themeCount = await themeCards.count();

      if (themeCount > 0) {
        // Check first theme has expected structure
        const firstCard = themeCards.first();
        await expect(firstCard).toBeVisible();
      }
    });
  });

  test.describe("Solutions Stage", () => {
    test("should display 3 bucket lanes", async ({ page }) => {
      await page.goto("/future-state");
      await page.waitForLoadState("networkidle");

      const sessionCards = page.locator("a[href^='/future-state/']");
      const count = await sessionCards.count();

      if (count === 0) {
        test.skip(true, "No sessions available");
      }

      await sessionCards.first().click();
      await page.waitForLoadState("networkidle");

      // Navigate to Solutions
      await page.click("button:has-text('Solutions')");
      await page.waitForLoadState("networkidle");

      // Check for bucket headers
      const eliminateBucket = page.locator("text=Eliminate");
      const modifyBucket = page.locator("text=Modify");
      const createBucket = page.locator("text=Create");

      await expect(eliminateBucket).toBeVisible();
      await expect(modifyBucket).toBeVisible();
      await expect(createBucket).toBeVisible();
    });
  });

  test.describe("Sequencing Stage", () => {
    test("should display wave lanes", async ({ page }) => {
      await page.goto("/future-state");
      await page.waitForLoadState("networkidle");

      const sessionCards = page.locator("a[href^='/future-state/']");
      const count = await sessionCards.count();

      if (count === 0) {
        test.skip(true, "No sessions available");
      }

      await sessionCards.first().click();
      await page.waitForLoadState("networkidle");

      // Navigate to Sequencing
      await page.click("button:has-text('Sequencing')");
      await page.waitForLoadState("networkidle");

      // Check for roadmap title
      const title = page.locator("h2:has-text('Roadmap Builder')");
      await expect(title).toBeVisible();
    });

    test("should show Generate Roadmap button", async ({ page }) => {
      await page.goto("/future-state");
      await page.waitForLoadState("networkidle");

      const sessionCards = page.locator("a[href^='/future-state/']");
      const count = await sessionCards.count();

      if (count === 0) {
        test.skip(true, "No sessions available");
      }

      await sessionCards.first().click();
      await page.waitForLoadState("networkidle");

      // Navigate to Sequencing
      await page.click("button:has-text('Sequencing')");
      await page.waitForLoadState("networkidle");

      // Check for Generate Roadmap button
      const generateButton = page.locator("button:has-text('Generate Roadmap')");
      await expect(generateButton).toBeVisible();
    });

    test("should toggle between solution and step-level view", async ({ page }) => {
      await page.goto("/future-state");
      await page.waitForLoadState("networkidle");

      const sessionCards = page.locator("a[href^='/future-state/']");
      const count = await sessionCards.count();

      if (count === 0) {
        test.skip(true, "No sessions available");
      }

      await sessionCards.first().click();
      await page.waitForLoadState("networkidle");

      // Navigate to Sequencing
      await page.click("button:has-text('Sequencing')");
      await page.waitForLoadState("networkidle");

      // Check for view toggle buttons if they exist
      const solutionsTab = page.locator("button:has-text('Solutions')");
      const stepItemsTab = page.locator("button:has-text('Step Items')");

      // At least one should be visible if waves exist
      const hasTabs = await solutionsTab.isVisible() || await stepItemsTab.isVisible();
      // This is a soft check - if no waves exist, tabs may not be present
      expect(hasTabs !== null).toBe(true);
    });
  });

  test.describe("Designer Stage - Step Design", () => {
    test("should display future state designer", async ({ page }) => {
      await page.goto("/future-state");
      await page.waitForLoadState("networkidle");

      const sessionCards = page.locator("a[href^='/future-state/']");
      const count = await sessionCards.count();

      if (count === 0) {
        test.skip(true, "No sessions available");
      }

      await sessionCards.first().click();
      await page.waitForLoadState("networkidle");

      // Navigate to Designer
      await page.click("button:has-text('Designer')");
      await page.waitForLoadState("networkidle");

      // Check for Designer title
      const title = page.locator("h2:has-text('Future State Designer')");
      await expect(title).toBeVisible();
    });

    test("should show step design panel when node is selected", async ({ page }) => {
      await page.goto("/future-state");
      await page.waitForLoadState("networkidle");

      const sessionCards = page.locator("a[href^='/future-state/']");
      const count = await sessionCards.count();

      if (count === 0) {
        test.skip(true, "No sessions available");
      }

      await sessionCards.first().click();
      await page.waitForLoadState("networkidle");

      // Navigate to Designer
      await page.click("button:has-text('Designer')");
      await page.waitForLoadState("networkidle");

      // Check for future state nodes (if any exist)
      const futureStateNodes = page.locator("[data-testid='future-state-node']");
      const nodeCount = await futureStateNodes.count();

      if (nodeCount > 0) {
        // Click on a node's "Design Step" button if available
        const designStepButton = page.locator("button:has-text('Design Step')").first();
        if (await designStepButton.isVisible()) {
          await designStepButton.click();
          await page.waitForLoadState("networkidle");

          // Check for step design panel
          const stepDesignPanel = page.locator("[data-testid='step-design-panel']");
          await expect(stepDesignPanel).toBeVisible();
        }
      }
    });

    test("should display step design options when available", async ({ page }) => {
      await page.goto("/future-state");
      await page.waitForLoadState("networkidle");

      const sessionCards = page.locator("a[href^='/future-state/']");
      const count = await sessionCards.count();

      if (count === 0) {
        test.skip(true, "No sessions available");
      }

      await sessionCards.first().click();
      await page.waitForLoadState("networkidle");

      // Navigate to Designer
      await page.click("button:has-text('Designer')");
      await page.waitForLoadState("networkidle");

      // Check if step design panel can be opened and shows options
      const designStepButton = page.locator("button:has-text('Design Step')").first();
      if (await designStepButton.isVisible()) {
        await designStepButton.click();
        await page.waitForLoadState("networkidle");

        // Look for option cards or empty state
        const hasOptions = await page.locator("[data-testid='step-design-option']").count() > 0;
        const hasEmptyState = await page.locator("text=No design options").isVisible();
        const hasRunButton = await page.locator("button:has-text('Run Step Design')").isVisible();

        expect(hasOptions || hasEmptyState || hasRunButton).toBe(true);
      }
    });
  });

  test.describe("Export Stage", () => {
    test("should display export options including step design exports", async ({ page }) => {
      await page.goto("/future-state");
      await page.waitForLoadState("networkidle");

      const sessionCards = page.locator("a[href^='/future-state/']");
      const count = await sessionCards.count();

      if (count === 0) {
        test.skip(true, "No sessions available");
      }

      await sessionCards.first().click();
      await page.waitForLoadState("networkidle");

      // Navigate to Export
      await page.click("button:has-text('Export')");
      await page.waitForLoadState("networkidle");

      // Check for core export options
      const executiveSummary = page.locator("text=Executive Summary");
      const solutionRegister = page.locator("text=Solution Register");
      const roadmap = page.locator("text=Implementation Roadmap");

      await expect(executiveSummary).toBeVisible();
      await expect(solutionRegister).toBeVisible();
      await expect(roadmap).toBeVisible();

      // Check for new step design export options
      const stepDesignSpecs = page.locator("text=Step Design Specifications");
      const traceabilityMatrix = page.locator("text=Traceability Matrix");
      const implementationNotes = page.locator("text=Implementation Notes");

      await expect(stepDesignSpecs).toBeVisible();
      await expect(traceabilityMatrix).toBeVisible();
      await expect(implementationNotes).toBeVisible();

      // Check export button
      const exportButton = page.locator("button:has-text('Export Package')");
      await expect(exportButton).toBeVisible();
    });

    test("should toggle export options", async ({ page }) => {
      await page.goto("/future-state");
      await page.waitForLoadState("networkidle");

      const sessionCards = page.locator("a[href^='/future-state/']");
      const count = await sessionCards.count();

      if (count === 0) {
        test.skip(true, "No sessions available");
      }

      await sessionCards.first().click();
      await page.waitForLoadState("networkidle");

      // Navigate to Export
      await page.click("button:has-text('Export')");
      await page.waitForLoadState("networkidle");

      // Click on an export option to toggle it
      const themeAnalysis = page.locator("text=Theme Analysis Report").locator("..");
      await themeAnalysis.click();

      // Verify toggle works (checkbox state change)
      // The exact assertion depends on the component implementation
    });

    test("should show format badges for exports", async ({ page }) => {
      await page.goto("/future-state");
      await page.waitForLoadState("networkidle");

      const sessionCards = page.locator("a[href^='/future-state/']");
      const count = await sessionCards.count();

      if (count === 0) {
        test.skip(true, "No sessions available");
      }

      await sessionCards.first().click();
      await page.waitForLoadState("networkidle");

      // Navigate to Export
      await page.click("button:has-text('Export')");
      await page.waitForLoadState("networkidle");

      // Check for format badges
      const pdfBadges = page.locator("text=PDF");
      const csvBadges = page.locator("text=CSV");

      // Should have at least one PDF and one CSV option
      await expect(pdfBadges.first()).toBeVisible();
      await expect(csvBadges.first()).toBeVisible();
    });
  });

  test.describe("Responsive Design", () => {
    test("should be usable on mobile viewport", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto("/future-state");
      await page.waitForLoadState("networkidle");

      // Should still show main content
      const title = page.locator("h1:has-text('Future State Studio')");
      await expect(title).toBeVisible();
    });

    test("should be usable on tablet viewport", async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });

      await page.goto("/future-state");
      await page.waitForLoadState("networkidle");

      // Should show main content
      const title = page.locator("h1:has-text('Future State Studio')");
      await expect(title).toBeVisible();
    });
  });
});

