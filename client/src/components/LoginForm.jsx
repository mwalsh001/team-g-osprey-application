export default function LoginForm(
    {
        title = "Login",
        username,
        password,
        error,
        onUsernameChange,
        onPasswordChange,
        onSchoolLogin,
        onAdminLogin,
        primaryLabel = "School Login",
        secondaryLabel = "Admin Login",
    }) {

    return (
        <div>
            <h2>{title}</h2>

            {error && <p>{error}</p>}

            <form>
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
                    <button type="button" onClick={onSchoolLogin}>{primaryLabel}</button>
                    <button type="button" onClick={onAdminLogin}>{secondaryLabel}</button>
                </div>
            </form>
        </div>
    );
}
