'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

type Metrics = {
  counts: {
    products: number;
    orders: number;
    categories: number;
    brands: number;
    users: number;
  };
  ordersByDay: { day: string; count: number }[];
  productsByDay: { day: string; count: number }[];
};

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/dashboard/metrics`);
        if (!res.ok) throw new Error('Metrics fetch failed');
        const data = await res.json();
        setMetrics(data);
      } catch (err: any) {
        setError(err.message || 'Алдаа гарлаа');
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  const chartData = useMemo(() => {
    const orders = metrics?.ordersByDay ?? [];
    const products = metrics?.productsByDay ?? [];
    const map = new Map<string, { day: string; orders: number; products: number }>();
    orders.forEach((o) => {
      map.set(o.day, { day: o.day, orders: o.count, products: 0 });
    });
    products.forEach((p) => {
      const existing = map.get(p.day);
      if (existing) {
        existing.products = p.count;
      } else {
        map.set(p.day, { day: p.day, orders: 0, products: p.count });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.day.localeCompare(b.day));
  }, [metrics]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-muted/50 aspect-video rounded-xl" />
        <div className="bg-muted/50 aspect-video rounded-xl" />
        <div className="bg-muted/50 aspect-video rounded-xl" />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!metrics) return null;

  const cards = [
    { label: 'Бүтээгдэхүүн', value: metrics.counts.products },
    { label: 'Захиалга', value: metrics.counts.orders },
    { label: 'Ангилал', value: metrics.counts.categories },
    { label: 'Брэнд', value: metrics.counts.brands },
    { label: 'Хэрэглэгч', value: metrics.counts.users },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="text-sm text-muted-foreground">{c.label}</div>
            <div className="text-2xl font-semibold mt-2">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="text-sm text-muted-foreground mb-4">Сүүлийн 30 хоног</div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="orders" stroke="#1d3b86" strokeWidth={2} />
              <Line type="monotone" dataKey="products" stroke="#d49943" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
