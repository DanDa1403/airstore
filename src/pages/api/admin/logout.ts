import type { APIRoute } from "astro";
import { clearSessionCookie, getSessionToken } from "../../../lib/auth";
import { deleteSession } from "../../../lib/db";

export const prerender = false;

export const POST: APIRoute = async ({ cookies, redirect }) => {
	const token = getSessionToken(cookies);
	if (token) await deleteSession(token);
	clearSessionCookie(cookies);
	return redirect("/panel-air29k/login");
};
