export const JAVA_STARTER_CODE = `import java.util.Scanner;

public class Main {
    static int factorial(int n) {
        if (n <= 1) {
            return 1;
        }
        return n * factorial(n - 1);
    }

    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        int[] squares = new int[n];
        for (int i = 0; i < n; i++) {
            squares[i] = i * i;
        }
        System.out.println(n + "! = " + factorial(n));
    }
}
`;

export const JAVA_STARTER_STDIN = "4\n";
