require("dotenv").config();

const {Pool}=require("pg");

const isProduction = process.env.NODE_ENV === "production";

const connectionstring=`postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`;

const pool=new pool({
    connectionstring:isProduction ? process.env.DATABASE_URL : connectionstring
});

module.export={pool};