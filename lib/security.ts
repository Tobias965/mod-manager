import crypto from "crypto";

const ALLOWED_DOMAINS = [
  "curseforge.com",
  "nexusmods.com",
  "github.com",
  "modrinth.com",
  "drive.google.com",
];

const ALLOWED_MIMES = [
  "application/zip",
  "application/x-rar-compressed",
  "application/x-7z-compressed",
  "application/octet-stream",
  "application/x-zip-compressed",
];

const ALLOWED_EXTENSIONS = [
  ".zip",
  ".rar",
  ".7z",
];

export function isValidExternalUrl(
  urlString: string
): boolean {
  try {
    const parsed = new URL(urlString);

    if (parsed.protocol !== "https:") {
      return false;
    }

    return ALLOWED_DOMAINS.some(
      (domain) =>
        parsed.hostname === domain ||
        parsed.hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

export function generateFileHash(
  buffer: Buffer
): string {
  return crypto
    .createHash("sha256")
    .update(buffer)
    .digest("hex");
}

export function isValidMimeType(
  mimeType: string,
  fileName?: string
): boolean {
  // MIME reconocido directamente
  if (ALLOWED_MIMES.includes(mimeType)) {
    return true;
  }

  // Algunos navegadores envían ZIP como application/octet-stream.
  // Solo lo aceptamos si el archivo realmente tiene extensión .zip.
  if (
    mimeType === "application/octet-stream" &&
    fileName
  ) {
    const lowerFileName = fileName.toLowerCase();

    return ALLOWED_EXTENSIONS.includes(
      lowerFileName.slice(
        lowerFileName.lastIndexOf(".")
      )
    );
  }

  return false;
}