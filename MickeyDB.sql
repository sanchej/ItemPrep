DROP DATABASE IF EXISTS MickeyDB;

-- Create the database
CREATE DATABASE MickeyDB;
USE MickeyDB;

-- Create the users table
CREATE TABLE Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    phone_number VARCHAR(15)
);

-- Create the orders table
CREATE TABLE Orders (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    stock_code VARCHAR(50) NOT NULL,
    box_location VARCHAR(50),
    vehicle_number VARCHAR(50),
    work_order_number VARCHAR(50),
    order_date DATETIME NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    completed BOOLEAN NOT NULL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES Users(user_id)
);
