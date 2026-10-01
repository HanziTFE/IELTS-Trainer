import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
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
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 驗證當前請求的使用者 Session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();
  const isLoginPage = url.pathname.startsWith('/login');

  // 1. 未登入且嘗試存取保護頁面 -> 強制跳轉至登入頁
  if (!user && !isLoginPage) {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // 2. 已登入但存取登入頁 -> 自動跳轉至首頁儀表板
  if (user && isLoginPage) {
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  return response;
}

// 設定 Middleware 攔截範圍（排除靜態檔案與 API）
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};