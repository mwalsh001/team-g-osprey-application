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

function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({
            success: false,
            message: "Admin access required."
        });
    }
    next();
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

    app.post("/api/login", async (req, res) => {
        const {username, password, role} = req.body;
        if (!username || !password || !["school", "admin"].includes(role)) {
            return res.json({
                success: false,
                message: "Valid username, password, and role are required."
            });
        }
        let user = await usersCollection.findOne({username});
        if (!user) {
            return res.json({
                success: false,
                message: "Account not found"
            });
        }

        if (user.password !== password) {
            return res.json({ success: false, message: "Wrong password" });
        }

        if (!user.role) {
            if (role === "school") {
                await usersCollection.updateOne(
                    {username},
                    {$set: {role: "school"}}
                );
                user = {...user, role: "school"};
            } else {
                return res.json({
                    success: false,
                    message: "account is not registered as an admin."
                });
            }
        }
        if (user.role !== role) {
            return res.json({
                success: false,
                message: `account is not registered as a ${role}`
            });
        }
        const resolvedSchoolName = user.schoolName || user.school || null;
        if (role === "school" && !resolvedSchoolName) {
            return res.json({
                success: false,
                message: "School account is missing a school name"
            });
        }
        const payload = {
            username,
            role: user.role,
            schoolName: resolvedSchoolName
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN
        });
        return res.json({
            success: true,
            newUser: false,
            token,
            role: user.role,
            schoolName: resolvedSchoolName
        });
    });
    app.post("/api/admin/create-school", requireAuth, requireAdmin, async (req, res) => {
        const {username, password, schoolName} = req.body;
        if (!username || !password || !schoolName) {
            return res.status(400).json({
                success: false,
                message: "Enter username, password, and schoolName"
            });
        }
        const existingUser = await usersCollection.findOne({username});
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Account with this username exists"
            });
        }
        await usersCollection.insertOne({
            username,
            password,
            role: "school",
            schoolName: String(schoolName).trim()
        });
        return res.json({
            success: true,
            message: "School account created"
        });
    });

    app.get("/api/schools", requireAuth, async (req, res) => {
        const rows = await schoolCol
            .find({}, {projection: {ID: 1, NAME_TX: 1, REGION_CD: 1}})
            .sort({ID: 1})
            .toArray();

        res.json(rows.map(s => ({
            id: s.ID,
            name: s.NAME_TX,
            region: s.REGION_CD
        })));
    });

    app.get("/api/schoolYears", requireAuth, async (req, res) => {
        const rows = await schoolYearCol
            .find({}, {projection: {ID: 1, SCHOOL_YEAR: 1}})
            .sort({ID: 1})
            .toArray();

        res.json(rows.map(y => ({
            id: y.ID,
            year: y.SCHOOL_YEAR
        })));
    });

    app.get("/api/grades", requireAuth, async (req, res) => {
        const rows = await gradeDefsCol
            .find({}, {projection: {ID: 1, NAME_TX: 1, DESCRIPTION_TX: 1, ORDER_NO: 1}})
            .sort({ORDER_NO: 1})
            .toArray();

        res.json(rows.map(g => ({
            id: g.ID,
            name: g.NAME_TX,
            description: g.DESCRIPTION_TX
        })));
    });

    app.get("/api/aae", requireAuth, async (req, res) => {
        const {schoolId, schoolYearId} = req.query;

        const SCHOOL_ID = Number(schoolId);
        const SCHOOL_YR_ID = Number(schoolYearId);

        const rows = await aaeCol.find({SCHOOL_ID, SCHOOL_YR_ID}).toArray();

        res.json(rows.map(r => ({
            mongoId: r._id.toString(),
            ...r
        })));
    });

    app.post("/api/aae", requireAuth, async (req, res) => {
        const {schoolId, schoolYearId, ENROLLMENT_TYPE_CD, GENDER, NR_ENROLLED} = req.body;

        const SCHOOL_ID = Number(schoolId);
        const SCHOOL_YR_ID = Number(schoolYearId);

        const max = await aaeCol.find().sort({ID: -1}).limit(1).toArray();
        const nextId = (max[0]?.ID ?? 0) + 1;

        await aaeCol.insertOne({
            ID: nextId,
            SCHOOL_ID,
            SCHOOL_YR_ID,
            ENROLLMENT_TYPE_CD,
            GENDER,
            NR_ENROLLED: Number(NR_ENROLLED)
        });

        const rows = await aaeCol.find({SCHOOL_ID, SCHOOL_YR_ID}).toArray();
        res.json(rows.map(r => ({mongoId: r._id.toString(), ...r})));
    });


    app.post("/api/aae/edit", requireAuth, async (req, res) => {
        const {mongoId, schoolId, schoolYearId, ENROLLMENT_TYPE_CD, GENDER, NR_ENROLLED} = req.body;

        const SCHOOL_ID = Number(schoolId);
        const SCHOOL_YR_ID = Number(schoolYearId);

        await aaeCol.updateOne(
            {_id: new ObjectId(mongoId), SCHOOL_ID, SCHOOL_YR_ID},
            {$set: {ENROLLMENT_TYPE_CD, GENDER, NR_ENROLLED: Number(NR_ENROLLED)}}
        );

        const rows = await aaeCol.find({SCHOOL_ID, SCHOOL_YR_ID}).toArray();
        res.json(rows.map(r => ({mongoId: r._id.toString(), ...r})));
    });

    app.post("/api/aae/delete", requireAuth, async (req, res) => {
        const {mongoId, schoolId, schoolYearId} = req.body;

        const SCHOOL_ID = Number(schoolId);
        const SCHOOL_YR_ID = Number(schoolYearId);

        await aaeCol.deleteOne({_id: new ObjectId(mongoId), SCHOOL_ID, SCHOOL_YR_ID});

        const rows = await aaeCol.find({SCHOOL_ID, SCHOOL_YR_ID}).toArray();
        res.json(rows.map(r => ({mongoId: r._id.toString(), ...r})));
    });


