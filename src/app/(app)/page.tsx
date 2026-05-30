import Image from "next/image";
import { APP_NAME, LOGO_ALT, LOGO_SRC } from "@/lib/brand";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Home" };

function EmptySection({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-2/3" />
        <p className="pt-2 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export default async function HomePage() {
  const { profile } = await requireCurrentUser();
  const firstName = profile.display_name.split(/\s+/)[0] || profile.display_name;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-6 md:px-8 md:py-10">
      <header className="flex items-center gap-4">
        <Image
          src={LOGO_SRC}
          alt={LOGO_ALT}
          width={56}
          height={56}
          priority
          className="rounded-full"
        />
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{APP_NAME}</p>
          <h1 className="truncate text-2xl font-semibold tracking-tight">
            Welcome, {firstName}.
          </h1>
        </div>
      </header>

      <section
        aria-label="Dashboard"
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
      >
        <EmptySection
          title="Pinned"
          description="Owner-pinned pages will appear here once the wiki has content (Phase 2)."
        />
        <EmptySection
          title="Recently updated"
          description="The most recently edited pages will show up here (Phase 2)."
        />
        <EmptySection
          title="Upcoming events"
          description="Next events from the calendar will surface here (Phase 5)."
        />
      </section>
    </div>
  );
}
