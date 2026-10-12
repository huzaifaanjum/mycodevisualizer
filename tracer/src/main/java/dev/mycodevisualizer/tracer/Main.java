package dev.mycodevisualizer.tracer;

import java.io.IOException;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Entry point. Usage:
 *   java -jar tracer.jar --source Main.java --stdin input.txt [--max-steps 1000] [--timeout-ms 5000]
 * Prints exactly one JSON trace document (schema version 1) to stdout.
 */
public final class Main {
    private Main() {}

    public static void main(String[] args) {
        PrintStream out = new PrintStream(System.out, true, StandardCharsets.UTF_8);
        Map<String, Object> trace;
        try {
            trace = run(Args.parse(args));
        } catch (Exception e) {
            trace = new LinkedHashMap<>();
            trace.put("version", 1);
            trace.put("language", "java");
            trace.put("status", "internal_error");
            trace.put("message", e.getClass().getSimpleName() + ": " + e.getMessage());
            trace.put("steps", List.of());
            trace.put("stdout", "");
        }
        out.println(Json.write(trace));
    }

    static Map<String, Object> run(Args a) throws Exception {
        String raw = Files.readString(a.source(), StandardCharsets.UTF_8);
        byte[] stdin = a.stdin() == null ? new byte[0] : Files.readAllBytes(a.stdin());
        SourcePreparer.Prepared prepared = SourcePreparer.prepare(raw);

        Path work = Files.createTempDirectory("mcv");
        try {
            Map<String, Object> trace = new LinkedHashMap<>();
            trace.put("version", 1);
            trace.put("language", "java");
            trace.put("mainClass", prepared.mainClass());

            JavaCompilerRunner.Result compiled = JavaCompilerRunner.compile(work, prepared.mainClass(), prepared.source());
            if (!compiled.ok()) {
                trace.put("status", "compile_error");
                trace.put("diagnostics", compiled.diagnostics());
                trace.put("steps", List.of());
                trace.put("stdout", "");
                return trace;
            }
            Set<String> userClasses = listUserClasses(work);
            Debugger.Limits limits = new Debugger.Limits(a.maxSteps(), a.timeoutMs(), 128, 64 * 1024);
            Debugger.Outcome outcome = new Debugger(work, prepared.mainClass(), userClasses, stdin, limits).run();
            trace.put("status", outcome.status());
            trace.put("heapEncoding", "delta");
            trace.put("truncatedReason", outcome.truncatedReason());
            trace.put("steps", outcome.steps());
            trace.put("stdout", outcome.stdout());
            return trace;
        } finally {
            deleteRecursively(work);
        }
    }

    private static Set<String> listUserClasses(Path work) throws IOException {
        try (Stream<Path> files = Files.list(work)) {
            return files
                .map(p -> p.getFileName().toString())
                .filter(n -> n.endsWith(".class"))
                .map(n -> n.substring(0, n.length() - ".class".length()))
                .filter(n -> !n.startsWith(SourcePreparer.LAUNCHER))
                .filter(n -> !n.contains("$"))
                .collect(Collectors.toSet());
        }
    }

    private static void deleteRecursively(Path dir) {
        try (Stream<Path> walk = Files.walk(dir)) {
            walk.sorted(Comparator.reverseOrder()).forEach(p -> {
                try {
                    Files.deleteIfExists(p);
                } catch (IOException ignored) {
                    // best effort cleanup
                }
            });
        } catch (IOException ignored) {
            // best effort cleanup
        }
    }

    record Args(Path source, Path stdin, int maxSteps, int timeoutMs) {
        static Args parse(String[] args) {
            Path source = null;
            Path stdin = null;
            int maxSteps = 1000;
            int timeoutMs = 5000;
            for (int i = 0; i + 1 < args.length; i += 2) {
                switch (args[i]) {
                    case "--source" -> source = Path.of(args[i + 1]);
                    case "--stdin" -> stdin = Path.of(args[i + 1]);
                    case "--max-steps" -> maxSteps = clamp(Integer.parseInt(args[i + 1]), 1, 5000);
                    case "--timeout-ms" -> timeoutMs = clamp(Integer.parseInt(args[i + 1]), 500, 15000);
                    default -> throw new IllegalArgumentException("Unknown argument: " + args[i]);
                }
            }
            if (source == null) throw new IllegalArgumentException("--source is required");
            return new Args(source, stdin, maxSteps, timeoutMs);
        }

        private static int clamp(int v, int lo, int hi) {
            return Math.max(lo, Math.min(hi, v));
        }
    }
}
