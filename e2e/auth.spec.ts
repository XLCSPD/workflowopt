import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("should show login page", async ({ page }) => {
    await page.goto("/login");
    
    await expect(page.getByRole("heading", { name: "Welcome Back" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
  });

  test("should show validation errors for empty form", async ({ page }) => {
    await page.goto("/login");
    
    await page.getByRole("button", { name: "Sign In" }).click();
    
    // Should show validation messages
    await expect(page.getByText("Please enter a valid email address")).toBeVisible();
  });

  test("should have link to register page", async ({ page }) => {
    await page.goto("/login");
    
    await expect(page.getByRole("link", { name: "Sign up" })).toBeVisible();
    await page.getByRole("link", { name: "Sign up" }).click();
    
    await expect(page).toHaveURL("/register");
  });

  test("should have link to forgot password page", async ({ page }) => {
    await page.goto("/login");
    
    await expect(page.getByRole("link", { name: "Forgot your password?" })).toBeVisible();
    await page.getByRole("link", { name: "Forgot your password?" }).click();
    
    await expect(page).toHaveURL("/forgot-password");
  });

  test("should show register page", async ({ page }) => {
    await page.goto("/register");
    
    await expect(page.getByRole("heading", { name: /create.*account/i })).toBeVisible();
  });

  test("should show forgot password page", async ({ page }) => {
    await page.goto("/forgot-password");
    
    await expect(page.getByRole("heading", { name: "Forgot Password" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Send Reset Link" })).toBeVisible();
  });

  test("should redirect to login when accessing protected route", async ({ page }) => {
    await page.goto("/dashboard");
    
    // Should redirect to login since not authenticated
    await expect(page).toHaveURL(/\/login/);
  });
});

