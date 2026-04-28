'use client';
import { Suspense } from "react";
import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';
import {
  Banknote,
  Boxes,
  ClipboardList,
  PackageCheck,
  PackageOpen,
  Truck,
  Users,
  Tags,
  Layers3,
  AlertTriangle,
  RotateCcw,
  Ban,
} from 'lucide-react';
import { getActorHeaders } from '@/lib/actorHeaders';

type Metrics = {
  generatedAt: string;
  counts: {
    products: number;
    readyProducts: number;
    preorderProducts: number;
    liveProducts: number;
    discountedProducts: number;
    lowStockProducts: number;
    openPreorderProducts: number;
    awaitingArrivalProducts: number;
    orders: number;
    paidOrders: number;
    unpaidOrders: number;
    deletedOrders: number;
    categories: number;
    brands: number;
    users: number;
  };
  sales: {
    totalRevenue: number;
    monthRevenue: number;
    todayRevenue: number;
    averageOrderValue: number;
  };
  cargo: {
    remainingFee: number;
  };
  pipeline: {
    pending: number;
    arrived: number;
    shipping: number;
    delivered: number;
    returned: number;
    cancelled: number;
  };
  todayActivity: {
    shipping: number;
    returned: number;
    delivered: number;
  };
  topOrderedProducts: {
    id: number;
    name: string;
    orderedQty: number;
    kind: 'ready' | 'preorder' | 'live';
  }[];
  trend: {
    day: string;
    orders: number;
    revenue: number;
    products: number;
  }[];
  paymentBreakdown: { label: string; count: number }[];
  recentOrders: {
    id: number;
    name: string;
    phone: string;
    total: number;
    status: string;
    normalized_status: string;
    payment_status: string | null;
    order_kind: string | null;
    created_at: string;
  }[];
};

const formatMoney = (value: number) => `${Number(value || 0).toLocaleString()}₮`;

const metricCardClass =
  'rounded-2xl border border-white/60 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md';

const kindLabel = (kind: 'ready' | 'preorder' | 'live') => {
  if (kind === 'preorder') return 'Захиалгын бараа';
  if (kind === 'live') return 'Лайв бараа';
  return 'Бэлэн бараа';
};

