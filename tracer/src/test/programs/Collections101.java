import java.util.*;

public class Collections101 {
    public static void main(String[] args) {
        List<String> names = new ArrayList<>();
        names.add("Ada");
        names.add("Linus");
        names.add(1, "Grace");
        names.set(0, "Alan");
        names.remove("Linus");

        Map<String, Integer> counts = new HashMap<>();
        counts.put("a", 1);
        counts.put("b", 2);
        counts.put("a", counts.get("a") + 1);
        counts.remove("b");

        Set<Integer> seen = new HashSet<>();
        seen.add(5);
        seen.add(5);
        seen.add(9);

        Deque<Integer> stack = new ArrayDeque<>();
        stack.push(1);
        stack.push(2);
        stack.pop();

        Queue<String> queue = new LinkedList<>();
        queue.offer("x");
        queue.offer("y");
        queue.poll();

        Map<String, Integer> sorted = new TreeMap<>();
        sorted.put("pear", 3);
        sorted.put("apple", 7);

        Map<String, Integer> ordered = new LinkedHashMap<>();
        ordered.put("z", 26);
        ordered.put("a", 1);

        Set<String> tree = new TreeSet<>(List.of("c", "a", "b"));
        Stack<Integer> legacy = new Stack<>();
        legacy.push(42);
        PriorityQueue<Integer> pq = new PriorityQueue<>();
        pq.add(3);
        pq.add(1);
        List<Integer> fixed = Arrays.asList(1, 2, 3);
        List<String> one = List.of("solo");
        Map<String, Integer> immutable = Map.of("k", 1, "j", 2);
        List<String> readOnly = Collections.unmodifiableList(names);
        System.out.println(names + " " + counts + " " + seen + " " + stack + " " + queue + " " + sorted + " " + ordered
            + " " + tree + " " + legacy + " " + pq + " " + fixed + " " + one + " " + immutable.size() + " " + readOnly);
    }
}
