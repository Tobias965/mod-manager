"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type CreatorRequest = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  user: {
    id: string;
    email: string;
    role: "USER" | "CREATOR" | "ADMIN";
  };
};

export default function CreatorRequestsPage() {
  const [requests, setRequests] = useState<CreatorRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function loadRequests() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/creator-requests");

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "No se pudieron cargar las solicitudes"
        );
      }

      setRequests(data.requests || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar las solicitudes"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRequests();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function handleRequest(
    requestId: string,
    action: "APPROVE" | "REJECT"
  ) {
    try {
      setProcessingId(requestId);
      setError("");

      const response = await fetch("/api/creator-requests", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
          action,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "No se pudo procesar la solicitud"
        );
      }

      // Quitamos la solicitud procesada de la lista.
      setRequests((currentRequests) =>
        currentRequests.filter((request) => request.id !== requestId)
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo procesar la solicitud"
      );
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 px-6 py-10">
      <div className="mx-auto max-w-5xl">

        {/* ============================================== */}
        {/* CABECERA */}
        {/* ============================================== */}

        <div className="mb-8">
          <Link
            href="/admin"
            className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
          >
            ← Volver al panel de administración
          </Link>

          <h1 className="mt-5 text-3xl font-bold text-gray-900">
            Solicitudes de Creator
          </h1>

          <p className="mt-2 text-gray-600">
            Revisa las solicitudes de los usuarios que desean obtener
            el rol de Creator.
          </p>
        </div>

        {/* ============================================== */}
        {/* ERROR */}
        {/* ============================================== */}

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* ============================================== */}
        {/* CARGANDO */}
        {/* ============================================== */}

        {loading ? (
          <div className="rounded-lg bg-white p-8 text-center shadow-sm">
            <p className="text-gray-600">
              Cargando solicitudes...
            </p>
          </div>
        ) : requests.length === 0 ? (
          /* ============================================== */
          /* SIN SOLICITUDES */
          /* ============================================== */

          <div className="rounded-lg bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900">
              No hay solicitudes pendientes
            </h2>

            <p className="mt-2 text-gray-600">
              Actualmente no hay usuarios esperando una revisión.
            </p>
          </div>
        ) : (
          /* ============================================== */
          /* LISTA */
          /* ============================================== */

          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request.id}
                className="rounded-lg bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

                  {/* Información */}

                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {request.user.email}
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      Solicitud enviada el{" "}
                      {new Date(request.createdAt).toLocaleString(
                        "es-UY"
                      )}
                    </p>

                    <div className="mt-3">
                      <span className="rounded-full border border-[#625B2B] bg-[#302D18] px-3 py-1 text-xs font-medium text-[#E5D36A]">
                        Pendiente
                      </span>
                    </div>
                  </div>

                  {/* Acciones */}

                  <div className="flex gap-3">

                    <button
                      type="button"
                      onClick={() =>
                        handleRequest(request.id, "REJECT")
                      }
                      disabled={processingId === request.id}
                      className="rounded-md border border-[#653344] bg-[#351D28] px-4 py-2 text-sm font-medium text-[#E084A0] transition hover:bg-[#351D28] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {processingId === request.id
                        ? "Procesando..."
                        : "Rechazar"}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleRequest(request.id, "APPROVE")
                      }
                      disabled={processingId === request.id}
                      className="rounded-md border border-[#286052] bg-[#15332C] px-4 py-2 text-sm font-medium text-[#65D6B4] transition hover:bg-[#15332C] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {processingId === request.id
                        ? "Procesando..."
                        : "Aprobar"}
                    </button>

                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </main>
  );
}