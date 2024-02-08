const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const pg = require('pg');

// Database connection details
const dbConfig = {
  host: 'localhost',
  database: 'library_db',
  user: 'postgres',
  password: 'udai'
};

// Connect to PostgreSQL
const pool = new pg.Pool(dbConfig);

// Parse incoming form data
app.use(bodyParser.urlencoded({ extended: false }));

// Route for form submission
app.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validate and sanitize user input (add validation logic here)

    const client = await pool.connect();
    const query = `INSERT INTO users (username, email, password) VALUES ($1, $2, $3)`;
    await client.query(query, [username, email, password]);
    res.send('Registration successful!');
  } catch (error) {
    console.error(error);
    res.status(500).send('Registration failed.');
  } finally {
    await client.release();
  }
});

// Start the server
app.listen(3000, () => {
  console.log('Server listening on port 3000');
});
