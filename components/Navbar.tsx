"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from 'next/navigation';

type User = {
  id: string;
  email: string;
  role: "USER" | "CREATOR" | "ADMIN";
};

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });

        if (!response.ok) {
          setUser(null);
          return;
        }

        const data = await response.json();
        setUser(data.user);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [pathname]);

  async function logout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });

      setUser(null);
      router.push("/");
      router.refresh();
    } catch {
      console.error("No se pudo cerrar la sesión");
    }
  }

  return (
    <nav className="border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-4">

        {/* Logo */}
        <Link
          href="/"
          className="shrink-0 text-xl font-bold text-gray-900"
        >
          Mod Manager
        </Link>

        {/* Navegación */}
        <div className="flex items-center gap-4">

          {/* 1. Explorar */}
          <Link
            href="/"
            className="text-sm font-medium text-gray-700 hover:text-blue-600"
          >
            Explorar
          </Link>

          {/* 2. Modpacks */}
          <Link
            href="/modpacks"
            className="text-sm font-medium text-gray-700 hover:text-blue-600"
          >
            Modpacks
          </Link>

          {/* 3. Gestionar Mods */}
          {["CREATOR", "ADMIN"].includes(user?.role || "") && (
            <Link
              href="/mods/manage"
              className="text-sm font-medium text-gray-700 hover:text-blue-600"
            >
              Gestionar Mods
            </Link>
          )}

          {/* 4. Moderación */}
          {user?.role === "ADMIN" && (
            <Link
              href="/admin"
              className="text-sm font-medium text-gray-700 hover:text-blue-600"
            >
              Moderación
            </Link>
          )}

        </div>

        {/* Sesión */}
        <div className="ml-auto flex shrink-0 items-center gap-3">
          {loading ? (
            <span className="text-sm text-gray-500">Cargando...</span>
          ) : user ? (
            <>
              {/* Email convertido en Link hacia el perfil/gestión */}
              <Link
                href={`/users/${user.id}`}
                className="hidden text-sm font-medium text-gray-700 hover:text-blue-600 md:block"
              >
                {user.email}
              </Link>

              <button
                type="button"
                onClick={logout}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Salir
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Iniciar sesión
            </Link>
          )}
        </div>

      </div>
    </nav>
  );
}