import { Workspace } from "@/features/workspace";
import { DEFAULT_LANGUAGE, getLanguageAdapter } from "@/languages";
import { getConfig } from "@/server/env";
import { exampleService } from "@/server/services/example.service";
import { Badge } from "@/components/ui/badge";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const { example: exampleParam } = await searchParams;
  const slug = typeof exampleParam === "string" && /^[a-z0-9-]{1,64}$/.test(exampleParam) ? exampleParam : null;
  const example = slug ? await exampleService.get(slug) : null;
  const adapter = getLanguageAdapter(example?.language ?? DEFAULT_LANGUAGE);

  return (
    <Workspace
      key={example?.slug ?? "starter"}
      language={adapter.id}
      initialCode={example?.code ?? adapter.starterCode}
      initialStdin={example?.stdin ?? adapter.starterStdin}
      canShare={getConfig().features.database}
      autoRun={Boolean(example)}
      banner={
        example ? (
          <div className="flex items-center gap-2 border-b bg-card/60 px-3 py-2 text-sm">
            <Badge variant="outline">{example.topic}</Badge>
            <span className="font-medium">{example.title}</span>
            <span className="hidden truncate text-muted-foreground md:inline">· {example.description}</span>
          </div>
        ) : undefined
      }
    />
  );
}
