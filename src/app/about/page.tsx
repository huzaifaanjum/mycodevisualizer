import { ExternalLinkIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CREATOR, LIMITS, SITE } from "@/shared/constants";
import { BackButton } from "@/components/common/back-button";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "About" };

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-6 px-4 py-10 text-sm leading-relaxed text-foreground/90">
      <BackButton />
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">About mycodevisualizer</h1>
      <p>
        mycodevisualizer is a free, open tool that helps students see what a computer does when it runs their code. It runs your Java program,
        records every line it executes, and lets you replay that recording one step at a time.
      </p>
      <h2 className="text-lg font-semibold text-foreground">How it works</h2>
      <ol className="list-decimal space-y-2 pl-5">
        <li>Your code is sent to a fresh, isolated sandbox that has no internet access and is deleted after the run.</li>
        <li>Java compiles it with debug information, then a debugger steps through it line by line.</li>
        <li>At each line we record the call stack, every variable, arrays and objects in memory, input read and output printed.</li>
        <li>Your browser replays that recording, with a plain-English note for each step.</li>
      </ol>
      <h2 className="text-lg font-semibold text-foreground">Limits</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Up to {LIMITS.maxSteps.toLocaleString()} steps and {LIMITS.executionTimeoutMs / 1000} seconds per run.</li>
        <li>Code up to {LIMITS.maxCodeBytes / 1024} KB and input up to {LIMITS.maxStdinBytes / 1024} KB.</li>
        <li>
          Java today: one file, a main method, variables, conditions, loops, arrays, methods, recursion, Scanner input, your own classes,
          and collections such as ArrayList, HashMap, HashSet, TreeMap, stacks and queues. More languages are coming.
        </li>
      </ul>
      <p>
        Read the <Link className="text-primary underline-offset-2 hover:underline" href="/privacy">privacy notes</Link> to see what is stored.
      </p>
      <section aria-labelledby="creator" className="rounded-xl border bg-card p-5">
        <h2 id="creator" className="mb-3 text-lg font-semibold text-foreground">
          About the creator
        </h2>
        <div className="flex items-start gap-4">
          <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
            {initials(CREATOR.name)}
          </span>
          <div className="space-y-2">
            <p>
              <span className="font-medium text-foreground">{CREATOR.name}</span>
              <span className="text-muted-foreground"> · {CREATOR.role}</span>
            </p>
            <p>{CREATOR.bio}</p>
            <ul className="flex flex-wrap gap-2 pt-1">
              {CREATOR.links.map((l) => (
                <li key={l.label}>
                  <Button variant="outline" size="sm" asChild>
                    <a href={l.href} target="_blank" rel="noopener noreferrer">
                      {l.label}
                      <ExternalLinkIcon aria-hidden className="size-3.5 text-muted-foreground" />
                    </a>
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      <p className="text-muted-foreground">
        mycodevisualizer is open source.{" "}
        <a className="text-primary underline-offset-2 hover:underline" href={SITE.repository} target="_blank" rel="noopener noreferrer">
          View the code on GitHub
        </a>
        .
      </p>
    </article>
  );
}
