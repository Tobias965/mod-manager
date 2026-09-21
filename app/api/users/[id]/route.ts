import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getSessionFromRequest } from "@/lib/auth";


export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSessionFromRequest(request);

    if (!session || (session.userId !== id && session.role !== "ADMIN")) {
      return NextResponse.json(
        { error: "No tienes permiso para modificar este usuario" },
        { status: session ? 403 : 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        _count: {
          select: {
            mods: true,
            modpacks: true,
          },
        },
        // Limitamos a los últimos 5 mods
        mods: {
          take: 5,
          select: {
            id: true,
            name: true,
            version: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
        // Limitamos a los últimos 5 modpacks
        modpacks: {
          take: 5,
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verificar body válido
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "Cuerpo de la petición inválido o vacío" },
        { status: 400 }
      );
    }

    const { email, currentPassword, newPassword } = body;

    // 1. Verificar si el usuario existe
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    const updates: { email?: string; passwordHash?: string } = {};

    // 2. Cambio de email
    if (email && email !== user.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: "Formato de email inválido" },
          { status: 400 }
        );
      }

      const existingEmail = await prisma.user.findUnique({ where: { email } });
      if (existingEmail) {
        return NextResponse.json(
          { error: "El email ya está en uso por otro usuario" },
          { status: 400 }
        );
      }

      updates.email = email;
    }

    // 3. Cambio de contraseña
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Debes ingresar tu contraseña actual para cambiarla" },
          { status: 400 }
        );
      }

      // Validar si passwordHash existe en BD
      if (!user.passwordHash) {
        return NextResponse.json(
          { error: "Error en la cuenta del usuario" },
          { status: 400 }
        );
      }

      const isValidPassword = await bcrypt.compare(
        currentPassword,
        user.passwordHash
      );

      if (!isValidPassword) {
        return NextResponse.json(
          { error: "La contraseña actual es incorrecta" },
          { status: 400 }
        );
      }

      if (newPassword.length < 8) {
        return NextResponse.json(
          { error: "La nueva contraseña debe tener al menos 8 caracteres" },
          { status: 400 }
        );
      }

      updates.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No se proporcionaron cambios para actualizar" },
        { status: 400 }
      );
    }

    // 4. Actualización en Prisma
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updates,
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json({
      message: "Datos actualizados correctamente",
      user: updatedUser,
    });
  } catch (error) {
    // Esto imprime el error exacto en tu consola/terminal de Next.js
    console.error("Error en PATCH /api/users/[id]:", error);

    return NextResponse.json(
      { error: "Error interno del servidor al actualizar el usuario" },
      { status: 500 }
    );
  }
}