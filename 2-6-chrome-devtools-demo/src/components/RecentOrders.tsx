import { useEffect, useState } from "react";

interface Order {
  id: string;
  customer: string;
  amount: number;
  status: "pending" | "shipped" | "delivered";
  date: string;
}

const STATUS_LABELS = {
  pending: { text: "待发货", className: "bg-yellow-100 text-yellow-800" },
  shipped: { text: "已发货", className: "bg-blue-100 text-blue-800" },
  delivered: { text: "已完成", className: "bg-green-100 text-green-800" },
};

export default function RecentOrders() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    setTimeout(() => {
      setOrders([
        { id: "ORD-2024-001", customer: "张三", amount: 598, status: "delivered", date: "2024-12-01" },
        { id: "ORD-2024-002", customer: "李四", amount: 2499, status: "shipped", date: "2024-12-02" },
        { id: "ORD-2024-003", customer: "王五", amount: 299, status: "pending", date: "2024-12-03" },
        { id: "ORD-2024-004", customer: "赵六", amount: 1488, status: "delivered", date: "2024-12-04" },
        { id: "ORD-2024-005", customer: "陈七", amount: 789, status: "shipped", date: "2024-12-05" },
      ]);
    }, 600);
  }, []);

  return (
    <div className="space-y-3">
      {orders.map((order) => {
        const status = STATUS_LABELS[order.status];
        return (
          <div key={order.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
            <div>
              <div className="text-sm font-medium text-gray-900">{order.id}</div>
              <div className="text-xs text-gray-500">{order.customer} · {order.date}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${status.className}`}>
                {status.text}
              </span>
              <span className="text-sm font-medium text-gray-900">¥{order.amount}</span>
            </div>
          </div>
        );
      })}
      {orders.length === 0 && (
        <div className="text-center text-gray-400 py-8">加载中...</div>
      )}
    </div>
  );
}
