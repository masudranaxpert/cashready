import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("cr_token")?.value;
  const role = req.cookies.get("cr_role")?.value || null;
  const id = req.cookies.get("cr_id")?.value || null;

  return NextResponse.json({
    authenticated: Boolean(token),
    role,
    id,
  });
}
