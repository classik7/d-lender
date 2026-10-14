# D-LENDER — Loan Management System

A full-stack loan management application built to support loan tracking, disbursement management, repayment monitoring, and financial reporting.

## Overview

D-LENDER is a web-based loan management system developed with React, TypeScript, Node.js, Express, and MySQL. It provides a dashboard for monitoring loan activity and tracking outstanding balances and repayments.

## Features

- **Dashboard Analytics:** View total disbursed loans, outstanding balances, collections, and pending applications.
- **Loan Management:** Organize and track loan records.
- **Loan Disbursement:** Support the recording of loan disbursement activity.
- **Repayment Tracking:** Record repayments and monitor outstanding balances.
- **Financial Reporting:** Display key loan performance metrics.
- **Dark Mode:** Switch between light and dark themes, with the selected theme persisted across page refreshes.
- **REST API:** Connect the frontend to the backend through API endpoints.
- **Continuous Integration:** GitHub Actions automatically runs frontend linting, frontend production builds, and backend TypeScript compilation on pushes and pull requests targeting `main`.

## Technology Stack

**Frontend**
- React
- TypeScript
- Vite
- Tailwind CSS
- Recharts

**Backend**
- Node.js
- Express
- TypeScript
- MySQL
- mysql2

**Development and Delivery**
- Git and GitHub
- GitHub Actions
- ESLint
- npm

## Project Structure

```text
d-lender/
├── .github/
│   └── workflows/
│       └── ci.yml
├── backend/
│   ├── src/
│   ├── package.json
│   └── package-lock.json
├── frontend/
│   ├── src/
│   ├── package.json
│   └── package-lock.json
├── .gitignore
└── README.md
```

## Getting Started

### Prerequisites

Install Node.js, npm, and MySQL before running the application.

### 1. Clone the repository

```bash
git clone https://github.com/classik7/d-lender.git
cd d-lender
```

### 2. Install frontend dependencies

```bash
cd frontend
npm ci
```

### 3. Install backend dependencies

Open another terminal from the project root, then run:

```bash
cd backend
npm ci
```

### 4. Configure environment variables

Create the necessary local environment configuration files for the frontend and backend. Set the backend database connection details and any required application secrets using your local configuration and the project's existing environment variable names.

Do not commit `.env` files, database passwords, API keys, or other secrets to GitHub.

### 5. Start the application

Start the backend from the `backend` directory:

```bash
npm run dev
```

Start the frontend from the `frontend` directory in a separate terminal:

```bash
npm run dev
```

Open the local frontend URL displayed by Vite in your terminal.

> Database setup must be completed before using features that require MySQL. Consult the project's backend configuration for the exact database name, schema, and environment variable requirements.

## Quality Checks

Run the frontend checks:

```bash
cd frontend
npm ci
npm run lint
npm run build
```

Run the backend build:

```bash
cd backend
npm ci
npm run build
```

These checks are also automated through GitHub Actions.

## Continuous Integration

The GitHub Actions workflow is located at `.github/workflows/ci.yml`.

It runs on pushes and pull requests targeting `main`, and supports manual execution. The workflow checks frontend code quality, builds the frontend, and compiles the backend.

## Security Notes

- Keep credentials and environment files out of version control.
- Use environment variables for sensitive configuration.
- Configure authentication, authorization, input validation, and production database access appropriately before deploying to production.

## Project Status

D-LENDER is under active development. Production hosting and automated deployment are separate from the current CI workflow.

## Author

**Awelewa Johnson Oluwaseun**

GitHub: https://github.com/classik7