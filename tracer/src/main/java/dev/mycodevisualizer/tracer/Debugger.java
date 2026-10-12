package dev.mycodevisualizer.tracer;

import com.sun.jdi.AbsentInformationException;
import com.sun.jdi.ArrayReference;
import com.sun.jdi.Bootstrap;
import com.sun.jdi.ByteValue;
import com.sun.jdi.ClassType;
import com.sun.jdi.Field;
import com.sun.jdi.IntegerValue;
import com.sun.jdi.LocalVariable;
import com.sun.jdi.Location;
import com.sun.jdi.Method;
import com.sun.jdi.ObjectReference;
import com.sun.jdi.ReferenceType;
import com.sun.jdi.StackFrame;
import com.sun.jdi.StringReference;
import com.sun.jdi.ThreadReference;
import com.sun.jdi.Value;
import com.sun.jdi.VMDisconnectedException;
import com.sun.jdi.VirtualMachine;
import com.sun.jdi.VoidValue;
import com.sun.jdi.connect.Connector;
import com.sun.jdi.connect.LaunchingConnector;
import com.sun.jdi.event.BreakpointEvent;
import com.sun.jdi.event.ClassPrepareEvent;
import com.sun.jdi.event.Event;
import com.sun.jdi.event.EventSet;
import com.sun.jdi.event.MethodExitEvent;
import com.sun.jdi.event.StepEvent;
import com.sun.jdi.event.VMDeathEvent;
import com.sun.jdi.event.VMDisconnectEvent;
import com.sun.jdi.request.BreakpointRequest;
import com.sun.jdi.request.ClassPrepareRequest;
import com.sun.jdi.request.EventRequest;
import com.sun.jdi.request.EventRequestManager;
import com.sun.jdi.request.MethodExitRequest;
import com.sun.jdi.request.StepRequest;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Runs the compiled program under JDI and records one step per executed source line. */
final class Debugger {
    private static final String[] EXCLUDED = {"java.*", "javax.*", "jdk.*", "sun.*", "com.sun.*", SourcePreparer.LAUNCHER + "*"};

    private final Path workDir;
    private final String mainClass;
    private final Set<String> userClasses;
    private final byte[] stdin;
    private final Limits limits;
    private final HeapBuilder.Caches caches = HeapBuilder.Caches.create();

    private final List<Map<String, Object>> steps = new ArrayList<>();
    private final List<String> activationIds = new ArrayList<>();
    private final List<String> activationMethods = new ArrayList<>();
    private int nextActivation = 0;

    private final ByteArrayOutputStream stdoutBytes = new ByteArrayOutputStream();
    private String stdout = "";
    private ReferenceType launcherType;
    private Map<String, Object> pendingReturn;
    private String status = "ok";
    /** JSON of each heap object as last emitted, for delta encoding. */
    private Map<String, String> emittedHeap = new java.util.HashMap<>();
    private String truncatedReason;
    private boolean finished;

    Debugger(Path workDir, String mainClass, Set<String> userClasses, byte[] stdin, Limits limits) {
        this.workDir = workDir;
        this.mainClass = mainClass;
        this.userClasses = userClasses;
        this.stdin = stdin;
        this.limits = limits;
    }

    record Outcome(String status, String truncatedReason, List<Map<String, Object>> steps, String stdout) {}

