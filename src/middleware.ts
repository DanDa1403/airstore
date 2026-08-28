import { defineMiddleware } from "astro:middleware";
import { isValidSession } from "./lib/db";
import { getSessionToken } from "./lib/auth";

const PANEL_PATH = "/panel-air29k";

export const onRequest = defineMiddleware(async (context, next) => {
	const { pathname } = context.url;

	const isPanelApi = pathname.startsWith("/api/admin") && pathname !== "/api/admin/login";
	const isPanelPage = pathname.startsWith(PANEL_PATH) && pathname !== `${PANEL_PATH}/login`;

	if (isPanelApi || isPanelPage) {
		const token = getSessionToken(context.cookies);
		const authenticated = await isValidSession(token);

		if (!authenticated) {
			if (isPanelApi) {
				return new Response(JSON.stringify({ error: "No autorizado" }), {
					status: 401,
					headers: { "Content-Type": "application/json" },
				});
			}
			return context.redirect(`${PANEL_PATH}/login`);
		}
	}

	return next();
});
