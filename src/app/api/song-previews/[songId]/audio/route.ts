import { fetchSongPreview, type SongPreviewResponse } from "../../shared";

function pickHeader(headers: Headers, name: string) {
  const value = headers.get(name);
  return value === null ? undefined : value;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ songId: string }> },
) {
  const { songId } = await params;
  const refresh = new URL(request.url).searchParams.get("refresh") !== "false";

  try {
    const previewResponse = await fetchSongPreview(songId, refresh);
    const previewPayload =
      (await previewResponse.json()) as SongPreviewResponse;
    const previewUrl = previewPayload.preview?.previewUrl;

    if (
      !previewResponse.ok ||
      previewPayload.status !== "found" ||
      !previewUrl
    ) {
      return Response.json(
        {
          code: "PREVIEW_NOT_AVAILABLE",
          message: "Preview audio is unavailable",
        },
        { status: previewResponse.status || 404 },
      );
    }

    const upstreamResponse = await fetch(previewUrl, {
      headers: {
        ...(pickHeader(request.headers, "range")
          ? { range: pickHeader(request.headers, "range")! }
          : {}),
      },
      cache: "no-store",
    });

    if (!upstreamResponse.ok || !upstreamResponse.body) {
      return Response.json(
        {
          code: "AUDIO_PROXY_FAILED",
          message: "Failed to proxy preview audio",
        },
        { status: 502 },
      );
    }

    const responseHeaders = new Headers({
      "cache-control": "no-store",
      "content-type":
        upstreamResponse.headers.get("content-type") ?? "audio/mpeg",
      "accept-ranges":
        upstreamResponse.headers.get("accept-ranges") ?? "bytes",
    });

    const contentLength = upstreamResponse.headers.get("content-length");
    if (contentLength) {
      responseHeaders.set("content-length", contentLength);
    }

    const contentRange = upstreamResponse.headers.get("content-range");
    if (contentRange) {
      responseHeaders.set("content-range", contentRange);
    }

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    });
  } catch {
    return Response.json(
      {
        code: "BACKEND_UNAVAILABLE",
        message: "Preview backend is unavailable",
      },
      { status: 503 },
    );
  }
}
