import Header from "@/components/Header";
import Footer from "@/components/Footer";
const deals = [
  { discount: "-70%", title: "American Tourister...", price: "847,000₮", old: "1,285,000₮" },
  { discount: "-59%", title: "American Tourister...", price: "564,200₮", old: "1,373,000₮" },
  { discount: "-44%", title: "American Tourister...", price: "777,700₮", old: "1,399,000₮" },
  { discount: "-65%", title: "American Tourister...", price: "917,700₮", old: "2,587,700₮" },
];

const products = [
  { title: "Weatherproof...", price: "121,200₮", old: "538,400₮" },
  { title: "Skovlunde Dining...", price: "2,386,700₮" },
  { title: "Pyunkang Yul...", price: "45,000₮", old: "60,100₮" },
  { title: "ETM416...", price: "25,800₮" },
];

const categories = [
  "Хувцас",
  "Хүнс",
  "Гэр ахуй",
  "Гоо сайхан",
  "Электрон",
  "Нэмэлт",
  "Бусад",
  "Мото",
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--sky-50)]">
      <Header />

      <main className="container mx-auto px-6">
        <section className="grid gap-6 py-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div
            className="relative overflow-hidden rounded-[28px] bg-white p-10 shadow-2xl"
            style={{
              backgroundImage:
                "linear-gradient(120deg, rgba(255,197,119,0.18), rgba(255,255,255,0.95)), url('https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=60')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-xs font-semibold text-[var(--navy-800)]">
              🛵 Мото бараа
            </div>
            <h1 className="text-3xl font-bold text-[var(--gray-900)]">Та чанарыг мэдэр...</h1>
            <p className="mt-3 max-w-sm text-sm text-[var(--gray-700)]">
              100% оригинал бараа, бодит зураг, шуурхай хүргэлттэй.
            </p>
            <button className="mt-6 rounded-full bg-white px-6 py-3 text-sm font-bold text-[var(--navy-900)] shadow">
              Цааш үзэх →
            </button>
            <div className="mt-8 flex flex-wrap gap-3">
              {['Yamaha', 'Honda', 'Motoshop', 'Alpinestars'].map((brand) => (
                <span
                  key={brand}
                  className="rounded-full bg-white/85 px-4 py-2 text-xs font-semibold text-[var(--navy-800)] shadow"
                >
                  {brand}
                </span>
              ))}
            </div>
          </div>
          <div className="grid gap-4">
            <div className="rounded-[28px] bg-[linear-gradient(160deg,#111111,#2a2a2a)] p-6 text-white shadow-xl">
              <span className="text-xs opacity-70">Онцгой хямдрал</span>
              <h3 className="mt-2 text-xl font-semibold">LIVE бараа шинэчлэгдлээ</h3>
              <p className="mt-2 text-sm opacity-80">24 цагийн дотор дуусах hot deal.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white p-4 shadow">
                <div className="text-xs text-[var(--gray-500)]">Шинэ захиалга</div>
                <div className="text-lg font-bold">128</div>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow">
                <div className="text-xs text-[var(--gray-500)]">Дундаж хүргэлт</div>
                <div className="text-lg font-bold">3.2 өдөр</div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-6">
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-2xl font-bold">Онцлох бараа</h2>
            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-[var(--accent)]">
              🔥 06:19:49
            </span>
          </div>
          <div className="grid gap-4 lg:grid-cols-4 sm:grid-cols-2">
            {deals.map((deal) => (
              <div key={deal.title} className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow">
                <span className="inline-flex w-fit rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-[var(--accent)]">
                  {deal.discount}
                </span>
                <div className="grid h-40 place-items-center rounded-xl bg-[var(--sky-100)] text-sm font-bold text-[var(--navy-800)]">
                  Suitcase
                </div>
                <strong className="text-sm">{deal.title}</strong>
                <div>
                  <span className="text-lg font-bold text-[var(--accent)]">{deal.price}</span>
                  {deal.old && (
                    <span className="ml-2 text-xs text-[var(--gray-500)] line-through">
                      {deal.old}
                    </span>
                  )}
                </div>

              </div>
            ))}
          </div>
        </section>

        <section className="py-6">
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-2xl font-bold">Онцгой хямдрал</h2>
            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-[var(--accent)]">
              🔥 06:19:49
            </span>
          </div>
          <div className="grid gap-4 lg:grid-cols-4 sm:grid-cols-2">
            {deals.map((deal) => (
              <div key={deal.title} className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow">
                <span className="inline-flex w-fit rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-[var(--accent)]">
                  {deal.discount}
                </span>
                <div className="grid h-40 place-items-center rounded-xl bg-[var(--sky-100)] text-sm font-bold text-[var(--navy-800)]">
                  Suitcase
                </div>
                <strong className="text-sm">{deal.title}</strong>
                <div>
                  <span className="text-lg font-bold text-[var(--accent)]">{deal.price}</span>
                  {deal.old && (
                    <span className="ml-2 text-xs text-[var(--gray-500)] line-through">
                      {deal.old}
                    </span>
                  )}
                </div>
                <button className="rounded-full bg-black py-2 text-sm font-semibold text-white">
                  Захиалга
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="py-6">
          <h2 className="mb-4 text-2xl font-bold"> Ангилалууд</h2>
          <div className="grid gap-3 lg:grid-cols-8 sm:grid-cols-4 grid-cols-2">
            {categories.map((cat) => (
              <div key={cat} className="rounded-full bg-white px-4 py-3 text-center text-xs font-semibold shadow">
                {cat}
              </div>
            ))}
          </div>
        </section>

        <section className="py-6">
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-2xl font-bold">Бүх бараа</h2>
            <span className="rounded-full bg-[var(--sky-100)] px-3 py-1 text-xs font-semibold text-[var(--navy-800)]">
              Нийт: 40
            </span>
          </div>
          <div className="grid gap-4 lg:grid-cols-4 sm:grid-cols-2">
            {products.map((item) => (
              <div key={item.title} className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow">
                <div className="grid h-40 place-items-center rounded-xl bg-[var(--sky-100)] text-sm font-bold text-[var(--navy-800)]">
                  Product
                </div>
                <strong className="text-sm">{item.title}</strong>
                <div>
                  <span className="text-lg font-bold text-[var(--accent)]">{item.price}</span>
                  {item.old && (
                    <span className="ml-2 text-xs text-[var(--gray-500)] line-through">
                      {item.old}
                    </span>
                  )}
                </div>
                <button className="rounded-full bg-black py-2 text-sm font-semibold text-white">
                  Захиалга
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div >
  );
}
