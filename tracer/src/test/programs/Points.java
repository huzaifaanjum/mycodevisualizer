class Point {
    int x;
    int y;
    Point(int x, int y) { this.x = x; this.y = y; }
}

public class Points {
    public static void main(String[] args) {
        Point p = new Point(1, 2);
        Point q = p;
        q.x = 5;
        Integer boxed = 7;
        char c = 'a';
        double d = 2.5;
        System.out.println(p.x + " " + boxed + c + d);
    }
}