    Outcome run() throws Exception {
        VirtualMachine vm = launch();
        Process process = vm.process();
        feedStdin(process);
        drain(process.getInputStream());
        drain(process.getErrorStream());

        long deadline = System.nanoTime() + limits.timeoutMs() * 1_000_000L;
        Thread watchdog = new Thread(() -> {
            try {
                Thread.sleep(limits.timeoutMs() + 1500L);
                process.destroyForcibly();
            } catch (InterruptedException ignored) {
                Thread.currentThread().interrupt();
            }
        });
        watchdog.setDaemon(true);
        watchdog.start();

        EventRequestManager erm = vm.eventRequestManager();
        watchClass(erm, SourcePreparer.LAUNCHER);
        watchClass(erm, mainClass);
        for (String cls : userClasses) {
            MethodExitRequest exit = erm.createMethodExitRequest();
            exit.addClassFilter(cls);
            exit.setSuspendPolicy(EventRequest.SUSPEND_EVENT_THREAD);
            exit.enable();
        }
        breakOnSystemExit(vm, erm);

        try {
            vm.resume();
            loop(vm, deadline);
        } finally {
            watchdog.interrupt();
            try {
                vm.exit(0);
            } catch (Exception ignored) {
                // VM may already be gone
            }
            process.destroyForcibly();
        }
        return new Outcome(status, truncatedReason, steps, stdout);
    }

    private VirtualMachine launch() throws Exception {
        LaunchingConnector connector = Bootstrap.virtualMachineManager().defaultConnector();
        Map<String, Connector.Argument> args = connector.defaultArguments();
        args.get("main").setValue(SourcePreparer.LAUNCHER);
        args.get("options").setValue("-cp " + workDir.toAbsolutePath()
            + " -Xmx" + limits.memoryMb() + "m -Xss8m -XX:+UseSerialGC -XX:TieredStopAtLevel=1"
            + " -XX:ActiveProcessorCount=1 -Djava.awt.headless=true -Dfile.encoding=UTF-8");
        return connector.launch(args);
    }

    private void feedStdin(Process process) {
        Thread t = new Thread(() -> {
            try (OutputStream os = process.getOutputStream()) {
                os.write(stdin);
            } catch (IOException ignored) {
                // process exited early
            }
        });
        t.setDaemon(true);
        t.start();
    }

    private static void drain(InputStream in) {
        Thread t = new Thread(() -> {
            byte[] buf = new byte[4096];
            try {
                while (in.read(buf) >= 0) {
                    // discard: user output is captured inside the debuggee
                }
            } catch (IOException ignored) {
                // stream closed
            }
        });
        t.setDaemon(true);
        t.start();
    }

    private static void watchClass(EventRequestManager erm, String name) {
        ClassPrepareRequest req = erm.createClassPrepareRequest();
        req.addClassFilter(name);
        req.setSuspendPolicy(EventRequest.SUSPEND_ALL);
        req.enable();
    }

    private static void breakOnSystemExit(VirtualMachine vm, EventRequestManager erm) {
        for (ReferenceType rt : vm.classesByName("java.lang.Runtime")) {
            for (Method m : rt.methodsByName("exit")) {
                BreakpointRequest bp = erm.createBreakpointRequest(m.location());
                bp.setSuspendPolicy(EventRequest.SUSPEND_ALL);
                bp.enable();
            }
        }
    }

    private void loop(VirtualMachine vm, long deadline) throws Exception {
        while (!finished) {
            long remainingMs = (deadline - System.nanoTime()) / 1_000_000L;
            if (remainingMs <= 0) {
                truncate("TIME_LIMIT");
                return;
            }
            EventSet set;
            try {
                set = vm.eventQueue().remove(remainingMs);
            } catch (VMDisconnectedException e) {
                return;
            }
            if (set == null) {
                truncate("TIME_LIMIT");
                return;
            }
            for (Event event : set) {
                handle(vm, event);
                if (finished) return;
            }
            set.resume();
        }
    }

    private void handle(VirtualMachine vm, Event event) throws Exception {
        if (event instanceof ClassPrepareEvent cpe) {
            onClassPrepare(vm, cpe.referenceType());
        } else if (event instanceof BreakpointEvent bp) {
            onBreakpoint(vm, bp);
        } else if (event instanceof StepEvent step) {
            recordStep(step.thread(), null);
        } else if (event instanceof MethodExitEvent exit) {
            onMethodExit(exit);
        } else if (event instanceof VMDeathEvent || event instanceof VMDisconnectEvent) {
            if (!finished) {
                finishWithEnd(null);
            }
        }
    }

