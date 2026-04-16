# 🧺 Mini Laundry Order Management System

A production-ready, lightweight system for dry cleaning stores to manage orders, track statuses, and view analytics. Built with an AI-first approach.

## 🚀 Features
- **Order Management**: Create and track orders with multiple garment items.
- **Status Tracking**: Validated transitions (RECEIVED → PROCESSING → READY → DELIVERED).
- **Automated Billing**: Real-time calculation of total amounts.
- **Dashboard Analytics**: Overview of total orders, revenue, status distribution, and **AI-calculated average processing time**.
- **Intelligent Delivery Prediction**: Automatically calculates estimated delivery dates based on historical order data.
- **Detailed Order View**: View specific garment details directly in the order list.
- **Authentication**: JWT-based secure access for admins.
- **Dual Storage**: Supports MongoDB with a seamless In-Memory fallback for instant demos.

## 🛠️ Tech Stack
- **Backend**: Node.js, Express, Mongoose
- **Frontend**: HTML5, Bootstrap 5, Vanilla JavaScript (Fast & Lightweight)
- **Database**: MongoDB (Preferred) / In-Memory (Fallback)
- **Auth**: JWT (JSON Web Tokens), Bcrypt.js

## 📦 Project Structure
```
/backend
  /src
    /config      # DB connection
    /controllers # Request handlers
    /models      # Mongoose schemas
    /routes      # API endpoints
    /services    # Business logic
    /utils       # Middlewares & Constants
/frontend
  index.html     # Main dashboard UI
  app.js         # Frontend logic & API calls
  style.css      # Custom styling
```

## ⚙️ Setup Instructions

### 1. Backend Setup
```bash
cd backend
npm install
```
Create a `.env` file in the `backend` folder:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/laundry-system
JWT_SECRET=your_secret_key
NODE_ENV=development
```
Start the server:
```bash
npm run dev
```
*Note: If MongoDB is not running, the system will automatically switch to In-Memory mode for demonstration.*

### 2. Frontend Setup
Simply open `frontend/index.html` in your browser or serve it:
```bash
npx serve frontend -p 3000
```

## 🔐 Credentials (Demo Mode)
- **Username**: `admin`
- **Password**: `admin`

## 📡 API Endpoints

### Auth
- `POST /api/auth/register`: Create new account
- `POST /api/auth/login`: Get JWT token

### Orders (Requires Token)
- `POST /api/orders`: Create new order
- `GET /api/orders`: List orders (Filter by `status`, `customerName`, `phoneNumber`)
- `PATCH /api/orders/:id/status`: Update order status
- `GET /api/orders/dashboard`: Get analytics summary

---

## 🧠 AI Usage Report

### 🎯 Prompts Used
1. "Initialize a production-ready Express backend with modular structure: controllers, routes, models, services."
2. "Implement a status transition validator for RECEIVED -> PROCESSING -> READY -> DELIVERED."
3. "Create a modern, clean dashboard UI using Bootstrap 5 that works with the provided REST APIs."
4. "Add a fallback to in-memory storage if MongoDB connection fails to ensure portability."
5. "Add search by garment type to backend and frontend filters."
6. "When I click create order it is not creating order - debug this 401 error."

### ❌ AI Mistakes Encountered
- **Mongoose ObjectId Casting**: The AI didn't handle non-ObjectId strings (like 'admin-id') when querying MongoDB, causing 500/401 errors. I fixed this by adding `mongoose.Types.ObjectId.isValid()` checks.
- **Missing UI Sync**: AI generated backend filters (like phone number) but forgot to add them to the HTML form. I manually synchronized the frontend inputs with backend capabilities.
- **Undefined Dashboard Stats**: AI didn't handle the case where `totalOrders` was 0 or undefined in the initial load, leading to "undefined" text on UI. Fixed with default value checks.

### 💡 Improvements Made
- **Hybrid Auth**: Modified the auth middleware to check both DB and memory storage based on the ID format, allowing seamless transitions between local and cloud modes.
- **Status Breakdown**: Added a visual breakdown of orders by status in the dashboard for better business visibility.
- **Enhanced Validation**: Added frontend item validation to prevent submitting orders with 0 quantity or price.

---

## 🎁 Bonus Features Implemented
- [x] JWT Authentication
- [x] Search by Garment Type (Backend & Frontend)
- [x] Automated Estimated Delivery Date (3 days)
- [x] Hybrid Database Architecture (MongoDB + In-Memory Fallback)
- [x] Comprehensive Error Handling & Frontend Validation

## ⚖️ Tradeoffs & Future Improvements
- **Tradeoff**: Used Vanilla JS instead of React to keep the bundle size zero and demonstration fast.
- **Tradeoff**: Used In-memory storage as a secondary option; data is lost on server restart in this mode.
- **Future**: Add real-time notifications (WebSockets) for order status updates.
- **Future**: Implement multi-role RBAC (Admin vs Staff).
- **Future**: Add image upload for garment condition before cleaning.
