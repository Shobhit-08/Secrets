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
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;
const findOrCreate = require('mongoose-findorcreate');


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
    password: String,
    googleId: String,
    secret_sauce: [String],
    linkedinId: String,
    username: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
app.use(passport.initialize());
app.use(passport.session());




const User = mongoose.model('User', userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});


passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:8000/auth/google/secrets",
},

    // User.findOrCreate({ username: profile.emails[0].value,googleId: profile.id }, function (err, user) {
    //   return cb(err, user);
    // });
    function (accessToken, refreshToken, profile, cb) {
        console.log(profile);
        User.findOrCreate({ username: profile.emails[0].value, googleId: profile.id, }, function (err, user) {
            return cb(err, user);
        });
    }
));

passport.use(new LinkedInStrategy({
    clientID: process.env.LINKEDIN_CLIENT_ID,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    callbackURL: "http://localhost:8000/auth/linkedin/secrets",
    scope: ['r_emailaddress', 'r_liteprofile'],
    //state: true
}, function (accessToken, refreshToken, profile, done) {
    // asynchronous verification, for effect...
    //console.log(profile);
    User.findOrCreate({username:profile.emails[0].value, linkedinId: profile.id }, function (err, user) {
        return done(err, user);
    });
}));



app.get('/', (req, res) => {
    res.render('home');
});

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/secrets',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function (req, res) {
        // Successful authentication, redirect home.

        res.redirect('/secrets');
    });


app.get('/auth/linkedin', passport.authenticate('linkedin', { scope: ['r_emailaddress', 'r_liteprofile'] }));

app.get('/auth/linkedin/secrets', passport.authenticate('linkedin', {
    successRedirect: '/secrets',
    failureRedirect: '/login'
}));

app.get('/login', (req, res) => {
    res.render('login');
});
app.get('/register', (req, res) => {
    res.render('register');
});

app.get('/secrets', (req, res) => {
    if (req.isAuthenticated()) {

        User.find({ secret_sauce: { $ne: null } }, (err, foundUsers) => {
            if (err) {
                res.send('err');
            }
            else if (foundUsers) {

                res.render('secrets', { foundUsers });
            }
            else {
                res.send('There are still no secrets');
            }
        })
    }
    else {

        res.redirect('/login');
    }
});

app.get('/submit', (req, res) => {
    if (req.isAuthenticated()) {

        res.render('submit');
    }
    else {
        res.redirect('/login');
    }
});

app.post('/submit', (req, res) => {
    User.findById(req.user._id, (err, foundUser) => {
        if (err) {

            res.send(err);
        }
        else if (foundUser) {
            foundUser.secret_sauce.push(req.body.secret);
            foundUser.save((err) => {
                if (err) {
                    res.send(err);
                }
                else {

                    res.redirect('/secrets');
                }
            })
        }
        else {
            res.send('please login or register');
        }
    })
});

app.post('/register', (req, res) => {
    const { username, password } = req.body;
    User.register({ username: username, active: true }, password, function (err, user) {
        if (err) {

            res.redirect('/register');
        }
        else {

            passport.authenticate('local')(req, res, function () {

                res.redirect('/secrets');
            });
        }
    });
});



app.post('/login', (req, res) => {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    })
    req.logIn(user, function (err) {
        if (err) { res.send(err); }
        else {
            passport.authenticate('local')(req, res, function () {
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