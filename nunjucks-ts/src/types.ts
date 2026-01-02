// --- COMMON ---
export type Asap = (fn: () => void) => void;
export type Callback<E = unknown, R = unknown> = (
	err?: E | null,
	res?: R
) => void;
