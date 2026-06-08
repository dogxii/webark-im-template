import {
	Camera,
	Folder as FolderIcon,
	Image as ImageIcon,
	Mic,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	AboutModal,
	AddContactModal,
	appendMessage,
	ChatMainContent,
	ChatShell,
	ChatSidebarContent,
	type Conversation,
	type ConversationDrafts,
	type ConversationPreference,
	type ConversationPreferences,
	CreateGroupModal,
	createTemplateDemoData,
	defaultConversationPreference,
	defaultToolRegistry,
	displayUserName,
	type GroupUpdateInput,
	HelpModal,
	loadConversationDrafts,
	loadConversationPreferences,
	type Message,
	type MessageAction,
	MobileProfileEditorPage,
	MobileProfileSheet,
	markConversationRead,
	mergeConversationPreferences,
	ProfileEditorModal,
	SettingsModal,
	type SettingsTab,
	saveConversationPreferences,
	type ToolPaneItem,
	type User,
	useChatShellController,
	useThemePreference,
	withConversationDraft,
} from "./template";

type DemoModal =
	| "profile"
	| "mobileProfile"
	| "mobileProfileEdit"
	| "settings"
	| "help"
	| "about"
	| "addContact"
	| "createGroup"
	| null;

export function TemplateDemoApp() {
	const initialData = useMemo(() => createTemplateDemoData(), []);
	const [user, setUser] = useState(initialData.user);
	const [conversations, setConversations] = useState(initialData.conversations);
	const [messages, setMessages] = useState(initialData.messages);
	const [demoModal, setDemoModal] = useState<DemoModal>(null);
	const [settingsTab, setSettingsTab] = useState<SettingsTab>("general");
	const [themePreference, setThemePreference] = useThemePreference();
	const [selectedToolId, setSelectedToolId] = useState<string | null>(null);
	const [conversationPrefs, setConversationPrefs] =
		useState<ConversationPreferences>(() =>
			mergeConversationPreferences(
				loadConversationPreferences(),
				initialData.conversations,
			),
		);
	const [drafts, setDrafts] = useState<ConversationDrafts>(() =>
		loadConversationDrafts(),
	);
	const initialActiveConversationId = useMemo(
		() => resolveInitialActiveConversationId(initialData.conversations),
		[initialData.conversations],
	);
	const shellHistory = useMemo(
		() => ({
			isMobileShell,
			shouldAutoSelectConversation,
			replaceShell: () =>
				window.history.replaceState(null, "", shellHistoryUrl()),
			pushShellDetail: () => pushTemplateDetailHistory(shellHistoryUrl()),
			pushConversationDetail: (conversationId: string) =>
				pushTemplateDetailHistory(conversationHistoryUrl(conversationId)),
		}),
		[],
	);
	const handleConversationRead = useCallback((conversationId: string) => {
		setConversations((current) =>
			markConversationRead(current, conversationId),
		);
	}, []);
	const shell = useChatShellController({
		conversations,
		contacts: initialData.contacts,
		conversationPrefs,
		initialActiveConversationId,
		sidebarWidthStorageKey: "chat-template.demo.sidebarWidth",
		history: shellHistory,
		onReadConversation: handleConversationRead,
	});

	function updateDraft(conversationId: string, value: string) {
		setDrafts((current) =>
			withConversationDraft(current, conversationId, value),
		);
	}

	function updateConversationPreference(
		conversationId: string,
		key: keyof ConversationPreference,
		value: boolean,
	) {
		setConversationPrefs((current) => {
			const next = {
				...current,
				[conversationId]: {
					...(current[conversationId] ?? defaultConversationPreference),
					[key]: value,
				},
			};
			saveConversationPreferences(next);
			return next;
		});
	}

	function openDemoModal(modal: Exclude<DemoModal, null>) {
		setDemoModal(modal);
	}

	function openSettings(tab: SettingsTab = "general") {
		setSettingsTab(tab);
		openDemoModal("settings");
	}

	function openDemoProfile() {
		setDemoModal(isMobileShell() ? "mobileProfile" : "profile");
	}

	useEffect(() => {
		if (shell.view !== "tools" || selectedToolId) {
			return;
		}
		setSelectedToolId(defaultToolRegistry[0]?.items[0]?.id ?? null);
	}, [selectedToolId, shell.view]);

	function selectTool(item: ToolPaneItem) {
		setSelectedToolId(item.id);
		if (isMobileShell()) {
			item.onClick?.();
		}
	}

	function openTool(item: ToolPaneItem) {
		item.onClick?.();
	}

	function updateDemoUser(nextUser: User) {
		setUser(nextUser);
		setMessages((current) =>
			current.map((message) =>
				message.senderId === nextUser.id
					? {
							...message,
							sender: nextUser,
						}
					: message,
			),
		);
		setConversations((current) =>
			current.map((conversation) => {
				const nextLastMessage =
					conversation.lastMessage?.senderId === nextUser.id
						? {
								...conversation.lastMessage,
								senderDisplayName: displayUserName(nextUser),
							}
						: conversation.lastMessage;

				if (conversation.type !== "group") {
					return {
						...conversation,
						lastMessage: nextLastMessage,
					};
				}

				return {
					...conversation,
					members: conversation.members.map((member) =>
						member.id === nextUser.id
							? { ...nextUser, role: member.role, joinedAt: member.joinedAt }
							: member,
					),
					lastMessage: nextLastMessage,
				};
			}),
		);
	}

	async function sendMessage(body: string) {
		if (!shell.activeConversationId) {
			return;
		}
		const now = new Date().toISOString();
		const message: Message = {
			id: `demo-local-${Date.now()}`,
			conversationId: shell.activeConversationId,
			senderId: user.id,
			sender: user,
			body,
			createdAt: now,
		};

		setMessages((current) => appendMessage(current, message));
		setConversations((current) =>
			current.map((conversation) =>
				conversation.id === shell.activeConversationId
					? {
							...conversation,
							updatedAt: now,
							lastMessage: {
								id: message.id,
								senderId: message.senderId,
								senderDisplayName: displayUserName(user),
								body,
								createdAt: now,
							},
						}
					: conversation,
			),
		);
	}

	const demoComposerActions = {
		desktopToolbar: [
			{
				id: "demo-file",
				icon: FolderIcon,
				label: "文件",
				onClick: () => sendMessage("[文件] test-file.zip"),
			},
			{
				id: "demo-image",
				icon: ImageIcon,
				label: "图片",
				onClick: () =>
					sendMessage(
						"![图片](https://picsum.photos/seed/chat-template/640/360)",
					),
			},
			{
				id: "demo-voice",
				icon: Mic,
				label: "语音",
				onClick: () => sendMessage("[语音] 12 秒"),
			},
		],
		mobileToolbar: [
			{
				id: "demo-voice",
				icon: Mic,
				label: "语音",
				onClick: () => sendMessage("[语音] 12 秒"),
			},
			{
				id: "demo-image",
				icon: ImageIcon,
				label: "图片",
				onClick: () =>
					sendMessage(
						"![图片](https://picsum.photos/seed/chat-template/640/360)",
					),
			},
			{
				id: "demo-camera",
				icon: Camera,
				label: "拍摄",
				onClick: () =>
					sendMessage(
						"![拍摄](https://picsum.photos/seed/chat-camera/640/360)",
					),
			},
		],
		mobileExpandedToolbar: [
			{
				id: "demo-image",
				icon: ImageIcon,
				label: "图片",
				onClick: () =>
					sendMessage(
						"![图片](https://picsum.photos/seed/chat-template/640/360)",
					),
			},
			{
				id: "demo-camera",
				icon: Camera,
				label: "拍摄",
				onClick: () =>
					sendMessage(
						"![拍摄](https://picsum.photos/seed/chat-camera/640/360)",
					),
			},
		],
		plusPanel: [
			{
				id: "demo-file",
				icon: FolderIcon,
				label: "文件",
				onClick: () => sendMessage("[文件] test-file.zip"),
			},
			{
				id: "demo-image",
				icon: ImageIcon,
				label: "图片",
				onClick: () =>
					sendMessage("![图片](https://picsum.photos/seed/chat-plus/640/360)"),
			},
			{
				id: "demo-voice",
				icon: Mic,
				label: "语音",
				onClick: () => sendMessage("[语音] 12 秒"),
			},
		],
	};

	async function handleMessageAction(message: Message, action: MessageAction) {
		const now = new Date().toISOString();
		const sender = message.sender ?? user;
		const body = action.value ?? `${action.label} 已处理。`;
		const reply: Message = {
			id: `demo-action-${Date.now()}`,
			conversationId: message.conversationId,
			senderId: sender.id,
			sender,
			body,
			createdAt: now,
		};

		setMessages((current) => appendMessage(current, reply));
		setConversations((current) =>
			current.map((conversation) =>
				conversation.id === message.conversationId
					? {
							...conversation,
							updatedAt: now,
							lastMessage: {
								id: reply.id,
								senderId: reply.senderId,
								senderDisplayName: displayUserName(sender),
								body,
								createdAt: now,
							},
						}
					: conversation,
			),
		);
	}

	async function updateGroup(conversationId: string, input: GroupUpdateInput) {
		setConversations((current) =>
			current.map((conversation) =>
				updateGroupConversation(conversation, conversationId, input),
			),
		);
	}

	async function inviteGroupMembers(
		conversationId: string,
		memberIds: string[],
	) {
		const now = new Date().toISOString();
		const selectedContacts = initialData.contacts.filter((contact) =>
			memberIds.includes(contact.id),
		);

		if (selectedContacts.length === 0) {
			return;
		}

		setConversations((current) =>
			current.map((conversation) => {
				if (
					conversation.id !== conversationId ||
					conversation.type !== "group"
				) {
					return conversation;
				}

				const existingMemberIds = new Set(
					conversation.members.map((member) => member.id),
				);
				const nextMembers = [
					...conversation.members,
					...selectedContacts
						.filter((contact) => !existingMemberIds.has(contact.id))
						.map((contact) => ({
							...contact,
							role: "member" as const,
							joinedAt: now,
						})),
				];

				return {
					...conversation,
					members: nextMembers,
					group: {
						...conversation.group,
						memberCount: nextMembers.length,
					},
				};
			}),
		);
	}

	async function messageContact(contactId: string) {
		const conversation = conversations.find(
			(item) => item.type === "direct" && item.otherUser.id === contactId,
		);
		shell.openConversation(conversation?.id ?? null);
	}

	function createDemoGroup(name: string, memberIds: string[]) {
		const now = new Date().toISOString();
		const timestamp = Date.now();
		const selectedContacts = initialData.contacts.filter((contact) =>
			memberIds.includes(contact.id),
		);
		const conversationId = `demo-group-${timestamp}`;
		const groupIdentity = String(60000 + (timestamp % 30000));
		const conversation: Conversation = {
			id: conversationId,
			type: "group",
			updatedAt: now,
			otherUser: null,
			group: {
				id: `group-${timestamp}`,
				name,
				identityLabel: "群号",
				identityValue: groupIdentity,
				avatarUrl: null,
				announcement: null,
				memberCount: selectedContacts.length + 1,
				role: "owner",
			},
			members: [
				{
					...user,
					role: "owner",
					joinedAt: now,
				},
				...selectedContacts.map((contact) => ({
					...contact,
					role: "member" as const,
					joinedAt: now,
				})),
			],
			preference: {
				pinned: false,
				muted: false,
				blocked: false,
			},
			lastMessage: {
				id: `demo-group-created-${timestamp}`,
				senderId: null,
				body: "群聊已创建",
				createdAt: now,
			},
		};

		setConversations((current) => [conversation, ...current]);
		shell.openConversation(conversationId);
	}

	return (
		<ChatShell
			user={user}
			view={shell.view}
			query={shell.query}
			contactTab={shell.contactTab}
			activeNotice={shell.contactNotice}
			sidebarWidth={shell.sidebarWidth}
			mainOpen={shell.mainOpen}
			messageBadgeCount={shell.messageUnreadCount}
			contactBadgeCount={0}
			showTools={false}
			friendNoticeCount={0}
			groupNoticeCount={0}
			onViewChange={shell.switchView}
			onOpenSettings={openSettings}
			onOpenProfile={openDemoProfile}
			onOpenAbout={() => openDemoModal("about")}
			onOpenHelp={() => openDemoModal("help")}
			onOpenInvite={() => openDemoModal("addContact")}
			onQueryChange={shell.setQuery}
			onQuickInvite={() => openDemoModal("addContact")}
			onCreateGroup={() => openDemoModal("createGroup")}
			onOpenFriendNotices={() => shell.openContactNotice("friend")}
			onOpenGroupNotices={() => shell.openContactNotice("group")}
			onContactTabChange={shell.changeContactTab}
			onSidebarWidthChange={shell.updateSidebarWidth}
			sidebarContent={
				<ChatSidebarContent
					user={user}
					view={shell.view}
					contactTab={shell.contactTab}
					conversations={conversations}
					activeConversationId={shell.activeConversationId}
					selectedGroupConversationId={shell.selectedGroupConversationId}
					selectedContactId={shell.selectedContactId}
					conversationPrefs={conversationPrefs}
					drafts={drafts}
					contacts={initialData.contacts}
					query={shell.query}
					onSelectConversation={shell.selectConversation}
					onSelectContact={(contact) => shell.selectContact(contact)}
					onSelectGroup={shell.selectGroup}
					activateToolsOnSelect={false}
					onSelectTool={selectTool}
				/>
			}
			mainContent={
				<ChatMainContent
					user={user}
					view={shell.view}
					contactNotice={shell.contactNotice}
					contactRequests={[]}
					groupRequests={[]}
					selectedContact={shell.selectedContact}
					selectedGroupConversation={shell.selectedGroupConversation}
					activeConversation={shell.activeConversation}
					messages={messages.filter(
						(message) => message.conversationId === shell.activeConversationId,
					)}
					composerActions={demoComposerActions}
					loadingMessages={false}
					conversationPrefs={conversationPrefs}
					drafts={drafts}
					contacts={initialData.contacts}
					query={shell.query}
					selectedToolId={selectedToolId}
					onAcceptContactRequest={async () => undefined}
					onRejectContactRequest={async () => undefined}
					onAcceptGroupRequest={async () => undefined}
					onRejectGroupRequest={async () => undefined}
					onMessageContact={async (contact) => messageContact(contact.id)}
					onMessageGroup={async (conversationId) =>
						shell.openConversation(conversationId)
					}
					onBackContact={shell.backContact}
					onBackGroup={shell.backGroup}
					onBackContactNotice={shell.backContactNotice}
					onUpdateConversationPreference={updateConversationPreference}
					onUpdateGroup={updateGroup}
					onInviteGroupMembers={inviteGroupMembers}
					onOpenNotificationSettings={() => openSettings("notifications")}
					onSend={sendMessage}
					onMessageAction={handleMessageAction}
					onDraftChange={updateDraft}
					onDraftClear={(conversationId) => updateDraft(conversationId, "")}
					onBackConversation={shell.backConversation}
					onOpenTool={openTool}
					onSelectTool={selectTool}
				/>
			}
		>
			{demoModal === "profile" ? (
				<ProfileEditorModal
					user={user}
					onClose={() => setDemoModal(null)}
					onUserChange={updateDemoUser}
				/>
			) : null}
			{demoModal === "mobileProfile" ? (
				<MobileProfileSheet
					user={user}
					themePreference={themePreference}
					onThemePreferenceChange={setThemePreference}
					onClose={() => setDemoModal(null)}
					onOpenSettings={openSettings}
					onOpenProfileEditor={() => setDemoModal("mobileProfileEdit")}
				/>
			) : null}
			{demoModal === "mobileProfileEdit" ? (
				<MobileProfileEditorPage
					user={user}
					onClose={() => setDemoModal("mobileProfile")}
					onUserChange={updateDemoUser}
				/>
			) : null}
			{demoModal === "settings" ? (
				<SettingsModal
					user={user}
					initialTab={settingsTab}
					themePreference={themePreference}
					onThemePreferenceChange={setThemePreference}
					onClose={() => setDemoModal(null)}
				/>
			) : null}
			{demoModal === "help" ? (
				<HelpModal onClose={() => setDemoModal(null)} />
			) : null}
			{demoModal === "about" ? (
				<AboutModal onClose={() => setDemoModal(null)} />
			) : null}
			{demoModal === "addContact" ? (
				<AddContactModal
					user={user}
					contacts={initialData.contacts}
					conversations={conversations}
					onClose={() => setDemoModal(null)}
					onOpenConversation={shell.openConversation}
				/>
			) : null}
			{demoModal === "createGroup" ? (
				<CreateGroupModal
					contacts={initialData.contacts}
					onClose={() => setDemoModal(null)}
					onCreate={createDemoGroup}
				/>
			) : null}
		</ChatShell>
	);
}

