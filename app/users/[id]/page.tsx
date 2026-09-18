"use client";

import { use, useEffect, useState } from "react";

import Link from "next/link";

type UserDetail = {
  id: string;
  email: string;
  role: "USER" | "CREATOR" | "ADMIN";
  _count: {
    mods: number;
    modpacks: number;
  };
  mods: Array<{
    id: string;
    name: string;
    version: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
  }>;
  modpacks: Array<{
    id: string;
    name: string;
  }>;
};

type CreatorRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

type CreatorRequest = {
  id: string;
  status: CreatorRequestStatus;
  createdAt: string;
  updatedAt: string;
};

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ==================================================
  // Solicitud de Creator
  // ==================================================

  const [creatorRequest, setCreatorRequest] =
    useState<CreatorRequest | null>(null);

  const [canRequestCreator, setCanRequestCreator] = useState(false);

  const [creatorRequestLoading, setCreatorRequestLoading] = useState(true);

  const [creatorRequestSubmitting, setCreatorRequestSubmitting] =
    useState(false);

  const [creatorRequestMessage, setCreatorRequestMessage] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({
    type: null,
    message: "",
  });

  // ==================================================
  // Modal de edición
  // ==================================================

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [emailInput, setEmailInput] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [editStatus, setEditStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({
    type: null,
    message: "",
  });

  const [isUpdating, setIsUpdating] = useState(false);

  // ==================================================
  // Cargar usuario
  // ==================================================

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch(`/api/users/${id}`);

        if (!res.ok) {
          throw new Error("Error al cargar la información");
        }

        const data = await res.json();

        setUser(data.user);
        setEmailInput(data.user.email);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error desconocido"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [id]);

  // ==================================================
  // Cargar solicitud de Creator
  // ==================================================

  useEffect(() => {
    async function fetchCreatorRequest() {
      try {
        const res = await fetch("/api/creator-requests");

        if (!res.ok) {
          return;
        }

        const data = await res.json();

        setCreatorRequest(data.request);
        setCanRequestCreator(data.canRequest);
      } catch (err) {
        console.error("Error al cargar solicitud de Creator:", err);
      } finally {
        setCreatorRequestLoading(false);
      }
    }

    fetchCreatorRequest();
  }, []);

  // ==================================================
  // Solicitar ser Creator
  // ==================================================

  const handleCreatorRequest = async () => {
    setCreatorRequestSubmitting(true);

    setCreatorRequestMessage({
      type: null,
      message: "",
    });

    try {
      const res = await fetch("/api/creator-requests", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || "No se pudo enviar la solicitud"
        );
      }

      setCreatorRequest(data.request);
      setCanRequestCreator(false);

      setCreatorRequestMessage({
        type: "success",
        message:
          "Tu solicitud fue enviada. Un administrador deberá revisarla.",
      });
    } catch (err) {
      setCreatorRequestMessage({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "No se pudo enviar la solicitud",
      });
    } finally {
      setCreatorRequestSubmitting(false);
    }
  };

  // ==================================================
  // Actualizar datos
  // ==================================================

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    setEditStatus({
      type: null,
      message: "",
    });

    if (newPassword && newPassword !== confirmPassword) {
      setEditStatus({
        type: "error",
        message: "Las contraseñas nuevas no coinciden",
      });

      return;
    }

    if (newPassword && newPassword.length < 8) {
      setEditStatus({
        type: "error",
        message:
          "La nueva contraseña debe tener al menos 8 caracteres",
      });

      return;
    }

    setIsUpdating(true);

    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: emailInput,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || "Error al actualizar"
        );
      }

      setEditStatus({
        type: "success",
        message: "Datos actualizados con éxito",
      });

      setUser((prev) =>
        prev
          ? {
              ...prev,
              email: data.user.email,
            }
          : null
      );

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        setIsEditModalOpen(false);

        setEditStatus({
          type: null,
          message: "",
        });
      }, 1500);
    } catch (err) {
      setEditStatus({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Error de actualización",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // ==================================================
  // Loading
  // ==================================================

  if (loading) {
    return (
      <div className="p-12 text-center text-gray-500">
        Cargando perfil...
      </div>
    );
  }

  // ==================================================
  // Error
  // ==================================================

  if (error || !user) {
    return (
      <div className="mx-auto max-w-xl p-6 text-center">
        <p className="text-red-500">
          {error || "Usuario no encontrado"}
        </p>

        <Link
          href="/"
          className="mt-4 inline-block text-blue-600 underline"
        >
          Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">

      {/* ==================================================
          Cabecera
      ================================================== */}

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {user.email}
            </h1>
          </div>

          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
            {user.role}
          </span>
        </div>
      </div>

      {/* ==================================================
          Solicitud de Creator
      ================================================== */}

      {!creatorRequestLoading &&
        user.role === "USER" && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">
              Convertirte en Creator
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Los usuarios Creator pueden publicar y administrar
              sus propios mods.
            </p>

            {creatorRequestMessage.message && (
              <div
                className={`mt-4 rounded-md p-3 text-sm ${
                  creatorRequestMessage.type === "success"
                    ? "border border-[#286052] bg-[#15332C] text-[#65D6B4]"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {creatorRequestMessage.message}
              </div>
            )}

            {creatorRequest?.status === "PENDING" ? (
              <div className="mt-4 rounded-md border border-[#625B2B] bg-[#302D18] p-4">
                <p className="font-medium text-[#E5D36A]">
                  Solicitud pendiente
                </p>

                <p className="mt-1 text-sm text-[#E5D36A]">
                  Tu solicitud está siendo revisada por un
                  administrador.
                </p>
              </div>
            ) : creatorRequest?.status === "REJECTED" ? (
              <div className="mt-4">
                <div className="mb-4 rounded-md border border-[#653344] bg-[#351D28] p-4">
                  <p className="font-medium text-[#E084A0]">
                    Solicitud rechazada
                  </p>

                  <p className="mt-1 text-sm text-[#E084A0]">
                    Tu solicitud anterior fue rechazada. Puedes
                    enviar una nueva solicitud.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCreatorRequest}
                  disabled={creatorRequestSubmitting}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {creatorRequestSubmitting
                    ? "Enviando..."
                    : "Solicitar ser Creator nuevamente"}
                </button>
              </div>
            ) : canRequestCreator ? (
              <button
                type="button"
                onClick={handleCreatorRequest}
                disabled={creatorRequestSubmitting}
                className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {creatorRequestSubmitting
                  ? "Enviando..."
                  : "Solicitar ser Creator"}
              </button>
            ) : null}
          </div>
        )}

      {/* ==================================================
          Contadores
      ================================================== */}

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
          <p className="text-3xl font-bold text-gray-800">
            {user._count.mods}
          </p>

          <p className="text-sm text-gray-500">
            Mods Publicados
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
          <p className="text-3xl font-bold text-gray-800">
            {user._count.modpacks}
          </p>

          <p className="text-sm text-gray-500">
            Modpacks Creados
          </p>
        </div>
      </div>

      {/* ==================================================
          Mods Recientes
      ================================================== */}

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Mods Recientes
          </h2>

          {user._count.mods > 0 && (
            <Link
              href={`/users/${user.id}/mods`}
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              Ver todos ({user._count.mods}) →
            </Link>
          )}
        </div>

        {user.mods.length === 0 ? (
          <p className="text-sm text-gray-500">
            Sin mods creados.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {user.mods.map((mod) => (
              <li
                key={mod.id}
                className="flex justify-between py-2 text-sm"
              >
                <span>
                  {mod.name} (v{mod.version})
                </span>

                <span className="text-xs font-semibold">
                  {mod.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ==================================================
          Modpacks Recientes
      ================================================== */}

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Modpacks Recientes
          </h2>

          {user._count.modpacks > 0 && (
            <Link
              href={`/users/${user.id}/modpacks`}
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              Ver todos ({user._count.modpacks}) →
            </Link>
          )}
        </div>

        {user.modpacks.length === 0 ? (
          <p className="text-sm text-gray-500">
            Sin modpacks creados.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {user.modpacks.map((pack) => (
              <li
                key={pack.id}
                className="py-2 text-sm text-gray-800"
              >
                {pack.name}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ==================================================
          Botón editar
      ================================================== */}

      <div className="flex justify-end pt-2">
        <button
          onClick={() => {
            setEmailInput(user.email);

            setEditStatus({
              type: null,
              message: "",
            });

            setIsEditModalOpen(true);
          }}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
        >
          Editar información
        </button>
      </div>

      {/* ==================================================
          Modal edición
      ================================================== */}

      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-lg border border-gray-200 bg-white p-6 shadow-xl">

            <div className="mb-4 flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-semibold text-gray-900">
                Editar Datos de Cuenta
              </h2>

              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {editStatus.message && (
              <div
                className={`mb-4 rounded p-3 text-sm ${
                  editStatus.type === "success"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {editStatus.message}
              </div>
            )}

            <form
              onSubmit={handleUpdate}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Correo Electrónico
                </label>

                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) =>
                    setEmailInput(e.target.value)
                  }
                  required
                  className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <hr className="my-3 border-gray-200" />

              <p className="text-xs text-gray-500">
                Llenar únicamente si deseas cambiar tu contraseña:
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Contraseña Actual
                </label>

                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) =>
                    setCurrentPassword(e.target.value)
                  }
                  className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nueva Contraseña
                  </label>

                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) =>
                      setNewPassword(e.target.value)
                    }
                    placeholder="Mín. 8 caracteres"
                    className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Confirmar Contraseña
                  </label>

                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) =>
                      setConfirmPassword(e.target.value)
                    }
                    className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isUpdating}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isUpdating
                    ? "Guardando..."
                    : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}