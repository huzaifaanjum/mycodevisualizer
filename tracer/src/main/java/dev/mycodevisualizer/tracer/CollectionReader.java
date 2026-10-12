package dev.mycodevisualizer.tracer;

import com.sun.jdi.ArrayReference;
import com.sun.jdi.ClassType;
import com.sun.jdi.Field;
import com.sun.jdi.IntegerValue;
import com.sun.jdi.ObjectReference;
import com.sun.jdi.ReferenceType;
import com.sun.jdi.Value;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;

/**
 * Reads the logical contents of standard java.util collections by walking their internal fields
 * (no method calls into the debuggee, so reading never changes program state or triggers events).
 *
 * Produces heap entries of kind "list" (ordered, indexed), "set" or "map", with at most
 * {@link #MAX_ITEMS} elements; "size" is always the real size.
 */
final class CollectionReader {
    static final int MAX_ITEMS = 50;
    /** Guards against corrupt or cyclic internal structures. */
    private static final int MAX_NODES = 10_000;

    private final Function<Value, Map<String, Object>> mapValue;
    private final Map<String, Field> fieldCache;

    CollectionReader(Function<Value, Map<String, Object>> mapValue, Map<String, Field> fieldCache) {
        this.mapValue = mapValue;
        this.fieldCache = fieldCache;
    }

    /** Fills {@code entry} and returns true when {@code obj} is a supported collection. */
    boolean tryFill(Map<String, Object> entry, ObjectReference obj) {
        Set<String> types = hierarchy(obj.referenceType());
        String display = displayName(obj.referenceType().name());
        Contents contents = read(obj, types);
        if (contents == null) return false;
        entry.put("kind", contents.kind);
        entry.put("className", display);
        entry.put("size", contents.size);
        if (contents.kind.equals("map")) {
            List<Object> entries = new ArrayList<>();
            for (Value[] kv : contents.entries) {
                Map<String, Object> e = new LinkedHashMap<>();
                e.put("key", mapValue.apply(kv[0]));
                e.put("value", mapValue.apply(kv[1]));
                entries.add(e);
            }
            entry.put("entries", entries);
        } else {
            List<Object> items = new ArrayList<>();
            for (Value v : contents.items) items.add(mapValue.apply(v));
            entry.put("items", items);
        }
        return true;
    }

    private static final class Contents {
        final String kind;
        final int size;
        final List<Value> items = new ArrayList<>();
        final List<Value[]> entries = new ArrayList<>();

        Contents(String kind, int size) {
            this.kind = kind;
            this.size = size;
        }

        boolean full() {
            return items.size() + entries.size() >= MAX_ITEMS;
        }
    }

    private Contents read(ObjectReference obj, Set<String> types) {
        // Order matters: subclasses before superclasses.
        if (types.contains("java.util.LinkedHashMap")) return readLinkedHashMap(obj);
        if (types.contains("java.util.HashMap")) return readHashMap(obj);
        if (types.contains("java.util.TreeMap")) return readTreeMap(obj);
        if (types.contains("java.util.HashSet")) return asSet(read(object(obj, "map"), "map"));
        if (types.contains("java.util.TreeSet")) return asSet(read(object(obj, "m"), "map"));
        if (types.contains("java.util.ArrayList")) return readArrayBacked(obj, "elementData", "size");
        if (types.contains("java.util.Vector")) return readArrayBacked(obj, "elementData", "elementCount");
        if (types.contains("java.util.PriorityQueue")) return readArrayBacked(obj, "queue", "size");
        if (types.contains("java.util.LinkedList")) return readLinkedList(obj);
        if (types.contains("java.util.ArrayDeque")) return readArrayDeque(obj);
        if (types.contains("java.util.Arrays$ArrayList")) return readWholeArray(obj, "a", "list");
        if (types.contains("java.util.ImmutableCollections$ListN")) return readWholeArray(obj, "elements", "list");
        if (types.contains("java.util.ImmutableCollections$List12")) return readPair(obj, "list");
        if (types.contains("java.util.ImmutableCollections$SetN")) return readSetN(obj);
        if (types.contains("java.util.ImmutableCollections$Set12")) return readPair(obj, "set");
        if (types.contains("java.util.ImmutableCollections$MapN")) return readMapN(obj);
        if (types.contains("java.util.ImmutableCollections$Map1")) return readMap1(obj);
        if (types.contains("java.util.Collections$UnmodifiableMap") || types.contains("java.util.Collections$SynchronizedMap")) {
            return read(object(obj, "m"), "map");
        }
        if (types.contains("java.util.Collections$UnmodifiableCollection") || types.contains("java.util.Collections$SynchronizedCollection")) {
            ObjectReference inner = object(obj, "c");
            return inner == null ? null : read(inner, hierarchy(inner.referenceType()));
        }
        return null;
    }