function updateGroupConversation(
	conversation: Conversation,
	conversationId: string,
	input: GroupUpdateInput,
): Conversation {
	if (conversation.type !== "group" || conversation.id !== conversationId) {
		return conversation;
	}

	return {
		...conversation,
		group: {
			...conversation.group,
			name: input.name ?? conversation.group.name,
			announcement: input.announcement ?? conversation.group.announcement,
			avatarUrl: resolveGroupAvatarUrl(
				input.avatar,
				conversation.group.avatarUrl,
			),
		},
	};
}

function resolveGroupAvatarUrl(
	input: GroupUpdateInput["avatar"],
	fallback: string | null,
) {
	if (!input) {
		return fallback;
	}
	if (input.source === "none") {
		return null;
	}
	if (input.source === "github") {
		const username = input.ref.trim();
		return /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(username)
			? `https://avatars.githubusercontent.com/${username.toLowerCase()}?s=240`
			: fallback;
	}
	const md5 = input.ref.trim().toLowerCase();
	return /^[a-f0-9]{32}$/.test(md5)
		? `https://weavatar.com/avatar/${md5}?s=240&d=letter`
		: fallback;
}

function isMobileShell() {
	return (
		typeof window !== "undefined" &&
		window.matchMedia("(max-width: 760px)").matches
	);
}

function shouldAutoSelectConversation() {
	return typeof window === "undefined" || !isMobileShell();
}

function resolveInitialActiveConversationId(conversations: Conversation[]) {
	const conversationId = currentConversationId();
	if (
		conversationId &&
		conversations.some((conversation) => conversation.id === conversationId)
	) {
		return conversationId;
	}
	return shouldAutoSelectConversation() ? (conversations[0]?.id ?? null) : null;
}

function currentConversationId() {
	if (typeof window === "undefined") {
		return null;
	}
	const params = new URLSearchParams(window.location.search);
	return params.get("conversation");
}

function shellHistoryUrl() {
	const url = new URL(window.location.href);
	url.searchParams.delete("conversation");
	return `${url.pathname}${url.search}${url.hash}`;
}

function conversationHistoryUrl(conversationId: string) {
	const url = new URL(window.location.href);
	url.searchParams.set("conversation", conversationId);
	return `${url.pathname}${url.search}${url.hash}`;
}

function pushTemplateDetailHistory(url = shellHistoryUrl()) {
	if (!isMobileShell()) {
		return;
	}
	window.history.pushState(null, "", url);
}
