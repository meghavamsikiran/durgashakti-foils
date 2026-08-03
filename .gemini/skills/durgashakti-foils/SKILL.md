---
name: durgashakti-foils
description: "Engineering and development skill for DurgaShakti Foils E-Commerce Platform (React 19 SPA + Java 17 Spring Boot Microservices)."
---

# DurgaShakti Foils Development Skill

This skill provides standard guidance, architectural context, and development standards for working on the **DurgaShakti Foils E-Commerce Platform**.

## 🏗️ Architecture Overview

- **Frontend (`/frontend`)**: React 19 SPA with Tailwind CSS, Craco, and Recharts.
- **Backend (`/backend`)**: Java 17 / Spring Boot microservices:
  - `auth-service` (Authentication & JWT)
  - `catalog-service` (Products & Categories)
  - `order-service` (Orders & Payment gateways)
  - `admin-service` (Analytics & GST Reports)
  - `monolith-service` (Local unified runner aggregating services on port 8080)

## 🛠️ Tech Stack & Requirements

- **Java**: 17 / 21
- **Build Tool**: Apache Maven (`mvn clean package`)
- **Database**: PostgreSQL 14+ (`durgashaktifoils_db`)
- **Node.js**: 18+ (`npm` / `yarn`)
- **Integrations**: Razorpay Gateway, SMTP Email Notifications

## 🚀 Key Commands

### Backend
```bash
# Clean and package backend services
cd backend && mvn clean package

# Run monolith server locally (Port 8080)
cd backend && mvn spring-boot:run -pl monolith-service
```

### Frontend
```bash
# Install frontend dependencies
cd frontend && npm install

# Start local React dev server
cd frontend && npm start
```

## 📐 Guidelines & Code Quality

1. **Frontend**: Ensure all responsive UI adheres to DurgaShakti Foils branding (sleek e-commerce aesthetic, dark/gold metallic accents, crisp typography).
2. **Backend**: Keep clean architecture across Spring Boot controllers, services, and repositories. Ensure standard exception handling and REST API responses.
3. **Database**: Rely on Hibernate DDL auto-configuration or Liquibase/Flyway scripts in resources for schema updates.