const statusPillClass = (status: string) => {
  const key = String(status || '').toLowerCase();
  if (key.includes('shipping') || key.includes('хүргэлт')) {
    return 'bg-blue-100 text-blue-700';
  }
  if (key.includes('deliver') || key.includes('олгосон')) {
    return 'bg-emerald-100 text-emerald-700';
  }
  if (key.includes('return') || key.includes('буца')) {
    return 'bg-amber-100 text-amber-700';
  }
  if (key.includes('cancel') || key.includes('цуц')) {
    return 'bg-rose-100 text-rose-700';
  }
  if (key.includes('arrive') || key.includes('ирсэн')) {
    return 'bg-violet-100 text-violet-700';
  }
  return 'bg-gray-100 text-gray-700';
};

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/dashboard/metrics`, {
          headers: { ...getActorHeaders() },
        });
        if (!res.ok) throw new Error('Dashboard metrics fetch failed');
        const data = await res.json();
        setMetrics(data);
      } catch (err: any) {
        setError(err?.message || 'Dashboard уншихад алдаа гарлаа');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  const chartData = useMemo(() => metrics?.trend ?? [], [metrics]);

  if (loading) {
    return (
      <Suspense fallback={null}>
        <div className="space-y-6 p-4 md:p-6">
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-32 animate-pulse rounded-2xl bg-gray-100" />
            ))}
          </div>
          <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
            <div className="h-96 animate-pulse rounded-2xl bg-gray-100" />
            <div className="h-96 animate-pulse rounded-2xl bg-gray-100" />
          </div>
        </div>
      </Suspense>
    );
  }

  if (error) {
    return <Suspense fallback={null}><div className="p-6 text-sm text-red-600">{error}</div></Suspense>;
  }

  if (!metrics) return null;

  const topCards = [
    {
      label: 'Нийт борлуулалт',
      value: formatMoney(metrics.sales.totalRevenue),
      help: `Төлөгдсөн ${metrics.counts.paidOrders} захиалга`,
      icon: Banknote,
      accent: 'from-[#fff3ed] to-white text-[#c61d14]',
    },
    {
      label: 'Энэ сарын орлого',
      value: formatMoney(metrics.sales.monthRevenue),
      help: `Өнөөдөр ${formatMoney(metrics.sales.todayRevenue)}`,
      icon: ClipboardList,
      accent: 'from-[#eef4ff] to-white text-[#2754c5]',
    },
    {
      label: 'Нийт бараа',
      value: metrics.counts.products.toLocaleString(),
      help: `Бэлэн ${metrics.counts.readyProducts} / Захиалгын ${metrics.counts.preorderProducts}`,
      icon: Boxes,
      accent: 'from-[#f1fff8] to-white text-[#0f8b57]',
    },
    {
      label: 'Нийт хэрэглэгч',
      value: metrics.counts.users.toLocaleString(),
      help: `Ангилал ${metrics.counts.categories} • Брэнд ${metrics.counts.brands}`,
      icon: Users,
      accent: 'from-[#fff7ea] to-white text-[#9a6700]',
    },
  ];

  const pipelineCards = [
    { label: 'Хүлээгдэж буй', value: metrics.pipeline.pending, icon: ClipboardList, tone: 'bg-slate-100 text-slate-700' },
    { label: 'Бараа ирсэн', value: metrics.pipeline.arrived, icon: PackageOpen, tone: 'bg-violet-100 text-violet-700' },
    { label: 'Хүргэлтэнд', value: metrics.pipeline.shipping, icon: Truck, tone: 'bg-blue-100 text-blue-700' },
    { label: 'Олгогдсон', value: metrics.pipeline.delivered, icon: PackageCheck, tone: 'bg-emerald-100 text-emerald-700' },
    { label: 'Буцаагдсан', value: metrics.pipeline.returned, icon: RotateCcw, tone: 'bg-amber-100 text-amber-700' },
    { label: 'Цуцлагдсан', value: metrics.pipeline.cancelled, icon: Ban, tone: 'bg-rose-100 text-rose-700' },
  ];

  const productCards = [
    { label: 'Бэлэн бараа', value: metrics.counts.readyProducts, help: 'Шууд худалдаанд байгаа бараа' },
    { label: 'Захиалгын бараа', value: metrics.counts.preorderProducts, help: `Нээлттэй ${metrics.counts.openPreorderProducts}` },
    { label: 'Лайв бараа', value: metrics.counts.liveProducts, help: 'Live ангиллын бараа' },
    { label: 'Хямдралтай', value: metrics.counts.discountedProducts, help: 'Хямдрал идэвхтэй бараа' },
    { label: 'Үлдэгдэл бага', value: metrics.counts.lowStockProducts, help: '10-аас доош үлдэгдэлтэй' },
    { label: 'Ирээгүй захиалга', value: metrics.counts.awaitingArrivalProducts, help: 'Ирэхийг хүлээж буй preorder' },
  ];

  const todayCards = [
    {
      label: 'Үлдсэн карго',
      value: formatMoney(metrics.cargo.remainingFee),
      help: 'Ирсэн болсон бараа/төрлүүд дээр бүртгэгдсэн карго',
      tone: 'bg-slate-50 text-slate-900',
      icon: Truck,
    },
    {
      label: 'Өнөөдрийн хүргэлт',
      value: metrics.todayActivity.shipping.toLocaleString(),
      help: `Олгосон ${metrics.todayActivity.delivered.toLocaleString()} бараа`,
      tone: 'bg-blue-50 text-blue-900',
      icon: PackageCheck,
    },
    {
      label: 'Өнөөдрийн буцаалт',
      value: metrics.todayActivity.returned.toLocaleString(),
      help: 'Буцаалтын цонхоор тэмдэглэсэн бараа',
      tone: 'bg-rose-50 text-rose-900',
      icon: RotateCcw,
    },
  ];

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div className="space-y-6 p-4 md:p-6">
        <section className="overflow-hidden rounded-[28px] border border-[#f3d3d0] bg-[linear-gradient(135deg,#fff7f5_0%,#ffffff_45%,#fff7ef_100%)] p-6 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#c61d14] shadow-sm">
                <Layers3 className="h-4 w-4" />
                777 Family Store Dashboard
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
                Өдөр тутмын ажиллагааг нэг дороос хяная
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Борлуулалт, захиалгын урсгал, барааны үлдэгдэл, хүргэлтийн төлөв болон сүүлийн захиалгуудыг
                нэг дороос хурдан харахаар цэгцэллээ.
              </p>
            </div>

            <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 text-sm shadow-sm backdrop-blur">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Сүүлийн шинэчлэлт</div>
              <div className="mt-1 font-semibold text-slate-900">
                {new Date(metrics.generatedAt).toLocaleString('mn-MN')}
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Нийт захиалга: {metrics.counts.orders.toLocaleString()} • Устгасан: {metrics.counts.deletedOrders.toLocaleString()}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {topCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className={`${metricCardClass} bg-gradient-to-br ${card.accent}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-slate-600">{card.label}</div>
                    <div className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{card.value}</div>
                    <div className="mt-2 text-xs text-slate-500">{card.help}</div>
                  </div>
                  <div className="rounded-2xl bg-white/80 p-3 shadow-sm">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {productCards.map((card) => (
            <div key={card.label} className={metricCardClass}>
              <div className="text-sm font-medium text-slate-600">{card.label}</div>
              <div className="mt-3 text-2xl font-bold text-slate-900">{card.value.toLocaleString()}</div>
              <div className="mt-2 text-xs text-slate-500">{card.help}</div>
            </div>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_1.35fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Truck className="h-5 w-5 text-[#2754c5]" />
              Өнөөдрийн үйл ажиллагаа
            </div>
            <div className="grid gap-3">
              {todayCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className={`rounded-2xl p-4 ${card.tone}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium opacity-80">{card.label}</div>
                        <div className="mt-2 text-2xl font-bold">{card.value}</div>
                        <div className="mt-1 text-xs opacity-70">{card.help}</div>
                      </div>
                      <div className="rounded-2xl bg-white/70 p-3 shadow-sm">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Хамгийн их захиалагдсан бараа</h2>
                <p className="text-sm text-slate-500">Одоогийн `ordered_qty`-аар хамгийн өндөр үзүүлэлттэй бараанууд.</p>
              </div>
              <div className="rounded-full bg-[#fff5f3] px-3 py-1 text-xs font-semibold text-[#c61d14]">
                Top {Math.max(metrics.topOrderedProducts.length, 1)}
              </div>
            </div>

            {metrics.topOrderedProducts.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">
                Захиалгын тоо бүртгэгдсэн бараа одоогоор алга.
              </div>
            ) : (
              <div className="space-y-3">
                {metrics.topOrderedProducts.map((product, index) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#fff0ec] text-sm font-bold text-[#c61d14]">
                        #{index + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{product.name}</div>
                        <div className="mt-1 text-xs text-slate-500">{kindLabel(product.kind)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-slate-900">{product.orderedQty.toLocaleString()}</div>
                      <div className="mt-1 text-xs text-slate-500">захиалагдсан</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Захиалгын урсгал</h2>
              <p className="text-sm text-slate-500">Одоогийн байдлаар захиалга ямар төлөв дээр төвлөрч байгааг харуулна.</p>
            </div>
            <div className="text-sm text-slate-500">Дундаж захиалга: {formatMoney(metrics.sales.averageOrderValue)}</div>
          </div>
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            {pipelineCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <div className={`inline-flex rounded-xl p-2 ${card.tone}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="mt-3 text-sm font-medium text-slate-600">{card.label}</div>
                  <div className="mt-2 text-2xl font-bold text-slate-900">{card.value.toLocaleString()}</div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Сүүлийн 30 хоногийн хөдөлгөөн</h2>
                <p className="text-sm text-slate-500">Захиалга, орлого, шинээр нэмсэн барааны тренд.</p>
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eceff3" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: any, name: any) => {
                      const numericValue = Number(value || 0);
                      if (name === 'revenue') return [formatMoney(numericValue), 'Орлого'];
                      if (name === 'products') return [numericValue, 'Шинэ бараа'];
                      return [numericValue, 'Захиалга'];
                    }}
                  />
                  <Line type="monotone" dataKey="orders" name="orders" stroke="#c61d14" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="products" name="products" stroke="#1f7a5a" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="revenue" name="revenue" stroke="#2754c5" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                <Tags className="h-5 w-5 text-[#c61d14]" />
                Төлбөрийн төрлийн тархалт
              </div>
              <div className="space-y-3">
                {metrics.paymentBreakdown.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Төлөгдсөн захиалгын мэдээлэл алга.</div>
                ) : (
                  metrics.paymentBreakdown.map((row, index) => {
                    const max = metrics.paymentBreakdown[0]?.count || 1;
                    return (
                      <div key={row.label} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-700">{row.label}</span>
                          <span className="text-slate-500">{row.count}</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100">
                          <div
                            className="h-2 rounded-full bg-[linear-gradient(90deg,#c61d14,#f08c5d)]"
                            style={{ width: `${Math.max((row.count / max) * 100, 8)}%` }}
                          />
                        </div>
                        {index < metrics.paymentBreakdown.length - 1 ? <div className="border-b border-dashed border-slate-100" /> : null}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Анхаарах үзүүлэлт
              </div>
              <div className="grid gap-3">
                <div className="rounded-2xl bg-amber-50 p-4">
                  <div className="text-sm font-medium text-amber-900">Үлдэгдэл бага бараа</div>
                  <div className="mt-2 text-2xl font-bold text-amber-700">{metrics.counts.lowStockProducts.toLocaleString()}</div>
                </div>
                <div className="rounded-2xl bg-sky-50 p-4">
                  <div className="text-sm font-medium text-sky-900">Ирээгүй preorder бараа</div>
                  <div className="mt-2 text-2xl font-bold text-sky-700">{metrics.counts.awaitingArrivalProducts.toLocaleString()}</div>
                </div>
                <div className="rounded-2xl bg-rose-50 p-4">
                  <div className="text-sm font-medium text-rose-900">Төлөгдөөгүй захиалга</div>
                  <div className="mt-2 text-2xl font-bold text-rose-700">{metrics.counts.unpaidOrders.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Орлогын график</h2>
                <p className="text-sm text-slate-500">Өдөр бүрийн төлөгдсөн захиалгын нийт дүн.</p>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="revenueFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#2754c5" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#2754c5" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eceff3" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
                  <Tooltip formatter={(value: any) => [formatMoney(Number(value || 0)), 'Орлого']} />
                  <Area type="monotone" dataKey="revenue" stroke="#2754c5" fill="url(#revenueFill)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Сүүлийн захиалгууд</h2>
                <p className="text-sm text-slate-500">Сүүлд бүртгэгдсэн захиалгуудын товч мэдээлэл.</p>
              </div>
            </div>

            <div className="space-y-3">
              {metrics.recentOrders.map((order) => (
                <div key={order.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900">Захиалга #{order.id}</div>
                      <div className="mt-1 text-sm text-slate-600">
                        {order.name} • {order.phone}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusPillClass(order.normalized_status)}`}>
                          {order.status}
                        </span>
                        <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {order.payment_status || 'Төлөвгүй'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900">{formatMoney(order.total)}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {new Date(order.created_at).toLocaleString('mn-MN')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </Suspense>
  );
}
