require('dotenv').config();
const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise');

const app = express();
const PORT = Number(process.env.PORT || 3000);
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hotel_management',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true,
  dateStrings: true
});

function asyncRoute(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
function httpError(status, message) {
  const error = new Error(message); error.status = status; return error;
}
function validDateRange(checkIn, checkOut) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(checkIn || '')) &&
    /^\d{4}-\d{2}-\d{2}$/.test(String(checkOut || '')) && checkOut > checkIn;
}

app.get('/api/health', asyncRoute(async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected', app: 'Hotel Management System' });
  } catch (_e) {
    res.status(503).json({ status: 'demo', database: 'not connected', message: 'The UI can still run in demo mode.' });
  }
}));

app.get('/api/rooms', asyncRoute(async (req, res) => {
  const { checkIn, checkOut, type } = req.query;
  let sql = 'SELECT * FROM Rooms';
  const params = [];
  const where = [];
  if (type && type !== 'All') { where.push('Room_Type = ?'); params.push(type); }
  if (checkIn || checkOut) {
    if (!validDateRange(checkIn, checkOut)) throw httpError(400, 'Choose a valid check-in and check-out date.');
    where.push("Status <> 'Maintenance' AND Room_ID NOT IN (SELECT Room_ID FROM Reservations WHERE Status IN ('Booked','Checked-In') AND Check_In_Date < ? AND Check_Out_Date > ?)");
    params.push(checkOut, checkIn);
  }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY Rate_Per_Night ASC';
  const [rows] = await pool.query(sql, params);
  res.json(rows);
}));

app.post('/api/rooms', asyncRoute(async (req, res) => {
  const { Room_Number, Room_Type, Rate_Per_Night, Floor = 1, Status = 'Available', Description = '', Image_URL = '', Capacity = 2 } = req.body;
  if (!Room_Number || !['Single','Double','Deluxe','Suite'].includes(Room_Type) || Number(Rate_Per_Night) < 0) throw httpError(400, 'Enter a room number, valid type, and non-negative rate.');
  const [result] = await pool.execute('INSERT INTO Rooms (Room_Number, Room_Type, Rate_Per_Night, Floor, Status, Description, Image_URL, Capacity) VALUES (?,?,?,?,?,?,?,?)', [Room_Number, Room_Type, Number(Rate_Per_Night), Number(Floor), Status, Description, Image_URL, Number(Capacity)]);
  const [rows] = await pool.execute('SELECT * FROM Rooms WHERE Room_ID = ?', [result.insertId]);
  res.status(201).json(rows[0]);
}));

app.get('/api/guests', asyncRoute(async (_req, res) => {
  const [rows] = await pool.query('SELECT G.*, COUNT(R.Reservation_ID) AS Reservation_Count FROM Guests G LEFT JOIN Reservations R ON R.Guest_ID=G.Guest_ID GROUP BY G.Guest_ID ORDER BY G.Guest_ID DESC');
  res.json(rows);
}));
app.get('/api/staff', asyncRoute(async (_req, res) => {
  const [rows] = await pool.query('SELECT * FROM Staff ORDER BY Staff_Name'); res.json(rows);
}));

app.get('/api/reservations', asyncRoute(async (_req, res) => {
  const [rows] = await pool.query(`SELECT R.Reservation_ID, R.Room_ID, R.Guest_ID, R.Staff_ID, R.Check_In_Date, R.Check_Out_Date, R.Num_Guests, R.Status, R.Created_At, G.Guest_Name, G.Email, G.Phone, RM.Room_Number, RM.Room_Type, RM.Rate_Per_Night, S.Staff_Name, DATEDIFF(R.Check_Out_Date,R.Check_In_Date) AS Nights FROM Reservations R JOIN Guests G ON G.Guest_ID=R.Guest_ID JOIN Rooms RM ON RM.Room_ID=R.Room_ID LEFT JOIN Staff S ON S.Staff_ID=R.Staff_ID ORDER BY R.Reservation_ID DESC`);
  res.json(rows);
}));

