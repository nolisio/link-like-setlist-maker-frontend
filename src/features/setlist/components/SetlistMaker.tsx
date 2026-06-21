"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { CUSTOM_EVENT_ID, LOVE_LIVE_SERIES } from "../data";
import { parsePredictionFromParams, serializePredictionToParams } from "../url";
import type { LoveLiveSeries, SetlistPrediction, Song } from "../types";
import { GroupOptionButton } from "./GroupOptionButton";
import { SetlistSlotRow } from "./SetlistSlotRow";
import { SongMeta } from "./SongMeta";
import { SongPickerOverlay } from "./SongPickerOverlay";
import { SongPreviewConfirmModal } from "./SongPreviewConfirmModal";

const allUnitsOption = "すべて";
const groupOptions: LoveLiveSeries[] = LOVE_LIVE_SERIES;
const enabledGroup: LoveLiveSeries = "蓮ノ空";
const groupPreviewSongIds: Partial<Record<LoveLiveSeries, string>> = {
  蓮ノ空: "dream-believers",
};

type WizardStep = "group" | "songs" | "event" | "review";

type SongPreviewResponse = {
  status: "found" | "not_found" | "unavailable";
  preview: {
    coverUrl?: string | null;
    deezerTrackId?: number;
    title: string;
  } | null;
};

type SongsResponse = {
  songs: Song[];
};

type CachedSongPreview = {
  coverUrl: string | null;
  status: SongPreviewResponse["status"];
  title: string;
};

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function isGroupSelectable(group: LoveLiveSeries) {
  return group === enabledGroup;
}

function createSharePath(prediction: SetlistPrediction) {
  const params = serializePredictionToParams(prediction);
  const query = params.toString();
  return query ? `/home?${query}` : "/home";
}

function subscribeToOrigin() {
  return () => undefined;
}

function getClientOrigin() {
  return window.location.origin;
}

function getServerOrigin() {
  return "";
}

function ScreenTitle({
  children,
  meta,
}: {
  children: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-zinc-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
      <h2 className="text-2xl font-semibold text-zinc-950">{children}</h2>
      {meta ? <div className="text-sm text-zinc-500">{meta}</div> : null}
    </div>
  );
}

