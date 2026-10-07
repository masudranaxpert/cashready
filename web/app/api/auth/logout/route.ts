import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("cr_token");
  res.cookies.delete("cr_role");
  res.cookies.delete("cr_id");
  return res;
}
