import type { APIRoute } from "astro";
import { setStock } from "../../../../../lib/db";

export const prerender = false;

export const POST: APIRoute = async ({ params, request, redirect }) => {
	const id = params.id!;
	const form = await request.formData();
	const stock = Number(form.get("stock"));

	try {
		await setStock(id, stock);
	} catch (err) {
		const message = err instanceof Error ? err.message : "Error desconocido";
		return redirect(`/panel-air29k?error=${encodeURIComponent(message)}`);
	}

	return redirect("/panel-air29k");
};