    /** Re-dispatches on a wrapped collection; {@code expected} filters by kind ("map" for maps). */
    private Contents read(ObjectReference inner, String expected) {
        if (inner == null) return null;
        Contents c = read(inner, hierarchy(inner.referenceType()));
        return c != null && c.kind.equals(expected) ? c : null;
    }

    private static Contents asSet(Contents map) {
        if (map == null) return null;
        Contents set = new Contents("set", map.size);
        for (Value[] kv : map.entries) set.items.add(kv[0]);
        return set;
    }

    // ---- lists -----------------------------------------------------------------------------

    private Contents readArrayBacked(ObjectReference obj, String arrayField, String sizeField) {
        int size = intField(obj, sizeField);
        Contents c = new Contents("list", size);
        ArrayReference arr = (ArrayReference) obj.getValue(field(obj.referenceType(), arrayField));
        int n = Math.min(Math.min(size, MAX_ITEMS), arr == null ? 0 : arr.length());
        if (n > 0) c.items.addAll(arr.getValues(0, n));
        return c;
    }

    private Contents readWholeArray(ObjectReference obj, String arrayField, String kind) {
        ArrayReference arr = (ArrayReference) obj.getValue(field(obj.referenceType(), arrayField));
        int length = arr == null ? 0 : arr.length();
        Contents c = new Contents(kind, length);
        int n = Math.min(length, MAX_ITEMS);
        if (n > 0) c.items.addAll(arr.getValues(0, n));
        return c;
    }

    private Contents readLinkedList(ObjectReference obj) {
        Contents c = new Contents("list", intField(obj, "size"));
        ObjectReference node = object(obj, "first");
        int guard = 0;
        while (node != null && !c.full() && guard++ < MAX_NODES) {
            Map<String, Value> f = values(node, "item", "next");
            c.items.add(f.get("item"));
            node = (ObjectReference) f.get("next");
        }
        return c;
    }

    private Contents readArrayDeque(ObjectReference obj) {
        ArrayReference arr = (ArrayReference) obj.getValue(field(obj.referenceType(), "elements"));
        int head = intField(obj, "head");
        int tail = intField(obj, "tail");
        int length = arr == null ? 0 : arr.length();
        int size = length == 0 ? 0 : Math.floorMod(tail - head, length);
        Contents c = new Contents("list", size);
        for (int i = 0, idx = head; i < size && !c.full(); i++, idx = (idx + 1) % length) {
            c.items.add(arr.getValue(idx));
        }
        return c;
    }

    private Contents readPair(ObjectReference obj, String kind) {
        Value e0 = obj.getValue(field(obj.referenceType(), "e0"));
        Value e1 = obj.getValue(field(obj.referenceType(), "e1"));
        boolean hasSecond = e1 != null && !isEmptySentinel(obj, e1);
        Contents c = new Contents(kind, hasSecond ? 2 : 1);
        c.items.add(e0);
        if (hasSecond) c.items.add(e1);
        return c;
    }

    private Contents readSetN(ObjectReference obj) {
        ArrayReference arr = (ArrayReference) obj.getValue(field(obj.referenceType(), "elements"));
        Contents c = new Contents("set", intField(obj, "size"));
        if (arr != null) {
            for (Value v : arr.getValues()) {
                if (v != null) c.items.add(v);
                if (c.full()) break;
            }
        }
        return c;
    }

    // ---- maps ------------------------------------------------------------------------------

    private Contents readHashMap(ObjectReference obj) {
        Contents c = new Contents("map", intField(obj, "size"));
        ArrayReference table = (ArrayReference) obj.getValue(field(obj.referenceType(), "table"));
        if (table == null) return c;
        int guard = 0;
        for (Value bucket : table.getValues()) {
            ObjectReference node = (ObjectReference) bucket;
            while (node != null && !c.full() && guard++ < MAX_NODES) {
                Map<String, Value> f = values(node, "key", "value", "next");
                c.entries.add(new Value[] {f.get("key"), f.get("value")});
                node = (ObjectReference) f.get("next");
            }
            if (c.full()) break;
        }
        return c;
    }

    /** LinkedHashMap keeps insertion order through before/after links. */
    private Contents readLinkedHashMap(ObjectReference obj) {
        Contents c = new Contents("map", intField(obj, "size"));
        ObjectReference node = object(obj, "head");
        int guard = 0;
        while (node != null && !c.full() && guard++ < MAX_NODES) {
            Map<String, Value> f = values(node, "key", "value", "after");
            c.entries.add(new Value[] {f.get("key"), f.get("value")});
            node = (ObjectReference) f.get("after");
        }
        return c;
    }

