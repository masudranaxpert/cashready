import { NextRequest, NextResponse } from "next/server";

const INTERNAL_API_URL =
  process.env.API_INTERNAL_URL || process.env.INTERNAL_API_URL || "http://api:8100";

async function proxyHandler(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const pathSegments = params.path || [];
  const subPath = pathSegments.join("/");
  const queryString = req.nextUrl.search;
  const targetUrl = `${INTERNAL_API_URL}/${subPath}${queryString}`;

  const forwardHeaders = new Headers();
  req.headers.forEach((value, key) => {
    // Avoid overriding host or hop-by-hop headers
    if (key.toLowerCase() !== "host") {
      forwardHeaders.set(key, value);
    }
  });

  // Public paths bypass authentication token forwarding
  const publicEndpoints = ["openapi.json", "docs", "health", "version", "scalar", "redoc"];
  const isPublic = publicEndpoints.some((p) => subPath.startsWith(p));

  if (!isPublic) {
    const token = req.cookies.get("cr_token")?.value;
    if (token) {
      forwardHeaders.set("Authorization", `Bearer ${token}`);
    }
  }

  try {
    const method = req.method;
    const body =
      method !== "GET" && method !== "HEAD" ? await req.text() : undefined;

    const backendResponse = await fetch(targetUrl, {
      method,
      headers: forwardHeaders,
      body,
      redirect: "manual",
    });

    const responseHeaders = new Headers(backendResponse.headers);
    return new NextResponse(backendResponse.body, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: responseHeaders,
    });
  } catch (err: unknown) {
    console.error(`API proxy error forwarding to ${targetUrl}:`, err);
    return NextResponse.json(
      {
        detail: "API backend proxy connection failed",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 502 }
    );
  }
}

export const GET = proxyHandler;
export const POST = proxyHandler;
export const PUT = proxyHandler;
export const DELETE = proxyHandler;
export const OPTIONS = proxyHandler;