// ENROLL_ATTRITION

    app.get("/api/attrition", requireAuth, async (req, res) => {
        const {schoolId, schoolYearId, gradeId} = req.query;

        const SCHOOL_ID = Number(schoolId);
        const SCHOOL_YR_ID = Number(schoolYearId);

        const filter = {SCHOOL_ID, SCHOOL_YR_ID};
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

        const max = await eaCol.find().sort({ID: -1}).limit(1).toArray();
        const nextId = (max[0]?.ID ?? 0) + 1;

        const doc = {
            ID: nextId,
            SCHOOL_ID,
            SCHOOL_YR_ID,

            ...(GRADE_DEF_ID !== undefined && GRADE_DEF_ID !== null && GRADE_DEF_ID !== ""
                ? {GRADE_DEF_ID: Number(GRADE_DEF_ID)}
                : {}),

            STUDENTS_ADDED_DURING_YEAR: Number(STUDENTS_ADDED_DURING_YEAR),
            STUDENTS_GRADUATED: Number(STUDENTS_GRADUATED),
            EXCH_STUD_REPTS: Number(EXCH_STUD_REPTS),
            STUD_DISS_WTHD: Number(STUD_DISS_WTHD),
            STUD_NOT_INV: Number(STUD_NOT_INV),
            STUD_NOT_RETURN: Number(STUD_NOT_RETURN)
        };

        await eaCol.insertOne(doc);

        const rows = await eaCol.find({SCHOOL_ID, SCHOOL_YR_ID}).toArray();
        res.json(rows.map(r => ({mongoId: r._id.toString(), ...r})));
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
            {_id: new ObjectId(mongoId), SCHOOL_ID, SCHOOL_YR_ID},
            {$set}
        );

        const rows = await eaCol.find({SCHOOL_ID, SCHOOL_YR_ID}).toArray();
        res.json(rows.map(r => ({mongoId: r._id.toString(), ...r})));
    });

    app.post("/api/attrition/delete", requireAuth, async (req, res) => {
        const {mongoId, schoolId, schoolYearId} = req.body;

        const SCHOOL_ID = Number(schoolId);
        const SCHOOL_YR_ID = Number(schoolYearId);

        await eaCol.deleteOne({_id: new ObjectId(mongoId), SCHOOL_ID, SCHOOL_YR_ID});

        const rows = await eaCol.find({SCHOOL_ID, SCHOOL_YR_ID}).toArray();
        res.json(rows.map(r => ({mongoId: r._id.toString(), ...r})));
    });


