require("dotenv").config();

const { Pool } = require('pg');

const pool = new Pool({
    user: 'admin',
    host: 'localhost',
    database: 'login',
    password: 'admin',
    port: 5432, // Or your database port
});

module.exports = { pool };
