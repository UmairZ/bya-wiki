import { mergeAttributes, Node } from "@tiptap/core";

const STEPS_CONTAINER_CLASS =
  "not-prose my-4 flex flex-col gap-3 [counter-reset:bya-step]";

// Each step renders as a 2-column grid: ::before (the number badge) goes in
// the first track, NodeViewContent in the second.
const STEP_CLASS =
  "grid grid-cols-[2rem_1fr] items-start gap-3 [counter-increment:bya-step] " +
  "before:content-[counter(bya-step)] before:flex before:size-8 before:items-center before:justify-center " +
  "before:rounded-full before:bg-brand-tint before:text-brand-tint-foreground before:font-semibold before:text-sm " +
  "before:row-start-1 before:col-start-1 [&>*]:col-start-2";

export { STEPS_CONTAINER_CLASS, STEP_CLASS };

export const StepsBlock = Node.create({
  name: "steps",
  group: "block",
  content: "step+",
  defining: true,
  isolating: true,

  parseHTML() {
    return [{ tag: 'div[data-block="steps"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-block": "steps",
        class: STEPS_CONTAINER_CLASS,
      }),
      0,
    ];
  },
});

export const StepBlock = Node.create({
  name: "step",
  content: "block+",
  defining: true,
  isolating: true,

  parseHTML() {
    return [{ tag: 'div[data-block="step"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-block": "step",
        class: STEP_CLASS,
      }),
      0,
    ];
  },
});
