// Minimal Database type for the profiles table (Phase 1).
// Replace with Supabase-CLI–generated types (`supabase gen types typescript`)
// once we add more tables in Phase 2.

export type Role = "owner" | "editor";

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

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
