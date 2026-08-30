import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabasePublicConfig } from "@/lib/supabase/config";

function copyResponseCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
  return target;
}

export async function middleware(request: NextRequest) {
  const { url, anonKey, isConfigured } = getSupabasePublicConfig();
  const pathname = request.nextUrl.pathname;
  const isProtectedRoute = pathname === "/app" || pathname.startsWith("/app/");
  const isLoginRoute = pathname === "/login";

  if (!isConfigured || !url || !anonKey) {
    if (isProtectedRoute) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtectedRoute) {
    const redirectResponse = NextResponse.redirect(new URL("/login", request.url));
    return copyResponseCookies(response, redirectResponse);
  }

  if (user && isLoginRoute) {
    const redirectResponse = NextResponse.redirect(new URL("/app", request.url));
    return copyResponseCookies(response, redirectResponse);
  }

  return response;
}

export const config = {
  matcher: ["/app/:path*", "/login"],
};
