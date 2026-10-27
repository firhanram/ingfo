import {
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { NetworkEvent } from "../lib/types";
import { NetworkPanel } from "./network-panel";

vi.mock("./network-detail-panel", () => ({
	NetworkDetailPanel: () => null,
}));

function request(
	url: string,
	status = 200,
	resourceType = "Fetch",
): NetworkEvent {
	return {
		type: "network",
		timestamp: 0,
		elapsedMs: 0,
		data: {
			url,
			method: "GET",
			status,
			statusText: "",
			initiatorType: "fetch",
			resourceType,
			startTime: 0,
			responseEnd: 1,
			duration: 1,
			encodedDataLength: 100,
			cached: false,
			mimeType: "application/json",
			requestHeaders: {},
			responseHeaders: {},
			requestBody: null,
			responseBody: null,
		},
	};
}

function panel(networkEvents: NetworkEvent[]) {
	return (
		<NetworkPanel
			networkEvents={networkEvents}
			currentTimeMs={0}
			colWidths={[]}
			onColResizeStart={() => {}}
			activeRowRef={createRef<HTMLTableRowElement>()}
		/>
	);
}

function visibleRows() {
	return within(screen.getAllByRole("rowgroup")[1]).getAllByRole("row");
}

afterEach(cleanup);

describe("recorded domain filter", () => {
	it("lists unique sorted domains and groups different paths, queries, and protocols", () => {
		render(
			panel([
				request("https://cdn.example.com/logo.png"),
				request("https://api.example.com/job?page=1"),
				request("http://api.example.com/users?page=2"),
			]),
		);

		const dropdown = screen.getByRole("combobox", {
			name: "Filter by recorded domain",
		});
		expect(
			within(dropdown)
				.getAllByRole("option")
				.map((option) => option.textContent),
		).toEqual(["All domains (2)", "api.example.com", "cdn.example.com"]);

		fireEvent.change(dropdown, { target: { value: "api.example.com" } });
		expect(visibleRows()).toHaveLength(2);
		fireEvent.change(dropdown, { target: { value: "cdn.example.com" } });
		expect(visibleRows()).toHaveLength(1);
		fireEvent.change(dropdown, { target: { value: "" } });
		expect(visibleRows()).toHaveLength(3);
	});

	it("combines domain, category, error, and search filters without hiding domain options", () => {
		const url = "https://api.example.com/jobs";
		render(
			panel([
				request(url),
				request(url, 500),
				request(url, 500, "Script"),
				request("https://other.example.com/users", 500),
			]),
		);

		const dropdown = screen.getByRole("combobox");
		fireEvent.change(dropdown, { target: { value: "api.example.com" } });
		fireEvent.click(screen.getByRole("button", { name: "Fetch/XHR" }));
		fireEvent.click(screen.getByRole("switch", { name: "Errors only" }));
		fireEvent.change(screen.getByRole("textbox"), {
			target: { value: "jobs" },
		});
		expect(visibleRows()).toHaveLength(1);
		expect(visibleRows()[0].textContent).toContain("500");
		expect(within(dropdown).getAllByRole("option")).toHaveLength(3);

		fireEvent.change(screen.getByRole("textbox"), {
			target: { value: "unmatched-request" },
		});
		expect(
			screen.getByText('No requests match "unmatched-request"'),
		).toBeTruthy();
	});

	it("updates options when recorded requests change and handles empty recordings", () => {
		const url = "https://example.com/first";
		const { rerender } = render(panel([request(url)]));
		fireEvent.change(screen.getByRole("combobox"), {
			target: { value: "example.com" },
		});

		rerender(panel([request("https://example.com/second")]));
		expect(
			screen.getByRole("option", { name: "example.com", selected: true }),
		).toBeTruthy();
		expect(visibleRows()).toHaveLength(1);

		rerender(panel([request("https://other.example.com/third")]));
		expect(
			screen.getByRole("option", { name: "All domains (1)", selected: true }),
		).toBeTruthy();
		expect(visibleRows()).toHaveLength(1);

		rerender(panel([]));
		expect(screen.getByRole("option").textContent).toBe("All domains (0)");
		expect(screen.getByText("No requests")).toBeTruthy();
	});
});
