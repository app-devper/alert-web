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

Env ตัวเดียว: `NEXT_PUBLIC_API_URL=https://api.devper.app` (host ของ um-api และ default host)
— ALERT API host ตัวจริง resolve ตอน runtime จาก UM system record (`GET /auth/system`)
หลัง staff login; ถ้าดึงไม่ได้/ยังไม่ login ใช้ default host เดียวกันนี้ ต่อ path `/api/alert/v1`

ข้อจำกัด static export: ไม่มี middleware / dynamic route handlers / ISR
Service worker สำหรับ Web Push อยู่ที่ `public/sw.js` (iOS Safari ต้อง Add to Home Screen ก่อน)

## Agent skills

The generic Claude Code / Codex skills (`coding-standards`, `tdd-workflow`,
`grilling`, …) and the `ecc` rules are not in this repo. Every app-devper
repo shares them from [app-devper/agent-skills](https://github.com/app-devper/agent-skills):
clone it and run its `install.sh` once per machine. Only the skills about this
repo live in `.claude/skills/`: `dev-flow`, `git-flow`, `pr`.
