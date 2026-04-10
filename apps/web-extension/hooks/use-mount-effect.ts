import { useEffect } from "react";

export function useMountEffect(effect: () => undefined | (() => void)) {
	// biome-ignore lint/correctness/useExhaustiveDependencies: intentionally empty deps for mount-only effect
	useEffect(effect, []);
}
