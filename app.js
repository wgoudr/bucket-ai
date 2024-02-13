//  dev vs production environemnt
if(process.env.NODE_ENV != 'production') {
    require('dotenv').config()
}

// Required stuff 
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const Entry = require('./models/entry');
const { name } = require('ejs');
const ejsMate = require('ejs-mate');
const methodOverride = require('method-override');
const { Configuration, Openai} = require('openai');
const { OpenAI } = require('openai'); // import OpenAI from 'openai'; 
const cors = require('cors');   //  Cross-origin resource sharing allows restricted resources on a page to be accessed from another domain
const wrapAsync = require('./utilities/wrapAsync');
const ExpressError = require('./utilities/expressError');
const Joi = require('joi');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const session = require('express-session');
const flash = require('connect-flash');
const User = require('./models/user');
const { isLoggedIn } = require('./middleware');
const mongoSanitize = require('express-mongo-sanitize');    //  for security - query injections
const helmet = require('helmet');   //  multiple middlerware with tons of secuirty added
const contentSecuirty = require('./securityPolicy');    // urls, images, bootstrap and other links need to to be added to secuity list (helmet)
const dbUrl = process.env.DB_URL || 'mongodb://localhost:27017/Entry'  //  to onnect to atlas db    // to connect to local db
const MongoStore = require('connect-mongo');    //  MongoDB session store for Connect and Express
const { url } = require('inspector');


// connecting to atlas db (or locally) and checking if successful connection
mongoose.connect(dbUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true})

const app = express();

// new initialization chat gpt
const openai = new OpenAI({
    organization: process.env.organization,
    apiKey: process.env.apiKey
});

//  connection to databse and verifying
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database connected");
});

//  setting up store, so mongo can store information 
const store = MongoStore.create({
    mongoUrl: dbUrl,
    touchAfter: 24 * 3600
})
store.on('error', function (e) {
    console.log('session store error');
})

// session configuration aand cookies :p 
const secret = process.env.secret || 'productionsecret'
const sessionConfig = {
    store,
    name: 'bucketSession',  //  so the name is just the default, security
    secret,
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        //  secure: true, //    used when deployed
        expires: Date.now() + 1000 * 60 * 60 ,
        maxAge: 1000 * 60 * 60,
    }
}

// paths and engine
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')))

// middleware and uses
app.use(session(sessionConfig));
app.use(express.urlencoded({extended: true}));
app.use(express.json())
app.use(methodOverride('_method'));
app.use(cors());      
app.use(mongoSanitize());
app.use(contentSecuirty);


//  passport use
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));   //  which strategy to use and authenticaion method
passport.serializeUser(User.serializeUser());   //  how to get into session
passport.deserializeUser(User.deserializeUser());   //  how to get user out of session

// flash use
app.use(flash());
app.use((req, res, next) => {    
    res.locals.currentUser = req.user;  //  User info for each request, to show logout/login links, find your list...
    res.locals.success = req.flash('success');
    res.locals.success = req.flash('error');    
    next();
})

//  Crud for AI and chat completion
app.post('/newEntry', wrapAsync(async (req, res) => {

    const { message } = req.body;
    
    //  AI configuration and prompt
    const chatCompletion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-0125",
        messages: [
            {role: 'system', content: 'you are an assistant which helps users create a bucket \
            list based on a given category. \
            In the response text, give 5 ideas and do not add the number in the response text. \
            For each idea, give a short title and a description. \
            For each idea structure the response where you give the name first, then the description. \
            This format needs to be the exactly same for every response.'
            },
            { role: 'user', content: `${message}` }, 
            ],
        temperature: 0,
        //top_p: 0.95
    });   
    
    //  parse through the response and create a format that can be iterated over
    const mText = chatCompletion.choices[0].message.content;
    const splitText = mText.split('\n\n');
    
    const arrText = splitText.map(entry => {
        const lines = entry.split('\n');
        return {
            name: lines[0],
            description: lines[1],
        }
    })

    //  Send back json data to page
    res.json({        
        completion: chatCompletion.choices[0].message.content,
        message: message,
        finalText: arrText,
    })
}))

// CRUD
app.get('/', (req, res) => {
    res.render('home');
})

app.get('/register', (req, res) => {
    res.render('register');
})

app.post('/register', wrapAsync(async (req, res, next) => {
    try {
        const { email, username, password} = req.body;
        const user = new User({email, username});
        const registeredUSer = await User.register(user, password);
        req.login(registeredUSer, err => {
            if (err) return next(err);
            req.flash('success', 'Welcome to BucketAI');
            res.redirect('/myList');
        });
    } catch (e) {
        req.flash('error', e.message);
        res.redirect('register');
    }
}))

app.get('/login', (req, res) => {
    res.render('login');
})

app.post('/login', passport.authenticate('local', { failureFlash: true, failureRedirect: '/login'}), (req, res) => {
    req.flash('error', 'Welcome Back');
    res.redirect('myList');
})

app.get('/logout', (req, res) => {
    req.logout(function (err)  {
        if (err) {
            return next(err);
        }
    });
    req.flash('success', 'Cya L8tr, aligator!');
    res.redirect('/');
})

app.get('/myList', isLoggedIn, wrapAsync(async (req, res) => {       
    const entries = await Entry.find({author: req.user._id});
    res.render('myBucket/index', { entries });
}))

app.get('/newEntry', isLoggedIn, (req, res) => {
    res.render('myBucket/newEntry')
})

app.get('/:id/edit', isLoggedIn, wrapAsync(async (req, res) => {
    const entry = await Entry.findById(req.params.id)
    res.render('myBucket/edit', { entry })
}))

app.put('/myList/:id', isLoggedIn, wrapAsync(async (req, res) => {
    const { id } = req.params
    const entry = await Entry.findByIdAndUpdate(id, {...req.body.entry})
    res.redirect('/myList');
}))

app.delete('/:id/delete', isLoggedIn, wrapAsync(async (req, res) => {
    const { id } = req.params;
    await Entry.findByIdAndDelete(id);
    res.redirect('/myList');
}))

app.post('/index', isLoggedIn, wrapAsync(async (req, res) => {
    const entry = new Entry(req.body.entry);
    entry.author = req.user._id;
    await entry.save();
    req.flash('success', 'Added a new entry');
    res.redirect('/myList');   
}))


//  handling errors
app.all('*', (req, res, next) => {
    next(new ExpressError('Something went wrong', 404))
})

app.use((err, req, res, next) => {
    const { statusCode = 500, message} = err;
    res.status(statusCode).render('myBucket/errorPage', { err });
})

// Port
const port = process.env.port || 3000
app.listen(port, () => {
    console.log(`ON PORT ${port}`);
})
