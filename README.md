# GoodBerry - E-Commerce Platform

GoodBerry is a full-stack MERN e-commerce application designed for online shopping. It features a backend API, a dynamic user interface, multi-vendor product catalogs, wallet management, and payment gateway integrations.

---

## Key Features

### For Customers
- **Product Catalog**: Advanced search, category filtering, and product detail views.
- **Authentication**: JWT-based session management, OTP validation, and Google OAuth integration.
- **Digital Wallet**: Virtual wallet system powered by Razorpay for instant checkout.
- **Cart & Checkout**: Multi-step checkout with real-time inventory checks.
- **Order Management**: Order history tracking, status updates, and digital receipts.

### For Administrators
- **Analytics Dashboard**: Performance charts and financial metrics using Recharts.
- **Inventory Management**: Create, edit, and categorize products and variants.
- **Order Processing**: Manage returns, update shipping stages, and process refunds.
- **Promotions**: Coupon creation and discount management.

---

## Architecture & Tech Stack

### Frontend
- **Framework**: React.js with Vite
- **State Management**: Redux Toolkit (RTK)
- **Styling**: TailwindCSS, Radix UI Primitives, Framer Motion
- **Icons & Visuals**: Lucide React

### Backend
- **Runtime**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ORM
- **Session & Auth**: Passport.js, JSON Web Tokens (JWT)
- **Payment Gateway**: Razorpay
- **Cloud Storage**: Cloudinary

### Infrastructure
- **Containerization**: Docker, Docker Compose v2
- **Reverse Proxy**: Nginx Proxy with Automated Let's Encrypt SSL/TLS
- **CI/CD**: GitHub Actions & GitHub Container Registry (`ghcr.io`)
- **Hosting**: AWS EC2

---

## Local Development

### Prerequisites
- Node.js v18 or later
- MongoDB Atlas database cluster
- Razorpay API Credentials
- Cloudinary Storage Account

### Setup Instructions

1. **Clone Repository**
   ```bash
   git clone https://github.com/shamnxd/GoodBerry.git
   cd GoodBerry
   ```

2. **Configure Environment Variables**
   Copy `.env.example` to `.env` in the root directory and update with your local development credentials:
   ```bash
   cp .env.example .env
   ```

3. **Install Dependencies & Start Application**
   ```bash
   # Terminal 1: Backend Server
   cd server
   npm install
   npm run dev

   # Terminal 2: Frontend Client
   cd ../client
   npm install
   npm run dev
   ```

---

## Deployment

Refer to the complete [DEPLOYMENT.md](DEPLOYMENT.md) guide for instructions on configuring Docker, central Nginx proxy, SSL certificates, and automated GitHub Actions CI/CD workflows on AWS EC2.

---

## License

This project is licensed under the ISC License.
