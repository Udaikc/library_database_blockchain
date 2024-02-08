const express = require('express');
const app = express();
const {pool}=require("./DBconfig");
const bodyParser = require('body-parser');
const bcrypt=require("bcrypt");

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
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

app.post('/user/register',(req,res)=>{
  let {name,email,usn,password}=req.body;
  console.log("Request body:", req.body);
  console.log("Password:", password);
  let errors=[];

if(!name || !email|| !usn || !password){
  errors.push({message:"please enter all fields"});
}

if(password.length<6){
  errors.push({message:"enter the strong password"})
}

if(errors.length>0){
  res.render("register",{errors})
}else{
  const hashedpassword = await.bcrypt(password,10);
}
});

app.get('/user/dashboard',(req,res)=>{
  res.render("dashboard",{user:"udai"});
});



app.listen(port,(req,res)=>{
  console.log(`connected to ${port}`);
})