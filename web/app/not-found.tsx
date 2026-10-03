import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-md mx-auto py-16 text-center space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">পৃষ্ঠাটি পাওয়া যায়নি / Page Not Found</h2>
        <p className="text-slate-400 mt-1">অনুরোধকৃত পৃষ্ঠাটি বিদ্যমান নেই। The requested page does not exist.</p>
      </div>
      <div>
        <Link href="/agent" className="btn-primary">
          আজকের প্ল্যান দেখুন / View Today&apos;s Plan
        </Link>
      </div>
    </div>
  );
}
