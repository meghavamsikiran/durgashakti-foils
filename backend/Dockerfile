# Stage 1: Build the Maven project
FROM maven:3.8.8-eclipse-temurin-17 AS builder
WORKDIR /app

# Copy the parent pom and all modules
COPY pom.xml .
COPY durgashakti-core/ durgashakti-core/
COPY api-gateway/ api-gateway/
COPY auth-service/ auth-service/
COPY user-service/ user-service/
COPY catalog-service/ catalog-service/
COPY order-service/ order-service/
COPY admin-service/ admin-service/
COPY email-service/ email-service/
COPY durgashakti-backend-service/ durgashakti-backend-service/

# Package the application
RUN mvn clean package -DskipTests

# Stage 2: Runtime image
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app

# Copy the combined executable jar from builder stage
COPY --from=builder /app/durgashakti-backend-service/target/durgashakti-backend-service-1.0.0.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
