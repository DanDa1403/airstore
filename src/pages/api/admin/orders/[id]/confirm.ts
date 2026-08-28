import type { APIRoute } from "astro";
import { confirmOrder } from "../../../../../lib/db";

export const prerender = false;

export const POST: APIRoute = async ({ params, redirect }) => {
	const id = Number(params.id);

	try {
		await confirmOrder(id);
	} catch (err) {
		const message = err instanceof Error ? err.message : "Error desconocido";
		return redirect(`/panel-air29k?error=${encodeURIComponent(message)}`);
	}

	return redirect("/panel-air29k");
};