// ENROLL_ATTRITION_SOC

    app.get("/api/attritionSoc", requireAuth, async (req, res) => {
        const {schoolId, schoolYearId, gradeId} = req.query;

        const SCHOOL_ID = Number(schoolId);
        const SCHOOL_YR_ID = Number(schoolYearId);

        const filter = {SCHOOL_ID, SCHOOL_YR_ID};
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

        const max = await easocCol.find().sort({ID: -1}).limit(1).toArray();
        const nextId = (max[0]?.ID ?? 0) + 1;

        const doc = {
            ID: nextId,
            SCHOOL_ID,
            SCHOOL_YR_ID,

            ...(GRADE_DEF_ID !== undefined && GRADE_DEF_ID !== null && GRADE_DEF_ID !== ""
                ? {GRADE_DEF_ID: Number(GRADE_DEF_ID)}
                : {}),

            STUDENTS_ADDED_DURING_YEAR: Number(STUDENTS_ADDED_DURING_YEAR),
            STUDENTS_GRADUATED: Number(STUDENTS_GRADUATED),
            EXCH_STUD_REPTS: Number(EXCH_STUD_REPTS),
            STUD_DISS_WTHD: Number(STUD_DISS_WTHD),
            STUD_NOT_INV: Number(STUD_NOT_INV),
            STUD_NOT_RETURN: Number(STUD_NOT_RETURN)
        };

        await easocCol.insertOne(doc);

        const rows = await easocCol.find({SCHOOL_ID, SCHOOL_YR_ID}).toArray();
        res.json(rows.map(r => ({mongoId: r._id.toString(), ...r})));
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
            {_id: new ObjectId(mongoId), SCHOOL_ID, SCHOOL_YR_ID},
            {$set}
        );

        const rows = await easocCol.find({SCHOOL_ID, SCHOOL_YR_ID}).toArray();
        res.json(rows.map(r => ({mongoId: r._id.toString(), ...r})));
    });

    app.post("/api/attritionSoc/delete", requireAuth, async (req, res) => {
        const {mongoId, schoolId, schoolYearId} = req.body;

        const SCHOOL_ID = Number(schoolId);
        const SCHOOL_YR_ID = Number(schoolYearId);

        await easocCol.deleteOne({_id: new ObjectId(mongoId), SCHOOL_ID, SCHOOL_YR_ID});

        const rows = await easocCol.find({SCHOOL_ID, SCHOOL_YR_ID}).toArray();
        res.json(rows.map(r => ({mongoId: r._id.toString(), ...r})));
    });

    app.post("/api/chooseDisplaySchool", requireAuth, async (req, res) => {
        // console.log(req.query);
        // console.log(req.body);
        const SCHOOL_ID = req.body.displaySchoolId; //Number(req.query);
        const GENDER = "U";
        let filter = {SCHOOL_ID, GENDER};

        // Fetch the records and the year mappings (map the ID to the actual year
        let [rows, yearMapping] = await Promise.all([
            aaeCol.find(filter, {
                projection: {SCHOOL_ID: 1, SCHOOL_YR_ID: 1, NR_ENROLLED: 1}
            })  // only get these attributes of the object
                .sort({SCHOOL_YR_ID: 1})  // sort the list to be in order of year
                .toArray(),
            schoolYearCol.find({}).toArray()  // Get the objects from SCHOOL_YEAR
        ]);

        // Create a Quick Lookup Map with the objects from the SCHOOL_YEAR table
        // This creates an array where index is ID and value is the actual year
        const yearLookup = Object.fromEntries(yearMapping.map(y => [y.ID, y.SCHOOL_YEAR]));
        //console.log("yearLookup[1]: "+ yearLookup[1]);

        rows = rows.filter(e => e.NR_ENROLLED !== null)
            .map((current) => {
                const actualYear = yearLookup[current.SCHOOL_YR_ID] || "Unknown Year";

                return {
                    SCHOOL_YR_ID: actualYear,
                    NR_ENROLLED: current.NR_ENROLLED
                };
            })
        //console.log(rows);
        res.json(rows);
    })

    app.post("/api/chooseDisplaySchoolInquiriesYOY", requireAuth, async (req, res) => {

        const SCHOOL_ID = req.body.displaySchoolId;
        const ENROLLMENT_TYPE_CD = "INQUIRIES";
        const GENDER = "U";

        // Fetch the records and the year mappings (map the ID to the actual year
        const [rows, yearMapping] = await Promise.all([
            aaeCol.find({SCHOOL_ID, ENROLLMENT_TYPE_CD, GENDER})  // Get the objects from ADMISSION_ACTIVITY_ENROLLMENT
                .sort({SCHOOL_YR_ID: 1})
                .toArray(),
            schoolYearCol.find({}).toArray()  // Get the objects from SCHOOL_YEAR
        ]);
        // console.log("yearMapping[1].ID: " + yearMapping[1].ID);
        // console.log("yearMapping[1].SCHOOL_YEAR: " + yearMapping[1].SCHOOL_YEAR);

        // Create a Quick Lookup Map with the objects from the SCHOOL_YEAR table
        // This creates an array where index is ID and value is the actual year
        const yearLookup = Object.fromEntries(yearMapping.map(y => [y.ID, y.SCHOOL_YEAR]));
        //console.log("yearLookup[1]: "+ yearLookup[1]);
        //console.log("yearLookup[1].SCHOOL_YEAR: "+ yearLookup[1].SCHOOL_YEAR);``

        // Calculate percentages for corresponding year
        const report = rows
            // Filter out any objects where NR_ENROLLED is null or undefined
            .filter(row => row.NR_ENROLLED !== null && row.NR_ENROLLED !== undefined)
            .map((current, index, validRows) => {
                // If it's the first valid year, can't calculate % change yet
                if (index === 0) return null;

                const previous = validRows[index - 1];
                const v1 = previous.NR_ENROLLED;
                const v2 = current.NR_ENROLLED;

                // Calculate the percentage: ((year2 - year1) / year1) * 100
                const percentChange = v1 !== 0
                    ? ((v2 - v1) / v1) * 100
                    : 0;
                //console.log("percentChange: "+percentChange);

                // Swap the Foreign Key for the actual year
                //console.log("current.SCHOOL_YR_ID: "+current.SCHOOL_YR_ID);
                const actualYear = yearLookup[current.SCHOOL_YR_ID] || "Unknown Year";
                //console.log("actualYear: "+actualYear);

                return {
                    SCHOOL_YR_ID: actualYear,
                    //NR_Enrolled: v2,
                    percentage: percentChange
                    //percentage: `${percentChange.toFixed(2)}%`
                };
            })
            .filter(Boolean); // Remove the 'null' from the first year
        //console.log(report);
        res.json(report);
    })

    app.post("/api/retentionYOY", requireAuth, async (req, res) => {
        const SCHOOL_ID = req.body.displaySchoolId;

        const yearMapping = await schoolYearCol
            .find({})
            .sort({ID: 1})
            .toArray();

        const yearLookup = Object.fromEntries(yearMapping.map(y => [y.ID, y.SCHOOL_YEAR]));

        const rows = [];


        for (const year of yearMapping) {
            const SCHOOL_YR_ID = year.ID;

            const enrollment = await aaeCol.find({
                SCHOOL_ID,
                SCHOOL_YR_ID,
                GENDER: "U"
            }).toArray();

            const totalEnrolled = enrollment.reduce((acc, obj) =>
                acc + obj.NR_ENROLLED, 0);

            if (totalEnrolled <= 0) continue;

            const activity = await eaCol.find({
                SCHOOL_ID,
                SCHOOL_YR_ID
            }).toArray();

            const totalAdded = activity.reduce((acc, obj) =>
                acc + obj.STUDENTS_ADDED_DURING_YEAR, 0);

            const totalLeft = activity.reduce((acc, obj) =>
                acc + obj.STUD_DISS_WTHD + obj.STUD_NOT_INV + obj.STUD_NOT_RETURN, 0);

            const startingPop = totalEnrolled + totalAdded;
            const endingPop = startingPop - totalLeft;

            if (startingPop <= 0) continue;

            let retentionRate = 0;

            if (startingPop > 0) {
                retentionRate = (endingPop / startingPop) * 100;
            }

            rows.push({
                SCHOOL_YR_ID,
                retentionRate
            });
        }

        const report = rows
            .filter(row => row.retentionRate !== null && row.retentionRate !== undefined)
            .map((current, index, validRows) => {
                // If it's the first valid year, can't calculate % change yet
                if (index === 0) return null;


                const previous = validRows[index - 1];
                const v1 = previous.retentionRate;
                const v2 = current.retentionRate;

                if (v1 <= 0 || v2 <= 0)
                    return null;

                // Calculate the percentage: ((year2 - year1) / year1) * 100
                const percentChange = v1 !== 0
                    ? ((v2 - v1) / v1) * 100
                    : 0;

                // Swap the Foreign Key for the actual year
                const actualYear = yearLookup[current.SCHOOL_YR_ID] || "Unknown Year";

                return {
                    SCHOOL_YR_ID: actualYear,
                    //NR_Enrolled: v2,
                    percentage: percentChange
                    //percentage: `${percentChange.toFixed(2)}%`
                };
            })
            .filter(Boolean); // Remove the 'null' from the first year
        res.json(report);

    })

    app.post("/api/attritionYOY", requireAuth, async (req, res) => {
        const SCHOOL_ID = req.body.displaySchoolId;

        const yearMapping = await schoolYearCol
            .find({})
            .sort({ID: 1})
            .toArray();

        const yearLookup = Object.fromEntries(yearMapping.map(y => [y.ID, y.SCHOOL_YEAR]));

        const rows = [];


        for (const year of yearMapping) {
            const SCHOOL_YR_ID = year.ID;

            const enrollment = await aaeCol.find({
                SCHOOL_ID,
                SCHOOL_YR_ID,
                GENDER: "U"
            }).toArray();

            const totalEnrolled = enrollment.reduce((acc, obj) =>
                acc + obj.NR_ENROLLED, 0);

            if (totalEnrolled <= 0) continue;

            const activity = await eaCol.find({
                SCHOOL_ID,
                SCHOOL_YR_ID
            }).toArray();

            const totalAdded = activity.reduce((acc, obj) =>
                acc + obj.STUDENTS_ADDED_DURING_YEAR, 0);

            const totalLeft = activity.reduce((acc, obj) =>
                acc + obj.STUD_DISS_WTHD + obj.STUD_NOT_INV + obj.STUD_NOT_RETURN, 0);

            const startingPop = totalEnrolled + totalAdded;

            if (startingPop <= 0) continue;

            let attritionRate = 0;

            if (startingPop > 0) {
                attritionRate = (totalLeft / startingPop) * 100;
            }

            rows.push({
                SCHOOL_YR_ID,
                attritionRate
            });
        }

        const report = rows
            .filter(row => row.attritionRate !== null && row.attritionRate !== undefined)
            .map((current, index, validRows) => {
                // If it's the first valid year, can't calculate % change yet
                if (index === 0) return null;


                const previous = validRows[index - 1];
                const v1 = previous.attritionRate;
                const v2 = current.attritionRate;

                if (v1 <= 0 || v2 <= 0)
                    return null;

                // Calculate the percentage: ((year2 - year1) / year1) * 100
                const percentChange = v1 !== 0
                    ? ((v2 - v1) / v1) * 100
                    : 0;

                // Swap the Foreign Key for the actual year
                const actualYear = yearLookup[current.SCHOOL_YR_ID] || "Unknown Year";

                return {
                    SCHOOL_YR_ID: actualYear,
                    percentage: percentChange
                    //percentage: `${percentChange.toFixed(2)}%`
                };
            })
            .filter(Boolean); // Remove the 'null' from the first year
        res.json(report);

    })

    app.post("/api/chooseDisplayYear", requireAuth, async (req, res) => {
        const SCHOOL_ID = req.body.displaySchoolId;
        const SCHOOL_YR_ID = req.body.displaySchoolYear;
        let GENDER = "M";
        let filter = {SCHOOL_ID, SCHOOL_YR_ID, GENDER};

        //do we want to include enrolled faculty children?
        if (!req.body.includeFacultyChild) {
            //if not, filter for INQUIRIES too
            filter.ENROLLMENT_TYPE_CD = "INQUIRIES"
        }

        // In database, there could be a value for INQUIRIES and FACULTYCHILD
        // aaeCol.find could return up to 2 objects
        let gender_m = await aaeCol.find(filter, {
            projection: {SCHOOL_ID: 1, SCHOOL_YR_ID: 1, GENDER: 1, NR_ENROLLED: 1}
        })
            .toArray();
        //console.log(gender_m);
        // Get a single value for how many total males are enrolled
        const val_m = gender_m.reduce((accumulator, obj) => {
            return accumulator + obj.NR_ENROLLED;
        }, 0);

        // Repeat process for females and non-binary students
        filter.GENDER = "F"
        let gender_f = await aaeCol.find(filter, {
            projection: {SCHOOL_ID: 1, SCHOOL_YR_ID: 1, GENDER: 1, NR_ENROLLED: 1}
        })
            .toArray();
        //console.log(gender_f);
        const val_f = gender_f.reduce((accumulator, obj) => {
            return accumulator + obj.NR_ENROLLED;
        }, 0);

        filter.GENDER = "NB"
        let gender_nb = await aaeCol.find(filter, {
            projection: {SCHOOL_ID: 1, SCHOOL_YR_ID: 1, GENDER: 1, NR_ENROLLED: 1}
        })
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

    app.post("/api/retention", requireAuth, async (req, res) => {
        const schoolId = req.body.displaySchoolId;
        const schoolYear = req.body.displaySchoolYear;

        const enrollment = await aaeCol.find({
            SCHOOL_ID: schoolId,
            SCHOOL_YR_ID: schoolYear,
            GENDER: "U"
        }).toArray();

        const totalEnrolled = enrollment.reduce((accumulator, obj) => {
            return accumulator + obj.NR_ENROLLED;
        }, 0);

        const activity = await eaCol.find({
            SCHOOL_ID: schoolId,
            SCHOOL_YR_ID: schoolYear
        }).toArray();

        const totalAdded = activity.reduce((accumulator, obj) => {
            return accumulator + obj.STUDENTS_ADDED_DURING_YEAR;
        }, 0);

        const totalLeft = activity.reduce((accumulator, obj) => {
            return accumulator + obj.STUD_DISS_WTHD + obj.STUD_NOT_INV + obj.STUD_NOT_RETURN;
        }, 0);

        const startingPop = totalEnrolled + totalAdded;
        const endingPop = startingPop - totalLeft;

        let retentionRate = 0;

        if (startingPop > 0) {
            retentionRate = (endingPop / startingPop) * 100;
        }

        res.json({
            retentionRate: Number(retentionRate.toFixed(2))
        });
    })

    //CURRENT BUG: attrition percent undefined and most common reason not found
    app.post("/api/attritionYear", requireAuth, async (req, res) => {
        const schoolId = req.body.displaySchoolId;
        const schoolYear = req.body.displaySchoolYear;

        const enrollment = await aaeCol.find({
            SCHOOL_ID: schoolId,
            SCHOOL_YR_ID: schoolYear,
            GENDER: "U"
        }).toArray();

        const totalEnrolled = enrollment.reduce((accumulator, obj) => {
            return accumulator + obj.NR_ENROLLED;
        }, 0);

        const activity = await eaCol.find({
            SCHOOL_ID: schoolId,
            SCHOOL_YR_ID: schoolYear
        }).toArray();

        const totalAdded = activity.reduce((accumulator, obj) => {
            return accumulator + obj.STUDENTS_ADDED_DURING_YEAR;
        }, 0);

        const totalLeft = activity.reduce((accumulator, obj) => {
            return accumulator + obj.STUD_DISS_WTHD + obj.STUD_NOT_INV + obj.STUD_NOT_RETURN;
        }, 0);

        const startingPop = totalEnrolled + totalAdded;

        let attritionRate = 0;

        if (startingPop > 0) {
            attritionRate = (totalLeft / startingPop) * 100;
        }

        const reasons = [
            {
                reason: "Dismissed or Withdrawn",
                value: activity.reduce((acc, obj) => acc + (obj.STUD_DISS_WTHD || 0), 0)
            },
            {reason: "Not Invited Back", value: activity.reduce((acc, obj) => acc + (obj.STUD_NOT_INV || 0), 0)},
            {reason: "Did Not Return", value: activity.reduce((acc, obj) => acc + (obj.STUD_NOT_RETURN || 0), 0)},
        ];

        const mostCommon = reasons.reduce((max, curr) => (curr.value > max.value ? curr : max));

        res.json({
            attritionRate: Number(attritionRate.toFixed(2)),
            mostCommon: mostCommon.reason
        });


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
