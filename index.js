const express = require('express');
const app = express();
const { pool } = require("./DBconfig");
const bodyParser = require('body-parser');
const bcrypt = require("bcrypt");
const flash = require("express-flash");
const session = require("express-session");
const passport = require("passport");
const sha256 = require("sha256");


app.use(express.static('public'))

const initializePassport = require("./passportconfig");

initializePassport(passport);

app.use(session({
  secret: "secret",
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

app.use(flash());

app.use(bodyParser.urlencoded({ extended: false }));

app.use(bodyParser.json());


app.use(
  session({
    // Key we want to keep secret which will encrypt all of our information
    secret: process.env.SESSION_SECRET,
    // Should we resave our session variables if nothing has changes which we dont
    resave: false,
    // Save empty value if there is no vaue which we do not want to do
    saveUninitialized: false
  })
);

const port = process.env.port || 4000;

app.set("view engine", "ejs");

app.get('/', (req, res) => {
  res.render("index");
});

app.get('/users/login', (req, res) => {
  res.render("login");
});

app.get('/users/register', (req, res) => {
  res.render("register");
});

app.post('/users/register', async (req, res) => {
  let { name, email, usn, password } = req.body;
  console.log("Request body:", req.body);
  console.log("Password:", password);
  let errors = [];

  if (!name || !email || !usn || !password) {
    errors.push({ message: "please enter all fields" });
  }

  if (password.length < 6) {
    errors.push({ message: "enter the strong password" })
  }

  if (errors.length > 0) {
    res.render("register", { errors })
  } else {

    pool.query(
      `SELECT * FROM lib_user WHERE email = $1`,
      [email],
      (err, results) => {
        if (err) {
          throw err;
        }
        console.log("reached here");
        console.log(results.rows);
        if (results.rows.length > 0) {
          errors.push({ message: "user already registered" });
          res.render("register", { errors })
        } else {
          pool.query(`INSERT INTO lib_user(username,email,usn,password)
          VALUES ($1 ,$2, $3, $4)
          RETURNING usn , password`, [name, email, usn, password], (err, results) => {
            if (err) {
              throw err;
            }
            console.log(results.rows);
            req.flash("sucess_msg", "you are now registered please log in");
            res.redirect("/user/login");
          }

          );
        }
      }
    );

  }
});

function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect("/users/dashboard");
  }
  next();
}
app.get("/users/register", checkAuthenticated, (req, res) => {
  res.render("register.ejs");
});

app.post('/users/login', async (req, res) => {
  let { usn, password } = req.body;
  console.log(req.body.usn);
  console.log(req.body.password);
  let errors = [];


  // Query the database to check if the username and password match
  pool.query('SELECT * FROM lib_user WHERE usn = $1 AND password = $2', [usn, password], (err, result) => {
    if (err) {
      console.error('Error executing query', err);
      res.status(500).send('Internal Server Error');
      return;
    }

    // If there's no user found with the provided credentials, redirect back to the login page
    if (result.rows.length === 0) {
      res.redirect("dashboard")
      return;
    }

    // If the user exists and the password matches, redirect to the dashboard

  });
});

app.get('/users/addbooks', (req, res) => {
  res.render("addbooks")
})

app.post('/users/addbooks', (req, res) => {
  const { title, author_name, published_year, total_number, book_url } = req.body;

  // Insert the book into the database
  pool.query('INSERT INTO books (title, author_name, published_year,total_number,book_url) VALUES ($1, $2, $3, $4, $5)', [title, author_name, published_year, total_number, book_url], (err, result) => {
    if (err) {
      console.error('Error adding book:', err);
      res.status(500).send('Error adding book');
    } else {
      console.log('Book added successfully');
      res.redirect('/users/dashboard');
    }
  });
});


app.get("users/logouts", (req, res) => {
  req.logOut();
  req.flash("sucess_msg", "you have sucessfully logged out");
  res.redirect("/users/login");
});

app.get('/users/dashboard', (req, res) => {
  pool.query('SELECT * FROM books ORDER BY title ASC ', (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error fetching books');
      return;
    }
    const books = result.rows;
    res.render('dashboard', { books }); // Assuming your EJS template is named 'dashboard.ejs'
  });
});

app.get("/users/search", (req, res) => {
  const query = req.query.query;

  // Query PostgreSQL database for books with titles similar to the search query
  pool.query("SELECT * FROM books WHERE title ILIKE $1", ['%' + query + '%'], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error searching in the database");
      return;
    }
    const searchResults = result.rows;
    res.render("search", { searchResults });
  });
});

// GET request handler for /users/addtocart route
app.get('/users/addtocart', (req, res) => {
  const bookId = req.query.book_id;
  console.log(bookId);

  // Query PostgreSQL database for the book with the specified book_id
  pool.query("SELECT * FROM books WHERE book_id = $1", [bookId], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error retrieving book information from the database");
      return;
    }

    const books = result.rows; // Assuming there's only one book with the specified ID

    if (!books) {
      res.status(404).send("Book not found");
      return;
    }

    // Render the addtocart.ejs template and pass the book information
    res.render("addtocart", { books });
  });
});

