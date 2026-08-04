import type { Conversation, Message, User } from "./types";
import { displayUserName } from "./user";

export type CreatePendingMessageInput = {
	conversationId: string;
	body: string;
	clientMessageId: string;
	createdAt: string;
	sender: User;
};

export function createPendingMessage({
	conversationId,
	body,
	clientMessageId,
	createdAt,
	sender,
}: CreatePendingMessageInput): Message {
	return {
		id: clientMessageId,
		clientMessageId,
		conversationId,
		senderId: sender.id,
		sender,
		body,
		createdAt,
		updatedAt: createdAt,
		deliveryStatus: "pending",
	};
}

export function markMessageFailed(message: Message, error: unknown): Message {
	return {
		...message,
		deliveryStatus: "failed",
		sendError: errorMessage(error),
		updatedAt: new Date().toISOString(),
	};
}

export function markMessageRetrying(message: Message): Message {
	return {
		...message,
		deliveryStatus: "pending",
		sendError: undefined,
		updatedAt: new Date().toISOString(),
	};
}

export function mergeServerReceipt(
	local: Message | undefined,
	receipt: Message,
) {
	return {
		...local,
		...receipt,
		id: receipt.serverMessageId ?? receipt.id,
		clientMessageId: receipt.clientMessageId ?? local?.clientMessageId,
		deliveryStatus: "sent" as const,
		sendError: undefined,
		updatedAt: receipt.updatedAt ?? receipt.createdAt,
	};
}

export function upsertMessage(messages: Message[], next: Message): Message[] {
	const existingIndex = findIndexedMessageIndex(indexMessages(messages), next);

	if (existingIndex >= 0) {
		const existing = messages[existingIndex];
		const merged = mergeMessageDelivery(existing, next);
		const updated = [...messages];
		updated[existingIndex] = merged;
		return sortMessagesByTime(updated);
	}

	return sortMessagesByTime([...messages, next]);
}

export function prependMessagePage(
	current: Message[],
	historyMessages: Message[],
) {
	if (historyMessages.length === 0) {
		return current;
	}

	return mergeMessagePage(current, historyMessages);
}

export function mergeMessagePage(current: Message[], pageMessages: Message[]) {
	return mergeMessageLists([...pageMessages, ...current]);
}

export function updateConversationLastMessage(
	conversations: Conversation[],
	message: Message,
) {
	return conversations.map((conversation) =>
		conversation.id === message.conversationId
			? conversationWithLastMessage(conversation, message)
			: conversation,
	);
}

export function conversationWithLastMessage(
	conversation: Conversation,
	message: Message,
): Conversation {
	return {
		...conversation,
		updatedAt: message.createdAt,
		lastMessage: {
			id: message.serverMessageId ?? message.id,
			senderId: message.senderId,
			senderDisplayName: message.sender
				? displayUserName(message.sender)
				: conversation.lastMessage?.senderDisplayName,
			body: message.body,
			createdAt: message.createdAt,
		},
	};
}

export function isSameMessageDelivery(first: Message, second: Message) {
	return Boolean(
		(first.clientMessageId &&
			second.clientMessageId &&
			first.clientMessageId === second.clientMessageId) ||
		(first.serverMessageId &&
			second.serverMessageId &&
			first.serverMessageId === second.serverMessageId) ||
		first.id === second.id,
	);
}

function mergeMessageLists(messages: Message[]) {
	const merged: Message[] = [];
	const index = new Map<string, number>();

	for (const message of messages) {
		const existingIndex = findIndexedMessageIndex(index, message);

		if (existingIndex >= 0) {
			const next = mergeMessageDelivery(merged[existingIndex], message);
			merged[existingIndex] = next;
			indexMessage(index, next, existingIndex);
			continue;
		}

		merged.push(message);
		indexMessage(index, message, merged.length - 1);
	}

	return sortMessagesByTime(merged);
}

function mergeMessageDelivery(existing: Message, next: Message) {
	if (next.deliveryStatus === "sent") {
		return mergeServerReceipt(existing, next);
	}
	if (existing.deliveryStatus === "sent") {
		return mergeServerReceipt(next, existing);
	}
	return { ...existing, ...next };
}

function indexMessages(messages: Message[]) {
	const index = new Map<string, number>();
	messages.forEach((message, messageIndex) => {
		indexMessage(index, message, messageIndex);
	});
	return index;
}

function indexMessage(
	index: Map<string, number>,
	message: Message,
	messageIndex: number,
) {
	for (const key of messageIdentityKeys(message)) {
		index.set(key, messageIndex);
	}
}

function findIndexedMessageIndex(index: Map<string, number>, message: Message) {
	for (const key of messageIdentityKeys(message)) {
		const messageIndex = index.get(key);
		if (messageIndex !== undefined) {
			return messageIndex;
		}
	}
	return -1;
}

function messageIdentityKeys(message: Message) {
	const keys = [`id:${message.id}`];
	if (message.clientMessageId) {
		keys.unshift(`client:${message.clientMessageId}`);
	}
	if (message.serverMessageId) {
		keys.unshift(`server:${message.serverMessageId}`);
	}
	return keys;
}

function sortMessagesByTime(messages: Message[]) {
	return [...messages].sort(
		(first, second) =>
			new Date(first.createdAt).getTime() -
			new Date(second.createdAt).getTime(),
	);
}

function errorMessage(error: unknown) {
	if (error instanceof Error && error.message.trim()) {
		return error.message;
	}
	return "消息发送失败";
}
