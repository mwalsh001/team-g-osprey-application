import { useEffect, useState } from "react";
import {
    getEntries,
    addEntry,
    editEntry,
    deleteEntry,
    createSchoolAccount
} from "../api/entryApi";
import AppHeader from "../components/AppHeader.jsx";
import EntryForm from "../components/EntryForm.jsx";
import EntryTable from "../components/EntryTable.jsx";


export default function EntryManagerPage({ username, onLogout }) {
    const [entries, setEntries] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [notify, setNotify] = useState("");
    const role = localStorage.getItem("role");
    const isAdmin = role === "admin";

    const [date, setDate] = useState("");
    const [valueA, setValueA] = useState("");
    const [valueB, setValueB] = useState("");
    const [schoolUsername, setSchoolUsername] = useState("");
    const [schoolPassword, setSchoolPassword] = useState("");
    const [schoolName, setSchoolName] = useState("");

    useEffect(() => {
        async function load() {
            try {
                const response = await getEntries();
                setEntries(response);
            } catch (e) {
                alert("Unauthorized");
                setEntries([]);
                setTimeout(() => {
                    localStorage.removeItem("token");
                    localStorage.removeItem("username");
                    onLogout();
                }, 2000);
            }
        }
        void load();
    }, []);

    const submit = async (event) => {
        event.preventDefault();

        const json = {
            date,
            valueA,
            valueB
        };

        let updatedData;
        const isEditing = Boolean(editingId);

        if (isEditing) {
            updatedData = await editEntry({ ...json, id: editingId });
            setNotify(
                `Entry successfully updated. Date: ${date}, Value A: ${valueA}, Value B: ${valueB}`
            );
        } else {
            updatedData = await addEntry(json);
            setNotify(
                `Entry successfully added. Date: ${date}, Value A: ${valueA}, Value B: ${valueB}`
            );
        }

        setEntries(updatedData);

        setEditingId(null);
        setDate("");
        setValueA("");
        setValueB("");
    };

    const handleDelete = async (entry) => {
        const updated = await deleteEntry(entry.id);
        setEntries(updated);

        setNotify(
            `Entry successfully deleted. Date: ${entry.date}, Value A: ${entry.valueA}, Value B: ${entry.valueB}`
        );

        if (editingId === entry.id) {
            setEditingId(null);
            setDate("");
            setValueA("");
            setValueB("");
        }
    };

    const handleEdit = (entry) => {
        setDate(entry.date);
        setValueA(entry.valueA);
        setValueB(entry.valueB);

        setEditingId(entry.id);
        setNotify("");
    };
    const handleCreateSchoolUser = async (entry) => {
        entry.preventDefault();
        try {
            await createSchoolAccount(schoolUsername, schoolPassword, schoolName);
            setNotify(`School account "${schoolUsername}" from "${schoolName}" created successfully`);
            setSchoolUsername("");
            setSchoolPassword("");
            setSchoolName("");
        } catch (e) {
            setNotify("Failed to create the school account");
        }
    };

    return (
        <>
            <AppHeader username={username} onLogout={onLogout}/>
            {notify && <p>{notify}</p>}
            {isAdmin && (
                <form onSubmit={handleCreateSchoolUser}>
                    <h3>Create New School User Account</h3>
                    <input value={schoolUsername} onChange={(entry) => setSchoolUsername(entry.target.value)}/>
                    <input type="password" value={schoolPassword}
                           onChange={(entry) => setSchoolPassword(entry.target.value)}/>
                    <label> School Name: </label>
                    <input value={schoolName} onChange={(entry) => setSchoolName(entry.target.value)}/>
                    <button type="submit"> Create School User</button>
                </form>
            )}

            <EntryForm
                date={date}
                valueA={valueA}
                valueB={valueB}
                editing={editingId}
                onDateChange={setDate}
                onValueAChange={setValueA}
                onValueBChange={setValueB}
                onSubmit={submit}
                onCancel={() => {
                    setEditingId(null);
                    setDate("");
                    setValueA("");
                    setValueB("");
                }}
            />

            <EntryTable
                entries={entries}
                editingId={editingId}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />
        </>
    );
}