app.post('/users/ordernow', (req, res) => {
  const { usn, book_id } = req.body;

  const today = new Date();
  const endDate = new Date();
  endDate.setDate(today.getDate() + 15);

  const hashCode = generateHashCode(usn, book_id, today, endDate);

  const insertQuery = `
    INSERT INTO orders (usn, book_id, order_date, end_date, hash_code)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING order_id;
  `;
  const insertValues = [usn, book_id, today, endDate, hashCode];
  console.log(insertValues);

  pool.query(insertQuery, insertValues, (insertErr, insertResult) => {
    if (insertErr) {
      console.error(insertErr);
      return res.status(500).send("Error adding order to database");
    }

    const orderId = insertResult.rows[0].order_id;

    const selectQuery = `
      SELECT order_date AS start_date, end_date, fine , returned , hash_code
      FROM orders
      WHERE order_id = $1;
    `;
    const selectValues = [orderId];
    console.log(selectValues);

    pool.query(selectQuery, selectValues, (selectErr, selectResult) => {
      if (selectErr) {
        console.error(selectErr);
        return res.status(500).send("Error retrieving order details");
      }

      const orderDetails = selectResult.rows[0];
      console.log(orderDetails);

      // Query the books table for book information
      pool.query("SELECT * FROM books WHERE book_id = $1", [book_id], (bookErr, bookResult) => {
        if (bookErr) {
          console.error(bookErr);
          return res.status(500).send("Error retrieving book information");
        }
        const bookData = bookResult.rows;
        console.log(bookData);

        // Render the /users/ordernow view and pass user, book, and order data to it
        res.render("ordernow", { usn, bookData, orderDetails, selectValues });
      });
    });
  });
});

app.get('/users/ledger', (req, res) => {
  // Query the ledger table to retrieve ledger entries
  const query = `
    SELECT * FROM ledger;
  `;

  pool.query(query, (err, result) => {
    if (err) {
      console.error("Error retrieving ledger entries:", err);
      return res.status(500).send("Error retrieving ledger entries");
    }

    const ledgerEntries = result.rows;

    // Render the ledger.ejs file and pass the ledgerEntries data to it
    res.render("ledger", { ledgerEntries });
  });
});

app.post('/users/ledger', (req, res) => {
  const { hashcode, book_id } = req.body;

  // Check if there are entries in the ledger table with forward_hash = '0'
  const checkZeroForwardHashQuery = `
    SELECT * FROM ledger WHERE forward_hash = '0';
  `;

  pool.query(checkZeroForwardHashQuery, (zeroForwardHashErr, zeroForwardHashResult) => {
    if (zeroForwardHashErr) {
      console.error(zeroForwardHashErr);
      return res.status(500).send("Error checking zero forward hash entries");
    }

    const zeroForwardHashEntries = zeroForwardHashResult.rows;

    // If there are entries with forward_hash = '0', update their forward_hash with the new hash_code
    if (zeroForwardHashEntries.length > 0) {
      const updateForwardHashQuery = `
        UPDATE ledger SET forward_hash = $1 WHERE forward_hash = '0';
      `;

      pool.query(updateForwardHashQuery, [hashcode], (updateErr, updateResult) => {
        if (updateErr) {
          console.error(updateErr);
          return res.status(500).send("Error updating forward hash in ledger");
        }

        // Add a new entry into the ledger table with the new hash_code, book_id, and '0' for forward_hash
        const insertLedgerQuery = `
          INSERT INTO ledger (previous_hash, book_id, forward_hash)
          VALUES ($1, $2, '0');
        `;
        const insertLedgerValues = [hashcode, book_id];

        pool.query(insertLedgerQuery, insertLedgerValues, (ledgerErr, ledgerResult) => {
          if (ledgerErr) {
            console.error(ledgerErr);
            return res.status(500).send("Error adding ledger entry to database");
          }

          console.log("Ledger entry added successfully");

          // Redirect to dashboard after adding ledger entry
          res.redirect("/users/ledger");
        });
      });
    } else {
      // If there are no entries with forward_hash = '0', simply add the new entry with the given hash_code and book_id
      const insertLedgerQuery = `
        INSERT INTO ledger (previous_hash, book_id, forward_hash)
        VALUES ($1, $2, '0');
      `;
      const insertLedgerValues = [hashcode, book_id];

      pool.query(insertLedgerQuery, insertLedgerValues, (ledgerErr, ledgerResult) => {
        if (ledgerErr) {
          console.error(ledgerErr);
          return res.status(500).send("Error adding ledger entry to database");
        }

        console.log("Ledger entry added successfully");

        // Redirect to dashboard after adding ledger entry
        res.redirect("/users/ledger");
      });
    }
  });
});



app.get('/users/ordernow', (req, res) => {
  res.render("ordernow");
});


const cron = require('node-cron');

cron.schedule('0 0 * * *', async () => {
  try {
    // Connect to the database
    const client = await pool.connect();

    // Query for overdue orders
    const currentDate = new Date();
    const overdueOrdersQuery = `
      UPDATE orders
      SET fine = fine + 1
      WHERE end_date < $1 AND returned = false;
    `;
    await client.query(overdueOrdersQuery, [currentDate]);

    // Release the database connection
    client.release();

    console.log('Daily fine calculation task completed successfully.');
  } catch (err) {
    console.error('Error running daily fine calculation task:', err);
  }
});


app.listen(port, (req, res) => {
  console.log(`connected to ${port}`);
})

function generateHashCode(usn, book_id, order_date, end_date) {
  const data = JSON.stringify({ usn, book_id, order_date, end_date });
  const hashCode = "0000" + sha256(data); // Add "0000" to the beginning of the hash code
  return hashCode;
}