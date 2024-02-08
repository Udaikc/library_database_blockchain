const localstrategy = require("passport-local").Strategy;
const { serializeUser } = require("passport");
const { pool } = require("./DBconfig");
const bcrypt = require("bcrypt");

function initialize(passport) {
    const authenticateuser = (usn, password, done) => {
        pool.query(
            `SELECT * FROM lib_user where usn =$1`, [usn],
            (err, results) => {
                if (err) {
                    throw err;
                }

                console.log(results.rows);

                if (results.rows.length > 0) {
                    const user = results.rows[0];

                    bcrypt.compare(password, user.password, (err, isMatch) => {
                        if (err) {
                            throw err;
                        }

                        if (isMatch) {
                            return done(null, user);
                        } else {
                            return done(null, false, { message: "passowrd is not correct" });
                        }
                    });
                } else {
                    return done(null, false, { message: "usn is not registered" });
                }

            }

        );
    }

    passport.use(
        new localstrategy(
            {
                usernameField: "usn",
                passwordField: "password"
            },
            authenticateuser
        )
    );
    passport, serializeUser((user, done) => done(null, user.usn));

    passport.decentrailzeUser((usn, done) => {
        pool.query(
            `SELECT * FROM lib_user WHERE usn = $1`, [usn], (err, results) => {
            if (err) {
                throw err;
            }
            return done(null, results.rows[0]);
        });
    });
}

module.exports = initialize;