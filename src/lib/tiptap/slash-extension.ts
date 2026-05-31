import { Extension } from "@tiptap/core";
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import {
  filterCommands,
  type SlashCommand,
} from "./slash-commands";
import { SlashMenu, type SlashMenuRef } from "./slash-menu";

type SuggestionProps = {
  editor: import("@tiptap/core").Editor;
  range: import("@tiptap/core").Range;
  query: string;
  clientRect?: (() => DOMRect | null) | null;
};

export const SlashCommandExtension = Extension.create({
  name: "slashCommand",

  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      Suggestion<SlashCommand>({
        editor,
        char: "/",
        startOfLine: false,
        allowSpaces: false,
        items: ({ query, editor }) =>
          filterCommands(query, editor).slice(0, 12),
        command: ({ editor, range, props }) => {
          props.run(editor, range);
        },
        render: makeRenderer,
      } satisfies SuggestionOptions<SlashCommand>),
    ];
  },
});

function makeRenderer() {
  let renderer: ReactRenderer<SlashMenuRef> | null = null;
  let popup: HTMLDivElement | null = null;

  function positionPopup(rect: DOMRect | null) {
    if (!popup || !rect) return;
    // Position just below the caret. Clamp inside the viewport.
    const margin = 8;
    const top = Math.min(
      window.innerHeight - 280,
      Math.max(margin, rect.bottom + 6),
    );
    const left = Math.min(
      window.innerWidth - 280,
      Math.max(margin, rect.left),
    );
    popup.style.top = `${top}px`;
    popup.style.left = `${left}px`;
  }

  return {
    onStart(props: SuggestionProps & { items: SlashCommand[]; command: (item: SlashCommand) => void }) {
      renderer = new ReactRenderer(SlashMenu, {
        props: { items: props.items, command: props.command },
        editor: props.editor,
      });
      popup = document.createElement("div");
      popup.style.position = "fixed";
      popup.style.zIndex = "50";
      popup.appendChild(renderer.element);
      document.body.appendChild(popup);
      positionPopup(props.clientRect?.() ?? null);
    },
    onUpdate(props: SuggestionProps & { items: SlashCommand[]; command: (item: SlashCommand) => void }) {
      renderer?.updateProps({ items: props.items, command: props.command });
      positionPopup(props.clientRect?.() ?? null);
    },
    onKeyDown({ event }: { event: KeyboardEvent }) {
      if (event.key === "Escape") {
        renderer?.destroy();
        popup?.remove();
        renderer = null;
        popup = null;
        return true;
      }
      return renderer?.ref?.onKeyDown(event) ?? false;
    },
    onExit() {
      renderer?.destroy();
      popup?.remove();
      renderer = null;
      popup = null;
    },
  };
}
