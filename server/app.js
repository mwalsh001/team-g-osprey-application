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
let schoolCol, schoolYearCol, gradeDefsCol;
let aaeCol, eaCol, easocCol;

async function run() {
    await dbconnect.connect().then(() => console.log("Connected!"));
    usersCollection = await dbconnect.db("osprey-data").collection("users");


    // Generic School Collections
    schoolCol = dbconnect.db("osprey-data").collection("SCHOOL");
    schoolYearCol = dbconnect.db("osprey-data").collection("SCHOOL_YEAR");
    gradeDefsCol = dbconnect.db("osprey-data").collection("GRADE_DEFINITIONS");

    // Enrollment-specific Collections
    aaeCol = dbconnect.db("osprey-data").collection("ADMISSION_ACTIVITY_ENROLLMENT");
    eaCol = dbconnect.db("osprey-data").collection("ENROLL_ATTRITION");
    easocCol = dbconnect.db("osprey-data").collection("ENROLL_ATTRITION_SOC");

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

    app.get("/api/schools", requireAuth, async (req, res) => {
        const rows = await schoolCol
            .find({}, { projection: { ID: 1, NAME_TX: 1, REGION_CD: 1 } })
            .sort({ ID: 1 })
            .toArray();

        res.json(rows.map(s => ({
            id: s.ID,
            name: s.NAME_TX,
            region: s.REGION_CD
        })));
    });

    app.get("/api/schoolYears", requireAuth, async (req, res) => {
        const rows = await schoolYearCol
            .find({}, { projection: { ID: 1, SCHOOL_YEAR: 1 } })
            .sort({ ID: 1 })
            .toArray();

        res.json(rows.map(y => ({
            id: y.ID,
            year: y.SCHOOL_YEAR
        })));
    });

    app.get("/api/grades", requireAuth, async (req, res) => {
        const rows = await gradeDefsCol
            .find({}, { projection: { ID: 1, NAME_TX: 1, DESCRIPTION_TX: 1, ORDER_NO: 1 } })
            .sort({ ORDER_NO: 1 })
            .toArray();

        res.json(rows.map(g => ({
            id: g.ID,
            name: g.NAME_TX,
            description: g.DESCRIPTION_TX
        })));
    });

    app.get("/api/aae", requireAuth, async (req, res) => {
        const { schoolId, schoolYearId } = req.query;

        const SCHOOL_ID = Number(schoolId);
        const SCHOOL_YR_ID = Number(schoolYearId);

        const rows = await aaeCol.find({ SCHOOL_ID, SCHOOL_YR_ID }).toArray();

        res.json(rows.map(r => ({
            mongoId: r._id.toString(),
            ...r
        })));
    });

    app.post("/api/aae", requireAuth, async (req, res) => {
        const { schoolId, schoolYearId, ENROLLMENT_TYPE_CD, GENDER, NR_ENROLLED } = req.body;

        const SCHOOL_ID = Number(schoolId);
        const SCHOOL_YR_ID = Number(schoolYearId);

        const max = await aaeCol.find().sort({ ID: -1 }).limit(1).toArray();
        const nextId = (max[0]?.ID ?? 0) + 1;

        await aaeCol.insertOne({
            ID: nextId,
            SCHOOL_ID,
            SCHOOL_YR_ID,
            ENROLLMENT_TYPE_CD,
            GENDER,
            NR_ENROLLED: Number(NR_ENROLLED)
        });

        const rows = await aaeCol.find({ SCHOOL_ID, SCHOOL_YR_ID }).toArray();
        res.json(rows.map(r => ({ mongoId: r._id.toString(), ...r })));
    });


    app.post("/api/aae/edit", requireAuth, async (req, res) => {
        const { mongoId, schoolId, schoolYearId, ENROLLMENT_TYPE_CD, GENDER, NR_ENROLLED } = req.body;

        const SCHOOL_ID = Number(schoolId);
        const SCHOOL_YR_ID = Number(schoolYearId);

        await aaeCol.updateOne(
            { _id: new ObjectId(mongoId), SCHOOL_ID, SCHOOL_YR_ID },
            { $set: { ENROLLMENT_TYPE_CD, GENDER, NR_ENROLLED: Number(NR_ENROLLED) } }
        );

        const rows = await aaeCol.find({ SCHOOL_ID, SCHOOL_YR_ID }).toArray();
        res.json(rows.map(r => ({ mongoId: r._id.toString(), ...r })));
    });

    app.post("/api/aae/delete", requireAuth, async (req, res) => {
        const { mongoId, schoolId, schoolYearId } = req.body;

        const SCHOOL_ID = Number(schoolId);
        const SCHOOL_YR_ID = Number(schoolYearId);

        await aaeCol.deleteOne({ _id: new ObjectId(mongoId), SCHOOL_ID, SCHOOL_YR_ID });

        const rows = await aaeCol.find({ SCHOOL_ID, SCHOOL_YR_ID }).toArray();
        res.json(rows.map(r => ({ mongoId: r._id.toString(), ...r })));
    });


// ENROLL_ATTRITION

    app.get("/api/attrition", requireAuth, async (req, res) => {
        const { schoolId, schoolYearId, gradeId } = req.query;

        const SCHOOL_ID = Number(schoolId);
        const SCHOOL_YR_ID = Number(schoolYearId);

        const filter = { SCHOOL_ID, SCHOOL_YR_ID };
        if (gradeId !== undefined && gradeId !== null && gradeId !== "") {
            filter.GRADE_DEF_ID = Number(gradeId);
        }

        const rows = await eaCol.find(filter).toArray();

        res.json(rows.map(r => ({
            mongoId: r._id.toString(),
            ...r
        })));
    });

    app.post("/api/attrition", requireAuth, async (req, res) => {
        const {
            schoolId,
            schoolYearId,
            GRADE_DEF_ID,
            STUDENTS_ADDED_DURING_YEAR,
            STUDENTS_GRADUATED,
            EXCH_STUD_REPTS,
            STUD_DISS_WTHD,
            STUD_NOT_INV,
            STUD_NOT_RETURN
        } = req.body;

        const SCHOOL_ID = Number(schoolId);
        const SCHOOL_YR_ID = Number(schoolYearId);

        const max = await eaCol.find().sort({ ID: -1 }).limit(1).toArray();
        const nextId = (max[0]?.ID ?? 0) + 1;

        const doc = {
            ID: nextId,
            SCHOOL_ID,
            SCHOOL_YR_ID,

            ...(GRADE_DEF_ID !== undefined && GRADE_DEF_ID !== null && GRADE_DEF_ID !== ""
                ? { GRADE_DEF_ID: Number(GRADE_DEF_ID) }
                : {}),

            STUDENTS_ADDED_DURING_YEAR: Number(STUDENTS_ADDED_DURING_YEAR),
            STUDENTS_GRADUATED: Number(STUDENTS_GRADUATED),
            EXCH_STUD_REPTS: Number(EXCH_STUD_REPTS),
            STUD_DISS_WTHD: Number(STUD_DISS_WTHD),
            STUD_NOT_INV: Number(STUD_NOT_INV),
            STUD_NOT_RETURN: Number(STUD_NOT_RETURN)
        };

        await eaCol.insertOne(doc);

        const rows = await eaCol.find({ SCHOOL_ID, SCHOOL_YR_ID }).toArray();
        res.json(rows.map(r => ({ mongoId: r._id.toString(), ...r })));
    });

    app.post("/api/attrition/edit", requireAuth, async (req, res) => {
        const {
            mongoId,
            schoolId,
            schoolYearId,
            GRADE_DEF_ID,
            STUDENTS_ADDED_DURING_YEAR,
            STUDENTS_GRADUATED,
            EXCH_STUD_REPTS,
            STUD_DISS_WTHD,
            STUD_NOT_INV,
            STUD_NOT_RETURN
        } = req.body;

        const SCHOOL_ID = Number(schoolId);
        const SCHOOL_YR_ID = Number(schoolYearId);

        const $set = {
            STUDENTS_ADDED_DURING_YEAR: Number(STUDENTS_ADDED_DURING_YEAR),
            STUDENTS_GRADUATED: Number(STUDENTS_GRADUATED),
            EXCH_STUD_REPTS: Number(EXCH_STUD_REPTS),
            STUD_DISS_WTHD: Number(STUD_DISS_WTHD),
            STUD_NOT_INV: Number(STUD_NOT_INV),
            STUD_NOT_RETURN: Number(STUD_NOT_RETURN)
        };

        if (GRADE_DEF_ID !== undefined && GRADE_DEF_ID !== null && GRADE_DEF_ID !== "") {
            $set.GRADE_DEF_ID = Number(GRADE_DEF_ID);
        }

        await eaCol.updateOne(
            { _id: new ObjectId(mongoId), SCHOOL_ID, SCHOOL_YR_ID },
            { $set }
        );

        const rows = await eaCol.find({ SCHOOL_ID, SCHOOL_YR_ID }).toArray();
        res.json(rows.map(r => ({ mongoId: r._id.toString(), ...r })));
    });

    app.post("/api/attrition/delete", requireAuth, async (req, res) => {
        const { mongoId, schoolId, schoolYearId } = req.body;

        const SCHOOL_ID = Number(schoolId);
        const SCHOOL_YR_ID = Number(schoolYearId);

        await eaCol.deleteOne({ _id: new ObjectId(mongoId), SCHOOL_ID, SCHOOL_YR_ID });

        const rows = await eaCol.find({ SCHOOL_ID, SCHOOL_YR_ID }).toArray();
        res.json(rows.map(r => ({ mongoId: r._id.toString(), ...r })));
    });


// ENROLL_ATTRITION_SOC

    app.get("/api/attritionSoc", requireAuth, async (req, res) => {
        const { schoolId, schoolYearId, gradeId } = req.query;

        const SCHOOL_ID = Number(schoolId);
        const SCHOOL_YR_ID = Number(schoolYearId);

        const filter = { SCHOOL_ID, SCHOOL_YR_ID };
        if (gradeId !== undefined && gradeId !== null && gradeId !== "") {
            filter.GRADE_DEF_ID = Number(gradeId);
        }

        const rows = await easocCol.find(filter).toArray();

        res.json(rows.map(r => ({
            mongoId: r._id.toString(),
            ...r
        })));
    });

    app.post("/api/attritionSoc", requireAuth, async (req, res) => {
        const {
            schoolId,
            schoolYearId,
            GRADE_DEF_ID,
            STUDENTS_ADDED_DURING_YEAR,
            STUDENTS_GRADUATED,
            EXCH_STUD_REPTS,
            STUD_DISS_WTHD,
            STUD_NOT_INV,
            STUD_NOT_RETURN
        } = req.body;

        const SCHOOL_ID = Number(schoolId);
        const SCHOOL_YR_ID = Number(schoolYearId);

        const max = await easocCol.find().sort({ ID: -1 }).limit(1).toArray();
        const nextId = (max[0]?.ID ?? 0) + 1;

        const doc = {
            ID: nextId,
            SCHOOL_ID,
            SCHOOL_YR_ID,

            ...(GRADE_DEF_ID !== undefined && GRADE_DEF_ID !== null && GRADE_DEF_ID !== ""
                ? { GRADE_DEF_ID: Number(GRADE_DEF_ID) }
                : {}),

            STUDENTS_ADDED_DURING_YEAR: Number(STUDENTS_ADDED_DURING_YEAR),
            STUDENTS_GRADUATED: Number(STUDENTS_GRADUATED),
            EXCH_STUD_REPTS: Number(EXCH_STUD_REPTS),
            STUD_DISS_WTHD: Number(STUD_DISS_WTHD),
            STUD_NOT_INV: Number(STUD_NOT_INV),
            STUD_NOT_RETURN: Number(STUD_NOT_RETURN)
        };

        await easocCol.insertOne(doc);

        const rows = await easocCol.find({ SCHOOL_ID, SCHOOL_YR_ID }).toArray();
        res.json(rows.map(r => ({ mongoId: r._id.toString(), ...r })));
    });

    app.post("/api/attritionSoc/edit", requireAuth, async (req, res) => {
        const {
            mongoId,
            schoolId,
            schoolYearId,
            GRADE_DEF_ID,
            STUDENTS_ADDED_DURING_YEAR,
            STUDENTS_GRADUATED,
            EXCH_STUD_REPTS,
            STUD_DISS_WTHD,
            STUD_NOT_INV,
            STUD_NOT_RETURN
        } = req.body;

        const SCHOOL_ID = Number(schoolId);
        const SCHOOL_YR_ID = Number(schoolYearId);

        const $set = {
            STUDENTS_ADDED_DURING_YEAR: Number(STUDENTS_ADDED_DURING_YEAR),
            STUDENTS_GRADUATED: Number(STUDENTS_GRADUATED),
            EXCH_STUD_REPTS: Number(EXCH_STUD_REPTS),
            STUD_DISS_WTHD: Number(STUD_DISS_WTHD),
            STUD_NOT_INV: Number(STUD_NOT_INV),
            STUD_NOT_RETURN: Number(STUD_NOT_RETURN)
        };

        if (GRADE_DEF_ID !== undefined && GRADE_DEF_ID !== null && GRADE_DEF_ID !== "") {
            $set.GRADE_DEF_ID = Number(GRADE_DEF_ID);
        }

        await easocCol.updateOne(
            { _id: new ObjectId(mongoId), SCHOOL_ID, SCHOOL_YR_ID },
            { $set }
        );

        const rows = await easocCol.find({ SCHOOL_ID, SCHOOL_YR_ID }).toArray();
        res.json(rows.map(r => ({ mongoId: r._id.toString(), ...r })));
    });

    app.post("/api/attritionSoc/delete", requireAuth, async (req, res) => {
        const { mongoId, schoolId, schoolYearId } = req.body;

        const SCHOOL_ID = Number(schoolId);
        const SCHOOL_YR_ID = Number(schoolYearId);

        await easocCol.deleteOne({ _id: new ObjectId(mongoId), SCHOOL_ID, SCHOOL_YR_ID });

        const rows = await easocCol.find({ SCHOOL_ID, SCHOOL_YR_ID }).toArray();
        res.json(rows.map(r => ({ mongoId: r._id.toString(), ...r })));
    });

    app.post("/api/chooseDisplaySchool", requireAuth, async(req, res) =>{
        // console.log(req.query);
        // console.log(req.body);
        const SCHOOL_ID = req.body.displaySchoolId; //Number(req.query);
        const GENDER = "U";

        const filter = { SCHOOL_ID, GENDER };

        let rows = await aaeCol.find(filter, {
            projection: { SCHOOL_ID: 1, SCHOOL_YR_ID: 1, NR_ENROLLED: 1 } })  // only get these attributes of the object
            .sort({ SCHOOL_YR_ID: 1 })  // sort the list to be in order of year
            .toArray();
        //console.log(rows);
        // rows.map(r => ({
        //     mongoId: r._id.toString(),
        //     ...r
        // }))
        rows = rows.filter(e => e.NR_ENROLLED !== null);  // filter the null values for NR_ENROLLED

        //console.log(rows);
        res.json(rows.map(obj => ({
            SCHOOL_YR_ID: obj.SCHOOL_YR_ID,
            NR_ENROLLED: obj.NR_ENROLLED
        })));
    })

    app.post("/api/chooseDisplayYear", requireAuth, async(req, res) =>{
        const SCHOOL_ID = req.body.displaySchoolId;
        const SCHOOL_YR_ID = req.body.displaySchoolYear;

        // In database, there could be a value for INQUIRIES and FACULTYCHILD
        // aaeCol.find could return up to 2 objects
        let GENDER = "M";
        let filter = { SCHOOL_ID, SCHOOL_YR_ID, GENDER };
        let gender_m = await aaeCol.find(filter, {
            projection: { SCHOOL_ID: 1, SCHOOL_YR_ID: 1, GENDER: 1, NR_ENROLLED: 1 } })
            .toArray();
        //console.log(gender_m);
        // Get a single value for how many total males are enrolled
        const val_m = gender_m.reduce((accumulator, obj) => {
            return accumulator + obj.NR_ENROLLED;
            }, 0);

        // Repeat process for females and non-binary students
        GENDER = "F";
        filter = { SCHOOL_ID, SCHOOL_YR_ID, GENDER };
        let gender_f = await aaeCol.find(filter, {
            projection: { SCHOOL_ID: 1, SCHOOL_YR_ID: 1, GENDER: 1, NR_ENROLLED: 1 } })
            .toArray();
        //console.log(gender_f);
        const val_f = gender_f.reduce((accumulator, obj) => {
            return accumulator + obj.NR_ENROLLED;
        }, 0);

        GENDER = "NB";
        filter = { SCHOOL_ID, SCHOOL_YR_ID, GENDER };
        let gender_nb = await aaeCol.find(filter, {
            projection: { SCHOOL_ID: 1, SCHOOL_YR_ID: 1, GENDER: 1, NR_ENROLLED: 1 } })
            .toArray();
        //console.log(gender_nb);
        const val_nb = gender_nb.reduce((accumulator, obj) => {
            return accumulator + obj.NR_ENROLLED;
        }, 0);

        // Return an array of the NR_ENROLLED
        let arr = [val_m, val_f, val_nb];
        console.log(arr);
        res.json(arr);
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
