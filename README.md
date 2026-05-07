# DurgaShaktifoils E-Commerce Website

Premium aluminum foil e-commerce platform built with React, FastAPI, and MongoDB.

![Website Preview](https://via.placeholder.com/800x400/006FEE/FFFFFF?text=DurgaShakti+Foils)

## 🌟 Features

### Customer Features
- 🛍️ **Product Catalog** - Browse 6 premium aluminum foil products with filtering
- 🔐 **User Authentication** - Secure registration and login
- 🛒 **Shopping Cart** - Add, update, remove items with real-time total
- 💳 **Multiple Payment Options** - Razorpay, Stripe, PayPal, Cash on Delivery
- 📦 **Order Tracking** - View order history and status
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile

### Admin Features (Backend Ready)
- ➕ Create/Update/Delete Products
- 📊 View All Orders
- ✅ Update Order Status

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and Yarn
- Python 3.11+
- MongoDB running on localhost:27017

### Development Setup

1. **Clone and Setup**
```bash
git clone <your-repo>
cd app
```

2. **Backend Setup**
```bash
cd backend
pip install -r requirements.txt
python server.py
# Backend runs on http://localhost:8001
```

3. **Frontend Setup**
```bash
cd frontend
yarn install
yarn start
# Frontend runs on http://localhost:3000
```

4. **Access the Application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8001/api
- Products auto-seed on first load

## 📁 Project Structure

```
app/
├── backend/
│   ├── server.py           # FastAPI application
│   ├── requirements.txt    # Python dependencies
│   └── .env               # Backend config
├── frontend/
│   ├── src/
│   │   ├── pages/         # React pages
│   │   ├── components/    # Reusable components
│   │   ├── contexts/      # Auth & Cart contexts
│   │   └── utils/         # API helpers
│   ├── public/            # Static assets
│   └── package.json       # Node dependencies
├── deployment-config/     # Server configurations
├── DEPLOYMENT_QUICK_START.md
├── deployment-guide.md
└── VSCode_Extensions_Guide.md
```

## 🎨 Tech Stack

### Frontend
- **React 19** - UI library
- **React Router** - Navigation
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Axios** - HTTP client
- **Sonner** - Toast notifications
- **Shadcn/UI** - Component library

### Backend
- **FastAPI** - Python web framework
- **Motor** - Async MongoDB driver
- **PyJWT** - Authentication
- **Bcrypt** - Password hashing
- **Stripe/Razorpay/PayPal** - Payment gateways

### Database
- **MongoDB** - NoSQL database

## 🔑 Environment Variables

### Backend (.env)
```bash
MONGO_URL=mongodb://localhost:27017
DB_NAME=durgashaktifoils_db
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:3000

# Payment Gateway Keys
STRIPE_SECRET_KEY=sk_test_...
RAZORPAY_KEY_ID=rzp_test_...
PAYPAL_CLIENT_ID=...
```

### Frontend (.env)
```bash
REACT_APP_BACKEND_URL=http://localhost:8001
```

## 🚀 Production Deployment

### Why Directory Listing Happens
You're serving the **source code** instead of the **compiled build**. Always serve the `build` folder!

### Quick Fix (3 Steps)

1. **Build the React App:**
```bash
cd /app/frontend
yarn build
```

2. **Point Server to Build Folder:**
```bash
# Apache DocumentRoot or Nginx root should point to:
/app/frontend/build  ✅

# NOT to:
/app/frontend/src  ❌
/app/frontend  ❌
```

3. **Configure SPA Routing:**
```bash
# For Apache: Copy .htaccess
cp /app/frontend/public/.htaccess /app/frontend/build/

# For Nginx: Use try_files directive
location / {
    try_files $uri $uri/ /index.html;
}
```

### Detailed Guides
- 📘 [Quick Deployment Guide](DEPLOYMENT_QUICK_START.md) - **READ THIS FIRST**
- 📗 [Full Deployment Guide](deployment-guide.md)
- 💻 [VS Code Setup](VSCode_Extensions_Guide.md)

## 🧪 Testing

### Test Backend
```bash
curl http://localhost:8001/api/products
```

### Test Frontend Build
```bash
cd /app/frontend/build
python3 -m http.server 8080
# Visit http://localhost:8080
```

## 📊 Database Schema

- **users** - Customer accounts
- **products** - Aluminum foil products
- **carts** - Shopping carts
- **orders** - Order history

## 🔧 Common Issues

| Issue | Solution |
|-------|----------|
| Directory listing | Build app and serve `build` folder |
| 404 on refresh | Configure SPA routing (.htaccess) |
| API fails | Check REACT_APP_BACKEND_URL |
| White screen | Check browser console, rebuild |

See [DEPLOYMENT_QUICK_START.md](DEPLOYMENT_QUICK_START.md) for detailed troubleshooting.

## 📞 Support

- **Company**: DurgaShakti Foils PVT. LTD.
- **Phone**: +91 83675 42954
- **Email**: DurgaShaktifoils@gmail.com

---

**Made with ❤️ for DurgaShakti Foils**
