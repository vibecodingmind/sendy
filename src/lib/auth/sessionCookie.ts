import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "./session";

export function attachSessionCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
