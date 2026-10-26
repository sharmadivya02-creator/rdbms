

CREATE DATABASE IF NOT EXISTS hotel_management
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hotel_management;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS Billing;
DROP TABLE IF EXISTS Reservations;
DROP TABLE IF EXISTS Staff;
DROP TABLE IF EXISTS Guests;
DROP TABLE IF EXISTS Rooms;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE Rooms (
  Room_ID INT PRIMARY KEY AUTO_INCREMENT,
  Room_Number VARCHAR(10) UNIQUE NOT NULL,
  Room_Type VARCHAR(30) NOT NULL,
  Rate_Per_Night DECIMAL(8,2) NOT NULL DEFAULT 0,
  Floor INT DEFAULT 1,
  Status VARCHAR(20) NOT NULL DEFAULT 'Available',
  Description VARCHAR(255) DEFAULT NULL,
  Image_URL VARCHAR(500) DEFAULT NULL,
  Capacity INT NOT NULL DEFAULT 2,
  CHECK (Room_Type IN ('Single','Double','Deluxe','Suite')),
  CHECK (Rate_Per_Night >= 0),
  CHECK (Status IN ('Available','Occupied','Maintenance')),
  CHECK (Capacity > 0),
  INDEX idx_rooms_status (Status),
  INDEX idx_rooms_type (Room_Type)
);

CREATE TABLE Guests (
  Guest_ID INT PRIMARY KEY AUTO_INCREMENT,
  Guest_Name VARCHAR(100) NOT NULL,
  Email VARCHAR(100) UNIQUE NOT NULL,
  Phone VARCHAR(15) NOT NULL,
  ID_Proof_Number VARCHAR(30) UNIQUE DEFAULT NULL,
  Address VARCHAR(150) DEFAULT NULL,
  Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Staff (
  Staff_ID INT PRIMARY KEY AUTO_INCREMENT,
  Staff_Name VARCHAR(100) NOT NULL,
  Designation VARCHAR(50) DEFAULT 'Front Desk',
  Shift VARCHAR(20) DEFAULT 'Morning',
  Salary DECIMAL(10,2) NOT NULL DEFAULT 0,
  CHECK (Salary >= 0)
);

CREATE TABLE Reservations (
  Reservation_ID INT PRIMARY KEY AUTO_INCREMENT,
  Room_ID INT NOT NULL,
  Guest_ID INT NOT NULL,
  Staff_ID INT DEFAULT NULL,
  Check_In_Date DATE NOT NULL,
  Check_Out_Date DATE NOT NULL,
  Num_Guests INT NOT NULL DEFAULT 1,
  Status VARCHAR(20) NOT NULL DEFAULT 'Booked',
  Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CHECK (Check_Out_Date > Check_In_Date),
  CHECK (Num_Guests > 0),
  CHECK (Status IN ('Booked','Checked-In','Checked-Out','Cancelled')),
  FOREIGN KEY (Room_ID) REFERENCES Rooms(Room_ID),
  FOREIGN KEY (Guest_ID) REFERENCES Guests(Guest_ID),
  FOREIGN KEY (Staff_ID) REFERENCES Staff(Staff_ID),
  INDEX idx_reservation_dates (Check_In_Date, Check_Out_Date),
  INDEX idx_reservation_status (Status)
);

CREATE TABLE Billing (
  Bill_ID INT PRIMARY KEY AUTO_INCREMENT,
  Reservation_ID INT NOT NULL,
  Service_Description VARCHAR(100) NOT NULL,
  Amount DECIMAL(8,2) NOT NULL DEFAULT 0,
  Billing_Date DATE NOT NULL,
  Payment_Status VARCHAR(20) NOT NULL DEFAULT 'Pending',
  CHECK (Amount >= 0),
  CHECK (Payment_Status IN ('Paid','Pending')),
  FOREIGN KEY (Reservation_ID) REFERENCES Reservations(Reservation_ID) ON DELETE CASCADE,
  INDEX idx_billing_payment (Payment_Status)
);

-- Starter room inventory (fictional property; edit these rates/details as needed)
INSERT INTO Rooms (Room_Number, Room_Type, Rate_Per_Night, Floor, Status, Description, Image_URL, Capacity) VALUES
('101','Single',3200,1,'Available','A calm, thoughtfully designed room for solo stays.','https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=900&q=85',1),
('102','Double',4800,1,'Available','A warm, spacious room for a comfortable city escape.','https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=900&q=85',2),
('201','Deluxe',7200,2,'Available','Soft linens, natural textures and a little extra room.','https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=900&q=85',2),
('202','Deluxe',7600,2,'Available','A light-filled retreat with a lounge corner.','https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=900&q=85',3),
('301','Suite',12500,3,'Available','An elevated suite with a separate living area.','https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=900&q=85',4),
('302','Suite',14800,3,'Maintenance','Signature suite, currently being prepared for guests.','https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=900&q=85',4);

INSERT INTO Guests (Guest_Name, Email, Phone, ID_Proof_Number, Address) VALUES
('Aarav Mehta','aarav.mehta@example.com','9876501234','DEMO-ID-1001','Jaipur'),
('Mira Kapoor','mira.kapoor@example.com','9876505678','DEMO-ID-1002','Delhi'),
('Kabir Rao','kabir.rao@example.com','9876512345','DEMO-ID-1003','Udaipur');

INSERT INTO Staff (Staff_Name, Designation, Shift, Salary) VALUES
('Riya Sharma','Front Desk Manager','Morning',42000),
('Arjun Singh','Guest Relations','Evening',35000),
('Neha Verma','Reservations Executive','Night',33000);

-- Sample reservations are intentionally in the future relative to the project's example date.
-- Dates can be edited in the application or SQL Workbench.
INSERT INTO Reservations (Room_ID, Guest_ID, Staff_ID, Check_In_Date, Check_Out_Date, Num_Guests, Status) VALUES
(2,1,1,'2027-01-14','2027-01-17',2,'Booked'),
(4,2,2,'2027-02-05','2027-02-08',2,'Booked'),
(1,3,3,'2027-01-03','2027-01-05',1,'Checked-Out');

INSERT INTO Billing (Reservation_ID, Service_Description, Amount, Billing_Date, Payment_Status) VALUES
(1,'Room service',850,'2027-01-15','Pending'),
(1,'Laundry',450,'2027-01-16','Pending'),
(2,'Welcome dining',1200,'2027-02-05','Paid'),
(3,'Room charges',6400,'2027-01-05','Paid');

