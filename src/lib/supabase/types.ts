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
// resources (files attached to a category)
// ---------------------------------------------------------------------------

export type ResourceRow = {
  id: string;
  category_id: string;
  title: string;
  description: string | null;
  storage_path: string;
  file_type: string;
  file_size: number;
  pinned: boolean;
  sort_order: number;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type ResourceInsert = {
  id?: string;
  category_id: string;
  title: string;
  description?: string | null;
  storage_path: string;
  file_type: string;
  file_size?: number;
  pinned?: boolean;
  sort_order?: number;
  uploaded_by?: string | null;
};

export type ResourceUpdate = {
  title?: string;
  description?: string | null;
  storage_path?: string;
  file_type?: string;
  file_size?: number;
  pinned?: boolean;
  sort_order?: number;
  deleted_at?: string | null;
};

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
// google_oauth_connection (singleton, id=1) — server-only via admin client
// ---------------------------------------------------------------------------

export type GoogleOAuthConnectionRow = {
  id: 1;
  refresh_token: string;
  access_token: string | null;
  access_token_expires_at: string | null;
  connected_email: string | null;
  calendar_id: string | null;
  calendar_name: string | null;
  connected_by: string | null;
  created_at: string;
  updated_at: string;
};

export type GoogleOAuthConnectionInsert = {
  id?: 1;
  refresh_token: string;
  access_token?: string | null;
  access_token_expires_at?: string | null;
  connected_email?: string | null;
  calendar_id?: string | null;
  calendar_name?: string | null;
  connected_by?: string | null;
};

export type GoogleOAuthConnectionUpdate = {
  refresh_token?: string;
  access_token?: string | null;
  access_token_expires_at?: string | null;
  connected_email?: string | null;
  calendar_id?: string | null;
  calendar_name?: string | null;
  connected_by?: string | null;
};

// ---------------------------------------------------------------------------
// event_stages (Phase 7a)
// ---------------------------------------------------------------------------

export type EventStageRow = {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type EventStageInsert = {
  id?: string;
  name: string;
  sort_order?: number;
};

export type EventStageUpdate = {
  name?: string;
  sort_order?: number;
};

// ---------------------------------------------------------------------------
// playbook_templates (Phase 7b)
// ---------------------------------------------------------------------------

export type PlaybookTemplateRow = {
  id: string;
  name: string;
  description: string;
  archived: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PlaybookTemplateInsert = {
  id?: string;
  name: string;
  description?: string;
  archived?: boolean;
  created_by?: string | null;
};

export type PlaybookTemplateUpdate = {
  name?: string;
  description?: string;
  archived?: boolean;
};

// ---------------------------------------------------------------------------
// playbook_template_tasks
// ---------------------------------------------------------------------------

export type AssigneeRole = "any" | "owner";

export type PlaybookTemplateTaskRow = {
  id: string;
  template_id: string;
  event_stage_id: string;
  title: string;
  description: string;
  sort_order: number;
  default_offset_days: number | null;
  default_assignee_role: AssigneeRole;
  created_at: string;
  updated_at: string;
};

export type PlaybookTemplateTaskInsert = {
  id?: string;
  template_id: string;
  event_stage_id: string;
  title: string;
  description?: string;
  sort_order?: number;
  default_offset_days?: number | null;
  default_assignee_role?: AssigneeRole;
};

export type PlaybookTemplateTaskUpdate = {
  event_stage_id?: string;
  title?: string;
  description?: string;
  sort_order?: number;
  default_offset_days?: number | null;
  default_assignee_role?: AssigneeRole;
};

// ---------------------------------------------------------------------------
// workflows
// ---------------------------------------------------------------------------

export type TargetKind =
  | "event"
  | "page"
  | "space"
  | "standalone"
  | "draft";

export type WorkflowRow = {
  id: string;
  template_id: string | null;
  name: string;
  target_kind: TargetKind;
  target_ref: string;
  starts_at: string | null;
  archived: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkflowInsert = {
  id?: string;
  template_id?: string | null;
  name: string;
  target_kind?: TargetKind;
  target_ref: string;
  starts_at?: string | null;
  archived?: boolean;
  created_by?: string | null;
};

export type WorkflowUpdate = {
  name?: string;
  starts_at?: string | null;
  archived?: boolean;
  target_kind?: TargetKind;
  target_ref?: string;
};

// ---------------------------------------------------------------------------
// tasks
// ---------------------------------------------------------------------------

export type TaskStatus = "todo" | "in_progress" | "done" | "skipped";

export type TaskRow = {
  id: string;
  workflow_id: string;
  event_stage_id: string;
  title: string;
  description: string;
  sort_order: number;
  status: TaskStatus;
  assigned_to: string | null;
  due_at: string | null;
  default_offset_days: number | null;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskInsert = {
  id?: string;
  workflow_id: string;
  event_stage_id: string;
  title: string;
  description?: string;
  sort_order?: number;
  status?: TaskStatus;
  assigned_to?: string | null;
  due_at?: string | null;
  default_offset_days?: number | null;
};

export type TaskUpdate = {
  event_stage_id?: string;
  title?: string;
  description?: string;
  sort_order?: number;
  status?: TaskStatus;
  assigned_to?: string | null;
  due_at?: string | null;
  default_offset_days?: number | null;
};

// ---------------------------------------------------------------------------
// draft_events (Phase 7e)
// ---------------------------------------------------------------------------

export type AudienceTag =
  | "Kids"
  | "Jr. Youth"
  | "Youth"
  | "Young Professionals"
  | "Family";

export type GenderTag = "Girls" | "Boys" | "Both";

export const AUDIENCE_VALUES: AudienceTag[] = [
  "Kids",
  "Jr. Youth",
  "Youth",
  "Young Professionals",
  "Family",
];

export const GENDER_VALUES: GenderTag[] = ["Girls", "Boys", "Both"];

export type DraftEventRow = {
  id: string;
  title: string;
  starts_at: string | null;
  ends_at: string | null;
  all_day: boolean;
  location: string | null;
  description: string;
  registration_url: string | null;
  audience: AudienceTag | null;
  gender: GenderTag | null;
  free_tags: string[];
  archived: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DraftEventInsert = {
  id?: string;
  title: string;
  starts_at?: string | null;
  ends_at?: string | null;
  all_day?: boolean;
  location?: string | null;
  description?: string;
  registration_url?: string | null;
  audience?: AudienceTag | null;
  gender?: GenderTag | null;
  free_tags?: string[];
  archived?: boolean;
  created_by?: string | null;
};

export type DraftEventUpdate = {
  title?: string;
  starts_at?: string | null;
  ends_at?: string | null;
  all_day?: boolean;
  location?: string | null;
  description?: string;
  registration_url?: string | null;
  audience?: AudienceTag | null;
  gender?: GenderTag | null;
  free_tags?: string[];
  archived?: boolean;
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
      resources: {
        Row: ResourceRow;
        Insert: ResourceInsert;
        Update: ResourceUpdate;
        Relationships: [];
      };
      app_settings: {
        Row: AppSettingsRow;
        Insert: AppSettingsRow;
        Update: AppSettingsUpdate;
        Relationships: [];
      };
      google_oauth_connection: {
        Row: GoogleOAuthConnectionRow;
        Insert: GoogleOAuthConnectionInsert;
        Update: GoogleOAuthConnectionUpdate;
        Relationships: [];
      };
      event_stages: {
        Row: EventStageRow;
        Insert: EventStageInsert;
        Update: EventStageUpdate;
        Relationships: [];
      };
      playbook_templates: {
        Row: PlaybookTemplateRow;
        Insert: PlaybookTemplateInsert;
        Update: PlaybookTemplateUpdate;
        Relationships: [];
      };
      playbook_template_tasks: {
        Row: PlaybookTemplateTaskRow;
        Insert: PlaybookTemplateTaskInsert;
        Update: PlaybookTemplateTaskUpdate;
        Relationships: [];
      };
      workflows: {
        Row: WorkflowRow;
        Insert: WorkflowInsert;
        Update: WorkflowUpdate;
        Relationships: [];
      };
      tasks: {
        Row: TaskRow;
        Insert: TaskInsert;
        Update: TaskUpdate;
        Relationships: [];
      };
      draft_events: {
        Row: DraftEventRow;
        Insert: DraftEventInsert;
        Update: DraftEventUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      search_wiki: {
        Args: { q: string };
        Returns: {
          kind: "page" | "file";
          id: string;
          title: string;
          snippet: string;
          category_id: string | null;
          category_name: string | null;
          category_slug: string | null;
          updated_at: string;
          file_type: string | null;
          rank: number;
        }[];
      };
      current_user_role: {
        Args: Record<string, never>;
        Returns: "owner" | "editor" | null;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
