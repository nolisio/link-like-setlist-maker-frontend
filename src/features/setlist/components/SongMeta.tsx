"use client";

import type { Song } from "../types";

type SongMetaProps = {
  song: Song;
  accent?: "neutral" | "persona";
};

export function SongMeta({
  song,
  accent = "neutral",
}: SongMetaProps) {
  const toneClassName =
    accent === "persona"
      ? {
          chip: "border-black/20 bg-white/70 text-zinc-900",
          tag: "bg-black text-white",
        }
      : {
          chip: "border-zinc-200 text-zinc-700",
          tag: "bg-zinc-100 text-zinc-500",
        };

  return (
    <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
      <span
        className={`rounded border px-1.5 py-0.5 ${toneClassName.chip}`}
      >
        {song.series}
      </span>
      <span
        className={`rounded border px-1.5 py-0.5 ${toneClassName.chip}`}
      >
        {song.unit}
      </span>
      {song.tags.map((tag) => (
        <span
          key={tag}
          className={`rounded px-1.5 py-0.5 ${toneClassName.tag}`}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
