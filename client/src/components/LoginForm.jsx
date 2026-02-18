export default function LoginForm(
    {
        title = "Login",
        username,
        password,
        error,
        onUsernameChange,
        onPasswordChange,
        onSubmit,
        primaryLabel = "School Login",
        secondaryLabel = "Admin Login",
    }) {

    return (
        <div>
            <h2>{title}</h2>

            {error && <p>{error}</p>}

            <form onSubmit={onSubmit}>
                <div>
                    <label>Username</label>
                    <input
                        value={username}
                        onChange={(e) => onUsernameChange(e.target.value)}
                        required
                    />
                </div>

                <div>
                    <label>Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => onPasswordChange(e.target.value)}
                        required
                    />
                </div>

                <div>
                    <button type="submit">{primaryLabel}</button>
                    <button type="submit">{secondaryLabel}</button>
                </div>
            </form>
        </div>
    );
}
