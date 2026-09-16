"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type Category = {
  id: string;
  name: string;
};

type RelatedMod = {
  id: string;
  name: string;
  version: string;
  status: string;
};

type Mod = {
  id: string;
  name: string;
  version: string;
  license: string | null;
  externalUrl: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  status: string;
  createdAt: string;

  game: {
    id: string;
    name: string;
  };

  gameVersion: {
    id: string;
    version: string;
  };

  author: {
    id: string;
    email: string;
  };

  categories: {
    category: Category;
  }[];

  dependencies: {
    dependency: RelatedMod;
  }[];

  incompatibilities: {
    incompatible: RelatedMod;
  }[];
};

export default function ModPage() {
  const params = useParams();
  const id = params.id as string;

  const [mod, setMod] = useState<Mod | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadMod() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`/api/mods/${id}`, {
          cache: "no-store",
        });

        const contentType =
          response.headers.get("content-type") || "";

        let data: any = {};

        if (contentType.includes("application/json")) {
          data = await response.json();
        } else {
          const text = await response.text();

          throw new Error(
            text || "El servidor devolvió una respuesta inesperada."
          );
        }

        if (!response.ok) {
          throw new Error(
            data.error || "No se pudo cargar el mod."
          );
        }

        setMod(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No se pudo cargar el mod."
        );
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadMod();
    }
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 px-6 py-10">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-lg bg-white p-8 text-center shadow">
            <p className="text-gray-600">
              Cargando mod...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !mod) {
    return (
      <main className="min-h-screen bg-gray-100 px-6 py-10">
        <div className="mx-auto max-w-5xl">
          <Link
            href="/mods/manage/"
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            ← Volver
          </Link>

          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-6">
            <p className="text-sm text-red-700">
              {error || "El mod no existe."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 px-6 py-10">
      <div className="mx-auto max-w-5xl">

        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/mods/manage/"
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            ← Volver
          </Link>

          <Link
            href={`/mods/${mod.id}/edit`}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Editar mod
          </Link>
        </div>

        <div className="rounded-lg bg-white p-8 shadow-md">

          <div className="border-b border-gray-200 pb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              {mod.name}
            </h1>

            <p className="mt-2 text-gray-600">
              Versión {mod.version}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
                {mod.game.name}
              </span>

              <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
                {mod.gameVersion.version}
              </span>

              <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                {mod.status}
              </span>
            </div>
          </div>

          {/* INFORMACIÓN */}

          <div className="grid gap-6 py-6 md:grid-cols-2">

            <div>
              <h2 className="text-sm font-semibold text-gray-500">
                Juego
              </h2>

              <p className="mt-1 text-gray-900">
                {mod.game.name}
              </p>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-gray-500">
                Versión del juego
              </h2>

              <p className="mt-1 text-gray-900">
                {mod.gameVersion.version}
              </p>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-gray-500">
                Versión del mod
              </h2>

              <p className="mt-1 text-gray-900">
                {mod.version}
              </p>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-gray-500">
                Licencia
              </h2>

              <p className="mt-1 text-gray-900">
                {mod.license || "No especificada"}
              </p>
            </div>

          </div>

          {/* CATEGORÍAS */}

          <div className="border-t border-gray-200 py-6">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              Categorías
            </h2>

            {mod.categories.length === 0 ? (
              <p className="text-sm text-gray-500">
                Este mod no tiene categorías.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {mod.categories.map(({ category }) => (
                  <span
                    key={category.id}
                    className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700"
                  >
                    {category.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* DEPENDENCIAS */}

          <div className="border-t border-gray-200 py-6">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              Dependencias
            </h2>

            {mod.dependencies.length === 0 ? (
              <p className="text-sm text-gray-500">
                Este mod no tiene dependencias.
              </p>
            ) : (
              <div className="space-y-2">
                {mod.dependencies.map(({ dependency }) => (
                  <Link
                    key={dependency.id}
                    href={`/mods/${dependency.id}`}
                    className="block rounded-md border border-gray-200 p-3 hover:bg-gray-50"
                  >
                    <p className="font-medium text-gray-900">
                      {dependency.name}
                    </p>

                    <p className="text-sm text-gray-500">
                      Versión {dependency.version}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* INCOMPATIBILIDADES */}

          <div className="border-t border-gray-200 py-6">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              Incompatibilidades
            </h2>

            {mod.incompatibilities.length === 0 ? (
              <p className="text-sm text-gray-500">
                Este mod no tiene incompatibilidades registradas.
              </p>
            ) : (
              <div className="space-y-2">
                {mod.incompatibilities.map(
                  ({ incompatible }) => (
                    <Link
                      key={incompatible.id}
                      href={`/mods/${incompatible.id}`}
                      className="block rounded-md border border-gray-200 p-3 hover:bg-gray-50"
                    >
                      <p className="font-medium text-gray-900">
                        {incompatible.name}
                      </p>

                      <p className="text-sm text-gray-500">
                        Versión {incompatible.version}
                      </p>
                    </Link>
                  )
                )}
              </div>
            )}
          </div>

          {/* ARCHIVO / URL */}

          <div className="border-t border-gray-200 pt-6">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">
              Descarga
            </h2>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">

              {/* Enlace externo */}
              {mod.externalUrl && (
                <a
                  href={mod.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-md bg-gray-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-900 transition"
                >
                  Ir a la página externa ↗
                </a>
              )}

              {/* Archivo alojado */}
              {mod.fileUrl && (
                <a
                  href={mod.fileUrl}
                  download={mod.fileName || true}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition"
                >
                  Descargar archivo
                </a>
              )}

              {/* Ficha técnica del archivo */}
              {mod.fileName && (
                <div className="mt-2 text-xs text-gray-500 sm:mt-0 sm:ml-4">
                  <p><span className="font-medium text-gray-700">Archivo:</span> {mod.fileName}</p>
                  {mod.fileSize && (
                    <p>
                      <span className="font-medium text-gray-700">Tamaño:</span>{" "}
                      {(mod.fileSize / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  )}
                </div>
              )}

            </div>

            {!mod.externalUrl && !mod.fileUrl && (
              <p className="mt-4 text-sm text-gray-500">
                No hay ningún archivo o enlace disponible para este mod.
              </p>
            )}
          </div>

        </div>
      </div>
    </main>
  );
}