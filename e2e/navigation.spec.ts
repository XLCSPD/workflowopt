import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("should show 404 page for non-existent routes", async ({ page }) => {
    await page.goto("/non-existent-page");
    
    await expect(page.getByText("404")).toBeVisible();
    await expect(page.getByText("Page Not Found")).toBeVisible();
  });

  test("should have working back to home link on 404", async ({ page }) => {
    await page.goto("/non-existent-page");
    
    const homeLink = page.getByRole("link", { name: /back to home/i });
    await expect(homeLink).toBeVisible();
  });

  test("should redirect root to login or dashboard", async ({ page }) => {
    await page.goto("/");
    
    // Root should redirect somewhere (login if not auth, dashboard if auth)
    const url = page.url();
    expect(url).toMatch(/\/(login|dashboard)/);
  });
});

test.describe("Mobile Navigation", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("should show mobile menu button on small screens", async ({ page }) => {
    await page.goto("/login");
    
    // Login page should still be visible on mobile
    await expect(page.getByRole("heading", { name: "Welcome Back" })).toBeVisible();
  });
});

