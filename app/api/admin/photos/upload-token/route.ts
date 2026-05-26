import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { requireAdmin } from "@/shared/lib/auth-server";
import {
  ALLOWED_PHOTO_MIME_TYPES,
  MAX_PHOTO_BYTES,
} from "@/shared/lib/photo-storage";
import { isValidBlobKey } from "@/shared/lib/photo-storage/keys";

/**
 * Issues a short-lived presigned client token so the browser can upload
 * the photo straight to Vercel Blob — bypasses the 4.5 MB body cap that
 * applies to server actions/route handlers on Vercel.
 *
 * Flow:
 *   client computes `studio/<slotKind>/<slotId>-<stamp>.<ext>`
 *   client calls `upload(pathname, file, { handleUploadUrl: '/api/admin/photos/upload-token' })`
 *   @vercel/blob/client POSTs the pathname here → we auth-gate + cap + return a token
 *   client uses the token to PUT the file directly to Blob
 *   client then calls finalizeStudioPhotoUploadAction with the resulting URL
 */
export async function POST(request: Request): Promise<Response> {
  // Auth is enforced only when TELEGRAM_BOT_TOKEN is configured — mirrors
  // the server-action policy so local dev / CI without auth secrets still
  // works.
  const AUTH_REQUIRED = Boolean(process.env.TELEGRAM_BOT_TOKEN);
  if (AUTH_REQUIRED) {
    const gate = await requireAdmin();
    if (!gate.ok) {
      return Response.json(
        { error: gate.reason },
        { status: gate.reason === "unauthorized" ? 401 : 403 },
      );
    }
  }

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!isValidBlobKey(pathname)) {
          throw new Error(`pathname ${pathname} is not a valid studio key`);
        }
        return {
          allowedContentTypes: [...ALLOWED_PHOTO_MIME_TYPES],
          maximumSizeInBytes: MAX_PHOTO_BYTES,
          addRandomSuffix: false,
          allowOverwrite: true,
        };
      },
      onUploadCompleted: async () => {
        // The DB write happens via finalizeStudioPhotoUploadAction once
        // the client confirms the upload — keeps the flow working on
        // localhost where Vercel can't reach the dev server.
      },
    });
    return Response.json(json);
  } catch (error) {
    console.error("[upload-token] handleUpload failed", error);
    const message =
      error instanceof Error ? error.message : String(error ?? "unknown");
    return Response.json({ error: message }, { status: 400 });
  }
}
