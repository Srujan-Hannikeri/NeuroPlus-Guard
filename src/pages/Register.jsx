import React, {useState} from "react";
import {Eye, EyeOff} from "lucide-react";
import {useNavigate} from "react-router-dom";
import axios from "axios";
import {API_BASE_URL} from "../config";

const Register = () => {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    password: "",
    role: "Patient",
    age: "",
    bloodGroup: "",
    specialization: "",
    upiId: "",
    registrationNumber: "",
    stateCouncil: "",
    registrationYear: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({...formData, [e.target.name]: e.target.value});
    if (
      [
        "registrationNumber",
        "name",
        "stateCouncil",
        "registrationYear",
      ].includes(e.target.name)
    ) {
      setVerificationResult(null);
    }
  };

  const handleVerifyDoctor = async () => {
    if (!formData.registrationNumber.trim()) {
      setError("Please enter your Medical Registration Number first.");
      return;
    }
    setError("");
    setIsVerifying(true);
    try {
      const {data} = await axios.post(`${API_BASE_URL}/auth/verify-doctor`, {
        registrationNumber: formData.registrationNumber,
        name: formData.name,
        stateCouncil: formData.stateCouncil,
        registrationYear: formData.registrationYear,
      });
      setVerificationResult(data);
      if (!data.verified) {
        let msg = data.message || "";
        if (!msg || /404|portal|not found|http/i.test(msg)) {
          msg = `No registered doctor found with Registration Number "${formData.registrationNumber}". Please verify your Registration Number and State Council.`;
        }
        setError(msg);
      }
    } catch (err) {
      let errMsg = err.response?.data?.message || err.message || "";
      if (!errMsg || /404|portal|not found|http/i.test(errMsg)) {
        errMsg = `No registered doctor found with Registration Number "${formData.registrationNumber}". Please verify your Registration Number and State Council.`;
      }
      setError(errMsg);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (formData.role === "Doctor" && !formData.registrationNumber.trim()) {
      setError(
        "Medical Registration Number is required for doctor registration.",
      );
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/auth/register`, formData);
      setSuccess(
        "Registration successful! You can now log in using your Phone Number. Redirecting...",
      );
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      let errMsg = err.response?.data?.message || "Registration failed";
      if (/404|portal|not found|http/i.test(errMsg)) {
        errMsg = `Doctor verification failed: No matching doctor found with Registration Number "${formData.registrationNumber}". Please verify your credentials.`;
      }
      setError(errMsg);
    }
  };

  return (
    <div className="auth-container">
      <div
        className="glass-panel auth-card"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          maxWidth: "480px",
        }}>
        <svg
          viewBox="0 0 100 100"
          width="80"
          height="80"
          style={{marginBottom: "16px"}}>
          <path
            d="M50 5 L10 20 L10 50 C10 75 45 90 50 95 C55 90 90 75 90 50 L90 20 Z"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="6"
            strokeLinejoin="round"
          />
          <path
            d="M35 50 L65 50 M50 35 L50 65"
            stroke="var(--secondary)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M25 55 L40 55 L45 35 L55 75 L60 50 L75 50"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <path
            d="M68 40 L78 30 L88 40"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M78 30 L78 50"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </svg>
        <h2
          style={{textAlign: "center", marginBottom: "8px", fontSize: "2rem"}}>
          <span style={{color: "var(--primary)"}}>NeuroPlus</span>{" "}
          <span style={{color: "var(--secondary)"}}>Guard</span>
        </h2>
        <p
          style={{
            textAlign: "center",
            color: "var(--text-muted)",
            marginBottom: "24px",
            fontStyle: "italic",
          }}>
          Your Health, Our Focus
        </p>
        {error && (
          <div
            style={{
              color: "var(--error)",
              marginBottom: "16px",
              textAlign: "center",
              padding: "8px 12px",
              background: "#fee2e2",
              borderRadius: "6px",
              fontSize: "0.9rem",
            }}>
            {error}
          </div>
        )}
        {success && (
          <div
            style={{
              color: "#047857",
              marginBottom: "16px",
              textAlign: "center",
              padding: "8px 12px",
              background: "#d1fae5",
              borderRadius: "6px",
              fontSize: "0.9rem",
              fontWeight: 600,
            }}>
            {success}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            width: "100%",
          }}>
          <input
            type="text"
            name="name"
            placeholder="Full Name (e.g. Dr. Jane Smith)"
            className="input-field"
            onChange={handleChange}
            required
          />
          <div>
            <input
              type="text"
              name="phone"
              placeholder="Phone Number (Login ID)"
              className="input-field"
              onChange={handleChange}
              required
              style={{width: "100%"}}
            />
            <span
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                marginTop: "2px",
                display: "block",
              }}>
              Used to log into your account
            </span>
          </div>
          <div style={{position: "relative", width: "100%"}}>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              className="input-field"
              onChange={handleChange}
              required
              style={{width: "100%", paddingRight: "40px"}}
            />
            <div
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                cursor: "pointer",
                color: "var(--text-muted)",
              }}
              onClick={() => setShowPassword(!showPassword)}>
              {showPassword ?
                <EyeOff size={20} />
              : <Eye size={20} />}
            </div>
          </div>

          <select
            name="role"
            className="input-field"
            onChange={handleChange}
            value={formData.role}>
            <option value="Patient">Patient</option>
            <option value="Doctor">
              Doctor (Requires Medical Verification)
            </option>
          </select>

          {formData.role === "Patient" && (
            <>
              <input
                type="number"
                name="age"
                placeholder="Age"
                className="input-field"
                onChange={handleChange}
              />
              <input
                type="text"
                name="bloodGroup"
                placeholder="Blood Group (e.g. O+)"
                className="input-field"
                onChange={handleChange}
              />
            </>
          )}

          {formData.role === "Doctor" && (
            <div
              style={{
                background: "#f8fafc",
                padding: "16px",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}>
                <span
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: "bold",
                    color: "var(--primary)",
                  }}>
                  AskMyDoc Verification
                </span>
                <span
                  style={{
                    fontSize: "0.7rem",
                    padding: "2px 8px",
                    borderRadius: "999px",
                    background: "#e0e7ff",
                    color: "#4338ca",
                    fontWeight: 600,
                  }}>
                  NMC Register
                </span>
              </div>
              <p
                style={{
                  fontSize: "0.78rem",
                  color: "var(--text-muted)",
                  margin: 0,
                }}>
                Every doctor must be verified through the AskMyDoc API against
                official medical council registers.
              </p>

              <input
                type="text"
                name="registrationNumber"
                placeholder="Medical Registration"
                className="input-field"
                onChange={handleChange}
                required
              />
              <input
                type="text"
                name="stateCouncil"
                placeholder="State Medical Council (e.g. Maharashtra, Karnataka)"
                className="input-field"
                onChange={handleChange}
              />
              <input
                type="text"
                name="registrationYear"
                placeholder="Registration Year (e.g. 2018)"
                className="input-field"
                onChange={handleChange}
              />
              <input
                type="text"
                name="specialization"
                placeholder="Specialization (e.g. Neurologist, Cardiologist)"
                className="input-field"
                onChange={handleChange}
              />
              <input
                type="text"
                name="upiId"
                placeholder="UPI ID for Consultations"
                className="input-field"
                onChange={handleChange}
              />

              <button
                type="button"
                onClick={handleVerifyDoctor}
                disabled={isVerifying || !formData.registrationNumber}
                style={{
                  background: "none",
                  border: "1px solid var(--primary)",
                  color: "var(--primary)",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: isVerifying ? "wait" : "pointer",
                }}>
                {isVerifying ?
                  "🔍 Verifying via AskMyDoc API..."
                : "✓ Test Verification with AskMyDoc"}
              </button>

              {verificationResult && (
                <div
                  style={{
                    padding: "10px",
                    borderRadius: "6px",
                    fontSize: "0.82rem",
                    background:
                      verificationResult.verified ? "#ecfdf5" : "#fef2f2",
                    border: `1px solid ${verificationResult.verified ? "#a7f3d0" : "#fecaca"}`,
                    color: verificationResult.verified ? "#065f46" : "#991b1b",
                  }}>
                  {verificationResult.verified ?
                    <div>
                      <strong>✓ AskMyDoc Verified!</strong>
                      <div>Name: {verificationResult.name}</div>
                      <div>Council: {verificationResult.state_council}</div>
                      <div>
                        Qualification:{" "}
                        {verificationResult.qualification || "MBBS"}
                      </div>
                    </div>
                  : <div>
                      ✕{" "}
                      {(
                        /404|portal|http/i.test(
                          verificationResult.message || "",
                        )
                      ) ?
                        `No verified doctor found with Registration Number "${formData.registrationNumber}". Please verify your registration number and State Council.`
                      : verificationResult.message ||
                        "Credentials not verified in medical register."
                      }
                    </div>
                  }
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            style={{marginTop: "8px"}}>
            Register
          </button>
        </form>
        <p
          style={{
            textAlign: "center",
            marginTop: "20px",
            color: "var(--text-muted)",
          }}>
          Already have an account?{" "}
          <span
            style={{color: "var(--primary)", cursor: "pointer"}}
            onClick={() => navigate("/login")}>
            Login
          </span>
        </p>
        <p
          style={{
            textAlign: "center",
            marginTop: "12px",
            fontSize: "0.85rem",
            color: "var(--text-muted)",
          }}>
          <span
            style={{
              cursor: "pointer",
              borderBottom: "1px solid var(--glass-border)",
            }}
            onClick={() => navigate("/developer")}>
            Contact Developer
          </span>
        </p>
      </div>
    </div>
  );
};

export default Register;
