import type { APIRoute } from "astro";
import { checkPassword, setSessionCookie } from "../../../lib/auth";
import { createSession } from "../../../lib/db";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
	const form = await request.formData();
	const password = String(form.get("password") ?? "");

	let ok: boolean;
	try {
		ok = checkPassword(password);
	} catch {
		return new Response("El servidor no tiene configurada la contraseña de admin (ADMIN_PASSWORD).", {
			status: 500,
		});
	}

	if (!ok) {
		return redirect("/panel-air29k/login?error=1");
	}

	const { token, expiresAt } = await createSession();
	setSessionCookie(cookies, token, expiresAt);
	return redirect("/panel-air29k");
};
