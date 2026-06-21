"use client";

import type { LoveLiveSeries } from "../types";

type GroupOptionButtonProps = {
  group: LoveLiveSeries;
  selected?: boolean;
  disabled?: boolean;
  onSelect: (group: LoveLiveSeries) => void;
};

export function GroupOptionButton({
  group,
  selected = false,
  disabled = false,
  onSelect,
}: GroupOptionButtonProps) {
  const isDisabled = disabled || selected;
  const buttonClassName = [
    "relative h-16 overflow-hidden border-2 px-6 text-left text-xl font-black tracking-[0.08em] transition-all duration-200 ease-out [clip-path:polygon(3%_0,100%_0,97%_100%,0_100%)]",
    isDisabled
      ? "cursor-not-allowed border-zinc-300 text-zinc-400 opacity-70"
      : "group/option border-black text-zinc-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-200 active:translate-x-0 active:translate-y-1 motion-safe:hover:-translate-x-2 motion-safe:hover:-rotate-1 motion-safe:hover:scale-[1.02]",
    disabled
      ? "bg-zinc-100 shadow-none"
      : selected
        ? "bg-rose-600 text-white shadow-[10px_10px_0_#111]"
        : "bg-white shadow-[6px_6px_0_#111] hover:border-rose-600 hover:shadow-[10px_10px_0_#e11d48]",
  ].join(" ");

  return (
    <button
      type="button"
      aria-label={`${group}を選択`}
      aria-pressed={selected}
      className={buttonClassName}
      disabled={isDisabled}
      onClick={() => onSelect(group)}
    >
      <span
        className={
          disabled
            ? "absolute inset-0 skew-x-[-18deg] bg-transparent"
            : selected
              ? "absolute inset-0 skew-x-[-18deg] bg-rose-600"
            : "absolute inset-0 -translate-x-[105%] skew-x-[-18deg] bg-rose-600 transition-transform duration-300 ease-out group-hover/option:translate-x-0"
        }
      />
      <span
        className={
          disabled
            ? "absolute inset-y-0 left-0 w-2 bg-zinc-300"
            : selected
              ? "absolute inset-y-0 left-0 w-4 bg-black"
            : "absolute inset-y-0 left-0 w-2 bg-rose-600 transition-all duration-200 group-hover/option:w-4 group-hover/option:bg-black"
        }
      />
      <span
        className={
          disabled
            ? "absolute -right-7 top-0 h-full w-10 skew-x-[-18deg] bg-zinc-300"
            : selected
              ? "absolute -right-7 top-0 h-full w-10 -translate-x-4 skew-x-[-18deg] bg-black"
            : "absolute -right-7 top-0 h-full w-10 skew-x-[-18deg] bg-black transition-transform duration-300 ease-out group-hover/option:-translate-x-4"
        }
      />
      <span className="relative z-10 flex items-center justify-between">
        <span
          className={
            isDisabled
              ? ""
              : "transition-colors duration-200 group-hover/option:text-white"
          }
        >
          {group}
        </span>
        {isDisabled ? null : (
          <span
            aria-hidden="true"
            className={
              selected
                ? "translate-x-0 text-white opacity-100"
                : "translate-x-3 text-rose-600 opacity-0 transition-all duration-200 group-hover/option:translate-x-0 group-hover/option:text-white group-hover/option:opacity-100"
            }
          >
            &gt;
          </span>
        )}
      </span>
    </button>
  );
}
