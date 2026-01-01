# � Ride Booking Backend

[🌐 Live API Deployment](https://your-app-name.onrender.com)
## 📋 Table of Contents
- [Project Overview](#-project-overview)
- [Key Features](#-key-features)
- [Business Logic & Rules](#-business-logic--rules)
- [Roles & Permissions](#-roles--permissions)
- [Tech Stack](#️-tech-stack)
- [API Endpoints](#-api-endpoints)
- [Getting Started](#-getting-started)
- [Architecture & Design Patterns](#️-architecture--design-patterns)
- [Security Features](#-security-features)
- [Deployment](#-deployment)
- [Performance Optimizations](#-performance-optimizations)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [Future Enhancements](#-future-enhancements)
- [License](#-license)

---
## 📋 Project Overview

A production-ready, scalable Node.js/Express TypeScript backend for a comprehensive ride-hailing platform. This system manages user authentication, driver/vehicle management, real-time ride requests, intelligent driver matching, automated job scheduling, analytics, and reporting with MongoDB geospatial queries and Socket.IO real-time communication.

Backend is designed with enterprise-grade architecture featuring modular design patterns, role-based access control, automated business logic handling, and comprehensive error management for reliable production deployment.

> **Distance Calculation:** Uses the Haversine formula to calculate accurate distances (in kilometers) between geographic coordinates (latitude/longitude) for precise fare calculations and driver matching logic.

## ✨ Key Features

### 🔐 Authentication & Authorization
- JWT-based authentication with access and refresh tokens
- Google OAuth 2.0 integration using Passport.js
- Session management with secure cookie handling
- Role-based access control (RBAC) - Admin, Rider, Driver
- Secure password hashing with bcrypt

### 👥 User Management
- User registration and profile management
- Phone number verification requirement for ride requests
- User activity tracking and suspension capabilities
- Soft delete functionality
- User blocking system for policy violations

### 🚗 Driver & Vehicle Management
- Driver registration with approval workflow
- Real-time driver location tracking using geospatial indexing
- Driver availability status management
- Vehicle registration with activation/deactivation
- Driver earnings history tracking
- Driver rating and reputation system
- Driver suspension controls for admins
- Active ride tracking per driver

### 🧭 Intelligent Ride Management
- Real-time ride request creation and matching
- Automatic nearest driver search within 5 km radius using MongoDB 2dsphere indexing
- Driver assignment with 5-minute response window
- Automated driver timeout and re-assignment logic
- Multi-status ride lifecycle (Requested → Accepted → Going to Pickup → Driver Arrived → In Transit → Reached Destination → Completed)
- Complete status history tracking with timestamps and actors (rider/driver/system)
- Ride rejection handling with driver blacklist per ride
- Manual and automatic ride cancellation with reasons
- Cancellation policy enforcement (max 3 per day, 24-hour suspension)
- Real-time status updates via Socket.IO

### 💰 Advanced Fare Calculation
- Dynamic fare calculation based on distance and estimated time
- Real-time surge pricing based on demand-to-supply ratio
- Time-based surge multipliers (peak hours, weekends, holidays)
- Penalty fare for rides exceeding expected duration
- Base fare + per kilometer + per minute pricing model
- Driver earnings: 75% of final fare (including penalties)
- Approximate fare display before ride confirmation

### ⏰ Automated Job Scheduling (Agenda)
- Automatic ride cancellation after 10 minutes if no driver available
- Driver response timeout monitoring (5 minutes)
- Periodic pending ride check and driver reassignment (every 30 seconds)
- Background job processing for system reliability

### 📊 Analytics & Reporting
- Real-time dashboard summary with key metrics
- Ride trends analysis (daily, weekly, monthly)
- Revenue trends tracking
- Top drivers and riders leaderboards
- Cancellation breakdown by type (rider/driver/system)
- Conversion funnel analysis
- KPI reporting (total rides, revenue, active users/drivers)
- Export reports in PDF, CSV, and Excel formats

### 🌐 Real-Time Communication (Socket.IO)
- Real-time ride request notifications to drivers
- Live ride status updates to riders and drivers
- Driver timeout and cancellation notifications
- Automatic driver reconnection handling
- User connection tracking

### 🔍 Advanced Search & Filtering
- Search, filter, sort, and pagination on all major endpoints
- Location-based driver search within specified radius
- Query builder for complex filtering operations
- Ride history with flexible filtering options

### 🛡️ Security & Error Handling
- Comprehensive error handling with custom error classes
- MongoDB validation error handling
- Zod schema validation with detailed error messages
- Cast error and duplicate key error handlers
- Global error middleware
- Secure CORS configuration with credential support
- Environment-specific security settings (production/development)
- Proxy trust configuration for deployment platforms

## 🎯 Business Logic & Rules

### 🚫 Automatic Ride Cancellation
- **No Driver Available**: Rides automatically cancelled after 10 minutes if no driver found
- **Driver Timeout**: If driver doesn't respond within 5 minutes, ride reassigned to next nearest driver
- **Pending Ride Retry**: System retries driver assignment every 30 seconds for pending rides
- **Complete Workflow**: Requested → Pending (if no driver) → Auto-cancel (after 10 min) OR Reassign to new driver

### 👤 Manual Ride Cancellation
- **Rider Cancellation**: Can cancel before driver arrives or ride starts
- **Driver Cancellation**: Can cancel accepted rides with valid reason
- **Cancellation Tracking**: All cancellations recorded in status history with timestamp and reason
- **Policy Enforcement**: Both riders and drivers tracked separately

### ⏱️ Driver Response Management
- **Response Window**: 5 minutes to accept or reject ride request
- **Timeout Action**: Automatic reassignment to next available driver
- **Notification System**: Real-time Socket.IO notifications for new requests
- **Request Tracking**: Driver added to rejected list for that specific ride

### 🚦 Ride Status Lifecycle
Complete ride workflow with status transitions:
1. **REQUESTED** - Initial ride creation
2. **PENDING** - No driver available, system searching
3. **ACCEPTED** - Driver accepted the ride
4. **GOING_TO_PICK_UP** - Driver en route to pickup location
5. **DRIVER_ARRIVED** - Driver reached pickup point
6. **IN_TRANSIT** - Ride in progress
7. **REACHED_DESTINATION** - Arrived at drop-off location
8. **COMPLETED** - Ride finished, payment processed
9. **CANCELLED_BY_RIDER** / **CANCELLED_BY_DRIVER** / **CANCELLED_BY_SYSTEM** - Various cancellation states

### 📵 Cancellation Policy & User Blocking
- **Daily Limit**: Maximum 3 cancellations per day per user/driver
- **Automatic Block**: System blocks user/driver for 24 hours after reaching limit
- **New Request Restriction**: Cannot request new rides after reaching cancellation limit
- **Reset**: Counter resets at midnight daily
- **Tracking Window**: Counts cancellations from 00:00 to 23:59 each day

### 💵 Dynamic Fare Calculation
- **Base Components**:
  - Base fare: ₹50
  - Per kilometer: ₹25
  - Per minute: ₹5 (estimated at 40 km/h average speed)
  
- **Surge Pricing**:
  - Demand-based surge: Calculated from active rides vs available drivers ratio
  - Time-based surge: Peak hours (7-10 AM, 5-8 PM), weekends, holidays
  - Combined multiplier: (1 + demandSurge) × (1 + timeSurge)
  
- **Penalty System**:
  - Triggered if ride duration exceeds expected time
  - Expected time calculated: (distance / 40 km/h) × 60 minutes
  - Penalty rate: ₹10 per extra minute
  - Added to final fare

- **Driver Earnings**: 75% of total fare (including penalties)
- **Display**: Approximate fare shown before ride confirmation

### 🔍 Nearest Driver Matching Algorithm
1. Search drivers within 5 km radius of pickup location
2. Filter by: Available status, Approved, No active ride, Not suspended, Active user account
3. Exclude: Drivers who previously rejected this ride
4. Sort by: Distance from pickup (nearest first)
5. Return: Closest matching driver
6. If none found: Set ride to PENDING, retry every 30 seconds

### 📊 Location-Based Features
- **Driver Search Radius**: 5 km maximum
- **Geospatial Indexing**: MongoDB 2dsphere for efficient location queries
- **Real-time Updates**: Drivers can update location anytime
- **Pickup Validation**: Prevents same pickup and drop-off locations

### ⭐ Rating & Feedback System
- **Post-Ride Only**: Ratings allowed after ride completion
- **Mutual Ratings**: Riders rate drivers (future feature: drivers rate riders)
- **Feedback Storage**: Comments and ratings stored with ride
- **Reputation Impact**: Affects driver visibility and matching priority

### 🔐 Pre-Ride Validations
- **Phone Verification**: Riders must have phone number in profile
- **Active Ride Check**: Users cannot have multiple concurrent rides
- **Daily Cancellation Check**: Blocks requests if limit reached
- **Location Validation**: Ensures valid pickup/drop-off coordinates
- **Driver Availability**: Only approved, non-suspended, available drivers matched

## 👥 Roles & Permissions

The system implements comprehensive role-based access control (RBAC):

### 🔴 Admin
- Full system access and control
- User and driver management (approve, suspend, delete)
- Access to all analytics and reports
- View all rides and transactions
- System configuration and monitoring
- Driver approval workflow management

### 🟢 Rider
- Register and manage profile
- Request and track rides
- View ride history and receipts
- Rate drivers and provide feedback
- Cancel rides (within policy limits)
- View approximate fare before booking

### 🔵 Driver
- Register with vehicle information
- Update real-time location and availability
- Receive and respond to ride requests (accept/reject)
- Navigate through ride lifecycle
- View earnings history and breakdown
- Receive ratings and feedback
- Cancel accepted rides (with valid reason)

> 🔒 **Note**: Most endpoints are protected and require authentication. Access is granted based on JWT token validation and assigned role(s).

## 🛠️ Tech Stack

### Core Technologies
- **Runtime**: Node.js 18.x
- **Framework**: Express.js 5.x
- **Language**: TypeScript 5.x
- **Database**: MongoDB with Mongoose ODM

### Authentication & Security
- **JWT**: jsonwebtoken (access & refresh tokens)
- **OAuth**: Passport.js with Google OAuth 2.0
- **Password Hashing**: bcryptjs
- **Session Management**: express-session with secure cookies
- **Validation**: Zod 4.x for schema validation

### Real-Time & Background Jobs
- **WebSocket**: Socket.IO 4.x for real-time communication
- **Job Scheduling**: Agenda 5.x for background tasks
- **HTTP Server**: Node.js HTTP module

### Reporting & Data Export
- **PDF Generation**: PDFKit
- **CSV Export**: json2csv
- **Excel Export**: ExcelJS

### Geospatial & Utilities
- **Geospatial Queries**: MongoDB 2dsphere indexing
- **HTTP Status**: http-status-codes package
- **CORS**: cors middleware
- **Cookie Parsing**: cookie-parser

### Development Tools
- **TypeScript Compiler**: tsc
- **Linting**: ESLint 9.x with TypeScript ESLint
- **Dev Server**: ts-node-dev with auto-reload
- **Environment**: dotenv for configuration

### Deployment
- **Platform**: Render (primary), Vercel (serverless alternative)
- **Proxy Handling**: Configured for Render/Railway/Vercel
- **Production Ready**: Environment-based configuration

## 🔌 API Endpoints

### 🔐 Authentication (`/api/v1/auth`)
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/google` | Initiate Google OAuth login | No |
| GET | `/google/callback` | Google OAuth callback handler | No |
| POST | `/login` | Email/password login | No |
| POST | `/logout` | Logout and clear session | Yes |
| POST | `/reset-password` | Reset user password | Yes |
| POST | `/refresh-token` | Generate new access token | Yes |

### 👤 User Management (`/api/v1/user`)
| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| POST | `/register` | Register new user (rider) | No | - |
| GET | `/all` | Get all users with filters | Yes | Admin |
| PATCH | `/:userId` | Update user profile | Yes | Admin, User |

### 🚗 Driver Management (`/api/v1/driver`)
| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| POST | `/create` | Register new driver | Yes | - |
| GET | `/all` | Get all drivers with filters | Yes | Admin |
| PATCH | `/approve-status/:driverId` | Approve/reject driver | Yes | Admin |
| PATCH | `/availability-status` | Update driver availability | Yes | Driver |
| PATCH | `/location` | Update driver location | Yes | Driver |
| GET | `/earnings-history/:driverId` | Get driver earnings | Yes | Admin, Driver |
| PATCH | `/is-suspended/:driverId` | Suspend/unsuspend driver | Yes | Admin |
| PATCH | `/rating/:driverId` | Update driver rating | Yes | Rider |

### 🚙 Vehicle Management (`/api/v1/vehicle`)
| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| POST | `/create` | Register new vehicle | Yes | Driver |
| PATCH | `/active/:vehicleId` | Activate/deactivate vehicle | Yes | Driver |

### 🚕 Ride Management (`/api/v1/ride`)
| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| POST | `/create` | Create new ride request | Yes | Rider |
| PATCH | `/status-change/:rideId` | Update ride status | Yes | Driver |
| PATCH | `/cancel/:rideId` | Cancel ride | Yes | Rider, Driver |
| GET | `/all` | Get all rides with filters | Yes | Admin |
| GET | `/single-ride/:rideId` | Get ride details | Yes | All |
| GET | `/history/:userId` | Get user ride history | Yes | Rider, Driver |
| PATCH | `/reject/:rideId` | Reject ride request | Yes | Driver |
| PATCH | `/accept/:rideId` | Accept ride request | Yes | Driver |
| POST | `/feedback/:rideId` | Submit ride feedback | Yes | Rider |

### 📊 Analytics (`/api/v1/analytics`)
| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| GET | `/dashboard-summary` | Get dashboard KPIs | Yes | Admin |
| GET | `/ride-trends` | Get ride trends analysis | Yes | Admin |
| GET | `/revenue-trends` | Get revenue analytics | Yes | Admin |
| GET | `/top-drivers` | Get top performing drivers | Yes | Admin |
| GET | `/top-riders` | Get most active riders | Yes | Admin |
| GET | `/cancellation-breakdown` | Cancellation statistics | Yes | Admin |
| GET | `/funnel` | Ride conversion funnel | Yes | Admin |

### 📈 Reports (`/api/v1/report`)
| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| GET | `/kpi` | Export KPI report (PDF/CSV/Excel) | Yes | Admin |
| GET | `/top-drivers` | Export top drivers report | Yes | Admin |
| GET | `/top-riders` | Export top riders report | Yes | Admin |
| GET | `/full-analytics` | Export complete analytics | Yes | Admin |

### 📝 Query Parameters (Common)
Most listing endpoints support:
- `search` - Search term
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `sort` - Sort field (e.g., `createdAt`, `-fare`)
- `status` - Filter by status
- `startDate` / `endDate` - Date range filtering

### 🔄 Real-Time Events (Socket.IO)
- `new_ride_request` - Emitted to driver when assigned
- `ride_status_change` - Emitted on status updates
- `ride_cancelled` - Emitted when ride cancelled
- `driver_timeout` - Emitted when driver doesn't respond

> 📌 **Note**: See source code for detailed request/response schemas and validation rules.

## 🚀 Getting Started

### Prerequisites
- **Node.js**: 18.x or higher
- **MongoDB**: 4.4 or higher (with geospatial index support)
- **npm** or **yarn** package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ride-booking-backend.git
   cd ride-booking-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   
   Create a `.env` file in the root directory:
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   
   # Database
   DB_URL=mongodb://localhost:27017/ride-booking
   
   # JWT Secrets
   JWT_ACCESS_SECRET=your-access-secret-key
   JWT_REFRESH_SECRET=your-refresh-secret-key
   JWT_ACCESS_EXPIRES_IN=1d
   JWT_REFRESH_EXPIRES_IN=7d
   
   # Google OAuth
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GOOGLE_CALLBACK_URL=http://localhost:5000/api/v1/auth/google/callback
   
   # Session
   EXPRESS_SESSION_SECRET=your-session-secret
   
   # Frontend URL (for CORS)
   FRONTEND_URL=http://localhost:3000
   
   # Password Hashing
   SALT_ROUND=10
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   npm start
   ```

### 📁 Project Structure
```
src/
├── app.ts                      # Express app configuration
├── server.ts                   # Server entry point
└── app/
    ├── agenda/                 # Background job definitions
    │   ├── agenda.ts
    │   └── jobs/
    │       └── ride.job.ts     # Ride-related jobs
    ├── config/                 # Configuration files
    │   ├── env.ts             # Environment variables
    │   ├── passport.ts        # Passport strategies
    │   └── socket.ts          # Socket.IO setup
    ├── constants.ts           # App-wide constants
    ├── errorHelpers/          # Custom error classes
    ├── helpers/               # Error handling utilities
    ├── interfaces/            # TypeScript interfaces
    ├── middlewares/           # Express middlewares
    │   ├── checkAuth.ts
    │   ├── globalErrorHandler.ts
    │   ├── notFound.ts
    │   └── validateRequest.ts
    ├── modules/               # Feature modules
    │   ├── analytics/
    │   ├── auth/
    │   ├── driver/
    │   ├── report/
    │   ├── ride/
    │   ├── user/
    │   └── vehicle/
    ├── routes/                # Route aggregator
    │   └── index.ts
    └── utils/                 # Utility functions
        ├── catchAsync.ts
        ├── fareCalculation.ts
        ├── findNearestAvailableDriver.ts
        ├── jwt.ts
        ├── kmCalculation.ts
        ├── queryBuilder.ts
        ├── rideStatusChange.ts
        ├── socket.ts
        └── surge.ts
```

### 🗄️ Database Setup

The application uses MongoDB with geospatial indexing for location-based queries. Ensure your MongoDB instance supports 2dsphere indexes.

**Automatic Index Creation**: Mongoose will automatically create required indexes on first run.

**Manual Index Creation** (if needed):
```javascript
db.drivers.createIndex({ location: "2dsphere" })
```

### 🔧 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with auto-reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint on source code |
| `npm test` | Run tests (not yet implemented) |

### 🌱 Seeding Data

The application automatically seeds an admin user on first run in development mode:

- **Email**: admin@example.com
- **Password**: admin123
- **Role**: Admin

> ⚠️ **Security Note**: Change default admin credentials immediately in production!

### 🧪 Testing the API

You can test the API using:
- **Postman**: Import endpoints and test with proper authentication
- **cURL**: Command-line testing
- **Frontend App**: Connect to the frontend application

**Base URL**: 
- Development: `http://localhost:5000/api/v1`
- Production: `https://your-app-name.onrender.com/api/v1`

## 🏗️ Architecture & Design Patterns

### Modular Architecture
- **Service Layer Pattern**: Business logic separated from controllers
- **Repository Pattern**: Data access abstraction through Mongoose models
- **Middleware Pattern**: Reusable request processing pipeline
- **Factory Pattern**: Dynamic error handler creation
- **Strategy Pattern**: Multiple fare calculation strategies

### Key Design Principles
- **Separation of Concerns**: Clear boundaries between layers
- **DRY (Don't Repeat Yourself)**: Reusable utilities and helpers
- **SOLID Principles**: Single responsibility, open-closed, etc.
- **Error-First Approach**: Comprehensive error handling at every layer
- **Type Safety**: Full TypeScript coverage

### Code Organization
Each feature module follows this structure:
```
module/
├── module.interface.ts     # TypeScript interfaces
├── module.model.ts         # Mongoose schema & model
├── module.validation.ts    # Zod validation schemas
├── module.controller.ts    # Request handlers
├── module.service.ts       # Business logic
├── module.route.ts         # Express routes
└── module.constants.ts     # Module-specific constants
```

## 🔒 Security Features

- ✅ JWT-based authentication with access & refresh tokens
- ✅ Password hashing with bcrypt (10 rounds)
- ✅ Secure HTTP-only cookies
- ✅ CORS configuration with credential support
- ✅ Request validation using Zod schemas
- ✅ Role-based access control (RBAC)
- ✅ Session management with express-session
- ✅ Environment-based security settings
- ✅ SQL injection prevention (NoSQL database)
- ✅ XSS protection through input validation
- ✅ Trust proxy configuration for deployment

## 🚀 Deployment

### Render Deployment (Recommended)

The application is currently deployed on Render with GitHub integration.

#### Quick Setup:

1. **Create Account & Connect GitHub**
   - Sign up at [render.com](https://render.com)
   - Connect your GitHub account

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Select your repository
   - Choose branch (usually `main`)

3. **Configuration**:
   ```yaml
   Name: ride-booking-backend
   Region: Choose nearest to your users
   Branch: main
   Runtime: Node
   Build Command: npm install && npm run build
   Start Command: npm start
   ```

4. **Environment Variables**:
   Add all required environment variables in Render dashboard:
   ```env
   NODE_ENV=production
   PORT=10000
   DB_URL=your-mongodb-connection-string
   JWT_ACCESS_SECRET=your-access-secret
   JWT_REFRESH_SECRET=your-refresh-secret
   JWT_ACCESS_EXPIRES_IN=1d
   JWT_REFRESH_EXPIRES_IN=7d
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GOOGLE_CALLBACK_URL=https://your-app.onrender.com/api/v1/auth/google/callback
   EXPRESS_SESSION_SECRET=your-session-secret
   FRONTEND_URL=your-frontend-url
   SALT_ROUND=10
   ```

5. **Deploy**:
   - Click "Create Web Service"
   - Render will auto-deploy on every push to your branch
   - Your app will be live at: `https://your-app-name.onrender.com`

#### Post-Deployment:
- ✅ Update Google OAuth callback URL in Google Cloud Console
- ✅ Whitelist Render IPs in MongoDB Atlas (or allow all: 0.0.0.0/0)
- ✅ Update FRONTEND_URL to match your frontend deployment
- ✅ Test all endpoints and Socket.IO connections

#### Render Features:
- ✅ Automatic deployments from GitHub
- ✅ Free SSL certificates
- ✅ Zero-downtime deploys
- ✅ Auto-scaling capabilities
- ✅ Built-in health checks
- ✅ Log streaming and monitoring

> **Note**: Render free tier may spin down with inactivity. Upgrade to paid plan for always-on service.

### Alternative Deployment Options

<details>
<summary><b>Railway Deployment</b></summary>

```bash
# Add Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add environment variables
railway variables

# Deploy
railway up
```
</details>

<details>
<summary><b>Vercel Deployment</b></summary>

1. **Build Settings**:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

2. **Environment Variables**: Configure all `.env` variables in Vercel dashboard

3. **Serverless Functions**: Express app runs as serverless function

> **Note**: Vercel is optimized for serverless. For long-running processes (Socket.IO, Agenda jobs), Render is recommended.
</details>

<details>
<summary><b>Heroku Deployment</b></summary>

```bash
# Login to Heroku
heroku login

# Create app
heroku create your-app-name

# Add MongoDB addon
heroku addons:create mongolab

# Set environment variables
heroku config:set JWT_ACCESS_SECRET=your-secret

# Deploy
git push heroku main
```
</details>

<details>
<summary><b>Docker Deployment</b></summary>

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

```bash
docker build -t ride-booking-backend .
docker run -p 5000:5000 --env-file .env ride-booking-backend
```
</details>

## 📊 Performance Optimizations

- ✅ MongoDB indexing for geospatial queries (2dsphere)
- ✅ Database query optimization with projections
- ✅ Pagination for large datasets
- ✅ Lean queries for read-only operations
- ✅ Connection pooling with Mongoose
- ✅ Background job processing with Agenda
- ✅ Efficient driver matching algorithm
- ✅ Caching strategies (future: Redis integration)

## 🐛 Troubleshooting

### Common Issues

**1. MongoDB Connection Error**
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution**: Ensure MongoDB is running. Check DB_URL in `.env`

**2. Google OAuth Not Working**
```
Error: Callback URL mismatch
```
**Solution**: Update Google Cloud Console with correct callback URL

**3. CORS Error**
```
Access to fetch blocked by CORS policy
```
**Solution**: Add your frontend URL to `allowedOrigins` in [app.ts](src/app.ts)

**4. Socket.IO Connection Failed**
```
WebSocket connection failed
```
**Solution**: Ensure Socket.IO client matches server version. Check CORS settings.

**5. Geospatial Queries Not Working**
```
Error: unable to find index for $geoNear query
```
**Solution**: Create 2dsphere index on driver location field:
```javascript
db.drivers.createIndex({ location: "2dsphere" })
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards
- Follow TypeScript best practices
- Write meaningful commit messages
- Add comments for complex logic
- Ensure all tests pass (when implemented)
- Update documentation for new features

## 📝 Future Enhancements

- [ ] Redis caching for improved performance
- [ ] Rate limiting for API protection
- [ ] WebSocket authentication middleware
- [ ] Driver-to-rider rating system
- [ ] Push notifications (Firebase)
- [ ] Payment gateway integration (Stripe/Razorpay)
- [ ] Ride sharing/carpooling feature
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Unit and integration tests
- [ ] API documentation with Swagger/OpenAPI
- [ ] Ride scheduling (book for later)
- [ ] Promo code and discount system
- [ ] Driver heat map visualization
- [ ] SOS/Emergency button

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👨‍💻 Author

**Your Name**
- GitHub: [@yourusername](https://github.com/yourusername)
- LinkedIn: [Your Profile](https://linkedin.com/in/yourprofile)

## 🙏 Acknowledgments

- MongoDB for powerful geospatial queries
- Socket.IO for real-time communication
- Passport.js for authentication strategies
- Agenda for reliable job scheduling
- The Node.js and TypeScript communities

---

<div align="center">

**⭐ Star this repo if you find it helpful!**

Made with ❤️ by [Your Name]

</div>


