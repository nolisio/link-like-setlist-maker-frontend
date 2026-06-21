const backendApiBaseUrl =
  process.env.BACKEND_API_BASE_URL ??
  process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL ??
  "http://127.0.0.1:3000";

export type SongPreviewResponse = {
  status: "found" | "not_found" | "unavailable";
  preview: {
    deezerTrackId?: number;
    coverUrl?: string | null;
    title: string;
    previewUrl: string;
  } | null;
};

export async function fetchSongPreview(songId: string, refresh = false) {
  const searchParams = new URLSearchParams();
  if (refresh) {
    searchParams.set("refresh", "true");
  }

  const query = searchParams.toString();

  return fetch(
    `${backendApiBaseUrl}/api/songs/${encodeURIComponent(songId)}/preview${query ? `?${query}` : ""}`,
    {
      cache: "no-store",
    },
  );
}
