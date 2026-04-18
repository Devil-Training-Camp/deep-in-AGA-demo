// 对应文章 1.0.2：任务一的示例函数
// Claude Code 会读取这个文件，分析函数逻辑，生成 price.test.ts

interface OrderItem {
  price: number;
  quantity: number;
}

export function calculateTotal(
  items: OrderItem[] | null | undefined,
  discountRate = 0
): number {
  if (!items || items.length === 0) return 0;
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  return subtotal * (1 - discountRate);
}
