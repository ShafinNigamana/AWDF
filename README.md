# Advanced Web Development Frameworks (AWDF)

[![CI Pipeline](https://github.com/ShafinNigamana/AWDF/actions/workflows/ci.yml/badge.svg)](https://github.com/ShafinNigamana/AWDF/actions/workflows/ci.yml)

A university laboratory project implementing a full-stack Task Management application with React, Express, MongoDB, Docker containerization, and GitHub Actions CI/CD.

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React 19, Vite, React Router, Recharts analytics, Oxlint, route- and component-level code splitting (`React.lazy`/`Suspense`).
- **Backend**: Node.js, Express 5, Mongoose, JWT authentication, bcrypt, in-memory caching (`node-cache` with configurable TTL), asynchronous event-driven decoupling (`EventEmitter` with `safeAsync` error handling).
- **Database**: MongoDB 7.
- **Containerization**: Multi-stage Dockerfile (Nginx + React build), Node backend Dockerfile, root `docker-compose.yml` with health checks and persistent volume.
- **CI/CD**: GitHub Actions automated pipeline executing frontend linting, production build verification, and backend test suites against containerized MongoDB services.

---

## 🚀 Running Locally

### 1. Backend Setup
```bash
cd Practicals/Task-Manager-Backend
npm install
npm start
```
By default, the backend runs on `http://localhost:5000`.

### 2. Frontend Setup
```bash
cd Practicals/Student-Portfolio
npm install
npm run dev
```
The frontend dev server runs on `http://localhost:5173`.

---

## 🐳 Running with Docker Compose

Start the full multi-tier stack (MongoDB, Backend, and Frontend) with a single command:

```bash
# Build and start all services in the background
docker compose up -d --build

# View container status and health checks
docker compose ps

# View unified service logs
docker compose logs -f

# Stop and remove all containers and network
docker compose down
```

Services are exposed on:
- **Frontend**: [http://localhost:5173](http://localhost:5173) (served by Nginx with SPA routing fallback)
- **Backend API**: [http://localhost:5000](http://localhost:5000)
- **MongoDB**: `localhost:27017` (persisted via `mongo-data` named volume)

---

## 🧪 Testing & Linting

### Run Backend Automated Tests
```bash
cd Practicals/Task-Manager-Backend
npm test
```
Executes automated test suites verifying JWT auth, cache hits/misses/invalidation, and asynchronous event-driven processing.

### Run Frontend Linter & Build
```bash
cd Practicals/Student-Portfolio
npm run lint
npm run build
```

---

## 🔄 CI/CD Pipeline (GitHub Actions)

The workflow defined in `.github/workflows/ci.yml` triggers on pushes to `main`, practical branches, and pull requests:
- **Frontend Job**: Verifies dependencies via `npm ci`, runs `oxlint` static code analysis, and builds the production bundle with Vite.
- **Backend Job**: Spins up a healthy MongoDB 7 service container, installs dependencies, and runs the backend test suite with full environment configurations.
