import type {
	ChatDataSource,
	ChatDataSourceEvent,
	ChatDataSourceListener,
	MessageCursor,
	RetryMessageInput,
	SendMessageInput,
} from "./dataSource";
import type { Contact, Conversation, Message } from "./types";
import type { TemplateDemoData } from "./demoData";
import { conversationWithLastMessage } from "./messageState";

export type MemoryChatDataSourceOptions = {
	data: TemplateDemoData;
	pageSize?: number;
	latencyMs?: number;
	shouldFailSend?: (input: SendMessageInput | RetryMessageInput) => boolean;
};

export function createMemoryChatDataSource({
	data,
	pageSize = 40,
	latencyMs = 160,
	shouldFailSend,
}: MemoryChatDataSourceOptions): ChatDataSource {
	let conversations = cloneConversations(data.conversations);
	const contacts = cloneContacts(data.contacts);
	const messagesByConversation = new Map<string, Message[]>();
	const listeners = new Set<ChatDataSourceListener>();
	let serverMessageSequence = 1;

	for (const message of data.messages) {
		const messages = messagesByConversation.get(message.conversationId) ?? [];
		messages.push({
			...message,
			deliveryStatus: message.deliveryStatus ?? "sent",
		});
		messagesByConversation.set(message.conversationId, sortMessages(messages));
	}

	function emit(event: ChatDataSourceEvent) {
		for (const listener of listeners) {
			listener(event);
		}
	}

	async function send(input: SendMessageInput) {
		await delay(latencyMs);
		if (shouldFailSend?.(input)) {
			throw new Error("模拟网络异常，请重试");
		}

		const serverMessageId = `server-${Date.now()}-${serverMessageSequence++}`;
		const message: Message = {
			id: serverMessageId,
			serverMessageId,
			clientMessageId: input.clientMessageId,
			conversationId: input.conversationId,
			senderId: input.sender.id,
			sender: input.sender,
			body: input.body,
			createdAt: input.createdAt,
			updatedAt: new Date().toISOString(),
			deliveryStatus: "sent",
		};

		storeMessage(message);
		return { ...message };
	}

	function storeMessage(message: Message) {
		const messages = messagesByConversation.get(message.conversationId) ?? [];
		messagesByConversation.set(
			message.conversationId,
			sortMessages([...messages, message]),
		);
		conversations = conversations.map((conversation) =>
			conversation.id === message.conversationId
				? conversationWithLastMessage(conversation, message)
				: conversation,
		);
		const conversation = conversations.find(
			(item) => item.id === message.conversationId,
		);
		emit({ type: "message.upsert", message });
		if (conversation) {
			emit({ type: "conversation.upsert", conversation });
		}
	}

	return {
		async loadConversations() {
			await delay(latencyMs);
			return cloneConversations(conversations);
		},
		async loadContacts() {
			await delay(latencyMs);
			return cloneContacts(contacts);
		},
		async loadMessages(conversationId: string, cursor: MessageCursor = null) {
			await delay(latencyMs);
			const messages = messagesByConversation.get(conversationId) ?? [];
			const end = cursor
				? clampCursor(cursor, messages.length)
				: messages.length;
			const start = Math.max(0, end - pageSize);
			return {
				messages: messages.slice(start, end).map((message) => ({ ...message })),
				nextCursor: start > 0 ? String(start) : null,
				hasMore: start > 0,
			};
		},
		sendMessage: send,
		async retryMessage({ message, sender }) {
			return send({
				conversationId: message.conversationId,
				body: message.body,
				clientMessageId:
					message.clientMessageId ??
					`retry-${message.id}-${Date.now().toString(36)}`,
				createdAt: message.createdAt,
				sender,
			});
		},
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		async markAsRead(conversationId) {
			await delay(Math.min(latencyMs, 80));
			conversations = conversations.map((conversation) =>
				conversation.id === conversationId
					? { ...conversation, unreadCount: 0 }
					: conversation,
			);
			const conversation = conversations.find(
				(item) => item.id === conversationId,
			);
			if (conversation) {
				emit({ type: "conversation.upsert", conversation });
			}
		},
	};
}

function cloneConversations(conversations: Conversation[]) {
	return conversations.map((conversation) => ({
		...conversation,
		group: conversation.group ? { ...conversation.group } : null,
		otherUser: conversation.otherUser ? { ...conversation.otherUser } : null,
		members: conversation.members.map((member) => ({ ...member })),
		lastMessage: conversation.lastMessage
			? { ...conversation.lastMessage }
			: null,
		preference: conversation.preference
			? { ...conversation.preference }
			: undefined,
	})) as Conversation[];
}

function cloneContacts(contacts: Contact[]) {
	return contacts.map((contact) => ({ ...contact }));
}

function sortMessages(messages: Message[]) {
	return [...messages].sort(
		(first, second) =>
			new Date(first.createdAt).getTime() -
			new Date(second.createdAt).getTime(),
	);
}

function clampCursor(cursor: string, total: number) {
	const value = Number(cursor);
	return Number.isFinite(value) ? Math.min(total, Math.max(0, value)) : total;
}

function delay(ms: number) {
	return new Promise<void>((resolve) => globalThis.setTimeout(resolve, ms));
}
