"use client";

import { ReactNodeViewRenderer } from "@tiptap/react";
import { buildBaseExtensions } from "./extensions";
import { TabsBlock, TabPanelBlock } from "./blocks/tabs";
import { TabsView } from "./blocks/tabs-view";
import { CollapsibleBlock } from "./blocks/collapsible";
import { CollapsibleView } from "./blocks/collapsible-view";
import { CalloutBlock } from "./blocks/callout";
import { CalloutView } from "./blocks/callout-view";
import { ColumnsBlock, ColumnBlock } from "./blocks/columns";
import { ColumnsView } from "./blocks/columns-view";
import { StepsBlock, StepBlock } from "./blocks/steps";
import { StepsView } from "./blocks/steps-view";

// Custom block names whose schemas we extend with React NodeViews on the
// client. Server uses the bare schemas (renderHTML only) so React/JSX never
// gets pulled into the server bundle.
const BLOCK_NAMES = new Set([
  "tabs",
  "tabPanel",
  "collapsible",
  "callout",
  "columns",
  "column",
  "steps",
  "step",
]);

export function buildClientExtensions(opts?: { placeholder?: string }) {
  const base = buildBaseExtensions(opts).filter(
    (ext) => !BLOCK_NAMES.has(ext.name),
  );
  return [
    ...base,
    TabsBlock.extend({
      addNodeView() {
        return ReactNodeViewRenderer(TabsView);
      },
    }),
    TabPanelBlock,
    CollapsibleBlock.extend({
      addNodeView() {
        return ReactNodeViewRenderer(CollapsibleView);
      },
    }),
    CalloutBlock.extend({
      addNodeView() {
        return ReactNodeViewRenderer(CalloutView);
      },
    }),
    ColumnsBlock.extend({
      addNodeView() {
        return ReactNodeViewRenderer(ColumnsView);
      },
    }),
    ColumnBlock,
    StepsBlock.extend({
      addNodeView() {
        return ReactNodeViewRenderer(StepsView);
      },
    }),
    StepBlock,
  ];
}
