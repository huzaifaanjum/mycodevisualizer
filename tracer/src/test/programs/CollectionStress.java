import java.util.*;

public class CollectionStress {
    public static void main(String[] args) {
        List<Integer> list = new ArrayList<>();
        Map<Integer, Integer> squares = new HashMap<>();
        Set<String> words = new TreeSet<>();
        for (int i = 0; i < 300; i++) {
            list.add(i);
            squares.put(i % 60, i * i);
            words.add("w" + (i % 70));
        }
        System.out.println(list.size() + " " + squares.size() + " " + words.size());
    }
}
