// No auth gate — this route group is unauthenticated (gated out of proxy.ts).
// Pages here are designed for public visitors landing from bit.ly / socials.

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <main className="min-h-svh bg-background">{children}</main>;
}
