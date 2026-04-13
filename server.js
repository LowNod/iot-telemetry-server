require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise'); // Використовуємо версію з підтримкою Promises

const app = express();

// Дозволяємо Express автоматично парсити вхідні JSON-дані
app.use(express.json());

// Тепер порт береться з .env, а якщо його там немає - ставиться 3000
const port = process.env.PORT || 3000;

const dbPool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Створюємо маршрут (endpoint), на який мікроконтролер буде відправляти POST-запит
app.post('/api/telemetry', async (req, res) => {
    // Витягуємо дані з JSON, який надіслав мікроконтролер
    const { device_id, voltage, charge_percentage, temperature, network_status } = req.body;

    // Базова перевірка: чи передав мікроконтролер хоча б device_id
    if (!device_id) {
        return res.status(400).json({ error: "Помилка: Відсутній device_id" });
    }

    try {
        // SQL-запит для вставки даних
        // Використовуємо знаки питання (?) для захисту від SQL-ін'єкцій
        const query = `
            INSERT INTO Telemetry 
            (device_id, voltage, charge_percentage, temperature, network_status) 
            VALUES (?, ?, ?, ?, ?)
        `;
        
        // Виконуємо запит, підставляючи змінні замість знаків питання
        const [result] = await dbPool.execute(query, [
            device_id, 
            voltage || null, 
            charge_percentage || null, 
            temperature || null, 
            network_status || 'disconnected'
        ]);

        // Відправляємо мікроконтролеру відповідь про успіх
        console.log(`[ОК] Дані збережено. ID телеметрії: ${result.insertId}`);
        res.status(201).json({ 
            success: true, 
            message: "Телеметрію успішно збережено",
            telemetry_id: result.insertId 
        });

    } catch (error) {
        // Якщо сталася помилка (наприклад, такого device_id не існує в таблиці Devices)
        console.error('[Помилка бази даних]:', error.message);
        res.status(500).json({ error: "Внутрішня помилка сервера при збереженні даних" });
    }
});

// Запускаємо сервер
app.listen(port, () => {
    console.log(`Сервер запущено. Очікування даних на http://localhost:${port}/api/telemetry`);
});