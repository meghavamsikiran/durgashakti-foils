# DurgaShakti Foils E-Commerce Platform

Premium e-commerce web application for DurgaShakti Foils PVT. LTD., engineered with a modern architecture featuring a React SPA frontend and a robust Java Spring Boot microservice-based backend monolith runner.

---

## 🏗️ System Architecture

The application is split into two primary components:
1. **Frontend SPA:** Responsive, interactive user interface built with React 19, Tailwind CSS, Craco, and Recharts for live dashboards.
2. **Backend Services:** Java 17 / Spring Boot microservices architecture featuring:
   * `auth-service` (Authentication & Security)
   * `catalog-service` (Product & Categories catalog)
   * `order-service` (Order & Payments processing)
   * `admin-service` (Analytics engines & GSTR reports)
   * `monolith-service` (Unified runner that aggregates all microservices for simplified local deployment)

---

## 🚀 Local Quick Start Setup

Follow these steps to configure, build, and run the development environment on your local system.

### Prerequisites

Ensure you have the following software installed:
* **Java Development Kit (JDK):** Version 17 or 21 ([Adoptium Eclipse Temurin](https://adoptium.net/))
* **Build Tool:** Apache Maven 3.8+ ([Maven Setup Guide](https://maven.apache.org/download.cgi))
* **Runtime Node Environment:** Node.js 18+ ([Node.js Downloads](https://nodejs.org/)) with `yarn` or `npm`
* **Database Engine:** PostgreSQL 14+ running locally ([PostgreSQL Downloads](https://www.postgresql.org/download/))

---

### Step 1: Database Setup

1. Open your PostgreSQL console or client (e.g., pgAdmin) and create a database for the application:
   ```sql
   CREATE DATABASE durgashaktifoils_db;
   ```
2. The application database schema is managed automatically by Hibernate DDL auto-configuration during first boot, so you do not need to manually import any schema tables.

---

### Step 2: Environment Configuration

Create a local environment configuration to override default properties without checking keys into source control.

#### Backend Configuration
Copy the configuration template or set the following environment variables in your local environment shell:

```bash
# Database Settings
DB_HOST=localhost
DB_PORT=5432
DB_NAME=durgashaktifoils_db
DB_USER=postgres             # Your PostgreSQL username
DB_PASS=your_db_password     # Your PostgreSQL password
DB_SSL_MODE=disable

# Authentication Secrets
JWT_SECRET=your_jwt_secret_key_make_it_long_and_secure

# Razorpay Payment Gateway Integration
# Obtain test credentials at: https://dashboard.razorpay.com/
RAZORPAY_KEY_ID=rzp_test_yourKeyId
RAZORPAY_KEY_SECRET=yourKeySecret
RAZORPAY_WEBHOOK_SECRET=yourWebhookSecret

# Mail / SMTP Server Configuration
# Provide your standard SMTP server info (e.g., Gmail, SendGrid, etc.)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

#### Frontend Configuration
Create a `.env` file under the `/frontend` directory containing:

```env
REACT_APP_BACKEND_URL=http://localhost:8080
```

---

### Step 3: Run the Backend Services

1. Navigate to the backend root directory:
   ```bash
   cd backend
   ```
2. Compile and package the Java services:
   ```bash
   mvn clean package
   ```
3. Boot up the unified microservice monolith runner:
   ```bash
   mvn spring-boot:run -pl monolith-service
   ```
   * *Note: The backend application runs and listens on port `8080`.*

---

### Step 4: Run the Frontend Application

1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install Node dependencies:
   ```bash
   yarn install
   # or: npm install
   ```
3. Launch the local React development server:
   ```bash
   yarn start
   # or: npm start
   ```
   * *Note: The web app opens automatically at `http://localhost:3000`.*

---

## 📁 Project Directory Structure

```
durgashakti-foils/
├── backend/
│   ├── admin-service/         # Admin dashboards & analytics aggregates
│   ├── auth-service/          # Authentication & access management
│   ├── catalog-service/       # Products & inventory management
│   ├── order-service/         # Order, return window checks, payment services
│   ├── shared-core/           # Common entities, DTOs, security filters
│   ├── monolith-service/      # Aggregated monolith local development runner
│   └── pom.xml                # Parent Maven project dependencies configuration
├── frontend/
│   ├── src/
│   │   ├── admin/             # Admin portal components & pages
│   │   ├── pages/             # Customer-facing shopping interface pages
│   │   ├── components/        # Shared UI components (spinners, popovers)
│   │   └── services/          # API services
│   └── package.json           # Frontend dependency declarations
```

---

## 🏢 Microservices vs. Monolith Deployments (Free vs. Premium Hosting)

To accommodate different host infrastructure tiers, the backend codebase supports **two deployment models natively** without requiring any Java code changes:

### A. The Monolith Mode (Optimized for Free Tiers / Local Dev)
* **Why it exists:** Running 8 separate Spring Boot microservices simultaneously (each starting its own JVM process) requires at least 4–6 GB of RAM. On free hosting tiers (like Render Free, which limits RAM to 512MB per instance) or low-spec development machines, hosting multiple separate microservices is not possible.
* **How it works:** The `monolith-service` module serves as a unified runner. It aggregates all other service subprojects internally, allowing them to spin up together in a **single JVM process** listening on port `8080`.
* **Execution Command:** `mvn spring-boot:run -pl monolith-service`

### B. The Distributed Microservices Mode (For Premium Hosting / K8s / Docker Compose)
If you have premium hosting infrastructure (such as AWS ECS, GCP GKE, Kubernetes, Docker Compose, or multiple premium VM nodes) and want to run them as a fully distributed microservice cluster:

1. **No Java Code Changes Required:** The services are fully decoupled.
2. **Start the API Gateway:** Start the `api-gateway` project first on port `8001`. It acts as the routing entry point for the frontend client.
3. **Start Each Individual Service:** Run each microservice module in its own runtime container/process. By default, they are configured to listen on the following separate ports:
   * `auth-service` (Port `8010`)
   * `user-service` (Port `8011`)
   * `catalog-service` (Port `8012`)
   * `order-service` (Port `8013`)
   * `admin-service` (Port `8014`)
   * `email-service` (Port `8015`)
4. **Configure Gateway Routing:** Verify that the route targets under `/api-gateway/src/main/resources/application.properties` match your distributed deployment URLs (e.g. mapping `Path=/api/auth/**` to your deployed `auth-service` balancer).
5. **Update Frontend Environment Pointing:** Change your frontend `.env` configuration to point directly to the API Gateway port:
   ```env
   REACT_APP_BACKEND_URL=http://localhost:8001
   ```

---

## 🎨 Technology Integrations

| Layer | Technology | Documentation Link |
|-------|------------|--------------------|
| **Backend Framework** | Spring Boot 3.3.5 | [Spring Boot Docs](https://spring.io/projects/spring-boot) |
| **Fault Tolerance** | Resilience4j Circuit Breaker | [Resilience4j Docs](https://resilience4j.readme.io/) |
| **Database ORM** | Spring Data JPA / Hibernate | [Spring Data Docs](https://spring.io/projects/spring-data-jpa) |
| **Payment Gateway** | Razorpay SDK | [Razorpay Developer Hub](https://razorpay.com/docs/) |
| **Authentication** | JSON Web Tokens (JJWT) | [JJWT Repository](https://github.com/jwtk/jjwt) |
| **Web Styling** | Tailwind CSS v3 | [Tailwind Docs](https://tailwindcss.com/docs) |
| **Chart Engines** | Recharts | [Recharts Library Docs](https://recharts.org/) |

---

## 🔧 Troubleshooting FAQ

#### Q: How are return windows and time zones calculated?
* **A:** All date, time, and order age calculations are locked globally to the **Asia/Kolkata** (IST) zone offset. Ensure your local system time is accurate to prevent regional validation discrepancies.

#### Q: Why is my dashboard chart showing empty data?
* **A:** Check your timeframe filter popover. Ensure that you have test orders in your database matching the selected dates, and confirm that their order statuses are valid (e.g. `placed`, `confirmed`, `delivered`, `return_expired`).

#### Q: Where are files and receipts uploaded?
* **A:** Products and media files are stored locally in the `/backend/uploads` directory during development. Ensure this folder has write permissions.

#### Q: How does the application handle email service downtime?
* **A:** The system has an active **Resilience4j Circuit Breaker** configured on the email dispatcher. If the email API or service becomes slow or goes offline, the circuit breaker trips open and triggers a fallback handler. This logs the email request cleanly without blocking or crashing the caller (such as checkout operations).

---

**Made with ❤️ for DurgaShakti Foils PVT. LTD.**
