import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { createModpack } from "@/lib/modpacks";
import { cookies } from "next/headers";

import GameSelect from "@/components/GameSelect";
import VersionSelect from "@/components/VersionSelect";
import ModpackAI from "@/components/ModpackAI";

interface PageProps {
  searchParams: Promise<{
    gameId?: string;
    versionId?: string;
  }>;
}

export default async function CreateModpackPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;

  const selectedGameId =
    params.gameId;

  const selectedVersionId =
    params.versionId;

  // ==================================================
  // 1. Verificar sesión y permisos
  // ==================================================

  const cookieStore = await cookies();

  const token =
    cookieStore.get("session")?.value;

  if (!token) {
    redirect("/login");
  }

  let session: {
    role:
      | "USER"
      | "CREATOR"
      | "ADMIN";
    userId: string;
  };

  try {
    session = await verifyToken(token);
  } catch {
    redirect("/login");
  }

  if (
    session.role !== "CREATOR" &&
    session.role !== "ADMIN"
  ) {
    redirect("/modpacks");
  }

  // ==================================================
  // 2. Obtener juegos disponibles
  // ==================================================

  const games =
    await prisma.game.findMany({
      where: {
        deletedAt: null,
      },

      select: {
        id: true,
        name: true,
      },

      orderBy: {
        name: "asc",
      },
    });

  // ==================================================
  // 3. Obtener versiones
  // ==================================================

  const versions =
    selectedGameId
      ? await prisma.gameVersion.findMany({
          where: {
            gameId:
              selectedGameId,
          },

          select: {
            id: true,
            version: true,
          },

          orderBy: {
            version: "asc",
          },
        })
      : [];

  // ==================================================
  // 4. Verificar versión
  // ==================================================

  const selectedVersion =
    selectedGameId &&
    selectedVersionId
      ? await prisma.gameVersion.findFirst({
          where: {
            id: selectedVersionId,
            gameId: selectedGameId,
          },

          select: {
            id: true,
          },
        })
      : null;

  const validSelectedVersionId =
    selectedVersion
      ? selectedVersionId
      : undefined;

  // ==================================================
  // 5. Obtener mods disponibles
  // ==================================================

  const availableMods =
    selectedGameId &&
    validSelectedVersionId
      ? await prisma.mod.findMany({
          where: {
            gameId:
              selectedGameId,

            gameVersionId:
              validSelectedVersionId,

            status: "APPROVED",

            deletedAt: null,
          },

          select: {
            id: true,
            name: true,
          },

          orderBy: {
            name: "asc",
          },
        })
      : [];

  // ==================================================
  // 6. Obtener categorías
  // ==================================================

  const categories =
    await prisma.category.findMany({
      select: {
        id: true,
        name: true,
      },

      orderBy: {
        name: "asc",
      },
    });

  // ==================================================
  // 7. Server Action
  // ==================================================

  async function createModpackAction(
    formData: FormData
  ) {
    "use server";

    const name = String(
      formData.get("name") ?? ""
    ).trim();

    const descriptionValue =
      formData.get("description");

    const description =
      typeof descriptionValue ===
      "string"
        ? descriptionValue.trim()
        : "";

    const isPublic =
      formData.get("isPublic") ===
      "on";

    const gameId = String(
      formData.get("gameId") ?? ""
    ).trim();

    const gameVersionId =
      String(
        formData.get(
          "gameVersionId"
        ) ?? ""
      ).trim();

    const modIds = formData
      .getAll("modIds")
      .filter(
        (
          value
        ): value is string =>
          typeof value ===
          "string"
      );

    // ==================================================
    // Validaciones
    // ==================================================

    if (!name) {
      throw new Error(
        "El nombre del modpack es obligatorio"
      );
    }

    if (!gameId) {
      throw new Error(
        "Debes seleccionar un juego"
      );
    }

    if (!gameVersionId) {
      throw new Error(
        "Debes seleccionar una versión del juego"
      );
    }

    // ==================================================
    // Verificar juego
    // ==================================================

    const game =
      await prisma.game.findFirst({
        where: {
          id: gameId,
          deletedAt: null,
        },

        select: {
          id: true,
        },
      });

    if (!game) {
      throw new Error(
        "El juego seleccionado no existe"
      );
    }

    // ==================================================
    // Verificar versión
    // ==================================================

    const gameVersion =
      await prisma.gameVersion.findFirst({
        where: {
          id: gameVersionId,
          gameId,
        },

        select: {
          id: true,
        },
      });

    if (!gameVersion) {
      throw new Error(
        "La versión seleccionada no pertenece al juego"
      );
    }

    // ==================================================
    // Eliminar duplicados
    // ==================================================

    const uniqueModIds = [
      ...new Set(modIds),
    ];

    // ==================================================
    // Verificar mods
    // ==================================================

    if (
      uniqueModIds.length > 0
    ) {
      const validMods =
        await prisma.mod.findMany({
          where: {
            id: {
              in: uniqueModIds,
            },

            gameId,

            gameVersionId,

            status: "APPROVED",

            deletedAt: null,
          },

          select: {
            id: true,
          },
        });

      if (
        validMods.length !==
        uniqueModIds.length
      ) {
        throw new Error(
          "Uno o más mods seleccionados no son válidos para este juego y versión"
        );
      }
    }

    // ==================================================
    // Crear modpack
    // ==================================================

    await createModpack(
      {
        name,
        description,
        isPublic,
        gameId,
        gameVersionId,
        modIds: uniqueModIds,
      },
      session
    );

    // ==================================================
    // Redirigir
    // ==================================================

    redirect(
      "/modpacks/me"
    );
  }

  // ==================================================
  // 8. Render
  // ==================================================

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      {/* ==================================================
          ENCABEZADO
      ================================================== */}

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Crear Nuevo Modpack
          </h1>

          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Agrupa tus mods favoritos en
            un solo paquete para compartir
            con la comunidad o guardar para
            ti.
          </p>
        </div>

        <Link
          href="/modpacks"
          className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium text-sm"
        >
          Volver
        </Link>
      </div>

      <form
        action={
          createModpackAction
        }
        className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700"
      >
        {/* ==================================================
            JUEGO
        ================================================== */}

        <div className="mb-6">
          <label
            htmlFor="gameId"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Paso 1: Selecciona el
            Juego
          </label>

          <GameSelect
            games={games}
            selectedGameId={
              selectedGameId
            }
          />
        </div>

        {/* ==================================================
            VERSIÓN
        ================================================== */}

        <div className="mb-6">
          <label
            htmlFor="gameVersionId"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Paso 2: Selecciona la
            versión
          </label>

          {!selectedGameId ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-center">
              Selecciona un juego
              primero para ver sus
              versiones disponibles.
            </p>
          ) : versions.length ===
            0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-center">
              No hay versiones
              disponibles para este
              juego.
            </p>
          ) : (
            <VersionSelect
              gameId={
                selectedGameId
              }
              versions={versions}
              selectedVersionId={
                validSelectedVersionId
              }
            />
          )}
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 my-6" />

        {/* ==================================================
            NOMBRE
        ================================================== */}

        <div className="mb-6">
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Nombre del Modpack{" "}
            <span className="text-red-500">
              *
            </span>
          </label>

          <input
            id="name"
            name="name"
            type="text"
            placeholder="Ej: Survival Extremo 2026"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
            required
          />
        </div>

        {/* ==================================================
            DESCRIPCIÓN
        ================================================== */}

        <div className="mb-6">
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Descripción{" "}
            <span className="text-gray-400 font-normal text-xs">
              (Opcional)
            </span>
          </label>

          <textarea
            id="description"
            name="description"
            rows={3}
            placeholder="Describe de qué trata tu modpack, qué experiencia ofrece, etc."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors resize-none"
          />
        </div>

        {/* ==================================================
            VISIBILIDAD
        ================================================== */}

        <div className="mb-8 flex items-center gap-3 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <input
            id="isPublic"
            name="isPublic"
            type="checkbox"
            className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
          />

          <div className="flex flex-col">
            <label
              htmlFor="isPublic"
              className="text-sm font-medium text-gray-900 dark:text-gray-200 cursor-pointer"
            >
              Hacer público
            </label>

            <span className="text-xs text-gray-500 dark:text-gray-400">
              Si lo marcas, el
              modpack será visible
              para toda la comunidad.
              Si no, será privado
              solo para ti.
            </span>
          </div>
        </div>

        {/* ==================================================
            MODS
        ================================================== */}

        <div className="mb-8">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Paso 3: Selecciona los
            mods a incluir
          </h3>

          {!selectedGameId ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-center">
              Selecciona un juego
              primero para ver sus
              mods disponibles.
            </p>
          ) : !validSelectedVersionId ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-center">
              Selecciona una versión
              primero para ver los
              mods disponibles.
            </p>
          ) : availableMods.length ===
            0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-center">
              No hay mods aprobados
              disponibles para esta
              versión del juego.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50">
              {availableMods.map(
                (mod) => (
                  <label
                    key={mod.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-white border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-750 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      name="modIds"
                      value={mod.id}
                      className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                    />

                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                      {mod.name}
                    </span>
                  </label>
                )
              )}
            </div>
          )}
        </div>

        {/* ==================================================
            IA
        ================================================== */}

        <ModpackAI
          gameId={
            selectedGameId
          }
          gameVersionId={
            validSelectedVersionId
          }
          categories={
            categories
          }
        />

        {/* ==================================================
            CREAR
        ================================================== */}

        <div className="flex justify-end border-t border-gray-200 dark:border-gray-700 pt-6 mt-8">
          <button
            type="submit"
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition-colors"
          >
            Crear Modpack
          </button>
        </div>
      </form>
    </main>
  );
}