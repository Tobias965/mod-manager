import Link from "next/link";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ==================================================
// PANEL PRINCIPAL DE ADMINISTRACIÓN
// ==================================================

export default async function AdminPanel() {
  const [
    totalUsers,
    totalMods,
    totalGames,
    totalModpacks,
    pendingMods,
    approvedMods,
    rejectedMods,
    pendingCreatorRequests,
    totalCreators,
  ] = await Promise.all([
    // Usuarios
    prisma.user.count(),

    // Mods
    prisma.mod.count(),

    // Juegos activos
    prisma.game.count({
      where: {
        deletedAt: null,
      },
    }),

    // Modpacks
    prisma.modpack.count(),

    // Mods pendientes
    prisma.mod.count({
      where: {
        status: "PENDING",
      },
    }),

    // Mods aprobados
    prisma.mod.count({
      where: {
        status: "APPROVED",
      },
    }),

    // Mods rechazados
    prisma.mod.count({
      where: {
        status: "REJECTED",
      },
    }),

    // Solicitudes de Creator pendientes
    prisma.creatorRequest.count({
      where: {
        status: "PENDING",
      },
    }),

    // Creators aceptados
    prisma.user.count({
      where: {
        role: "CREATOR",
      },
    }),
  ]);

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-7xl">

        {/* ============================================== */}
        {/* ENCABEZADO */}
        {/* ============================================== */}

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Panel de administración
          </h1>

          <p className="mt-2 text-gray-600">
            Gestiona los usuarios, mods, juegos y modpacks de ModVault.
          </p>
        </div>

        {/* ============================================== */}
        {/* MÉTRICAS GENERALES */}
        {/* ============================================== */}

        <section className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            Métricas generales
          </h2>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

            {/* Usuarios */}
            <div className="rounded-lg bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-gray-500">
                Usuarios
              </p>

              <p className="mt-2 text-3xl font-bold text-gray-900">
                {totalUsers}
              </p>
            </div>

            {/* Mods */}
            <div className="rounded-lg bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-gray-500">
                Mods
              </p>

              <p className="mt-2 text-3xl font-bold text-gray-900">
                {totalMods}
              </p>
            </div>

            {/* Juegos */}
            <div className="rounded-lg bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-gray-500">
                Juegos
              </p>

              <p className="mt-2 text-3xl font-bold text-gray-900">
                {totalGames}
              </p>
            </div>

            {/* Modpacks */}
            <div className="rounded-lg bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-gray-500">
                Modpacks
              </p>

              <p className="mt-2 text-3xl font-bold text-gray-900">
                {totalModpacks}
              </p>
            </div>
          </div>
        </section>

        {/* ============================================== */}
        {/* ESTADO DE MODS */}
        {/* ============================================== */}

        <section className="mb-8">
          <div className="rounded-lg bg-white p-6 shadow-sm">

            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Estado de Mods
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Consulta el estado de los mods y gestiona las solicitudes
                  de moderación.
                </p>
              </div>

              <Link
                href="/admin/moderation"
                className="inline-flex items-center justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
              >
                Gestionar peticiones de mods
              </Link>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">

              {/* Mods aprobados */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
                <p className="text-sm font-medium text-gray-500">
                  Mods aprobados
                </p>

                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {approvedMods}
                </p>
              </div>

              {/* Mods pendientes */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
                <p className="text-sm font-medium text-gray-500">
                  Mods pendientes
                </p>

                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {pendingMods}
                </p>
              </div>

              {/* Mods rechazados */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
                <p className="text-sm font-medium text-gray-500">
                  Mods rechazados
                </p>

                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {rejectedMods}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================== */}
        {/* ESTADO DE CREATORS */}
        {/* ============================================== */}

        <section className="mb-8">
          <div className="rounded-lg bg-white p-6 shadow-sm">

            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Estado de Creators
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Consulta el estado de las solicitudes y la cantidad de
                  usuarios aceptados como Creator.
                </p>
              </div>

              <Link
                href="/admin/creator-requests"
                className="inline-flex items-center justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
              >
                Gestionar solicitudes
              </Link>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">

              {/* Solicitudes pendientes */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
                <p className="text-sm font-medium text-gray-500">
                  Solicitudes pendientes
                </p>

                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {pendingCreatorRequests}
                </p>
              </div>

              {/* Creators aceptados */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
                <p className="text-sm font-medium text-gray-500">
                  Creators aceptados
                </p>

                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {totalCreators}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================== */}
        {/* FUNCIONES DE ADMINISTRACIÓN */}
        {/* ============================================== */}

        <section>
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            Administración
          </h2>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">

            {/* Moderación de mods */}
            <Link
              href="/admin/moderation"
              className="rounded-lg bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <h3 className="text-lg font-semibold text-gray-900">
                Moderación de mods
              </h3>

              <p className="mt-2 text-sm text-gray-600">
                Revisa y gestiona los mods pendientes de aprobación.
              </p>

              <span className="mt-4 inline-block text-sm font-medium text-blue-600">
                Ir a moderación →
              </span>
            </Link>

            {/* Gestión de juegos */}
            <Link
              href="/admin/games"
              className="rounded-lg bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <h3 className="text-lg font-semibold text-gray-900">
                Gestión de juegos
              </h3>

              <p className="mt-2 text-sm text-gray-600">
                Administra los juegos y sus versiones disponibles.
              </p>

              <span className="mt-4 inline-block text-sm font-medium text-blue-600">
                Gestionar juegos →
              </span>
            </Link>

            {/* Solicitudes de Creator */}
            <Link
              href="/admin/creator-requests"
              className="rounded-lg bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <h3 className="text-lg font-semibold text-gray-900">
                Solicitudes de Creator
              </h3>

              <p className="mt-2 text-sm text-gray-600">
                Revisa y gestiona las solicitudes de usuarios que quieren
                convertirse en Creator.
              </p>

              <span className="mt-4 inline-block text-sm font-medium text-blue-600">
                Gestionar solicitudes →
              </span>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}