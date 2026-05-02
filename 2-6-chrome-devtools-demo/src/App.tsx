import { useEffect, useState } from "react";
import StatsCard from "./components/StatsCard";
import ProductList from "./components/ProductList";
import RecentOrders from "./components/RecentOrders";

interface UserProfile {
  name: string;
  role: string;
  avatar: string;
}

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    // 模拟异步获取用户信息，延迟 1.5 秒
    setTimeout(() => {
      setProfile({ name: "张管理员", role: "超级管理员", avatar: "Z" });
    }, 1500);
  }, []);

  // BUG: profile 为 null 时直接访问 profile.name 会抛出 TypeError
  // Cannot read properties of null (reading 'name')
  const greeting = `欢迎回来，${profile!.name}`;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">商</span>
              </div>
              <span className="text-lg font-semibold text-gray-900">商品管理后台</span>
            </div>
            <div className="flex items-center gap-3">
              {profile && (
                <>
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-sm font-medium">{profile.avatar}</span>
                  </div>
                  <span className="text-sm text-gray-700">{profile.name}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 欢迎语 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{greeting}</h1>
          <p className="text-gray-500 mt-1">今天是 2024 年 12 月 5 日，查看您的业务概况</p>
        </div>

        {/* 数据统计卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard title="今日销售额" value="¥12,580" change="↑ 8.2% 较昨日" positive={true} />
          <StatsCard title="订单数量" value="128" change="↑ 12 单较昨日" positive={true} />
          <StatsCard title="活跃用户" value="1,024" change="↓ 3.1% 较上周" positive={false} />
          <StatsCard title="商品总数" value="358" change="↑ 5 件新增" positive={true} />
        </div>

        {/* 内容区域：商品列表 + 最近订单 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 商品列表 */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">商品列表</h2>
              {/* BUG: 新增商品按钮文字颜色与背景色相同，按钮不可见（text-blue-600 bg-blue-600） */}
              <button className="bg-blue-600 text-blue-600 px-4 py-2 rounded-lg text-sm font-medium">
                + 新增商品
              </button>
            </div>
            <div className="p-4">
              <ProductList />
            </div>
          </div>

          {/* 最近订单 */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">最近订单</h2>
            </div>
            <div className="p-4">
              <RecentOrders />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
