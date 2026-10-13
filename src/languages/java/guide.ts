import type { LanguageGuide } from "../types";

export const JAVA_GUIDE: LanguageGuide = {
  requirements: "One Java file with a main method.",
  supported: [
    "Variables",
    "Conditions",
    "Loops",
    "Arrays",
    "Methods",
    "Recursion",
    "Scanner input",
    "Your own classes",
    "ArrayList",
    "HashMap",
    "HashSet",
    "TreeMap",
    "Stacks and queues",
  ],
  notAvailable: ["Threads", "Files", "Network access", "Starting other programs", "Reflection"],
};