    private void onClassPrepare(VirtualMachine vm, ReferenceType type) {
        EventRequestManager erm = vm.eventRequestManager();
        if (type.name().equals(SourcePreparer.LAUNCHER)) {
            launcherType = type;
            for (String name : List.of("failed", "done")) {
                for (Method m : type.methodsByName(name)) {
                    BreakpointRequest bp = erm.createBreakpointRequest(m.location());
                    bp.setSuspendPolicy(EventRequest.SUSPEND_ALL);
                    bp.enable();
                }
            }
        } else if (type.name().equals(mainClass)) {
            for (Method m : type.methodsByName("main")) {
                if (m.isStatic() && m.location() != null) {
                    BreakpointRequest bp = erm.createBreakpointRequest(m.location());
                    bp.setSuspendPolicy(EventRequest.SUSPEND_ALL);
                    bp.enable();
                }
            }
        }
    }

    private void onBreakpoint(VirtualMachine vm, BreakpointEvent bp) throws Exception {
        Method method = bp.location().method();
        String owner = method.declaringType().name();
        if (owner.equals(mainClass) && method.name().equals("main")) {
            bp.request().disable();
            StepRequest step = vm.eventRequestManager().createStepRequest(bp.thread(), StepRequest.STEP_LINE, StepRequest.STEP_INTO);
            for (String pattern : EXCLUDED) {
                step.addClassExclusionFilter(pattern);
            }
            step.setSuspendPolicy(EventRequest.SUSPEND_ALL);
            step.enable();
            recordStep(bp.thread(), null);
        } else if (owner.equals(SourcePreparer.LAUNCHER) && method.name().equals("failed")) {
            ObjectReference thrown = (ObjectReference) bp.thread().frame(0).getArgumentValues().get(0);
            finishWithException(bp.thread(), thrown);
        } else {
            // launcher done() or Runtime.exit(): the program finished normally
            finishWithEnd(bp.thread());
        }
    }

    private void onMethodExit(MethodExitEvent exit) {
        Method m = exit.method();
        if (m.isConstructor() || m.isStaticInitializer() || exit.returnValue() instanceof VoidValue) {
            return;
        }
        HeapBuilder hb = new HeapBuilder(caches);
        Map<String, Object> value = hb.map(exit.returnValue());
        Map<String, Object> ret = new LinkedHashMap<>();
        ret.put("method", m.name());
        ret.put("value", value);
        ret.put("heap", hb.heap());
        pendingReturn = ret;
    }

    private void recordStep(ThreadReference thread, String forcedEvent) throws Exception {
        if (steps.size() >= limits.maxSteps()) {
            truncate("STEP_LIMIT");
            return;
        }
        List<StackFrame> all = thread.frames();
        List<StackFrame> user = new ArrayList<>();
        for (StackFrame f : all) {
            if (isUserType(f.location().declaringType().name())) {
                user.add(0, f); // bottom (outermost) first
            }
        }
        if (user.isEmpty()) {
            return;
        }
        int previousDepth = activationIds.size();
        syncActivations(user);

        HeapBuilder heap = new HeapBuilder(caches);
        List<Object> frames = new ArrayList<>();
        for (int i = 0; i < user.size(); i++) {
            frames.add(frame(user.get(i), activationIds.get(i), heap));
        }
        Location top = user.get(user.size() - 1).location();

        Map<String, Object> step = new LinkedHashMap<>();
        step.put("index", steps.size());
        step.put("line", top.lineNumber());
        String event = forcedEvent;
        if (event == null) {
            if (steps.isEmpty() || user.size() > previousDepth) event = "call";
            else if (user.size() < previousDepth) event = "return";
            else event = "step";
        }
        step.put("event", event);
        step.put("frames", frames);
        if (pendingReturn != null) {
            @SuppressWarnings("unchecked")
            Map<String, Object> retHeap = (Map<String, Object>) pendingReturn.get("heap");
            retHeap.forEach(heap.heap()::putIfAbsent);
            Map<String, Object> rv = new LinkedHashMap<>();
            rv.put("method", pendingReturn.get("method"));
            rv.put("value", pendingReturn.get("value"));
            step.put("returned", rv);
            pendingReturn = null;
        }
        step.put("heap", heapDelta(heap.heap()));
        readOutput(thread.virtualMachine());
        step.put("stdoutLength", stdout.length());
        step.put("stdinConsumed", readStdinPos());
        steps.add(step);
    }

