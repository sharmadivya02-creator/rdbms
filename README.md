# Nomad / Stay — Hotel Management System

A responsive hotel website and hotel-record management interface built for an RDBMS laboratory project. The visual direction takes inspiration from the reference images: calm editorial typography, warm off-white surfaces, forest-green accents, gold details, and large hotel photography.

## What is included

- **Luxury frontend:** responsive landing page, room cards, date/type search, booking form and room availability filtering.
- **Hotel management dashboard:** room/booking/guest summaries; reservations, guests, billing and staff tabs.
- **Booking workflow:** creates a guest record when needed, validates dates and room capacity, checks date overlaps and prevents double-bookings.
- **Reservation workflow:** change bookings to Checked-In, Checked-Out or Cancelled.
- **Billing workflow:** view charges and mark pending bills as paid.
- **MySQL database:** five connected tables (`Rooms`, `Guests`, `Staff`, `Reservations`, `Billing`), primary/foreign keys, unique constraints, checks and indexes, plus sample data.
- **Demo mode:** if MySQL is not connected, the interface remains usable and saves changes in browser `localStorage`.

> **Important:** demo-mode records are saved only in the current browser. To demonstrate real RDBMS operations, connect MySQL using the steps below. This is an educational prototype, not a production hotel booking service.

## Color palette

| Use | Color | Hex |
|---|---|---|
| Main background | Warm ivory | `#F6F3EC` |
| Card / surface | Soft white | `#FFFEFA` |
| Main text | Deep forest ink | `#25332D` |
| Primary buttons / header band | Forest green | `#30473C` |
| Deep contrast | Forest charcoal | `#1E3028` |
| Branding / highlights | Muted antique gold | `#B59662` |
| Soft section background | Misty sage | `#DCE3D8` |
| Borders | Warm stone | `#D8D4CA` |
| Error / cancellation | Muted terracotta | `#A95B4E` |

## Stack

- Frontend: HTML, CSS and vanilla JavaScript
- Backend: Node.js + Express
- Database: MySQL 8+

## Run the frontend in demo mode (fastest)

1. Unzip the project.
2. Open `public/index.html` in a browser.
3. The page should load in demo mode. Room booking and dashboard edits are saved to that browser's local storage.

For best results, use the local server method below. The hotel photography and Google Fonts use external URLs and need an internet connection; the core layout and interface still work without those assets.

## Run the app with MySQL (recommended for the RDBMS lab)

### 1. Install prerequisites

Install **Node.js 18 or newer** and **MySQL 8 or newer**. You can use MySQL Workbench for the database setup.

### 2. Create the database and sample records

Option A — MySQL Workbench:

1. Open MySQL Workbench and connect to your local MySQL server.
2. Open `database/schema.sql`.
3. Execute the whole script. It creates the `hotel_management` database, five tables, relationships and fictional sample records.

Option B — terminal:

```bash
mysql -u root -p < database/schema.sql
```

The SQL includes `DROP TABLE` statements for these five project tables before recreating them. **Back up existing data before rerunning the script.**

### 3. Add your local database settings

Copy `.env.example` to a new file named `.env` in the project root. Edit the values to match your local MySQL setup:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=hotel_management
```

Do not share your `.env` file or commit it to GitHub; it contains your local database password.

### 4. Install Node packages and start

Open a terminal in the project folder and run:

```bash
npm install
npm start
```

Then open **http://localhost:3000** in your browser. The top of the management section should say `MYSQL CONNECTED`. If it says `DEMO MODE`, the frontend is open but the database connection needs fixing. Check the `.env` values, that MySQL is running, and that `hotel_management` exists.

For development with automatic server restarts, use `npm run dev`.

## Test that it works

1. Open the website and scroll to **Rooms that feel like coming home**.
2. Pick check-in and check-out dates and press **Find a room**.
3. Press **Reserve** on a room, enter guest information, and confirm the reservation.
4. Scroll to **Hotel overview → Reservations**. Find the new booking.
5. Try **Check in**, then **Check out**. Confirm the status changes and room status updates.
6. Open the **Guests** tab and confirm that the guest record was saved.
7. Open **Billing** and press **Mark paid** for a pending sample bill.
8. In MySQL Workbench, run the verification queries below to see the stored data.

## Useful SQL for the lab demonstration

```sql
USE hotel_management;

