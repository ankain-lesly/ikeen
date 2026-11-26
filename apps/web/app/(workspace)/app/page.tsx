import Link from "next/link";
import { UserMenu } from "@/components/auth/user-menu";

export default function WorkspaceEntryPage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
      <div className="flex items-center gap-3">
        <span className="size-2 rounded-full bg-primary" />
        <h1 className="text-xl font-heading font-semibold tracking-tight">
          iKeen Workspace
        </h1>
        <UserMenu />
      </div>
      <p className="text-sm text-muted-foreground max-w-md">
        Authenticated workspace shell initialized. Notes, folders, and scratchpad routes will be mounted here in Phase 3.
      </p>
      <Link
        href="/"
        className="text-xs text-primary hover:underline"
      >
        ← Return to public home
      </Link>
    </main>
  );
}
