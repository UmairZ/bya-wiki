import { type LucideIcon } from "lucide-react";

export function ComingSoon({
  title,
  phase,
  description,
  Icon,
}: {
  title: string;
  phase: string;
  description: string;
  Icon: LucideIcon;
}) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-6 py-16 text-center md:py-24">
      <div className="flex size-14 items-center justify-center rounded-full bg-brand-tint text-brand-tint-foreground">
        <Icon className="size-7" aria-hidden />
      </div>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">
          Coming soon — {phase}.
        </p>
      </div>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
