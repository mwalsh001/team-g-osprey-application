import { useEffect, useState } from "react";
import {
    getEntries,
    addEntry,
    editEntry,
    deleteEntry
} from "../api/entryApi";
import AppHeader from "../components/AppHeader.jsx";
import EntryForm from "../components/EntryForm.jsx";
import EntryTable from "../components/EntryTable.jsx";


export default function EntryManagerPage({ username, onLogout }) {
    const [entries, setEntries] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [notify, setNotify] = useState("");

    const [date, setDate] = useState("");
    const [valueA, setValueA] = useState("");
    const [valueB, setValueB] = useState("");

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

    return (
        <>
            <AppHeader username={username} onLogout={onLogout}/>
            {notify && <p>{notify}</p>}

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
