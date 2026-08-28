import type { APIRoute } from "astro";
import { createPendingOrders } from "../../lib/db";

export const prerender = false;

interface OrderRequestBody {
	items: { productId: string; quantity: number }[];
}

/**
 * Endpoint público: se llama justo antes de redirigir al cliente a WhatsApp.
 * Valida en el backend que cada producto tenga stock (no solo en el frontend) y
 * registra el pedido como "pendiente" para que el vendedor lo confirme luego desde /admin.
 */
export const POST: APIRoute = async ({ request }) => {
	let body: OrderRequestBody;
	try {
		body = await request.json();
	} catch {
		return json({ error: "JSON inválido" }, 400);
	}

	if (!Array.isArray(body.items) || body.items.length === 0) {
		return json({ error: "El pedido está vacío" }, 400);
	}

	try {
		const orders = await createPendingOrders(body.items);
		return json({ orders }, 201);
	} catch (err) {
		const message = err instanceof Error ? err.message : "Error desconocido";
		if (message.startsWith("AGOTADO:")) {
			return json({ error: "AGOTADO", product: message.split(":")[1] }, 409);
		}
		return json({ error: message }, 400);
	}
};

function json(data: unknown, status: number) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}
