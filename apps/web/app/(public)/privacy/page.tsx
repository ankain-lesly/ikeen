import type { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How iKeen collects, stores, and shares data on Android and iOS.",
};

const UPDATED = "2 October 2026";

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <p className="text-sm text-zinc-500">Last updated {UPDATED}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Privacy Policy
      </h1>
      <p className="mt-4 text-zinc-600 dark:text-zinc-400">
        This policy describes how iKeen (“the app”, package{" "}
        <code className="font-mono text-sm">com.techforgelee.ikeen</code>)
        handles information. The app is for people 13 and older. It is not
        directed at children under 13, and we do not knowingly collect data from
        them.
      </p>

      <Section title="Who we are">
        <p>
          iKeen is operated by the developer listed on the Google Play
          listing for this package. Contact us using the email on that listing
          (or the in-app account email you used to register) for privacy
          requests.
        </p>
      </Section>

      <Section title="What the app stores on your device">
        <p>
          Notes, folders, tags, pin and archive state, editor drafts, settings
          (theme, haptics, sort), recent searches, and onboarding status are
          stored locally in SQLite and device storage. Folder lock PINs and
          session tokens are stored in the device secure store when you use
          those features.
        </p>
        <p>
          You can use notes without creating an account. Data that never leaves
          the device is not sent to our servers unless you sign in and sync, or
          you use the AI agent on that content.
        </p>
      </Section>

      <Section title="Account">
        <p>
          If you register or sign in, we collect the name, email address, and
          password you submit. The password is stored as a hash on our API. We
          use this to authenticate you and to sync your workspace when that
          feature is enabled.
        </p>
      </Section>

      <Section title="Sync and our API">
        <p>
          When you are signed in, the app may send notes, folders, and related
          metadata to our API so your workspace can sync across devices. Pending
          changes may sit in a local outbox until they are uploaded. We also use
          a realtime service (Ably) to notify signed-in clients of updates. We
          do not sell this data.
        </p>
      </Section>

      <Section title="AI agent">
        <p>
          If you use the in-app agent, your prompts, conversation text, and any
          note content the agent reads or writes are sent to our API and then to
          the configured model provider (OpenRouter and/or OpenAI). Those
          providers process the text to generate replies and tool actions. Do
          not send secrets or data you are not willing to transmit to those
          services.
        </p>
      </Section>

      <Section title="What we do not collect">
        <p>
          The current app does not request access to your camera, microphone,
          contacts, precise location, or photo library. We do not show ads or
          use advertising trackers.
        </p>
      </Section>

      <Section title="How long we keep data">
        <p>
          On-device data stays until you delete the note, folder, or the app.
          Account and synced data stay until you delete your account or we
          delete it at your request, unless we must keep a record for security
          or legal reasons. Agent logs may be retained briefly for abuse
          prevention and debugging.
        </p>
      </Section>

      <Section title="Your choices">
        <p>
          You can delete notes and folders in the app, sign out, or uninstall
          the app to remove local storage. To delete a server account and synced
          copies, contact us using the Play Store listing email and include the
          account address. You can stop using the agent at any time.
        </p>
      </Section>

      <Section title="International processing">
        <p>
          Our API and model providers may process data on servers outside your
          country. By creating an account or using the agent, you understand
          that transfer.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          We may update this policy. The “Last updated” date at the top will
          change. Continued use of the app after an update means you accept the
          revised policy.
        </p>
      </Section>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-7 text-zinc-600 dark:text-zinc-400">
        {children}
      </div>
    </section>
  );
}
