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
	const existingIndex = messages.findIndex((message) =>
		isSameMessageDelivery(message, next),
	);

	if (existingIndex >= 0) {
		const existing = messages[existingIndex];
		const merged =
			next.deliveryStatus === "sent"
				? mergeServerReceipt(existing, next)
				: { ...existing, ...next };
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

	return sortMessagesByTime([...historyMessages, ...current]).filter(
		(message, index, messages) =>
			messages.findIndex((item) => isSameMessageDelivery(item, message)) ===
			index,
	);
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