    /**
     * Heap objects that are new or changed since the previous step. The client rebuilds each step's
     * full heap by applying deltas in order (trace "heapEncoding": "delta").
     */
    private Map<String, Object> heapDelta(Map<String, Object> current) {
        Map<String, Object> delta = new LinkedHashMap<>();
        Map<String, String> next = new java.util.HashMap<>();
        for (Map.Entry<String, Object> e : current.entrySet()) {
            String json = Json.write(e.getValue());
            next.put(e.getKey(), json);
            if (!json.equals(emittedHeap.get(e.getKey()))) delta.put(e.getKey(), e.getValue());
        }
        // Keep objects that went out of reach: the client still has them, so they don't need resending.
        emittedHeap.putAll(next);
        return delta;
    }

    private boolean isUserType(String name) {
        if (userClasses.contains(name)) return true;
        int dollar = name.indexOf('$');
        return dollar > 0 && userClasses.contains(name.substring(0, dollar));
    }

    /** Keeps a stable id per method activation so the UI can draw a call tree. */
    private void syncActivations(List<StackFrame> user) {
        int keep = 0;
        while (keep < user.size() && keep < activationIds.size()) {
            String sig = methodKey(user.get(keep));
            // A frame below the top cannot have changed method without the top changing too,
            // but a top frame at the same depth with a different method is a new activation.
            if (!sig.equals(activationMethods.get(keep))) break;
            keep++;
        }
        // If depth is unchanged and the top method is the same, it is the same activation.
        while (activationIds.size() > keep) {
            activationIds.remove(activationIds.size() - 1);
            activationMethods.remove(activationMethods.size() - 1);
        }
        for (int i = keep; i < user.size(); i++) {
            activationIds.add("f" + (nextActivation++));
            activationMethods.add(methodKey(user.get(i)));
        }
    }

    private static String methodKey(StackFrame f) {
        Method m = f.location().method();
        return m.declaringType().name() + "." + m.name() + m.signature();
    }

    private Map<String, Object> frame(StackFrame f, String id, HeapBuilder heap) {
        Method m = f.location().method();
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", id);
        out.put("method", m.name());
        out.put("className", HeapBuilder.simpleName(m.declaringType().name()));
        out.put("line", f.location().lineNumber());
        List<Object> locals = new ArrayList<>();
        ObjectReference self = f.thisObject();
        if (self != null) {
            locals.add(variable("this", HeapBuilder.simpleName(self.referenceType().name()), heap.map(self)));
        }
        try {
            List<LocalVariable> vars = f.visibleVariables();
            Map<LocalVariable, Value> values = f.getValues(vars);
            for (LocalVariable v : vars) {
                locals.add(variable(v.name(), HeapBuilder.simpleName(v.typeName()), heap.map(values.get(v))));
            }
        } catch (AbsentInformationException e) {
            // compiled without -g: no local names available
        }
        out.put("locals", locals);
        return out;
    }

    private static Map<String, Object> variable(String name, String type, Map<String, Object> value) {
        Map<String, Object> v = new LinkedHashMap<>();
        v.put("name", name);
        v.put("type", type);
        v.put("value", value);
        return v;
    }

