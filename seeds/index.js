const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
//this file
const Entry = require('../models/entry');
const entries = require('./entries');

mongoose.connect('mongodb://localhost:27017/Entry', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})

// check to see if successfuly connected to database
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database connected");
});

// make new restaurants for database seeding
const seedDB = async (req, res) => {
    await Entry.deleteMany({});

    for (const entry of entries) {
        const newEntry = new Entry({
            author: '65c696b8f6e046eb4df13236',
            name: `${entry.name}`,
            description: `${entry.description}`,
            completed: `${entry.completed}`,
            category: `${entry.category}`
        })
        await newEntry.save()
    }
    /*for (const entry of entries) {
        console.log(entry.name);
    }*/
}

seedDB();