package dev.mycodevisualizer.tracer;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Prepares user source for compilation: finds the main class and neutralises package declarations. */
final class SourcePreparer {
    static final String LAUNCHER = "McvLauncher__";

    private static final Pattern PACKAGE = Pattern.compile("^\\s*package\\s+[\\w.]+\\s*;", Pattern.MULTILINE);
    private static final Pattern PUBLIC_CLASS = Pattern.compile("public\\s+(?:final\\s+|abstract\\s+)*class\\s+([A-Za-z_$][\\w$]*)");
    private static final Pattern ANY_CLASS = Pattern.compile("\\bclass\\s+([A-Za-z_$][\\w$]*)");

    record Prepared(String source, String mainClass) {}

    private SourcePreparer() {}

    static Prepared prepare(String raw) {
        // Replace a package line with spaces so line and column numbers stay identical.
        Matcher pkg = PACKAGE.matcher(raw);
        String source = raw;
        if (pkg.find()) {
            String blank = " ".repeat(pkg.end() - pkg.start());
            source = raw.substring(0, pkg.start()) + blank + raw.substring(pkg.end());
        }
        Matcher pub = PUBLIC_CLASS.matcher(source);
        String main = pub.find() ? pub.group(1) : null;
        if (main == null) {
            Matcher any = ANY_CLASS.matcher(source);
            main = any.find() ? any.group(1) : "Main";
        }
        return new Prepared(source, main);
    }

    /** Generates the launcher that captures stdout and feeds stdin one byte at a time. */
    static String launcherSource(String mainClass) {
        return """
            import java.io.*;
            public final class McvLauncher__ {
                public static final ByteArrayOutputStream OUT = new ByteArrayOutputStream();
                static byte[] IN = new byte[0];
                public static int IN_POS = 0;
                public static void main(String[] args) throws Exception {
                    IN = System.in.readAllBytes();
                    System.setIn(new InputStream() {
                        @Override public int read() {
                            return IN_POS < IN.length ? (IN[IN_POS++] & 0xff) : -1;
                        }
                        @Override public int read(byte[] b, int off, int len) {
                            if (len == 0) return 0;
                            int c = read();
                            if (c < 0) return -1;
                            b[off] = (byte) c;
                            return 1;
                        }
                    });
                    PrintStream ps = new PrintStream(OUT, true, "UTF-8");
                    System.setOut(ps);
                    System.setErr(ps);
                    try {
                        %s.main(args);
                    } catch (Throwable t) {
                        failed(t);
                    }
                    done();
                }
                static void failed(Throwable t) { }
                static void done() { }
            }
            """.formatted(mainClass);
    }
}