    private ObjectReference outBuffer;
    private Field outCount;
    private Field outBuf;
    private Field inPos;

    private void readOutput(VirtualMachine vm) {
        if (launcherType == null) return;
        if (outBuffer == null) {
            outBuffer = (ObjectReference) launcherType.getValue(launcherType.fieldByName("OUT"));
            outCount = fieldIn(outBuffer.referenceType(), "count");
            outBuf = fieldIn(outBuffer.referenceType(), "buf");
        }
        int count = ((IntegerValue) outBuffer.getValue(outCount)).value();
        int have = stdoutBytes.size();
        if (count > have) {
            int take = Math.min(count, limits.maxOutputBytes()) - have;
            if (take > 0) {
                ArrayReference buf = (ArrayReference) outBuffer.getValue(outBuf);
                for (Value b : buf.getValues(have, take)) {
                    stdoutBytes.write(((ByteValue) b).value());
                }
                stdout = stdoutBytes.toString(StandardCharsets.UTF_8);
            }
            if (count > limits.maxOutputBytes()) {
                truncate("OUTPUT_LIMIT");
            }
        }
    }

    private static Field fieldIn(ReferenceType type, String name) {
        ReferenceType t = type;
        while (t != null) {
            Field f = t.fieldByName(name);
            if (f != null) return f;
            t = t instanceof ClassType ct ? ct.superclass() : null;
        }
        throw new IllegalStateException("Field not found: " + name);
    }

    private int readStdinPos() {
        if (launcherType == null) return 0;
        if (inPos == null) inPos = launcherType.fieldByName("IN_POS");
        Value v = launcherType.getValue(inPos);
        return v instanceof IntegerValue i ? i.value() : 0;
    }

    private void finishWithEnd(ThreadReference thread) {
        if (thread != null) {
            try {
                readOutput(thread.virtualMachine());
            } catch (Exception ignored) {
                // best effort
            }
        }
        Map<String, Object> step = new LinkedHashMap<>();
        step.put("index", steps.size());
        step.put("line", steps.isEmpty() ? 0 : steps.get(steps.size() - 1).get("line"));
        step.put("event", "end");
        step.put("frames", List.of());
        step.put("heap", Map.of());
        step.put("stdoutLength", stdout.length());
        step.put("stdinConsumed", safeStdinPos());
        steps.add(step);
        finished = true;
    }

    private void finishWithException(ThreadReference thread, ObjectReference thrown) {
        try {
            readOutput(thread.virtualMachine());
        } catch (Exception ignored) {
            // best effort
        }
        Map<String, Object> last = steps.isEmpty() ? null : steps.get(steps.size() - 1);
        Map<String, Object> step = new LinkedHashMap<>();
        step.put("index", steps.size());
        int line = last == null ? 0 : (int) last.get("line");
        step.put("line", line);
        step.put("event", "exception");
        step.put("frames", last == null ? List.of() : last.get("frames"));
        step.put("heap", Map.of()); // delta: nothing changed since the previous step
        step.put("stdoutLength", stdout.length());
        step.put("stdinConsumed", safeStdinPos());
        Map<String, Object> ex = new LinkedHashMap<>();
        ex.put("type", HeapBuilder.simpleName(thrown.referenceType().name()));
        Field msgField = fieldIn(thrown.referenceType(), "detailMessage");
        Value msg = thrown.getValue(msgField);
        ex.put("message", msg instanceof StringReference s ? s.value() : "");
        ex.put("line", line);
        step.put("exception", ex);
        steps.add(step);
        status = "runtime_error";
        finished = true;
    }

    private int safeStdinPos() {
        try {
            return readStdinPos();
        } catch (Exception e) {
            return 0;
        }
    }

    private void truncate(String reason) {
        status = "truncated";
        truncatedReason = reason;
        finished = true;
    }

    record Limits(int maxSteps, int timeoutMs, int memoryMb, int maxOutputBytes) {}
}
