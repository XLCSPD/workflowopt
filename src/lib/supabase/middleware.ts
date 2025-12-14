import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type UserRole = "admin" | "facilitator" | "participant";

// Role hierarchy for permission checks
const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 3,
  facilitator: 2,
  participant: 1,
};

// Routes that require specific minimum roles
const ROLE_PROTECTED_ROUTES: Array<{
  path: string;
  minRole: UserRole;
  exact?: boolean;
}> = [
  // Admin-only routes
  { path: "/admin", minRole: "admin" },
  
  // Facilitator-only routes
  { path: "/sessions/new", minRole: "facilitator", exact: true },
];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: "",
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    }
  );

  // Refresh the session
  const { data: { user } } = await supabase.auth.getUser();

  // Protected routes
  const protectedPaths = ["/dashboard", "/training", "/workflows", "/sessions", "/analytics", "/admin"];
  const isProtectedPath = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  // Auth routes
  const authPaths = ["/login", "/register"];
  const isAuthPath = authPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  // Redirect to login if accessing protected route without auth
  if (isProtectedPath && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect to dashboard if accessing auth routes while logged in
  if (isAuthPath && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Role-based access control for authenticated users
  if (user && isProtectedPath) {
    // Get user's role from the database
    const { data: userProfile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const userRole = (userProfile?.role as UserRole) || "participant";
    const pathname = request.nextUrl.pathname;

    // Check if current route requires a specific role
    for (const route of ROLE_PROTECTED_ROUTES) {
      const matches = route.exact
        ? pathname === route.path
        : pathname.startsWith(route.path);

      if (matches) {
        const userLevel = ROLE_HIERARCHY[userRole];
        const requiredLevel = ROLE_HIERARCHY[route.minRole];

        if (userLevel < requiredLevel) {
          // User doesn't have permission - redirect to dashboard with error
          const dashboardUrl = new URL("/dashboard", request.url);
          dashboardUrl.searchParams.set("error", "insufficient_permissions");
          return NextResponse.redirect(dashboardUrl);
        }
      }
    }
  }

  return response;
}

