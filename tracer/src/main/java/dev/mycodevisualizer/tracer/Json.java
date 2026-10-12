package dev.mycodevisualizer.tracer;

import java.util.List;
import java.util.Map;

/** Minimal dependency-free JSON serializer for maps, lists, strings, numbers, booleans and null. */
final class Json {
    private Json() {}

    static String write(Object value) {
        StringBuilder sb = new StringBuilder(4096);
        append(sb, value);
        return sb.toString();
    }

    @SuppressWarnings("unchecked")
    private static void append(StringBuilder sb, Object value) {
        if (value == null) {
            sb.append("null");
        } else if (value instanceof String s) {
            appendString(sb, s);
        } else if (value instanceof Boolean || value instanceof Integer || value instanceof Long) {
            sb.append(value);
        } else if (value instanceof Map<?, ?> map) {
            sb.append('{');
            boolean first = true;
            for (Map.Entry<String, Object> e : ((Map<String, Object>) map).entrySet()) {
                if (e.getValue() == null) continue;
                if (!first) sb.append(',');
                first = false;
                appendString(sb, e.getKey());
                sb.append(':');
                append(sb, e.getValue());
            }
            sb.append('}');
        } else if (value instanceof List<?> list) {
            sb.append('[');
            for (int i = 0; i < list.size(); i++) {
                if (i > 0) sb.append(',');
                append(sb, list.get(i));
            }
            sb.append(']');
        } else {
            appendString(sb, value.toString());
        }
    }

    private static void appendString(StringBuilder sb, String s) {
        sb.append('"');
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default -> {
                    if (c < 0x20 || c == 0x2028 || c == 0x2029) {
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
                }
            }
        }
        sb.append('"');
    }
}
