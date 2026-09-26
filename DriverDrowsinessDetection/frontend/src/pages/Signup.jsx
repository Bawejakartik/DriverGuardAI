import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { apiErrorMessage } from "../api/client";

const INITIAL = { fullname: "", email: "", drivingLicense: "", password: "" };

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(INITIAL);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signup(form);
      navigate("/login", {
        replace: true,
        state: { message: "Account created successfully. Please sign in." },
      });
    } catch (err) {
      setError(apiErrorMessage(err, "Could not create your account"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="card auth-card">
        <div className="auth-brand">
          <div className="sidebar-logo">🚗</div>
          <div>
            <h1>Create your account</h1>
            <p>Start monitoring driver safety in minutes</p>
          </div>
        </div>

        {error && <div className="banner banner-error">{error}</div>}

        <form onSubmit={onSubmit}>
          <div className="field">
            <label>Full name</label>
            <input
              name="fullname"
              required
              value={form.fullname}
              onChange={onChange}
              placeholder="Jane Doe"
            />
          </div>

          <div className="field">
            <label>Email</label>
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={onChange}
              placeholder="you@example.com"
            />
          </div>

          <div className="field">
            <label>Driving license number</label>
            <input
              name="drivingLicense"
              required
              value={form.drivingLicense}
              onChange={onChange}
              placeholder="DL-1234567890"
            />
          </div>

          <div className="field">
            <label>Password</label>
            <input
              type="password"
              name="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={form.password}
              onChange={onChange}
              placeholder="••••••••"
            />
          </div>

          <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
            {submitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <div className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
