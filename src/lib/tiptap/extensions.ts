import { StarterKit } from "@tiptap/starter-kit";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { Placeholder } from "@tiptap/extensions";

/**
 * Editor extensions shared between the client editor (/p/[id]/edit) and the
 * server HTML renderer (/p/[id] via @tiptap/html). Slash-menu suggestion is
 * added on the client only and is NOT part of this list.
 */
export function buildBaseExtensions(opts?: { placeholder?: string }) {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: {
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          class: "text-primary underline-offset-4 hover:underline",
          rel: "noopener noreferrer",
          target: "_blank",
        },
      },
      codeBlock: {
        HTMLAttributes: {
          class:
            "rounded-md bg-muted p-3 font-mono text-sm overflow-x-auto whitespace-pre",
        },
      },
    }),
    TaskList.configure({
      HTMLAttributes: { class: "not-prose flex flex-col gap-1" },
    }),
    TaskItem.configure({
      nested: true,
      HTMLAttributes: {
        class:
          "flex items-start gap-2 [&>label]:flex [&>label]:items-center [&>label>input]:size-4 [&>div]:flex-1",
      },
    }),
    Placeholder.configure({
      placeholder:
        opts?.placeholder ?? "Type something, or press / for commands…",
      emptyEditorClass:
        "before:content-[attr(data-placeholder)] before:text-muted-foreground before:float-left before:h-0 before:pointer-events-none",
    }),
  ];
}
