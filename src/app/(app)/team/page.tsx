import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireOwner } from "@/lib/auth/current-user";
import type { Profile } from "@/lib/auth/current-user";
import { CreateMemberButton } from "./_components/create-member-button";
import { MemberRow } from "./_components/member-row";

export const metadata = { title: "Team" };

export type Member = Profile & {
  email: string;
  last_sign_in_at: string | null;
};

async function loadMembers(): Promise<Member[]> {
  const admin = createSupabaseAdminClient();
  const [usersResp, profilesResp] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    admin.from("profiles").select(
      "id, display_name, avatar_url, role, must_change_password, active, created_at, updated_at",
    ),
  ]);

  const usersById = new Map(
    (usersResp.data?.users ?? []).map((u) => [u.id, u]),
  );

  const profiles = (profilesResp.data ?? []) as Profile[];
  const members: Member[] = profiles.map((p) => {
    const u = usersById.get(p.id);
    return {
      ...p,
      email: u?.email ?? "—",
      last_sign_in_at: u?.last_sign_in_at ?? null,
    };
  });

  members.sort((a, b) => {
    if (a.role !== b.role) return a.role === "owner" ? -1 : 1;
    return a.display_name.localeCompare(b.display_name);
  });

  return members;
}

export default async function TeamPage() {
  const current = await requireOwner();
  const members = await loadMembers();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
          <p className="text-sm text-muted-foreground">
            Owner-managed accounts. New members get a temp password shown once
            on creation — share it out-of-band.
          </p>
        </div>
        <CreateMemberButton />
      </header>

      <ul className="flex flex-col divide-y rounded-lg border bg-card">
        {members.map((member) => (
          <li key={member.id}>
            <MemberRow member={member} isSelf={member.id === current.userId} />
          </li>
        ))}
      </ul>
    </div>
  );
}
