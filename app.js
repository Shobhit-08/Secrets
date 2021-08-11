//jshint esversion:6
const express=require("express");
const bodyParser=require('body-parser');
const mongoose=require('mongoose');
const ejs=require('ejs');

const app=express();
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static('public'));

mongoose.connect('mongodb://localhost:27017/userDB',{useNewUrlParser:true,useUnifiedTopology: true});
const userSchema=new mongoose.Schema({
    email:String,
    password:String
});
const User=mongoose.model('User',userSchema);

app.get('/',(req,res)=>{
    res.render('home');
});

app.get('/login',(req,res)=>{
    res.render('login');
});
app.get('/register',(req,res)=>{
    res.render('register');
});

app.post('/register',(req,res)=>{
    const {password,username}=req.body;
    const newUser=new User({
        email:username,
        password:password
    })
    newUser.save(function(err){
        if(err){
            res.send('New user cannot be added');
        }
        else{
            res.render('secrets');
        }
    })

});
app.post('/login',(req,res)=>{
    const {password,username}=req.body;
    User.findOne({email:username},(err,foundUser)=>{
        if(err){
            res.send(err);
        }
        else if(foundUser){
            if(foundUser.password===password){
                res.render('secrets');
            }
            else{
                res.send('Wrong password')
            }
        }
        else{
            res.send('No such user found');
        }
    })
    
})

app.listen(8000,()=>{
    console.log('started listening on port 8000');
})