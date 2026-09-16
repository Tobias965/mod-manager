import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

async function getAuthenticatedUser() {
  const cookieStore = await cookies();

  const token = cookieStore.get("session")?.value;

  if (!token) {
    return null;
  }

  try {
    const payload = await verifyToken(token);

    if (!payload?.userId) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: {
        id: payload.userId,
      },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    return user;
  } catch {
    return null;
  }
}

// ==================================================
// GET
// ==================================================
//
// USER:
// Devuelve su propia solicitud.
//
// ADMIN:
// Devuelve todas las solicitudes pendientes.
// ==================================================

export async function GET() {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "No estás autenticado",
        },
        {
          status: 401,
        }
      );
    }

    // ==================================================
    // ADMIN
    // ==================================================

    if (user.role === "ADMIN") {
      const requests = await prisma.creatorRequest.findMany({
        where: {
          status: "PENDING",
        },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
      });

      return NextResponse.json({
        requests,
      });
    }

    // ==================================================
    // CREATOR
    // ==================================================

    if (user.role === "CREATOR") {
      return NextResponse.json({
        request: null,
        canRequest: false,
        role: user.role,
      });
    }

    // ==================================================
    // USER
    // ==================================================

    const request = await prisma.creatorRequest.findUnique({
      where: {
        userId: user.id,
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      request,
      canRequest:
        !request || request.status === "REJECTED",
      role: user.role,
    });
  } catch (error) {
    console.error(
      "Error al obtener solicitudes de Creator:",
      error
    );

    return NextResponse.json(
      {
        error: "Error interno del servidor",
      },
      {
        status: 500,
      }
    );
  }
}

// ==================================================
// POST
// ==================================================
//
// USER solicita convertirse en CREATOR.
// ==================================================

export async function POST() {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "No estás autenticado",
        },
        {
          status: 401,
        }
      );
    }

    // Solo USER puede solicitar ser Creator.

    if (user.role !== "USER") {
      return NextResponse.json(
        {
          error:
            "No puedes solicitar ser Creator porque ya tienes otro rol",
        },
        {
          status: 400,
        }
      );
    }

    // Buscar solicitud existente.

    const existingRequest =
      await prisma.creatorRequest.findUnique({
        where: {
          userId: user.id,
        },
      });

    // Ya tiene una solicitud pendiente.

    if (existingRequest?.status === "PENDING") {
      return NextResponse.json(
        {
          error: "Ya tienes una solicitud pendiente",
          request: existingRequest,
        },
        {
          status: 400,
        }
      );
    }

    let creatorRequest;

    // ==================================================
    // VOLVER A SOLICITAR
    // ==================================================

    if (existingRequest?.status === "REJECTED") {
      creatorRequest = await prisma.creatorRequest.update({
        where: {
          userId: user.id,
        },
        data: {
          status: "PENDING",
        },
      });
    } else {
      // ==================================================
      // PRIMERA SOLICITUD
      // ==================================================

      creatorRequest = await prisma.creatorRequest.create({
        data: {
          userId: user.id,
          status: "PENDING",
        },
      });
    }

    return NextResponse.json(
      {
        message: "Solicitud enviada correctamente",
        request: creatorRequest,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Error al crear solicitud de Creator:",
      error
    );

    return NextResponse.json(
      {
        error: "Error interno del servidor",
      },
      {
        status: 500,
      }
    );
  }
}

// ==================================================
// PATCH
// ==================================================
//
// Solo ADMIN.
//
// action:
// APPROVE
// REJECT
// ==================================================

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "No estás autenticado",
        },
        {
          status: 401,
        }
      );
    }

    // Solo ADMIN puede procesar solicitudes.

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        {
          error:
            "No tienes permisos para realizar esta acción",
        },
        {
          status: 403,
        }
      );
    }

    const body = await request.json();

    const requestId = body.requestId;
    const action = body.action;

    // ==================================================
    // VALIDACIÓN
    // ==================================================

    if (!requestId || !action) {
      return NextResponse.json(
        {
          error: "requestId y action son obligatorios",
        },
        {
          status: 400,
        }
      );
    }

    if (
      action !== "APPROVE" &&
      action !== "REJECT"
    ) {
      return NextResponse.json(
        {
          error:
            "La acción debe ser APPROVE o REJECT",
        },
        {
          status: 400,
        }
      );
    }

    // Buscar solicitud.

    const creatorRequest =
      await prisma.creatorRequest.findUnique({
        where: {
          id: requestId,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
      });

    if (!creatorRequest) {
      return NextResponse.json(
        {
          error: "Solicitud no encontrada",
        },
        {
          status: 404,
        }
      );
    }

    // No permitir procesar dos veces
    // la misma solicitud.

    if (creatorRequest.status !== "PENDING") {
      return NextResponse.json(
        {
          error: "Esta solicitud ya fue procesada",
        },
        {
          status: 400,
        }
      );
    }

    // ==================================================
    // APROBAR
    // ==================================================

    if (action === "APPROVE") {
      const result = await prisma.$transaction(
        async (tx) => {
          // Primero marcamos la solicitud como aprobada.

          const updatedRequest =
            await tx.creatorRequest.update({
              where: {
                id: creatorRequest.id,
              },
              data: {
                status: "APPROVED",
              },
            });

          // Después cambiamos el rol del usuario.

          const updatedUser =
            await tx.user.update({
              where: {
                id: creatorRequest.user.id,
              },
              data: {
                role: "CREATOR",
              },
              select: {
                id: true,
                email: true,
                role: true,
              },
            });

          return {
            request: updatedRequest,
            user: updatedUser,
          };
        }
      );

      return NextResponse.json({
        message: "Solicitud aprobada correctamente",
        ...result,
      });
    }

    // ==================================================
    // RECHAZAR
    // ==================================================

    const updatedRequest =
      await prisma.creatorRequest.update({
        where: {
          id: creatorRequest.id,
        },
        data: {
          status: "REJECTED",
        },
      });

    return NextResponse.json({
      message: "Solicitud rechazada correctamente",
      request: updatedRequest,
    });
  } catch (error) {
    console.error(
      "Error al gestionar solicitud de Creator:",
      error
    );

    return NextResponse.json(
      {
        error: "Error interno del servidor",
      },
      {
        status: 500,
      }
    );
  }
}