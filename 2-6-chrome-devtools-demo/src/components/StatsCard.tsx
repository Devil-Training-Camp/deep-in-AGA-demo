interface StatsCardProps {
  title: string;
  value: string;
  change: string;
  positive: boolean;
}

export default function StatsCard({ title, value, change, positive }: StatsCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="text-sm font-medium text-gray-500">{title}</div>
      <div className="mt-2 text-3xl font-bold text-gray-900">{value}</div>
      <div
        className={`mt-2 text-sm font-medium ${
          positive ? "text-green-600" : "text-red-600"
        }`}
      >
        {change}
      </div>
    </div>
  );
}
