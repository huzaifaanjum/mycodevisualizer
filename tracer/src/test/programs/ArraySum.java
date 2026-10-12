public class ArraySum {
    public static void main(String[] args) {
        int[] nums = {3, 1, 4};
        int[] alias = nums;
        int sum = 0;
        for (int i = 0; i < nums.length; i++) {
            sum += nums[i];
        }
        alias[0] = 10;
        String msg = "Sum: " + sum;
        System.out.println(msg);
    }
}
