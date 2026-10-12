import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-8 text-center">
      <p className="font-mono text-sm text-primary">404</p>
      <h1 className="text-xl font-semibold">We couldn&apos;t find that page</h1>
      <p className="text-sm text-muted-foreground">The link may be wrong, or the shared program was deleted.</p>
      <Button asChild variant="outline">
        <Link href="/">Back to the editor</Link>
      </Button>
    </div>
  );
}