-- 1. List rooms and their statuses
SELECT Room_Number, Room_Type, Rate_Per_Night, Status FROM Rooms;

-- 2. Show booking, guest and room together (INNER JOIN)
SELECT R.Reservation_ID, G.Guest_Name, RM.Room_Number,
       R.Check_In_Date, R.Check_Out_Date, R.Status
FROM Reservations R
JOIN Guests G ON G.Guest_ID = R.Guest_ID
JOIN Rooms RM ON RM.Room_ID = R.Room_ID
ORDER BY R.Reservation_ID;

-- 3. Total billed amount and unpaid amount by guest (GROUP BY)
SELECT G.Guest_Name,
       SUM(B.Amount) AS Total_Charges,
       SUM(CASE WHEN B.Payment_Status = 'Pending' THEN B.Amount ELSE 0 END) AS Amount_Due
FROM Billing B
JOIN Reservations R ON R.Reservation_ID = B.Reservation_ID
JOIN Guests G ON G.Guest_ID = R.Guest_ID
GROUP BY G.Guest_ID, G.Guest_Name
HAVING SUM(B.Amount) > 0;

-- 4. Rooms that have no reservation overlap in a requested period
SET @check_in = '2027-03-10';
SET @check_out = '2027-03-12';
SELECT RM.Room_Number, RM.Room_Type, RM.Rate_Per_Night
FROM Rooms RM
WHERE RM.Status <> 'Maintenance'
AND NOT EXISTS (
  SELECT 1 FROM Reservations R
  WHERE R.Room_ID = RM.Room_ID
    AND R.Status IN ('Booked','Checked-In')
    AND R.Check_In_Date < @check_out
    AND R.Check_Out_Date > @check_in
);

-- 5. Revenue by payment status
SELECT Payment_Status, SUM(Amount) AS Total_Amount
FROM Billing GROUP BY Payment_Status;

-- 6. Count reservations by status
SELECT Status, COUNT(*) AS Reservation_Count
FROM Reservations GROUP BY Status;
```

## Project tables / relationships

- `Rooms` 1 → many `Reservations`
- `Guests` 1 → many `Reservations`
- `Staff` 1 → many `Reservations` (staff may be left unassigned)
- `Reservations` 1 → many `Billing` entries

The table design separates guest, room, staff, reservation and billing data to avoid repeating the same details in every reservation. The booking API also checks overlapping dates because a simple foreign key cannot by itself prevent a room from being booked twice for intersecting date ranges.

## Main API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Check API / database status |
| GET | `/api/rooms` | List rooms; optional `checkIn`, `checkOut`, `type` filters |
| POST | `/api/rooms` | Add a room record |
| GET | `/api/guests` | List guests with reservation counts |
| GET | `/api/staff` | List staff |
| GET | `/api/reservations` | List bookings with guest / room details |
| POST | `/api/reservations` | Create a booking and guest when needed |
| PATCH | `/api/reservations/:id/status` | Check in, check out or cancel a booking |
| GET | `/api/billing` | List billing entries |
| POST | `/api/billing` | Add a billing charge |
| PATCH | `/api/billing/:id/payment` | Update payment status |
| GET | `/api/dashboard` | Summary metrics for the dashboard |

## Notes / limitations

- Starter guest names and records are fictional demo data.
- This project intentionally has no login, role permissions, payment gateway, email/SMS notifications or production-grade security. Do not use real guest personal data or deploy it publicly as-is.
- In a real deployment, add authentication, input-rate limits, secure environment management, privacy controls, audit logs, backups and stronger date/state validation.
- Room images and Google Fonts are loaded from external URLs. Replace image URLs in `database/schema.sql` or `public/app.js` if desired.
