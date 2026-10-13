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

  return (
    <Workspace
      key={example?.slug ?? "starter"}
      language={adapter.id}
      initialCode={example?.code ?? adapter.starterCode}
      initialStdin={example?.stdin ?? adapter.starterStdin}
      canShare={getConfig().features.database}
      autoRun={Boolean(example)}
      banner={
        example ? <ExampleBanner example={example} /> : undefined
      }
    />
  );
}
