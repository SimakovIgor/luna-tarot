# --- Build stage ---
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /workspace

# Cache dependencies first
COPY gradlew settings.gradle.kts build.gradle.kts ./
COPY gradle ./gradle
RUN chmod +x gradlew && ./gradlew --no-daemon dependencies > /dev/null 2>&1 || true

# Build
COPY src ./src
RUN ./gradlew --no-daemon clean bootJar -x test

# --- Runtime stage ---
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN addgroup -S luna && adduser -S luna -G luna
USER luna

COPY --from=builder /workspace/build/libs/*.jar app.jar

EXPOSE 8080
ENV JAVA_OPTS=""

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
