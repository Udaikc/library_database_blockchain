const express = require('express');
const app = express();
const { pool } = require("./DBconfig");
const bodyParser = require('body-parser');
const bcrypt = require("bcrypt");
const flash = require("express-flash");
const session = require("express-session");

app.use(session({
  secret: "secret",

  resave: false,

  saveUninitialized: false
}

));

app.use(flash());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
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

app.get('/user/dashboard', (req, res) => {
  res.render("dashboard", { user: "udai" });
});



app.listen(port, (req, res) => {
  console.log(`connected to ${port}`);
})