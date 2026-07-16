# alert-web

Frontend ของระบบแจ้งเตือนเหตุฉุกเฉิน (devper-alert) — Next.js static export

สองโซน:

1. **ลูกค้า (PWA, ไม่ต้อง login)** — `/checkin?token=<qr>` ฟอร์มลงทะเบียน → OTP →
   สำเร็จ (+ เปิด Web Push ได้), `/status` หน้าสถานะ/เช็กเอาต์/ถอนความยินยอม (PDPA)
2. **พนักงาน (login ผ่าน um-api)** — `/login`, `/dashboard` ปุ่มแจ้งเหตุ + ยืนยันสองขั้นตอน
   (กดค้าง 3 วินาที / Emergency PIN) + ผลการส่งต่อช่องทาง, `/dashboard/checkins`,
   `/dashboard/history`, `/admin` (templates / settings / QR / permissions)

## Run

```bash
npm install
npm run dev          # :3000
npm run build        # static export → out/
npm run lint
```

ต้องตั้ง `NEXT_PUBLIC_ALERT_API_URL` และ `NEXT_PUBLIC_UM_API_URL` ตอน build
(ดู `.env.example`)

ข้อจำกัด static export: ไม่มี middleware / dynamic route handlers / ISR
Service worker สำหรับ Web Push อยู่ที่ `public/sw.js` (iOS Safari ต้อง Add to Home Screen ก่อน)
