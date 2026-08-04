import { ChevronsUp } from "lucide-react";
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { cn } from "./classNames";
import { resolveMessageSender } from "./conversationDisplay";
import { MessageBubble } from "./messageBubble";
import type { MessageRenderer } from "./messageRenderers";
import { MessageTimeDivider, shouldShowMessageTime } from "./messageTime";
import { EmptyState } from "./primitives";
import type { Conversation, Message, MessageAction, User } from "./types";
import { displayUserName } from "./user";

type HistoryAnchor = {
	scrollHeight: number;
	scrollTop: number;
};

type UnreadJumpState = {
	conversationId: string;
	total: number;
};

export function MessageList({
	user,
	conversation,
	messages,
	loading,
	loadingMore,
	hasMoreMessages,
	activeMessageId,
	renderers,
	onLoadMoreMessages,
	onContextMenu,
	onLongPress,
	onAction,
	onRetryMessage,
}: {
	user: User;
	conversation: Conversation;
	messages: Message[];
	loading: boolean;
	loadingMore?: boolean;
	hasMoreMessages?: boolean;
	activeMessageId?: string;
	renderers?: MessageRenderer[];
	onLoadMoreMessages?: (conversationId: string) => Promise<void>;
	onContextMenu: (event: ReactMouseEvent, message: Message) => void;
	onLongPress: (point: { x: number; y: number }, message: Message) => void;
	onAction?: (message: Message, action: MessageAction) => Promise<void>;
	onRetryMessage?: (message: Message) => Promise<void>;
}) {
	const scrollRef = useRef<HTMLDivElement | null>(null);
	const historyAnchorRef = useRef<HistoryAnchor | null>(null);
	const historyRequestRef = useRef(false);
	const nearBottomRef = useRef(true);
	const previousConversationIdRef = useRef(conversation.id);
	const previousLastMessageKeyRef = useRef<string | null>(null);
	const [unreadJump, setUnreadJump] = useState<UnreadJumpState | null>(null);
	const showSenderNames = conversation.type !== "direct";
	const firstUnreadIndex = unreadJump
		? Math.max(0, messages.length - unreadJump.total)
		: -1;
	const lastMessage = messages[messages.length - 1];
	const lastMessageKey = lastMessage ? messageListKey(lastMessage) : null;

	const requestLoadMoreHistory = useCallback(async () => {
		const scroll = scrollRef.current;
		if (
			!scroll ||
			!conversation.id ||
			!hasMoreMessages ||
			loading ||
			loadingMore ||
			historyRequestRef.current ||
			!onLoadMoreMessages
		) {
			return;
		}

		historyRequestRef.current = true;
		historyAnchorRef.current = {
			scrollHeight: scroll.scrollHeight,
			scrollTop: scroll.scrollTop,
		};

		try {
			await onLoadMoreMessages(conversation.id);
		} finally {
			historyRequestRef.current = false;
		}
	}, [
		conversation.id,
		hasMoreMessages,
		loading,
		loadingMore,
		onLoadMoreMessages,
	]);

	useEffect(() => {
		const total = Math.min(conversation.unreadCount ?? 0, messages.length);
		setUnreadJump(
			total > 0
				? {
						conversationId: conversation.id,
						total,
					}
				: null,
		);
	}, [conversation.id, conversation.unreadCount, messages.length]);

	useLayoutEffect(() => {
		const scroll = scrollRef.current;
		if (!scroll) {
			return;
		}

		const anchor = historyAnchorRef.current;
		if (anchor) {
			historyAnchorRef.current = null;
			const frame = window.requestAnimationFrame(() => {
				scroll.scrollTop =
					scroll.scrollHeight - anchor.scrollHeight + anchor.scrollTop;
				nearBottomRef.current = isNearBottom(scroll);
			});
			return () => window.cancelAnimationFrame(frame);
		}

		const conversationChanged =
			previousConversationIdRef.current !== conversation.id;
		const lastMessageChanged =
			previousLastMessageKeyRef.current !== lastMessageKey;
		const shouldAutoScroll =
			conversationChanged ||
			(lastMessageChanged &&
				(nearBottomRef.current || lastMessage?.senderId === user.id));

		previousConversationIdRef.current = conversation.id;
		previousLastMessageKeyRef.current = lastMessageKey;

		if (!loading && lastMessageKey && shouldAutoScroll) {
			const frame = window.requestAnimationFrame(() => {
				scroll.scrollTop = scroll.scrollHeight;
				nearBottomRef.current = true;
			});
			return () => window.cancelAnimationFrame(frame);
		}
	}, [
		conversation.id,
		lastMessage?.senderId,
		lastMessageKey,
		loading,
		messages.length,
		user.id,
	]);

	function handleScroll() {
		const scroll = scrollRef.current;
		if (!scroll) {
			return;
		}

		nearBottomRef.current = isNearBottom(scroll);
		if (unreadJump && nearBottomRef.current) {
			setUnreadJump(null);
		}

		if (scroll.scrollTop < 180) {
			void requestLoadMoreHistory();
		}
	}

	function jumpToFirstUnreadMessage() {
		const scroll = scrollRef.current;
		const firstUnread = scroll?.querySelector<HTMLElement>(
			`[data-message-index="${firstUnreadIndex}"]`,
		);

		firstUnread?.scrollIntoView({ block: "start", behavior: "smooth" });
		setUnreadJump(null);
	}

	return (
		<>
			<div
				className={cn("message-scroll")}
				ref={scrollRef}
				onScroll={handleScroll}
			>
				{hasMoreMessages ? (
					<button
						className={cn("message-history-loader")}
						type="button"
						disabled={loading || loadingMore}
						onClick={() => void requestLoadMoreHistory()}
					>
						{loadingMore ? "正在加载历史消息" : "加载更早消息"}
					</button>
				) : null}
				{loading && messages.length === 0 ? (
					<div className={cn("loading-line")}>加载中</div>
				) : messages.length === 0 ? (
					<EmptyState title="还没有消息" body="发出第一条消息。" />
				) : (
					messages.map((message, index) => {
						const previous = messages[index - 1];
						const mine = message.senderId === user.id;
						const sender = resolveMessageSender(message, conversation, user);
						return (
							<div
								className={cn("message-list-row")}
								data-message-index={index}
								key={messageListKey(message)}
							>
								{shouldShowMessageTime(previous, message) ? (
									<MessageTimeDivider value={message.createdAt} />
								) : null}
								<MessageBubble
									message={message}
									conversation={conversation}
									sender={sender}
									mine={mine}
									senderName={displayUserName(sender)}
									senderAvatarUrl={sender.avatarUrl}
									senderSeed={sender.identityValue}
									senderKind={sender.kind}
									showSenderName={showSenderNames}
									active={activeMessageId === message.id}
									renderers={renderers}
									onContextMenu={onContextMenu}
									onLongPress={onLongPress}
									onAction={onAction}
									onRetryMessage={onRetryMessage}
								/>
							</div>
						);
					})
				)}
			</div>

			{unreadJump && unreadJump.total > 0 ? (
				<button
					className={cn("unread-jump-button")}
					type="button"
					onClick={jumpToFirstUnreadMessage}
				>
					<ChevronsUp size={21} strokeWidth={2.8} />
					<span>{formatUnreadJumpCount(unreadJump.total)}条新消息</span>
				</button>
			) : null}
		</>
	);
}

function messageListKey(message: Message) {
	return `${message.conversationId}:${
		message.clientMessageId ?? message.serverMessageId ?? message.id
	}`;
}

function isNearBottom(scroll: HTMLElement) {
	return scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight < 96;
}

function formatUnreadJumpCount(value: number) {
	return value > 99 ? "99+" : String(value);
}
