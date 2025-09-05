# 📄 README.md

[🌐 Live API Deployment](https://ride-booking-backend-six.vercel.app)

## Project Overview

Ride Booking Backend is a scalable Node.js/Express backend for a ride-hailing platform. It manages user authentication, driver and vehicle management, ride requests, analytics, and real-time driver matching using MongoDB geospatial queries. The backend is designed for reliability, extensibility, and production deployment.

> **Distance Calculation:** This project uses the Haversine formula to calculate the distance (in kilometers) between two geographic coordinates (latitude/longitude) for accurate fare and driver matching logic.

## Features
- User authentication (JWT, Passport)
- Role-based access control (Admin, Rider, Driver) for secure and organized API access
- Modular, service-based architecture
- Rider, Driver and vehicle management
- Ride request, matching, and status tracking
- Ride status updates and full status history tracking for every ride
- Geospatial queries for nearest driver search
- Analytics and reporting (PDF,CSV and Excel export)
- Admin controls and driver approval
- Error handling and validation (Zod, Mongoose)
- Organized and consistent error responses for all API endpoints, including detailed error messages and validation feedback
- Job scheduling (Agenda)
- Automatic ride cancellation if no drivers are available within 10 minutes
- Drivers can accept or reject ride requests
- Drivers have 5 minutes to respond to a ride request
- Maximum cancellation policy and ride cancellation tracking
- Fare calculation with surge pricing and distance-based rates
- If a ride takes longer than the expected time, the fare is increased by a per-minute penalty
- Drivers earn 75% of the final fare (including any penalties)
- Riders  can rate  and leave feedback after each ride
- System finds the nearest available driver within a 5 km radius when a ride request is made
- Advanced search, filter, sorting and pagination for listing rides, drivers, and vehicles
- Search drivers based on location and show all drivers within a 5 km radius
- Riders and drivers can manually cancel a ride within the allowed cancellation window

## Business Logic

- **Auto-Cancellation:**
  - If no drivers are available for a ride request, the ride is automatically cancelled after 10 minutes.
  - If a driver or user does not respond to a ride request within the specified timeframe, the ride is automatically cancelled by the system.
- **Manual Ride Cancellation:**
  - Riders and drivers can manually cancel a ride within the allowed cancellation window (e.g., before the driver arrives or before the ride starts).
- **Driver Response Window:**
  - When a ride request is sent to a driver, the driver has 5 minutes to accept or reject the request. If there is no response within 5 minutes, the request is considered pending and may be reassigned or cancelled.
- **Driver Actions:**
  - Drivers can accept or reject ride requests directly from their or dashboard.
- **Cancellation Policy:**
  - The system tracks the number of cancellations per user and driver in a day.3 cancellation per day rider or driver will be blocked for 24 hours by system.
- **Fare Calculation:**
  - Fare is calculated based on distance, time, and include surge pricing during peak demand.If a ride takes longer than the expected time, the fare is increased by a per-minute penalty.
- **Nearest Driver Matching:**
  - When a ride request is made, the system automatically searches for the nearest available driver within a 5 km radius of the pickup location.
- **Search, Filter, Sort & Pagination:**
  - All major listing endpoints (rides, drivers, vehicles, riders) support advanced search, filtering, sorting and pagination for efficient data retrieval and management.
- **Location-Based Driver Search:**
  - The system allows searching for drivers based on a specific location and returns all available drivers within a 5 km radius of that point.
- **Ride Status & History:**
  - Every ride maintains a status (e.g., requested, accepted, going to pickup, driver arrived,in transit,reached the destination, completed, cancelled).
  - All status changes are recorded in a status history log with timestamps and the actor (rider/driver/system) who made the change.
  - The system provides endpoints to update the ride status and to retrieve the full status history for auditing and transparency.
- **Rating & Feedback:**
  - After each completed ride, riders can rate each other and provide feedback. Ratings contribute to user and driver reputation and may affect future matching.

## Roles & Permissions

This backend implements role-based access control (RBAC) with the following roles:

- **Admin**: Full access to all resources, analytics, reports, user/driver management, and system settings.
- **Rider**: Can register, request rides, view ride history, rate drivers, provide feedback, and manage their own profile.
- **Driver**: Can register, update location and availability, accept/reject/cancel rides, view earnings, and receive ratings/feedback.

> Most API endpoints are protected and require authentication. Access is granted based on the user's assigned role(s). See each endpoint for required roles.

## Tech Stack
- **Node.js** (Express.js)
- **TypeScript**
- **MongoDB** (Mongoose, 2dsphere geospatial index)
- **Zod** (validation)
- **Passport.js** (authentication)
- **Agenda** (job scheduling)
- **PDF**, **json2csv**, **exceljs** (reporting)
- **Vercel** (deployment)

## API Endpoints

### Auth
- `GET /api/auth/google`
- `GET /api/auth/google/callback`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/reset-password`
- `POST /api/auth/refresh-token`

### User
- `POST /api/user/register`
- `GET /api/user/all`
- `PATCH /api/user/:userId`

### Driver
- `POST /api/driver/create`
- `GET /api/driver/all`
- `PATCH /api/driver/approve-status/:driverId`
- `PATCH /api/driver/availability-status`
- `PATCH /api/driver/location`
- `GET /api/driver/earnings-history/:driverId`
- `PATCH /api/driver/is-suspended/:driverId`
- `PATCH /api/driver/rating/:driverId`

### Vehicle
- `POST /api/vehicle/create`
- `PATCH /api/vehicle/active/:vehicleId`

### Ride
- `POST /api/ride/create`
- `PATCH /api/ride/status-change/:rideId`
- `PATCH /api/ride/cancel/:rideId`
- `GET /api/ride/all`
- `GET /api/ride/single-ride/:rideId`
- `GET /api/ride/history/:userId`
- `PATCH /api/ride/reject/:rideId`
- `PATCH /api/ride/accept/:rideId`
- `POST /api/ride/feedback/:rideId`

### Report
- `GET /api/report/kpi`
- `GET /api/report/top-drivers`
- `GET /api/report/top-riders`
- `GET /api/report/full-analytics`

### Analytics
- `GET /api/analytics/dashboard-summary`
- `GET /api/analytics/ride-trends`
- `GET /api/analytics/revenue-trends`
- `GET /api/analytics/top-drivers`
- `GET /api/analytics/top-riders`
- `GET /api/analytics/cancellation-breakdown`
- `GET /api/analytics/funnel`

---

> For detailed request/response formats, see the source code.

---

## Getting Started
1. Clone the repo
2. Install dependencies: `npm install`
3. Set up your `.env` file
4. Start the server: `npm run dev`

---

## License
MIT


