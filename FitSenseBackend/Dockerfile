# Multi-stage build. Build context: FitSenseBackend/

FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -q -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
RUN groupadd --system fitsense && useradd --system --gid fitsense fitsense \
    && mkdir -p /run/secrets && chown fitsense:fitsense /run/secrets
COPY --from=build /workspace/target/*.jar /app/app.jar
USER fitsense
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "/app/app.jar"]