    /** In-order traversal gives TreeMap's sorted order. Each node is fetched in one round trip. */
    private Contents readTreeMap(ObjectReference obj) {
        Contents c = new Contents("map", intField(obj, "size"));
        List<Map<String, Value>> stack = new ArrayList<>();
        ObjectReference node = object(obj, "root");
        int guard = 0;
        while ((node != null || !stack.isEmpty()) && !c.full() && guard++ < MAX_NODES) {
            while (node != null && guard++ < MAX_NODES) {
                Map<String, Value> f = values(node, "key", "value", "left", "right");
                stack.add(f);
                node = (ObjectReference) f.get("left");
            }
            if (stack.isEmpty()) break;
            Map<String, Value> current = stack.remove(stack.size() - 1);
            c.entries.add(new Value[] {current.get("key"), current.get("value")});
            node = (ObjectReference) current.get("right");
        }
        return c;
    }

    /** Map.of(...) with 2+ pairs: keys and values alternate in a probe table with null gaps. */
    private Contents readMapN(ObjectReference obj) {
        ArrayReference table = (ArrayReference) obj.getValue(field(obj.referenceType(), "table"));
        Contents c = new Contents("map", intField(obj, "size"));
        if (table == null) return c;
        List<Value> slots = table.getValues();
        for (int i = 0; i + 1 < slots.size() && !c.full(); i += 2) {
            if (slots.get(i) != null) c.entries.add(new Value[] {slots.get(i), slots.get(i + 1)});
        }
        return c;
    }

    private Contents readMap1(ObjectReference obj) {
        Contents c = new Contents("map", 1);
        c.entries.add(new Value[] {obj.getValue(field(obj.referenceType(), "k0")), obj.getValue(field(obj.referenceType(), "v0"))});
        return c;
    }

    // ---- helpers ---------------------------------------------------------------------------

    private boolean isEmptySentinel(ObjectReference obj, Value v) {
        for (ReferenceType t : obj.virtualMachine().classesByName("java.util.ImmutableCollections")) {
            Field f = t.fieldByName("EMPTY");
            if (f != null && v.equals(t.getValue(f))) return true;
        }
        return false;
    }

    private Map<String, Value> values(ObjectReference obj, String... names) {
        ReferenceType type = obj.referenceType();
        List<Field> fields = new ArrayList<>(names.length);
        for (String n : names) fields.add(field(type, n));
        Map<Field, Value> raw = obj.getValues(fields);
        Map<String, Value> out = new HashMap<>();
        for (int i = 0; i < names.length; i++) out.put(names[i], raw.get(fields.get(i)));
        return out;
    }

    private ObjectReference object(ObjectReference obj, String name) {
        return (ObjectReference) obj.getValue(field(obj.referenceType(), name));
    }

    private int intField(ObjectReference obj, String name) {
        Value v = obj.getValue(field(obj.referenceType(), name));
        return v instanceof IntegerValue i ? i.value() : 0;
    }

    private Field field(ReferenceType type, String name) {
        String key = type.name() + "#" + name;
        Field cached = fieldCache.get(key);
        if (cached != null) return cached;
        ReferenceType t = type;
        while (t != null) {
            Field f = t.fieldByName(name);
            if (f != null) {
                fieldCache.put(key, f);
                return f;
            }
            t = t instanceof ClassType ct ? ct.superclass() : null;
        }
        throw new IllegalStateException("Field not found: " + key);
    }

    private static Set<String> hierarchy(ReferenceType type) {
        Set<String> names = new LinkedHashSet<>();
        ReferenceType t = type;
        while (t != null) {
            names.add(t.name());
            t = t instanceof ClassType ct ? ct.superclass() : null;
        }
        return names;
    }

    /** Friendly class names for JDK-internal implementation classes. */
    static String displayName(String className) {
        return switch (className) {
            case "java.util.ImmutableCollections$ListN", "java.util.ImmutableCollections$List12" -> "List.of";
            case "java.util.ImmutableCollections$SetN", "java.util.ImmutableCollections$Set12" -> "Set.of";
            case "java.util.ImmutableCollections$MapN", "java.util.ImmutableCollections$Map1" -> "Map.of";
            case "java.util.Arrays$ArrayList" -> "Arrays.asList";
            default -> {
                if (className.startsWith("java.util.Collections$Unmodifiable")) yield "Unmodifiable" + className.substring("java.util.Collections$Unmodifiable".length()).replace("RandomAccess", "");
                if (className.startsWith("java.util.Collections$Synchronized")) yield "Synchronized" + className.substring("java.util.Collections$Synchronized".length()).replace("RandomAccess", "");
                yield HeapBuilder.simpleName(className).replace('$', '.');
            }
        };
    }
}
