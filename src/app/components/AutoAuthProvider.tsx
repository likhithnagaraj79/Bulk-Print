import { useEffect, useState } from "react";
import { authenticator } from "@otplib/preset-browser";
import { AuthService } from "../api/services/auth.service";
import { Loader2 } from "lucide-react";

const AUTO_USER = import.meta.env.VITE_AUTO_USER;
const AUTO_PASS = import.meta.env.VITE_AUTO_PASS;
const AUTO_TOTP = import.meta.env.VITE_AUTO_TOTP_SECRET;
const AUTO_TYPE = import.meta.env.VITE_AUTO_ACCOUNT_TYPE ?? "admin";

export function AutoAuthProvider({ children }: { children: React.ReactNode }) {
    const [ready, setReady] = useState(!!localStorage.getItem("nexus_token"));
    const [error, setError] = useState("");

    useEffect(() => {
        if (ready) return;
        if (!AUTO_USER || !AUTO_PASS || !AUTO_TOTP) {
            setReady(true);
            return;
        }
        autoLogin();
    }, []);

    async function autoLogin() {
        try {
            const res = await AuthService.login({
                username: AUTO_USER,
                password: AUTO_PASS,
                accountType: AUTO_TYPE,
            });

            if (res.otpRequired && res.pendingToken) {
                const code = authenticator.generate(AUTO_TOTP);
                await AuthService.verifyTotp({ pendingToken: res.pendingToken, totpCode: code });
            }

            localStorage.setItem("nexus_account_type", AUTO_TYPE);
            setReady(true);
        } catch (err: any) {
            setError(err.message || "Auto-login failed. Check VITE_AUTO_USER / VITE_AUTO_PASS / VITE_AUTO_TOTP_SECRET.");
        }
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50">
                <p className="text-red-600 font-medium text-center max-w-md px-4">{error}</p>
                <button
                    onClick={() => { setError(""); autoLogin(); }}
                    className="px-4 py-2 bg-nexus-brand text-white rounded-lg text-sm"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (!ready) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-nexus-brand" />
            </div>
        );
    }

    return <>{children}</>;
}
