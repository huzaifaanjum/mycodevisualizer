# Java tracer

Compiles a single Java file with debug info, runs it under JDI, and prints one JSON trace (schema in `src/shared/trace/schema.ts`).

```bash
bash tracer/scripts/build.sh                       # → tracer/build/tracer.jar
java -jar tracer/build/tracer.jar --source Main.java --stdin input.txt [--max-steps 1000] [--timeout-ms 5000]
node tracer/scripts/test.mjs                        # runs src/test/programs against expectations.json
```

How it works:
- `SourcePreparer` finds the main class, blanks a `package` line (keeping line numbers) and generates `McvLauncher__`, which captures `System.out` in memory and feeds `System.in` one byte at a time so consumed input can be measured exactly.
- `Debugger` launches the program suspended, breaks at `main`, then single-steps lines (JDK classes are excluded), recording frames, locals, reachable heap objects, output and input position at each step. Method exits supply return values.
- Limits: steps, wall time and output size. Infinite loops end as `truncated`.

No third-party dependencies: only the JDK (`jdk.jdi`, `java.compiler`).
