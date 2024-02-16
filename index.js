const express = require('express');
const app = express();
const { pool } = require("./DBconfig");
const bodyParser = require('body-parser');
const bcrypt = require("bcrypt");
const flash = require("express-flash");
const session = require("express-session");
const passport = require("passport");



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

app.use(express.urlencoded({ extended: false }));
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

app.get('/user/login', (req, res) => {
  res.render("login");
});

app.get('/user/register', (req, res) => {
  res.render("register");
});

app.post('/user/register', async (req, res) => {
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
    const hashedpassword = await bcrypt.hash(password, 10);
    console.log(hashedpassword);

    pool.query(
      `SELECT * FROM lib_user WHERE email = $1`,
      [usn],
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
          RETURNING usn , password`, [name, email, usn, hashedpassword], (err, results) => {
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

app.get("/users/login", checkAuthenticated, (req, res) => {
  // flash sets a messages variable. passport sets the error message
  console.log(req.session.flash.error);
  res.render("login.ejs");
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


app.get("user/logouts", (req, res) => {
  req.logOut();
  req.flash("sucess_msg", "you have sucessfully logged out");
  res.redirect("/user/login");
});

app.get('/users/dashboard', (req, res) => {
  pool.query('SELECT * FROM books', (err, result) => {
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
app.get("/users/addtocart", (req, res) => {
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


app.listen(port, (req, res) => {
  console.log(`connected to ${port}`);
})