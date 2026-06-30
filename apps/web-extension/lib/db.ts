import Dexie, { type EntityTable } from "dexie";

export interface SharedRecording {
	shareId: string;
	shareUrl: string;
	createdAt: number;
	title: string;
	durationMs: number;
	thumbnail: Blob;
}

export interface SharedScreenshot {
	shareId: string;
	shareUrl: string;
	createdAt: number;
	title: string;
	thumbnail: Blob;
}

export const db = new Dexie("ingfo-extension") as Dexie & {
	recordings: EntityTable<SharedRecording, "shareId">;
	screenshots: EntityTable<SharedScreenshot, "shareId">;
};

db.version(1).stores({
	recordings: "shareId, createdAt",
});

db.version(2).stores({
	recordings: "shareId, createdAt",
});

db.version(3).stores({
	recordings: "shareId, createdAt",
	screenshots: "shareId, createdAt",
});
