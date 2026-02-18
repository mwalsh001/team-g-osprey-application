export default function EntryForm(
    {
        date,
        valueA,
        valueB,
        editing,
        onDateChange,
        onValueAChange,
        onValueBChange,
        onSubmit,
        onCancel
    }) {

    return (
        <section>
            <h2>Add / Edit Entry</h2>

            <form onSubmit={onSubmit}>
                <div>
                    <label>Date</label>
                    <input
                        type="date"
                        required
                        value={date}
                        onChange={(e) => onDateChange(e.target.value)}
                    />
                </div>

                <div>
                    <label>Value A</label>
                    <input
                        type="number"
                        step="0.5"
                        min="0"
                        required
                        value={valueA}
                        onChange={(e) => onValueAChange(e.target.value)}
                    />
                </div>

                <div>
                    <label>Value B</label>
                    <input
                        type="number"
                        min="0"
                        required
                        value={valueB}
                        onChange={(e) => onValueBChange(e.target.value)}
                    />
                </div>

                <div>
                    <button type="submit">
                        {editing ? "Save Changes" : "Add Entry"}
                    </button>

                    {editing && (
                        <button type="button" onClick={onCancel}>
                            Cancel
                        </button>
                    )}
                </div>
            </form>
        </section>
    );
}
