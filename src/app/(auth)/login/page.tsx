import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

type SearchParams = Promise<{ next?: string; error?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const initialError =
    params.error === "deactivated"
      ? "Your account has been deactivated. Contact the owner."
      : undefined;
  return <LoginForm next={params.next ?? ""} initialError={initialError} />;
}
