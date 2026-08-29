import { createClient, type Client } from "@libsql/client";
import { randomBytes, randomInt } from "node:crypto";

function env(name: string): string | undefined {
	return (import.meta.env as Record<string, string | undefined>)[name] ?? process.env[name];
}

let client: Client | undefined;

function getClient(): Client {
	if (client) return client;
	const url = env("TURSO_DATABASE_URL");
	const authToken = env("TURSO_AUTH_TOKEN");
	if (!url) {
		throw new Error(
			"TURSO_DATABASE_URL no está configurada. Defínela como variable de entorno (base de datos Turso)."
		);
	}
	client = createClient({ url, authToken });
	return client;
}

let schemaReady: Promise<void> | undefined;

/** Crea las tablas si no existen y siembra los productos iniciales (solo la primera vez). */
function ensureSchema(): Promise<void> {
	if (!schemaReady) {
		schemaReady = (async () => {
			const db = getClient();

			await db.execute(`
				CREATE TABLE IF NOT EXISTS products (
					id TEXT PRIMARY KEY,
					name TEXT NOT NULL,
					price REAL NOT NULL,
					tagline TEXT NOT NULL,
					image TEXT,
					stock INTEGER NOT NULL DEFAULT 0
				)
			`);

			await db.execute(`
				CREATE TABLE IF NOT EXISTS orders (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					product_id TEXT NOT NULL REFERENCES products(id),
					product_name TEXT NOT NULL,
					quantity INTEGER NOT NULL,
					unit_price REAL NOT NULL,
					status TEXT NOT NULL DEFAULT 'pendiente',
					created_at TEXT NOT NULL DEFAULT (datetime('now')),
					confirmed_at TEXT,
					order_code TEXT NOT NULL DEFAULT ''
				)
			`);

			// Migración: bases de datos creadas antes de que existiera order_code no tienen la columna.
			try {
				await db.execute("ALTER TABLE orders ADD COLUMN order_code TEXT NOT NULL DEFAULT ''");
			} catch {
				// La columna ya existe: no hacer nada.
			}

			await db.execute(`
				CREATE TABLE IF NOT EXISTS sessions (
					token TEXT PRIMARY KEY,
					created_at TEXT NOT NULL DEFAULT (datetime('now')),
					expires_at TEXT NOT NULL
				)
			`);

			const countResult = await db.execute("SELECT COUNT(*) as count FROM products");
			const count = Number(countResult.rows[0].count);

			if (count === 0) {
				for (const p of SEED_PRODUCTS) {
					await db.execute({
						sql: "INSERT INTO products (id, name, price, tagline, image, stock) VALUES (?, ?, ?, ?, ?, ?)",
						args: [p.id, p.name, p.price, p.tagline, p.image, p.stock],
					});
				}
			}
		})();
	}
	return schemaReady;
}

/** Semilla inicial: solo se usa si la tabla products está vacía (primer arranque). */
const SEED_PRODUCTS = [
	{
		id: "pro3",
		name: "AirPods Pro 3",
		price: 25,
		tagline: "Audio espacial personalizado y mejor autonomía de batería.",
		image: "/products/pro3.png",
		stock: 10,
	},
	{
		id: "iphone-battery-pack",
		name: "Battery Pack de iPhone",
		price: 20,
		tagline: "Carga extra portátil para tu iPhone, ideal para el día a día y viajes.",
		image: "/products/baterypack.png",
		stock: 10,
	},
];

export interface Product {
	id: string;
	name: string;
	price: number;
	tagline: string;
	image: string | null;
	stock: number;
}

export interface Order {
	id: number;
	product_id: string;
	product_name: string;
	quantity: number;
	unit_price: number;
	status: "pendiente" | "confirmado";
	created_at: string;
	confirmed_at: string | null;
	order_code: string;
}

/** Caracteres sin ambigüedad visual (sin 0/O ni 1/I/L) para que el código sea fácil de leer y comparar en WhatsApp. */
const ORDER_CODE_CHARS = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** Código corto compartido por todos los productos de un mismo checkout, para identificar el pedido en WhatsApp y en el panel. */
function generateOrderCode(): string {
	let code = "";
	for (let i = 0; i < 4; i++) {
		code += ORDER_CODE_CHARS[randomInt(ORDER_CODE_CHARS.length)];
	}
	return code;
}

export async function listProducts(): Promise<Product[]> {
	await ensureSchema();
	const result = await getClient().execute("SELECT * FROM products ORDER BY name");
	return result.rows as unknown as Product[];
}

export async function getProduct(id: string): Promise<Product | undefined> {
	await ensureSchema();
	const result = await getClient().execute({
		sql: "SELECT * FROM products WHERE id = ?",
		args: [id],
	});
	return result.rows[0] as unknown as Product | undefined;
}

/** Edición manual de stock desde el panel de Admin (reposición, corrección de errores, etc). */
export async function setStock(id: string, stock: number): Promise<void> {
	if (!Number.isInteger(stock) || stock < 0) {
		throw new Error("El stock debe ser un entero mayor o igual a 0");
	}
	await ensureSchema();
	const result = await getClient().execute({
		sql: "UPDATE products SET stock = ? WHERE id = ?",
		args: [stock, id],
	});
	if (result.rowsAffected === 0) {
		throw new Error("Producto no encontrado");
	}
}

export interface ProductDetailsInput {
	name: string;
	price: number;
	tagline: string;
}

