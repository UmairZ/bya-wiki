"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import type { SlashCommand } from "./slash-commands";

export type SlashMenuRef = {
  onKeyDown: (event: KeyboardEvent) => boolean;
};

export type SlashMenuProps = {
  items: SlashCommand[];
  command: (item: SlashCommand) => void;
};

export const SlashMenu = forwardRef<SlashMenuRef, SlashMenuProps>(
  function SlashMenu({ items, command }, ref) {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    function pick(index: number) {
      const item = items[index];
      if (item) command(item);
    }

    useImperativeHandle(ref, () => ({
      onKeyDown: (event) => {
        if (items.length === 0) return false;
        if (event.key === "ArrowDown") {
          setSelectedIndex((prev) => (prev + 1) % items.length);
          return true;
        }
        if (event.key === "ArrowUp") {
          setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
          return true;
        }
        if (event.key === "Enter") {
          pick(selectedIndex);
          return true;
        }
        return false;
      },
    }));

    if (items.length === 0) {
      return (
        <div className="w-64 rounded-md border bg-popover p-3 text-sm text-muted-foreground shadow-md">
          No matches.
        </div>
      );
    }

    return (
      <ul
        role="listbox"
        className="flex max-h-72 w-64 flex-col gap-0.5 overflow-y-auto rounded-md border bg-popover p-1 shadow-md"
      >
        {items.map((item, index) => {
          const active = index === selectedIndex;
          return (
            <li key={item.key}>
              <button
                type="button"
                role="option"
                aria-selected={active}
                onMouseEnter={() => setSelectedIndex(index)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  command(item);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                  active
                    ? "bg-brand-tint text-brand-tint-foreground"
                    : "text-foreground hover:bg-muted",
                )}
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-md border bg-background",
                    active && "border-transparent",
                  )}
                >
                  <item.Icon className="size-3.5" aria-hidden />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{item.title}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {item.description}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    );
  },
);
