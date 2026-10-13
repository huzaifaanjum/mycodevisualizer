import { ExampleBanner } from "@/features/examples";
import { Workspace } from "@/features/workspace";
import { DEFAULT_LANGUAGE, getLanguageAdapter } from "@/languages";
import { getConfig } from "@/server/env";
import { exampleService } from "@/server/services/example.service";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const { example: exampleParam } = await searchParams;
  const slug = typeof exampleParam === "string" && /^[a-z0-9-]{1,64}$/.test(exampleParam) ? exampleParam : null;
  const example = slug ? await exampleService.get(slug) : null;
  const adapter = getLanguageAdapter(example?.language ?? DEFAULT_LANGUAGE);
  const { features } = getConfig();
  const problemStatement = example ? `${example.title}. ${example.description}` : undefined;

  return (
    <Workspace
      key={example?.slug ?? "starter"}
      language={adapter.id}
      initialCode={example?.code ?? adapter.starterCode}
      initialStdin={example?.stdin ?? adapter.starterStdin}
      canShare={features.database}
      canNarrate={features.narration}
      narrationIntro={problemStatement}
      autoRun={Boolean(example)}
      banner={
        example ? <ExampleBanner example={example} canListen={features.narration} /> : undefined
      }
    />
  );
}
