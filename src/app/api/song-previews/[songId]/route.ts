import { NextResponse } from "next/server";
import { fetchSongPreview } from "../shared";

const deezerApiBaseUrl =
  process.env.DEEZER_API_BASE_URL ?? "https://api.deezer.com";

type DeezerTrackDetails = {
  album?: {
    cover_xl?: string | null;
    cover_big?: string | null;
    cover_medium?: string | null;
  } | null;
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ songId: string }> },
) {
  const { songId } = await params;
  const refresh = new URL(request.url).searchParams.get("refresh") === "true";

  try {
    const response = await fetchSongPreview(songId, refresh);

    const body = (await response.json()) as {
      preview?: {
        [key: string]: unknown;
        coverUrl?: string | null;
        deezerTrackId?: number;
      } | null;
    } & Record<string, unknown>;

    if (
      response.ok &&
      body.preview &&
      typeof body.preview.deezerTrackId === "number"
    ) {
      const deezerResponse = await fetch(
        `${deezerApiBaseUrl}/track/${body.preview.deezerTrackId}`,
        {
          cache: "no-store",
        },
      );

      if (deezerResponse.ok) {
        const deezerBody =
          (await deezerResponse.json()) as DeezerTrackDetails;
        const coverUrl =
          deezerBody.album?.cover_xl ??
          deezerBody.album?.cover_big ??
          deezerBody.album?.cover_medium ??
          null;

        body.preview = {
          ...body.preview,
          coverUrl,
        };
      }
    }

    return NextResponse.json(body, {
      status: response.status,
    });
  } catch {
    return NextResponse.json(
      {
        code: "BACKEND_UNAVAILABLE",
        message: "Preview backend is unavailable",
      },
      { status: 503 },
    );
  }
}
