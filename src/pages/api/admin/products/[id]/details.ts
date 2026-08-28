import type { APIRoute } from "astro";
import { updateProductDetails } from "../../../../../lib/db";

export const prerender = false;

export const POST: APIRoute = async ({ params, request, redirect }) => {
	const id = params.id!;
	const form = await request.formData();
	const name = String(form.get("name") ?? "");
	const price = Number(form.get("price"));
	const tagline = String(form.get("tagline") ?? "");

	try {
		await updateProductDetails(id, { name, price, tagline });
	} catch (err) {
		const message = err instanceof Error ? err.message : "Error desconocido";
		return redirect(`/panel-air29k?error=${encodeURIComponent(message)}`);
	}

	return redirect("/panel-air29k");
};
