import type { Metadata } from "next";
import { BackButton } from "@/components/common/back-button";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-5 px-4 py-10 text-sm leading-relaxed text-foreground/90">
      <BackButton />
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Privacy</h1>
      <p>We keep as little as possible.</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <strong>Code you visualize</strong> is sent to an isolated sandbox to run and is not stored unless you press Share.
        </li>
        <li>
          <strong>Shared programs</strong> (code and input) are stored so the link works. Anyone with the link can view them. If you were signed in
          when sharing, you can delete them from My snippets.
        </li>
        <li>
          <strong>Accounts</strong> are optional and use GitHub or Google sign-in. We store your name, email and avatar from that provider, plus your
          accent color. We never see or store a password.
        </li>
        <li>
          <strong>Abuse protection</strong> uses a one-way hash of your IP address that expires within an hour. Raw IP addresses are not stored.
        </li>
        <li>
          <strong>Usage counts</strong> (for example, how many runs succeeded) contain no code, input, IP address or account, and are deleted after
          90 days.
        </li>
      </ul>
    </article>
  );
}
