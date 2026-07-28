import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronsUp } from "lucide-react";
import {
	Fragment,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { cn } from "./classNames";
import { resolveMessageSender } from "./conversationDisplay";
import { MessageBubble } from "./messageBubble";
import type { MessageRenderer } from "./messageRenderers";
import { getMessageRenderKey } from "./messageState";
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
	const previousLastMessageIdRef = useRef<string | null>(null);
	const [unreadJump, setUnreadJump] = useState<UnreadJumpState | null>(null);
	const showSenderNames = conversation.type !== "direct";
	const firstUnreadIndex = unreadJump
		? Math.max(0, messages.length - unreadJump.total)
		: -1;

	const rowVirtualizer = useVirtualizer({
		count: messages.length,
		getScrollElement: () => scrollRef.current,
		estimateSize: (index) => estimateMessageRowHeight(messages[index]),
		getItemKey: (index) =>
			messages[index] ? getMessageRenderKey(messages[index]) : index,
		overscan: 12,
	});

	const virtualItems = rowVirtualizer.getVirtualItems();

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
	}, [conversation.id]);

	useLayoutEffect(() => {
		const scroll = scrollRef.current;
		if (!scroll) {
			return;
		}

		const anchor = historyAnchorRef.current;
		if (anchor) {
			historyAnchorRef.current = null;
			const frame = window.requestAnimationFrame(() => {
				rowVirtualizer.measure();
				scroll.scrollTop =
					scroll.scrollHeight - anchor.scrollHeight + anchor.scrollTop;
			});
			return () => window.cancelAnimationFrame(frame);
		}

		const lastMessage = messages[messages.length - 1];
		const lastMessageId = lastMessage?.id ?? null;
		const conversationChanged =
			previousConversationIdRef.current !== conversation.id;
		const shouldAutoScroll =
			conversationChanged ||
			nearBottomRef.current ||
			lastMessage?.senderId === user.id;

		previousConversationIdRef.current = conversation.id;
		previousLastMessageIdRef.current = lastMessageId;

		if (!loading && lastMessageId && shouldAutoScroll) {
			const frame = window.requestAnimationFrame(() => {
				scroll.scrollTop = scroll.scrollHeight;
			});
			return () => window.cancelAnimationFrame(frame);
		}
	}, [conversation.id, loading, messages.length, rowVirtualizer, user.id]);

	useEffect(() => {
		rowVirtualizer.measure();
	}, [messages, rowVirtualizer]);

	const visibleRange = useMemo(() => {
		const first = virtualItems[0]?.index ?? 0;
		const last = virtualItems[virtualItems.length - 1]?.index ?? 0;
		return { first, last };
	}, [virtualItems]);

	useEffect(() => {
		if (!unreadJump || visibleRange.first >= firstUnreadIndex) {
			setUnreadJump(null);
		}
	}, [firstUnreadIndex, unreadJump, visibleRange.first]);

	function handleScroll() {
		const scroll = scrollRef.current;
		if (!scroll) {
			return;
		}

		nearBottomRef.current =
			scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight < 96;

		if (scroll.scrollTop < 180) {
			void requestLoadMoreHistory();
		}
	}

	function jumpToFirstUnreadMessage() {
		if (firstUnreadIndex < 0) {
			setUnreadJump(null);
			return;
		}

		rowVirtualizer.scrollToIndex(firstUnreadIndex, {
			align: "start",
			behavior: "smooth",
		});
		setUnreadJump(null);
	}

	return (
		<>
			<div
				className={cn("message-scroll", "message-scroll-virtual")}
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
					<div
						className={cn("message-virtualizer")}
						style={{
							height: `${rowVirtualizer.getTotalSize()}px`,
						}}
					>
						{virtualItems.map((virtualItem) => {
							const message = messages[virtualItem.index];
							if (!message) {
								return null;
							}
							const previous = messages[virtualItem.index - 1];
							const mine = message.senderId === user.id;
							const sender = resolveMessageSender(message, conversation, user);
							return (
								<div
									className={cn("message-virtual-row")}
									data-index={virtualItem.index}
									key={virtualItem.key}
									ref={rowVirtualizer.measureElement}
									style={{
										transform: `translateY(${virtualItem.start}px)`,
									}}
								>
									<Fragment>
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
									</Fragment>
								</div>
							);
						})}
					</div>
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

function estimateMessageRowHeight(message: Message | undefined) {
	if (!message) {
		return 76;
	}
	if (/```/.test(message.body)) {
		return 220;
	}
	if (/!\[[^\]\n]*\]\(https?:\/\/[^\s)]+\)/i.test(message.body)) {
		return 280;
	}
	if (message.body.length > 360) {
		return 170;
	}
	if (message.body.length > 120) {
		return 112;
	}
	return 76;
}

function formatUnreadJumpCount(value: number) {
	return value > 99 ? "99+" : String(value);
}
