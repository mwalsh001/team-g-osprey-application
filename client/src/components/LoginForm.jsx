export default function LoginForm({
                                      title = "Login",
                                      username,
                                      password,
                                      error,
                                      onUsernameChange,
                                      onPasswordChange,
                                      onSubmit,
                                      onSchoolLogin,
                                      onAdminLogin,
                                      primaryLabel = "School Login",
                                      secondaryLabel = "Admin Login",
                                  }) {

    return (
        <div className="container d-flex justify-content-center align-items-center min-vh-100">
            <div className="card shadow-sm" style={{width: "100%", maxWidth: "400px"}}>
                <div className="card-body">
                    <h3 className="card-title text-center mb-4">{title}</h3>

                    {error && (
                        <div className="alert alert-danger py-2">
                            {error}
                        </div>
                    )}

            <form onSubmit={onSubmit}>
                <div className="mb-3">
                    <label className="form-label">Username</label>
                    <input
                        type="text"
                        className="form-control"
                        value={username}
                        onChange={(e) => onUsernameChange(e.target.value)}
                        required
                    />
                </div>

                <div className="mb-4">
                    <label className="form-label">Password</label>
                    <input
                        type="password"
                        className="form-control"
                        value={password}
                        onChange={(e) => onPasswordChange(e.target.value)}
                        required
                    />
                </div>

                <div className="d-grid gap-2">
                    <button type="button" className="btn btn-primary" onClick={onSchoolLogin}>{primaryLabel}</button>
                    <button type="button" className="btn btn-outline-secondary"
                            onClick={onAdminLogin}>{secondaryLabel}</button>
                </div>
            </form>
                </div>
            </div>
        </div>
    );
}