export function SetlistMaker() {
  const searchParams = useSearchParams();
  const initialPrediction = parsePredictionFromParams(searchParams);
  const hasRestoredSongs = initialPrediction.songIds.length > 0;
  const initialSongIdsRef = useRef(initialPrediction.songIds);

  const [currentStep, setCurrentStep] = useState<WizardStep>(
    hasRestoredSongs ? "review" : "group",
  );
  const [songs, setSongs] = useState<Song[]>([]);
  const [songsError, setSongsError] = useState("");
  const [isSongsLoading, setIsSongsLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<LoveLiveSeries | null>(
    null,
  );
  const [pendingGroup, setPendingGroup] = useState<LoveLiveSeries | null>(null);
  const [selectedUnit, setSelectedUnit] = useState(allUnitsOption);
  const [keyword, setKeyword] = useState("");
  const [eventName, setEventName] = useState(initialPrediction.event.name);
  const [songIds, setSongIds] = useState(initialPrediction.songIds);
  const [encoreAfter, setEncoreAfter] = useState<number | null>(
    initialPrediction.encoreAfter,
  );
  const [isSongPickerOpen, setIsSongPickerOpen] = useState(false);
  const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);
  const [selectedPreviewSongId, setSelectedPreviewSongId] = useState<
    string | null
  >(null);
  const [previewBySongId, setPreviewBySongId] = useState<
    Record<string, CachedSongPreview>
  >({});
  const [previewLoadingSongId, setPreviewLoadingSongId] = useState<
    string | null
  >(null);
  const [shareStatus, setShareStatus] = useState("");
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const activePreviewSongIdRef = useRef<string | null>(null);
  const hoverPreviewRequestSongIdRef = useRef<string | null>(null);
  const origin = useSyncExternalStore(
    subscribeToOrigin,
    getClientOrigin,
    getServerOrigin,
  );
  const songMap = useMemo(
    () => new Map(songs.map((song) => [song.id, song])),
    [songs],
  );

  useEffect(() => {
    let isCancelled = false;

    async function loadSongs() {
      setIsSongsLoading(true);

      try {
        const response = await fetch("/api/songs", {
          cache: "no-store",
        });
        const payload = (await response.json()) as SongsResponse;

        if (!response.ok) {
          throw new Error("Songs request failed");
        }

        if (isCancelled) {
          return;
        }

        const availableSongIdSet = new Set(payload.songs.map((song) => song.id));
        const validInitialSongIds = initialSongIdsRef.current.filter(
          (songId) => availableSongIdSet.has(songId),
        );
        const initialSong = payload.songs.find(
          (song) => song.id === validInitialSongIds[0],
        );

        setSongs(payload.songs);
        setSongIds((current) =>
          current.filter((songId) => availableSongIdSet.has(songId)),
        );
        if (initialSong) {
          setSelectedGroup(initialSong.series);
          setPendingGroup(
            isGroupSelectable(initialSong.series) ? initialSong.series : null,
          );
        }
        setSongsError("");
      } catch {
        if (isCancelled) {
          return;
        }

        setSongs([]);
        setSongsError("楽曲情報を取得できません");
      } finally {
        if (!isCancelled) {
          setIsSongsLoading(false);
        }
      }
    }

    void loadSongs();

    return () => {
      isCancelled = true;
    };
  }, []);

  const selectedSongs = useMemo(
    () =>
      songIds
        .map((songId) => songMap.get(songId) ?? null)
        .filter((song): song is Song => Boolean(song)),
    [songIds, songMap],
  );

  const unitOptions = useMemo(() => {
    if (!selectedGroup) {
      return [allUnitsOption];
    }

    const units = songs.filter((song) => song.series === selectedGroup).map(
      (song) => song.unit,
    );

    return [allUnitsOption, ...Array.from(new Set(units))];
  }, [selectedGroup, songs]);

  const filteredSongs = useMemo(() => {
    if (!selectedGroup) {
      return [];
    }

    const query = normalizeText(keyword);

    return songs.filter((song) => {
      const matchesGroup = song.series === selectedGroup;
      const matchesUnit =
        selectedUnit === allUnitsOption || song.unit === selectedUnit;
      const haystack = normalizeText(
        `${song.title} ${song.series} ${song.unit} ${song.tags.join(" ")}`,
      );

      return (
        matchesGroup && matchesUnit && (!query || haystack.includes(query))
      );
    });
  }, [keyword, selectedGroup, selectedUnit, songs]);

  const setlistSlots = useMemo(
    () => [
      ...songIds.map((songId, index) => ({
        index,
        song: songMap.get(songId) ?? null,
      })),
      {
        index: songIds.length,
        song: null,
      },
    ],
    [songIds, songMap],
  );

  const prediction = useMemo<SetlistPrediction>(
    () => ({
      event: {
        id: CUSTOM_EVENT_ID,
        name: eventName.trim(),
      },
      songIds,
      encoreAfter,
    }),
    [encoreAfter, eventName, songIds],
  );

  const sharePath = createSharePath(prediction);
  const shareUrl = origin ? `${origin}${sharePath}` : sharePath;
  const canConfirmGroupSelection =
    pendingGroup !== null && isGroupSelectable(pendingGroup);
  const selectedPreviewSong = useMemo(
    () =>
      selectedPreviewSongId ? songMap.get(selectedPreviewSongId) ?? null : null,
    [selectedPreviewSongId, songMap],
  );
  const selectedPreview = selectedPreviewSongId
    ? previewBySongId[selectedPreviewSongId] ?? null
    : null;
  const isPreviewConfirmOpen = selectedPreviewSongId !== null;
  const isSelectedPreviewLoading =
    selectedPreviewSongId !== null && previewLoadingSongId === selectedPreviewSongId;

  async function requestSongPreview(
    songId: string,
    options?: { withLoadingState?: boolean },
  ) {
    if (options?.withLoadingState) {
      setPreviewLoadingSongId(songId);
    }

    try {
      const response = await fetch(
        `/api/song-previews/${encodeURIComponent(songId)}?refresh=true`,
        {
          cache: "no-store",
        },
      );
      const payload = (await response.json()) as SongPreviewResponse;
      const preview = payload.preview;
      const fallbackTitle = songMap.get(songId)?.title ?? "";
      const cachedPreview: CachedSongPreview = {
        coverUrl: preview?.coverUrl ?? null,
        status: payload.status,
        title: preview?.title ?? fallbackTitle,
      };

      setPreviewBySongId((current) => ({
        ...current,
        [songId]: cachedPreview,
      }));

      return {
        payload,
        preview,
        responseOk: response.ok,
      };
    } catch {
      const fallbackTitle = songMap.get(songId)?.title ?? "";

      setPreviewBySongId((current) => ({
        ...current,
        [songId]: {
          coverUrl: null,
          status: "unavailable",
          title: fallbackTitle,
        },
      }));

      return null;
    } finally {
      if (options?.withLoadingState) {
        setPreviewLoadingSongId((current) =>
          current === songId ? null : current,
        );
      }
    }
  }

  function openGroupSelection() {
    setPendingGroup(
      selectedGroup && isGroupSelectable(selectedGroup) ? selectedGroup : null,
    );
    setIsSongPickerOpen(false);
    setActiveSlotIndex(null);
    setSelectedPreviewSongId(null);
    setCurrentStep("group");
  }

  function chooseGroup(group: LoveLiveSeries) {
    if (!isGroupSelectable(group)) {
      return;
    }

    setSelectedGroup(group);
    setPendingGroup(group);
    setSelectedUnit(allUnitsOption);
    setKeyword("");
    setShareStatus("");
    setIsSongPickerOpen(false);
    setActiveSlotIndex(null);
    setSelectedPreviewSongId(null);
    setCurrentStep("songs");
  }

  async function playGroupPreview(group: LoveLiveSeries) {
    const songId = groupPreviewSongIds[group];
    const audio = previewAudioRef.current;

    if (!songId || !audio) {
      return;
    }

    try {
      const response = await fetch(
        `/api/song-previews/${encodeURIComponent(songId)}?refresh=true`,
        {
          cache: "no-store",
        },
      );

      const payload = (await response.json()) as SongPreviewResponse;
      const preview = payload.preview;

      if (!response.ok || payload.status !== "found" || !preview) {
        return;
      }

      audio.loop = true;
      audio.src = `/api/song-previews/${encodeURIComponent(songId)}/audio?refresh=true`;
      audio.currentTime = 0;
      await audio.play();
    } catch (error) {
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        return;
      }
    }
  }

  function handleGroupSelect(group: LoveLiveSeries) {
    if (!isGroupSelectable(group)) {
      return;
    }

    setPendingGroup(group);
    void playGroupPreview(group);
  }

  function stopPreviewAudio() {
    const audio = previewAudioRef.current;

    if (!audio) {
      return;
    }

    activePreviewSongIdRef.current = null;
    audio.pause();
    audio.currentTime = 0;
    audio.removeAttribute("src");
    audio.load();
  }

  async function playSongHoverPreview(songId: string) {
    const audio = previewAudioRef.current;

    if (!audio || activePreviewSongIdRef.current === songId) {
      return;
    }

    stopPreviewAudio();
    hoverPreviewRequestSongIdRef.current = songId;

    try {
      const result = await requestSongPreview(songId);
      const payload = result?.payload;
      const preview = result?.preview;

      if (
        hoverPreviewRequestSongIdRef.current !== songId ||
        !result?.responseOk ||
        !payload ||
        payload.status !== "found" ||
        !preview
      ) {
        return;
      }

      activePreviewSongIdRef.current = songId;
      audio.loop = false;
      audio.src = `/api/song-previews/${encodeURIComponent(songId)}/audio?refresh=true`;
      audio.currentTime = 0;
      await audio.play();
    } catch (error) {
      if (activePreviewSongIdRef.current === songId) {
        activePreviewSongIdRef.current = null;
      }

      if (error instanceof DOMException && error.name === "NotAllowedError") {
        return;
      }
    }
  }

  function stopSongHoverPreview(songId: string) {
    if (selectedPreviewSongId === songId) {
      return;
    }

    if (
      activePreviewSongIdRef.current !== songId &&
      hoverPreviewRequestSongIdRef.current !== songId
    ) {
      return;
    }

    hoverPreviewRequestSongIdRef.current = null;
    stopPreviewAudio();
  }

  function openSongPicker(slotIndex: number) {
    setActiveSlotIndex(slotIndex);
    setSelectedPreviewSongId(null);
    setIsSongPickerOpen(true);
  }

  function closeSongPicker() {
    hoverPreviewRequestSongIdRef.current = null;
    setSelectedPreviewSongId(null);
    stopPreviewAudio();
    setIsSongPickerOpen(false);
    setActiveSlotIndex(null);
  }

  function openSongPreviewConfirm(songId: string) {
    setSelectedPreviewSongId(songId);

    if (!previewBySongId[songId]) {
      void requestSongPreview(songId, { withLoadingState: true });
    }
  }

  function closeSongPreviewConfirm() {
    const previewSongId = selectedPreviewSongId;

    setSelectedPreviewSongId(null);

    if (
      previewSongId &&
      (activePreviewSongIdRef.current === previewSongId ||
        hoverPreviewRequestSongIdRef.current === previewSongId)
    ) {
      hoverPreviewRequestSongIdRef.current = null;
      stopPreviewAudio();
    }
  }

  function confirmSelectedPreviewSong() {
    if (!selectedPreviewSongId) {
      return;
    }

    assignSongToSlot(selectedPreviewSongId);
  }

  function assignSongToSlot(songId: string) {
    if (activeSlotIndex === null) {
      return;
    }

    setSongIds((current) => {
      if (activeSlotIndex >= current.length) {
        return [...current, songId];
      }

      const next = [...current];
      next[activeSlotIndex] = songId;
      return next;
    });
    setShareStatus("");
    closeSongPicker();
  }

  function removeSong(index: number) {
    setSongIds((current) =>
      current.filter((_, currentIndex) => currentIndex !== index),
    );
    setEncoreAfter((current) => {
      if (current === null) {
        return null;
      }
      if (current === index) {
        return null;
      }
      if (current > index) {
        return current - 1;
      }
      return current;
    });
    setShareStatus("");
  }

  function moveSong(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= songIds.length) {
      return;
    }

    setSongIds((current) => {
      const next = [...current];
      const target = next[index];
      next[index] = next[nextIndex];
      next[nextIndex] = target;
      return next;
    });
    setShareStatus("");
  }

  function clearSetlist() {
    setSongIds([]);
    setEncoreAfter(null);
    setShareStatus("");
    closeSongPicker();
  }

  function reflectUrl() {
    window.history.replaceState(null, "", sharePath);
    setShareStatus("URLを更新しました");
  }

  async function copyShareUrl() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareStatus("共有URLをコピーしました");
    } catch {
      window.prompt("共有URL", shareUrl);
      setShareStatus("共有URLを表示しました");
    }
  }

  return (
    <main
      className={
        currentStep === "group"
          ? "mx-auto flex min-h-svh w-full max-w-5xl flex-col items-center justify-center px-4 py-8 text-center text-zinc-700 sm:px-6 lg:px-8"
          : "mx-auto flex min-h-svh w-full max-w-5xl flex-col gap-5 px-4 py-5 text-left text-zinc-700 sm:px-6 lg:px-8"
      }
    >
      <header
        className={
          currentStep === "group" ? "w-full" : "border-b border-zinc-200 pb-5"
        }
      >
        <h1 className="flex justify-center">
          <Image
            src="/images/title.png"
            alt="LINK! LIKE! SETLIST MAKER!"
            width={1916}
            height={821}
            className="h-auto w-full max-w-[420px] sm:max-w-[520px]"
          />
        </h1>
      </header>

      {currentStep === "group" ? (
        <section className="w-full max-w-md bg-white">
          <h2 className="relative inline-block -rotate-1 text-left text-3xl font-black tracking-tight text-zinc-950 after:absolute after:-bottom-1 after:left-0 after:-z-10 after:h-3 after:w-full after:-skew-x-12 after:bg-rose-500 after:content-['']">
            グループを選択
          </h2>
          <div className="mt-6 flex flex-col gap-4">
            {groupOptions.map((group) => (
              <GroupOptionButton
                key={group}
                group={group}
                selected={pendingGroup === group}
                disabled={!isGroupSelectable(group)}
                onSelect={handleGroupSelect}
              />
            ))}
          </div>
          <button
            type="button"
            className="mt-6 h-14 w-full border-2 border-black bg-black px-6 text-lg font-black tracking-[0.16em] text-white shadow-[6px_6px_0_#e11d48] transition-all duration-200 ease-out [clip-path:polygon(3%_0,100%_0,97%_100%,0_100%)] hover:bg-rose-600 hover:shadow-[10px_10px_0_#111] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-200 active:translate-y-1 disabled:cursor-not-allowed disabled:border-zinc-300 disabled:bg-zinc-100 disabled:text-zinc-400 disabled:shadow-none"
            disabled={!canConfirmGroupSelection}
            onClick={() => {
              if (pendingGroup) {
                chooseGroup(pendingGroup);
              }
            }}
          >
            決定
          </button>
        </section>
      ) : null}
      <audio ref={previewAudioRef} className="hidden" preload="none" loop />

      {currentStep === "songs" ? (
        <>
          <section className="relative overflow-hidden border-4 border-black bg-white shadow-[14px_14px_0_#111]">
            <div className="absolute inset-x-0 top-0 h-4 bg-rose-600" />
            <div className="absolute left-[-48px] top-20 hidden h-40 w-24 -skew-y-12 bg-black sm:block" />
            <div className="absolute right-[-56px] top-0 hidden h-full w-28 skew-x-[-18deg] bg-black sm:block" />
            <div className="relative z-10 border-b-4 border-black bg-white px-4 pb-4 pt-7 sm:px-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] font-black tracking-[0.28em] text-rose-600">
                    SETLIST COMMAND
                  </p>
                  <h2 className="mt-1 text-3xl font-black uppercase tracking-[0.06em] text-zinc-950 sm:text-5xl">
                    Song Select
                  </h2>
                  <p className="mt-3 text-sm font-bold tracking-[0.16em] text-zinc-500">
                    {selectedGroup} / SLOT INPUT
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="h-11 border-2 border-black bg-white px-4 text-sm font-black tracking-[0.18em] text-zinc-950 shadow-[5px_5px_0_#111] transition hover:bg-zinc-100"
                    onClick={openGroupSelection}
                  >
                    GROUP
                  </button>
                  <button
                    type="button"
                    className="h-11 border-2 border-black bg-black px-4 text-sm font-black tracking-[0.18em] text-white shadow-[5px_5px_0_#e11d48] transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:border-zinc-300 disabled:bg-zinc-100 disabled:text-zinc-400 disabled:shadow-none"
                    disabled={selectedSongs.length === 0}
                    onClick={() => setCurrentStep("event")}
                  >
                    EVENT
                  </button>
                </div>
              </div>
            </div>

            <div className="relative z-10 bg-zinc-100 px-4 py-5 sm:px-8 sm:py-8">
              <div className="mx-auto max-w-3xl">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black tracking-[0.24em] text-zinc-500">
                      ACTIVE LIST
                    </p>
                    <p className="mt-1 text-lg font-black tracking-[0.05em] text-zinc-950">
                      現在 {selectedSongs.length} 曲
                    </p>
                  </div>
                  <button
                    type="button"
                    className="h-10 border-2 border-black bg-white px-3 text-xs font-black tracking-[0.18em] text-zinc-950 shadow-[4px_4px_0_#111] transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:border-zinc-300 disabled:bg-zinc-100 disabled:text-zinc-400 disabled:shadow-none"
                    disabled={songIds.length === 0}
                    onClick={clearSetlist}
                  >
                    CLEAR
                  </button>
                </div>

                <div className="space-y-4">
                  {setlistSlots.map((slot) => (
                    <SetlistSlotRow
                      key={`slot-${slot.index}-${slot.song?.id ?? "empty"}`}
                      index={slot.index}
                      song={slot.song}
                      canMoveDown={slot.index < selectedSongs.length - 1}
                      canMoveUp={slot.index > 0 && slot.song !== null}
                      onMoveDown={
                        slot.song === null
                          ? undefined
                          : () => moveSong(slot.index, 1)
                      }
                      onMoveUp={
                        slot.song === null
                          ? undefined
                          : () => moveSong(slot.index, -1)
                      }
                      onOpen={() => openSongPicker(slot.index)}
                      onRemove={
                        slot.song === null
                          ? undefined
                          : () => removeSong(slot.index)
                      }
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>

          <SongPickerOverlay
            activeSlotIndex={activeSlotIndex}
            errorMessage={songsError}
            isLoading={isSongsLoading}
            isOpen={isSongPickerOpen}
            keyword={keyword}
            onClose={closeSongPicker}
            onOpenSongConfirm={openSongPreviewConfirm}
            onHoverSongEnd={stopSongHoverPreview}
            onHoverSongStart={playSongHoverPreview}
            onKeywordChange={setKeyword}
            onUnitChange={setSelectedUnit}
            selectedUnit={selectedUnit}
            songs={filteredSongs}
            unitOptions={unitOptions}
          />
          <SongPreviewConfirmModal
            coverUrl={selectedPreview?.coverUrl ?? null}
            isLoading={isSelectedPreviewLoading}
            isOpen={isPreviewConfirmOpen}
            onBack={closeSongPreviewConfirm}
            onConfirm={confirmSelectedPreviewSong}
            song={selectedPreviewSong}
            title={selectedPreview?.title ?? selectedPreviewSong?.title ?? ""}
          />
        </>
      ) : null}

      {currentStep === "event" ? (
        <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
          <ScreenTitle>イベント名</ScreenTitle>
          <label className="mt-5 grid gap-1.5 text-sm font-medium text-zinc-700">
            対象イベント名（任意）
            <input
              className="h-11 rounded border border-zinc-300 px-3 text-sm text-zinc-950 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
              value={eventName}
              onChange={(event) => {
                setEventName(event.target.value);
                setShareStatus("");
              }}
              placeholder="例: 次の合同ライブ予想"
            />
          </label>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <button
              type="button"
              className="h-10 rounded border border-zinc-300 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              onClick={() => setCurrentStep("songs")}
            >
              曲選択へ戻る
            </button>
            <button
              type="button"
              className="h-10 rounded bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
              onClick={() => setCurrentStep("review")}
            >
              セットリスト確認へ
            </button>
          </div>
        </section>
      ) : null}

      {currentStep === "review" ? (
        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)]">
          <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
            <ScreenTitle
              meta={
                <button
                  type="button"
                  className="h-9 rounded border border-zinc-300 px-3 font-medium text-zinc-700 transition hover:bg-zinc-50"
                  onClick={() => setCurrentStep("songs")}
                >
                  曲選択へ戻る
                </button>
              }
            >
              予想セットリスト
            </ScreenTitle>

            <label className="mt-4 grid gap-1.5 text-sm font-medium text-zinc-700">
              アンコール区切り
              <select
                className="h-11 rounded border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                value={encoreAfter ?? "none"}
                onChange={(event) => {
                  const value = event.target.value;
                  setEncoreAfter(value === "none" ? null : Number(value));
                  setShareStatus("");
                }}
              >
                <option value="none">なし</option>
                {selectedSongs.map((song, index) => (
                  <option key={`${song.id}-${index}`} value={index}>
                    {index + 1}. {song.title} の後
                  </option>
                ))}
              </select>
            </label>

            <ol className="mt-4 space-y-2">
              {selectedSongs.length === 0 ? (
                <li className="rounded border border-dashed border-zinc-300 bg-zinc-50 p-5 text-center text-sm text-zinc-500">
                  曲を追加してください
                </li>
              ) : (
                selectedSongs.map((song, index) => (
                  <li key={`${song.id}-${index}`}>
                    <div className="rounded border border-zinc-200 bg-white p-3">
                      <div className="flex items-start gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-rose-50 text-sm font-semibold text-rose-700">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-zinc-950">
                            {song.title}
                          </p>
                          <SongMeta song={song} />
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          className="h-9 rounded border border-zinc-300 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-300"
                          disabled={index === 0}
                          onClick={() => moveSong(index, -1)}
                        >
                          上へ
                        </button>
                        <button
                          type="button"
                          className="h-9 rounded border border-zinc-300 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-300"
                          disabled={index === selectedSongs.length - 1}
                          onClick={() => moveSong(index, 1)}
                        >
                          下へ
                        </button>
                        <button
                          type="button"
                          className="h-9 rounded border border-rose-200 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
                          onClick={() => removeSong(index)}
                        >
                          削除
                        </button>
                      </div>
                    </div>
                    {encoreAfter === index ? (
                      <div className="my-2 flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-amber-700">
                        <span className="h-px flex-1 bg-amber-200" />
                        ENCORE
                        <span className="h-px flex-1 bg-amber-200" />
                      </div>
                    ) : null}
                  </li>
                ))
              )}
            </ol>
          </section>

          <aside className="space-y-5">
            <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-950">情報</h2>
              <dl className="mt-4 grid gap-3 text-sm">
                <div>
                  <dt className="text-zinc-500">グループ</dt>
                  <dd className="mt-1 font-semibold text-zinc-950">
                    {selectedGroup ?? "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">イベント名</dt>
                  <dd className="mt-1 font-semibold text-zinc-950">
                    {eventName.trim() || "未設定"}
                  </dd>
                </div>
              </dl>
              <div className="mt-4 grid gap-2">
                <button
                  type="button"
                  className="h-10 rounded border border-zinc-300 px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                  onClick={() => setCurrentStep("event")}
                >
                  イベント名を編集
                </button>
                <button
                  type="button"
                  className="h-10 rounded border border-zinc-300 px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-300"
                  disabled={songIds.length === 0}
                  onClick={clearSetlist}
                >
                  全消去
                </button>
              </div>
            </section>

            <section className="rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-950">共有</h2>
              <div className="mt-4 grid gap-3">
                <input
                  className="h-11 rounded border border-zinc-300 bg-zinc-50 px-3 text-sm text-zinc-700"
                  value={shareUrl}
                  readOnly
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    className="h-10 rounded bg-zinc-950 px-3 text-sm font-medium text-white transition hover:bg-zinc-800"
                    onClick={copyShareUrl}
                  >
                    URLをコピー
                  </button>
                  <button
                    type="button"
                    className="h-10 rounded border border-zinc-300 px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                    onClick={reflectUrl}
                  >
                    URLに反映
                  </button>
                </div>
                {shareStatus ? (
                  <p className="text-sm font-medium text-teal-700">
                    {shareStatus}
                  </p>
                ) : null}
              </div>
            </section>
          </aside>
        </section>
      ) : null}
    </main>
  );
}
