import { useCallback, useEffect, useMemo, useState } from "react";
import "webark-im-template/styles.css";
import {
	ChatMainContent,
	ChatShell,
	ChatSidebarContent,
	createMemoryChatDataSource,
	createTemplateDemoData,
	defaultConversationPreference,
	mergeConversationPreferences,
	type ConversationDrafts,
	type ConversationPreference,
	type ConversationPreferences,
	useChatDataController,
	useChatShellController,
} from "webark-im-template";

export function MinimalApp() {
	const demoData = useMemo(() => createTemplateDemoData(), []);
	const dataSource = useMemo(
		() => createMemoryChatDataSource({ data: demoData }),
		[demoData],
	);
	const chatData = useChatDataController({
		dataSource,
		currentUser: demoData.user,
		initialContacts: demoData.contacts,
		initialConversations: demoData.conversations,
	});
	const [conversationPrefs, setConversationPrefs] =
		useState<ConversationPreferences>(() =>
			mergeConversationPreferences({}, demoData.conversations),
		);
	const [drafts, setDrafts] = useState<ConversationDrafts>({});
	const shell = useChatShellController({
		conversations: chatData.conversations,
		contacts: chatData.contacts,
		conversationPrefs,
		initialActiveConversationId: demoData.conversations[0]?.id ?? null,
		sidebarWidthStorageKey: "minimal-im.sidebar-width",
		history: {
			isMobileShell: () => false,
			shouldAutoSelectConversation: () => true,
			replaceShell: () => undefined,
			pushShellDetail: () => undefined,
			pushConversationDetail: () => undefined,
		},
		onReadConversation: (conversationId) => {
			void chatData.markAsRead(conversationId);
		},
	});
	const activeConversationId = shell.activeConversationId;
	const activePage = activeConversationId
		? chatData.messagePages[activeConversationId]
		: undefined;

	useEffect(() => {
		if (activeConversationId) {
			void chatData.loadMessages(activeConversationId);
		}
	}, [activeConversationId, chatData]);

	const updatePreference = useCallback(
		(
			conversationId: string,
			key: keyof ConversationPreference,
			value: boolean,
		) => {
			setConversationPrefs((current) => ({
				...current,
				[conversationId]: {
					...(current[conversationId] ?? defaultConversationPreference),
					[key]: value,
				},
			}));
		},
		[],
	);

	return (
		<ChatShell
			user={demoData.user}
			view={shell.view}
			query={shell.query}
			contactTab={shell.contactTab}
			activeNotice={shell.contactNotice}
			sidebarWidth={shell.sidebarWidth}
			mainOpen={shell.mainOpen}
			messageBadgeCount={shell.messageUnreadCount}
			contactBadgeCount={0}
			friendNoticeCount={0}
			groupNoticeCount={0}
			onViewChange={shell.switchView}
			onOpenSettings={() => undefined}
			onOpenProfile={() => undefined}
			onOpenAbout={() => undefined}
			onOpenHelp={() => undefined}
			onOpenInvite={() => undefined}
			onQueryChange={shell.setQuery}
			onQuickInvite={() => undefined}
			onCreateGroup={() => undefined}
			onOpenFriendNotices={() => shell.openContactNotice("friend")}
			onOpenGroupNotices={() => shell.openContactNotice("group")}
			onContactTabChange={shell.changeContactTab}
			onSidebarWidthChange={shell.updateSidebarWidth}
			sidebarContent={
				<ChatSidebarContent
					user={demoData.user}
					view={shell.view}
					contactTab={shell.contactTab}
					conversations={chatData.conversations}
					activeConversationId={shell.activeConversationId}
					selectedGroupConversationId={shell.selectedGroupConversationId}
					selectedContactId={shell.selectedContactId}
					conversationPrefs={conversationPrefs}
					drafts={drafts}
					contacts={chatData.contacts}
					query={shell.query}
					onSelectConversation={shell.selectConversation}
					onSelectContact={shell.selectContact}
					onSelectGroup={shell.selectGroup}
				/>
			}
			mainContent={
				<ChatMainContent
					user={demoData.user}
					view={shell.view}
					contactNotice={shell.contactNotice}
					contactRequests={[]}
					groupRequests={[]}
					selectedContact={shell.selectedContact}
					selectedGroupConversation={shell.selectedGroupConversation}
					activeConversation={shell.activeConversation}
					messages={
						activeConversationId
							? (chatData.messagesByConversation[activeConversationId] ?? [])
							: []
					}
					loadingMessages={Boolean(activePage?.loading)}
					loadingMoreMessages={Boolean(activePage?.loadingMore)}
					hasMoreMessages={Boolean(activePage?.hasMore)}
					conversationPrefs={conversationPrefs}
					drafts={drafts}
					contacts={chatData.contacts}
					onAcceptContactRequest={async () => undefined}
					onRejectContactRequest={async () => undefined}
					onAcceptGroupRequest={async () => undefined}
					onRejectGroupRequest={async () => undefined}
					onMessageContact={async () => undefined}
					onMessageGroup={async (conversationId) =>
						shell.openConversation(conversationId)
					}
					onBackContact={shell.backContact}
					onBackGroup={shell.backGroup}
					onBackContactNotice={shell.backContactNotice}
					onUpdateConversationPreference={updatePreference}
					onUpdateGroup={async () => undefined}
					onInviteGroupMembers={async () => undefined}
					onOpenNotificationSettings={() => undefined}
					onSend={(body) =>
						activeConversationId
							? chatData.sendMessage(activeConversationId, body)
							: Promise.resolve()
					}
					onRetryMessage={chatData.retryMessage}
					onLoadMoreMessages={chatData.loadMoreMessages}
					onDraftChange={(conversationId, value) =>
						setDrafts((current) => ({ ...current, [conversationId]: value }))
					}
					onDraftClear={(conversationId) =>
						setDrafts((current) => {
							const next = { ...current };
							delete next[conversationId];
							return next;
						})
					}
					onBackConversation={shell.backConversation}
				/>
			}
		/>
	);
}
