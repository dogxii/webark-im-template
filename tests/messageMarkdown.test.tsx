import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MessageContent } from "../src/template/messageContent";
import { parseMarkdownBlocks } from "../src/template/messageMarkdown";

test("renders malformed fenced kaomoji as plain text", () => {
	const value = "```(╬◣д◢)```";
	const markup = renderToStaticMarkup(<MessageContent value={value} />);

	expect(parseMarkdownBlocks(value)).toEqual([
		{ type: "paragraph", text: value },
	]);
	expect(markup).toContain(
		`<p class="message-markdown-paragraph">${value}</p>`,
	);
	expect(markup).not.toContain("message-code-block");
	expect(markup).not.toContain("message-markdown-code");
});

test("keeps valid fenced code blocks working", () => {
	expect(parseMarkdownBlocks("```js\nconsole.log(1)\n```")).toEqual([
		{ type: "code", language: "js", text: "console.log(1)" },
	]);
});

test("keeps valid inline code spans working", () => {
	const markup = renderToStaticMarkup(
		<MessageContent value="run `bun test`" />,
	);

	expect(markup).toContain(
		`<code class="message-markdown-code">bun test</code>`,
	);
});

test("consumes malformed block-like lines as paragraphs", () => {
	expect(parseMarkdownBlocks("- ")).toEqual([
		{ type: "paragraph", text: "- " },
	]);
});
