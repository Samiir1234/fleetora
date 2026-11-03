"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, CalendarDays, CarFront, CheckCircle2, ChevronRight, MapPin, UserPlus } from "lucide-react";
import { markDashboardLoginComplete, registerUser, signInUser } from "../auth";
import styles from "./login.module.css";

export default function LoginForm({ onLoginSuccess }: { onLoginSuccess?: () => void } = {}) {
  const router = useRouter();
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (mode === "signUp") {
      if (password !== confirmPassword) {
        setMessage("Passwords do not match.");
        return;
      }
      setIsSubmitting(true);
      try {
        const hasSession = await registerUser(fullName.trim(), email.trim(), password);
        if (hasSession) {
          markDashboardLoginComplete();
          if (onLoginSuccess) onLoginSuccess();
          else router.replace("/dashboard");
          return;
        }
        setMode("signIn");
        setFullName("");
        setPassword("");
        setConfirmPassword("");
        setMessage("Account created. Check your email to confirm your account, then sign in.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not create your account.");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    setIsSubmitting(true);
    try {
      await signInUser(email.trim(), password);
      markDashboardLoginComplete();
      if (onLoginSuccess) onLoginSuccess();
      else router.replace("/dashboard");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not sign in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function changeMode(nextMode: "signIn" | "signUp") {
    setMode(nextMode);
    setMessage("");
  }

  return (
    <main className={styles.page}>
      <header className={styles.brand} aria-label="Fleetora">
        <span className={styles.brandMark}>F</span>
        <span>Fleetora</span>
      </header>

      <section className={styles.formSide} aria-labelledby="login-title">
        <div className={styles.formContent}>
          <p className={styles.eyebrow}>{mode === "signIn" ? "WELCOME" : "GET STARTED"}</p>
          <h1 id="login-title">{mode === "signIn" ? "Sign in to Fleetora" : "Create your account"}</h1>
          <p className={styles.intro}>{mode === "signIn" ? "Manage your fleet from one secure workspace." : "Create a profile to get started with Fleetora."}</p>

          <div className={styles.authTabs} role="tablist" aria-label="Account access">
            <button type="button" role="tab" aria-selected={mode === "signIn"} className={mode === "signIn" ? styles.authTabActive : ""} onClick={() => changeMode("signIn")}>Sign in</button>
            <button type="button" role="tab" aria-selected={mode === "signUp"} className={mode === "signUp" ? styles.authTabActive : ""} onClick={() => changeMode("signUp")}>Sign up</button>
          </div>

          <form className={`${styles.form} ${mode === "signUp" ? styles.signUpForm : ""}`} onSubmit={handleSubmit}>
            {mode === "signUp" ? (
              <label className={styles.field}>
                <span>Full name</span>
                <input
                  autoComplete="name"
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  required
                  maxLength={100}
                />
              </label>
            ) : null}
            <label className={styles.field}>
              <span>Email address</span>
              <input
                autoComplete={mode === "signIn" ? "username" : "email"}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label className={styles.field}>
              <span>Password</span>
              <input
                autoComplete={mode === "signIn" ? "current-password" : "new-password"}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={mode === "signUp" ? 8 : undefined}
                required
              />
            </label>
            {mode === "signUp" ? (
              <label className={styles.field}>
                <span>Confirm password</span>
                <input
                  autoComplete="new-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength={8}
                  required
                />
              </label>
            ) : (
              <div className={styles.formOptions}>
                <button
                  className={styles.forgot}
                  onClick={() => setMessage("Please contact your administrator to reset your password.")}
                  type="button"
                >
                  Forgot password?
                </button>
              </div>
            )}
            <button className={styles.submit} type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Please wait…" : mode === "signIn" ? <>Sign in securely <ChevronRight size={17} /></> : <>Create account <UserPlus size={16} /></>}
            </button>
            <p aria-live="polite" className={styles.message}>{message}</p>
          </form>

          {mode === "signUp" ? (
            <p className={styles.demoNotice}>Your account and dashboard data are secured with Supabase.</p>
          ) : null}

          <p className={styles.security}>
            <CheckCircle2 size={16} />
            Protected with enterprise-grade security
          </p>
        </div>
      </section>

      <aside className={styles.promo} aria-label="Fleetora platform introduction">
        <div className={styles.promoContent}>
          <div className={styles.fleetVisual} aria-hidden="true">
            <div className={styles.visualGlow} />
            <div className={styles.mapCard}>
              <div className={styles.mapHeader}>
                <span className={styles.liveLabel}><i /> LIVE FLEET</span>
                <span className={styles.mapMenu}>•••</span>
              </div>
              <svg className={styles.routeMap} viewBox="0 0 420 190" fill="none">
                <path className={styles.mapRoad} d="M-12 42C55 58 79 15 142 30s79 57 143 43 75-42 150-21M-16 132c61-8 83-56 151-47s75 64 135 54 92-47 169-33M80-12c-4 49 25 65 21 112s-27 56-15 107m121-219c-4 42 21 75 13 112s-26 53-18 105m125-207c-17 42 9 77-1 116s-28 55-17 93" />
                <path className={styles.routeLine} d="M74 139c32-8 38-54 76-55s49 50 86 43 35-49 72-52" />
                <circle className={styles.routeStart} cx="74" cy="139" r="7" />
                <circle className={styles.routeEnd} cx="308" cy="75" r="8" />
                <circle className={styles.routeEndPulse} cx="308" cy="75" r="15" />
              </svg>
              <div className={styles.mapLocation}><MapPin size={11} /> Mogadishu, Somalia</div>
              <div className={styles.vehicleMarker}><CarFront size={17} /></div>
            </div>
            <div className={styles.fleetStat}>
              <span className={styles.fleetStatIcon}><CarFront size={15} /></span>
              <span><strong>124</strong><small>Vehicles on the move</small></span>
              <ArrowUpRight size={14} className={styles.statArrow} />
            </div>
            <div className={styles.bookingChip}>
              <span className={styles.bookingChipIcon}><CalendarDays size={14} /></span>
              <span><strong>Booking confirmed</strong><small>Toyota Land Cruiser · 09:30</small></span>
              <CheckCircle2 size={15} className={styles.bookingCheck} />
            </div>
          </div>
          <h2>Your entire rental operation.<br />One intelligent workspace.</h2>
          <p className={styles.promoDescription}>
            Bookings, vehicles, customers, payments and live tracking—beautifully connected.
          </p>
        </div>
      </aside>
    </main>
  );
}
