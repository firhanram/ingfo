import { CheckCircle, Mic, MicOff } from "lucide-react";
import { useEffect, useState } from "react";

type Status = "idle" | "granted" | "denied";

function App() {
	const [status, setStatus] = useState<Status>("idle");

	useEffect(() => {
		// Check if already granted
		navigator.permissions
			.query({ name: "microphone" as PermissionName })
			.then((result) => {
				if (result.state === "granted") setStatus("granted");
			});
	}, []);

	async function handleAllow() {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: true,
			});
			for (const track of stream.getTracks()) track.stop();
			setStatus("granted");
		} catch {
			setStatus("denied");
		}
	}

	return (
		<div className="flex min-h-screen items-center justify-center px-6">
			<div className="flex max-w-md flex-col items-center gap-6 text-center">
				{status === "granted" ? (
					<>
						<div className="flex size-20 items-center justify-center rounded-full bg-success-50">
							<CheckCircle className="size-10 text-success-500" />
						</div>
						<div>
							<h1 className="text-xl font-semibold text-neutral-900">
								Microphone access granted
							</h1>
							<p className="mt-2 text-sm leading-relaxed text-neutral-500">
								You can close this tab and start recording with audio.
							</p>
						</div>
					</>
				) : (
					<>
						<div className="flex size-20 items-center justify-center rounded-full bg-accent-50">
							{status === "denied" ? (
								<MicOff className="size-10 text-accent-500" />
							) : (
								<Mic className="size-10 text-accent-500" />
							)}
						</div>
						<div>
							<h1 className="text-xl font-semibold text-neutral-900">
								{status === "denied"
									? "Microphone access denied"
									: "Allow microphone access"}
							</h1>
							<p className="mt-2 text-sm leading-relaxed text-neutral-500">
								{status === "denied"
									? "Permission was denied. Try again or check your browser's site settings."
									: "Grant microphone permission so you can record audio with your screen recordings."}
							</p>
						</div>
						<button
							type="button"
							onClick={handleAllow}
							className="flex cursor-pointer items-center gap-2 rounded-lg border-none bg-accent-400 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-500"
						>
							<Mic className="size-4" />
							{status === "denied" ? "Try Again" : "Allow Microphone"}
						</button>
					</>
				)}
			</div>
		</div>
	);
}

export default App;
