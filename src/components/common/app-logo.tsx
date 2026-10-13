import { cn } from "@/lib/utils";

/**
 * The app mark: a maze with the path through it lit up, the way the visualizer traces a run
 * through your code. Same drawing as `app/icon.svg`; it keeps its colors in every theme.
 */
export function AppLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={cn("size-7 shrink-0", className)}>
      <rect
        x="0.75"
        y="0.75"
        width="62.5"
        height="62.5"
        rx="14.25"
        fill="#0A0A0A"
        stroke="#FAFAFA"
        strokeOpacity="0.14"
        strokeWidth="1.5"
      />
      <path
        d="M21 10H54V43M54 54H10V10M10 21H43M32 32H54M10 43H32M21 21V54M43 32V43M32 43V54"
        fill="none"
        stroke="#FAFAFA"
        strokeOpacity="0.4"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.5 7V15.5H48.5V26.5H26.5V37.5H37.5V48.5H51"
        fill="none"
        stroke="#22C55E"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="51" cy="48.5" r="4.4" fill="#FAFAFA" />
    </svg>
  );
}
