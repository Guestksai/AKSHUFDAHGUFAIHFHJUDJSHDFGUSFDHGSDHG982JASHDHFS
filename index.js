// خادم Node.js باستخدام Express
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(session({ secret: 'supersecret', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

// إعداد قاعدة البيانات MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error(err));

const UserSchema = new mongoose.Schema({
    discordId: String,
    username: String,
    avatar: String
});
const User = mongoose.model('User', UserSchema);

passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: 'http://localhost:5000/auth/discord/callback',
    scope: ['identify', 'guilds']
}, async (accessToken, refreshToken, profile, done) => {
    let user = await User.findOne({ discordId: profile.id });
    if (!user) {
        user = new User({ discordId: profile.id, username: profile.username, avatar: profile.avatar });
        await user.save();
    }
    return done(null, user);
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    const user = await User.findById(id);
    done(null, user);
});

// مسارات المصادقة
app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/discord/callback', passport.authenticate('discord', {
    successRedirect: 'http://localhost:3000/dashboard',
    failureRedirect: '/'
}));

app.get('/auth/logout', (req, res) => {
    req.logout();
    res.redirect('/');
});

// تشغيل الخادم
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
