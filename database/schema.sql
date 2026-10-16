-- Active: 1787828608423@@127.0.0.1@3306@pharmacy_db

CREATE DATABASE IF NOT EXISTS pharmacy_db;

USE pharmacy_db;

-- Store customer and administrator accounts
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('customer', 'admin') NOT NULL DEFAULT 'customer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Store medicine categories
CREATE TABLE IF NOT EXISTS categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

-- Store medicines available in the pharmacy
CREATE TABLE IF NOT EXISTS medicines (
    medicine_id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    medicine_name VARCHAR(150) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    stock_quantity INT NOT NULL DEFAULT 0,
    requires_prescription BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (category_id)
        REFERENCES categories(category_id),

    CHECK (price >= 0),
    CHECK (stock_quantity >= 0)
);

-- Insert default medicine categories
INSERT IGNORE INTO categories (category_name, description)
VALUES
('Pain Relief', 'Medicines used to relieve pain'),
('Cold and Flu', 'Medicines for cold and flu symptoms'),
('Vitamins', 'Vitamin and nutritional supplements'),
('First Aid', 'Products for minor injuries and wound care'),
('Allergy', 'Medicines for allergy symptoms');

-- Insert sample medicines
INSERT INTO medicines
(category_id, medicine_name, description, price, stock_quantity, requires_prescription)
SELECT category_id, 'Paracetamol', 'Pain and fever relief', 100.00, 50, FALSE
FROM categories WHERE category_name = 'Pain Relief'
AND NOT EXISTS (
    SELECT 1 FROM medicines WHERE medicine_name = 'Paracetamol'
);

INSERT INTO medicines
(category_id, medicine_name, description, price, stock_quantity, requires_prescription)
SELECT category_id, 'Cetirizine', 'Relief from allergy symptoms', 150.00, 30, FALSE
FROM categories WHERE category_name = 'Allergy'
AND NOT EXISTS (
    SELECT 1 FROM medicines WHERE medicine_name = 'Cetirizine'
);

INSERT INTO medicines
(category_id, medicine_name, description, price, stock_quantity, requires_prescription)
SELECT category_id, 'Vitamin C', 'Vitamin C supplement', 250.00, 25, FALSE
FROM categories WHERE category_name = 'Vitamins'
AND NOT EXISTS (
    SELECT 1 FROM medicines WHERE medicine_name = 'Vitamin C'
);

INSERT INTO medicines
(category_id, medicine_name, description, price, stock_quantity, requires_prescription)
SELECT category_id, 'First Aid Antiseptic', 'Antiseptic for minor wound care', 200.00, 20, FALSE
FROM categories WHERE category_name = 'First Aid'
AND NOT EXISTS (
    SELECT 1 FROM medicines WHERE medicine_name = 'First Aid Antiseptic'
);

-- Store customer orders
CREATE TABLE IF NOT EXISTS orders (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(30) NOT NULL,
    delivery_address TEXT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status ENUM(
        'pending',
        'processing',
        'completed',
        'cancelled'
    ) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    CHECK (total_amount >= 0)
);

-- Store individual medicines belonging to each order
CREATE TABLE IF NOT EXISTS order_items (
    order_item_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    medicine_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,

    FOREIGN KEY (order_id)
        REFERENCES orders(order_id)
        ON DELETE CASCADE,

    FOREIGN KEY (medicine_id)
        REFERENCES medicines(medicine_id),

    CHECK (quantity > 0),
    CHECK (unit_price >= 0)
);
