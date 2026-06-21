import { NextResponse } from "next/server";

const backendApiBaseUrl =
  process.env.BACKEND_API_BASE_URL ??
  process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL ??
  "http://127.0.0.1:3000";

const unitDisplayNames: Record<string, string> = {
  "cerise-bouquet": "スリーズブーケ",
  collaboration: "コラボレーション",
  dollchestra: "DOLLCHESTRA",
  "edel-note": "Edel Note",
  hasunosora: "蓮ノ空女学院スクールアイドルクラブ",
  "hasu-no-kyuujitsu": "はすの休日",
  "kahomegu-gelato": "かほめぐじぇらーと",
  "mira-cra-park": "みらくらぱーく！",
  "prince-epsilon": "PRINCE epsilon",
  "ruri-and-to": "Ruri&To",
  "rurino-to-yukai-na-tsuzuri-tachi": "瑠璃乃と愉快なつづりたち",
  solo: "ソロ",
};

type BackendSong = {
  id: string;
  title: string;
  titleJa: string | null;
  unitId: string;
  sortOrder: number;
  releaseDate: string | null;
  unit: {
    id: string;
    name: string;
    sortOrder: number;
  };
};

type BackendSongsResponse = {
  songs: BackendSong[];
};

export async function GET() {
  try {
    const response = await fetch(`${backendApiBaseUrl}/api/songs`, {
      cache: "no-store",
    });

    const body = (await response.json()) as BackendSongsResponse | unknown;

    if (!response.ok) {
      return NextResponse.json(body, { status: response.status });
    }

    const songs = (body as BackendSongsResponse).songs.map((song) => ({
      id: song.id,
      releaseDate: song.releaseDate,
      series: "蓮ノ空" as const,
      sortOrder: song.sortOrder,
      tags: [],
      title: song.titleJa?.trim() || song.title,
      titleJa: song.titleJa,
      unit:
        unitDisplayNames[song.unitId] ??
        song.unit.name,
      unitId: song.unitId,
    }));

    return NextResponse.json({ songs }, { status: 200 });
  } catch {
    return NextResponse.json(
      {
        code: "BACKEND_UNAVAILABLE",
        message: "Songs backend is unavailable",
      },
      { status: 503 },
    );
  }
}
