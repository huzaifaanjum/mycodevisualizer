import { exampleService } from "@/server/services/example.service";
import { json, route } from "@/server/http/route";

export const GET = route(async () => json(await exampleService.list(), { cache: "public" }));
