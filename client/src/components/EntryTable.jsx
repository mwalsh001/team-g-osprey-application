export default function EntryTable({ entries, editingId, onEdit, onDelete }) {
    return (
        <section>
            <h2>Entry History</h2>

            <table>
                <thead>
                <tr>
                    <th>Date</th>
                    <th>Value A</th>
                    <th>Value B</th>
                    <th>Actions</th>
                </tr>
                </thead>

                <tbody>
                {entries.map((entry) => (
                    <tr key={entry.id}>
                        <td>{entry.date}</td>
                        <td>{entry.valueA}</td>
                        <td>{entry.valueB}</td>
                        <td>
                            <button type="button" onClick={() => onEdit(entry)}>
                                Edit
                            </button>
                            <button type="button" onClick={() => onDelete(entry)}>
                                Delete
                            </button>
                        </td>
                    </tr>
                ))}

                {!entries.length && (
                    <tr>
                        <td colSpan="4">No entries yet.</td>
                    </tr>
                )}
                </tbody>
            </table>
        </section>
    );
}
