// ============================================================================
// Login.jsx
// Login screen for "Amjad Magic Center"
// - Role select (Admin | Warehouse) as a native dropdown, "Admin" selected by default
// - Password field with show/hide eye toggle
// - "Continue as Customer" clears the password value first so the browser's
//   "Save password?" prompt doesn't fire when the user didn't actually log in
// - "Forgot password?" -> flow across TWO SEPARATE bottom sheets (not one
//   sheet with sliding panels inside it):
//     1) "Confirm code" sheet — 6-digit code, countdown timer, paste-to-fill
//     2) "Reset password" sheet — New password / Confirm password
//   Both sheets reuse styles.css's existing .sheet / .sheet-bg component,
//   which already animates in (rise from bottom) and out (fall to bottom)
//   via `transform: translateY(...)` + `transition: transform .3s`.
//   The flow is:
//     Forgot password -> Confirm-code sheet rises up
//     Verify Code     -> Confirm-code sheet falls down, THEN
//                        Reset-password sheet rises up
//     Reset           -> Reset-password sheet falls down, THEN
//                        navigate straight to /admin/home
//   The "then" is a short setTimeout matched to the sheet's own CSS
//   transition duration, so the first sheet is fully closed before the
//   next one opens (see SHEET_TRANSITION_MS below).
//
// Validation: react-hook-form + yup
// Styling: only classNames already defined in styles.css are used for all
// "real" UI (.field, .btn, .sheet, .link-row, .error, etc). A small <style>
// block at the bottom only covers pieces styles.css has no equivalent for
// yet (password eye button, divider, 6-digit code boxes) — it reuses the
// same CSS variables (--ink, --brass, --line, ...) so it stays visually
// consistent with the rest of the app.
// ============================================================================

