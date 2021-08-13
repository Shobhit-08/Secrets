//jshint esversion:6
require('dotenv').config()
const express = require("express");
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const ejs = require('ejs');
const encrypt = require('mongoose-encryption');
const md5 = require('md5');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');

const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    // cookie: { secure: true }
}))

mongoose.connect('mongodb://localhost:27017/userDB', { useNewUrlParser: true, useUnifiedTopology: true });
const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

userSchema.plugin(passportLocalMongoose);
app.use(passport.initialize());
app.use(passport.session());



// const {SECRET}=process.env;

// userSchema.plugin(encrypt,{secret:process.env.SECRET,encryptedFields:['password']});

const User = mongoose.model('User', userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get('/', (req, res) => {
    res.render('home');
});

app.get('/login', (req, res) => {
    res.render('login');
});
app.get('/register', (req, res) => {
    res.render('register');
});

app.get('/secrets', (req, res) => {
    if (req.isAuthenticated()) {
        console.log('i am authenticated');
        res.render('secrets');
    }
    else {
        console.log('you are not authenticated');
        res.redirect('/login');
    }
})

app.post('/register', (req, res) => {
    const { username, password } = req.body;
    User.register({ username: username, active: true }, password, function (err, user) {
        if (err) {
            console.log(err);
            res.redirect('/register');
        }
        else {
            console.log('here i am');
            passport.authenticate('local')(req, res, function () {
                console.log('authenticated');
                res.redirect('/secrets');
            });
        }

        //var authenticate = User.authenticate();
        // authenticate('username', 'password', function(err, result) {
        //   if (err) { ... }

        //   // Value 'result' is set to false. The user could not be authenticated since the user is not active
        // });
    });
});



app.post('/login', (req, res) => {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    })
    req.logIn(user, function (err) {
        if (err) { res.send(err); }
        else{
            passport.authenticate('local')(req,res,function(){
                res.redirect('/secrets');
            })
        }
       
    });

})

app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
});

app.listen(8000, () => {
    console.log('started listening on port 8000');
})