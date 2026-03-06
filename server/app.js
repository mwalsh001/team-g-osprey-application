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

function getAttritionCollection(collectionName) {
    return collectionName === "ENROLL_ATTRITION_SOC" ? easocCol : eaCol;
}

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
        const resSchoolName = user.schoolName || user.school || null;
        if (role === "school" && !resSchoolName) {
            return res.json({
                success: false,
                message: "School account is missing a school name"
            });
        }
        const payload = {
            username,
            role: user.role,
            schoolName: resSchoolName
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN
        });
        return res.json({
            success: true,
            newUser: false,
            token,
            role: user.role,
            schoolName: resSchoolName
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

    app.get("/api/schoolRegions", requireAuth, async (req, res) => {
        const rows = await schoolCol
            .find({REGION_CD: {$exists: true}}, {projection: {REGION_CD: 1}})
            .sort({REGION_CD: 1})
            .toArray();

        const uniqueValues = [...new Set(rows.map(item=>item.REGION_CD))]
        console.log(uniqueValues)
        res.json(uniqueValues)
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

    async function getSchoolEnrollmentData(filter) {
        let rows;
        return rows = await aaeCol.aggregate([
            {$match: {...filter, NR_ENROLLED: {$ne: null}}},

            // Combine rows with same SCHOOL_ID, GENDER, SCHOOL_YR_ID
            {
                $group: {
                    _id: "$SCHOOL_YR_ID",
                    NR_ENROLLED: {$sum: "$NR_ENROLLED"}
                }
            },

            // Sort by year
            {$sort: {_id: 1}},

            // Rename fields for consistency
            {
                $project: {
                    SCHOOL_YR_ID: "$_id",
                    NR_ENROLLED: 1,
                    _id: 0
                }
            }
        ]).toArray();
    }

    async function yearIndexToActual(data){
        // Fetch the records and the year mappings (map the ID to the actual year
        let yearMapping = await schoolYearCol.find({}).toArray();  // Get the objects from SCHOOL_YEAR

        // Create a Quick Lookup Map with the objects from the SCHOOL_YEAR table
        // This creates an array where index is ID and value is the actual year
        const yearLookup = Object.fromEntries(yearMapping.map(y => [y.ID, y.SCHOOL_YEAR]));

        data = data.map((current) => {
            const actualYear = yearLookup[current.SCHOOL_YR_ID] || "Unknown Year";
            return {
                SCHOOL_YR_ID: actualYear,
                NR_ENROLLED: current.NR_ENROLLED
            };
        })
        return data
    }


    app.post("/api/chooseDisplaySchool", requireAuth, async (req, res) => {

        const SCHOOL_ID = req.body.displaySchoolId; //Number(req.query);
        const GENDER = "U"
        let filter = {SCHOOL_ID, GENDER};
        let data = await getSchoolEnrollmentData(filter)
        data = await yearIndexToActual(data)
        res.json(data)

    })

    app.post("/api/chooseFilterRegion", requireAuth, async (req, res) => {

        const displayRegion = req.body.displayRegion;

        const regionKeys = await schoolCol
            .find({REGION_CD: displayRegion}, {projection: {ID: 1}})
            .toArray();

        const schoolIds = [...new Set(regionKeys.map(item => item.ID))];
        if (!schoolIds.length) {
            return res.json([]);
        }

        const pipeline = [
            {
                $match: {
                    SCHOOL_ID: {$in: schoolIds},
                    GENDER: "U"
                }
            },
            {
                $group: {
                    _id: {SCHOOL_ID: "$SCHOOL_ID", SCHOOL_YR_ID: "$SCHOOL_YR_ID"},
                    totalEnrolled: {$sum: "$NR_ENROLLED"}
                }
            },
            {
                $group: {
                    _id: "$_id.SCHOOL_YR_ID",
                    avgEnrolled: {$avg: "$totalEnrolled"}
                }
            },
            {$sort: {_id: 1}}
        ];

        const rows = await aaeCol.aggregate(pipeline).toArray();

        const avgArray = rows.map(row => ({
            SCHOOL_YR_ID: row._id,
            NR_ENROLLED: row.avgEnrolled
        }));

        const mapped = await yearIndexToActual(avgArray);
        res.json(mapped)

    })

    app.post("/api/genderFilterRegion", requireAuth, async (req, res) => {

        let regionKeys = await schoolCol.find({REGION_CD: req.body.displayRegion},
            {projection:{ID: 1}})
            .toArray()

        regionKeys = [...new Set(regionKeys.map(item=>item.ID))]
        //console.log("regionKeys: " + regionKeys)
        let SCHOOL_YR_ID = req.body.displaySchoolYear
        let data
        const yearAccs = new Array(3).fill(0);

        for (const key of regionKeys) {
            const SCHOOL_ID = key;
            let filter = {SCHOOL_ID, SCHOOL_YR_ID};
            filter.GENDER = "M"
            data = await getSchoolEnrollmentData(filter);
            yearAccs[0] += data.reduce((sum, d) => sum + (d.NR_ENROLLED || 0), 0);

            filter.GENDER = "F"
            data = await getSchoolEnrollmentData(filter);
            yearAccs[1] += data.reduce((sum, d) => sum + (d.NR_ENROLLED || 0), 0);

            filter.GENDER = "NB"
            data = await getSchoolEnrollmentData(filter);
            yearAccs[2] += data.reduce((sum, d) => sum + (d.NR_ENROLLED || 0), 0);
        }
        let avgArray = Array(3)
        for (let i = 0; i < avgArray.length; i++){
            avgArray[i] = yearAccs[i]/regionKeys.length
        }
        res.json(avgArray)
    })

    async function getSchoolInquiriesYOY(filter) {
        let rows = await aaeCol.find(filter)  // Get the objects from ADMISSION_ACTIVITY_ENROLLMENT
            .sort({SCHOOL_YR_ID: 1}).toArray();

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

                return {
                    SCHOOL_YR_ID: current.SCHOOL_YR_ID,
                    //NR_Enrolled: v2,
                    NR_ENROLLED: percentChange
                    //percentage: `${percentChange.toFixed(2)}%`
                };
            })
            .filter(Boolean); // Remove the 'null' from the first year

        return report;

    }

    app.post("/api/chooseDisplaySchoolInquiriesYOY", requireAuth, async (req, res) => {

        const SCHOOL_ID = req.body.displaySchoolId;
        const ENROLLMENT_TYPE_CD = "INQUIRIES";
        const GENDER = "U";

        let filter = {SCHOOL_ID, GENDER, ENROLLMENT_TYPE_CD};
        let data = await getSchoolInquiriesYOY(filter);
        data = await yearIndexToActual(data);  // map the year index to actual year
        res.json(data);
    })

    app.post("/api/chooseFilterDisplaySchoolInquiriesYOY", requireAuth, async (req, res) => {
        const displayRegion = req.body.displayRegion;
        const GENDER = "U";
        const ENROLLMENT_TYPE_CD = "INQUIRIES";

        const regionKeys = await schoolCol
            .find({REGION_CD: displayRegion}, {projection: {ID: 1}})
            .toArray();

        const schoolIds = [...new Set(regionKeys.map(item => item.ID))];
        if (!schoolIds.length) {
            return res.json([]);
        }

        const pipeline = [
            {
                $match: {
                    SCHOOL_ID: {$in: schoolIds},
                    GENDER,
                    ENROLLMENT_TYPE_CD
                }
            },
            {$sort: {SCHOOL_ID: 1, SCHOOL_YR_ID: 1}},
            {
                $group: {
                    _id: {SCHOOL_ID: "$SCHOOL_ID", SCHOOL_YR_ID: "$SCHOOL_YR_ID"},
                    totalInquiries: {$sum: "$NR_ENROLLED"}
                }
            },
            {$sort: {"_id.SCHOOL_ID": 1, "_id.SCHOOL_YR_ID": 1}}
        ];

        const rows = await aaeCol.aggregate(pipeline).toArray();

        // Compute YOY per school
        const bySchool = new Map();
        for (const row of rows) {
            const schoolId = row._id.SCHOOL_ID;
            if (!bySchool.has(schoolId)) bySchool.set(schoolId, []);
            bySchool.get(schoolId).push({
                SCHOOL_YR_ID: row._id.SCHOOL_YR_ID,
                NR_ENROLLED: row.totalInquiries
            });
        }

        const yearAccs = new Map();
        for (const series of bySchool.values()) {
            for (let i = 1; i < series.length; i++) {
                const prev = series[i - 1];
                const curr = series[i];
                if (!prev || !curr || prev.NR_ENROLLED == null) continue;
                const v1 = prev.NR_ENROLLED;
                const v2 = curr.NR_ENROLLED;
                const percentChange = v1 !== 0 ? ((v2 - v1) / v1) * 100 : 0;
                const yearId = curr.SCHOOL_YR_ID;
                if (!yearAccs.has(yearId)) yearAccs.set(yearId, {sum: 0, count: 0});
                const entry = yearAccs.get(yearId);
                entry.sum += percentChange;
                entry.count += 1;
            }
        }

        const avgArray = Array.from(yearAccs.entries())
            .map(([yearId, entry]) => ({
                SCHOOL_YR_ID: Number(yearId),
                NR_ENROLLED: entry.count ? entry.sum / entry.count : 0
            }))
            .sort((a, b) => a.SCHOOL_YR_ID - b.SCHOOL_YR_ID);

        const mapped = await yearIndexToActual(avgArray);
        res.json(mapped)

    })

    async function getRetentionYOY(SCHOOL_ID) {
        console.log("inside getRetentionYOY for SCHOOL_ID: " + SCHOOL_ID);

        // 1. Get the year mapping first (still needed for the loop base)
        const yearMapping = await schoolYearCol.find({}).sort({ ID: 1 }).toArray();

        // 2. Map years to a "stream" of Promises (all start immediately)
        const rawDataPromises = yearMapping.map(async (year) => {
            const SCHOOL_YR_ID = year.ID;

            // Fetch enrollment and activity in parallel for THIS year
            const [enrollment, activity] = await Promise.all([
                aaeCol.find({ SCHOOL_ID, SCHOOL_YR_ID, GENDER: "U" }).toArray(),
                eaCol.find({ SCHOOL_ID, SCHOOL_YR_ID }).toArray()
            ]);

            const totalEnrolled = enrollment.reduce((acc, obj) => acc + (obj.NR_ENROLLED || 0), 0);
            if (totalEnrolled <= 0) return null;

            const totalAdded = activity.reduce((acc, obj) =>
                acc + (obj.STUDENTS_ADDED_DURING_YEAR || 0), 0);

            const totalLeft = activity.reduce((acc, obj) =>
                acc + (obj.STUD_DISS_WTHD || 0) + (obj.STUD_NOT_INV || 0) + (obj.STUD_NOT_RETURN || 0), 0);

            const startingPop = totalEnrolled + totalAdded;
            if (startingPop <= 0) return null;

            const endingPop = startingPop - totalLeft;
            const retentionRate = (endingPop / startingPop) * 100;

            return { SCHOOL_YR_ID, retentionRate };
        });

        // 3. Wait for all years to resolve at once
        const rawRows = (await Promise.all(rawDataPromises)).filter(Boolean);

        // 4. Calculate Year-Over-Year change (same logic as before)
        return rawRows.map((current, index, validRows) => {
            if (index === 0) return null;

            const previous = validRows[index - 1];
            const v1 = previous.retentionRate;
            const v2 = current.retentionRate;

            if (v1 <= 0) return null; // Avoid division by zero

            const percentChange = ((v2 - v1) / v1) * 100;

            return {
                SCHOOL_YR_ID: current.SCHOOL_YR_ID,
                percentage: percentChange
            };
        }).filter(Boolean);
    }

    async function yearIndexToActualRetention(data){
        let yearMapping = await schoolYearCol.find({}).toArray();  // Get the objects from SCHOOL_YEAR
        const yearLookup = Object.fromEntries(yearMapping.map(y => [y.ID, y.SCHOOL_YEAR]));

        data = data.map((current) => {
            const actualYear = yearLookup[current.SCHOOL_YR_ID] || "Unknown Year";
            return {
                SCHOOL_YR_ID: actualYear,
                percentage: current.percentage
            };
        })
        return data
    }


    app.post("/api/retentionYOY", requireAuth, async (req, res) => {

        const SCHOOL_ID = req.body.displaySchoolId;
        let data = await getRetentionYOY(SCHOOL_ID);
        // console.log(data);
        data = await yearIndexToActualRetention(data);  // map the year index to actual year
        // console.log(data);
        res.json(data);

    })


    app.post("/api/filterRetentionYOY", requireAuth, async (req, res) => {

        const displayRegion = req.body.displayRegion;
        const attritionCol = getAttritionCollection(req.body.attritionCollection);

        const regionKeys = await schoolCol
            .find({REGION_CD: displayRegion}, {projection: {ID: 1}})
            .toArray();

        const schoolIds = [...new Set(regionKeys.map(item => item.ID))];
        if (!schoolIds.length) {
            return res.json([]);
        }

        const pipeline = [
            {$match: {SCHOOL_ID: {$in: schoolIds}}},
            {
                $group: {
                    _id: {SCHOOL_ID: "$SCHOOL_ID", SCHOOL_YR_ID: "$SCHOOL_YR_ID"},
                    totalAdded: {$sum: "$STUDENTS_ADDED_DURING_YEAR"},
                    totalLeft: {
                        $sum: {
                            $add: ["$STUD_DISS_WTHD", "$STUD_NOT_INV", "$STUD_NOT_RETURN"]
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: "ADMISSION_ACTIVITY_ENROLLMENT",
                    let: {schoolId: "$_id.SCHOOL_ID", yearId: "$_id.SCHOOL_YR_ID"},
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        {$eq: ["$SCHOOL_ID", "$$schoolId"]},
                                        {$eq: ["$SCHOOL_YR_ID", "$$yearId"]},
                                        {$eq: ["$GENDER", "U"]}
                                    ]
                                }
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                totalEnrolled: {$sum: "$NR_ENROLLED"}
                            }
                        }
                    ],
                    as: "enrollment"
                }
            },
            {
                $addFields: {
                    totalEnrolled: {
                        $ifNull: [{$arrayElemAt: ["$enrollment.totalEnrolled", 0]}, 0]
                    }
                }
            },
            {
                $addFields: {
                    startingPop: {$add: ["$totalEnrolled", "$totalAdded"]},
                    retentionRate: {
                        $cond: [
                            {$gt: [{$add: ["$totalEnrolled", "$totalAdded"]}, 0]},
                            {
                                $multiply: [
                                    {
                                        $divide: [
                                            {$subtract: [{$add: ["$totalEnrolled", "$totalAdded"]}, "$totalLeft"]},
                                            {$add: ["$totalEnrolled", "$totalAdded"]}
                                        ]
                                    },
                                    100
                                ]
                            },
                            null
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: "$_id.SCHOOL_YR_ID",
                    avgRetentionRate: {$avg: "$retentionRate"}
                }
            },
            {$sort: {_id: 1}}
        ];

        const rows = await attritionCol.aggregate(pipeline).toArray();

        const yoy = rows
            .filter(r => r.avgRetentionRate !== null && r.avgRetentionRate !== undefined)
            .map(r => ({SCHOOL_YR_ID: r._id, retentionRate: r.avgRetentionRate}))
            .map((current, index, validRows) => {
                if (index === 0) return null;
                const previous = validRows[index - 1];
                const v1 = previous.retentionRate;
                const v2 = current.retentionRate;
                if (v1 <= 0) return null;
                return {
                    SCHOOL_YR_ID: current.SCHOOL_YR_ID,
                    percentage: ((v2 - v1) / v1) * 100
                };
            })
            .filter(Boolean);

        const mapped = await yearIndexToActualRetention(yoy);
        res.json(mapped)

    })

    async function getAttritionYOY(SCHOOL_ID, attritionCol) {
        console.log("inside getAttritionYOY for SCHOOL_ID: " + SCHOOL_ID);
        const yearMapping = await schoolYearCol
            .find({})
            .sort({ ID: 1 })
            .toArray();
        const collection = attritionCol || eaCol;

        // 1. Map years to a stream of Promises
        const rawDataPromises = yearMapping.map(async (year) => {
            const SCHOOL_YR_ID = year.ID;

            // 2. Fetch enrollment and activity in parallel for THIS specific year
            const [enrollment, activity] = await Promise.all([
                aaeCol.find({ SCHOOL_ID, SCHOOL_YR_ID, GENDER: "U" }).toArray(),
                collection.find({ SCHOOL_ID, SCHOOL_YR_ID }).toArray()
            ]);

            // 3. Calculate baseline Enrollment
            const totalEnrolled = enrollment.reduce((acc, obj) =>
                acc + (obj.NR_ENROLLED || 0), 0
            );

            // Skip year if there is no enrollment data
            if (totalEnrolled <= 0) return null;

            // 4. Calculate Activity (Added and Left)
            const totalAdded = activity.reduce((acc, obj) =>
                acc + (obj.STUDENTS_ADDED_DURING_YEAR || 0), 0
            );

            const totalLeft = activity.reduce((acc, obj) =>
                acc +
                (obj.STUD_DISS_WTHD || 0) +
                (obj.STUD_NOT_INV || 0) +
                (obj.STUD_NOT_RETURN || 0), 0
            );

            // 5. Calculate Attrition (Who Left)
            const startingPop = totalEnrolled + totalAdded;

            // Safety check for division by zero
            if (startingPop <= 0) return null;

            // The formula for Attrition Rate: (Those who left / Starting Population) * 100
            const attritionRate = (totalLeft / startingPop) * 100;

            return {
                SCHOOL_YR_ID,
                attritionRate
            };
        });

        // 6. Resolve all and filter out nulls
        const rows = (await Promise.all(rawDataPromises)).filter(row => row !== null);
        return rows
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

                return {
                    SCHOOL_YR_ID: current.SCHOOL_YR_ID,
                    percentage: percentChange
                    //percentage: `${percentChange.toFixed(2)}%`
                };
            })
            .filter(Boolean); // Remove the 'null' from the first year

    }

    app.post("/api/attritionYOY", requireAuth, async (req, res) => {
        const SCHOOL_ID = req.body.displaySchoolId;
        const attritionCol = getAttritionCollection(req.body.attritionCollection);
        let data = await getAttritionYOY(SCHOOL_ID, attritionCol);
        console.log("attritionYOY");
        console.log(data);
        data = await yearIndexToActualRetention(data);  // map the year index to actual year
        console.log("Await id to actual yr");
        console.log(data);
        res.json(data);

    })

    app.post("/api/filterAttritionYOY", requireAuth, async (req, res) => {
        const displayRegion = req.body.displayRegion;
        const attritionCol = getAttritionCollection(req.body.attritionCollection);

        const regionKeys = await schoolCol
            .find({REGION_CD: displayRegion}, {projection: {ID: 1}})
            .toArray();

        const schoolIds = [...new Set(regionKeys.map(item => item.ID))];
        if (!schoolIds.length) {
            return res.json([]);
        }

        const pipeline = [
            {$match: {SCHOOL_ID: {$in: schoolIds}}},
            {
                $group: {
                    _id: {SCHOOL_ID: "$SCHOOL_ID", SCHOOL_YR_ID: "$SCHOOL_YR_ID"},
                    totalAdded: {$sum: "$STUDENTS_ADDED_DURING_YEAR"},
                    totalLeft: {
                        $sum: {
                            $add: ["$STUD_DISS_WTHD", "$STUD_NOT_INV", "$STUD_NOT_RETURN"]
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: "ADMISSION_ACTIVITY_ENROLLMENT",
                    let: {schoolId: "$_id.SCHOOL_ID", yearId: "$_id.SCHOOL_YR_ID"},
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        {$eq: ["$SCHOOL_ID", "$$schoolId"]},
                                        {$eq: ["$SCHOOL_YR_ID", "$$yearId"]},
                                        {$eq: ["$GENDER", "U"]}
                                    ]
                                }
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                totalEnrolled: {$sum: "$NR_ENROLLED"}
                            }
                        }
                    ],
                    as: "enrollment"
                }
            },
            {
                $addFields: {
                    totalEnrolled: {
                        $ifNull: [{$arrayElemAt: ["$enrollment.totalEnrolled", 0]}, 0]
                    }
                }
            },
            {
                $addFields: {
                    startingPop: {$add: ["$totalEnrolled", "$totalAdded"]},
                    attritionRate: {
                        $cond: [
                            {$gt: [{$add: ["$totalEnrolled", "$totalAdded"]}, 0]},
                            {
                                $multiply: [
                                    {$divide: ["$totalLeft", {$add: ["$totalEnrolled", "$totalAdded"]}]},
                                    100
                                ]
                            },
                            null
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: "$_id.SCHOOL_YR_ID",
                    avgAttritionRate: {$avg: "$attritionRate"}
                }
            },
            {$sort: {_id: 1}}
        ];

        const rows = await attritionCol.aggregate(pipeline).toArray();

        const yoy = rows
            .filter(r => r.avgAttritionRate !== null && r.avgAttritionRate !== undefined)
            .map(r => ({SCHOOL_YR_ID: r._id, attritionRate: r.avgAttritionRate}))
            .map((current, index, validRows) => {
                if (index === 0) return null;
                const previous = validRows[index - 1];
                const v1 = previous.attritionRate;
                const v2 = current.attritionRate;
                if (v1 <= 0 || v2 <= 0) return null;
                return {
                    SCHOOL_YR_ID: current.SCHOOL_YR_ID,
                    percentage: ((v2 - v1) / v1) * 100
                };
            })
            .filter(Boolean);

        const mapped = await yearIndexToActualRetention(yoy);
        res.json(mapped);

    })

    app.post("/api/attritionRatesYearly", requireAuth, async (req, res) => {
        const SCHOOL_ID = req.body.displaySchoolId;
        const attritionCol = getAttritionCollection(req.body.attritionCollection);

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

            const activity = await attritionCol.find({
                SCHOOL_ID,
                SCHOOL_YR_ID
            }).toArray();

            const totalAdded = activity.reduce((acc, obj) =>
                acc + obj.STUDENTS_ADDED_DURING_YEAR, 0);

            const totalLeft = activity.reduce((acc, obj) =>
                acc + obj.STUD_DISS_WTHD + obj.STUD_NOT_INV + obj.STUD_NOT_RETURN, 0);

            const startingPop = totalEnrolled + totalAdded;

            if (startingPop <= 0) continue;

            const attritionRate = (totalLeft / startingPop) * 100;

            rows.push({
                SCHOOL_YR_ID: yearLookup[SCHOOL_YR_ID] || "Unknown Year",
                attritionRate: Number(attritionRate.toFixed(2))
            });
        }

        res.json(rows);
    })

    async function getAttritionRatesYearlyForSchool(schoolId, attritionCol, yearMapping) {
        const rows = [];
        for (const year of yearMapping) {
            const SCHOOL_YR_ID = year.ID;

            const enrollment = await aaeCol.find({
                SCHOOL_ID: schoolId,
                SCHOOL_YR_ID,
                GENDER: "U"
            }).toArray();

            const totalEnrolled = enrollment.reduce((accumulator, obj) => {
                return accumulator + obj.NR_ENROLLED;
            }, 0);

            if (totalEnrolled <= 0) continue;

            const activity = await attritionCol.find({
                SCHOOL_ID: schoolId,
                SCHOOL_YR_ID
            }).toArray();

            const totalAdded = activity.reduce((accumulator, obj) => {
                return accumulator + obj.STUDENTS_ADDED_DURING_YEAR;
            }, 0);

            const totalLeft = activity.reduce((accumulator, obj) => {
                return accumulator + obj.STUD_DISS_WTHD + obj.STUD_NOT_INV + obj.STUD_NOT_RETURN;
            }, 0);

            const startingPop = totalEnrolled + totalAdded;

            if (startingPop <= 0) continue;

            const attritionRate = (totalLeft / startingPop) * 100;

            rows.push({
                SCHOOL_YR_ID,
                attritionRate: Number(attritionRate.toFixed(2))
            });
        }
        return rows;
    }

    app.post("/api/filterAttritionRatesYearly", requireAuth, async (req, res) => {
        let regionKeys = await schoolCol.find(
            {REGION_CD: req.body.displayRegion},
            {projection:{ID: 1}}
        ).toArray();

        regionKeys = [...new Set(regionKeys.map(item=>item.ID))];

        const attritionCol = getAttritionCollection(req.body.attritionCollection);

        const yearMapping = await schoolYearCol
            .find({})
            .sort({ID: 1})
            .toArray();

        const yearLookup = Object.fromEntries(yearMapping.map(y => [y.ID, y.SCHOOL_YEAR]));

        const acc = Object.fromEntries(yearMapping.map(y => [y.ID, {sum: 0, count: 0}]));

        for (const key of regionKeys) {
            const rates = await getAttritionRatesYearlyForSchool(key, attritionCol, yearMapping);
            for (const row of rates) {
                if (!acc[row.SCHOOL_YR_ID]) continue;
                acc[row.SCHOOL_YR_ID].sum += row.attritionRate;
                acc[row.SCHOOL_YR_ID].count += 1;
            }
        }

        const rows = yearMapping
            .map((year) => {
                const entry = acc[year.ID];
                if (!entry || entry.count === 0) return null;
                return {
                    SCHOOL_YR_ID: yearLookup[year.ID] || "Unknown Year",
                    attritionRate: Number((entry.sum / entry.count).toFixed(2))
                };
            })
            .filter(Boolean);

        res.json(rows);
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


    app.post("/api/attritionYear", requireAuth, async (req, res) => {
        const schoolId = req.body.displaySchoolId;
        const schoolYear = req.body.displaySchoolYear;
        const attritionCol = getAttritionCollection(req.body.attritionCollection);

        const enrollment = await aaeCol.find({
            SCHOOL_ID: schoolId,
            SCHOOL_YR_ID: schoolYear,
            GENDER: "U"
        }).toArray();

        const totalEnrolled = enrollment.reduce((accumulator, obj) => {
            return accumulator + obj.NR_ENROLLED;
        }, 0);

        const activity = await attritionCol.find({
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

        res.json({
            attritionRate: Number(attritionRate.toFixed(2)),
            dissOrWthd: reasons[0].value,
            notInvited: reasons[1].value,
            notReturn: reasons[2].value
        });


    })

    const clientDist = path.join(__dirname, "..", "client", "dist");
    app.use(express.static(clientDist));

    app.get(/^(?!\/api|\/submit|\/protected).*/, (req, res) => {
        res.sendFile(path.join(clientDist, "index.html"));
    });
}

const PORT = process.env.PORT || 3000;

run()
    .then(() => {
        app.listen(PORT, () => console.log("Listening on", PORT));
    })
    .catch((err) => {
        console.error("Failed to start server:", err);
        process.exit(1);
    });
