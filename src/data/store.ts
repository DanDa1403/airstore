export const WHATSAPP_NUMBER = "593994747041";

export interface Product {
	id: string;
	name: string;
	price: number;
	tagline: string;
	/** Ruta dentro de /public, ej. "/products/pro2.jpg". Si se omite, se usa el ícono genérico. */
	image?: string;
}

export const products: Product[] = [
	{
		id: "pro2",
		name: "AirPods Pro 2",
		price: 20,
		tagline: "Cancelación de ruido activa y estuche con carga inalámbrica.",
		// image: "/products/pro2.jpg",
	},
	{
		id: "pro3",
		name: "AirPods Pro 3",
		price: 25,
		tagline: "Audio espacial personalizado y mejor autonomía de batería.",
		// image: "/products/pro3.jpg",
	},
	{
		id: "pro4",
		name: "AirPods Pro 4",
		price: 30,
		tagline: "El modelo más reciente: mayor cancelación de ruido y ajuste mejorado.",
		// image: "/products/pro4.jpg",
	},
];
