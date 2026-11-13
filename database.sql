-- ====================================================================
-- Kapse - G 🔰 Tailor Shop Customer Management System
-- Database Schema & Initialization Script
-- Engine: MySQL 8.0+ / MariaDB
-- Character Set: utf8mb4 (Full Unicode & Emoji support)
-- ====================================================================

-- 1. Create Database
CREATE DATABASE IF NOT EXISTS `tailor_shop_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `tailor_shop_db`;

-- 2. Create Customers Table
CREATE TABLE IF NOT EXISTS `customers` (
  `id` VARCHAR(20) NOT NULL COMMENT 'Unique Customer ID (e.g. CUST-1001)',
  `name` VARCHAR(150) NOT NULL COMMENT 'Full Name of the Customer',
  `mobile` VARCHAR(20) NOT NULL COMMENT 'Customer Mobile Number',
  `place` VARCHAR(255) NOT NULL COMMENT 'Town / Village / Address',
  `bill_book` VARCHAR(50) NOT NULL COMMENT 'Physical Bill Book Number (e.g. B-01, 5)',
  `page_no` VARCHAR(50) NOT NULL COMMENT 'Page Number in Bill Book',
  `date` DATE NOT NULL COMMENT 'Registration Date (YYYY-MM-DD)',
  `notes` TEXT DEFAULT NULL COMMENT 'Measurements, fabric preferences, special remarks',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Record Creation Timestamp',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Record Last Update Timestamp',
  PRIMARY KEY (`id`),
  INDEX `idx_customers_name` (`name`),
  INDEX `idx_customers_mobile` (`mobile`),
  INDEX `idx_customers_bill_book` (`bill_book`),
  INDEX `idx_customers_page_no` (`page_no`),
  INDEX `idx_customers_date` (`date`),
  INDEX `idx_customers_place` (`place`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tailor shop customer records and physical bill book registry';

-- 3. Initial Sample Records (Optional - will be ignored if already existing)
INSERT IGNORE INTO `customers` (`id`, `name`, `mobile`, `place`, `bill_book`, `page_no`, `date`, `notes`) VALUES
('CUST-1001', 'Rajesh Sharma', '9876543210', 'Main Bazaar, Shop No. 4', 'B-01', '24', CURDATE(), '3-Piece Italian Wool Suit (Navy Blue). Chest 40, Waist 34, Length 31. Urgent delivery for wedding.'),
('CUST-1002', 'Mohammad Alvi', '9811223344', 'Gandhi Chowk, Sector 2', 'B-01', '48', CURDATE(), 'Cotton Kurta Pajama set with Mandarin collar and hand-embroidered cuffs.'),
('CUST-1003', 'Suresh Patel', '9898761234', 'Station Road, Near Clock Tower', 'B-02', '12', CURDATE(), '2 Formal Trousers (Charcoal & Olive) and 3 Linen Shirts.'),
('CUST-1004', 'Anand Verma', '9765432109', 'Ring Road Market, Flat 3B', 'B-02', '35', CURDATE(), 'Classic Safari Suit with double breast pockets.'),
('CUST-1005', 'Kavita Rao', '9833445566', 'Shivaji Nagar, Pune', 'B-03', '10', CURDATE(), 'Bridal Anarkali suit with heavy zardozi embroidery.');
