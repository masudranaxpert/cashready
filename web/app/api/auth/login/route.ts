import { NextRequest, NextResponse } from "next/server";

const DEMO_TOKENS: Record<string, { token: string; role: string; id: string }> = {
  admin: {
    token: "demo-admin-token",
    role: "admin",
    id: "admin",
  },
  manager: {
    token: "demo-manager-token",
    role: "manager",
    id: "A01",
  },
  agent: {
    token: "demo-agent-token",
    role: "agent",
    id: "T0039",
  },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const roleKey = (body.role || "admin").toLowerCase();
    const account = DEMO_TOKENS[roleKey] || DEMO_TOKENS.admin;

    const res = NextResponse.json({
      ok: true,
      role: account.role,
      id: account.id,
    });

    const isProd = process.env.NODE_ENV === "production";
    const maxAge = 8 * 60 * 60; // 8 hours

    // httpOnly cookie storing bearer token securely
    res.cookies.set("cr_token", account.token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge,
      path: "/",
    });

    // Client-accessible cookies for UI state awareness
    res.cookies.set("cr_role", account.role, {
      httpOnly: false,
      secure: isProd,
      sameSite: "lax",
      maxAge,
      path: "/",
    });

    res.cookies.set("cr_id", account.id, {
      httpOnly: false,
      secure: isProd,
      sameSite: "lax",
      maxAge,
      path: "/",
    });

    return res;
  } catch (err) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }
}