app.post('/api/reservations', asyncRoute(async (req, res) => {
  const { roomId, guestName, email, phone, checkIn, checkOut, guests = 1, staffId = null } = req.body;
  if (!roomId || !guestName?.trim() || !email?.trim() || !phone?.trim() || !validDateRange(checkIn, checkOut) || Number(guests) < 1) {
    throw httpError(400, 'Complete all guest details and choose a valid date range.');
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rooms] = await conn.execute('SELECT * FROM Rooms WHERE Room_ID = ? FOR UPDATE', [Number(roomId)]);
    if (!rooms.length) throw httpError(404, 'Room not found.');
    const room = rooms[0];
    if (room.Status === 'Maintenance') throw httpError(409, 'This room is currently under maintenance.');
    if (Number(guests) > Number(room.Capacity)) throw httpError(400, `This room can host up to ${room.Capacity} guest(s).`);
    const [conflicts] = await conn.execute("SELECT Reservation_ID FROM Reservations WHERE Room_ID = ? AND Status IN ('Booked','Checked-In') AND Check_In_Date < ? AND Check_Out_Date > ? LIMIT 1", [Number(roomId), checkOut, checkIn]);
    if (conflicts.length) throw httpError(409, 'That room is already booked for part of these dates. Please choose another room or dates.');
    let guestId;
    const [existing] = await conn.execute('SELECT Guest_ID FROM Guests WHERE Email = ?', [email.trim().toLowerCase()]);
    if (existing.length) {
      guestId = existing[0].Guest_ID;
      await conn.execute('UPDATE Guests SET Guest_Name=?, Phone=? WHERE Guest_ID=?', [guestName.trim(), phone.trim(), guestId]);
    } else {
      const [guestResult] = await conn.execute('INSERT INTO Guests (Guest_Name, Email, Phone) VALUES (?,?,?)', [guestName.trim(), email.trim().toLowerCase(), phone.trim()]);
      guestId = guestResult.insertId;
    }
    const [result] = await conn.execute("INSERT INTO Reservations (Room_ID, Guest_ID, Staff_ID, Check_In_Date, Check_Out_Date, Num_Guests, Status) VALUES (?,?,?,?,?,?, 'Booked')", [Number(roomId), guestId, staffId ? Number(staffId) : null, checkIn, checkOut, Number(guests)]);
    await conn.commit();
    const [rows] = await pool.execute(`SELECT R.Reservation_ID, R.Check_In_Date, R.Check_Out_Date, R.Num_Guests, R.Status, G.Guest_Name, G.Email, RM.Room_Number, RM.Room_Type, RM.Rate_Per_Night FROM Reservations R JOIN Guests G ON G.Guest_ID=R.Guest_ID JOIN Rooms RM ON RM.Room_ID=R.Room_ID WHERE R.Reservation_ID=?`, [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    await conn.rollback(); throw error;
  } finally { conn.release(); }
}));

app.patch('/api/reservations/:id/status', asyncRoute(async (req, res) => {
  const { status } = req.body;
  const allowed = ['Booked','Checked-In','Checked-Out','Cancelled'];
  if (!allowed.includes(status)) throw httpError(400, 'Invalid reservation status.');
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute('SELECT * FROM Reservations WHERE Reservation_ID=? FOR UPDATE', [Number(req.params.id)]);
    if (!rows.length) throw httpError(404, 'Reservation not found.');
    const reservation = rows[0];
    if (reservation.Status === 'Cancelled' || reservation.Status === 'Checked-Out') throw httpError(409, 'A cancelled or checked-out reservation cannot be changed.');
    if (status === 'Checked-In') {
      const [overlaps] = await conn.execute("SELECT Reservation_ID FROM Reservations WHERE Room_ID=? AND Reservation_ID<>? AND Status='Checked-In' LIMIT 1", [reservation.Room_ID, reservation.Reservation_ID]);
      if (overlaps.length) throw httpError(409, 'This room is already marked occupied by another stay.');
      await conn.execute("UPDATE Rooms SET Status='Occupied' WHERE Room_ID=?", [reservation.Room_ID]);
    }
    await conn.execute('UPDATE Reservations SET Status=? WHERE Reservation_ID=?', [status, reservation.Reservation_ID]);
    if (status === 'Checked-Out' || status === 'Cancelled') {
      const [active] = await conn.execute("SELECT Reservation_ID FROM Reservations WHERE Room_ID=? AND Reservation_ID<>? AND Status='Checked-In' LIMIT 1", [reservation.Room_ID, reservation.Reservation_ID]);
      const [room] = await conn.execute('SELECT Status FROM Rooms WHERE Room_ID=?', [reservation.Room_ID]);
      if (!active.length && room[0]?.Status === 'Occupied') await conn.execute("UPDATE Rooms SET Status='Available' WHERE Room_ID=?", [reservation.Room_ID]);
    }
    await conn.commit(); res.json({ success: true, Reservation_ID: reservation.Reservation_ID, Status: status });
  } catch (error) { await conn.rollback(); throw error; }
  finally { conn.release(); }
}));

