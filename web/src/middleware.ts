import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtDecode } from "jwt-decode";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
interface UserPayload {
  sub: number;
  roles: string;
  filialId: number;
  iat: number;
  exp: number;
}
const secret = new TextEncoder().encode(process.env.JWT_SECRET);
export async function middleware(request: NextRequest) {
  const token = (await cookies()).get("access_token")?.value;

  if (!token) return NextResponse.redirect(new URL("/login", request.url));

  try {
    await jwtVerify(token, secret);

    const userData = jwtDecode<UserPayload>(token);

    // Bloquear rota /admin para não-admins
    if (
      request.nextUrl.pathname.startsWith("/admin") &&
      userData.roles !== "GESTOR"
    ) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }

    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/admin/:path*", "/gerencia-cofre/:path*"],
};
