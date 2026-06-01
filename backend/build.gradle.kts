plugins {
    java
    id("org.springframework.boot") version "3.5.14"
    id("io.spring.dependency-management") version "1.1.7"
    checkstyle
    pmd
    id("com.github.spotbugs") version "6.0.26"
    jacoco
}

group = "com.lunatarot"
version = "0.1.0-SNAPSHOT"
description = "Luna Tarot backend"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

configurations {
    compileOnly {
        extendsFrom(configurations.annotationProcessor.get())
    }
}

repositories {
    mavenCentral()
}

dependencies {
    // Spring Boot starters
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-web")

    // Database
    implementation("org.flywaydb:flyway-core")
    implementation("org.flywaydb:flyway-database-postgresql")
    runtimeOnly("org.postgresql:postgresql")

    // SpotBugs annotations (for @SuppressFBWarnings)
    implementation("com.github.spotbugs:spotbugs-annotations:4.8.6")

    // Telegram bot (long-polling) — rubenlagus, Spring Boot starter
    implementation("org.telegram:telegrambots-springboot-longpolling-starter:9.0.0")
    implementation("org.telegram:telegrambots-client:9.0.0")

    // Lombok
    compileOnly("org.projectlombok:lombok")
    annotationProcessor("org.projectlombok:lombok")

    // Testing
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.boot:spring-boot-testcontainers")
    testImplementation("org.testcontainers:junit-jupiter")
    testImplementation("org.testcontainers:postgresql")
    testCompileOnly("org.projectlombok:lombok")
    testAnnotationProcessor("org.projectlombok:lombok")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

dependencyManagement {
    imports {
        mavenBom("org.testcontainers:testcontainers-bom:1.21.0")
    }
}

// ── JAR packaging ────────────────────────────────────────────────────────────
// Disable the plain jar so build/libs/ contains exactly one artifact for Docker COPY
tasks.jar { enabled = false }
tasks.bootJar { archiveFileName.set("app.jar") }

// ── Checkstyle ────────────────────────────────────────────────────────────────
checkstyle {
    toolVersion = "10.17.0"
    configFile = file("config/checkstyle/checkstyle.xml")
    isIgnoreFailures = false
}

// ── PMD ───────────────────────────────────────────────────────────────────────
pmd {
    toolVersion = "7.4.0"
    isConsoleOutput = true
    ruleSetFiles = files("config/pmd/pmd-rules.xml")
    ruleSets = emptyList()
    isIgnoreFailures = false
}

// ── SpotBugs ──────────────────────────────────────────────────────────────────
spotbugs {
    toolVersion = "4.8.6"
    excludeFilter = file("config/spotbugs/spotbugs-exclude.xml")
    ignoreFailures = false
}

tasks.withType<com.github.spotbugs.snom.SpotBugsTask> {
    reports.create("html") {
        required = true
    }
    reports.create("xml") {
        required = false
    }
}

tasks.withType<Test> {
    useJUnitPlatform()
    finalizedBy(tasks.jacocoTestReport)
}

// ── JaCoCo ────────────────────────────────────────────────────────────────────
jacoco {
    toolVersion = "0.8.12"
}

// Classes excluded from coverage counting:
// - JPA entities, DTOs, Spring config, Lombok-generated — nothing meaningful to test
val jacocoExclusions = listOf(
    "**/domain/model/**",   // JPA entities — boilerplate
    "**/api/dto/**",        // request/response records
    "**/config/**",         // Spring configuration beans
    "**/*Application*"      // Spring Boot entry point
)

tasks.jacocoTestReport {
    dependsOn(tasks.test, tasks.classes)
    reports {
        xml.required = true
        html.required = true
    }
    classDirectories.setFrom(
        files(classDirectories.files.map {
            fileTree(it) { exclude(jacocoExclusions) }
        })
    )
}

tasks.jacocoTestCoverageVerification {
    dependsOn(tasks.jacocoTestReport)
    classDirectories.setFrom(
        files(classDirectories.files.map {
            fileTree(it) { exclude(jacocoExclusions) }
        })
    )
    violationRules {
        rule {
            // Mild starter thresholds — raise as the codebase grows
            limit {
                counter = "LINE"
                value = "COVEREDRATIO"
                // 2026-06: после CompatibilityInviteFlowTest линии 0.599 — поднимаем порог.
                minimum = "0.58".toBigDecimal()
            }
            limit {
                counter = "BRANCH"
                value = "COVEREDRATIO"
                // 2026-06: после CompatibilityInviteFlowTest branches 0.491 — поднимаем порог.
                minimum = "0.48".toBigDecimal()
            }
            limit {
                counter = "METHOD"
                value = "COVEREDRATIO"
                // 2026-06: methods 0.688 после новых тестов — поднимаем порог.
                minimum = "0.67".toBigDecimal()
            }
        }
    }
}

tasks.check {
    dependsOn(tasks.jacocoTestCoverageVerification)
}
