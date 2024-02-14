const helmet = require('helmet');

const scriptSrcUrls = [
    "https://stackpath.bootstrapcdn.com/",
    "https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js"
];
const styleSrcUrls = [
    "https://stackpath.bootstrapcdn.com/",
    "https://fonts.googleapis.com/",
    "https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css"
];
const connectSrcUrls = [
    "https://bucket-ai-a9962aacfaf1.herokuapp.com"
];
const fontSrcUrls = [  
    "https://fonts.googleapis.com/css2?family=Quicksand:wght@300&display=swap",
    "https://fonts.gstatic.com",  
];

const contentSecuirty = helmet.contentSecurityPolicy({
    directives: {
        defaultSrc: [],
        connectSrc: ["'self'", ...connectSrcUrls],
        scriptSrc: ["'unsafe-inline'", "'self'", ...scriptSrcUrls],
        styleSrc: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
        workerSrc: ["'self'", "blob:"],
        objectSrc: [],
        imgSrc: [
            "'self'",
            "blob:",
            "data:",
        ],
        fontSrc: ["'self'", ...fontSrcUrls],
    },
})

module.exports = (contentSecuirty);