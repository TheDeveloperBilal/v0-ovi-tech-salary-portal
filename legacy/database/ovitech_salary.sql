-- OviTech Salary Portal Database Schema
-- Import this file in phpMyAdmin to create the database

CREATE DATABASE IF NOT EXISTS `ovitech_salary`;
USE `ovitech_salary`;

-- Users/Admin Table
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `role` ENUM('admin', 'employee') DEFAULT 'employee',
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email)
);

-- Employees Table
CREATE TABLE IF NOT EXISTS `employees` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT,
  `employee_id` VARCHAR(20) NOT NULL UNIQUE,
  `first_name` VARCHAR(50) NOT NULL,
  `last_name` VARCHAR(50) NOT NULL,
  `email` VARCHAR(100),
  `phone` VARCHAR(15),
  `designation` VARCHAR(100),
  `department` VARCHAR(100),
  `date_of_joining` DATE,
  `bank_account` VARCHAR(20),
  `bank_name` VARCHAR(100),
  `pan` VARCHAR(20),
  `aadhar` VARCHAR(20),
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_employee_id (employee_id)
);

-- Salary Structure Table
CREATE TABLE IF NOT EXISTS `salary_structures` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `employee_id` INT NOT NULL,
  `month` INT NOT NULL,
  `year` INT NOT NULL,
  `base_salary` DECIMAL(10, 2) NOT NULL,
  `hra` DECIMAL(10, 2) DEFAULT 0,
  `dearness_allowance` DECIMAL(10, 2) DEFAULT 0,
  `medical_allowance` DECIMAL(10, 2) DEFAULT 0,
  `transport_allowance` DECIMAL(10, 2) DEFAULT 0,
  `other_allowance` DECIMAL(10, 2) DEFAULT 0,
  `pf_deduction` DECIMAL(10, 2) DEFAULT 0,
  `esi_deduction` DECIMAL(10, 2) DEFAULT 0,
  `income_tax` DECIMAL(10, 2) DEFAULT 0,
  `loan_deduction` DECIMAL(10, 2) DEFAULT 0,
  `other_deduction` DECIMAL(10, 2) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id),
  UNIQUE KEY unique_salary (employee_id, month, year),
  INDEX idx_month_year (month, year)
);

-- Deduction Rules Table (for automatic calculations)
CREATE TABLE IF NOT EXISTS `deduction_rules` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `percentage` DECIMAL(5, 2),
  `fixed_amount` DECIMAL(10, 2),
  `rule_type` ENUM('percentage', 'fixed') DEFAULT 'percentage',
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Company Settings Table
CREATE TABLE IF NOT EXISTS `company_settings` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `setting_key` VARCHAR(100) NOT NULL UNIQUE,
  `setting_value` TEXT,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default company settings
INSERT INTO `company_settings` (`setting_key`, `setting_value`) VALUES
('company_name', 'OviTech Global Pvt Ltd'),
('company_email', 'info@ovitech.co'),
('company_phone', '+91-XXXXXXXXXX'),
('company_address', 'OviTech Global, India'),
('company_website', 'https://ovitech.co'),
('pf_percentage', '12'),
('esi_percentage', '0.75'),
('financial_year_start', '04'),
('logo_url', '/assets/ovitech-logo.png');

-- Insert sample admin user (password: admin123)
INSERT INTO `users` (`email`, `password`, `name`, `role`) VALUES
('admin@ovitech.co', '$2y$10$YIjlrTyapxM5p5Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z', 'Admin', 'admin');

-- Salary History/Audit Log Table
CREATE TABLE IF NOT EXISTS `salary_logs` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `salary_id` INT NOT NULL,
  `action` VARCHAR(100),
  `changed_by` INT,
  `old_values` JSON,
  `new_values` JSON,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (salary_id) REFERENCES salary_structures(id),
  FOREIGN KEY (changed_by) REFERENCES users(id),
  INDEX idx_created_at (created_at)
);
