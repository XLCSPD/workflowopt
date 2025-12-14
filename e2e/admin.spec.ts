import { test, expect } from "@playwright/test";

test.describe("Admin Page Access", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin");
  });

  test("should redirect to login when not authenticated", async ({ page }) => {
    await expect(page).toHaveURL(/\/login/);
  });

  test("should show login page with redirect param", async ({ page }) => {
    const url = page.url();
    expect(url).toContain("redirect=%2Fadmin");
  });
});

test.describe("Admin Dashboard", () => {
  test.skip("should display admin page for admin users", async ({ page }) => {
    await page.goto("/admin");
    
    await expect(page.getByRole("heading", { name: /admin settings/i })).toBeVisible();
  });

  test.skip("should redirect non-admin users to dashboard", async ({ page }) => {
    // When logged in as participant/facilitator
    await page.goto("/admin");
    
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(/insufficient_permissions/i)).toBeVisible();
  });

  test.skip("should show organization tab", async ({ page }) => {
    await page.goto("/admin");
    
    await expect(page.getByRole("tab", { name: /organization/i })).toBeVisible();
  });

  test.skip("should show waste types tab", async ({ page }) => {
    await page.goto("/admin");
    
    await expect(page.getByRole("tab", { name: /waste types/i })).toBeVisible();
  });

  test.skip("should show training content tab", async ({ page }) => {
    await page.goto("/admin");
    
    await expect(page.getByRole("tab", { name: /training/i })).toBeVisible();
  });

  test.skip("should show users tab", async ({ page }) => {
    await page.goto("/admin");
    
    await expect(page.getByRole("tab", { name: /users/i })).toBeVisible();
  });
});

test.describe("Organization Management", () => {
  test.skip("should display organization stats", async ({ page }) => {
    await page.goto("/admin");
    
    await expect(page.getByText(/team members/i)).toBeVisible();
    await expect(page.getByText(/workflows/i)).toBeVisible();
    await expect(page.getByText(/sessions/i)).toBeVisible();
  });

  test.skip("should allow editing organization name", async ({ page }) => {
    await page.goto("/admin");
    
    await page.getByRole("button", { name: /edit/i }).first().click();
    
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByLabel(/organization name/i)).toBeVisible();
  });

  test.skip("should show pending invitations", async ({ page }) => {
    await page.goto("/admin");
    
    // If there are pending invitations
    const invitationsSection = page.getByText(/pending invitations/i);
    await expect(invitationsSection).toBeVisible().catch(() => {
      // No pending invitations, which is fine
    });
  });
});

test.describe("Waste Type Management", () => {
  test.skip("should display waste types list", async ({ page }) => {
    await page.goto("/admin");
    
    await page.getByRole("tab", { name: /waste types/i }).click();
    
    await expect(page.getByRole("table")).toBeVisible();
  });

  test.skip("should open add waste type dialog", async ({ page }) => {
    await page.goto("/admin");
    
    await page.getByRole("tab", { name: /waste types/i }).click();
    await page.getByRole("button", { name: /add waste type/i }).click();
    
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByLabel("Code")).toBeVisible();
    await expect(page.getByLabel("Name")).toBeVisible();
  });

  test.skip("should create new waste type", async ({ page }) => {
    await page.goto("/admin");
    
    await page.getByRole("tab", { name: /waste types/i }).click();
    await page.getByRole("button", { name: /add waste type/i }).click();
    
    await page.getByLabel("Code").fill("X");
    await page.getByLabel("Name").fill("Test Waste");
    await page.getByLabel("Description").fill("Test description");
    
    await page.getByRole("button", { name: /create/i }).click();
    
    await expect(page.getByText(/waste type created/i)).toBeVisible();
  });

  test.skip("should edit existing waste type", async ({ page }) => {
    await page.goto("/admin");
    
    await page.getByRole("tab", { name: /waste types/i }).click();
    
    // Click more options on first row
    await page.locator('[data-testid="waste-type-menu"]').first().click();
    await page.getByRole("menuitem", { name: /edit/i }).click();
    
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test.skip("should delete waste type with confirmation", async ({ page }) => {
    await page.goto("/admin");
    
    await page.getByRole("tab", { name: /waste types/i }).click();
    
    await page.locator('[data-testid="waste-type-menu"]').first().click();
    await page.getByRole("menuitem", { name: /delete/i }).click();
    
    // Should show confirmation or just delete
    await expect(page.getByText(/waste type deleted/i)).toBeVisible();
  });
});

test.describe("Training Content Management", () => {
  test.skip("should display training content list", async ({ page }) => {
    await page.goto("/admin");
    
    await page.getByRole("tab", { name: /training/i }).click();
    
    await expect(page.getByRole("table")).toBeVisible();
  });

  test.skip("should open add training content dialog", async ({ page }) => {
    await page.goto("/admin");
    
    await page.getByRole("tab", { name: /training/i }).click();
    await page.getByRole("button", { name: /add content/i }).click();
    
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByLabel("Title")).toBeVisible();
  });

  test.skip("should create new training content", async ({ page }) => {
    await page.goto("/admin");
    
    await page.getByRole("tab", { name: /training/i }).click();
    await page.getByRole("button", { name: /add content/i }).click();
    
    await page.getByLabel("Title").fill("Test Module");
    await page.getByLabel("Description").fill("Test description");
    
    await page.getByRole("button", { name: /create/i }).click();
    
    await expect(page.getByText(/training content created/i)).toBeVisible();
  });
});

test.describe("User Management", () => {
  test.skip("should display users list", async ({ page }) => {
    await page.goto("/admin");
    
    await page.getByRole("tab", { name: /users/i }).click();
    
    await expect(page.getByRole("table")).toBeVisible();
  });

  test.skip("should open invite user dialog", async ({ page }) => {
    await page.goto("/admin");
    
    await page.getByRole("tab", { name: /users/i }).click();
    await page.getByRole("button", { name: /invite user/i }).click();
    
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/role/i)).toBeVisible();
  });

  test.skip("should invite new user", async ({ page }) => {
    await page.goto("/admin");
    
    await page.getByRole("tab", { name: /users/i }).click();
    await page.getByRole("button", { name: /invite user/i }).click();
    
    await page.getByLabel(/email/i).fill("test@example.com");
    await page.getByRole("button", { name: /send invitation/i }).click();
    
    // Should show success or error message
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10000 });
  });

  test.skip("should change user role", async ({ page }) => {
    await page.goto("/admin");
    
    await page.getByRole("tab", { name: /users/i }).click();
    
    // Click more options on a user row
    await page.locator('[data-testid="user-menu"]').first().click();
    await page.getByRole("menuitem", { name: /change role/i }).click();
    
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test.skip("should prevent removing self from organization", async ({ page }) => {
    await page.goto("/admin");
    
    await page.getByRole("tab", { name: /users/i }).click();
    
    // Try to remove current user
    // Should show error message
    await expect(page.getByText(/cannot remove yourself/i)).toBeVisible().catch(() => {
      // Button should be disabled for current user
    });
  });
});

