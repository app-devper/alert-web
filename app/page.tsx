import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="text-5xl">🚨</div>
      <h1 className="text-2xl font-bold">ระบบแจ้งเตือนเหตุฉุกเฉิน</h1>
      <p className="text-slate-600">
        ลูกค้า: สแกน QR Code ของร้านเพื่อลงทะเบียนรับการแจ้งเตือน
      </p>
      <div className="flex flex-col gap-3 w-full">
        <Link
          href="/status"
          className="rounded-xl bg-slate-200 px-6 py-3 font-semibold text-slate-800"
        >
          ตรวจสอบสถานะการลงทะเบียนของฉัน
        </Link>
        <Link
          href="/login"
          className="rounded-xl bg-red-600 px-6 py-3 font-semibold text-white"
        >
          สำหรับพนักงาน — เข้าสู่ระบบ
        </Link>
      </div>
      <p className="text-xs text-slate-400">
        ระบบนี้เป็นช่องทางแจ้งเตือนเสริม ต้องใช้ร่วมกับไซเรนและระบบประกาศเสียงเสมอ
      </p>
    </main>
  );
}
