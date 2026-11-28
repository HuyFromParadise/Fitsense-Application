# Build stage
FROM maven:3.9-eclipse-temurin-21 AS build

WORKDIR /app

COPY FitSenseBackend/pom.xml .
RUN mvn dependency:go-offline

COPY FitSenseBackend/src ./src

RUN mvn clean package -DskipTests

# Runtime stage
FROM eclipse-temurin:21-jre

WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
