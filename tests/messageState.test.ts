import { expect, test } from "bun:test";
import {
	createPendingMessage,
	markMessageFailed,
	prependMessagePage,
	upsertMessage,
} from "../src/template/messageState";
import type { Message, User } from "../src/template/types";

const user: User = {
	id: "user-1",
	identityLabel: "ID",
	identityValue: "10001",
	username: "alice",
	displayName: "Alice",
	avatarUrl: null,
};

test("replaces optimistic message with server receipt by clientMessageId", () => {
	const pending = createPendingMessage({
		conversationId: "conv-1",
		body: "hello",
		clientMessageId: "client-1",
		createdAt: "2026-07-28T08:00:00.000Z",
		sender: user,
	});
	const receipt: Message = {
		...pending,
		id: "server-1",
		serverMessageId: "server-1",
		deliveryStatus: "sent",
	};

	expect(upsertMessage([pending], receipt)).toEqual([
		expect.objectContaining({
			id: "server-1",
			clientMessageId: "client-1",
			serverMessageId: "server-1",
			deliveryStatus: "sent",
			sendError: undefined,
		}),
	]);
});

test("marks a pending message as failed without losing retry identity", () => {
	const pending = createPendingMessage({
		conversationId: "conv-1",
		body: "hello",
		clientMessageId: "client-1",
		createdAt: "2026-07-28T08:00:00.000Z",
		sender: user,
	});

	expect(markMessageFailed(pending, new Error("offline"))).toEqual(
		expect.objectContaining({
			id: "client-1",
			clientMessageId: "client-1",
			deliveryStatus: "failed",
			sendError: "offline",
		}),
	);
});

test("prepends history pages without duplicating messages", () => {
	const current: Message[] = [
		message("server-2", "2026-07-28T08:02:00.000Z"),
		message("server-3", "2026-07-28T08:03:00.000Z"),
	];
	const history = [
		message("server-1", "2026-07-28T08:01:00.000Z"),
		message("server-2", "2026-07-28T08:02:00.000Z"),
	];

	expect(prependMessagePage(current, history).map((item) => item.id)).toEqual([
		"server-1",
		"server-2",
		"server-3",
	]);
});

function message(id: string, createdAt: string): Message {
	return {
		id,
		serverMessageId: id,
		conversationId: "conv-1",
		senderId: user.id,
		sender: user,
		body: id,
		createdAt,
		deliveryStatus: "sent",
	};
}
