import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Delete your account",
  description:
    "Request deletion of your iKeen account and the data stored with it.",
};

const DELETE_MAIL = "techforgeastroteam@gmail.com";
const MAILTO = `mailto:${DELETE_MAIL}?subject=${encodeURIComponent("Delete my iKeen account")}&body=${encodeURIComponent("Account email:\nUsername:\n")}`;

export default function DeleteAccountPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">
        Delete your iKeen account
      </h1>
      <p className="mt-4 text-zinc-600 dark:text-zinc-400">
        This page is for the iKeen app, package{" "}
        <code className="font-mono text-sm">com.techforgelee.ikeen</code>. Use
        it to ask us to delete your account and the data we store for it.
      </p>

      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight">
          How to request deletion
        </h2>
        <ol className="mt-3 list-decimal space-y-3 pl-5 text-[15px] leading-7 text-zinc-600 dark:text-zinc-400">
          <li>
            Email{" "}
            <a className="underline" href={`mailto:${DELETE_MAIL}`}>
              {DELETE_MAIL}
            </a>{" "}
            from the email address on your iKeen account.
          </li>
          <li>
            Use the subject line{" "}
            <span className="font-medium text-foreground">
              Delete my iKeen account
            </span>
            .
          </li>
          <li>Include your account email and username, if you set one.</li>
        </ol>
        <a
          href={MAILTO}
          className="mt-6 inline-flex h-11 items-center rounded-full bg-foreground px-5 text-sm font-medium text-background"
        >
          Email a deletion request
        </a>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight">
          What we delete
        </h2>
        <div className="mt-3 space-y-3 text-[15px] leading-7 text-zinc-600 dark:text-zinc-400">
          <p>
            After we confirm the request comes from the account email, we
            delete the server account within 30 days. That includes your name,
            email, and password hash, synced notes and folders, and agent
            conversations and memories stored for that account.
          </p>
          <p>
            Notes that exist only on your phone stay there until you delete
            them or uninstall iKeen. We may keep brief security or abuse logs
            for a short time.
          </p>
        </div>
      </section>
    </main>
  );
}
