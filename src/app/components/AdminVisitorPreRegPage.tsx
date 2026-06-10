import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Search, Download, Loader2, Users, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { TopNav } from "./dashboard/TopNav";
import { AdminSidebar } from "./dashboard/AdminSidebar";
import { VisitorPreRegService, VisitorEndpoint } from "../api/services/visitorPreReg.service";
import { toast } from "sonner";

interface VisitorRecord {
    id: string;
    name: string;
    email: string;
    phone_country_code: string;
    phone_number: string;
    company_name: string;
    designation: string;
    city: string;
    visitor_type: string;
    purpose_of_visit: string[];
    how_did_you_know: string;
    created_at: string;
}

export function AdminVisitorPreRegPage() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [endpoints, setEndpoints] = useState<VisitorEndpoint[]>([]);
    const [activeEndpoint, setActiveEndpoint] = useState<string>('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [records, setRecords] = useState<VisitorRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const LIMIT = 20;

    useEffect(() => {
        VisitorPreRegService.listEndpoints()
            .then((res) => {
                setEndpoints(res.data);
                if (res.data.length > 0) {
                    setActiveEndpoint(res.data[0].id);
                }
            })
            .catch(() => toast.error('Failed to load endpoints'));
    }, []);

    const fetchRecords = useCallback(() => {
        if (!activeEndpoint) return;
        setLoading(true);
        VisitorPreRegService.list({ endpoint_id: activeEndpoint, page, limit: LIMIT, search: search || undefined })
            .then((res) => {
                setRecords(res.data);
                setTotal(res.total);
            })
            .catch(() => toast.error('Failed to load registrations'))
            .finally(() => setLoading(false));
    }, [activeEndpoint, page, search]);

    useEffect(() => {
        setPage(1);
    }, [activeEndpoint, search]);

    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);

    const handleExport = async () => {
        if (!activeEndpoint) return;
        setExporting(true);
        try {
            await VisitorPreRegService.exportCsv(activeEndpoint);
            toast.success('CSV exported successfully');
        } catch {
            toast.error('Export failed');
        } finally {
            setExporting(false);
        }
    };

    const totalPages = Math.ceil(total / LIMIT);

    const activeEndpointData = endpoints.find((e) => e.id === activeEndpoint);
    const expoName = activeEndpointData?.expoName ?? activeEndpointData?.expo_name ?? '';

    return (
        <div className="min-h-screen bg-nexus-bg">
            <TopNav />
            <AdminSidebar collapsed={sidebarCollapsed} onToggle={setSidebarCollapsed} />

            <main className={`transition-all duration-300 pt-16 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-60'}`}>
                <div className="p-6">
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-nexus-text-primary">Visitor Pre-Registrations</h1>
                        <p className="text-nexus-text-secondary mt-1">View and manage visitor registrations per expo</p>
                    </div>

                    {/* Endpoint Tabs */}
                    {endpoints.length === 0 ? (
                        <div className="bg-nexus-surface rounded-xl border border-nexus-border p-8 text-center text-nexus-text-secondary">
                            No endpoints configured. <a href="/admin/visitor-endpoints" className="text-nexus-brand hover:underline">Create one</a>.
                        </div>
                    ) : (
                        <>
                            <div className="flex gap-2 mb-4 flex-wrap">
                                {endpoints.map((ep) => {
                                    const name = ep.expoName ?? ep.expo_name ?? ep.slug;
                                    return (
                                        <button
                                            key={ep.id}
                                            onClick={() => setActiveEndpoint(ep.id)}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                                                activeEndpoint === ep.id
                                                    ? 'bg-nexus-brand text-white border-nexus-brand'
                                                    : 'bg-nexus-surface text-nexus-text-secondary border-nexus-border hover:bg-nexus-surface-hover'
                                            }`}
                                        >
                                            {name}
                                            <span className="ml-2 text-xs opacity-70">({ep.registration_count ?? 0})</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                                <div className="bg-nexus-surface rounded-xl border border-nexus-border p-4 flex items-center gap-3">
                                    <Users className="h-8 w-8 text-nexus-brand" />
                                    <div>
                                        <p className="text-2xl font-bold text-nexus-text-primary">{total}</p>
                                        <p className="text-sm text-nexus-text-secondary">Total Registrations</p>
                                    </div>
                                </div>
                            </div>

                            {/* Toolbar */}
                            <div className="flex flex-col sm:flex-row gap-3 mb-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Search by name, email or phone..."
                                        className="pl-9"
                                    />
                                </div>
                                <Button
                                    variant="outline"
                                    onClick={fetchRecords}
                                    className="flex items-center gap-2"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                    Refresh
                                </Button>
                                <Button
                                    onClick={handleExport}
                                    disabled={exporting}
                                    className="bg-nexus-brand hover:bg-nexus-brand/90 flex items-center gap-2"
                                >
                                    {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                    Export CSV
                                </Button>
                            </div>

                            {/* Table */}
                            <div className="bg-nexus-surface rounded-xl border border-nexus-border overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-nexus-bg border-b border-nexus-border">
                                            <tr>
                                                {['Name', 'Email', 'Phone', 'Company', 'Visitor Type', 'Purpose', 'Registered At'].map((h) => (
                                                    <th key={h} className="text-left px-4 py-3 font-medium text-nexus-text-secondary whitespace-nowrap">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loading ? (
                                                <tr>
                                                    <td colSpan={7} className="text-center py-12">
                                                        <Loader2 className="h-6 w-6 animate-spin text-nexus-brand mx-auto" />
                                                    </td>
                                                </tr>
                                            ) : records.length === 0 ? (
                                                <tr>
                                                    <td colSpan={7} className="text-center py-12 text-nexus-text-secondary">
                                                        No registrations found
                                                    </td>
                                                </tr>
                                            ) : records.map((rec) => (
                                                <motion.tr
                                                    key={rec.id}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    className="border-b border-nexus-border hover:bg-nexus-surface-hover transition-colors"
                                                >
                                                    <td className="px-4 py-3 font-medium text-nexus-text-primary">{rec.name}</td>
                                                    <td className="px-4 py-3 text-nexus-text-secondary">{rec.email || '—'}</td>
                                                    <td className="px-4 py-3 text-nexus-text-secondary">{rec.phone_country_code} {rec.phone_number}</td>
                                                    <td className="px-4 py-3 text-nexus-text-secondary">{rec.company_name || '—'}</td>
                                                    <td className="px-4 py-3">
                                                        <span className="px-2 py-0.5 rounded-full text-xs bg-nexus-brand-light text-nexus-brand font-medium">
                                                            {rec.visitor_type}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-nexus-text-secondary">
                                                        {Array.isArray(rec.purpose_of_visit) ? rec.purpose_of_visit.join(', ') : '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-nexus-text-secondary whitespace-nowrap">
                                                        {new Date(rec.created_at).toLocaleDateString()}
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between px-4 py-3 border-t border-nexus-border">
                                        <p className="text-sm text-nexus-text-secondary">
                                            Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
                                        </p>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={page === 1}
                                                onClick={() => setPage((p) => p - 1)}
                                            >
                                                Previous
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={page >= totalPages}
                                                onClick={() => setPage((p) => p + 1)}
                                            >
                                                Next
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
