# Minimal Business Integration

This example shows the smallest app-layer shape expected by the template:

- create or inject a `ChatDataSource`
- drive template state with `useChatDataController`
- pass conversations, contacts, messages and callbacks into shell components

```tsx
import "webark-im-template/styles.css";
import {
	ChatMainContent,
	ChatShell,
	ChatSidebarContent,
	createMemoryChatDataSource,
	createTemplateDemoData,
	mergeConversationPreferences,
	useChatDataController,
	useChatShellController,
} from "webark-im-template";
```

Real applications should replace `createMemoryChatDataSource` with their own API adapter.
