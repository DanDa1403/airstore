export const WHATSAPP_NUMBER = "593994747041";

export interface Product {
	id: string;
	name: string;
	price: number;
	tagline: string;
}

export const products: Product[] = [
	{
		id: "pro2",
		name: "AirPods Pro 2",
		price: 20,
		tagline: "Cancelación de ruido activa y estuche con carga inalámbrica.",
	},
	{
		id: "pro3",
		name: "AirPods Pro 3",
		price: 25,
		tagline: "Audio espacial personalizado y mejor autonomía de batería.",
	},
	{
		id: "pro4",
		name: "AirPods Pro 4",
		price: 30,
		tagline: "El modelo más reciente: mayor cancelación de ruido y ajuste mejorado.",
	},
];
