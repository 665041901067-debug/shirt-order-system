import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Static assets and auth routes bypassing
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return supabaseResponse;
  }

  // Public route: /login
  if (pathname === "/login") {
    if (user) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Protected routes require logged in user
  if (!user && pathname !== "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // If logged in, check profile completeness and role security
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, student_id, first_name, last_name, nickname, phone, academic_year")
      .eq("id", user.id)
      .single();

    // Check complete criteria strictly:
    // first_name, last_name, nickname, student_id, academic_year, and phone (must be 10 digits)
    const cleanPhone = (profile?.phone || "").replace(/[^0-9]/g, "");
    const isProfileComplete = Boolean(
      profile?.first_name?.trim() &&
      profile?.last_name?.trim() &&
      profile?.nickname?.trim() &&
      profile?.student_id?.trim() &&
      profile?.academic_year?.trim() &&
      cleanPhone.length === 10
    );

    // If profile is INCOMPLETE -> Force redirect to /onboarding
    if (!isProfileComplete && pathname !== "/onboarding" && pathname !== "/login") {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }

    // If profile is ALREADY COMPLETE and user tries to visit /onboarding -> Redirect away to /
    if (isProfileComplete && pathname === "/onboarding") {
      const url = request.nextUrl.clone();
      url.pathname = profile?.role === "ADMIN" ? "/admin" : "/";
      return NextResponse.redirect(url);
    }

    // Role Security: Guard /admin/* paths from non-ADMIN users
    if (pathname.startsWith("/admin")) {
      if (profile?.role !== "ADMIN") {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
