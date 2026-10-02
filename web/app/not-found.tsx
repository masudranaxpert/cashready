import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-md mx-auto py-16 text-center">
      <h2 className="text-2xl font-bold text-slate-900 mb-2">পৃষ্ঠাটি পাওয়া যায়নি</h2>
      <p className="text-slate-500 mb-6">অনুরোধকৃত পৃষ্ঠাটি বিদ্যমান নেই।</p>
      <Link href="/agent" className="btn-primary">
        আজকের প্ল্যান দেখুন
      </Link>
    </div>
  );
}
