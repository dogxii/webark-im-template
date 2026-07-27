import type { Contact, Conversation, Message, User } from "./types";

export type MessageCursor = string | null;

export type MessagePage = {
	messages: Message[];
	nextCursor: MessageCursor;
	hasMore: boolean;
};

export type SendMessageInput = {
	conversationId: string;
	body: string;
	clientMessageId: string;
	createdAt: string;
	sender: User;
};

export type RetryMessageInput = {
	message: Message;
	sender: User;
};

export type ChatDataSourceEvent =
	| {
			type: "conversation.upsert";
			conversation: Conversation;
	  }
	| {
			type: "message.upsert";
			message: Message;
	  };

export type ChatDataSourceListener = (event: ChatDataSourceEvent) => void;

export type ChatDataSource = {
	loadConversations: () => Promise<Conversation[]>;
	loadContacts: () => Promise<Contact[]>;
	loadMessages: (
		conversationId: string,
		cursor?: MessageCursor,
	) => Promise<MessagePage>;
	sendMessage: (input: SendMessageInput) => Promise<Message>;
	retryMessage?: (input: RetryMessageInput) => Promise<Message>;
	subscribe?: (listener: ChatDataSourceListener) => () => void;
	markAsRead?: (conversationId: string) => Promise<void>;
};
