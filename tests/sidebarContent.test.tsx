import { afterEach, expect, test } from "bun:test";
import "./setupDom";
import { cleanup, fireEvent, render } from "@testing-library/react";
import {
	ChatSidebarContent,
	createTemplateDemoData,
	mergeConversationPreferences,
} from "../src/template";

afterEach(() => cleanup());

test("renders conversation rows and calls selection callback", () => {
	const data = createTemplateDemoData();
	const selected: string[] = [];

	const { getByText } = render(
		<ChatSidebarContent
			user={data.user}
			view="messages"
			contactTab="friends"
			conversations={data.conversations}
			activeConversationId={null}
			selectedGroupConversationId={null}
			selectedContactId={null}
			conversationPrefs={mergeConversationPreferences({}, data.conversations)}
			drafts={{}}
			contacts={data.contacts}
			query=""
			onSelectConversation={(conversationId) => selected.push(conversationId)}
			onSelectContact={() => undefined}
			onSelectGroup={() => undefined}
		/>,
	);

	fireEvent.click(getByText("狗大王的群聊"));

	expect(selected).toEqual(["template-conv-dog-king-group"]);
});
