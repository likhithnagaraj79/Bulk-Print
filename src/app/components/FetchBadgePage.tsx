import { useState } from "react";
import { motion } from "motion/react";
import { Download, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { VisitorPreRegService, downloadBadgePdf } from "../api/services/visitorPreReg.service";

const COUNTRY_CODES = ['+91', '+1', '+44', '+971', '+65', '+61', '+81', '+49', '+33', '+86'];

export function FetchBadgePage() {
    const [phoneCountryCode, setPhoneCountryCode] = useState('+91');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState<{ name: string; badgePdf: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess(null);

        if (!/^\d{10}$/.test(phoneNumber)) {
            setError('Please enter a valid 10-digit phone number');
            return;
        }

        setLoading(true);
        try {
            const res = await VisitorPreRegService.fetchBadge({ phoneCountryCode, phoneNumber });
            if (res.success && res.badgePdf) {
                downloadBadgePdf(res.badgePdf, 'visitor-badge.pdf');
                setSuccess({ name: res.name ?? 'Visitor', badgePdf: res.badgePdf });
            }
        } catch (err: any) {
            if (err.status === 404) {
                setError('No registration found with this phone number.');
            } else {
                setError(err.message || 'Something went wrong. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md"
            >
                <div className="text-center mb-6">
                    <Download className="h-10 w-10 text-nexus-brand mx-auto mb-3" />
                    <h1 className="text-2xl font-bold text-gray-900">Retrieve Your Badge</h1>
                    <p className="text-gray-500 mt-1 text-sm">Enter your registered phone number to download your badge</p>
                </div>

                {success ? (
                    <div className="text-center">
                        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                        <h2 className="text-lg font-semibold text-gray-900">Downloaded!</h2>
                        <p className="text-gray-600 mt-1">Hello, <strong>{success.name}</strong>! Your badge is downloading.</p>
                        <Button
                            onClick={() => downloadBadgePdf(success.badgePdf, 'visitor-badge.pdf')}
                            className="mt-4 w-full bg-nexus-brand hover:bg-nexus-brand/90"
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Download Again
                        </Button>
                        <button
                            onClick={() => { setSuccess(null); setPhoneNumber(''); }}
                            className="mt-3 text-sm text-gray-500 hover:underline"
                        >
                            Try another number
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                            <div className="flex gap-2">
                                <select
                                    value={phoneCountryCode}
                                    onChange={(e) => setPhoneCountryCode(e.target.value)}
                                    className="border border-gray-300 rounded-md px-3 py-2 text-sm w-24 bg-white"
                                >
                                    {COUNTRY_CODES.map((c) => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                                <Input
                                    value={phoneNumber}
                                    onChange={(e) => {
                                        setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10));
                                        setError('');
                                    }}
                                    placeholder="10-digit number"
                                    className="flex-1"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-lg p-3 text-sm">
                                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-nexus-brand hover:bg-nexus-brand/90"
                        >
                            {loading ? (
                                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Searching...</>
                            ) : (
                                <><Download className="h-4 w-4 mr-2" /> Get My Badge</>
                            )}
                        </Button>
                    </form>
                )}
            </motion.div>

            <p className="text-xs text-gray-400 mt-6">
                Not registered yet? <a href="/visitor-reg" className="text-nexus-brand hover:underline">Register here</a>
            </p>
        </div>
    );
}
