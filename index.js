const express = require('express');
const app = express();


const port = process.env.port || 4000;

app.set("view engine","ejs");

app.get('/',(req,res)=>{
  res.render("index");
});

app.get('/user/login',(req,res)=>{
    res.render("login");
});

app.get('/user/register',(req,res)=>{
  res.render("register");
});

app.get('/user/dashboard',(req,res)=>{
  res.render("dashboard",{user:"udai"});
});



app.listen(port,(req,res)=>{
  console.log(`connected to ${port}`);
})