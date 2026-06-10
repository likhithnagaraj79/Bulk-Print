import { useState, useEffect } from "react";
import { useParams } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, ChevronLeft, Download, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { VisitorPreRegService, downloadBadgePdf, VisitorEndpoint } from "../api/services/visitorPreReg.service";
import { toast } from "sonner";

const COUNTRY_CODES = ['+91', '+1', '+44', '+971', '+65', '+61', '+81', '+49', '+33', '+86'];

const VISITOR_TYPES = ['Business Visitor', 'Student', 'Exhibitor'];

const PURPOSE_OPTIONS = [
    'Networking',
    'Purchasing',
    'Exploring Products',
    'Learning/Knowledge',
    'Investment',
];

const HOW_DID_YOU_KNOW_OPTIONS = [
    { value: 'email', label: 'Email' },
    { value: 'sms', label: 'SMS' },
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'newspaper', label: 'Newspaper' },
    { value: 'hoarding', label: 'Hoarding' },
    { value: 'website', label: 'Website' },
    { value: 'facebook', label: 'Facebook' },
    { value: 'exhibitors', label: 'Through Exhibitors' },
    { value: 'others', label: 'Others' },
];

interface FormData {
    name: string;
    email: string;
    phoneCountryCode: string;
    phoneNumber: string;
    companyName: string;
    designation: string;
    city: string;
    visitorType: string;
    purposeOfVisit: string[];
    howDidYouKnow: string;
    howDidYouKnowOther: string;
    consent: boolean;
}

const initialForm: FormData = {
    name: '',
    email: '',
    phoneCountryCode: '+91',
    phoneNumber: '',
    companyName: '',
    designation: '',
    city: '',
    visitorType: '',
    purposeOfVisit: [],
    howDidYouKnow: '',
    howDidYouKnowOther: '',
    consent: false,
};

