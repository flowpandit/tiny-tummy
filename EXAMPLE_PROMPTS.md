Add validation to the child creation flow.
Use AGENTS.md plus src/pages/AddChild.tsx and the related hooks.
Keep route files thin, put business logic in src/lib or hooks, and run tests after.

Update the feed flow to support X.
Please use AGENTS.md, src/pages/Feed.tsx, src/hooks/useFeedPageState.ts, and src/lib/... as the main context.
Do not change the Tauri layer.
