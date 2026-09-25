import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAuthRoute = pathname === "/login" || pathname === "/register";
  const token = request.cookies.get("session")?.value;

  // 1. Manejo de rutas de autenticación (/login y /register)
  if (isAuthRoute) {
    if (token) {
      try {
        const user = await verifyToken(token);
        if (user) {
          // Si el token es 100% válido, no necesita ver el login: redirigir a inicio
          return NextResponse.redirect(new URL("/", request.url));
        }
      } catch {
        // Si el token expiró o es inválido, borramos la cookie residual y permitimos cargar /login
        const response = NextResponse.next();
        response.cookies.delete("session");
        return response;
      }
    }
    return NextResponse.next();
  }

  // 2. Definición de rutas protegidas
  const isAdminRoute = pathname.startsWith("/admin");
  const isModsRoute = pathname.startsWith("/mods");

  const isProtectedRoute =
    isAdminRoute ||
    isModsRoute;

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // 3. Si la ruta es protegida y no hay token, enviar a /login
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 4. Verificación de permisos y roles
  try {
    const user = await verifyToken(token);
    const userRole = user.role;

    if (isAdminRoute && userRole !== "ADMIN") {
      console.warn(`⚠️ ACCESO DENEGADO: ${pathname} requiere ADMIN. Rol actual: "${userRole}"`);
      return NextResponse.redirect(new URL("/", request.url));
    }

    if (
      (isModsRoute) &&
      !["CREATOR", "ADMIN"].includes(userRole || "")
    ) {
      console.warn(`⚠️ ACCESO DENEGADO: ${pathname} requiere CREATOR o ADMIN. Rol actual: "${userRole}"`);
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
  } catch (error) {
    console.error("❌ Token inválido o manipulado:", error);
    // Borrar la cookie corrupta si falla la autenticación
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("session");
    return response;
  }
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/register",
    "/modpacks/:path*",
    "/admin/:path*",
    "/mods/manage/:path*",
    "/mods/new/:path*",
  ],
};