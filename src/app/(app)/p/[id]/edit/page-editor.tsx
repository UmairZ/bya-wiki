"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bold,
  Code,
  Eye,
  FileCheck,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Pin,
  PinOff,
  Quote,
  Strikethrough,
  Trash2,
  Underline as UnderlineIcon,
} from "lucide-react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/category-icon";
import { buildClientExtensions } from "@/lib/tiptap/extensions-client";
import { SlashCommandExtension } from "@/lib/tiptap/slash-extension";
import type { PageStatus, TiptapDoc } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import {
  savePageAction,
  setPagePinnedAction,
  setPageStatusAction,
  softDeletePageAction,
} from "./actions";

type EditorPage = {
  id: string;
  title: string;
  slug: string;
  content: TiptapDoc;
  status: PageStatus;
  pinned: boolean;
  updated_at: string;
  category_id: string;
};

type EditorCategory = {
  name: string;
  slug: string;
  icon: string | null;
};

type SaveState = "idle" | "saving" | "saved" | "error";

const SAVE_DEBOUNCE_MS = 750;

export function PageEditor({
  page,
  category,
}: {
  page: EditorPage;
  category: EditorCategory | null;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(page.title);
  const [status, setStatus] = useState<PageStatus>(page.status);
  const [pinned, setPinned] = useState(page.pinned);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState<string>(page.updated_at);
  const [statusPending, setStatusPending] = useState(false);
  const [pinPending, setPinPending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);

  // Refs hold the freshest values so the debounce flush always saves the
  // latest title + content, even if React state hasn't flushed yet.
  const titleRef = useRef(page.title);
  const contentRef = useRef<TiptapDoc>(page.content);
  const dirtyRef = useRef<{ title: boolean; content: boolean }>({
    title: false,
    content: false,
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    if (!dirtyRef.current.title && !dirtyRef.current.content) return;
    const patch: { title?: string; content?: TiptapDoc } = {};
    if (dirtyRef.current.title) patch.title = titleRef.current;
    if (dirtyRef.current.content) patch.content = contentRef.current;
    dirtyRef.current = { title: false, content: false };

    setSaveState("saving");
    const result = await savePageAction(page.id, patch);
    if (result.ok) {
      setSavedAt(result.updated_at);
      setSaveState("saved");
    } else {
      setSaveState("error");
      toast.error(result.error);
    }
  }, [page.id]);

  const scheduleSave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void flush();
    }, SAVE_DEBOUNCE_MS);
  }, [flush]);

  const extensions = useMemo(
    () => [...buildClientExtensions(), SlashCommandExtension],
    [],
  );

  const editor = useEditor({
    extensions,
    content: page.content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-neutral dark:prose-invert max-w-none focus:outline-none min-h-[40vh]",
      },
    },
    onUpdate: ({ editor }) => {
      contentRef.current = editor.getJSON() as TiptapDoc;
      dirtyRef.current.content = true;
      setSaveState("idle");
      scheduleSave();
    },
  });

  // Flush pending edits before unmount / tab close so nothing is lost.
  useEffect(() => {
    function flushNow() {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        void flush();
      }
    }
    window.addEventListener("beforeunload", flushNow);
    return () => {
      window.removeEventListener("beforeunload", flushNow);
      flushNow();
    };
  }, [flush]);

  async function handleToggleStatus() {
    const next: PageStatus = status === "published" ? "draft" : "published";
    setStatusPending(true);
    const result = await setPageStatusAction(page.id, next);
    setStatusPending(false);
    if (result.ok) {
      setStatus(next);
      toast.success(
        next === "published" ? "Page published." : "Page unpublished.",
      );
    } else {
      toast.error(result.error);
    }
  }

  async function handleTogglePinned() {
    const next = !pinned;
    setPinPending(true);
    const result = await setPagePinnedAction(page.id, next);
    setPinPending(false);
    if (result.ok) {
      setPinned(next);
      toast.success(next ? "Pinned to home." : "Unpinned.");
    } else {
      toast.error(result.error);
    }
  }

  async function handleDelete() {
    if (
      !window.confirm(
        `Move "${title || "this page"}" to trash? The owner can restore it from /admin/trash.`,
      )
    ) {
      return;
    }
    setDeletePending(true);
    const result = await softDeletePageAction(page.id);
    if (!result.ok) {
      setDeletePending(false);
      toast.error(result.error);
      return;
    }
    toast.success("Moved to trash.");
    router.push(result.categorySlug ? `/c/${result.categorySlug}` : "/");
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
      >
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>
        {category && (
          <>
            <span aria-hidden>/</span>
            <Link
              href={`/c/${category.slug}`}
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              <CategoryIcon name={category.icon} className="size-3.5" />
              {category.name}
            </Link>
          </>
        )}
        <span aria-hidden>/</span>
        <Link
          href={`/p/${page.id}`}
          className="inline-flex items-center gap-1 hover:text-foreground"
        >
          <Eye className="size-3.5" aria-hidden />
          View
        </Link>
      </nav>

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge
              variant={status === "published" ? "secondary" : "outline"}
              className="capitalize"
            >
              {status}
            </Badge>
            <SaveIndicator state={saveState} savedAt={savedAt} />
          </div>
          <div className="flex items-center gap-2">
            <Button
              render={<Link href={`/p/${page.id}`} />}
              nativeButton={false}
              variant="outline"
              size="sm"
            >
              <ArrowLeft className="size-4" aria-hidden />
              Back to view
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pinPending}
              onClick={handleTogglePinned}
              title={pinned ? "Unpin from home" : "Pin to home"}
              aria-pressed={pinned}
            >
              {pinned ? (
                <PinOff className="size-4" aria-hidden />
              ) : (
                <Pin className="size-4" aria-hidden />
              )}
              {pinned ? "Unpin" : "Pin"}
            </Button>
            <Button
              size="sm"
              variant={status === "published" ? "outline" : "default"}
              disabled={statusPending}
              onClick={handleToggleStatus}
            >
              <FileCheck className="size-4" aria-hidden />
              {status === "published" ? "Move to draft" : "Publish"}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              disabled={deletePending}
              onClick={handleDelete}
              title="Move to trash"
              aria-label="Move to trash"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </div>
        </div>

        <input
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            titleRef.current = e.target.value;
            dirtyRef.current.title = true;
            setSaveState("idle");
            scheduleSave();
          }}
          onBlur={() => {
            if (dirtyRef.current.title) void flush();
          }}
          placeholder="Untitled"
          aria-label="Page title"
          className="w-full bg-transparent text-3xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground/60 focus-visible:outline-none"
        />
      </header>

      <EditorToolbar editor={editor} />

      <EditorContent
        editor={editor}
        className="rounded-lg border bg-card px-4 py-3 transition-colors focus-within:border-primary/40"
      />
    </div>
  );
}

