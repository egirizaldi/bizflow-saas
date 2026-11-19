'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getStoredUser,
  clearAuthSession,
  AuthUser,
  AuthOrganization,
  switchOrganization,
} from '@/lib/auth';
import { apiRequest } from '@/lib/api';
import { Can } from '@/components/can';
import {
  Building2,
  Users,
  ShieldCheck,
  CreditCard,
  LogOut,
  PlusCircle,
  Activity,
  Layers,
  ChevronDown,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FolderKanban,
  Trash2,
  KeyRound,
  Mail,
  UserPlus,
  Lock,
  Copy,
  Clock,
  BarChart3,
  TrendingUp,
  PieChart as PieIcon,
  Check,
  Sparkles,
  Zap,
  Crown,
  ArrowRight,
  XCircle,
  AlertTriangle,
  Receipt,
  FileText,
  ExternalLink,
  QrCode,
  Wallet,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import Cookies from 'js-cookie';

const ROLE_COLORS: Record<string, string> = {
  OWNER: '#4f46e5', // Indigo
  ADMIN: '#0284c7', // Sky
  MANAGER: '#10b981', // Emerald
  STAFF: '#94a3b8', // Slate
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [organizations, setOrganizations] = useState<AuthOrganization[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'projects' | 'team' | 'analytics' | 'subscription'>('projects');
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);

  // Projects State
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [isSubmittingProject, setIsSubmittingProject] = useState(false);
  const [projectError, setProjectError] = useState('');

  // Team Management State
  const [members, setMembers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MANAGER' | 'STAFF'>('STAFF');
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  // Analytics Metrics State
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);

  // Subscription State
  const [plans, setPlans] = useState<any[]>([]);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(false);
  const [isSwitchingPlan, setIsSwitchingPlan] = useState<string | null>(null);
  const [subscriptionMsg, setSubscriptionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [guardTestResult, setGuardTestResult] = useState<{
    feature: string;
    status: 'idle' | 'loading' | 'success' | 'forbidden';
    message: string;
  }>({ feature: '', status: 'idle', message: '' });

  // Billing & Midtrans State
  const [billingHistory, setBillingHistory] = useState<any[]>([]);
  const [isLoadingBilling, setIsLoadingBilling] = useState(false);
  const [checkoutModalData, setCheckoutModalData] = useState<{
    orderId: string;
    snapToken: string;
    amount: number;
    planName: string;
    isMock: boolean;
    redirectUrl?: string;
  } | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  // Organization Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [isSubmittingOrg, setIsSubmittingOrg] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // RBAC Matrix toggle
  const [showRbacModal, setShowRbacModal] = useState(false);

  const fetchOrganizations = async () => {
    try {
      setIsLoadingOrgs(true);
      const res = await apiRequest('/organizations/my');
      if (res?.organizations) {
        setOrganizations(res.organizations);

        const savedOrgId = Cookies.get('currentOrgId');
        const validOrg = res.organizations.find((o: any) => o.id === savedOrgId);

        if (validOrg) {
          setActiveOrgId(validOrg.id);
          fetchProjects(validOrg.id);
          fetchTeam(validOrg.id);
          fetchMetrics(validOrg.id);
          fetchSubscription(validOrg.id);
          fetchBillingHistory(validOrg.id);
        } else if (res.organizations.length > 0) {
          const firstOrgId = res.organizations[0].id;
          setActiveOrgId(firstOrgId);
          Cookies.set('currentOrgId', firstOrgId, { expires: 7 });
          fetchProjects(firstOrgId);
          fetchTeam(firstOrgId);
          fetchMetrics(firstOrgId);
          fetchSubscription(firstOrgId);
          fetchBillingHistory(firstOrgId);
        }
      }
    } catch {
      const savedUser = getStoredUser();
      if (savedUser) setUser(savedUser);
    } finally {
      setIsLoadingOrgs(false);
    }
  };

  const fetchProjects = async (orgId?: string) => {
    const targetOrg = orgId || activeOrgId || Cookies.get('currentOrgId');
    if (!targetOrg) return;

    try {
      setIsLoadingProjects(true);
      const res = await apiRequest('/projects', {
        headers: { 'x-organization-id': targetOrg },
      });
      if (res?.projects) {
        setProjects(res.projects);
      }
    } catch {
      setProjects([]);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  const fetchTeam = async (orgId?: string) => {
    const targetOrg = orgId || activeOrgId || Cookies.get('currentOrgId');
    if (!targetOrg) return;

    try {
      setIsLoadingTeam(true);
      const [membersRes, invitesRes] = await Promise.all([
        apiRequest(`/organizations/${targetOrg}/members`, {
          headers: { 'x-organization-id': targetOrg },
        }).catch(() => ({ members: [] })),
        apiRequest(`/organizations/${targetOrg}/invitations`, {
          headers: { 'x-organization-id': targetOrg },
        }).catch(() => ({ invitations: [] })),
      ]);

      if (membersRes?.members) setMembers(membersRes.members);
      if (invitesRes?.invitations) setInvitations(invitesRes.invitations);
    } catch {
      setMembers([]);
    } finally {
      setIsLoadingTeam(false);
    }
  };

  const fetchMetrics = async (orgId?: string) => {
    const targetOrg = orgId || activeOrgId || Cookies.get('currentOrgId');
    if (!targetOrg) return;

    try {
      setIsLoadingMetrics(true);
      const res = await apiRequest('/dashboard/metrics', {
        headers: { 'x-organization-id': targetOrg },
      });
      if (res?.metrics) {
        setMetrics(res.metrics);
      }
    } catch {
      setMetrics(null);
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  const fetchSubscription = async (orgId?: string) => {
    const targetOrg = orgId || activeOrgId || Cookies.get('currentOrgId');
    if (!targetOrg) return;

    try {
      setIsLoadingSubscription(true);
      const [plansRes, currentRes] = await Promise.all([
        apiRequest('/subscriptions/plans').catch(() => []),
        apiRequest('/subscriptions/current', {
          headers: { 'x-organization-id': targetOrg },
        }).catch(() => null),
      ]);

      if (plansRes) setPlans(plansRes);
      if (currentRes) setSubscriptionData(currentRes);
    } catch {
      setSubscriptionData(null);
    } finally {
      setIsLoadingSubscription(false);
    }
  };

  const handleSwitchPlan = async (planName: string) => {
    if (!activeOrgId) return;
    setIsSwitchingPlan(planName);
    setSubscriptionMsg(null);

    try {
      const res = await apiRequest('/subscriptions/switch', {
        method: 'POST',
        headers: { 'x-organization-id': activeOrgId },
        body: JSON.stringify({ planName }),
      });

      setSubscriptionMsg({
        type: 'success',
        text: res?.message || `Paket langganan berhasil dialihkan ke ${planName}!`,
      });
      fetchSubscription(activeOrgId);
      fetchMetrics(activeOrgId);
      fetchOrganizations();
    } catch (err: any) {
      setSubscriptionMsg({
        type: 'error',
        text: err.message || 'Gagal mengubah paket.',
      });
    } finally {
      setIsSwitchingPlan(null);
    }
  };

  const handleTestFeatureAccess = async (
    featureKey: 'audit-logs' | 'export-reports',
    label: string,
  ) => {
    if (!activeOrgId) return;
    setGuardTestResult({
      feature: label,
      status: 'loading',
      message: 'Menghubungi SubscriptionGuard backend...',
    });

    try {
      const res = await apiRequest(`/subscriptions/features/${featureKey}`, {
        headers: { 'x-organization-id': activeOrgId },
      });
      setGuardTestResult({
        feature: label,
        status: 'success',
        message:
          res?.message || '200 OK: Akses diizinkan oleh SubscriptionGuard!',
      });
    } catch (err: any) {
      setGuardTestResult({
        feature: label,
        status: 'forbidden',
        message:
          err.message ||
          '403 Forbidden: Ditolak oleh SubscriptionGuard. Paket saat ini belum memenuhi kualifikasi fitur.',
      });
    }
  };

  const fetchBillingHistory = async (orgId?: string) => {
    const targetOrg = orgId || activeOrgId || Cookies.get('currentOrgId');
    if (!targetOrg) return;

    try {
      setIsLoadingBilling(true);
      const res = await apiRequest('/billing/history', {
        headers: { 'x-organization-id': targetOrg },
      });
      if (Array.isArray(res)) {
        setBillingHistory(res);
      }
    } catch {
      setBillingHistory([]);
    } finally {
      setIsLoadingBilling(false);
    }
  };

  const handleInitiateCheckout = async (planName: string) => {
    if (!activeOrgId) return;

    if (planName === 'FREE') {
      return handleSwitchPlan('FREE');
    }

    setIsSwitchingPlan(planName);
    setSubscriptionMsg(null);

    try {
      const res = await apiRequest('/billing/checkout', {
        method: 'POST',
        headers: { 'x-organization-id': activeOrgId },
        body: JSON.stringify({ planName }),
      });

      if (res?.snapToken) {
        setCheckoutModalData({
          orderId: res.orderId,
          snapToken: res.snapToken,
          amount: res.amount,
          planName: res.plan?.name || planName,
          isMock: res.isMock,
          redirectUrl: res.redirectUrl,
        });

        // Cek jika Snap JS aktif di browser (apabila menggunakan kredensial asli)
        if ((window as any).snap && !res.isMock) {
          (window as any).snap.pay(res.snapToken, {
            onSuccess: () => {
              fetchSubscription(activeOrgId);
              fetchBillingHistory(activeOrgId);
              fetchMetrics(activeOrgId);
              setCheckoutModalData(null);
              setSubscriptionMsg({
                type: 'success',
                text: `Pembayaran sukses via Midtrans! Paket ${planName} telah aktif.`,
              });
            },
            onPending: () => {
              fetchBillingHistory(activeOrgId);
              setSubscriptionMsg({
                type: 'success',
                text: `Transaksi pending. Menunggu pembayaran via Midtrans.`,
              });
            },
            onError: () => {
              setSubscriptionMsg({
                type: 'error',
                text: `Pembayaran gagal atau dibatalkan.`,
              });
            },
            onClose: () => {
              fetchBillingHistory(activeOrgId);
            },
          });
        }
      }
    } catch (err: any) {
      setSubscriptionMsg({
        type: 'error',
        text: err.message || 'Gagal memulai sesi checkout Midtrans.',
      });
    } finally {
      setIsSwitchingPlan(null);
    }
  };

  const handleSimulatePayment = async (orderId: string) => {
    if (!activeOrgId) return;
    setIsProcessingPayment(true);

    try {
      const res = await apiRequest(`/billing/simulate-pay/${orderId}`, {
        method: 'POST',
        headers: { 'x-organization-id': activeOrgId },
      });

      setSubscriptionMsg({
        type: 'success',
        text: res?.message || 'Pembayaran berhasil dikonfirmasi dan paket telah aktif!',
      });

      setCheckoutModalData(null);
      fetchSubscription(activeOrgId);
      fetchBillingHistory(activeOrgId);
      fetchMetrics(activeOrgId);
      fetchOrganizations();
    } catch (err: any) {
      alert(err.message || 'Gagal memproses simulasi pembayaran.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  useEffect(() => {
    const loadedUser = getStoredUser();
    if (loadedUser) {
      setUser(loadedUser);
    }
    fetchOrganizations();
  }, []);

  const handleLogout = () => {
    clearAuthSession();
    router.push('/login');
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingOrg(true);
    setFormError('');
    setFormSuccess('');

    try {
      const payload: any = { name: orgName };
      if (orgSlug.trim()) payload.slug = orgSlug.trim();
      if (billingEmail.trim()) payload.billingEmail = billingEmail.trim();

      const res = await apiRequest('/organizations', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res?.organization) {
        setFormSuccess('Organisasi berhasil dibuat!');
        setOrgName('');
        setOrgSlug('');
        setBillingEmail('');

        const newOrg = res.organization;
        Cookies.set('currentOrgId', newOrg.id, { expires: 7 });
        setActiveOrgId(newOrg.id);

        setTimeout(() => {
          setIsModalOpen(false);
          setFormSuccess('');
          fetchOrganizations();
        }, 800);
      }
    } catch (err: any) {
      setFormError(err.message || 'Gagal membuat organisasi.');
    } finally {
      setIsSubmittingOrg(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrgId) return;

    setIsSubmittingProject(true);
    setProjectError('');

    try {
      await apiRequest('/projects', {
        method: 'POST',
        headers: { 'x-organization-id': activeOrgId },
        body: JSON.stringify({
          name: projectName,
          description: projectDesc,
        }),
      });

      setProjectName('');
      setProjectDesc('');
      setIsProjectModalOpen(false);
      fetchProjects(activeOrgId);
      fetchMetrics(activeOrgId);
    } catch (err: any) {
      setProjectError(err.message || 'Gagal membuat project.');
    } finally {
      setIsSubmittingProject(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Yakin ingin menghapus project ini?')) return;
    try {
      await apiRequest(`/projects/${projectId}`, {
        method: 'DELETE',
        headers: { 'x-organization-id': activeOrgId },
      });
      fetchProjects(activeOrgId);
      fetchMetrics(activeOrgId);
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus project.');
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrgId) return;

    setIsSubmittingInvite(true);
    setInviteError('');
    setInviteSuccess('');

    try {
      const res = await apiRequest(`/organizations/${activeOrgId}/invitations`, {
        method: 'POST',
        headers: { 'x-organization-id': activeOrgId },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
        }),
      });

      if (res?.invitation) {
        setInviteSuccess(`Undangan berhasil dibuat! Token: ${res.invitation.token}`);
        setInviteEmail('');
        fetchTeam(activeOrgId);
        fetchMetrics(activeOrgId);
      }
    } catch (err: any) {
      setInviteError(err.message || 'Gagal mengundang anggota.');
    } finally {
      setIsSubmittingInvite(false);
    }
  };

  const handleChangeRole = async (memberId: string, newRole: string) => {
    try {
      await apiRequest(`/organizations/${activeOrgId}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'x-organization-id': activeOrgId },
        body: JSON.stringify({ role: newRole }),
      });
      fetchTeam(activeOrgId);
      fetchMetrics(activeOrgId);
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah role anggota.');
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Keluarkan ${memberName} dari organisasi ini?`)) return;
    try {
      await apiRequest(`/organizations/${activeOrgId}/members/${memberId}`, {
        method: 'DELETE',
        headers: { 'x-organization-id': activeOrgId },
      });
      fetchTeam(activeOrgId);
      fetchMetrics(activeOrgId);
    } catch (err: any) {
      alert(err.message || 'Gagal mengeluarkan anggota.');
    }
  };

  const activeOrg = organizations.find((o) => o.id === activeOrgId);
  const userRole = activeOrg?.role || 'OWNER';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-xl tracking-tight">
              <div className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-sm">
                <Building2 className="w-5 h-5" />
              </div>
              BizFlow SaaS
            </div>

            {/* Dynamic Workspace Switcher */}
            <div className="flex items-center gap-2 pl-4 border-l border-slate-200">
              <span className="text-xs font-semibold uppercase text-slate-400 hidden sm:inline">Workspace:</span>
              {organizations.length > 0 ? (
                <div className="relative">
                  <select
                    value={activeOrgId}
                    onChange={(e) => {
                      if (e.target.value === 'NEW_ORG') {
                        setIsModalOpen(true);
                      } else {
                        switchOrganization(e.target.value);
                      }
                    }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold py-1.5 px-3 pr-8 rounded-lg border-0 focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none transition"
                  >
                    {organizations.map((org: any) => (
                      <option key={org.id} value={org.id}>
                        {org.name} ({org.role})
                      </option>
                    ))}
                    <option value="NEW_ORG">+ Tambah Organisasi Baru</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2.5 top-2.5 pointer-events-none" />
                </div>
              ) : (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200 font-semibold inline-flex items-center gap-1.5 transition"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Buat Workspace Pertama
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-slate-800">{user?.fullName || 'Pengguna'}</div>
              <div className="text-xs text-slate-500">{user?.email || 'email@bizflow.com'}</div>
            </div>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
              title="Keluar"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-2xl p-6 sm:p-8 text-white shadow-sm mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-indigo-500/30 text-indigo-100 px-3 py-1 rounded-full text-xs font-medium mb-3 backdrop-blur-sm">
              <ShieldCheck className="w-3.5 h-3.5" />
              Dashboard Analytics & Metrik Aktif ({userRole})
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {activeOrg ? activeOrg.name : `Halo, ${user?.fullName || 'User'}!`}
            </h1>
            <p className="mt-1 text-indigo-100 text-sm max-w-2xl">
              Pantau performa tren aktivitas tim, pertumbuhan project, dan utilisasi kuota paket langganan secara visual dan real-time.
            </p>
          </div>

          <div className="flex-shrink-0 flex items-center gap-3">
            <button
              onClick={() => setShowRbacModal(true)}
              className="inline-flex items-center gap-2 bg-indigo-500/40 hover:bg-indigo-500/60 text-white font-semibold text-sm px-4 py-2.5 rounded-xl border border-indigo-300/30 backdrop-blur-sm transition"
            >
              <KeyRound className="w-4 h-4" />
              Hak Akses
            </button>

            <Can currentRole={userRole} roles={['OWNER', 'ADMIN', 'MANAGER']}>
              <button
                onClick={() => setIsProjectModalOpen(true)}
                disabled={!activeOrgId}
                className="inline-flex items-center gap-2 bg-white text-indigo-600 hover:bg-indigo-50 font-semibold text-sm px-4 py-2.5 rounded-xl shadow-sm transition disabled:opacity-50"
              >
                <PlusCircle className="w-4 h-4" />
                Project Baru
              </button>
            </Can>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-3 border-b border-slate-200 mb-6 pb-2">
          <button
            onClick={() => setActiveTab('projects')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition ${
              activeTab === 'projects'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FolderKanban className="w-4 h-4" />
            Project ({projects.length})
          </button>

          <button
            onClick={() => {
              setActiveTab('team');
              fetchTeam(activeOrgId);
            }}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition ${
              activeTab === 'team'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            Tim ({members.length})
          </button>

          <button
            onClick={() => {
              setActiveTab('analytics');
              fetchMetrics(activeOrgId);
            }}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition ${
              activeTab === 'analytics'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Analytics & Metrik
          </button>

          <button
            onClick={() => {
              setActiveTab('subscription');
              fetchSubscription(activeOrgId);
            }}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition ${
              activeTab === 'subscription'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Langganan & Paket
          </button>
        </div>

        {/* TAB 1: PROJECTS */}
        {activeTab === 'projects' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Project Terdaftar</h2>
                <p className="text-sm text-slate-500">
                  Data project operasional terisolasi untuk workspace ini.
                </p>
              </div>

              <Can currentRole={userRole} roles={['OWNER', 'ADMIN', 'MANAGER']}>
                <button
                  onClick={() => setIsProjectModalOpen(true)}
                  disabled={!activeOrgId}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  <PlusCircle className="w-4 h-4" />
                  Project Baru
                </button>
              </Can>
            </div>

            {isLoadingProjects ? (
              <div className="py-12 text-center text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                <span>Memuat project...</span>
              </div>
            ) : projects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {projects.map((proj: any) => (
                  <div
                    key={proj.id}
                    className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-indigo-300 hover:shadow-sm transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-slate-900 text-base">{proj.name}</h3>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {proj.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-2 line-clamp-2">
                        {proj.description || 'Tidak ada deskripsi.'}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400">
                      <span>Oleh: {proj.createdBy?.fullName || 'Member'}</span>

                      <Can currentRole={userRole} roles={['OWNER', 'ADMIN']}>
                        <button
                          onClick={() => handleDeleteProject(proj.id)}
                          className="text-slate-400 hover:text-red-600 p-1 rounded transition"
                          title="Hapus Project (Wewenang Owner/Admin)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </Can>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <FolderKanban className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">Belum ada project di workspace ini</p>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Buat project baru untuk mulai mengatur tugas operasional tim Anda.
                </p>
                <Can currentRole={userRole} roles={['OWNER', 'ADMIN', 'MANAGER']}>
                  <button
                    onClick={() => setIsProjectModalOpen(true)}
                    disabled={!activeOrgId}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition disabled:opacity-50"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Tambah Project Sekarang
                  </button>
                </Can>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TEAM MANAGEMENT */}
        {activeTab === 'team' && (
          <div className="space-y-8">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Daftar Anggota Tim</h2>
                  <p className="text-sm text-slate-500">
                    Anggota terdaftar yang memiliki hak akses ke workspace ini.
                  </p>
                </div>

                <Can currentRole={userRole} roles={['OWNER', 'ADMIN']}>
                  <button
                    onClick={() => setIsInviteModalOpen(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 rounded-xl shadow-sm transition"
                  >
                    <UserPlus className="w-4 h-4" />
                    Undang Anggota
                  </button>
                </Can>
              </div>

              {/* Kuota Anggota Banner */}
              {subscriptionData?.usage && (
                <div className={`mb-5 p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                  subscriptionData.usage.isLimitReached
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-indigo-50/50 border-indigo-100 text-slate-700'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                    <div>
                      <span className="font-semibold">
                        Penggunaan Kuota Anggota: {subscriptionData.usage.totalUsedSlots} / {subscriptionData.usage.maxMembers}
                      </span>
                      <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full font-bold bg-white/80 border border-slate-200 text-slate-800">
                        Paket {subscriptionData.plan.name}
                      </span>
                      {subscriptionData.usage.isLimitReached && (
                        <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full font-bold bg-red-100 text-red-700 border border-red-200">
                          Kuota Penuh
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setActiveTab('subscription');
                      fetchSubscription(activeOrgId);
                    }}
                    className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-700 transition self-start sm:self-auto"
                  >
                    Tingkatkan Kuota di Langganan
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {isLoadingTeam ? (
                <div className="py-12 text-center text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                  <span>Memuat anggota tim...</span>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                      <tr>
                        <th className="p-3 font-semibold">Nama Lengkap</th>
                        <th className="p-3 font-semibold">Email</th>
                        <th className="p-3 font-semibold">Peran (Role)</th>
                        <th className="p-3 font-semibold">Status</th>
                        <th className="p-3 font-semibold text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600">
                      {members.map((m: any) => {
                        const isSelf = m.userId === user?.id;
                        const isOwner = m.role === 'OWNER';

                        return (
                          <tr key={m.memberId} className="hover:bg-slate-50/50">
                            <td className="p-3 font-semibold text-slate-900 flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs uppercase">
                                {m.fullName?.charAt(0) || 'U'}
                              </div>
                              {m.fullName}
                              {isSelf && (
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-normal">
                                  Anda
                                </span>
                              )}
                            </td>
                            <td className="p-3 font-mono">{m.email}</td>
                            <td className="p-3">
                              <Can
                                currentRole={userRole}
                                roles={['OWNER', 'ADMIN']}
                                fallback={
                                  <span className="px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-700 text-[11px]">
                                    {m.role}
                                  </span>
                                }
                              >
                                {isOwner ? (
                                  <span className="px-2.5 py-1 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200 text-[11px] inline-flex items-center gap-1">
                                    👑 OWNER
                                  </span>
                                ) : (
                                  <select
                                    value={m.role}
                                    onChange={(e) => handleChangeRole(m.memberId, e.target.value)}
                                    className="bg-slate-100 text-slate-800 text-xs font-semibold py-1 px-2 rounded-lg border-0 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                  >
                                    <option value="ADMIN">ADMIN</option>
                                    <option value="MANAGER">MANAGER</option>
                                    <option value="STAFF">STAFF</option>
                                  </select>
                                )}
                              </Can>
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 text-[11px]">
                                {m.status}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <Can currentRole={userRole} roles={['OWNER', 'ADMIN']}>
                                {!isOwner && !isSelf && (
                                  <button
                                    onClick={() => handleRemoveMember(m.memberId, m.fullName)}
                                    className="text-slate-400 hover:text-red-600 p-1 rounded transition text-xs font-medium inline-flex items-center gap-1"
                                    title="Keluarkan dari organisasi"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Kick
                                  </button>
                                )}
                              </Can>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pending Invitations Section */}
            {invitations.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  Undangan Menunggu Konfirmasi ({invitations.length})
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Tautan undangan berikut berlaku selama 48 jam sejak dibuat.
                </p>

                <div className="divide-y divide-slate-100 text-xs">
                  {invitations.map((inv: any) => (
                    <div key={inv.id} className="py-3 flex items-center justify-between gap-4">
                      <div>
                        <div className="font-semibold text-slate-800">{inv.email}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Role: <span className="font-semibold text-indigo-600">{inv.role}</span> • Status: {inv.status}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(inv.token);
                            alert(`Token undangan disalin: ${inv.token}`);
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium inline-flex items-center gap-1 text-[11px]"
                        >
                          <Copy className="w-3 h-3" />
                          Salin Token
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ANALYTICS & METRICS */}
        {activeTab === 'analytics' && (
          <div className="space-y-8">
            {isLoadingMetrics ? (
              <div className="py-16 text-center text-slate-400 flex items-center justify-center gap-2 bg-white rounded-2xl border border-slate-200">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                <span>Menghitung metrik analitik tenant...</span>
              </div>
            ) : metrics ? (
              <>
                {/* Quota & Subscription Status Bar */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      Kapasitas Anggota Tim
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-slate-900">
                        {metrics.totalMembers}
                      </span>
                      <span className="text-sm font-medium text-slate-500">
                        / {metrics.maxMembersQuota} Member
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            (metrics.totalMembers / metrics.maxMembersQuota) * 100,
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 mt-2 block">
                      Paket {metrics.subscription?.planName} ({Math.round(
                        (metrics.totalMembers / metrics.maxMembersQuota) * 100,
                      )}% terpakai)
                    </span>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      Masa Aktif Langganan
                    </span>
                    <div className="text-3xl font-extrabold text-slate-900">
                      {metrics.subscription?.daysRemaining} Hari
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Status: {metrics.subscription?.status}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        Plan: {metrics.subscription?.planName}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      Fitur Berbayar Aktif
                    </span>
                    <div className="mt-3 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Export Laporan PDF/Excel</span>
                        <span
                          className={`font-semibold ${
                            metrics.subscription?.canExportReports
                              ? 'text-emerald-600'
                              : 'text-slate-400'
                          }`}
                        >
                          {metrics.subscription?.canExportReports ? '✅ Aktif' : '🔒 Khusus Business'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Audit Activity Logs</span>
                        <span
                          className={`font-semibold ${
                            metrics.subscription?.canViewAuditLogs
                              ? 'text-emerald-600'
                              : 'text-slate-400'
                          }`}
                        >
                          {metrics.subscription?.canViewAuditLogs ? '✅ Aktif' : '🔒 Khusus Business'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Chart 1: Bar Chart Monthly Activity */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-indigo-600" />
                          Tren Pembuatan Project (6 Bulan Terakhir)
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                          Aktivitas inisiasi operasional bulanan di workspace {activeOrg?.name}.
                        </p>
                      </div>
                    </div>

                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={metrics.monthlyActivityTrend}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                          <YAxis allowDecimals={false} stroke="#94a3b8" fontSize={11} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#ffffff',
                              borderRadius: '12px',
                              border: '1px solid #e2e8f0',
                              fontSize: '12px',
                            }}
                          />
                          <Bar dataKey="projects" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Chart 2: Donut Chart Role Distribution */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                          <PieIcon className="w-5 h-5 text-indigo-600" />
                          Distribusi Peran Anggota (RBAC)
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                          Proporsi pembagian peran wewenang di tim Anda.
                        </p>
                      </div>
                    </div>

                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={metrics.roleDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="count"
                          >
                            {metrics.roleDistribution?.map((entry: any) => (
                              <Cell
                                key={`cell-${entry.name}`}
                                fill={ROLE_COLORS[entry.name] || '#cbd5e1'}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#ffffff',
                              borderRadius: '12px',
                              border: '1px solid #e2e8f0',
                              fontSize: '12px',
                            }}
                          />
                          <Legend
                            verticalAlign="bottom"
                            height={36}
                            formatter={(value) => (
                              <span className="text-xs font-semibold text-slate-700">
                                {value}
                              </span>
                            )}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* TAB 4: SUBSCRIPTION & PLAN GATING */}
        {activeTab === 'subscription' && (
          <div className="space-y-8">
            {/* Notification Alert for Switch/Upgrade */}
            {subscriptionMsg && (
              <div
                className={`p-4 rounded-xl border flex items-center justify-between text-sm ${
                  subscriptionMsg.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  {subscriptionMsg.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  )}
                  <span>{subscriptionMsg.text}</span>
                </div>
                <button
                  onClick={() => setSubscriptionMsg(null)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
                >
                  Tutup
                </button>
              </div>
            )}

            {/* Current Active Plan Overview */}
            {subscriptionData && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-slate-900">
                          Paket {subscriptionData.plan.name}
                        </h2>
                        <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wide">
                          {subscriptionData.subscription.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Aktif untuk workspace{' '}
                        <strong className="text-slate-700">
                          {subscriptionData.organization?.name}
                        </strong>{' '}
                        • Sisa masa aktif:{' '}
                        <span className="font-semibold text-indigo-600">
                          {subscriptionData.subscription.daysRemaining} Hari
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-slate-900">
                      Rp{' '}
                      {new Intl.NumberFormat('id-ID').format(
                        subscriptionData.plan.price,
                      )}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">/ bulan</span>
                  </div>
                </div>

                {/* Quota Meter */}
                <div className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold mb-2">
                      <span className="text-slate-600">Penggunaan Kuota Anggota</span>
                      <span
                        className={`${
                          subscriptionData.usage.isLimitReached
                            ? 'text-red-600'
                            : 'text-indigo-600'
                        }`}
                      >
                        {subscriptionData.usage.totalUsedSlots} /{' '}
                        {subscriptionData.usage.maxMembers} Anggota (
                        {subscriptionData.usage.quotaPercentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          subscriptionData.usage.quotaPercentage >= 100
                            ? 'bg-red-500'
                            : subscriptionData.usage.quotaPercentage >= 75
                            ? 'bg-amber-500'
                            : 'bg-indigo-600'
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            subscriptionData.usage.quotaPercentage,
                          )}%`,
                        }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2">
                      {subscriptionData.usage.remainingSlots} slot tersisa untuk paket ini.
                    </p>
                  </div>

                  <div className="border-l border-slate-100 pl-0 md:pl-6">
                    <span className="text-xs font-semibold text-slate-500 block mb-2">
                      Status Hak Akses Fitur
                    </span>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Export PDF/Excel</span>
                        <span
                          className={`font-semibold ${
                            subscriptionData.plan.canExportReports
                              ? 'text-emerald-600'
                              : 'text-slate-400'
                          }`}
                        >
                          {subscriptionData.plan.canExportReports
                            ? '✅ Diizinkan'
                            : '🔒 Terkunci'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">Audit Activity Logs</span>
                        <span
                          className={`font-semibold ${
                            subscriptionData.plan.canViewAuditLogs
                              ? 'text-emerald-600'
                              : 'text-slate-400'
                          }`}
                        >
                          {subscriptionData.plan.canViewAuditLogs
                            ? '✅ Diizinkan'
                            : '🔒 Terkunci'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border-l border-slate-100 pl-0 md:pl-6 flex flex-col justify-between">
                    <span className="text-xs font-semibold text-slate-500 block mb-1">
                      Wewenang Billing
                    </span>
                    <p className="text-xs text-slate-600">
                      Peran Anda di workspace ini:{' '}
                      <span className="font-bold text-slate-900">{userRole}</span>
                    </p>
                    {userRole !== 'OWNER' && (
                      <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-2">
                        Perubahan paket hanya dapat diproses oleh pemilik (OWNER).
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* LIVE TESTER: SubscriptionGuard Feature Access Verification */}
            <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2 text-indigo-300">
                    <ShieldCheck className="w-5 h-5 text-indigo-400" />
                    Live Tester: Proteksi Otorisasi SubscriptionGuard
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Uji langsung proteksi backend `SubscriptionGuard` di endpoint API berbasis tier aktif tenant.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() =>
                      handleTestFeatureAccess(
                        'export-reports',
                        'Export Laporan (PDF/Excel)',
                      )
                    }
                    className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3.5 py-2 rounded-xl border border-slate-700 transition"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    Uji Akses: Export Laporan
                  </button>
                  <button
                    onClick={() =>
                      handleTestFeatureAccess(
                        'audit-logs',
                        'Audit Trail & Keamanan',
                      )
                    }
                    className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3.5 py-2 rounded-xl border border-slate-700 transition"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                    Uji Akses: Audit Logs
                  </button>
                </div>
              </div>

              {/* Guard Result Box */}
              {guardTestResult.status !== 'idle' && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 transition ${
                    guardTestResult.status === 'loading'
                      ? 'bg-slate-800/80 border-slate-700 text-slate-300'
                      : guardTestResult.status === 'success'
                      ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
                      : 'bg-red-950/80 border-red-700 text-red-200'
                  }`}
                >
                  {guardTestResult.status === 'loading' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-400 mt-0.5" />
                  ) : guardTestResult.status === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  )}
                  <div>
                    <span className="font-bold block">
                      Hasil Pengujian Fitur [{guardTestResult.feature}]:
                    </span>
                    <span className="text-[11px] leading-relaxed">
                      {guardTestResult.message}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Pricing Plans Grid */}
            <div>
              <div className="mb-6 text-center max-w-xl mx-auto">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  Pilih Paket yang Sesuai untuk Skala Bisnis Anda
                </h3>
                <p className="text-sm text-slate-500 mt-2">
                  Upgrade atau beralih paket kapan saja. Batas kuota dan fitur akan otomatis diperbarui secara instan.
                </p>
              </div>

              {isLoadingSubscription ? (
                <div className="py-12 text-center text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                  <span className="text-sm">Memuat daftar paket langganan...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {plans.map((p: any) => {
                    const isCurrent =
                      subscriptionData?.plan?.name?.toUpperCase() ===
                      p.name?.toUpperCase();
                    const isPopular = p.name === 'BUSINESS';
                    const priceNum = Number(p.price);

                    return (
                      <div
                        key={p.id}
                        className={`rounded-2xl border transition-all duration-300 flex flex-col justify-between p-6 bg-white relative ${
                          isPopular
                            ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg'
                            : 'border-slate-200 shadow-sm hover:shadow-md'
                        }`}
                      >
                        {isPopular && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Paling Populer
                          </div>
                        )}

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-bold text-slate-900 text-lg">
                              {p.name}
                            </h4>
                            {isCurrent && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                Aktif Saat Ini
                              </span>
                            )}
                          </div>

                          <div className="mb-4">
                            <span className="text-3xl font-black text-slate-900">
                              Rp {new Intl.NumberFormat('id-ID').format(priceNum)}
                            </span>
                            <span className="text-xs text-slate-400 font-medium">
                              {' '}
                              / bln
                            </span>
                          </div>

                          <div className="p-3 bg-slate-50 rounded-xl mb-5 text-xs text-slate-700 border border-slate-100 flex items-center gap-2">
                            <Users className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                            <span>
                              Maksimal <strong>{p.maxMembers} Anggota Tim</strong>
                            </span>
                          </div>

                          <ul className="space-y-2.5 text-xs text-slate-600 mb-6">
                            <li className="flex items-center gap-2">
                              <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                              <span>Multi-tenant Isolation</span>
                            </li>
                            <li className="flex items-center gap-2">
                              <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                              <span>Role-Based Access Control</span>
                            </li>
                            <li className="flex items-center gap-2">
                              {p.canExportReports ? (
                                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                              ) : (
                                <X className="w-4 h-4 text-slate-300 flex-shrink-0" />
                              )}
                              <span
                                className={
                                  p.canExportReports
                                    ? 'text-slate-800 font-medium'
                                    : 'text-slate-400'
                                }
                              >
                                Export Laporan PDF/Excel
                              </span>
                            </li>
                            <li className="flex items-center gap-2">
                              {p.canViewAuditLogs ? (
                                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                              ) : (
                                <X className="w-4 h-4 text-slate-300 flex-shrink-0" />
                              )}
                              <span
                                className={
                                  p.canViewAuditLogs
                                    ? 'text-slate-800 font-medium'
                                    : 'text-slate-400'
                                }
                              >
                                Audit Activity Logs
                              </span>
                            </li>
                            {p.name === 'BUSINESS' && (
                              <li className="flex items-center gap-2 text-indigo-600 font-medium">
                                <Sparkles className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                                <span>Support Prioritas 24/7</span>
                              </li>
                            )}
                            {p.name === 'ENTERPRISE' && (
                              <li className="flex items-center gap-2 text-purple-600 font-medium">
                                <Crown className="w-4 h-4 text-purple-500 flex-shrink-0" />
                                <span>Dedicated SLA & Custom Branding</span>
                              </li>
                            )}
                          </ul>
                        </div>

                        <div>
                          {isCurrent ? (
                            <button
                              disabled
                              className="w-full py-2.5 text-xs font-semibold rounded-xl bg-slate-100 text-slate-400 cursor-default flex items-center justify-center gap-1.5"
                            >
                              <Check className="w-4 h-4" /> Paket Aktif
                            </button>
                          ) : (
                            <button
                              onClick={() => handleInitiateCheckout(p.name)}
                              disabled={
                                userRole !== 'OWNER' || isSwitchingPlan === p.name
                              }
                              className={`w-full py-2.5 text-xs font-semibold rounded-xl transition shadow-sm flex items-center justify-center gap-1.5 ${
                                isPopular
                                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                  : 'bg-slate-900 hover:bg-slate-800 text-white'
                              } disabled:opacity-50`}
                            >
                              {isSwitchingPlan === p.name ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Menyiapkan...
                                </>
                              ) : userRole === 'OWNER' ? (
                                p.name === 'FREE' ? (
                                  'Pilih Paket FREE'
                                ) : (
                                  <>
                                    <CreditCard className="w-3.5 h-3.5" />
                                    Bayar & Upgrade ({p.name})
                                  </>
                                )
                              ) : (
                                'Khusus OWNER'
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Feature Comparison Matrix Table */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h4 className="text-base font-bold text-slate-900 mb-2">
                Tabel Komparasi Fitur Lengkap
              </h4>
              <p className="text-xs text-slate-500 mb-6">
                Rincian matriks fitur dan spesifikasi teknis berdasarkan paket langganan.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
                      <th className="p-3 font-semibold">Fitur & Kemampuan</th>
                      <th className="p-3 font-semibold text-center">FREE</th>
                      <th className="p-3 font-semibold text-center">STARTER</th>
                      <th className="p-3 font-semibold text-center bg-indigo-50/50 text-indigo-700">
                        BUSINESS
                      </th>
                      <th className="p-3 font-semibold text-center">ENTERPRISE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600">
                    <tr>
                      <td className="p-3 font-medium text-slate-800">
                        Batas Maksimal Anggota Tim
                      </td>
                      <td className="p-3 text-center">2 Anggota</td>
                      <td className="p-3 text-center">5 Anggota</td>
                      <td className="p-3 text-center font-bold text-indigo-700 bg-indigo-50/30">
                        20 Anggota
                      </td>
                      <td className="p-3 text-center font-bold">100 Anggota</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-slate-800">
                        Multi-Tenancy Workspace
                      </td>
                      <td className="p-3 text-center text-emerald-600 font-bold">✓</td>
                      <td className="p-3 text-center text-emerald-600 font-bold">✓</td>
                      <td className="p-3 text-center text-emerald-600 font-bold bg-indigo-50/30">
                        ✓
                      </td>
                      <td className="p-3 text-center text-emerald-600 font-bold">✓</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-slate-800">
                        Role-Based Access Control (RBAC)
                      </td>
                      <td className="p-3 text-center text-emerald-600 font-bold">✓</td>
                      <td className="p-3 text-center text-emerald-600 font-bold">✓</td>
                      <td className="p-3 text-center text-emerald-600 font-bold bg-indigo-50/30">
                        ✓
                      </td>
                      <td className="p-3 text-center text-emerald-600 font-bold">✓</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-slate-800">
                        Export Laporan PDF & Excel
                      </td>
                      <td className="p-3 text-center text-slate-300 font-bold">—</td>
                      <td className="p-3 text-center text-slate-300 font-bold">—</td>
                      <td className="p-3 text-center text-emerald-600 font-bold bg-indigo-50/30">
                        ✓ (Aktif)
                      </td>
                      <td className="p-3 text-center text-emerald-600 font-bold">
                        ✓ (Aktif)
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-slate-800">
                        Audit Logs & Activity Trail
                      </td>
                      <td className="p-3 text-center text-slate-300 font-bold">—</td>
                      <td className="p-3 text-center text-slate-300 font-bold">—</td>
                      <td className="p-3 text-center text-emerald-600 font-bold bg-indigo-50/30">
                        ✓ (Aktif)
                      </td>
                      <td className="p-3 text-center text-emerald-600 font-bold">
                        ✓ (Aktif)
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-slate-800">
                        SLA Jaminan Uptime
                      </td>
                      <td className="p-3 text-center text-slate-400">Standar</td>
                      <td className="p-3 text-center text-slate-400">99.0%</td>
                      <td className="p-3 text-center text-indigo-700 font-semibold bg-indigo-50/30">
                        99.5%
                      </td>
                      <td className="p-3 text-center text-purple-700 font-bold">
                        99.9% Dedicated
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Billing History & Invoices Table */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-indigo-600" />
                    Riwayat Transaksi & Tagihan (Invoices)
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Histori pembayaran Midtrans gateway dan bukti invoice resmi organisasi.
                  </p>
                </div>

                <button
                  onClick={() => fetchBillingHistory(activeOrgId)}
                  disabled={isLoadingBilling}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 transition"
                >
                  {isLoadingBilling ? 'Memperbarui...' : 'Segarkan Data'}
                </button>
              </div>

              {isLoadingBilling ? (
                <div className="py-12 text-center text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                  <span className="text-xs">Memuat histori pembayaran...</span>
                </div>
              ) : billingHistory.length > 0 ? (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                      <tr>
                        <th className="p-3 font-semibold">Tanggal</th>
                        <th className="p-3 font-semibold">Order ID</th>
                        <th className="p-3 font-semibold">No. Invoice</th>
                        <th className="p-3 font-semibold">Metode</th>
                        <th className="p-3 font-semibold">Nominal</th>
                        <th className="p-3 font-semibold">Status</th>
                        <th className="p-3 font-semibold text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600">
                      {billingHistory.map((b: any) => {
                        const dateStr = new Date(b.createdAt).toLocaleDateString(
                          'id-ID',
                          {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          },
                        );

                        return (
                          <tr key={b.id} className="hover:bg-slate-50/50">
                            <td className="p-3 text-slate-500">{dateStr}</td>
                            <td className="p-3 font-mono font-semibold text-slate-900">
                              {b.orderId}
                            </td>
                            <td className="p-3 font-mono text-indigo-600">
                              {b.invoice?.invoiceNumber || '—'}
                            </td>
                            <td className="p-3 uppercase text-[11px] font-semibold text-slate-700">
                              {b.paymentType || 'Midtrans'}
                            </td>
                            <td className="p-3 font-bold text-slate-900">
                              Rp{' '}
                              {new Intl.NumberFormat('id-ID').format(
                                Number(b.amount),
                              )}
                            </td>
                            <td className="p-3">
                              {b.status === 'SUCCESS' ? (
                                <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3" /> LUNAS
                                </span>
                              ) : b.status === 'PENDING' ? (
                                <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  <Clock className="w-3 h-3" /> MENUNGGU
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-red-100 text-red-800 border border-red-200">
                                  <XCircle className="w-3 h-3" /> GAGAL
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              {b.invoice ? (
                                <button
                                  onClick={() =>
                                    setSelectedInvoice({
                                      ...b.invoice,
                                      orderId: b.orderId,
                                      paymentType: b.paymentType,
                                      orgName: activeOrg?.name,
                                    })
                                  }
                                  className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800 text-xs bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 transition"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  Lihat Invoice
                                </button>
                              ) : (
                                <span className="text-slate-400 text-xs">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-600">
                    Belum ada riwayat transaksi pembayaran.
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Pilih paket berbayar di atas untuk memulai transaksi via Midtrans Snap.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modal Undang Anggota Baru */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                Undang Anggota ke Workspace
              </h3>
              <button
                onClick={() => {
                  setIsInviteModalOpen(false);
                  setInviteError('');
                  setInviteSuccess('');
                }}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {subscriptionData?.usage?.isLimitReached && (
              <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">
                    Peringatan Kuota Anggota ({subscriptionData.usage.totalUsedSlots} /{' '}
                    {subscriptionData.usage.maxMembers})
                  </span>
                  <span>
                    Paket {subscriptionData.plan.name} telah mencapai batas maksimum anggota.
                    Silakan tingkatkan ke paket yang lebih tinggi di tab Langganan.
                  </span>
                </div>
              </div>
            )}

            {inviteError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{inviteError}</span>
              </div>
            )}

            {inviteSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs break-all">
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  Undangan Berhasil Dibuat!
                </div>
                <span>{inviteSuccess}</span>
              </div>
            )}

            <form onSubmit={handleInviteMember} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Calon Anggota *
                </label>
                <div className="relative rounded-xl">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="rekan@perusahaan.com"
                    className="w-full text-sm pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Peran / Hak Akses (Role) *
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                >
                  <option value="STAFF">STAFF (Hanya melihat operasional)</option>
                  <option value="MANAGER">MANAGER (Bisa membuat project & melihat laporan)</option>
                  <option value="ADMIN">ADMIN (Wewenang penuh operasional tim)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingInvite || !inviteEmail.trim()}
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition disabled:opacity-60 inline-flex items-center gap-1.5"
                >
                  {isSubmittingInvite ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Membuat Undangan...
                    </>
                  ) : (
                    'Kirim Undangan'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Matriks Hak Akses RBAC */}
      {showRbacModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-indigo-600" />
                Matriks Hak Akses RBAC (Role-Based Access Control)
              </h3>
              <button
                onClick={() => setShowRbacModal(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Role aktif Anda di organisasi ini:{' '}
              <span className="font-bold text-indigo-600 px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200">
                {userRole}
              </span>
            </p>

            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                  <tr>
                    <th className="p-3 font-semibold">Fitur / Tindakan</th>
                    <th className="p-3 text-center font-semibold">Owner</th>
                    <th className="p-3 text-center font-semibold">Admin</th>
                    <th className="p-3 text-center font-semibold">Manager</th>
                    <th className="p-3 text-center font-semibold">Staff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  <tr>
                    <td className="p-3 font-medium text-slate-800">Lihat Dashboard & Project</td>
                    <td className="p-3 text-center text-emerald-600 font-bold">✓</td>
                    <td className="p-3 text-center text-emerald-600 font-bold">✓</td>
                    <td className="p-3 text-center text-emerald-600 font-bold">✓</td>
                    <td className="p-3 text-center text-emerald-600 font-bold">✓</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-slate-800">Buat Project Baru</td>
                    <td className="p-3 text-center text-emerald-600 font-bold">✓</td>
                    <td className="p-3 text-center text-emerald-600 font-bold">✓</td>
                    <td className="p-3 text-center text-emerald-600 font-bold">✓</td>
                    <td className="p-3 text-center text-slate-300">✗</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-slate-800">Hapus Project</td>
                    <td className="p-3 text-center text-emerald-600 font-bold">✓</td>
                    <td className="p-3 text-center text-emerald-600 font-bold">✓</td>
                    <td className="p-3 text-center text-slate-300">✗</td>
                    <td className="p-3 text-center text-slate-300">✗</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-slate-800">Undang Anggota Tim</td>
                    <td className="p-3 text-center text-emerald-600 font-bold">✓</td>
                    <td className="p-3 text-center text-emerald-600 font-bold">✓</td>
                    <td className="p-3 text-center text-slate-300">✗</td>
                    <td className="p-3 text-center text-slate-300">✗</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-slate-800">Ubah Role Anggota Lain</td>
                    <td className="p-3 text-center text-emerald-600 font-bold">✓</td>
                    <td className="p-3 text-center text-emerald-600 font-bold">✓</td>
                    <td className="p-3 text-center text-slate-300">✗</td>
                    <td className="p-3 text-center text-slate-300">✗</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-slate-800">Kelola Subscription & Pembayaran</td>
                    <td className="p-3 text-center text-emerald-600 font-bold">✓</td>
                    <td className="p-3 text-center text-slate-300">✗</td>
                    <td className="p-3 text-center text-slate-300">✗</td>
                    <td className="p-3 text-center text-slate-300">✗</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowRbacModal(false)}
                className="px-4 py-2 bg-indigo-600 text-white font-semibold text-xs rounded-xl shadow-sm hover:bg-indigo-700 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah Project (Tenant Resource) */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-indigo-600" />
                Tambah Project Baru
              </h3>
              <button
                onClick={() => setIsProjectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {projectError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{projectError}</span>
              </div>
            )}

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Project *
                </label>
                <input
                  type="text"
                  required
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Contoh: ERP System Implementation"
                  className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Deskripsi Singkat
                </label>
                <textarea
                  rows={3}
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  placeholder="Catatan atau ruang lingkup project..."
                  className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsProjectModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProject || !projectName.trim()}
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition disabled:opacity-60 inline-flex items-center gap-1.5"
                >
                  {isSubmittingProject ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    'Simpan Project'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah Organisasi */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                Tambah Organisasi Baru
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateOrg} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Organisasi / Perusahaan *
                </label>
                <input
                  type="text"
                  required
                  value={orgName}
                  onChange={(e) => {
                    setOrgName(e.target.value);
                    if (!orgSlug) {
                      setOrgSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/\s+/g, '-')
                          .replace(/[^a-z0-9-]/g, ''),
                      );
                    }
                  }}
                  placeholder="Contoh: PT Maju Jaya"
                  className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Workspace Slug (URL Identitas)
                </label>
                <div className="flex items-center">
                  <span className="text-xs text-slate-400 bg-slate-100 border border-r-0 border-slate-300 px-3 py-2.5 rounded-l-xl">
                    bizflow.com/
                  </span>
                  <input
                    type="text"
                    value={orgSlug}
                    onChange={(e) => setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="maju-jaya"
                    className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-r-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Billing Email (Opsional)
                </label>
                <input
                  type="email"
                  value={billingEmail}
                  onChange={(e) => setBillingEmail(e.target.value)}
                  placeholder="finance@majujaya.com"
                  className="w-full text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingOrg || !orgName.trim()}
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition disabled:opacity-60 inline-flex items-center gap-1.5"
                >
                  {isSubmittingOrg ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Membuat...
                    </>
                  ) : (
                    'Buat Workspace'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Checkout Midtrans Snap & Simulator Sandbox */}
      {checkoutModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            {/* Header Midtrans Branding */}
            <div className="bg-slate-900 text-white p-6 relative">
              <button
                onClick={() => setCheckoutModalData(null)}
                className="absolute right-5 top-5 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs uppercase tracking-wider font-extrabold text-indigo-400">
                  Payment Gateway
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-400 text-slate-950">
                  SANDBOX
                </span>
              </div>
              <h3 className="text-xl font-black">Midtrans Snap Checkout</h3>
              <p className="text-xs text-slate-400 mt-1">
                Selesaikan pembayaran untuk mengaktifkan paket{' '}
                <strong className="text-white">
                  {checkoutModalData.planName}
                </strong>
                .
              </p>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-6">
              {/* Order Summary Box */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-500">
                  <span>Order ID:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {checkoutModalData.orderId}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>Paket Langganan:</span>
                  <span className="font-bold text-slate-900">
                    Paket {checkoutModalData.planName} (1 Bulan)
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>Workspace Tenant:</span>
                  <span className="font-bold text-slate-900">
                    {activeOrg?.name}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-sm">
                  <span className="font-bold text-slate-900">Total Tagihan:</span>
                  <span className="text-base font-black text-indigo-600">
                    Rp{' '}
                    {new Intl.NumberFormat('id-ID').format(
                      checkoutModalData.amount,
                    )}
                  </span>
                </div>
              </div>

              {/* Supported Payment Channels */}
              <div>
                <span className="text-xs font-bold text-slate-700 block mb-3">
                  Metode Pembayaran yang Didukung (Midtrans Snap):
                </span>
                <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-indigo-400 transition cursor-default">
                    <QrCode className="w-5 h-5 text-indigo-600 mx-auto mb-1" />
                    <span className="font-semibold block text-[11px] text-slate-800">
                      QRIS / GoPay
                    </span>
                    <span className="text-[10px] text-slate-400">Instan</span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-indigo-400 transition cursor-default">
                    <Building2 className="w-5 h-5 text-indigo-600 mx-auto mb-1" />
                    <span className="font-semibold block text-[11px] text-slate-800">
                      Virtual Account
                    </span>
                    <span className="text-[10px] text-slate-400">BCA/Mandiri</span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-indigo-400 transition cursor-default">
                    <CreditCard className="w-5 h-5 text-indigo-600 mx-auto mb-1" />
                    <span className="font-semibold block text-[11px] text-slate-800">
                      Kartu Kredit
                    </span>
                    <span className="text-[10px] text-slate-400">Visa/Master</span>
                  </div>
                </div>
              </div>

              {/* Sandbox Action */}
              <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl">
                <span className="text-xs font-bold text-indigo-950 block mb-1">
                  🧪 Sandbox Testing Mode
                </span>
                <p className="text-[11px] text-indigo-800 mb-3 leading-relaxed">
                  Gunakan tombol di bawah ini untuk mensimulasikan notifikasi sukses pembayaran webhook Midtrans secara instan tanpa perlu memotong saldo rekening nyata.
                </p>

                <button
                  onClick={() =>
                    handleSimulatePayment(checkoutModalData.orderId)
                  }
                  disabled={isProcessingPayment}
                  className="w-full py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isProcessingPayment ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Memverifikasi Webhook Midtrans...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Simulasikan Pembayaran Sukses (Webhook)
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setCheckoutModalData(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detail Invoice Resmi */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 text-white p-6 relative">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="absolute right-5 top-5 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1 bg-indigo-600 text-white rounded">
                  <Building2 className="w-4 h-4" />
                </div>
                <span className="text-xs uppercase font-bold tracking-wider text-indigo-300">
                  BizFlow SaaS
                </span>
              </div>
              <h3 className="text-xl font-black">Bukti Tagihan Resmi</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Nomor: <span className="text-white font-mono">{selectedInvoice.invoiceNumber}</span>
              </p>
            </div>

            <div className="p-6 space-y-6 text-xs text-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[11px]">Diterbitkan Untuk:</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {selectedInvoice.orgName}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[11px]">Status Tagihan:</span>
                  <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" /> LUNAS (PAID)
                  </span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                    <tr>
                      <th className="p-3 font-semibold">Deskripsi Layanan</th>
                      <th className="p-3 font-semibold text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="p-3">
                        <span className="font-semibold block text-slate-900">
                          Langganan Platform BizFlow SaaS (1 Bulan)
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Order ID: {selectedInvoice.orderId} • Metode:{' '}
                          {selectedInvoice.paymentType || 'Midtrans'}
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold text-slate-900">
                        Rp{' '}
                        {new Intl.NumberFormat('id-ID').format(
                          Number(selectedInvoice.amount),
                        )}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200">
                    <tr>
                      <td className="p-3 font-bold text-slate-900">Total Pembayaran:</td>
                      <td className="p-3 text-right font-black text-indigo-600 text-sm">
                        Rp{' '}
                        {new Intl.NumberFormat('id-ID').format(
                          Number(selectedInvoice.amount),
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                Bukti pembayaran ini sah dan diterbitkan secara digital oleh sistem multi-tenant BizFlow SaaS melalui payment gateway Midtrans.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition"
              >
                Tutup
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition inline-flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                Cetak / Simpan PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
