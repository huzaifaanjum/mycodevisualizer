package dev.mycodevisualizer.tracer;

import com.sun.jdi.ArrayReference;
import com.sun.jdi.BooleanValue;
import com.sun.jdi.ByteValue;
import com.sun.jdi.CharValue;
import com.sun.jdi.DoubleValue;
import com.sun.jdi.Field;
import com.sun.jdi.FloatValue;
import com.sun.jdi.IntegerValue;
import com.sun.jdi.LongValue;
import com.sun.jdi.ObjectReference;
import com.sun.jdi.PrimitiveValue;
import com.sun.jdi.ShortValue;
import com.sun.jdi.StringReference;
import com.sun.jdi.Value;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Converts JDI values into JSON-ready maps, collecting reachable heap objects for one step. */
final class HeapBuilder {
    private static final int MAX_ARRAY_ITEMS = 100;
    private static final int MAX_STRING_CHARS = 1000;
    private static final int MAX_OBJECTS = 300;
    private static final Set<String> BOXED = Set.of(
        "java.lang.Integer", "java.lang.Long", "java.lang.Double", "java.lang.Float",
        "java.lang.Short", "java.lang.Byte", "java.lang.Character", "java.lang.Boolean");

    private final Map<String, Object> heap = new LinkedHashMap<>();
    private final Caches caches;
    private final CollectionReader collections;

    /**
     * Shared across all steps of one run. Strings and boxed values are immutable, so their mapped
     * form can be reused; JDI field handles never change.
     */
    record Caches(Map<Long, Map<String, Object>> immutable, Map<String, Field> fields) {
        static Caches create() {
            return new Caches(new java.util.HashMap<>(), new java.util.HashMap<>());
        }
    }

    HeapBuilder(Caches caches) {
        this.caches = caches;
        this.collections = new CollectionReader(this::map, caches.fields());
    }

    Map<String, Object> heap() {
        return heap;
    }

    Map<String, Object> map(Value v) {
        if (v == null) {
            return Map.of("kind", "null");
        }
        if (v instanceof PrimitiveValue p) {
            return primitive(simpleName(p.type().name()), display(p));
        }
        ObjectReference obj = (ObjectReference) v;
        String className = obj.referenceType().name();
        if (BOXED.contains(className)) {
            return caches.immutable().computeIfAbsent(obj.uniqueID(), id -> {
                Field f = obj.referenceType().fieldByName("value");
                Value inner = f == null ? null : obj.getValue(f);
                String shown = inner instanceof PrimitiveValue p ? display(p) : "?";
                return primitive(simpleName(className), shown);
            });
        }
        String id = "h" + obj.uniqueID();
        if (!heap.containsKey(id)) {
            if (heap.size() >= MAX_OBJECTS) {
                Map<String, Object> placeholder = new LinkedHashMap<>();
                placeholder.put("kind", "object");
                placeholder.put("className", simpleName(className));
                placeholder.put("fields", List.of());
                placeholder.put("opaque", true);
                heap.put(id, placeholder);
            } else {
                Map<String, Object> entry = new LinkedHashMap<>();
                heap.put(id, entry); // register before recursing so cycles terminate
                fill(entry, obj, className);
            }
        }
        Map<String, Object> ref = new LinkedHashMap<>();
        ref.put("kind", "ref");
        ref.put("heapId", id);
        return ref;
    }

    private void fill(Map<String, Object> entry, ObjectReference obj, String className) {
        if (obj instanceof StringReference s) {
            entry.putAll(caches.immutable().computeIfAbsent(s.uniqueID(), id -> {
                String value = s.value();
                Map<String, Object> str = new LinkedHashMap<>();
                str.put("kind", "string");
                str.put("value", value.length() > MAX_STRING_CHARS ? value.substring(0, MAX_STRING_CHARS) + "…" : value);
                return str;
            }));
            return;
        }
        if (obj instanceof ArrayReference arr) {
            entry.put("kind", "array");
            String typeName = arr.referenceType().name();
            entry.put("elementType", simpleName(typeName.substring(0, Math.max(0, typeName.length() - 2))));
            int length = arr.length();
            entry.put("length", length);
            List<Object> items = new ArrayList<>();
            int n = Math.min(length, MAX_ARRAY_ITEMS);
            if (n > 0) {
                for (Value item : arr.getValues(0, n)) {
                    items.add(map(item));
                }
            }
            entry.put("items", items);
            return;
        }
        if (collections.tryFill(entry, obj)) {
            return;
        }
        entry.put("kind", "object");
        entry.put("className", simpleName(className));
        if (isPlatformClass(className)) {
            entry.put("fields", List.of());
            entry.put("opaque", true);
            return;
        }
        List<Object> fields = new ArrayList<>();
        for (Field f : obj.referenceType().allFields()) {
            if (f.isStatic() || f.isSynthetic()) continue;
            Map<String, Object> var = new LinkedHashMap<>();
            var.put("name", f.name());
            var.put("type", simpleName(f.typeName()));
            var.put("value", map(obj.getValue(f)));
            fields.add(var);
        }
        entry.put("fields", fields);
    }

    static boolean isPlatformClass(String name) {
        return name.startsWith("java.") || name.startsWith("javax.") || name.startsWith("jdk.")
            || name.startsWith("sun.") || name.startsWith("com.sun.");
    }

    static String simpleName(String name) {
        int dot = name.lastIndexOf('.');
        return dot >= 0 ? name.substring(dot + 1) : name;
    }

    private static Map<String, Object> primitive(String type, String display) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("kind", "primitive");
        m.put("type", type);
        m.put("display", display);
        return m;
    }

    static String display(PrimitiveValue p) {
        if (p instanceof CharValue c) return "'" + c.value() + "'";
        if (p instanceof BooleanValue b) return String.valueOf(b.value());
        if (p instanceof DoubleValue d) return String.valueOf(d.value());
        if (p instanceof FloatValue f) return String.valueOf(f.value());
        if (p instanceof LongValue l) return String.valueOf(l.value());
        if (p instanceof IntegerValue i) return String.valueOf(i.value());
        if (p instanceof ShortValue s) return String.valueOf(s.value());
        if (p instanceof ByteValue b) return String.valueOf(b.value());
        return p.toString();
    }
}
