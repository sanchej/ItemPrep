const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const path = require('path');
const twilio = require('twilio');

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

const db = require('./db/dbConfig');
const ADMIN_PASSWORD = 'JustinDemo'; // Change this to a secure password



const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER; // Replace with your Twilio phone number
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);


function formatDateToMySQL(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = ('0' + (d.getMonth() + 1)).slice(-2);
    const day = ('0' + d.getDate()).slice(-2);
    const hours = ('0' + d.getHours()).slice(-2);
    const minutes = ('0' + d.getMinutes()).slice(-2);
    const seconds = ('0' + d.getSeconds()).slice(-2);
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

app.post('/api/signup', (req, res) => {
    const { first_name, last_name, phone_number } = req.body;
    const checkSql = 'SELECT * FROM Users WHERE phone_number = ?';
    
    db.query(checkSql, [phone_number], (err, result) => {
        if (err) throw err;
        if (result.length > 0) {
            res.json({ success: false, message: 'Phone number already exists!' });
        } else {
            const insertSql = 'INSERT INTO Users (first_name, last_name, phone_number) VALUES (?, ?, ?)';
            db.query(insertSql, [first_name, last_name, phone_number], (err, result) => {
                if (err) throw err;
                res.json({ success: true, message: 'User signed up successfully!' });
            });
        }
    });
});

app.post('/api/login', (req, res) => {
    const { phone_number } = req.body;
    const sql = 'SELECT * FROM Users WHERE phone_number = ?';
    
    db.query(sql, [phone_number], (err, result) => {
        if (err) throw err;
        if (result.length > 0) {
            res.json({ success: true, user_id: result[0].user_id });
        } else {
            res.json({ success: false });
        }
    });
});

app.post('/api/orders', (req, res) => {
    const { userId, stockCode, boxLocation, vehicleNumber, workOrderNumber, quantity, orderDate } = req.body;
    const formattedOrderDate = formatDateToMySQL(orderDate);
    const sql = 'INSERT INTO Orders (user_id, stock_code, box_location, vehicle_number, work_order_number, quantity, order_date, completed) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    
    db.query(sql, [userId, stockCode, boxLocation, vehicleNumber, workOrderNumber, quantity, formattedOrderDate, false], (err, result) => {
        if (err) {
            res.json({ success: false, message: 'Failed to submit order.' });
            throw err;
        }
        res.json({ success: true, message: 'Order submitted successfully!' });
    });
});

app.post('/api/send-text', (req, res) => {
    const { user_id, box_location } = req.body;
    const sql = 'SELECT phone_number FROM Users WHERE user_id = ?';
    
    db.query(sql, [user_id], (err, result) => {
        if (err) throw err;
        if (result.length > 0) {
            const phoneNumber = result[0].phone_number;
            const messageBody = `Hello! Please pick up your item at the following box location: ${box_location}`;
            twilioClient.messages
                .create({
                    body: messageBody,
                    from: twilioPhoneNumber,
                     to: phoneNumber
                })
                .then(message => {
                    res.json({ success: true, message: 'Text message sent successfully!' });
                })
                .catch(err => {
                    res.json({ success: false, message: 'Failed to send text message.' });
                    console.error('Twilio error:', err);
                });
        } else {
            res.json({ success: false, message: 'User not found.' });
        }
    });
});

// Admin login route
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

// Fetch orders for admin
app.get('/api/admin/orders', (req, res) => {
    const sql = 'SELECT * FROM Orders';
    db.query(sql, (err, results) => {
        if (err) throw err;
        res.json({ orders: results });
    });
});

// Update order completion status for all orders
app.post('/api/admin/update-completed-all', (req, res) => {
    const updates = req.body.updates;
    const promises = updates.map(update => {
        const { orderId, completed } = update;
        const sql = 'UPDATE Orders SET completed = ? WHERE order_id = ?';
        return new Promise((resolve, reject) => {
            db.query(sql, [completed, orderId], (err, result) => {
                if (err) {
                    return reject(err);
                }
                resolve(result);
            });
        });
    });

    Promise.all(promises)
        .then(results => {
            res.json({ success: true, message: 'All orders updated successfully!' });
        })
        .catch(err => {
            res.json({ success: false, message: 'Failed to update some or all orders.' });
        });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
