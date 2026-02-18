const express = require("express");
const path = require("path");
const {ObjectId} = require("mongodb");
const MongoClient = require('mongodb').MongoClient;
require("dotenv").config();
const jwt = require("jsonwebtoken");
const app = express();

app.use(express.json());

function requireAuth(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).send("Unauthorized");
    }

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (err) {
        return res.status(403).send("Invalid token");
    }
}

const url = process.env.MONGODB_URI;
const dbconnect = new MongoClient(url);
let usersCollection = null;
let entriesCollection = null;

async function run() {
    await dbconnect.connect().then(() => console.log("Connected!"));
    usersCollection = await dbconnect.db("osprey-data").collection("users");
    entriesCollection = await dbconnect.db("osprey-data").collection("data");

    // Login
    app.post("/api/login", async (req, res) => {
        const {username, password} = req.body;

        let user = await usersCollection.findOne({username});
        const payload = {
            username
        }
        if (!user) {
            await usersCollection.insertOne({username, password});
            const token = jwt.sign(
                payload,
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN }
            );
            return res.json({ success: true, newUser: true, token });
        }

        if (user.password !== password) {
            return res.json({ success: false, message: "Wrong password" });
        }

        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN
        });
        return res.json({ success: true, newUser: false, token });
    });

    app.get("/api/entries", requireAuth, async (req, res) => {
        console.log("TOKEN USER:", req.user);

        const username = req.user.username;

        const entries = await entriesCollection.find({username}).toArray();
        res.json(entries.map(entries => ({
            username: entries.username,
            id: entries._id.toString(),
            date: entries.date,
            valueA: entries.valueA,
            valueB: entries.valueB,
        })));
    })

    // Submit
    app.post("/submit", requireAuth, async (req, res) => {
        const username = req.user.username;
        const { date, valueA, valueB } = req.body;

        const document = {
            username,
            date: date,
            valueA: valueA,
            valueB: valueB,
        }

        await entriesCollection.insertOne(document);

        const entries = await entriesCollection.find({username}).toArray();
        res.json(entries.map(entries => ({
            username: entries.username,
            id: entries._id.toString(),
            date: entries.date,
            valueA: entries.valueA,
            valueB: entries.valueB,
        })));
    })


    // Modify
    app.post("/api/edit", requireAuth, async (req, res) => {
        const username = req.user.username;
        const { id, date, valueA, valueB } = req.body;

        await entriesCollection.updateOne(
            { _id: new ObjectId(id), username },
            {
                $set: {
                    date: date,
                    valueA: Number(valueA),
                    valueB: Number(valueB),
                }
            }
        );

        const entries = await entriesCollection.find({username}).toArray();
        res.json(entries.map(entries => ({
            id: entries._id.toString(),
            date: entries.date,
            valueA: entries.valueA,
            valueB: entries.valueB,
        })));
    });

    // Delete
    app.post("/api/delete", requireAuth, async (req, res) => {
        const username = req.user.username;
        const { id } = req.body;
        await entriesCollection.deleteOne({
            _id: new ObjectId(id), username
        });

        const entries = await entriesCollection.find({username}).toArray();
        res.json(entries.map(entries => ({
            username: entries.username,
            id: entries._id.toString(),
            date: entries.date,
            valueA: entries.valueA,
            valueB: entries.valueB,
        })));
    })
}

const clientDist = path.join(__dirname, "..", "client", "dist");
app.use(express.static(clientDist));

app.get(/^(?!\/api|\/submit|\/protected).*/, (req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
});

const PORT = process.env.PORT || 3000;

run()
    .then(() => {
        app.listen(PORT, () => console.log("Listening on", PORT));
    })
    .catch((err) => {
        console.error("Failed to start server:", err);
        process.exit(1);
    });
