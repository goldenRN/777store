export default function Footer() {
  return (
    <footer className="mt-10 bg-[var(--navy-900)] text-white">
      <div className="container mx-auto grid gap-8 px-6 py-10 lg:grid-cols-4 sm:grid-cols-2">
        <div>
          <div className="flex items-center gap-3">
            <img src="/logo-777.svg" alt="777 Family Store" className="h-10 w-10" />
            <div className="text-lg font-extrabold">777 Family Store</div>
          </div>
          <p className="mt-3 text-xs opacity-70">2026 © Бүх эрх хуулиар хамгаалагдсан</p>
        </div>
        <div>
          <h4 className="mb-2 text-sm font-semibold">Тусламж</h4>
          <div className="text-xs opacity-80">Хэрэглэгч заавар</div>
          <div className="text-xs opacity-80">Түгээмэл асуулт</div>
        </div>
        <div>
          <h4 className="mb-2 text-sm font-semibold">Чухал холбоос</h4>
          <a className="block text-xs opacity-80" href="#">Бидний тухай</a>
          <a className="block text-xs opacity-80" href="/terms">Үйлчилгээний нөхцөл</a>
          <a className="block text-xs opacity-80" href="#">Нууцлалын бодлого</a>
        </div>
        <div>
          <h4 className="mb-2 text-sm font-semibold">Хаяг, Байршил</h4>
          <div className="text-xs opacity-80">Улаанбаатар хот, БГД 3-р хороо</div>
          <div className="text-xs opacity-80">09:00 - 21:00</div>
        </div>
      </div>
    </footer>
  );
}
