import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChatDataSource, MessageCursor } from "./dataSource";
import {
	createPendingMessage,
	markMessageFailed,
	markMessageRetrying,
	prependMessagePage,
	updateConversationLastMessage,
	upsertMessage,
} from "./messageState";
import type { Contact, Conversation, Message, User } from "./types";

export type UseChatDataControllerOptions = {
	dataSource: ChatDataSource;
	currentUser: User;
	initialContacts?: Contact[];
	initialConversations?: Conversation[];
};

type MessagePageState = {
	cursor: MessageCursor;
	hasMore: boolean;
	loaded: boolean;
	loading: boolean;
	loadingMore: boolean;
};

const emptyPageState: MessagePageState = {
	cursor: null,
	hasMore: false,
	loaded: false,
	loading: false,
	loadingMore: false,
};

export function useChatDataController({
	dataSource,
	currentUser,
	initialContacts = [],
	initialConversations = [],
}: UseChatDataControllerOptions) {
	const [contacts, setContacts] = useState(initialContacts);
	const [conversations, setConversations] = useState(initialConversations);
	const [messagesByConversation, setMessagesByConversation] = useState<
		Record<string, Message[]>
	>({});
	const [messagePages, setMessagePages] = useState<
		Record<string, MessagePageState>
	>({});
	const [loadingConversations, setLoadingConversations] = useState(false);

	const updateConversations = useCallback(
		(updater: (conversations: Conversation[]) => Conversation[]) => {
			setConversations((current) => updater(current));
		},
		[],
	);

	const updateMessages = useCallback(
		(
			updater: (
				messagesByConversation: Record<string, Message[]>,
			) => Record<string, Message[]>,
		) => {
			setMessagesByConversation((current) => updater(current));
		},
		[],
	);

	useEffect(() => {
		let cancelled = false;
		setLoadingConversations(true);
		Promise.all([dataSource.loadConversations(), dataSource.loadContacts()])
			.then(([nextConversations, nextContacts]) => {
				if (cancelled) {
					return;
				}
				setConversations(nextConversations);
				setContacts(nextContacts);
			})
			.finally(() => {
				if (!cancelled) {
					setLoadingConversations(false);
				}
			});
		return () => {
			cancelled = true;
		};
	}, [dataSource]);

	useEffect(() => {
		return dataSource.subscribe?.((event) => {
			if (event.type === "message.upsert") {
				setMessagesByConversation((current) => ({
					...current,
					[event.message.conversationId]: upsertMessage(
						current[event.message.conversationId] ?? [],
						event.message,
					),
				}));
				return;
			}
			setConversations((current) =>
				upsertConversation(current, event.conversation),
			);
		});
	}, [dataSource]);

	const loadMessages = useCallback(
		async (conversationId: string) => {
			const currentPage = messagePages[conversationId] ?? emptyPageState;
			if (currentPage.loading || currentPage.loaded) {
				return;
			}

			setMessagePages((current) => ({
				...current,
				[conversationId]: {
					...(current[conversationId] ?? emptyPageState),
					loading: true,
				},
			}));

			try {
				const page = await dataSource.loadMessages(conversationId, null);
				setMessagesByConversation((current) => ({
					...current,
					[conversationId]: page.messages,
				}));
				setMessagePages((current) => ({
					...current,
					[conversationId]: {
						cursor: page.nextCursor,
						hasMore: page.hasMore,
						loaded: true,
						loading: false,
						loadingMore: false,
					},
				}));
			} catch {
				setMessagePages((current) => ({
					...current,
					[conversationId]: {
						...(current[conversationId] ?? emptyPageState),
						loading: false,
					},
				}));
			}
		},
		[dataSource, messagePages],
	);

	const loadMoreMessages = useCallback(
		async (conversationId: string) => {
			const currentPage = messagePages[conversationId] ?? emptyPageState;
			if (
				currentPage.loading ||
				currentPage.loadingMore ||
				!currentPage.loaded ||
				!currentPage.hasMore
			) {
				return;
			}

			setMessagePages((current) => ({
				...current,
				[conversationId]: {
					...(current[conversationId] ?? emptyPageState),
					loadingMore: true,
				},
			}));

			try {
				const page = await dataSource.loadMessages(
					conversationId,
					currentPage.cursor,
				);
				setMessagesByConversation((current) => ({
					...current,
					[conversationId]: prependMessagePage(
						current[conversationId] ?? [],
						page.messages,
					),
				}));
				setMessagePages((current) => ({
					...current,
					[conversationId]: {
						cursor: page.nextCursor,
						hasMore: page.hasMore,
						loaded: true,
						loading: false,
						loadingMore: false,
					},
				}));
			} catch {
				setMessagePages((current) => ({
					...current,
					[conversationId]: {
						...(current[conversationId] ?? emptyPageState),
						loadingMore: false,
					},
				}));
			}
		},
		[dataSource, messagePages],
	);

	const markAsRead = useCallback(
		async (conversationId: string) => {
			setConversations((current) =>
				current.map((conversation) =>
					conversation.id === conversationId
						? { ...conversation, unreadCount: 0 }
						: conversation,
				),
			);
			await dataSource.markAsRead?.(conversationId);
		},
		[dataSource],
	);

	const sendMessage = useCallback(
		async (conversationId: string, body: string) => {
			const createdAt = new Date().toISOString();
			const clientMessageId = createClientMessageId();
			const pending = createPendingMessage({
				conversationId,
				body,
				clientMessageId,
				createdAt,
				sender: currentUser,
			});

			setMessagesByConversation((current) => ({
				...current,
				[conversationId]: upsertMessage(current[conversationId] ?? [], pending),
			}));
			setConversations((current) =>
				updateConversationLastMessage(current, pending),
			);

			try {
				const receipt = await dataSource.sendMessage({
					conversationId,
					body,
					clientMessageId,
					createdAt,
					sender: currentUser,
				});
				setMessagesByConversation((current) => ({
					...current,
					[conversationId]: upsertMessage(
						current[conversationId] ?? [],
						receipt,
					),
				}));
				setConversations((current) =>
					updateConversationLastMessage(current, receipt),
				);
			} catch (error) {
				const failed = markMessageFailed(pending, error);
				setMessagesByConversation((current) => ({
					...current,
					[conversationId]: upsertMessage(
						current[conversationId] ?? [],
						failed,
					),
				}));
			}
		},
		[currentUser, dataSource],
	);

	const retryMessage = useCallback(
		async (message: Message) => {
			const retrying = markMessageRetrying(message);
			setMessagesByConversation((current) => ({
				...current,
				[message.conversationId]: upsertMessage(
					current[message.conversationId] ?? [],
					retrying,
				),
			}));

			try {
				const receipt = dataSource.retryMessage
					? await dataSource.retryMessage({
							message: retrying,
							sender: currentUser,
						})
					: await dataSource.sendMessage({
							conversationId: retrying.conversationId,
							body: retrying.body,
							clientMessageId:
								retrying.clientMessageId ?? createClientMessageId("retry"),
							createdAt: retrying.createdAt,
							sender: currentUser,
						});
				setMessagesByConversation((current) => ({
					...current,
					[message.conversationId]: upsertMessage(
						current[message.conversationId] ?? [],
						receipt,
					),
				}));
				setConversations((current) =>
					updateConversationLastMessage(current, receipt),
				);
			} catch (error) {
				const failed = markMessageFailed(retrying, error);
				setMessagesByConversation((current) => ({
					...current,
					[message.conversationId]: upsertMessage(
						current[message.conversationId] ?? [],
						failed,
					),
				}));
			}
		},
		[currentUser, dataSource],
	);

	return useMemo(
		() => ({
			contacts,
			conversations,
			loadingConversations,
			loadMessages,
			loadMoreMessages,
			markAsRead,
			messagePages,
			messagesByConversation,
			retryMessage,
			sendMessage,
			updateConversations,
			updateMessages,
		}),
		[
			contacts,
			conversations,
			loadMessages,
			loadMoreMessages,
			loadingConversations,
			markAsRead,
			messagePages,
			messagesByConversation,
			retryMessage,
			sendMessage,
			updateConversations,
			updateMessages,
		],
	);
}

function upsertConversation(
	conversations: Conversation[],
	next: Conversation,
): Conversation[] {
	const index = conversations.findIndex(
		(conversation) => conversation.id === next.id,
	);
	if (index < 0) {
		return sortConversations([next, ...conversations]);
	}
	const updated = [...conversations];
	updated[index] = next;
	return sortConversations(updated);
}

function sortConversations(conversations: Conversation[]) {
	return [...conversations].sort(
		(first, second) =>
			Number(Boolean(second.preference?.pinned)) -
				Number(Boolean(first.preference?.pinned)) ||
			new Date(second.updatedAt).getTime() -
				new Date(first.updatedAt).getTime(),
	);
}

function createClientMessageId(prefix = "client") {
	return `${prefix}-${Date.now().toString(36)}-${Math.random()
		.toString(36)
		.slice(2, 8)}`;
}
