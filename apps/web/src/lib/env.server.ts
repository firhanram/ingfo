import { z } from "zod";

const envSchema = z.object({
	R2_BUCKET_NAME: z.enum(["dev", "prod"]),
	R2_ACCESS_KEY_ID: z.string().min(1),
	R2_SECRET_ACCESS_KEY: z.string().min(1),
	R2_ENDPOINT: z.url(),
	R2_PUBLIC_URL: z.url(),
});

export const env = envSchema.parse(process.env);
