import { FolderClosed } from "lucide-react";
import { ComingSoon } from "@/components/app-shell/coming-soon";

export const metadata = { title: "Files" };

export default function FilesPage() {
  return (
    <ComingSoon
      title="Files"
      phase="Phase 4"
      description="The shared resource library. Folders, uploads, image and PDF previews. Served by signed URLs from a private bucket."
      Icon={FolderClosed}
    />
  );
}
