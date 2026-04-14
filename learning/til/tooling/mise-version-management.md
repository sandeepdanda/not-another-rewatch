---
created: 2026-04-14
last_reviewed: 2026-04-14
review_interval: 1
confidence: 1
tags: [git, tooling]
---

# mise pins tool versions per project so they don't conflict

## What
mise (formerly rtx) manages language versions per project. A `.mise.toml` file in your project root tells mise which Java, Node, Python version to use. When you `cd` into the project, mise automatically switches to those versions.

## Why
Different projects need different versions. This project needs Java 21 (for virtual threads), but your work projects use Java 17. Without mise, you'd have to manually switch Java versions every time you switch projects.

## Example
```toml
# .mise.toml - scoped to this project only
[tools]
java = "corretto-21.0.10.7.1"
```

Commands:
```bash
mise use java@corretto-21.0.10.7.1    # Install and pin to current directory
mise ls                                 # Show active versions
mise ls-remote java                     # Show all available versions
```

## Source
- [mise documentation](https://mise.jdx.dev/)
