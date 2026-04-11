import { CheckCircle, ChevronRight, Mic, MicOff } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Status = "idle" | "granted" | "denied";

interface AudioDevice {
	deviceId: string;
	label: string;
}

function App() {
	const [status, setStatus] = useState<Status>("idle");
	const [devices, setDevices] = useState<AudioDevice[]>([]);
	const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

	const enumerateDevices = useCallback(async () => {
		const allDevices = await navigator.mediaDevices.enumerateDevices();
		const audioInputs = allDevices
			.filter((d) => d.kind === "audioinput" && d.deviceId !== "")
			.map((d) => ({
				deviceId: d.deviceId,
				label: d.label || `Microphone ${d.deviceId.slice(0, 6)}`,
			}));
		setDevices(audioInputs);

		// Restore previously selected device or default to first
		const stored = await browser.storage.local.get("selectedMicDeviceId");
		const storedId = stored.selectedMicDeviceId as string | undefined;
		if (storedId && audioInputs.some((d) => d.deviceId === storedId)) {
			setSelectedDeviceId(storedId);
		} else if (audioInputs.length > 0) {
			setSelectedDeviceId(audioInputs[0].deviceId);
			await browser.storage.local.set({
				selectedMicDeviceId: audioInputs[0].deviceId,
			});
		}
	}, []);

	useEffect(() => {
		navigator.permissions
			.query({ name: "microphone" as PermissionName })
			.then((result) => {
				if (result.state === "granted") {
					setStatus("granted");
					enumerateDevices();
				}
			});
	}, [enumerateDevices]);

	async function handleAllow() {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: true,
			});
			for (const track of stream.getTracks()) track.stop();
			setStatus("granted");
			await enumerateDevices();
		} catch {
			setStatus("denied");
		}
	}

	async function handleSelectDevice(deviceId: string) {
		setSelectedDeviceId(deviceId);
		await browser.storage.local.set({ selectedMicDeviceId: deviceId });
	}

	return (
		<div className="flex min-h-screen items-center justify-center px-6">
			<div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
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
								Choose which microphone to use for recordings.
							</p>
						</div>

						{devices.length > 0 && (
							<div className="w-full">
								<div className="flex flex-col gap-1.5">
									{devices.map((device) => {
										const isSelected = device.deviceId === selectedDeviceId;
										return (
											<button
												key={device.deviceId}
												type="button"
												onClick={() => handleSelectDevice(device.deviceId)}
												className={`flex w-full cursor-pointer items-center gap-3 rounded-lg border px-4 py-3.5 text-left transition-all ${
													isSelected
														? "border-accent-300 bg-accent-50"
														: "border-neutral-200 bg-surface-raised hover:bg-surface-sunken"
												}`}
											>
												<div
													className={`flex size-8 shrink-0 items-center justify-center rounded-full transition-colors ${
														isSelected ? "bg-accent-400" : "bg-neutral-100"
													}`}
												>
													<Mic
														className={`size-4 ${
															isSelected ? "text-white" : "text-neutral-400"
														}`}
													/>
												</div>
												<span
													className={`min-w-0 flex-1 truncate text-sm ${
														isSelected
															? "font-medium text-neutral-900"
															: "text-neutral-600"
													}`}
												>
													{device.label}
												</span>
												{isSelected && (
													<div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent-400">
														<CheckCircle className="size-3.5 text-white" />
													</div>
												)}
												{!isSelected && (
													<ChevronRight className="size-4 shrink-0 text-neutral-300" />
												)}
											</button>
										);
									})}
								</div>

								<p className="mt-4 text-xs leading-relaxed text-neutral-400">
									You can close this tab and start recording.
								</p>
							</div>
						)}

						{devices.length === 0 && (
							<p className="text-sm text-neutral-400">
								No microphones detected. Connect a microphone and refresh this
								page.
							</p>
						)}
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
