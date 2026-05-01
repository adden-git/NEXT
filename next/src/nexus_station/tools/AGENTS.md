# Kimi Code CLI Tools

## Guidelines

- Tools should not refer to types in `nexus_station/wire/` unless they are explicitly implementing a UI / runtime bridge. When importing things like `ToolReturnValue` or `DisplayBlock`, prefer `kosong.tooling`.
