import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Link2, Copy, ToggleLeft, ToggleRight, Edit2, Check, X, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { TopNav } from "./dashboard/TopNav";
import { AdminSidebar } from "./dashboard/AdminSidebar";
import { VisitorPreRegService, VisitorEndpoint } from "../api/services/visitorPreReg.service";
import { toast } from "sonner";

const BADGE_IMAGES = [
    { value: 'automation-expo.jpg', label: 'Automation & Warehouse Expo' },
    { value: 'cable-wire-expo.jpg', label: 'Cable & Wire Expo' },
    { value: 'it-cyber-expo.jpg', label: 'IT & Cyber Security Expo' },
    { value: 'smart-home-expo.jpg', label: 'Smart Home & Office Expo' },
];

function slugify(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

interface CreateForm {
    expoName: string;
    slug: string;
    badgeImage: string;
    status: string;
}

interface EditState {
    id: string;
    expoName: string;
    badgeImage: string;
}

export function AdminEndpointManagerPage() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [endpoints, setEndpoints] = useState<VisitorEndpoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [creating, setCreating] = useState(false);
    const [editState, setEditState] = useState<EditState | null>(null);
    const [saving, setSaving] = useState(false);

    const [createForm, setCreateForm] = useState<CreateForm>({
        expoName: '',
        slug: '',
        badgeImage: 'automation-expo.jpg',
        status: 'active',
    });
    const [createErrors, setCreateErrors] = useState<Record<string, string>>({});

    const fetchEndpoints = () => {
        setLoading(true);
        VisitorPreRegService.listEndpoints()
            .then((res) => setEndpoints(res.data))
            .catch(() => toast.error('Failed to load endpoints'))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchEndpoints(); }, []);

    const setCreateField = (field: keyof CreateForm, value: string) => {
        setCreateForm((f) => {
            const updated = { ...f, [field]: value };
            if (field === 'expoName') updated.slug = slugify(value);
            return updated;
        });
        setCreateErrors((e) => { const n = { ...e }; delete n[field]; return n; });
    };

    const handleCreate = async () => {
        const errs: Record<string, string> = {};
        if (!createForm.expoName.trim()) errs.expoName = 'Expo name is required';
        if (!createForm.slug) errs.slug = 'Slug is required';
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(createForm.slug)) errs.slug = 'Lowercase alphanumeric with hyphens only';
        setCreateErrors(errs);
        if (Object.keys(errs).length > 0) return;

        setCreating(true);
        try {
            const res = await VisitorPreRegService.createEndpoint(createForm);
            if (res.success) {
                toast.success('Endpoint created successfully');
                setShowCreateForm(false);
                setCreateForm({ expoName: '', slug: '', badgeImage: 'automation-expo.jpg', status: 'active' });
                fetchEndpoints();
            }
        } catch (err: any) {
            if (err.status === 409) {
                setCreateErrors({ slug: 'This slug is already taken' });
            } else {
                toast.error(err.message || 'Failed to create endpoint');
            }
        } finally {
            setCreating(false);
        }
    };

    const handleToggleStatus = async (ep: VisitorEndpoint) => {
        const newStatus = ep.status === 'active' ? 'inactive' : 'active';
        try {
            await VisitorPreRegService.updateEndpoint(ep.id, { status: newStatus });
            setEndpoints((prev) => prev.map((e) => e.id === ep.id ? { ...e, status: newStatus } : e));
            toast.success(`Endpoint ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
        } catch {
            toast.error('Failed to update status');
        }
    };

    const handleSaveEdit = async () => {
        if (!editState) return;
        if (!editState.expoName.trim()) {
            toast.error('Expo name cannot be empty');
            return;
        }
        setSaving(true);
        try {
            await VisitorPreRegService.updateEndpoint(editState.id, {
                expoName: editState.expoName,
                badgeImage: editState.badgeImage,
            });
            setEndpoints((prev) => prev.map((e) => e.id === editState.id
                ? { ...e, expo_name: editState.expoName, expoName: editState.expoName, badge_image: editState.badgeImage, badgeImage: editState.badgeImage }
                : e));
            toast.success('Endpoint updated');
            setEditState(null);
        } catch {
            toast.error('Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    const copyLink = (slug: string) => {
        const url = `${window.location.origin}/visitor-reg/${slug}`;
        navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard');
    };

    const registrationUrl = (slug: string) => `${window.location.origin}/visitor-reg/${slug}`;

    return (
        <div className="min-h-screen bg-nexus-bg">
            <TopNav />
            <AdminSidebar collapsed={sidebarCollapsed} onToggle={setSidebarCollapsed} />

            <main className={`transition-all duration-300 pt-16 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-60'}`}>
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-nexus-text-primary">Manage Endpoints</h1>
                            <p className="text-nexus-text-secondary mt-1">Create and manage visitor registration endpoints</p>
                        </div>
                        <Button
                            onClick={() => setShowCreateForm(!showCreateForm)}
                            className="bg-nexus-brand hover:bg-nexus-brand/90"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            New Endpoint
                        </Button>
                    </div>

                    {/* Create Form */}
                    <AnimatePresence>
                        {showCreateForm && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="bg-nexus-surface rounded-xl border border-nexus-border p-6 mb-6"
                            >
                                <h2 className="text-lg font-semibold text-nexus-text-primary mb-4">Create New Endpoint</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-nexus-text-secondary mb-1">Expo Name *</label>
                                        <Input
                                            value={createForm.expoName}
                                            onChange={(e) => setCreateField('expoName', e.target.value)}
                                            placeholder="e.g. Automation Expo 2026"
                                        />
                                        {createErrors.expoName && <p className="text-red-500 text-xs mt-1">{createErrors.expoName}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-nexus-text-secondary mb-1">Slug *</label>
                                        <Input
                                            value={createForm.slug}
                                            onChange={(e) => setCreateField('slug', e.target.value)}
                                            placeholder="e.g. automation-expo-2026"
                                        />
                                        {createErrors.slug && <p className="text-red-500 text-xs mt-1">{createErrors.slug}</p>}
                                        {createForm.slug && (
                                            <p className="text-xs text-nexus-text-secondary mt-1">
                                                URL: /visitor-reg/{createForm.slug}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-nexus-text-secondary mb-1">Badge Template</label>
                                        <select
                                            value={createForm.badgeImage}
                                            onChange={(e) => setCreateField('badgeImage', e.target.value)}
                                            className="w-full border border-nexus-border rounded-md px-3 py-2 text-sm bg-nexus-surface text-nexus-text-primary"
                                        >
                                            {BADGE_IMAGES.map((b) => (
                                                <option key={b.value} value={b.value}>{b.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-nexus-text-secondary mb-1">Status</label>
                                        <select
                                            value={createForm.status}
                                            onChange={(e) => setCreateField('status', e.target.value)}
                                            className="w-full border border-nexus-border rounded-md px-3 py-2 text-sm bg-nexus-surface text-nexus-text-primary"
                                        >
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex gap-3 mt-4">
                                    <Button onClick={handleCreate} disabled={creating} className="bg-nexus-brand hover:bg-nexus-brand/90">
                                        {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                        Create Endpoint
                                    </Button>
                                    <Button variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Endpoints List */}
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-nexus-brand" />
                        </div>
                    ) : endpoints.length === 0 ? (
                        <div className="bg-nexus-surface rounded-xl border border-nexus-border p-12 text-center text-nexus-text-secondary">
                            No endpoints yet. Create your first one above.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {endpoints.map((ep) => {
                                const expoName = ep.expoName ?? ep.expo_name ?? ep.slug;
                                const badgeImage = ep.badgeImage ?? ep.badge_image ?? '';
                                const isEditing = editState?.id === ep.id;
                                const badgeLabel = BADGE_IMAGES.find((b) => b.value === badgeImage)?.label ?? badgeImage;

                                return (
                                    <motion.div
                                        key={ep.id}
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-nexus-surface rounded-xl border border-nexus-border p-4"
                                    >
                                        {isEditing ? (
                                            <div className="space-y-3">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-xs font-medium text-nexus-text-secondary mb-1">Expo Name</label>
                                                        <Input
                                                            value={editState.expoName}
                                                            onChange={(e) => setEditState((s) => s ? { ...s, expoName: e.target.value } : s)}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-nexus-text-secondary mb-1">Badge Template</label>
                                                        <select
                                                            value={editState.badgeImage}
                                                            onChange={(e) => setEditState((s) => s ? { ...s, badgeImage: e.target.value } : s)}
                                                            className="w-full border border-nexus-border rounded-md px-3 py-2 text-sm bg-nexus-surface text-nexus-text-primary"
                                                        >
                                                            {BADGE_IMAGES.map((b) => (
                                                                <option key={b.value} value={b.value}>{b.label}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button size="sm" onClick={handleSaveEdit} disabled={saving} className="bg-green-600 hover:bg-green-700">
                                                        {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                                                        Save
                                                    </Button>
                                                    <Button size="sm" variant="outline" onClick={() => setEditState(null)}>
                                                        <X className="h-3 w-3 mr-1" /> Cancel
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-semibold text-nexus-text-primary truncate">{expoName}</h3>
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                            ep.status === 'active'
                                                                ? 'bg-green-100 text-green-700'
                                                                : 'bg-gray-100 text-gray-500'
                                                        }`}>{ep.status}</span>
                                                    </div>
                                                    <p className="text-sm text-nexus-text-secondary mt-0.5">
                                                        <span className="font-mono text-xs bg-nexus-bg px-1 rounded">/visitor-reg/{ep.slug}</span>
                                                        {' · '}{badgeLabel}
                                                        {' · '}{ep.registration_count ?? 0} registrations
                                                    </p>
                                                    <p className="text-xs text-nexus-text-secondary mt-1 truncate">
                                                        <Link2 className="h-3 w-3 inline mr-1" />
                                                        {registrationUrl(ep.slug)}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <button
                                                        onClick={() => copyLink(ep.slug)}
                                                        className="p-2 rounded-lg hover:bg-nexus-surface-hover transition-colors text-nexus-text-secondary"
                                                        title="Copy link"
                                                    >
                                                        <Copy className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleStatus(ep)}
                                                        className={`p-2 rounded-lg hover:bg-nexus-surface-hover transition-colors ${
                                                            ep.status === 'active' ? 'text-green-600' : 'text-gray-400'
                                                        }`}
                                                        title={ep.status === 'active' ? 'Deactivate' : 'Activate'}
                                                    >
                                                        {ep.status === 'active'
                                                            ? <ToggleRight className="h-5 w-5" />
                                                            : <ToggleLeft className="h-5 w-5" />}
                                                    </button>
                                                    <button
                                                        onClick={() => setEditState({ id: ep.id, expoName, badgeImage })}
                                                        className="p-2 rounded-lg hover:bg-nexus-surface-hover transition-colors text-nexus-text-secondary"
                                                        title="Edit"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
