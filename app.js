require("dotenv").config();
const express =  require("express");
const bodyparser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");
const session = require("express-session"); 
const passport = require("passport");
const passportlocalmongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy =require("passport-facebook").Strategy;
const findOrCreate = require('mongoose-findorcreate');

const schema = mongoose.Schema;

const app = express();
const port = 3000;

//middleware
app.set("view engine", "ejs");
app.use(bodyparser.urlencoded({extended: true}));
app.use(express.static("public"));
app.use(session({
    secret: "ourlittlesecret",
    resave: false,
    saveUnintialized: false,

}));

app.use(passport.initialize());
app.use(passport.session());

//database middleware
const url ="mongodb://localhost:27017/SECRET";

mongoose.connect(url).then((result) => {console.log("database connected")})
.catch((err) => {console.log(err)});
//mongoose.set("useCreateIndex", true);

const Secretschema = new schema ({
    email: String,
    password: String,
    googleId: String
});
        //encryption plugin
const secret = process.env.SECRET ;
Secretschema.plugin(encrypt, { secret: secret, encryptedFields: ["password"]});
           //passortlocalmongoose plugin
Secretschema.plugin(passportlocalmongoose);
Secretschema.plugin(findOrCreate);

const User = mongoose.model("User", Secretschema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done){
    done(null, user.id);
});
passport.deserializeUser(function(id, done){
    // User.findById(id, function(err, user){
    //     done(err, user);
    // });
    User.findById(id).then((data) => {done(null, data);})
    .catch((err)=> {console.log(err)})
});
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/secret",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile.id);
    User.findOrCreate({ googleId: profile.id, username:profile.id }, function (err, user) {
      return cb(err, user);
    });
//     User.findOrCreate({ googleId: profile.id }).then((data) => {return cb(data)})
//     .catch((err) )
   }
));

passport.use(new FacebookStrategy({
  clientID: process.env.CLIENT_FACEBOOK_ID,
  clientSecret: process.env.CLIENT_FACEBOOK_SECRET,
  callbackURL: "http://localhost:3000/auth/facebook/secret"
},
function(accessToken, refreshToken, profile, cb) {
  console.log(profile.id);
  User.findOrCreate({ facebookId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));


// google authentication route
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] })
);
app.get('/auth/secret', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

  // facebook authentication route
app.get('/auth/facebook', 
  passport.authenticate('facebook',{ scope: ['profile'] })
);

app.get('/auth/facebook/secret',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });



app.route("/")
.get((req, res)=> {
res.render("home")
});

app.route("/login")
.get((req, res)=> {
   res.render("login") 
})
.post((req, res) => {
   const user =new User({
    username: req.body.username,
    password:req.body.password
   });
req.login(user, function(err) {
    if (err) {
        return (err);
    
    } else {
        passport.authenticate("local")(req, res, function() {
            res.redirect("/secrets")})
            console.log(passport.authenticate("local"));
    } 
})   

 })
 app.get("/secrets", (req, res) =>{
    if (req.isAuthenticated()) {
        res.render("secrets");
    } else {
    res.redirect("/login")
    }
 } );

app.route("/register")
.get((req, res)=> {
    
   res.render("register") 
})
.post((req, res) => { User.register({username:req.body.username}, req.body.password).then(()=> {
    // if and else to filter the users from regsistering twice

    // User.find({},{username:1, _id:0}).then((result)=> {
    //     for (let i = 0; i < result.length; i++) {
    //                 const element = result[i].username;
    //                  //console.log(element);
    //                 if (req.body.username === element) {
    //     console.log("true");
    //                  } else {
    //                    console.log("false");  
    //                  }
                 
    //     }
    //  })
    
    passport.authenticate("local")(req, res, function() {
        res.redirect("/secrets")}) 
    }).catch((err)=>{res.redirect("/register")})
    
});
app.get("/logout", function (req, res) {
      //req.logout();
    res.redirect("/");
});

//  User.find({},{username:1, _id:0}).then((result)=> {//console.log(result)
//     for (let i = 0; i < result.length; i++) {
//                 const element = result[i].username;
//                  const array = [];
//                  array.push(element);
//                  console.log(array);
//             }
//  })
 

// User.find({email:"user@1.com"}).then((result) => { 
//     for (let i = 0; i < result.length; i++) {
//         const element = result[i];
//          console.log(element);
//     }
//  });
 

app.listen(port, (req, res)=> {console.log("server is running on port 3000") });

