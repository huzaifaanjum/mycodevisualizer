import type { LanguageAdapter } from "../types";
import { explainJavaDiagnostic, explainJavaException } from "./explanations";
import { JAVA_GUIDE } from "./guide";
import { JAVA_STARTER_CODE, JAVA_STARTER_STDIN } from "./starter";
import { findUnsupportedJavaFeatures } from "./unsupported";

export const javaAdapter: LanguageAdapter = {
  id: "java",
  displayName: "Java",
  monacoLanguage: "java",
  starterCode: JAVA_STARTER_CODE,
  starterStdin: JAVA_STARTER_STDIN,
  guide: JAVA_GUIDE,
  findUnsupportedFeatures: findUnsupportedJavaFeatures,
  buildRunPlan({ code, stdin, toolsDir, maxSteps, timeoutMs }) {
    return {
      files: [
        { path: "source.java", content: code },
        { path: "stdin.txt", content: stdin },
      ],
      command: "java",
      args: [
        "-XX:+UseSerialGC",
        "-XX:TieredStopAtLevel=1",
        "-Xshare:auto",
        "-jar",
        `${toolsDir}/tracer.jar`,
        "--source",
        "source.java",
        "--stdin",
        "stdin.txt",
        "--max-steps",
        String(maxSteps),
        "--timeout-ms",
        String(timeoutMs),
      ],
    };
  },
  explainException: explainJavaException,
  explainDiagnostic: explainJavaDiagnostic,
};
