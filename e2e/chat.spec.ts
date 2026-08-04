import { expect, test } from "@playwright/test";

test.describe("desktop", () => {
	test.skip(({ isMobile }) => isMobile, "desktop-only flow");

	test("loads history, sends a message, and shows failed retry state", async ({
		page,
	}) => {
		await page.goto("/");
		await expect(page.locator(".chat-title-text")).toContainText(
			"狗大王的群聊",
		);

		const messageScroll = page.locator(".message-scroll");
		const scrollBeforeHistory = await messageScroll.evaluate((element) => ({
			height: element.scrollHeight,
			top: element.scrollTop,
		}));
		await page.getByRole("button", { name: /加载更早消息/ }).click();
		await page.waitForFunction(() =>
			document
				.querySelector(".message-scroll")
				?.textContent?.includes("有没有人"),
		);
		const scrollAfterHistory = await messageScroll.evaluate((element) => ({
			height: element.scrollHeight,
			top: element.scrollTop,
		}));
		expect(scrollAfterHistory.height).toBeGreaterThan(
			scrollBeforeHistory.height,
		);
		expect(scrollAfterHistory.top).toBeGreaterThan(scrollBeforeHistory.top);
		await messageScroll.evaluate((element) => {
			element.scrollTop = 0;
			element.dispatchEvent(new Event("scroll", { bubbles: true }));
		});
		await expect(messageScroll.getByText("有没有人")).toBeVisible();

		const editor = page
			.locator(".composer-editor[contenteditable='true']")
			.first();
		await editor.click();
		await page.keyboard.type("hello from e2e");
		await page.keyboard.press("Enter");
		await expect(
			messageScroll.getByText("hello from e2e", { exact: true }),
		).toBeVisible();

		await editor.click();
		await page.keyboard.type("/fail");
		await page.keyboard.press("Enter");
		await expect(messageScroll.getByText("模拟网络异常，请重试")).toBeVisible();
		const retryButton = page.getByRole("button", { name: /重试/ });
		await expect(retryButton).toBeVisible();
		await retryButton.click();
		await expect(messageScroll.getByText("模拟网络异常，请重试")).toBeVisible();

		const resizeHandle = page.getByRole("separator", {
			name: "调整会话列表宽度",
		});
		const handleBox = await resizeHandle.boundingBox();
		expect(handleBox).not.toBeNull();
		if (!handleBox) {
			return;
		}

		const dragY = handleBox.y + handleBox.height / 2;
		const dragX = handleBox.x + handleBox.width / 2;
		await page.mouse.move(dragX, dragY);
		await page.mouse.down();
		await page.mouse.move(dragX + 140, dragY, { steps: 8 });
		await page.mouse.move(dragX - 80, dragY, { steps: 8 });
		await page.mouse.up();

		const messageBounds = await messageScroll.boundingBox();
		const composerBounds = await page.locator(".composer").boundingBox();
		expect(messageBounds).not.toBeNull();
		expect(composerBounds).not.toBeNull();
		if (!messageBounds || !composerBounds) {
			return;
		}

		expect(
			Math.round(messageBounds.y + messageBounds.height),
		).toBeLessThanOrEqual(Math.round(composerBounds.y) + 1);
		await expect(messageScroll.getByText("模拟网络异常，请重试")).toBeVisible();
	});
});

test.describe("mobile", () => {
	test.skip(({ isMobile }) => !isMobile, "mobile-only flow");

	test("opens a conversation from the list", async ({ page }) => {
		await page.goto("/");
		await page.getByText("狗大王的群聊").click();

		await expect(page.locator(".chat-main.chat-main-open")).toBeVisible();
		await expect(page.locator(".message-line").first()).toBeVisible();
	});
});
