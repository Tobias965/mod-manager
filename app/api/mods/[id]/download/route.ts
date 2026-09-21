import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";

// ==================================================
// DESCARGA DE MOD
// ==================================================

type RouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: Request, { params }: RouteProps) {
  try {
    const { id } = await params;

    // ==================================================
    // BUSCAR MOD
    // ==================================================

    const mod = await prisma.mod.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        name: true,
        fileName: true,
        storageKey: true,
        status: true,
        deletedAt: true,
      },
    });

    // ==================================================
    // MOD NO ENCONTRADO
    // ==================================================

    if (!mod) {
      return NextResponse.json(
        {
          error: "Mod no encontrado",
        },
        {
          status: 404,
        }
      );
    }

    // ==================================================
    // SOLO SE PUEDEN DESCARGAR MODS APROBADOS
    // ==================================================

    if (mod.status !== "APPROVED" || mod.deletedAt !== null) {
      return NextResponse.json(
        {
          error: "Este mod no está disponible para descarga",
        },
        {
          status: 403,
        }
      );
    }

    // ==================================================
    // COMPROBAR ARCHIVO
    // ==================================================

    if (!mod.storageKey) {
      return NextResponse.json(
        {
          error: "Este mod no tiene un archivo disponible",
        },
        {
          status: 404,
        }
      );
    }

    // ==================================================
    // GENERAR URL FIRMADA
    // ==================================================

    const { data, error } = await supabaseAdmin.storage
      .from("mods")
      .createSignedUrl(
        mod.storageKey,
        300,
        {
          download: mod.fileName || true,
        }
      );

    if (error || !data?.signedUrl) {
      console.error("Error al generar URL de descarga:", error);

      return NextResponse.json(
        {
          error: "No se pudo generar la descarga",
        },
        {
          status: 500,
        }
      );
    }

    // ==================================================
    // REDIRIGIR A SUPABASE
    // ==================================================

    return NextResponse.redirect(data.signedUrl);
  } catch (error) {
    console.error("Error en descarga del mod:", error);

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