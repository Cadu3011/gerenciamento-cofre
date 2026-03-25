import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { jwtDecode } from "jwt-decode";
interface UserPayload {
  sub: number;
  roles: string;
  filialId: number;
  iat: number;
  exp: number;
}
const secret = new TextEncoder().encode(process.env.JWT_SECRET);
export async function proxy(request: NextRequest) {
  const token = request.cookies.get("access_token")?.value;
  if (!token) return NextResponse.redirect(new URL("/login", request.url));

  const userData = jwtDecode<UserPayload>(token);
  const isExpired = userData.exp * 1000 < Date.now();

  if (isExpired) {
    NextResponse.redirect(new URL("/login", request.url));
  }
  try {
    const { payload } = await jwtVerify(token, secret);
    // Bloquear rota /admin para não-admins
    if (
      request.nextUrl.pathname.startsWith("/admin") &&
      payload.roles !== "GESTOR"
    ) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }

    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/admin/:path*", "/workspace/:path*"],
};