function SaveIndicator({
  state,
  savedAt,
}: {
  state: SaveState;
  savedAt: string;
}) {
  const label =
    state === "saving"
      ? "Saving…"
      : state === "error"
        ? "Save failed"
        : `Saved · ${new Date(savedAt).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          })}`;
  return (
    <span
      className={cn(
        "text-xs text-muted-foreground",
        state === "error" && "text-destructive",
      )}
    >
      {label}
    </span>
  );
}

type ToolButton = {
  label: string;
  Icon: typeof Bold;
  active?: (e: Editor) => boolean;
  run: (e: Editor) => void;
};

const TOOL_BUTTONS: ToolButton[] = [
  {
    label: "Heading 1",
    Icon: Heading1,
    active: (e) => e.isActive("heading", { level: 1 }),
    run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    label: "Heading 2",
    Icon: Heading2,
    active: (e) => e.isActive("heading", { level: 2 }),
    run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    label: "Heading 3",
    Icon: Heading3,
    active: (e) => e.isActive("heading", { level: 3 }),
    run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    label: "Bold",
    Icon: Bold,
    active: (e) => e.isActive("bold"),
    run: (e) => e.chain().focus().toggleBold().run(),
  },
  {
    label: "Italic",
    Icon: Italic,
    active: (e) => e.isActive("italic"),
    run: (e) => e.chain().focus().toggleItalic().run(),
  },
  {
    label: "Underline",
    Icon: UnderlineIcon,
    active: (e) => e.isActive("underline"),
    run: (e) => e.chain().focus().toggleUnderline().run(),
  },
  {
    label: "Strikethrough",
    Icon: Strikethrough,
    active: (e) => e.isActive("strike"),
    run: (e) => e.chain().focus().toggleStrike().run(),
  },
  {
    label: "Inline code",
    Icon: Code,
    active: (e) => e.isActive("code"),
    run: (e) => e.chain().focus().toggleCode().run(),
  },
  {
    label: "Bullet list",
    Icon: List,
    active: (e) => e.isActive("bulletList"),
    run: (e) => e.chain().focus().toggleBulletList().run(),
  },
  {
    label: "Numbered list",
    Icon: ListOrdered,
    active: (e) => e.isActive("orderedList"),
    run: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    label: "Task list",
    Icon: ListChecks,
    active: (e) => e.isActive("taskList"),
    run: (e) => e.chain().focus().toggleList("taskList", "taskItem").run(),
  },
  {
    label: "Quote",
    Icon: Quote,
    active: (e) => e.isActive("blockquote"),
    run: (e) => e.chain().focus().toggleBlockquote().run(),
  },
  {
    label: "Divider",
    Icon: Minus,
    run: (e) => e.chain().focus().setHorizontalRule().run(),
  },
  {
    label: "Link",
    Icon: LinkIcon,
    active: (e) => e.isActive("link"),
    run: (e) => {
      const previous = (e.getAttributes("link").href as string) ?? "";
      const href = window.prompt("URL", previous);
      if (href === null) return;
      if (href === "") {
        e.chain().focus().extendMarkRange("link").unsetLink().run();
        return;
      }
      e.chain().focus().extendMarkRange("link").setLink({ href }).run();
    },
  },
];

function EditorToolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;
  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="sticky top-12 z-10 flex flex-wrap items-center gap-0.5 rounded-md border bg-background/95 p-1 shadow-sm backdrop-blur"
    >
      {TOOL_BUTTONS.map(({ label, Icon, active, run }) => {
        const isOn = active ? active(editor) : false;
        return (
          <button
            key={label}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => run(editor)}
            aria-label={label}
            aria-pressed={isOn}
            title={label}
            className={cn(
              "flex size-8 items-center justify-center rounded-md transition-colors",
              isOn
                ? "bg-brand-tint text-brand-tint-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