/** Edición manual de nombre, precio y descripción desde el panel de Admin. */
export async function updateProductDetails(id: string, input: ProductDetailsInput): Promise<void> {
	const name = input.name.trim();
	const tagline = input.tagline.trim();
	if (!name) {
		throw new Error("El nombre no puede estar vacío");
	}
	if (!tagline) {
		throw new Error("La descripción no puede estar vacía");
	}
	if (!Number.isFinite(input.price) || input.price < 0) {
		throw new Error("El precio debe ser un número mayor o igual a 0");
	}
	await ensureSchema();
	const result = await getClient().execute({
		sql: "UPDATE products SET name = ?, price = ?, tagline = ? WHERE id = ?",
		args: [name, input.price, tagline, id],
	});
	if (result.rowsAffected === 0) {
		throw new Error("Producto no encontrado");
	}
}

export interface OrderItemInput {
	productId: string;
	quantity: number;
}

/**
 * Crea pedidos pendientes (uno por producto) cuando el cliente hace click en "comprar"
 * y es redirigido a WhatsApp. No descuenta stock todavía: solo valida que cada producto
 * tenga stock disponible (> 0) en este momento, para bloquear pedidos de productos agotados.
 */
export async function createPendingOrders(items: OrderItemInput[]): Promise<Order[]> {
	if (items.length === 0) {
		throw new Error("El pedido está vacío");
	}
	await ensureSchema();
	const db = getClient();

	// Un solo código para todo el checkout: agrupa todos los productos del mismo mensaje de WhatsApp.
	const orderCode = generateOrderCode();

	const tx = await db.transaction("write");
	try {
		const created: Order[] = [];
		for (const item of items) {
			if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
				throw new Error("Cantidad inválida");
			}
			const productResult = await tx.execute({
				sql: "SELECT * FROM products WHERE id = ?",
				args: [item.productId],
			});
			const product = productResult.rows[0] as unknown as Product | undefined;
			if (!product) {
				throw new Error(`Producto no encontrado: ${item.productId}`);
			}
			if (product.stock <= 0) {
				throw new Error(`AGOTADO:${product.name}`);
			}

			const insertResult = await tx.execute({
				sql: `INSERT INTO orders (product_id, product_name, quantity, unit_price, status, order_code)
				      VALUES (?, ?, ?, ?, 'pendiente', ?)`,
				args: [product.id, product.name, item.quantity, product.price, orderCode],
			});
			const orderResult = await tx.execute({
				sql: "SELECT * FROM orders WHERE id = ?",
				args: [Number(insertResult.lastInsertRowid)],
			});
			created.push(orderResult.rows[0] as unknown as Order);
		}
		await tx.commit();
		return created;
	} catch (err) {
		await tx.rollback();
		throw err;
	}
}

export async function listOrders(): Promise<Order[]> {
	await ensureSchema();
	const result = await getClient().execute("SELECT * FROM orders ORDER BY created_at DESC");
	return result.rows as unknown as Order[];
}

/**
 * Confirma un pedido pendiente (el vendedor cerró la venta manualmente por WhatsApp) y
 * descuenta el stock de forma atómica: `stock = stock - cantidad` en una sola sentencia
 * SQL condicionada a stock >= cantidad, dentro de una transacción, para que dos
 * confirmaciones simultáneas nunca dejen el stock en negativo (condición de carrera).
 */
export async function confirmOrder(orderId: number): Promise<Order> {
	await ensureSchema();
	const db = getClient();

	const tx = await db.transaction("write");
	try {
		const orderResult = await tx.execute({
			sql: "SELECT * FROM orders WHERE id = ?",
			args: [orderId],
		});
		const order = orderResult.rows[0] as unknown as Order | undefined;
		if (!order) {
			throw new Error("Pedido no encontrado");
		}
		if (order.status !== "pendiente") {
			throw new Error("El pedido ya fue confirmado");
		}

		const decrementResult = await tx.execute({
			sql: "UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?",
			args: [order.quantity, order.product_id, order.quantity],
		});
		if (decrementResult.rowsAffected === 0) {
			throw new Error("Stock insuficiente para confirmar este pedido");
		}

		await tx.execute({
			sql: "UPDATE orders SET status = 'confirmado', confirmed_at = datetime('now') WHERE id = ?",
			args: [orderId],
		});

		await tx.commit();

		const finalResult = await db.execute({ sql: "SELECT * FROM orders WHERE id = ?", args: [orderId] });
		return finalResult.rows[0] as unknown as Order;
	} catch (err) {
		await tx.rollback();
		throw err;
	}
}

// --- Sesiones de admin ---

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

export async function createSession(): Promise<{ token: string; expiresAt: Date }> {
	await ensureSchema();
	const token = randomBytes(32).toString("hex");
	const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
	await getClient().execute({
		sql: "INSERT INTO sessions (token, expires_at) VALUES (?, ?)",
		args: [token, expiresAt.toISOString()],
	});
	return { token, expiresAt };
}

export async function isValidSession(token: string | undefined | null): Promise<boolean> {
	if (!token) return false;
	await ensureSchema();
	const result = await getClient().execute({
		sql: "SELECT expires_at FROM sessions WHERE token = ?",
		args: [token],
	});
	const session = result.rows[0] as unknown as { expires_at: string } | undefined;
	if (!session) return false;
	return new Date(session.expires_at).getTime() > Date.now();
}

export async function deleteSession(token: string): Promise<void> {
	await ensureSchema();
	await getClient().execute({ sql: "DELETE FROM sessions WHERE token = ?", args: [token] });
}
