export const API_BASE_URL =
	(import.meta.env.WXT_API_BASE_URL as string | undefined) ??
	"http://localhost:3000";
