# build stage
FROM openjdk:22-ea-21-jdk-slim AS build

WORKDIR /home/app

COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .
COPY src src

RUN ./mvnw install -DskipTests

# runtime stage — with Pyroscope Java agent
FROM eclipse-temurin:21-jre

COPY agent/pyroscope.jar pyroscope.jar
COPY --from=build /home/app/target/*.jar app.jar

ENTRYPOINT ["java", "-javaagent:pyroscope.jar", "-jar", "app.jar"]
