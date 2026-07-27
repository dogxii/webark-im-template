import { expect, test } from "bun:test";
import {
	createMemoryChatDataSource,
	createTemplateDemoData,
} from "../src/template";

test("memory data source loads messages by cursor from newest to older pages", async () => {
	const data = createTemplateDemoData(
		new Date("2026-07-28T08:00:00.000Z").getTime(),
	);
	const dataSource = createMemoryChatDataSource({
		data,
		pageSize: 3,
		latencyMs: 0,
	});
	const conversationId = "template-conv-jerry";

	const newest = await dataSource.loadMessages(conversationId, null);
	const older = await dataSource.loadMessages(
		conversationId,
		newest.nextCursor,
	);

	expect(newest.messages).toHaveLength(3);
	expect(newest.hasMore).toBe(true);
	expect(older.messages).toHaveLength(3);
	expect(
		new Date(older.messages.at(-1)?.createdAt ?? "").getTime(),
	).toBeLessThan(new Date(newest.messages[0]?.createdAt ?? "").getTime());
});

test("memory data source can simulate send failures for retry UI", async () => {
	const data = createTemplateDemoData();
	const dataSource = createMemoryChatDataSource({
		data,
		latencyMs: 0,
		shouldFailSend: () => true,
	});

	await expect(
		dataSource.sendMessage({
			conversationId: data.conversations[0]?.id ?? "",
			body: "/fail",
			clientMessageId: "client-1",
			createdAt: "2026-07-28T08:00:00.000Z",
			sender: data.user,
		}),
	).rejects.toThrow("模拟网络异常，请重试");
});
