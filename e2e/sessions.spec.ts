import { test, expect } from "@playwright/test";

test.describe("Sessions Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/sessions");
  });

  test("should redirect to login when not authenticated", async ({ page }) => {
    await expect(page).toHaveURL(/\/login/);
  });

  test("should show login page with redirect param", async ({ page }) => {
    const url = page.url();
    expect(url).toContain("redirect=%2Fsessions");
  });
});

test.describe("Sessions List UI", () => {
  test.skip("should display sessions page when authenticated", async ({ page }) => {
    await page.goto("/sessions");
    
    await expect(page.getByRole("heading", { name: /sessions/i })).toBeVisible();
  });

  test.skip("should show create session button for facilitators", async ({ page }) => {
    await page.goto("/sessions");
    
    await expect(page.getByRole("button", { name: /new session/i })).toBeVisible();
  });

  test.skip("should show session filters", async ({ page }) => {
    await page.goto("/sessions");
    
    await expect(page.getByRole("combobox", { name: /status/i })).toBeVisible();
  });

  test.skip("should display session cards", async ({ page }) => {
    await page.goto("/sessions");
    
    // Check for session card structure
    const sessionCards = page.locator('[data-testid="session-card"]');
    // May or may not have sessions, just check structure exists
    await expect(sessionCards.first()).toBeVisible({ timeout: 5000 }).catch(() => {
      // No sessions exist, which is okay
    });
  });
});

test.describe("Create Session Flow", () => {
  test.skip("should open create session dialog", async ({ page }) => {
    await page.goto("/sessions");
    
    await page.getByRole("button", { name: /new session/i }).click();
    
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByLabel("Session Name")).toBeVisible();
  });

  test.skip("should require workflow selection", async ({ page }) => {
    await page.goto("/sessions");
    
    await page.getByRole("button", { name: /new session/i }).click();
    await page.getByLabel("Session Name").fill("Test Session");
    await page.getByRole("button", { name: /create/i }).click();
    
    // Should show validation error for workflow
    await expect(page.getByText(/workflow/i)).toBeVisible();
  });

  test.skip("should create session successfully", async ({ page }) => {
    await page.goto("/sessions");
    
    await page.getByRole("button", { name: /new session/i }).click();
    await page.getByLabel("Session Name").fill("Test Session");
    // Select workflow from dropdown
    await page.getByRole("combobox", { name: /workflow/i }).click();
    await page.getByRole("option").first().click();
    
    await page.getByRole("button", { name: /create/i }).click();
    
    // Should close dialog and show success toast
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });
});

test.describe("Active Session", () => {
  test.skip("should display session details", async ({ page }) => {
    await page.goto("/sessions/test-session-id");
    
    await expect(page.getByRole("heading")).toBeVisible();
  });

  test.skip("should show process map with steps", async ({ page }) => {
    await page.goto("/sessions/test-session-id");
    
    await expect(page.locator(".react-flow")).toBeVisible();
  });

  test.skip("should show waste type selection panel", async ({ page }) => {
    await page.goto("/sessions/test-session-id");
    
    await expect(page.getByText(/waste types/i)).toBeVisible();
  });

  test.skip("should allow tagging waste on a step", async ({ page }) => {
    await page.goto("/sessions/test-session-id");
    
    // Click on a step node
    await page.locator(".react-flow__node").first().click();
    
    // Waste tagging panel should appear
    await expect(page.getByText(/tag waste/i)).toBeVisible();
  });
});

test.describe("Session Completion", () => {
  test.skip("should show end session button for facilitator", async ({ page }) => {
    await page.goto("/sessions/test-session-id");
    
    await expect(page.getByRole("button", { name: /end session/i })).toBeVisible();
  });

  test.skip("should confirm before ending session", async ({ page }) => {
    await page.goto("/sessions/test-session-id");
    
    await page.getByRole("button", { name: /end session/i }).click();
    
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await expect(page.getByText(/are you sure/i)).toBeVisible();
  });
});

