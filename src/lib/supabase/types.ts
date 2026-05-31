// Minimal Database type covering the tables we've shipped.
// Replace with Supabase-CLI–generated types once the schema settles.

export type Role = "owner" | "editor";
export type PageStatus = "draft" | "published";

// ---------------------------------------------------------------------------
// profiles
// ---------------------------------------------------------------------------

export type ProfileRow = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  role: Role;
  must_change_password: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProfileInsert = {
  id: string;
  display_name: string;
  avatar_url?: string | null;
  role?: Role;
  must_change_password?: boolean;
  active?: boolean;
};

export type ProfileUpdate = {
  display_name?: string;
  avatar_url?: string | null;
  role?: Role;
  must_change_password?: boolean;
  active?: boolean;
};

// ---------------------------------------------------------------------------
// categories
// ---------------------------------------------------------------------------

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type CategoryInsert = {
  id?: string;
  name: string;
  slug: string;
  icon?: string | null;
  sort_order?: number;
};

export type CategoryUpdate = {
  name?: string;
  slug?: string;
  icon?: string | null;
  sort_order?: number;
};

// ---------------------------------------------------------------------------
// pages
// ---------------------------------------------------------------------------

// Tiptap document JSON shape. Compatible with @tiptap/core JSONContent without
// importing Tiptap into server-side modules.
export type TiptapNode = {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  text?: string;
};

export type TiptapDoc = {
  type: "doc";
  content?: TiptapNode[];
};

export type PageRow = {
  id: string;
  category_id: string;
  parent_id: string | null;
  title: string;
  slug: string;
  icon: string | null;
  cover_url: string | null;
  content: TiptapDoc;
  excerpt: string;
  status: PageStatus;
  pinned: boolean;
  sort_order: number;
  created_by: string | null;
  updated_by: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PageInsert = {
  id?: string;
  category_id: string;
  parent_id?: string | null;
  title?: string;
  slug: string;
  icon?: string | null;
  cover_url?: string | null;
  content?: TiptapDoc;
  excerpt?: string;
  status?: PageStatus;
  pinned?: boolean;
  sort_order?: number;
  created_by?: string | null;
  updated_by?: string | null;
};

export type PageUpdate = {
  category_id?: string;
  parent_id?: string | null;
  title?: string;
  slug?: string;
  icon?: string | null;
  cover_url?: string | null;
  content?: TiptapDoc;
  excerpt?: string;
  status?: PageStatus;
  pinned?: boolean;
  sort_order?: number;
  updated_by?: string | null;
  deleted_at?: string | null;
};

// ---------------------------------------------------------------------------
// tags + page_tags
// ---------------------------------------------------------------------------

export type TagRow = {
  id: string;
  name: string;
  color: string | null;
  created_at: string;
};

export type TagInsert = {
  id?: string;
  name: string;
  color?: string | null;
};

export type TagUpdate = {
  name?: string;
  color?: string | null;
};

export type PageTagRow = {
  page_id: string;
  tag_id: string;
};

export type PageTagInsert = PageTagRow;
export type PageTagUpdate = Partial<PageTagRow>;

// ---------------------------------------------------------------------------
// app_settings (singleton, id=1)
// ---------------------------------------------------------------------------

export type AppSettingsRow = {
  id: 1;
  google_calendar_ics_url: string | null;
  updated_at: string;
  updated_by: string | null;
};

export type AppSettingsUpdate = {
  google_calendar_ics_url?: string | null;
  updated_by?: string | null;
};

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
        Relationships: [];
      };
      categories: {
        Row: CategoryRow;
        Insert: CategoryInsert;
        Update: CategoryUpdate;
        Relationships: [];
      };
      pages: {
        Row: PageRow;
        Insert: PageInsert;
        Update: PageUpdate;
        Relationships: [];
      };
      tags: {
        Row: TagRow;
        Insert: TagInsert;
        Update: TagUpdate;
        Relationships: [];
      };
      page_tags: {
        Row: PageTagRow;
        Insert: PageTagInsert;
        Update: PageTagUpdate;
        Relationships: [];
      };
      app_settings: {
        Row: AppSettingsRow;
        Insert: AppSettingsRow;
        Update: AppSettingsUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
