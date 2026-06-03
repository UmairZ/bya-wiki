import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { SetPasswordForm } from "./set-password-form";

export const metadata = { title: "Set a new password" };

export default async function SetPasswordPage() {
  const { profile } = await requireCurrentUser();
  if (!profile.must_change_password) {
    redirect("/events");
  }
  return <SetPasswordForm />;
}
