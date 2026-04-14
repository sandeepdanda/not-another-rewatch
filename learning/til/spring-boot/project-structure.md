---
created: 2026-04-14
last_reviewed: 2026-04-14
review_interval: 1
confidence: 1
tags: [spring-boot, gradle]
---

# Spring Boot project structure and what each file does

## What
Spring Initializr (start.spring.io) generates a ready-to-run project. The key files:

- `build.gradle` - dependencies and build config (like package.json for Java)
- `gradlew` - Gradle wrapper script. Means you don't need Gradle installed - it downloads the right version itself
- `src/main/java/` - your application code
- `src/main/resources/application.properties` - config (database URLs, ports, feature flags)
- `src/test/java/` - tests

## Why
Spring Boot is opinionated - it makes decisions for you (embedded server, auto-configuration, starter dependencies) so you write less boilerplate. "Starters" are bundles of dependencies: `spring-boot-starter-web` gives you everything for a REST API (embedded Tomcat, Jackson for JSON, Spring MVC).

## Example
Our `build.gradle` has two starters:
```groovy
dependencies {
    implementation 'spring-boot-starter-web'       // REST API
    implementation 'spring-boot-starter-actuator'  // Health checks, metrics
}
```
That's it. No XML config, no manual Tomcat setup. Run `./gradlew bootRun` and you have a server on port 8080.

## Source
- [Spring Boot Getting Started](https://docs.spring.io/spring-boot/docs/current/reference/html/getting-started.html)