app.get('/api/billing', asyncRoute(async (_req, res) => {
  const [rows] = await pool.query(`SELECT B.*, R.Guest_ID, G.Guest_Name, R.Room_ID, RM.Room_Number FROM Billing B JOIN Reservations R ON R.Reservation_ID=B.Reservation_ID JOIN Guests G ON G.Guest_ID=R.Guest_ID JOIN Rooms RM ON RM.Room_ID=R.Room_ID ORDER BY B.Billing_Date DESC, B.Bill_ID DESC`);
  res.json(rows);
}));
app.post('/api/billing', asyncRoute(async (req, res) => {
  const { reservationId, description, amount, billingDate, paymentStatus = 'Pending' } = req.body;
  if (!reservationId || !description?.trim() || !Number.isFinite(Number(amount)) || Number(amount) < 0 || !/^\d{4}-\d{2}-\d{2}$/.test(String(billingDate || '')) || !['Paid','Pending'].includes(paymentStatus)) throw httpError(400, 'Enter a valid reservation, description, amount and date.');
  const [result] = await pool.execute('INSERT INTO Billing (Reservation_ID, Service_Description, Amount, Billing_Date, Payment_Status) VALUES (?,?,?,?,?)', [Number(reservationId), description.trim(), Number(amount), billingDate, paymentStatus]);
  const [rows] = await pool.execute('SELECT * FROM Billing WHERE Bill_ID=?', [result.insertId]); res.status(201).json(rows[0]);
}));
app.patch('/api/billing/:id/payment', asyncRoute(async (req, res) => {
  const { paymentStatus } = req.body;
  if (!['Paid','Pending'].includes(paymentStatus)) throw httpError(400, 'Invalid payment status.');
  const [result] = await pool.execute('UPDATE Billing SET Payment_Status=? WHERE Bill_ID=?', [paymentStatus, Number(req.params.id)]);
  if (!result.affectedRows) throw httpError(404, 'Bill not found.');
  res.json({ success: true, Bill_ID: Number(req.params.id), Payment_Status: paymentStatus });
}));

app.get('/api/dashboard', asyncRoute(async (_req, res) => {
  const [[roomStats]] = await pool.query("SELECT COUNT(*) AS Total_Rooms, SUM(Status='Available') AS Available_Rooms, SUM(Status='Occupied') AS Occupied_Rooms, SUM(Status='Maintenance') AS Maintenance_Rooms FROM Rooms");
  const [[bookingStats]] = await pool.query("SELECT COUNT(*) AS Total_Reservations, SUM(Status='Booked') AS Booked, SUM(Status='Checked-In') AS Checked_In FROM Reservations");
  const [[guestStats]] = await pool.query('SELECT COUNT(*) AS Total_Guests FROM Guests');
  const [[billingStats]] = await pool.query("SELECT COALESCE(SUM(CASE WHEN Payment_Status='Paid' THEN Amount ELSE 0 END),0) AS Revenue, COALESCE(SUM(CASE WHEN Payment_Status='Pending' THEN Amount ELSE 0 END),0) AS Pending_Amount FROM Billing");
  const [recent] = await pool.query(`SELECT R.Reservation_ID, G.Guest_Name, RM.Room_Number, R.Check_In_Date, R.Check_Out_Date, R.Status FROM Reservations R JOIN Guests G ON G.Guest_ID=R.Guest_ID JOIN Rooms RM ON RM.Room_ID=R.Room_ID ORDER BY R.Reservation_ID DESC LIMIT 5`);
  res.json({ ...roomStats, ...bookingStats, ...guestStats, ...billingStats, Recent_Reservations: recent });
}));

app.use('/api', (req, res) => res.status(404).json({ error: 'API endpoint not found.' }));
app.use((err, _req, res, _next) => {
  console.error('[API]', err.message);
  if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'That email or room number already exists. Please check the details.' });
  if (err.code === 'ER_NO_REFERENCED_ROW_2') return res.status(400).json({ error: 'The selected related record does not exist.' });
  res.status(err.status || 500).json({ error: err.status ? err.message : 'The request failed. Check the server/database settings and try again.' });
});

app.listen(PORT, () => console.log(`Hotel Management System running at http://localhost:${PORT}`));
