import { afterEach, expect, test } from "bun:test";
import "./setupDom";
import { cleanup, renderHook, waitFor, act } from "@testing-library/react";
import type {
	ChatDataSource,
	ChatDataSourceEvent,
	ChatDataSourceListener,
	MessagePage,
	SendMessageInput,
} from "../src/template/dataSource";
import { useChatDataController } from "../src/template/dataController";
import type { Conversation, Message, User } from "../src/template/types";

afterEach(() => cleanup());

test("merges initial message load with messages received while loading", async () => {
	const user = testUser("user-1", "Alice");
	const otherUser = testUser("user-2", "Bob");
	const conversation = testConversation(otherUser);
	const loadedMessage = testMessage("server-1", "2026-07-28T08:00:00.000Z");
	const realtimeMessage = testMessage("server-2", "2026-07-28T08:01:00.000Z");
	const listeners = new Set<ChatDataSourceListener>();
	let resolveMessages!: (page: MessagePage) => void;

	const dataSource: ChatDataSource = {
		loadConversations: async () => [conversation],
		loadContacts: async () => [
			{ ...otherUser, createdAt: conversation.updatedAt },
		],
		loadMessages: () =>
			new Promise<MessagePage>((resolve) => {
				resolveMessages = resolve;
			}),
		sendMessage: async (input: SendMessageInput) => ({
			id: input.clientMessageId,
			clientMessageId: input.clientMessageId,
			conversationId: input.conversationId,
			senderId: input.sender.id,
			sender: input.sender,
			body: input.body,
			createdAt: input.createdAt,
			deliveryStatus: "sent",
		}),
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};

	const { result } = renderHook(() =>
		useChatDataController({
			dataSource,
			currentUser: user,
			initialConversations: [conversation],
			initialContacts: [{ ...otherUser, createdAt: conversation.updatedAt }],
		}),
	);
	await waitFor(() => expect(listeners.size).toBe(1));

	let loadPromise!: Promise<void>;
	act(() => {
		loadPromise = result.current.loadMessages(conversation.id);
	});
	emit(listeners, { type: "message.upsert", message: realtimeMessage });

	await act(async () => {
		resolveMessages({
			messages: [loadedMessage],
			nextCursor: null,
			hasMore: false,
		});
		await loadPromise;
	});

	await waitFor(() =>
		expect(result.current.messagePages[conversation.id]?.loaded).toBe(true),
	);

	expect(
		result.current.messagesByConversation[conversation.id]?.map(
			(message) => message.id,
		),
	).toEqual(["server-1", "server-2"]);
});

function emit(
	listeners: Set<ChatDataSourceListener>,
	event: ChatDataSourceEvent,
) {
	act(() => {
		for (const listener of listeners) {
			listener(event);
		}
	});
}

function testUser(id: string, displayName: string): User {
	return {
		id,
		identityLabel: "ID",
		identityValue: id,
		username: id,
		displayName,
		avatarUrl: null,
		kind: "human",
	};
}

function testConversation(otherUser: User): Conversation {
	return {
		id: "conv-1",
		type: "direct",
		updatedAt: "2026-07-28T08:00:00.000Z",
		otherUser,
		group: null,
		members: [],
		unreadCount: 0,
		lastMessage: null,
	};
}

function testMessage(id: string, createdAt: string): Message {
	return {
		id,
		serverMessageId: id,
		conversationId: "conv-1",
		senderId: "user-2",
		body: id,
		createdAt,
		deliveryStatus: "sent",
	};
}
