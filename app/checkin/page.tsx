import { Suspense } from "react";
import CheckinFlow from "./CheckinFlow";

export default function CheckinPage() {
  return (
    <Suspense
      fallback={<main className="p-6 text-center text-slate-500">กำลังโหลด…</main>}
    >
      <CheckinFlow />
    </Suspense>
  );
}
