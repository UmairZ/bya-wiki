"use client";

import { useEffect } from "react";

/**
 * Mounted once on the page-view route. For every server-rendered tabs
 * container, builds a tab bar and wires click handlers that flip the
 * container's data-active-panel attribute. The CSS in globals.css handles
 * panel visibility based on that attribute.
 */
export function InteractiveTabs() {
  useEffect(() => {
    const containers = document.querySelectorAll<HTMLElement>(
      '[data-block="tabs"]:not([data-enhanced])',
    );

    containers.forEach((container) => {
      const panels = Array.from(
        container.querySelectorAll<HTMLElement>(
          ':scope > section[data-block="tab-panel"]',
        ),
      );
      if (panels.length === 0) return;

      const initialFromAttr = parseInt(
        container.dataset.activePanel ?? "0",
        10,
      );
      const initial = Math.max(
        0,
        Math.min(Number.isFinite(initialFromAttr) ? initialFromAttr : 0, panels.length - 1),
      );

      const bar = document.createElement("div");
      bar.className =
        "flex items-center gap-1 overflow-x-auto border-b px-2 py-1.5";
      bar.setAttribute("role", "tablist");

      const buttons = panels.map((panel, i) => {
        const title = panel.dataset.title ?? `Tab ${i + 1}`;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.role = "tab";
        btn.textContent = title;
        btn.dataset.tabIndex = String(i);
        btn.addEventListener("click", () => activate(i));
        bar.appendChild(btn);
        return btn;
      });

      function activate(index: number) {
        container.dataset.activePanel = String(index);
        buttons.forEach((b, i) => {
          const on = i === index;
          b.setAttribute("aria-pressed", String(on));
          b.className = on
            ? "shrink-0 rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap transition-colors bg-[var(--brand-tint)] text-[var(--brand-tint-foreground)]"
            : "shrink-0 rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap transition-colors text-muted-foreground hover:bg-muted hover:text-foreground";
        });
      }

      container.insertBefore(bar, container.firstChild);
      activate(initial);
      container.dataset.enhanced = "true";
    });
  }, []);

  return null;
}
