package dev.mycodevisualizer.tracer;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import javax.tools.Diagnostic;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.StandardJavaFileManager;
import javax.tools.ToolProvider;

/** Compiles the user's file plus the launcher in-process, with debug info for local variable names. */
final class JavaCompilerRunner {
    record Result(boolean ok, List<Map<String, Object>> diagnostics) {}

    private JavaCompilerRunner() {}

    static Result compile(Path workDir, String mainClass, String source) throws IOException {
        Path userFile = workDir.resolve(mainClass + ".java");
        Path launcherFile = workDir.resolve(SourcePreparer.LAUNCHER + ".java");
        Files.writeString(userFile, source, StandardCharsets.UTF_8);
        Files.writeString(launcherFile, SourcePreparer.launcherSource(mainClass), StandardCharsets.UTF_8);

        JavaCompiler compiler = ToolProvider.getSystemJavaCompiler();
        if (compiler == null) {
            throw new IllegalStateException("A JDK (not a JRE) is required to compile code");
        }
        DiagnosticCollector<JavaFileObject> collector = new DiagnosticCollector<>();
        try (StandardJavaFileManager fm = compiler.getStandardFileManager(collector, Locale.ENGLISH, StandardCharsets.UTF_8)) {
            Iterable<? extends JavaFileObject> units = fm.getJavaFileObjects(userFile.toFile(), launcherFile.toFile());
            List<String> options = List.of("-g", "-encoding", "UTF-8", "-d", workDir.toString(), "-Xlint:none", "-proc:none");
            boolean ok = compiler.getTask(null, fm, collector, options, null, units).call();
            return new Result(ok, toDiagnostics(collector, userFile));
        }
    }

    private static List<Map<String, Object>> toDiagnostics(DiagnosticCollector<JavaFileObject> collector, Path userFile) {
        List<Map<String, Object>> out = new ArrayList<>();
        boolean launcherError = false;
        for (Diagnostic<? extends JavaFileObject> d : collector.getDiagnostics()) {
            if (d.getKind() != Diagnostic.Kind.ERROR) continue;
            String file = d.getSource() == null ? "" : d.getSource().getName();
            if (!file.endsWith(userFile.getFileName().toString())) {
                launcherError = true;
                continue;
            }
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("line", (int) Math.max(1, d.getLineNumber()));
            m.put("column", (int) Math.max(1, d.getColumnNumber()));
            m.put("message", d.getMessage(Locale.ENGLISH));
            out.add(m);
        }
        if (out.isEmpty() && launcherError) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("line", 1);
            m.put("column", 1);
            m.put("message", "Could not find a 'public static void main(String[] args)' method in a public class.");
            out.add(m);
        }
        return out;
    }
}
