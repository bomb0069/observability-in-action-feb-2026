# build stage
FROM openjdk:22-ea-21-jdk-slim AS build

WORKDIR /home/app

COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .
COPY src src

RUN ./mvnw install -DskipTests

# runtime stage — no OpenTelemetry Java agent
FROM eclipse-temurin:21-jre

COPY --from=build /home/app/target/*.jar app.jar

ENTRYPOINT ["java", "-jar", "app.jar"]
