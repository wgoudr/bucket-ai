const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');

const UserSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true,
    }
});

// this add username, hash and salt field to store username, the hashed password and the salt value
UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', UserSchema);