import React, { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { loginApi } from "../api/misc"
import { passwordResetApi } from "../api/misc"
import { toast } from "../utils/format";
// ----------------------------------------------------------------------------
// Small inline icons (no external icon package required)
// ----------------------------------------------------------------------------
const EyeIcon = (props) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" {...props}>
    <path
      d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

const EyeOffIcon = (props) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" {...props}>
    <path
      d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a20.6 20.6 0 0 1 5.06-5.94M9.9 4.24A10.6 10.6 0 0 1 12 4c7 0 11 7 11 7a20.7 20.7 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M1 1l22 22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

// ----------------------------------------------------------------------------
// Validation schemas (yup)
// ----------------------------------------------------------------------------

// Login form (role + password)
const loginSchema = yup.object({
  role: yup.string().oneOf(["admin", "warehouse"], "Please select a role").required("Please select a role"),
  password: yup
    .string()
    .required("Password is required")
    .min(4, "Password must be at least 4 characters"),
});

// Confirm-code sheet: 6-digit code
const codeSchema = yup.object({
  code: yup
    .string()
    .required("Enter the 6-digit code")
    .matches(/^[0-9]{6}$/, "Enter all 6 digits"),
});

// Reset-password sheet
const resetSchema = yup.object({
  newPassword: yup
    .string()
    .required("New password is required")
    .min(6, "Password must be at least 6 characters"),
  confirmPassword: yup
    .string()
    .required("Please confirm your password")
    .oneOf([yup.ref("newPassword")], "Passwords do not match"),
});

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------
const CODE_LENGTH = 6;
const RESEND_SECONDS = 2 * 60; // "code will expire in 2:00"
const COMPANY_EMAIL = "duakhan5096@gmail.com";
// styles.css defines `.sheet{ transition: transform .3s ... }`. We wait for
// that same duration before opening/closing the *next* sheet so the two
// animations never overlap — first one fully lands, then the next rises.
const SHEET_TRANSITION_MS = 300;

export default function Login() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const loginMutation = useMutation({
    mutationFn: (data) => loginApi.login(data.role, data.password),
    onSuccess: (data) => {
      if (data?.success) {
        // Manually update the global React Query state 
        // This triggers your AuthContext and Route Guards instantly!
        queryClient.setQueryData(['authUser'], { authenticated: true, user: data.user });
        if (data.user.role === "admin")
          navigate("/admin/home");
        else
          navigate("/warehouse");
      }
    },
    onError: (error) => {
      alert(error.message || "Invalid Credentials");
    }
  });


  // --- Password visibility -------------------------------------------------
  const [showPassword, setShowPassword] = useState(false);

  // --- Forgot-password flow: two independent sheets -------------------------
  const [codeSheetOpen, setCodeSheetOpen] = useState(false);
  const [resetSheetOpen, setResetSheetOpen] = useState(false);
  // shared dark backdrop stays visible as long as either sheet is open, so
  // it doesn't flicker off/on during the handoff between the two sheets
  const overlayOpen = codeSheetOpen || resetSheetOpen;

  const [timeLeft, setTimeLeft] = useState(RESEND_SECONDS);
  const [sendCount, setSendCount] = useState(0); // counts how many times the code has been sent

  // --- 6-digit code boxes ----------------------------------------------------
  const [codeDigits, setCodeDigits] = useState(Array(CODE_LENGTH).fill(""));
  const digitRefs = useRef([]);




  const verifyCodeMut = useMutation({
    mutationFn: (data) => passwordResetApi.verifyCode(data.code),

    onSuccess: () => {
      setCodeSheetOpen(false);

      setTimeout(() => {
        setResetSheetOpen(true);
      }, SHEET_TRANSITION_MS);
    },

    onError: (err) => {
      alert(err.response?.data?.message || "Invalid code");
    },
  });
  // ==========================================================================
  // react-hook-form instances (one per form)
  // ==========================================================================

  // 1) Login form
  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    setValue: setLoginValue,
    getValues: getLoginValues,
    formState: { errors: loginErrors },
  } = useForm({
    resolver: yupResolver(loginSchema),
    defaultValues: { role: "admin", password: "" }, // "Admin" selected by default
  });

  // 2) Confirm-code form (digits are kept in state and synced into this form
  //    as a single string so yup can validate the combined value)
  const {
    handleSubmit: handleCodeSubmit,
    setValue: setCodeValue,
    formState: { errors: codeErrors },
  } = useForm({
    resolver: yupResolver(codeSchema),
    defaultValues: { code: "" },
  });

  // 3) Reset-password form
  const {
    register: registerReset,
    handleSubmit: handleResetSubmit,
    formState: { errors: resetErrors },
    reset: resetResetForm,
  } = useForm({
    resolver: yupResolver(resetSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });
  //  Reset Mutation
  const role = getLoginValues("role");

  const resetMutation = useMutation({
    mutationFn: (data) => passwordResetApi.resetPassword(role, data.newPassword),
    onSuccess: (data) => {
      if (data?.success) {
        // Manually update the global React Query state 
        // This triggers your AuthContext and Route Guards instantly!
        queryClient.setQueryData(['authUser'], { authenticated: true, user: data.user });
        setResetSheetOpen(false); // reset-password sheet falls to bottom
        setTimeout(() => {
          resetResetForm();
        }, SHEET_TRANSITION_MS);
        if (data.user.role === "admin")
          navigate("/admin/home");
        else
          navigate("/warehouse");
      }
    },
    onError: (error) => {
      toast(error.message || "reset password failed");
    }
  });
 
    const sendCodeMut = useMutation({
    mutationFn: () => passwordResetApi.sendCode(role),

    onSuccess: () => {
      setTimeLeft(RESEND_SECONDS);
      setCodeDigits(Array(CODE_LENGTH).fill(""));
      setCodeValue("code", "");
      setSendCount((prev) => prev + 1);
    },

    onError: (err) => {
      console.log(err)
      toast(err.response?.data?.message || "Failed to send code");
    },
  });


  // ==========================================================================
  // Countdown timer — only runs while the confirm-code sheet is open
  // ==========================================================================
  useEffect(() => {
    if (!codeSheetOpen) return undefined;
    if (timeLeft <= 0) return undefined;

    const intervalId = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : 0));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [codeSheetOpen, timeLeft]);

  // mm:ss formatting for the timer label
  const formatTime = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  // ==========================================================================
  // Handlers — Login form
  // ==========================================================================
  const onLoginSubmit = (data) => {
    // data = { role, password }
    console.log("Login submitted:", data);
    loginMutation.mutate(data);
    // TODO: call your auth API here, then navigate based on role, e.g.
    // navigate(data.role === "admin" ? "/admin/home" : "/warehouse");
  };

  const continueAsCustomer = async () => {
    // Clear whatever the user typed in the password field (and drop focus)
    // BEFORE navigating away. Browsers offer to "Save this password?" when
    // a filled password field disappears/navigates without an explicit
    // submit being blocked — clearing the value first means there is
    // nothing for the browser's password manager to notice or offer to save.
    await setLoginValue("password", "");

    navigate("/customer");
  };

  // ==========================================================================
  // Handlers — Confirm-code sheet open/close
  // ==========================================================================
  const openForgotModal = () => {
    setTimeLeft(RESEND_SECONDS);
    setCodeDigits(Array(CODE_LENGTH).fill(""));
    setCodeValue("code", "");
    setCodeSheetOpen(true); // rises from bottom (.sheet.open)
  };

  // Closes whichever sheet is currently open, with no further navigation —
  // used by the backdrop click and each sheet's "x" button.
  const closeForgotFlow = () => {
    setCodeSheetOpen(false); // falls to bottom
    setResetSheetOpen(false); // falls to bottom
    setCodeDigits(Array(CODE_LENGTH).fill(""));
    resetResetForm();
  };

  // ==========================================================================
  // Handlers — 6-digit code boxes (typing, backspace, paste)
  // ==========================================================================
  const updateDigits = (nextDigits) => {
    setCodeDigits(nextDigits);
    setCodeValue("code", nextDigits.join(""), { shouldValidate: false });
  };

  const handleDigitChange = (index, rawValue) => {
    // only allow a single numeric character per box
    const value = rawValue.replace(/[^0-9]/g, "").slice(-1);
    const next = [...codeDigits];
    next[index] = value;
    updateDigits(next);

    // auto-advance to the next box
    if (value && index < CODE_LENGTH - 1) {
      digitRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (index, e) => {
    if (e.key === "Backspace" && !codeDigits[index] && index > 0) {
      digitRefs.current[index - 1]?.focus();
    }
  };

  // Handles pasting a full 6-digit code into any of the boxes and
  // auto-filling all of them at once.
  const handleDigitPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/[^0-9]/g, "")
      .slice(0, CODE_LENGTH);

    if (!pasted) return;

    const next = pasted.split("");
    while (next.length < CODE_LENGTH) next.push("");
    updateDigits(next);

    // focus the box right after the last pasted digit (or the last box)
    const focusIndex = Math.min(pasted.length, CODE_LENGTH - 1);
    digitRefs.current[focusIndex]?.focus();
  };

  // Verify Code -> close the confirm-code sheet (falls to bottom), then
  // once that animation has finished, open the reset-password sheet
  // (rises from bottom). This is two independent sheets, not one sheet
  // with sliding internal panels.
  const onVerifyCode = (data) => {
    console.log("Verifying code:", data.code);
    verifyCodeMut.mutate(data);
  };

  // "Resend code" only resends the code + restarts the timer/boxes; it
  // stays on the same confirm-code sheet.
  const onResendCode = () => {
    // TODO: call your resend-code API here.
    console.log("Resending code...");
    setTimeLeft(RESEND_SECONDS);
    setCodeDigits(Array(CODE_LENGTH).fill(""));
    setCodeValue("code", "");
    digitRefs.current[0]?.focus();
  };

  // ==========================================================================
  // Handlers — Reset password sheet
  // ==========================================================================
  const onResetSubmit = (data) => {
    console.log("Resetting password:", data);
    // TODO: call your reset-password API here.
    resetMutation.mutate(data);
  }; ``

  // ==========================================================================
  // Render
  // ==========================================================================
  return (
    <div className="screen">
      {/* ---------------------------------------------------------------- */}
      {/* Brand header                                                     */}
      {/* ---------------------------------------------------------------- */}
      <div className="login-header">
        <h1>Amjad Magic Center</h1>
        <p className="sub">Sign in to manage your product catalog</p>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Login form                                                       */}
      {/* ---------------------------------------------------------------- */}
      <form onSubmit={handleLoginSubmit(onLoginSubmit)}>
        {/* Role select — native dropdown, "Admin" selected by default */}
        <div className="field">
          <label>Select Role</label>
          <select {...registerLogin("role")} >
            <option value="admin">Admin</option>
            <option value="warehouse">Warehouse</option>
          </select>
          {loginErrors.role && <p className="error">{loginErrors.role.message}</p>}
        </div>

        {/* Password field with show/hide eye icon */}
        <div className="field">
          <label>Password</label>
          <div className="password-field">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              {...registerLogin("password")}
            />
            <button
              type="button"
              className="toggle-eye"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeIcon /> : <EyeOffIcon />}
            </button>
          </div>
          {loginErrors.password && <p className="error">{loginErrors.password.message}</p>}
        </div>

        {/* Forgot password */}
        <div className="forgot-row">
          <span className="link-row" onClick={() =>{setCodeSheetOpen(true); sendCodeMut.mutate()}}>
           Forgot password?
          </span>
        </div>

        {/* Login button */}
        <button type="submit" className="btn brass" disabled={loginMutation.isPending}>
          {loginMutation.isPending ? "Logging in..." : "Login"}
        </button>
      </form>

      {/* ---------------------------------------------------------------- */}
      {/* Divider — "or"                                                   */}
      {/* ---------------------------------------------------------------- */}
      <div className="divider-row">
        <span className="line" />
        <span className="or-text">or</span>
        <span className="line" />
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Continue as Customer                                             */}
      {/* Deliberately OUTSIDE the <form> above, and clears the password   */}
      {/* value before navigating — see continueAsCustomer() comments.     */}
      {/* ---------------------------------------------------------------- */}
      <button type="button" className="btn ghost" onClick={continueAsCustomer}>
        Continue as Customer
      </button>

      {/* ================================================================ */}
      {/* Shared backdrop for both sheets                                   */}
      {/* ================================================================ */}
      <div className={`sheet-bg ${overlayOpen ? "open" : ""}`} onClick={closeForgotFlow} />

      {/* ================================================================ */}
      {/* Sheet 1 — "Confirm code"                                          */}
      {/* Uses styles.css's own .sheet transform/transition: rises up on   */}
      {/* "open", falls back down when the class is removed.               */}
      {/* ================================================================ */}
      <div className={`sheet ${codeSheetOpen ? "open" : ""}`}>
        <div className="sheet-head">
          <h2>Confirm code</h2>
          <span className="x" onClick={closeForgotFlow}>
            &times;
          </span>
        </div>

        <div className="sheet-body">
          <p className="filter-note modal-subtext">
            We have sent a 6-digit code to <strong>{COMPANY_EMAIL}</strong>
          </p>

          <form onSubmit={handleCodeSubmit(onVerifyCode)} noValidate>
            <div className="field">
              <label>Enter 6-Digit Code</label>
              <div className="code-boxes" onPaste={handleDigitPaste}>
                {codeDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (digitRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    className="code-box"
                    value={digit}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleDigitKeyDown(index, e)}
                    onPaste={handleDigitPaste}
                  />
                ))}
              </div>
              {codeErrors.code && <p className="error">{codeErrors.code.message}</p>}
            </div>

            {/* Countdown timer */}
            <p className="timer-text">
              Code will expire in <strong>{formatTime(timeLeft)}</strong>
            </p>

            {/* Verify Code -> closes THIS sheet, then opens the reset sheet */}
            <button type="submit" className="btn brass" disabled={verifyCodeMut.isPending || timeLeft <= 0}>
              {timeLeft <= 0 ? "Code Expired" : "Verify Code"}
            </button>

            <p className="resend-row">
              Didn't receive code?{" "}
              {sendCount < 4 ? (
                <span className="link-row resend-link" onClick={sendCodeMut.mutate} disabled={timeLeft > 0 || sendCodeMut.isPending}>
                  {sendCodeMut.isPending ? "Sending Code.." : "Resend code"}
                </span>
              ) : (
                <span className="error" >
                  Code is send 3 times. Please contact support.
                </span>
              )}
            </p>
          </form>
        </div>
      </div>

      {/* ================================================================ */}
      {/* Sheet 2 — "Reset password"                                        */}
      {/* Completely separate .sheet from the one above; only opens after  */}
      {/* the confirm-code sheet has fully closed (see onVerifyCode).      */}
      {/* ================================================================ */}
      <div className={`sheet ${resetSheetOpen ? "open" : ""}`}>
        <div className="sheet-head">
          <h2>Reset password</h2>
          <span className="x" onClick={closeForgotFlow}>
            &times;
          </span>
        </div>

        <div className="sheet-body">
          <p className="filter-note modal-subtext">Create a new password for your account.</p>

          <form onSubmit={handleResetSubmit(onResetSubmit)} noValidate>
            <div className="field">
              <label>New Password</label>
              <input type="text" placeholder="Enter new password" {...registerReset("newPassword")} />
              {resetErrors.newPassword && <p className="error">{resetErrors.newPassword.message}</p>}
            </div>

            <div className="field">
              <label>Confirm Password</label>
              <input
                type="text"
                placeholder="Re-enter new password"
                {...registerReset("confirmPassword")}
              />
              {resetErrors.confirmPassword && (
                <p className="error">{resetErrors.confirmPassword.message}</p>
              )}
            </div>

            {/* Reset -> closes THIS sheet, then navigates to /admin/home */}
            <button type="submit" className="btn brass" disabled={resetMutation.isPending}>
              Reset
            </button>
          </form>
        </div>
      </div>

      {/* ================================================================ */}
      {/* Extra styles for pieces not covered by styles.css:                */}
      {/* login layout helpers, password eye button, divider, code boxes.   */}
      {/* Reuses the same CSS variables defined in styles.css. Note: NO     */}
      {/* custom slide/track CSS here anymore — both sheets use styles.css's*/}
      {/* own .sheet open/close transform+transition as-is.                */}
      {/* ================================================================ */}
      <style>{`
        .login-header{text-align:center;padding:48px 0 28px}
        .login-header h1{font-size:24px;font-weight:800;letter-spacing:-.01em}
        .login-header .sub{font-size:13px;color:var(--muted);margin-top:6px;font-weight:600}

        .password-field{position:relative}
        .password-field input{padding-right:44px}
        .toggle-eye{position:absolute;right:10px;top:50%;transform:translateY(-50%);
          color:var(--muted);display:flex;align-items:center;justify-content:center;padding:4px}

        .forgot-row{display:flex;justify-content:flex-end;margin-bottom:18px;margin-top:-6px}

        .divider-row{display:flex;align-items:center;gap:10px;margin:22px 0}
        .divider-row .line{flex:1;height:1px;background:var(--line)}
        .divider-row .or-text{font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase}

        .modal-subtext{margin-bottom:18px;line-height:1.5}

        /* 6-digit code boxes */
        .code-boxes{display:flex;gap:8px;justify-content:space-between}
        .code-box{width:44px !important;height:52px;text-align:center;font-size:20px;font-weight:800;
          padding:0 !important}

        .timer-text{font-size:13px;color:var(--muted);font-weight:600;margin-bottom:16px}
        .timer-text strong{color:var(--brass)}

        .resend-row{text-align:center;font-size:13px;color:var(--muted);font-weight:500;margin-top:14px}
        .resend-link{margin-bottom:0;display:inline}
      `}</style>
    </div>
  );
}