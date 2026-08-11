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
		await expect(messageScroll.locator(".message-list-row")).toHaveCount(18);
		const anchorText = "@Dogxi 艾特";
		const anchorOffsetBeforeHistory = await messageScroll.evaluate(
			(element, text) => {
				element.scrollTop = 0;
				const anchor = Array.from(
					element.querySelectorAll<HTMLElement>(".message-list-row"),
				).find((row) => row.textContent?.includes(text));
				const offset = anchor
					? anchor.getBoundingClientRect().top -
						element.getBoundingClientRect().top
					: null;
				element.dispatchEvent(new Event("scroll", { bubbles: true }));
				return offset;
			},
			anchorText,
		);
		expect(anchorOffsetBeforeHistory).not.toBeNull();
		await page.waitForFunction(() =>
			document
				.querySelector(".message-scroll")
				?.textContent?.includes("有没有人"),
		);
		await page.evaluate(
			() =>
				new Promise((resolve) =>
					requestAnimationFrame(() => requestAnimationFrame(resolve)),
				),
		);
		await expect(messageScroll.locator(".message-list-row")).toHaveCount(29);
		const anchorOffsetAfterHistory = await messageScroll.evaluate(
			(element, text) => {
				const anchor = Array.from(
					element.querySelectorAll<HTMLElement>(".message-list-row"),
				).find((row) => row.textContent?.includes(text));
				return anchor
					? anchor.getBoundingClientRect().top -
							element.getBoundingClientRect().top
					: null;
			},
			anchorText,
		);
		expect(anchorOffsetAfterHistory).not.toBeNull();
		expect(
			Math.abs(
				(anchorOffsetAfterHistory ?? 0) - (anchorOffsetBeforeHistory ?? 0),
			),
		).toBeLessThanOrEqual(1);
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
