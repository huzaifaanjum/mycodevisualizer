public class OutOfBounds {
    public static void main(String[] args) {
        int[] a = new int[2];
        System.out.println("before");
        a[5] = 1;
        System.out.println("after");
    }
}