export function VisitorPreRegPage() {
    const { slug } = useParams<{ slug?: string }>();
    const [endpoint, setEndpoint] = useState<VisitorEndpoint | null>(null);
    const [endpointError, setEndpointError] = useState('');
    const [loadingEndpoint, setLoadingEndpoint] = useState(false);

    const [step, setStep] = useState(1);
    const [form, setForm] = useState<FormData>(initialForm);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [successData, setSuccessData] = useState<{ badgePdf: string } | null>(null);

    useEffect(() => {
        if (slug) {
            setLoadingEndpoint(true);
            VisitorPreRegService.getEndpoint(slug)
                .then((res) => {
                    setEndpoint(res.data);
                })
                .catch(() => {
                    setEndpointError('Registration is not available at this link.');
                })
                .finally(() => setLoadingEndpoint(false));
        }
    }, [slug]);

    const set = (field: keyof FormData, value: any) => {
        setForm((f) => ({ ...f, [field]: value }));
        setErrors((e) => { const n = { ...e }; delete n[field]; return n; });
    };

    const togglePurpose = (val: string) => {
        set('purposeOfVisit', form.purposeOfVisit.includes(val)
            ? form.purposeOfVisit.filter((v) => v !== val)
            : [...form.purposeOfVisit, val]);
    };

    const validateStep = (s: number): boolean => {
        const errs: Record<string, string> = {};
        if (s === 1) {
            if (!form.name.trim()) errs.name = 'Name is required';
            if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email format';
            if (!/^\d{10}$/.test(form.phoneNumber)) errs.phoneNumber = 'Must be exactly 10 digits';
        }
        if (s === 3) {
            if (!form.visitorType) errs.visitorType = 'Please select visitor type';
            if (form.purposeOfVisit.length === 0) errs.purposeOfVisit = 'Select at least one purpose';
            if (!form.howDidYouKnow) errs.howDidYouKnow = 'Please select an option';
            if (form.howDidYouKnow === 'others' && !form.howDidYouKnowOther.trim()) errs.howDidYouKnowOther = 'Please specify';
            if (!form.consent) errs.consent = 'You must agree to proceed';
        }
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const nextStep = () => {
        if (validateStep(step)) setStep((s) => s + 1);
    };

    const handleSubmit = async () => {
        if (!validateStep(3)) return;
        if (!endpoint) return;

        setSubmitting(true);
        try {
            const res = await VisitorPreRegService.register({
                endpointId: endpoint.id,
                name: form.name,
                email: form.email || undefined,
                phoneCountryCode: form.phoneCountryCode,
                phoneNumber: form.phoneNumber,
                companyName: form.companyName || undefined,
                designation: form.designation || undefined,
                city: form.city || undefined,
                howDidYouKnow: form.howDidYouKnow,
                howDidYouKnowOther: form.howDidYouKnowOther || undefined,
                visitorType: form.visitorType,
                purposeOfVisit: form.purposeOfVisit,
                consent: form.consent,
            });

            if (res.success && res.badgePdf) {
                downloadBadgePdf(res.badgePdf, 'visitor-badge.pdf');
                setSuccessData({ badgePdf: res.badgePdf });
            }
        } catch (err: any) {
            if (err.status === 409) {
                toast.error('This phone number is already registered for this event.');
            } else {
                toast.error(err.message || 'Registration failed. Please try again.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    // --- Success screen ---
    if (successData) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center"
                >
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Complete!</h2>
                    <p className="text-gray-600 mb-6">
                        Your badge is downloading. If it didn't start, click below.
                    </p>
                    <Button
                        onClick={() => downloadBadgePdf(successData.badgePdf, 'visitor-badge.pdf')}
                        className="w-full bg-nexus-brand hover:bg-nexus-brand/90"
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Download Badge Again
                    </Button>
                    <p className="text-sm text-gray-500 mt-4">
                        You can also retrieve your badge anytime at <strong>/fetch-badge</strong> using your phone number.
                    </p>
                </motion.div>
            </div>
        );
    }

    // --- Loading / Error state ---
    if (!slug) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
                    <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-900">No Registration Link</h2>
                    <p className="text-gray-600 mt-2">Please use the specific registration URL provided for your event.</p>
                </div>
            </div>
        );
    }

    if (loadingEndpoint) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-nexus-brand" />
            </div>
        );
    }

    if (endpointError || !endpoint) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-900">Registration Not Available</h2>
                    <p className="text-gray-600 mt-2">{endpointError || 'This registration link is not active.'}</p>
                </div>
            </div>
        );
    }

    const expoName = endpoint.expoName ?? endpoint.expo_name ?? '';

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center py-8 px-4">
            {/* Header */}
            <div className="w-full max-w-lg mb-6 text-center">
                <h1 className="text-2xl font-bold text-gray-900">{expoName}</h1>
                <p className="text-gray-500 mt-1">Visitor Pre-Registration</p>
            </div>

            {/* Step Progress */}
            <div className="flex items-center gap-2 mb-8">
                {[1, 2, 3].map((s) => (
                    <div key={s} className="flex items-center gap-2">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                            s < step ? 'bg-green-500 text-white' :
                            s === step ? 'bg-nexus-brand text-white' :
                            'bg-gray-200 text-gray-500'
                        }`}>{s < step ? '✓' : s}</div>
                        {s < 3 && <div className={`h-0.5 w-8 ${s < step ? 'bg-green-500' : 'bg-gray-200'}`} />}
                    </div>
                ))}
            </div>

            <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-lg"
            >
                {/* Step 1: Personal Info */}
                {step === 1 && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                            <Input
                                value={form.name}
                                onChange={(e) => set('name', e.target.value)}
                                placeholder="Enter your full name"
                            />
                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <Input
                                type="email"
                                value={form.email}
                                onChange={(e) => set('email', e.target.value)}
                                placeholder="your@email.com"
                            />
                            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                            <div className="flex gap-2">
                                <select
                                    value={form.phoneCountryCode}
                                    onChange={(e) => set('phoneCountryCode', e.target.value)}
                                    className="border border-gray-300 rounded-md px-3 py-2 text-sm w-24 bg-white"
                                >
                                    {COUNTRY_CODES.map((c) => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                                <Input
                                    value={form.phoneNumber}
                                    onChange={(e) => set('phoneNumber', e.target.value.replace(/\D/g, '').slice(0, 10))}
                                    placeholder="10-digit number"
                                    className="flex-1"
                                />
                            </div>
                            {errors.phoneNumber && <p className="text-red-500 text-xs mt-1">{errors.phoneNumber}</p>}
                        </div>
                    </div>
                )}

                {/* Step 2: Professional Info */}
                {step === 2 && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-gray-900">Professional Information</h2>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                            <Input
                                value={form.companyName}
                                onChange={(e) => set('companyName', e.target.value)}
                                placeholder="Your company"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                            <Input
                                value={form.designation}
                                onChange={(e) => set('designation', e.target.value)}
                                placeholder="Your job title"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                            <Input
                                value={form.city}
                                onChange={(e) => set('city', e.target.value)}
                                placeholder="Your city"
                            />
                        </div>
                    </div>
                )}

                {/* Step 3: Visit Details */}
                {step === 3 && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-gray-900">Visit Details</h2>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Visitor Type *</label>
                            <select
                                value={form.visitorType}
                                onChange={(e) => set('visitorType', e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
                            >
                                <option value="">Select type</option>
                                {VISITOR_TYPES.map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                            {errors.visitorType && <p className="text-red-500 text-xs mt-1">{errors.visitorType}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Purpose of Visit *</label>
                            <div className="space-y-2">
                                {PURPOSE_OPTIONS.map((p) => (
                                    <label key={p} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={form.purposeOfVisit.includes(p)}
                                            onChange={() => togglePurpose(p)}
                                            className="rounded border-gray-300"
                                        />
                                        <span className="text-sm text-gray-700">{p}</span>
                                    </label>
                                ))}
                            </div>
                            {errors.purposeOfVisit && <p className="text-red-500 text-xs mt-1">{errors.purposeOfVisit}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">How did you know about the Show? *</label>
                            <select
                                value={form.howDidYouKnow}
                                onChange={(e) => set('howDidYouKnow', e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
                            >
                                <option value="">Select an option</option>
                                {HOW_DID_YOU_KNOW_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                            {errors.howDidYouKnow && <p className="text-red-500 text-xs mt-1">{errors.howDidYouKnow}</p>}
                        </div>

                        {form.howDidYouKnow === 'others' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Please specify *</label>
                                <Input
                                    value={form.howDidYouKnowOther}
                                    onChange={(e) => set('howDidYouKnowOther', e.target.value)}
                                    placeholder="How did you hear about us?"
                                />
                                {errors.howDidYouKnowOther && <p className="text-red-500 text-xs mt-1">{errors.howDidYouKnowOther}</p>}
                            </div>
                        )}

                        <div>
                            <label className="flex items-start gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={form.consent}
                                    onChange={(e) => set('consent', e.target.checked)}
                                    className="mt-0.5 rounded border-gray-300"
                                />
                                <span className="text-sm text-gray-700">
                                    I agree to receive communication via Email / SMS / WhatsApp from the organizers.
                                </span>
                            </label>
                            {errors.consent && <p className="text-red-500 text-xs mt-1">{errors.consent}</p>}
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <div className="flex justify-between mt-6 pt-4 border-t border-gray-100">
                    {step > 1 ? (
                        <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
                            <ChevronLeft className="h-4 w-4 mr-1" /> Back
                        </Button>
                    ) : <div />}

                    {step < 3 ? (
                        <Button onClick={nextStep} className="bg-nexus-brand hover:bg-nexus-brand/90">
                            Next <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    ) : (
                        <Button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="bg-nexus-brand hover:bg-nexus-brand/90"
                        >
                            {submitting ? (
                                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Registering...</>
                            ) : (
                                <><Download className="h-4 w-4 mr-2" /> Register & Download Badge</>
                            )}
                        </Button>
                    )}
                </div>
            </motion.div>

            <p className="text-xs text-gray-400 mt-6">
                Already registered? <a href="/fetch-badge" className="text-nexus-brand hover:underline">Retrieve your badge</a>
            </p>
        </div>
    );
}
