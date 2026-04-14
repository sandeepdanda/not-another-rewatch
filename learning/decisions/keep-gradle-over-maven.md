---
created: 2026-04-14
tags: [architecture, build-tools]
status: active
---

# Decision: Keep Gradle (don't switch to Maven)

## Context
Spring Initializr generated a Gradle project. Questioned whether Maven would be better for a personal project since most tutorials use Maven.

## Options Considered
1. **Maven** - More common in tutorials, simpler XML config, widely used in Spring Boot community.
2. **Gradle** - Already set up, used at work (Brazil wraps Gradle), faster builds, more flexible.

## Decision
Keep Gradle. It's already working, switching has zero functional benefit, and knowing both Maven and Gradle is better than knowing just one. The project is small enough that build tool choice doesn't matter - what matters is what we build.

## Consequences
- Some tutorials will need mental translation from Maven to Gradle
- Learning Gradle DSL is a bonus skill
- No wasted time on a yak-shaving detour
