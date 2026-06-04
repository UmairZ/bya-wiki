"use client";

import type { EventStageRow, TaskRow } from "@/lib/supabase/types";
import { AddTaskInline, TaskCard, type MemberSummary } from "./task-card";

/** Flat list of Drafts-stage tasks on a draft. No Kanban — drafts only have
 *  the one stage, and tasks here are always ad-hoc. */
export function DraftTaskList({
  draftId,
  draftsStage,
  allStages,
  tasks,
  members,
}: {
  draftId: string;
  draftsStage: EventStageRow;
  allStages: EventStageRow[];
  tasks: TaskRow[];
  members: MemberSummary[];
}) {
  const membersById = new Map(members.map((m) => [m.id, m]));
  const sorted = [...tasks].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-card p-3">
      <ul className="flex flex-col gap-1.5">
        {sorted.map((t) => (
          <li key={t.id}>
            <TaskCard
              task={t}
              stages={allStages}
              members={members}
              membersById={membersById}
              targetKind="draft"
              targetRef={draftId}
              hideMoveToStage
            />
          </li>
        ))}
      </ul>
      <AddTaskInline
        targetKind="draft"
        targetRef={draftId}
        stageId={draftsStage.id}
      />
    </div>
  );
}
