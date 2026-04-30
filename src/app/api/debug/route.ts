import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    env: {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || null,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "set" : "MISSING",
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? "set" : "MISSING",
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? "set" : "MISSING",
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? "set" : "MISSING",
      DATABASE_URL: process.env.DATABASE_URL ? "set" : "MISSING",
      NODE_ENV: process.env.NODE_ENV || null,
    },
  });
}
