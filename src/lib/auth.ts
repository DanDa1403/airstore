import { timingSafeEqual } from "node:crypto";
import type { AstroCookies } from "astro";

const SESSION_COOKIE = "admin_session";

export function checkPassword(input: string): boolean {
	const expected = import.meta.env.ADMIN_PASSWORD ?? process.env.ADMIN_PASSWORD;
	if (!expected) {
		throw new Error(
			"ADMIN_PASSWORD no está configurada. Defínela como variable de entorno antes de iniciar el servidor."
		);
	}
	const a = Buffer.from(input);
	const b = Buffer.from(expected);
	if (a.length !== b.length) return false;
	return timingSafeEqual(a, b);
}

export function setSessionCookie(cookies: AstroCookies, token: string, expiresAt: Date) {
	cookies.set(SESSION_COOKIE, token, {
		path: "/",
		httpOnly: true,
		secure: import.meta.env.PROD,
		sameSite: "lax",
		expires: expiresAt,
	});
}

export function clearSessionCookie(cookies: AstroCookies) {
	cookies.delete(SESSION_COOKIE, { path: "/" });
}

export function getSessionToken(cookies: AstroCookies): string | undefined {
	return cookies.get(SESSION_COOKIE)?.value;
}

export { SESSION_COOKIE };
