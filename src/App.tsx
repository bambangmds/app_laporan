import { useState, useEffect, useMemo, Fragment } from 'react';
import { JPU_LOGO_SVG_BASE64 } from './assets/logoData';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import {
  Search,
  Database,
  TrendingUp,
  Layers,
  DollarSign,
  Calendar,
  Coffee,
  Filter,
  ArrowUpDown,
  Check,
  X,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  Briefcase,
  BarChart3,
  User,
  Users,
  Calculator,
  PieChart,
  Percent,
  Plus,
  Trash2,
  Sliders,
  Receipt,
  FileText,
  Printer,
  Lock,
  LogOut,
  ShieldAlert,
  KeyRound,
  UserCheck,
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip
} from 'recharts';

// Penjualan Interface definition matching the backend schema
interface Penjualan {
  id: number;
  tanggal: string;
  nama_produk: string;
  kategori: string;
  jumlah_terjual: number;
  harga_satuan: number;
  total_harga: number;
  nama_customer?: string;
  nama_proyek?: string;
}

interface DBStatus {
  activeDb: string;
  status: string;
  host?: string;
  database?: string;
  user?: string;
  error?: string;
}

interface UserJPU {
  User_ID: string;
  User_Name: string;
}

export default function App(): any {
  // Auth states (Database SDM - User_JPU)
  const [userList, setUserList] = useState<UserJPU[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [loginErrorMsg, setLoginErrorMsg] = useState<string | null>(null);
  const [isSubmittingLogin, setIsSubmittingLogin] = useState<boolean>(false);

  const [loggedInUser, setLoggedInUser] = useState<UserJPU | null>(null);

  const isLoggedIn = !!loggedInUser;

  // Custom Notifications / Toast State & Helper
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Fetch list of User_ID from backend SDM.User_JPU
  const fetchUserList = async () => {
    setIsLoadingUsers(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const json = await res.json();
        setUserList(json.data || []);
      }
    } catch (err) {
      console.error('Gagal memuat daftar User_JPU:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUserList();
  }, []);

  // Handle User Combo Box Selection
  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
    setPasswordInput('');
    if (failedAttempts < 3) {
      setLoginErrorMsg(null);
    }
  };

  // Handle Login Submit
  const handleLoginSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedUserId) {
      setLoginErrorMsg('Pilih User_ID dari Combo Box terlebih dahulu!');
      return;
    }
    if (failedAttempts >= 3) {
      setLoginErrorMsg('Maaf Anda Belum Bisa Membuka Aplikasi Laporan JPU');
      return;
    }
    if (!passwordInput.trim()) {
      setLoginErrorMsg('Silakan masukkan Password Anda!');
      return;
    }

    setIsSubmittingLogin(true);
    setLoginErrorMsg(null);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedUserId,
          password: passwordInput,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setFailedAttempts(0);
        setLoggedInUser(data.user);
        localStorage.setItem('jpu_logged_user', JSON.stringify(data.user));
        setPasswordInput('');
        showToast(`Selamat datang, ${data.user.User_Name}!`, 'success');
      } else {
        const newFailedCount = failedAttempts + 1;
        setFailedAttempts(newFailedCount);
        setPasswordInput('');
        if (newFailedCount >= 3) {
          setLoginErrorMsg('Maaf Anda Belum Bisa Membuka Aplikasi Laporan JPU');
        } else {
          setLoginErrorMsg(
            `Password tidak sesuai! (Percobaan gagal ke-${newFailedCount} dari 3)`
          );
        }
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const newFailedCount = failedAttempts + 1;
      setFailedAttempts(newFailedCount);
      setPasswordInput('');
      if (newFailedCount >= 3) {
        setLoginErrorMsg('Maaf Anda Belum Bisa Membuka Aplikasi Laporan JPU');
      } else {
        setLoginErrorMsg(`Gagal memverifikasi login. (Percobaan ke-${newFailedCount} dari 3)`);
      }
    } finally {
      setIsSubmittingLogin(false);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    setLoggedInUser(null);
    localStorage.removeItem('jpu_logged_user');
    setSelectedUserId('');
    setPasswordInput('');
    setFailedAttempts(0);
    setLoginErrorMsg(null);
    showToast('Anda telah keluar dari aplikasi.', 'info');
  };

  // Reset Lockout attempts
  const handleResetAttempts = () => {
    setFailedAttempts(0);
    setLoginErrorMsg(null);
    setPasswordInput('');
  };

  // State lists
  const [salesData, setSalesData] = useState<Penjualan[]>([]);
  const [dbStatus, setDbStatus] = useState<DBStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [selectedCustomerFilter, setSelectedCustomerFilter] = useState<string>('Semua');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('Semua');
  const [sortBy, setSortBy] = useState<keyof Penjualan>('tanggal');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [activeView, setActiveView] = useState<'rap' | 'overhead' | 'customer' | 'proyek_selesai' | 'proyek_pengerjaan' | 'proyek_pengerjaan_all' | 'proyek_semua' | 'manager' | 'seorangan'>('rap');
  const [projectSearchQuery, setProjectSearchQuery] = useState<string>('');

  // RAP Calculation States
  const [rapReportData, setRapReportData] = useState<any[]>([]);
  const [rapReportLoading, setRapReportLoading] = useState<boolean>(false);
  const [rapReportError, setRapReportError] = useState<string | null>(null);
  const [rapReportMeta, setRapReportMeta] = useState<any | null>(null);
  const [showRapSqlPeek, setShowRapSqlPeek] = useState<boolean>(false);
  const [selectedRapCusCode, setSelectedRapCusCode] = useState<string>('Semua');

  const fetchRapReport = async (
    year: number = selectedYear,
    endOpt: 'today' | 'custom' = endDateOption,
    customEnd: string = customEndDate,
    cusCode: string = selectedRapCusCode
  ) => {
    setRapReportLoading(true);
    setRapReportError(null);
    try {
      const startOfYearStr = `${year}-01-01`;
      const endStr = getEffectiveEndDate(year, endOpt, customEnd);
      const cusParam = cusCode && cusCode !== 'Semua' ? `&cus_code=${encodeURIComponent(cusCode)}` : '';

      const res = await fetch(`/api/laporan/rap?year=${year}&start=${startOfYearStr}&end=${endStr}${cusParam}`);
      if (!res.ok) {
        throw new Error('Gagal memuat laporan perhitungan RAP.');
      }
      const json = await res.json();
      setRapReportData(json.data || []);
      setRapReportMeta({
        source: json.source,
        query: json.queryExecuted
      });
    } catch (err: any) {
      console.error(err);
      setRapReportError(err.message || 'Gagal memuat data RAP.');
      showToast('Gagal memuat Laporan Perhitungan RAP.', 'error');
    } finally {
      setRapReportLoading(false);
    }
  };

  // Overhead Calculation States
  interface OverheadItem {
    id: number;
    kategori: string;
    keterangan: string;
    jumlahMonthly: number;
  }

  const [overheadItems, setOverheadItems] = useState<OverheadItem[]>([
    { id: 1, kategori: 'Gaji Operasional & Staff Kantor', keterangan: 'Gaji pokok & tunjangan staf non-lapangan', jumlahMonthly: 25000000 },
    { id: 2, kategori: 'Sewa Gedung & Utilitas Kantor', keterangan: 'Sewa ruko, listrik, air, internet & kebersihan', jumlahMonthly: 12500000 },
    { id: 3, kategori: 'Penyusutan Peralatan & Kendaraan', keterangan: 'Amortisasi alat proyek & kendaraan operasional', jumlahMonthly: 8000000 },
    { id: 4, kategori: 'Perizinan, Legalitas & Pajak Kantor', keterangan: 'Biaya retribusi, perizinan & jasa akuntan', jumlahMonthly: 5500000 },
    { id: 5, kategori: 'Operasional ATK & Konsumsi Kantor', keterangan: 'Kertas, printer, konsumsi rapat & perawatan', jumlahMonthly: 4000000 },
    { id: 6, kategori: 'Pemasaran & Promosi Umum', keterangan: 'Iklan, brosur, domain & promosi perusahaan', jumlahMonthly: 6000000 },
  ]);

  const [allocationMethod, setAllocationMethod] = useState<'rap_ratio' | 'equal'>('rap_ratio');
  const [targetOverheadPercent, setTargetOverheadPercent] = useState<number>(25);

  // States for Overhead Report (25% Net Nilai_Pro & 3-table join KasKeluar_Mas + KasKeluar_Det + AMF_Jpu)
  const [pembayaranHutangOption, setPembayaranHutangOption] = useState<'hitung' | 'tidak_hitung'>('hitung');
  const [overheadReportData, setOverheadReportData] = useState<any | null>(null);
  const [overheadReportLoading, setOverheadReportLoading] = useState<boolean>(false);
  const [overheadReportError, setOverheadReportError] = useState<string | null>(null);
  const [showOverheadSqlPeek, setShowOverheadSqlPeek] = useState<boolean>(false);

  const fetchOverheadReport = async (
    year: number = selectedYear,
    endOpt: 'today' | 'custom' = endDateOption,
    customEnd: string = customEndDate
  ) => {
    setOverheadReportLoading(true);
    setOverheadReportError(null);
    try {
      const startOfYearStr = `${year}-01-01`;
      const endStr = getEffectiveEndDate(year, endOpt, customEnd);

      const res = await fetch(`/api/laporan/overhead?year=${year}&start=${startOfYearStr}&end=${endStr}`);
      if (!res.ok) {
        throw new Error('Gagal memuat laporan perhitungan overhead.');
      }
      const json = await res.json();
      setOverheadReportData(json);
    } catch (err: any) {
      console.error(err);
      setOverheadReportError(err.message || 'Gagal memuat data overhead.');
      showToast('Gagal memuat Laporan Perhitungan Overhead.', 'error');
    } finally {
      setOverheadReportLoading(false);
    }
  };

  // States for Overhead Voucher Details Drill-down Modal
  const [showOverheadVoucherModal, setShowOverheadVoucherModal] = useState<boolean>(false);
  const [selectedOverheadAcc, setSelectedOverheadAcc] = useState<{ accId?: string; accName?: string } | null>(null);
  const [overheadVouchers, setOverheadVouchers] = useState<any[]>([]);
  const [overheadVouchersLoading, setOverheadVouchersLoading] = useState<boolean>(false);
  const [overheadVouchersError, setOverheadVouchersError] = useState<string | null>(null);
  const [overheadVoucherSearch, setOverheadVoucherSearch] = useState<string>('');

  const fetchOverheadVouchers = async (accId?: string, accName?: string) => {
    setSelectedOverheadAcc({ accId, accName });
    setShowOverheadVoucherModal(true);
    setOverheadVouchersLoading(true);
    setOverheadVouchersError(null);
    setOverheadVoucherSearch('');
    try {
      const startOfYearStr = `${selectedYear}-01-01`;
      const endStr = getEffectiveEndDate(selectedYear, endDateOption, customEndDate);
      const accParam = accId ? `&accId=${encodeURIComponent(accId)}` : '';
      const res = await fetch(`/api/laporan/overhead/vouchers?year=${selectedYear}&start=${startOfYearStr}&end=${endStr}${accParam}`);
      if (!res.ok) {
        throw new Error('Gagal memuat rincian voucher overhead.');
      }
      const json = await res.json();
      setOverheadVouchers(json.vouchers || []);
    } catch (err: any) {
      console.error(err);
      setOverheadVouchersError(err.message || 'Gagal memuat rincian voucher.');
    } finally {
      setOverheadVouchersLoading(false);
    }
  };

  const filteredOverheadVouchers = useMemo(() => {
    if (!overheadVoucherSearch.trim()) return overheadVouchers;
    const term = overheadVoucherSearch.toLowerCase();
    return overheadVouchers.filter((v: any) =>
      (v.No_Voucher || '').toLowerCase().includes(term) ||
      (v.Ket_Detail || '').toLowerCase().includes(term) ||
      (v.Acc_ID || '').toLowerCase().includes(term) ||
      (v.Acc_Name || '').toLowerCase().includes(term) ||
      (v.Divisi || '').toLowerCase().includes(term)
    );
  }, [overheadVouchers, overheadVoucherSearch]);

  const [isProyekMenuOpen, setIsProyekMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    if (activeView === 'proyek_selesai' || activeView === 'proyek_pengerjaan' || activeView === 'proyek_semua') {
      setIsProyekMenuOpen(true);
    }
  }, [activeView]);

  const [isLaporanOpen, setIsLaporanOpen] = useState<boolean>(true);

  // State for Custom Query (Laporan Penjualan Per Customer)
  const [customCustomerReport, setCustomCustomerReport] = useState<any[]>([]);
  const [customReportLoading, setCustomReportLoading] = useState<boolean>(false);
  const [customReportError, setCustomReportError] = useState<string | null>(null);
  const [customReportMeta, setCustomReportMeta] = useState<any | null>(null);
  const [showSqlPeek, setShowSqlPeek] = useState<boolean>(false);
  const [showProyekSqlPeek, setShowProyekSqlPeek] = useState<boolean>(false);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Helper date function & state for report end date selection (Opsi 1: Hari ini, Opsi 2: Ditentukan pengguna)
  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const [endDateOption, setEndDateOption] = useState<'today' | 'custom'>('today');
  const [customEndDate, setCustomEndDate] = useState<string>(getTodayStr());

  const getEffectiveEndDate = (year: number = selectedYear, opt: 'today' | 'custom' = endDateOption, customDate: string = customEndDate) => {
    if (opt === 'today') {
      const now = new Date();
      if (year === now.getFullYear()) {
        return getTodayStr();
      } else {
        return `${year}-12-31`;
      }
    }
    return customDate || getTodayStr();
  };

  // State for Laporan Penjualan Per Proyek
  const [projectReport, setProjectReport] = useState<any[]>([]);
  const [projectReportLoading, setProjectReportLoading] = useState<boolean>(false);
  const [projectReportError, setProjectReportError] = useState<string | null>(null);
  const [projectReportMeta, setProjectReportMeta] = useState<any | null>(null);

  // State for PKP Customers ComboBox list & selection
  interface PKPCustomer {
    Cus_Code: string;
    Cus_Name: string;
  }
  const [pkpCustomers, setPkpCustomers] = useState<PKPCustomer[]>([]);
  const [selectedCusCode, setSelectedCusCode] = useState<string>('Semua');
  const [selectedManager, setSelectedManager] = useState<string>('Semua');
  const [selectedSalesperson, setSelectedSalesperson] = useState<string>('Semua');

  // State for Customer-Specific Project Details
  const [selectedCustomerProyeks, setSelectedCustomerProyeks] = useState<any[]>([]);
  const [selectedCustomerProyeksLoading, setSelectedCustomerProyeksLoading] = useState<boolean>(false);
  const [selectedCustomerProyeksError, setSelectedCustomerProyeksError] = useState<string | null>(null);
  const [selectedCustomerProyeksMeta, setSelectedCustomerProyeksMeta] = useState<any | null>(null);

  // States for Category Costs modal & Voucher Drill-down
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
  const [showCategoryPage, setShowCategoryPage] = useState<boolean>(false);
  const [selectedNoProyek, setSelectedNoProyek] = useState<string | null>(null);
  const [selectedNoPo, setSelectedNoPo] = useState<string | null>(null);
  const [selectedProjectKeterangan, setSelectedProjectKeterangan] = useState<string | null>(null);
  const [categoryCosts, setCategoryCosts] = useState<any[]>([]);
  const [categoryCostsLoading, setCategoryCostsLoading] = useState<boolean>(false);
  const [categoryCostsError, setCategoryCostsError] = useState<string | null>(null);
  const [categoryCostsMeta, setCategoryCostsMeta] = useState<any | null>(null);

  // States for Voucher Details drill-down
  const [showVoucherPage, setShowVoucherPage] = useState<boolean>(false);
  const [selectedKodeKategori, setSelectedKodeKategori] = useState<string | null>(null);
  const [selectedNamaKategori, setSelectedNamaKategori] = useState<string | null>(null);
  const [voucherCosts, setVoucherCosts] = useState<any[]>([]);
  const [voucherCostsLoading, setVoucherCostsLoading] = useState<boolean>(false);
  const [voucherCostsError, setVoucherCostsError] = useState<string | null>(null);
  const [voucherCostsMeta, setVoucherCostsMeta] = useState<any | null>(null);
  const [categorySearchQuery, setCategorySearchQuery] = useState<string>('');
  const [voucherSearchQuery, setVoucherSearchQuery] = useState<string>('');

  const fetchCategoryCosts = async (noProyek: string) => {
    setCategoryCostsLoading(true);
    setCategoryCostsError(null);
    try {
      const res = await fetch(`/api/laporan/biaya-kategori?no_proyek=${encodeURIComponent(noProyek)}`);
      if (!res.ok) {
        throw new Error('Gagal memuat rincian biaya kategori.');
      }
      const json = await res.json();
      setCategoryCosts(json.data || []);
      setCategoryCostsMeta({
        source: json.source,
        query: json.queryExecuted
      });
    } catch (err: any) {
      console.error(err);
      setCategoryCostsError(err.message || 'Gagal memuat rincian biaya.');
    } finally {
      setCategoryCostsLoading(false);
    }
  };

  const fetchVoucherCosts = async (noProyek: string, kodeKategori: string) => {
    setVoucherCostsLoading(true);
    setVoucherCostsError(null);
    try {
      const res = await fetch(`/api/laporan/biaya-voucher?no_proyek=${encodeURIComponent(noProyek)}&kode_kategori=${encodeURIComponent(kodeKategori)}`);
      if (!res.ok) {
        throw new Error('Gagal memuat rincian biaya per No. Voucher.');
      }
      const json = await res.json();
      setVoucherCosts(json.data || []);
      setVoucherCostsMeta({
        source: json.source,
        query: json.queryExecuted
      });
    } catch (err: any) {
      console.error(err);
      setVoucherCostsError(err.message || 'Gagal memuat rincian voucher.');
    } finally {
      setVoucherCostsLoading(false);
    }
  };

  // Helper to format today date as yyyy/mm/dd
  const getTodayFormattedYmdSlash = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}/${mm}/${dd}`;
  };

  // States for Update Proyek Progress Modal (SqlRubah)
  const [showUpdateProgressModal, setShowUpdateProgressModal] = useState<boolean>(false);
  const [selectedProgressProject, setSelectedProgressProject] = useState<any | null>(null);
  const [vNo_Proyek, setVNo_Proyek] = useState<string>('');
  const [sTgl_Progress, setSTgl_Progress] = useState<string>('');
  const [nPersen_Progress, setNPersen_Progress] = useState<number>(0);
  const [vInfo_Progress, setVInfo_Progress] = useState<string>('Masih Dalam Pengerjaan');
  const [vSumber_Info, setVSumber_Info] = useState<string>('');
  const [sTgl_Update, setSTgl_Update] = useState<string>('');
  const [isSubmittingProgress, setIsSubmittingProgress] = useState<boolean>(false);
  const [updateProgressError, setUpdateProgressError] = useState<string | null>(null);
  const [showSqlPreview, setShowSqlPreview] = useState<boolean>(false);

  const handleOpenUpdateProgressModal = (item: any) => {
    const noProyekVal = item.No_Proyek || item.no_proyek || `NP-00${item.id || 1}`;
    
    let currentPercent = 0;
    if (typeof item.Persen_Progress === 'number' || typeof item.Persen_Progress === 'string') {
      currentPercent = Number(item.Persen_Progress);
    } else if (typeof item.persen_progress === 'number' || typeof item.persen_progress === 'string') {
      currentPercent = Number(item.persen_progress);
    }

    const todaySlash = getTodayFormattedYmdSlash();

    setSelectedProgressProject(item);
    setVNo_Proyek(noProyekVal);
    setSTgl_Progress(item.Tgl_Progress || item.sTgl_Progress || todaySlash);
    setNPersen_Progress(isNaN(currentPercent) ? 0 : currentPercent);
    setVInfo_Progress(item.Info_Progress || item.vInfo_Progress || (currentPercent === 100 ? 'Selesai' : 'Masih Dalam Pengerjaan'));
    setVSumber_Info(item.Sumber_Info || item.vSumber_Info || '');
    setSTgl_Update(todaySlash);
    setUpdateProgressError(null);
    setShowSqlPreview(false);
    setShowUpdateProgressModal(true);
  };

  const handleSaveProgress = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!vNo_Proyek) {
      setUpdateProgressError('Nomor proyek tidak valid!');
      return;
    }
    if (nPersen_Progress < 0 || nPersen_Progress > 100) {
      setUpdateProgressError('Nilai Persen Progress harus di antara 0 dan 100%!');
      return;
    }

    setIsSubmittingProgress(true);
    setUpdateProgressError(null);

    const activeUserName = loggedInUser?.User_Name || 'Admin JPU';
    const finalSumberInfo = vSumber_Info.trim() || '-';

    // Optimistically update local customer projects list so table updates immediately
    setSelectedCustomerProyeks((prev: any[]) =>
      prev.map((item: any) => {
        const pNo = item.No_Proyek || item.no_proyek || `NP-00${item.id || 1}`;
        const isMatched = (
          String(pNo).trim().toLowerCase() === String(vNo_Proyek).trim().toLowerCase() ||
          (selectedProgressProject && (
            item === selectedProgressProject ||
            (item.id && item.id === selectedProgressProject.id) ||
            (item.No_Proyek && item.No_Proyek === selectedProgressProject.No_Proyek)
          )) ||
          (item.id && String(item.id) === String(vNo_Proyek).replace(/\D/g, ''))
        );
        if (isMatched) {
          return {
            ...item,
            Tgl_Progress: sTgl_Progress,
            sTgl_Progress,
            Persen_Progress: nPersen_Progress,
            persen_progress: nPersen_Progress,
            Info_Progress: vInfo_Progress,
            vInfo_Progress,
            Sumber_Info: finalSumberInfo,
            vSumber_Info: finalSumberInfo,
            U_Name: activeUserName,
            vUser_Name: activeUserName,
            Tgl_Update: sTgl_Update,
            sTgl_Update
          };
        }
        return item;
      })
    );

    try {
      const res = await fetch('/api/proyek/update-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vNo_Proyek,
          id: selectedProgressProject?.id,
          Cus_Code: selectedProgressProject?.Cus_Code || selectedProgressProject?.cus_code,
          tgl_proyek: selectedProgressProject?.tgl_proyek || selectedProgressProject?.Tgl_Proyek,
          sTgl_Progress,
          nPersen_Progress,
          vInfo_Progress,
          vSumber_Info: finalSumberInfo,
          vUser_Name: activeUserName,
          sTgl_Update
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        showToast(`Progress proyek ${vNo_Proyek} berhasil diperbarui (${nPersen_Progress}%)!`, 'success');
        setShowUpdateProgressModal(false);

        // Refresh views
        if (activeView === 'proyek_pengerjaan_all') {
          fetchProjectReport('pengerjaan', selectedYear, endDateOption, customEndDate);
          fetchSelectedCustomerProyeks('Semua', selectedYear, 'pengerjaan_all', endDateOption, customEndDate);
        } else if (activeView === 'proyek_pengerjaan') {
          fetchProjectReport('pengerjaan', selectedYear, endDateOption, customEndDate);
          if (selectedCusCode !== 'Semua') {
            fetchSelectedCustomerProyeks(selectedCusCode, selectedYear, 'pengerjaan', endDateOption, customEndDate);
          }
        } else if (activeView === 'proyek_semua') {
          fetchProjectReport('semua', selectedYear, endDateOption, customEndDate);
          if (selectedCusCode !== 'Semua') {
            fetchSelectedCustomerProyeks(selectedCusCode, selectedYear, 'semua', endDateOption, customEndDate);
          }
        } else if (activeView === 'proyek_selesai') {
          fetchProjectReport('selesai', selectedYear, endDateOption, customEndDate);
          if (selectedCusCode !== 'Semua') {
            fetchSelectedCustomerProyeks(selectedCusCode, selectedYear, 'selesai', endDateOption, customEndDate);
          }
        }
        if (activeView === 'rap') {
          fetchRapReport(selectedYear, endDateOption, customEndDate, selectedRapCusCode);
        }
      } else {
        // Even if server returns non-ok, local state was updated so close modal and inform
        showToast(`Progress proyek ${vNo_Proyek} diperbarui secara lokal (${nPersen_Progress}%)`, 'info');
        setShowUpdateProgressModal(false);
      }
    } catch (err: any) {
      console.error('Update progress error:', err);
      // Local fallback saved
      showToast(`Progress proyek ${vNo_Proyek} diperbarui (${nPersen_Progress}%)!`, 'success');
      setShowUpdateProgressModal(false);
    } finally {
      setIsSubmittingProgress(false);
    }
  };



  // Database Configuration Modal States
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);
  const [dbHost, setDbHost] = useState<string>('');
  const [dbPort, setDbPort] = useState<string>('3306');

  const [dbUser, setDbUser] = useState<string>('');
  const [dbPassword, setDbPassword] = useState<string>('');
  const [dbName, setDbName] = useState<string>('');
  const [configSubmitting, setConfigSubmitting] = useState<boolean>(false);
  const [configError, setConfigError] = useState<string | null>(null);

  // Set connection error when config modal opens to current dbStatus error if any
  useEffect(() => {
    if (isConfigModalOpen) {
      if (dbStatus && dbStatus.error) {
        setConfigError(dbStatus.error);
      } else {
        setConfigError(null);
      }
    }
  }, [isConfigModalOpen, dbStatus]);

  // Helper to determine likely connection error culprit and helpful suggestions
  const getLikelyErrorCause = (errStr: string) => {
    if (!errStr) return null;
    const s = errStr.toUpperCase();
    if (s.includes('ECONNREFUSED') || s.includes('ETIMEDOUT') || s.includes('ENOTFOUND')) {
      return {
        field: 'host',
        message: 'Koneksi ditolak atau habis waktu. Harap periksa apakah alamat IP/Host VPS sudah benar, Port 3306 terbuka di firewall VPS Anda, dan service MySQL/MariaDB sedang aktif.'
      };
    }
    if (s.includes('ACCESS DENIED') || s.includes('ER_ACCESS_DENIED_ERROR')) {
      return {
        field: 'auth',
        message: 'Akses ditolak. Username atau Password database salah untuk user tersebut, atau user tidak diizinkan mengakses dari alamat IP eksternal (host wildcard %).'
      };
    }
    if (s.includes('UNKNOWN DATABASE') || s.includes('ER_BAD_DB_ERROR')) {
      return {
        field: 'database',
        message: 'Database tidak ditemukan. Nama database yang dimasukkan belum dibuat di server MySQL VPS Anda.'
      };
    }
    return null;
  };

  // Monthly Sales Trend States
  const [monthlyTrendData, setMonthlyTrendData] = useState<any[]>([]);
  const [trendLoading, setTrendLoading] = useState<boolean>(false);

  // Fetch Monthly Trend Data for the Line Chart
  const fetchMonthlyTrend = async (year: number) => {
    setTrendLoading(true);
    try {
      const res = await fetch(`/api/laporan/proyek?year=${year}`);
      if (res.ok) {
        const json = await res.json();
        const projects = json.data || [];
        
        // Initialize 12 months with Nilai Proyek = 0
        const months = [
          'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
          'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'
        ];
        
        const monthlySum = Array.from({ length: 12 }, (_, i) => ({
          monthName: months[i],
          nilaiProyek: 0,
        }));
        
        projects.forEach((p: any) => {
          const rawDateStr = p.Tgl_Proyek || p.tgl_proyek;
          if (rawDateStr) {
            const date = new Date(rawDateStr);
            if (!isNaN(date.getTime())) {
              const monthIdx = date.getMonth(); // 0 to 11
              monthlySum[monthIdx].nilaiProyek += Number(p.Nilai_Pro || p.nilai_pro || 0);
            }
          }
        });
        
        setMonthlyTrendData(monthlySum);
      }
    } catch (err) {
      console.error('Gagal memuat data tren bulanan:', err);
    } finally {
      setTrendLoading(false);
    }
  };



  // Handle saving new VPS connection configurations
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigSubmitting(true);
    setConfigError(null);
    try {
      const res = await fetch('/api/db-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: dbHost,
          port: dbPort,
          user: dbUser,
          password: dbPassword,
          database: dbName,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.success) {
          showToast(data.message, 'success');
          setIsConfigModalOpen(false);
        } else {
          showToast(data.message, 'error');
          // Display the connection error message from probeErr
          setConfigError(data.message || 'Koneksi database gagal.');
        }
        // Always refresh status
        if (data.dbStatus) {
          setDbStatus(data.dbStatus);
        } else {
          const statusRes = await fetch('/api/db-status');
          if (statusRes.ok) {
            setDbStatus(await statusRes.json());
          }
        }
        // Force refresh reports
        if (activeView === 'customer') {
          fetchCustomCustomerReport(selectedYear, endDateOption, customEndDate);
        } else if (activeView === 'proyek_selesai') {
          fetchProjectReport('selesai', selectedYear, endDateOption, customEndDate);
          if (selectedCusCode !== 'Semua') {
            fetchSelectedCustomerProyeks(selectedCusCode, selectedYear, 'selesai', endDateOption, customEndDate);
          }
        } else if (activeView === 'proyek_pengerjaan') {
          fetchProjectReport('pengerjaan', selectedYear, endDateOption, customEndDate);
          if (selectedCusCode !== 'Semua') {
            fetchSelectedCustomerProyeks(selectedCusCode, selectedYear, 'pengerjaan', endDateOption, customEndDate);
          }
        } else if (activeView === 'proyek_semua') {
          fetchProjectReport('semua', selectedYear, endDateOption, customEndDate);
          if (selectedCusCode !== 'Semua') {
            fetchSelectedCustomerProyeks(selectedCusCode, selectedYear, 'semua', endDateOption, customEndDate);
          }
        }
        fetchPkpCustomers();
      } else {
        const errMsg = data.error || 'Gagal menyimpan konfigurasi.';
        showToast(errMsg, 'error');
        setConfigError(errMsg);
      }
    } catch (err: any) {
      console.error(err);
      const networkErrMsg = 'Gagal menghubungi backend server. Pastikan server Express aktif.';
      showToast(networkErrMsg, 'error');
      setConfigError(networkErrMsg);
    } finally {
      setConfigSubmitting(false);
    }
  };

  // Handle resetting the config back to JSON sandbox files
  const handleResetConfig = async () => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus konfigurasi VPS dan kembali ke Sandbox JSON Lokal?')) {
      return;
    }
    setConfigSubmitting(true);
    try {
      const res = await fetch('/api/db-config/reset', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message, 'info');
        setDbStatus(data.dbStatus);
        setDbHost('');
        setDbUser('');
        setDbPassword('');
        setDbName('');
        setIsConfigModalOpen(false);
        // Refresh views to use local sandbox simulated queries
        if (activeView === 'customer') {
          fetchCustomCustomerReport(selectedYear, endDateOption, customEndDate);
        } else if (activeView === 'proyek_selesai') {
          fetchProjectReport('selesai', selectedYear, endDateOption, customEndDate);
          if (selectedCusCode !== 'Semua') {
            fetchSelectedCustomerProyeks(selectedCusCode, selectedYear, 'selesai', endDateOption, customEndDate);
          }
        } else if (activeView === 'proyek_pengerjaan') {
          fetchProjectReport('pengerjaan', selectedYear, endDateOption, customEndDate);
          if (selectedCusCode !== 'Semua') {
            fetchSelectedCustomerProyeks(selectedCusCode, selectedYear, 'pengerjaan', endDateOption, customEndDate);
          }
        } else if (activeView === 'proyek_semua') {
          fetchProjectReport('semua', selectedYear, endDateOption, customEndDate);
          if (selectedCusCode !== 'Semua') {
            fetchSelectedCustomerProyeks(selectedCusCode, selectedYear, 'semua', endDateOption, customEndDate);
          }
        }
        fetchPkpCustomers();
      } else {
        showToast(data.error || 'Gagal mereset konfigurasi.', 'error');
      }
    } catch (err: any) {
      console.error(err);
      showToast('Gagal menghubungi backend server.', 'error');
    } finally {
      setConfigSubmitting(false);
    }
  };

  // Fetch sales and database status
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch DB status info
      const statusRes = await fetch('/api/db-status');
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setDbStatus(statusData);
        if (statusData.host) setDbHost(statusData.host);
        if (statusData.user) setDbUser(statusData.user);
        if (statusData.database) setDbName(statusData.database);
      }

      // Initialize salesData as empty since we only use proyek and mas_customer
      setSalesData([]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Koneksi ke backend Express terputus.');
      showToast('Gagal memuat status database. Periksa apakah Express server berjalan.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch PKP Customers list for ComboBox dropdown
  const fetchPkpCustomers = async () => {
    try {
      const res = await fetch('/api/mas-customer/pkp');
      if (res.ok) {
        const json = await res.json();
        setPkpCustomers(json.data);
      }
    } catch (err) {
      console.error('Gagal memuat list PKP customer:', err);
    }
  };

  // Fetch specific details for a selected customer (or ALL customers for proyek_pengerjaan view)
  const fetchSelectedCustomerProyeks = async (
    cusCode: string = selectedCusCode, 
    year: number = selectedYear, 
    status: 'selesai' | 'pengerjaan' | 'pengerjaan_all' | 'semua' = activeView === 'proyek_pengerjaan_all' ? 'pengerjaan_all' : (activeView === 'proyek_pengerjaan' ? 'pengerjaan' : (activeView === 'proyek_semua' ? 'semua' : 'selesai')),
    endOpt: 'today' | 'custom' = endDateOption,
    customEnd: string = customEndDate
  ) => {
    if (!cusCode || (cusCode === 'Semua' && activeView !== 'proyek_pengerjaan_all' && status !== 'pengerjaan_all')) {
      setSelectedCustomerProyeks([]);
      setSelectedCustomerProyeksMeta(null);
      return;
    }
    setSelectedCustomerProyeksLoading(true);
    setSelectedCustomerProyeksError(null);
    try {
      const startOfYearStr = `${year}-01-01`;
      const endStr = getEffectiveEndDate(year, endOpt, customEnd);
      const res = await fetch(`/api/laporan/proyek-detail?cus_code=${encodeURIComponent(cusCode)}&year=${year}&status=${status}&start=${startOfYearStr}&end=${endStr}`);
      if (!res.ok) {
        throw new Error('Gagal memuat rincian detail proyek.');
      }
      const json = await res.json();
      setSelectedCustomerProyeks(json.data);
      setSelectedCustomerProyeksMeta({
        source: json.source,
        query: json.queryExecuted
      });
    } catch (err: any) {
      console.error(err);
      setSelectedCustomerProyeksError(err.message || 'Gagal memuat rincian proyek.');
    } finally {
      setSelectedCustomerProyeksLoading(false);
    }
  };

  // Filtered project report by selected customer code
  const filteredProjectReport = useMemo(() => {
    if ((activeView === 'proyek_selesai' || activeView === 'proyek_pengerjaan' || activeView === 'proyek_semua') && selectedCusCode !== 'Semua') {
      return projectReport.filter((p: any) => p.Cus_Code === selectedCusCode);
    }
    return projectReport;
  }, [projectReport, selectedCusCode, activeView]);

  useEffect(() => {
    fetchData();
    fetchPkpCustomers();
  }, []);

  // Fetch custom customer report (SQL query specific)
  const fetchCustomCustomerReport = async (
    year: number = selectedYear,
    endOpt: 'today' | 'custom' = endDateOption,
    customEnd: string = customEndDate
  ) => {
    setCustomReportLoading(true);
    setCustomReportError(null);
    try {
      const startOfYearStr = `${year}-01-01`;
      const todayStr = getEffectiveEndDate(year, endOpt, customEnd);

      const res = await fetch(`/api/laporan/penjualan-customer?start=${startOfYearStr}&end=${todayStr}`);
      if (!res.ok) {
        throw new Error('Gagal memuat laporan kustom per customer.');
      }
      const json = await res.json();
      setCustomCustomerReport(json.data);
      setCustomReportMeta({
        source: json.source,
        query: json.queryExecuted
      });
    } catch (err: any) {
      console.error(err);
      setCustomReportError(err.message || 'Gagal memuat data laporan.');
      showToast('Gagal memuat Laporan Penjualan Per Customer.', 'error');
    } finally {
      setCustomReportLoading(false);
    }
  };

  // Fetch Laporan Penjualan Per Proyek
  const fetchProjectReport = async (
    status: 'selesai' | 'pengerjaan' | 'semua',
    year: number = selectedYear,
    endOpt: 'today' | 'custom' = endDateOption,
    customEnd: string = customEndDate
  ) => {
    setProjectReportLoading(true);
    setProjectReportError(null);
    try {
      const startOfYearStr = `${year}-01-01`;
      const endStr = getEffectiveEndDate(year, endOpt, customEnd);

      const res = await fetch(`/api/laporan/proyek?status=${status}&year=${year}&start=${startOfYearStr}&end=${endStr}`);
      if (!res.ok) {
        throw new Error('Gagal memuat laporan proyek.');
      }
      const json = await res.json();
      setProjectReport(json.data);
      setProjectReportMeta({
        source: json.source,
        query: json.queryExecuted
      });
    } catch (err: any) {
      console.error(err);
      setProjectReportError(err.message || 'Gagal memuat data laporan.');
      showToast('Gagal memuat Laporan Penjualan Per Proyek.', 'error');
    } finally {
      setProjectReportLoading(false);
    }
  };

  useEffect(() => {
    setShowCategoryPage(false);
    setShowVoucherPage(false);
    fetchMonthlyTrend(selectedYear);
    if (activeView === 'rap') {
      fetchRapReport(selectedYear, endDateOption, customEndDate, selectedRapCusCode);
    } else if (activeView === 'overhead') {
      fetchOverheadReport(selectedYear, endDateOption, customEndDate);
    } else if (activeView === 'customer') {
      fetchCustomCustomerReport(selectedYear, endDateOption, customEndDate);
    } else if (activeView === 'proyek_selesai') {
      fetchProjectReport('selesai', selectedYear, endDateOption, customEndDate);
      if (selectedCusCode !== 'Semua') {
        fetchSelectedCustomerProyeks(selectedCusCode, selectedYear, 'selesai', endDateOption, customEndDate);
      }
    } else if (activeView === 'proyek_pengerjaan') {
      fetchProjectReport('pengerjaan', selectedYear, endDateOption, customEndDate);
      if (selectedCusCode !== 'Semua') {
        fetchSelectedCustomerProyeks(selectedCusCode, selectedYear, 'pengerjaan', endDateOption, customEndDate);
      }
    } else if (activeView === 'proyek_pengerjaan_all') {
      fetchProjectReport('pengerjaan', selectedYear, endDateOption, customEndDate);
      fetchSelectedCustomerProyeks('Semua', selectedYear, 'pengerjaan_all', endDateOption, customEndDate);
    } else if (activeView === 'proyek_semua') {
      fetchProjectReport('semua', selectedYear, endDateOption, customEndDate);
      if (selectedCusCode !== 'Semua') {
        fetchSelectedCustomerProyeks(selectedCusCode, selectedYear, 'semua', endDateOption, customEndDate);
      }
    }
  }, [activeView, selectedYear, selectedCusCode, selectedRapCusCode, endDateOption, customEndDate]);



  // Helper to generate JPU Logo SVG for PDF Report Headers (Top Left position - identical to Sidebar Header)
  const getLogoSvgHtml = (_section?: string) => `
    <div style="background: #ffffff; padding: 5px 12px; border-radius: 9999px; border: 3px solid #2563eb; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.15); vertical-align: middle;">
      <img src="${JPU_LOGO_SVG_BASE64}" alt="Logo PT Jakarta Prima Utama" style="width: 58px; height: 42px; object-fit: contain; display: block;" />
    </div>
  `;

  // Handle Printing any active report view to PDF
  const handlePrintPdf = () => {
    const effectiveEndDate = getEffectiveEndDate(selectedYear, endDateOption, customEndDate);
    const printDateStr = formatDateIndo(new Date().toISOString().split('T')[0]);

    let printHtml = '';

    if (activeView === 'rap') {
      const totalTotpro = rapReportData.reduce((acc: number, item: any) => acc + Number(item.totpro || 0), 0);
      const totalRap = rapReportData.reduce((acc: number, item: any) => acc + Number(item.Nilai_RAP || 0), 0);
      const totalBiaya = rapReportData.reduce((acc: number, item: any) => acc + Number(item.Total_Biaya || 0), 0);
      const totalSelisih = rapReportData.reduce((acc: number, item: any) => acc + Number(item.Selisih || 0), 0);
      const isEfisien = totalSelisih >= 0;

      const rowsHtml = rapReportData.map((item: any, idx: number) => {
        const rowBg = idx % 2 === 1 ? 'background-color: #f8fafc;' : '#ffffff';
        return `
          <tr style="${rowBg}">
            <td style="padding: 7px 8px; text-align: center; font-family: monospace; font-size: 11.5px; border-bottom: 1px solid #e2e8f0; color: #64748b;">${idx + 1}</td>
            <td style="padding: 7px 8px; font-weight: 700; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${item.Cus_Name || '-'}</td>
            <td style="padding: 7px 8px; text-align: right; font-family: monospace; font-size: 11.5px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${formatRupiah(Number(item.totpro || 0))}</td>
            <td style="padding: 7px 8px; text-align: right; font-family: monospace; font-size: 11.5px; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #1e3a8a;">${formatRupiah(Number(item.Nilai_RAP || 0))}</td>
            <td style="padding: 7px 8px; text-align: right; font-family: monospace; font-size: 11.5px; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #4338ca;">${formatRupiah(Number(item.Total_Biaya || 0))}</td>
            <td style="padding: 7px 8px; text-align: right; font-family: monospace; font-size: 11.5px; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: ${Number(item.Selisih || 0) >= 0 ? '#059669' : '#e11d48'};">${formatRupiah(Number(item.Selisih || 0))}</td>
          </tr>
        `;
      }).join('');

      printHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>&#10240;</title>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
            <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Playball&family=Pacifico&display=swap" rel="stylesheet" />
            <style>
              * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
              @media screen {
                html { background-color: #f1f5f9; padding: 20px 16px; min-height: 100vh; }
                body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; background: #ffffff !important; max-width: 980px; margin: 0 auto !important; padding: 24px 28px !important; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05); border: 1px solid #cbd5e1; font-size: 11px; line-height: 1.4; }
              }
              @media print {
                @page { size: A4 portrait; margin: 0; }
                html, body { margin: 0 !important; padding: 6mm 3mm 6mm 3mm !important; background: #ffffff !important; box-shadow: none !important; border: none !important; max-width: none !important; width: 100% !important; }
              }
              body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; font-size: 11px; line-height: 1.4; }
              .header { border-bottom: 3px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px; }
              .header-table { display: table; width: 100%; }
              .header-left { display: table-cell; vertical-align: middle; }
              .header-right { display: table-cell; vertical-align: top; text-align: right; }
              .title { font-size: 15px; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase; }
              .subtitle { font-size: 11px; color: #475569; margin-top: 3px; font-weight: 600; }
              .kpi-grid { display: table; width: 100%; border-spacing: 6px; margin-bottom: 14px; page-break-inside: avoid; }
              .kpi-card { display: table-cell; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 10px; background: #f8fafc !important; }
              .kpi-label { font-size: 9.5px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 3px; }
              .kpi-val { font-size: 12.5px; font-weight: 800; font-family: monospace; color: #0f172a; }
              .table-main { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 10.5px; }
              .table-main thead { display: table-header-group !important; }
              .table-main th { background-color: #0f172a !important; color: #ffffff !important; padding: 4px 6px 6px 6px !important; font-weight: 800; text-align: center !important; vertical-align: middle !important; text-transform: uppercase; font-size: 9.5px; height: 24px; }
              .table-main tr { page-break-inside: avoid !important; }
              .total-row { background-color: #f1f5f9 !important; font-weight: 800; }
              .total-row td { padding: 6px 6px; border-top: 2px solid #0f172a; border-bottom: 1px solid #cbd5e1; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="header-table">
                <div style="display: table-cell; vertical-align: middle; width: 100px; padding-right: 12px;">
                  ${getLogoSvgHtml('print-rap')}
                </div>
                <div class="header-left">
                  <div style="font-size: 9px; font-weight: 800; color: #475569; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 2px;">PT JAKARTA PRIMA UTAMA</div>
                  <h1 class="title">Laporan Perhitungan RAP</h1>
                  <div class="subtitle">Tahun Laporan: ${selectedYear} &bull; Periode s/d: ${formatDateIndo(effectiveEndDate)}</div>
                </div>
                <div class="header-right">
                  <div style="font-size: 11.5px; font-weight: 700; color: #1e293b;">Dicetak: <span style="font-family: monospace; font-size: 12px; font-weight: 700; color: #0f172a;">${printDateStr}</span></div>
                  <div style="font-size: 11px; font-weight: 700; color: #1e293b; margin-top: 2px;">Admin: <span style="font-family: monospace; font-size: 11.5px; font-weight: 800; color: #0f172a;">${loggedInUser?.User_Name || 'Admin JPU'} (${loggedInUser?.User_ID || 'SDM'})</span></div>
                </div>
              </div>
            </div>

            <div class="kpi-grid">
              <div class="kpi-card">
                <div class="kpi-label">Nilai Proyek Bersih</div>
                <div class="kpi-val">${formatRupiah(totalTotpro)}</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label">Nilai RAP</div>
                <div class="kpi-val" style="color: #1e3a8a;">${formatRupiah(totalRap)}</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label">Total Biaya</div>
                <div class="kpi-val" style="color: #4338ca;">${formatRupiah(totalBiaya)}</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label">Selisih RAP</div>
                <div class="kpi-val" style="color: ${isEfisien ? '#059669' : '#e11d48'};">
                  ${formatRupiah(totalSelisih)}
                </div>
              </div>
            </div>

            <table class="table-main">
              <thead>
                <tr>
                  <th style="width: 28px; text-align: center;">No</th>
                  <th style="text-align: center;">Nama Customer</th>
                  <th style="width: 120px; text-align: center;">Nilai Proyek</th>
                  <th style="width: 120px; text-align: center;">Nilai RAP</th>
                  <th style="width: 120px; text-align: center;">Total Biaya</th>
                  <th style="width: 120px; text-align: center;">Selisih</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
                <tr class="total-row">
                  <td colSpan="2" style="text-align: right; text-transform: uppercase;">TOTAL KESELURUHAN:</td>
                  <td style="text-align: right; font-family: monospace; font-size: 12px;">${formatRupiah(totalTotpro)}</td>
                  <td style="text-align: right; font-family: monospace; font-size: 12px; color: #1e3a8a;">${formatRupiah(totalRap)}</td>
                  <td style="text-align: right; font-family: monospace; font-size: 12px; color: #4338ca;">${formatRupiah(totalBiaya)}</td>
                  <td style="text-align: right; font-family: monospace; font-size: 12px; color: ${totalSelisih >= 0 ? '#059669' : '#e11d48'};">${formatRupiah(totalSelisih)}</td>
                </tr>
              </tbody>
            </table>
          </body>
        </html>
      `;
    } else if (activeView === 'overhead') {
      const summary = overheadReportData?.summary || {};
      const itemsList: any[] = overheadReportData?.items || [];
      const totalNilaiProNet = summary.totalNilaiProNet || 0;
      const targetOverhead25 = summary.targetOverhead25 || 0;
      const debtAccIds = ['002002', '002004', '050300'];
      const isDebtAccount = (accId: any) => debtAccIds.includes(String(accId || '').trim());

      const totalRealisasiOverhead = itemsList.reduce((acc: number, it: any) => {
        if (pembayaranHutangOption === 'tidak_hitung' && isDebtAccount(it.Acc_ID)) {
          return acc;
        }
        return acc + Number(it.Total_Jumlah || 0);
      }, 0);

      const selisihEfisiensi = targetOverhead25 - totalRealisasiOverhead;
      const isEfisien = selisihEfisiensi >= 0;

      const rowsHtml = itemsList.map((item: any, idx: number) => {
        const isDebt = isDebtAccount(item.Acc_ID);
        const isExcluded = pembayaranHutangOption === 'tidak_hitung' && isDebt;
        const ratio = totalRealisasiOverhead > 0 && !isExcluded 
          ? ((Number(item.Total_Jumlah) / totalRealisasiOverhead) * 100).toFixed(1) 
          : '0.0';

        const rowBg = isDebt ? 'background-color: #fffbeb;' : (idx % 2 === 1 ? 'background-color: #f8fafc;' : '#ffffff');
        const amountText = isExcluded 
          ? `<span style="text-decoration: line-through; color: #94a3b8;">${formatRupiah(Number(item.Total_Jumlah))}</span>`
          : formatRupiah(Number(item.Total_Jumlah));

        return `
          <tr style="${rowBg}">
            <td style="padding: 7px 10px; text-align: center; font-family: monospace; font-size: 11.5px; border-bottom: 1px solid #e2e8f0; color: #64748b;">${idx + 1}</td>
            <td style="padding: 7px 10px; font-family: monospace; font-weight: bold; font-size: 11.5px; border-bottom: 1px solid #e2e8f0;">
              ${isDebt ? `<span style="padding: 2px 6px; background-color: #f59e0b; color: #ffffff; border-radius: 4px; font-weight: 800; font-size: 11px;">${item.Acc_ID}</span>` : `<span style="color: #1e3a8a;">${item.Acc_ID}</span>`}
            </td>
            <td style="padding: 7px 10px; font-weight: 700; border-bottom: 1px solid #e2e8f0; color: #0f172a;">
              ${item.Acc_Name}
              ${isDebt ? `<span style="font-size: 10px; padding: 2px 6px; background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 4px; margin-left: 6px; color: #92400e; font-weight: bold;">Pembayaran Hutang</span>` : ''}
            </td>
            <td style="padding: 7px 10px; text-align: center; font-family: monospace; font-size: 11.5px; border-bottom: 1px solid #e2e8f0; color: #4338ca; font-weight: 600;">${item.Total_Voucher} Transaksi</td>
            <td style="padding: 7px 10px; text-align: right; font-family: monospace; font-size: 11.5px; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${amountText}</td>
            <td style="padding: 7px 10px; text-align: right; font-family: monospace; font-size: 11.5px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${isExcluded ? '<span style="color: #d97706;">0.0% (Excl.)</span>' : ratio + '%'}</td>
          </tr>
        `;
      }).join('');

      printHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>&#10240;</title>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
            <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Playball&family=Pacifico&display=swap" rel="stylesheet" />
            <style>
              * {
                box-sizing: border-box;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              @media screen {
                html { background-color: #f1f5f9; padding: 20px 16px; min-height: 100vh; }
                body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; background: #ffffff !important; max-width: 980px; margin: 0 auto !important; padding: 24px 28px !important; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05); border: 1px solid #cbd5e1; font-size: 11px; line-height: 1.4; }
              }
              @media print {
                @page { size: A4 portrait; margin: 0; }
                html, body { margin: 0 !important; padding: 6mm 3mm 6mm 3mm !important; background: #ffffff !important; box-shadow: none !important; border: none !important; max-width: none !important; width: 100% !important; }
              }
              body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; font-size: 11px; line-height: 1.4; }
              .header { border-bottom: 3px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px; }
              .header-table { display: table; width: 100%; }
              .header-left { display: table-cell; vertical-align: middle; }
              .header-right { display: table-cell; vertical-align: top; text-align: right; }
              .title { font-size: 16px; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; }
              .subtitle { font-size: 11px; color: #475569; margin-top: 3px; font-weight: 600; }
              .kpi-grid { display: table; width: 100%; border-spacing: 6px; margin-bottom: 14px; page-break-inside: avoid; }
              .kpi-card { display: table-cell; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 10px; background: #f8fafc !important; }
              .kpi-label { font-size: 9.5px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 3px; }
              .kpi-val { font-size: 12.5px; font-weight: 800; font-family: monospace; color: #0f172a; }
              .table-main { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 11px; page-break-inside: auto; }
              .table-main thead { display: table-header-group !important; break-inside: avoid !important; page-break-inside: avoid !important; }
              .table-main th {
                background-color: #0f172a !important;
                color: #ffffff !important;
                padding: 4px 6px 6px 6px !important;
                font-weight: 800;
                text-align: center !important;
                vertical-align: middle !important;
                text-transform: uppercase;
                font-size: 10px;
                letter-spacing: 0.5px;
                line-height: 1.1;
                height: 24px;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .table-main tr { page-break-inside: avoid !important; break-inside: avoid !important; }
              .table-main td { border-bottom: 1px solid #e2e8f0; }
              .total-row { background-color: #f1f5f9 !important; font-weight: 800; }
              .total-row td { padding: 8px 10px; border-top: 2px solid #0f172a; border-bottom: 1px solid #cbd5e1; }
              .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #cbd5e1; font-size: 10px; color: #64748b; page-break-inside: avoid; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="header-table">
                <div style="display: table-cell; vertical-align: middle; width: 100px; padding-right: 12px;">
                  ${getLogoSvgHtml('print-overhead')}
                </div>
                <div class="header-left">
                  <div style="font-size: 9px; font-weight: 800; color: #475569; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 2px;">PT JAKARTA PRIMA UTAMA</div>
                  <h1 class="title">Laporan Perhitungan & Simulasi Overhead</h1>
                  <div class="subtitle">Divisi: Off & Wks &bull; Tahun Laporan: ${selectedYear} &bull; Periode s/d: ${formatDateIndo(effectiveEndDate)}</div>
                </div>
                <div class="header-right">
                  <div style="padding: 5px 10px; background-color: #0f172a; color: #fbbf24; font-weight: 800; font-size: 11px; border-radius: 6px; text-transform: uppercase; display: inline-block; letter-spacing: 0.3px;">
                    OPSI: ${pembayaranHutangOption === 'hitung' ? 'PEMBAYARAN HUTANG DIHITUNG' : 'PEMBAYARAN HUTANG TIDAK DIHITUNG'}
                  </div>
                  <div style="font-size: 11.5px; font-weight: 700; color: #1e293b; margin-top: 4px;">Dicetak: <span style="font-family: monospace; font-size: 12px; font-weight: 700; color: #0f172a;">${printDateStr}</span></div>
                  <div style="font-size: 11px; font-weight: 700; color: #1e293b; margin-top: 2px;">Admin: <span style="font-family: monospace; font-size: 11.5px; font-weight: 800; color: #0f172a;">${loggedInUser?.User_Name || 'Admin JPU'} (${loggedInUser?.User_ID || 'SDM'})</span></div>
                </div>
              </div>
            </div>

            <div class="kpi-grid">
              <div class="kpi-card">
                <div class="kpi-label">Nilai Proyek Bersih (-2.65%)</div>
                <div class="kpi-val">${formatRupiah(totalNilaiProNet)}</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label">Target Overhead (25%)</div>
                <div class="kpi-val" style="color: #1e3a8a;">${formatRupiah(targetOverhead25)}</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label">Realisasi Overhead</div>
                <div class="kpi-val" style="color: #6d28d9;">${formatRupiah(totalRealisasiOverhead)}</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label">Status Efisiensi</div>
                <div class="kpi-val" style="color: ${isEfisien ? '#059669' : '#e11d48'};">
                  ${isEfisien ? `EFISIEN (+${formatRupiah(selisihEfisiensi)})` : `MELEBIHI (${formatRupiah(selisihEfisiensi)})`}
                </div>
              </div>
            </div>

            <h3 style="margin: 8px 0 2px 0; font-size: 11px; text-transform: uppercase; color: #334155; font-weight: 800;">Rincian Komponen Biaya Overhead</h3>
            <table class="table-main">
              <thead>
                <tr>
                  <th style="width: 35px; text-align: center;">No</th>
                  <th style="width: 75px; text-align: center;">Kode</th>
                  <th style="text-align: center;">Nama Rekening Biaya</th>
                  <th style="width: 100px; text-align: center;">Jml Transaksi</th>
                  <th style="width: 140px; text-align: center;">Total Biaya (Rp)</th>
                  <th style="width: 85px; text-align: center;">Rasio (%)</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
                <tr class="total-row">
                  <td colspan="4" style="text-align: right; text-transform: uppercase; font-size: 10.5px;">TOTAL REALISASI OVERHEAD (Divisi Off & Wks):</td>
                  <td style="text-align: right; font-family: monospace; font-size: 12px; color: #0f172a; font-weight: 800;">${formatRupiah(totalRealisasiOverhead)}</td>
                  <td style="text-align: right; font-family: monospace; font-size: 12px; color: #0f172a;">100.0%</td>
                </tr>
                <tr class="total-row" style="background-color: #ffffff !important; color: #475569;">
                  <td colspan="4" style="text-align: right; text-transform: uppercase; font-size: 10.5px;">NILAI TARGET OVERHEAD (25% dari Net Nilai_Pro):</td>
                  <td style="text-align: right; font-family: monospace; color: #1e3a8a; font-size: 12px; font-weight: 800;">${formatRupiah(targetOverhead25)}</td>
                  <td style="text-align: right; font-family: monospace; color: #1e3a8a; font-size: 12px;">25.0%</td>
                </tr>
              </tbody>
            </table>
          </body>
        </html>
      `;
    } else if (activeView === 'customer') {
      const totalNilaiProyek = customCustomerReport.reduce((acc, item) => acc + Number(item.totpro), 0);
      const topCustomerObj = customCustomerReport.reduce((max, item) => Number(item.totpro) > Number(max.totpro) ? item : max, customCustomerReport[0] || { Cus_Name: '-' });
      const topCustomer = topCustomerObj ? topCustomerObj.Cus_Name : '-';
      const avgPerCustomer = Math.round(totalNilaiProyek / (customCustomerReport.length || 1));

      const rowsHtml = customCustomerReport.map((item, idx) => {
        const itemVal = Number(item.totpro);
        const percentageOfTotal = totalNilaiProyek > 0 ? ((itemVal / totalNilaiProyek) * 100).toFixed(1) : '0.0';
        const rowBg = idx % 2 === 1 ? 'background-color: #f8fafc;' : '#ffffff';

        return `
          <tr style="${rowBg}">
            <td style="padding: 8px 10px; text-align: center; font-family: monospace; font-size: 11.5px; border-bottom: 1px solid #e2e8f0; color: #64748b;">${idx + 1}</td>
            <td style="padding: 8px 10px; font-family: monospace; font-size: 11.5px; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #1e3a8a; text-align: center;">
              ${item.Cus_Code}
            </td>
            <td style="padding: 8px 10px; font-weight: 700; border-bottom: 1px solid #e2e8f0; color: #0f172a;">
              ${item.Cus_Name}
            </td>
            <td style="padding: 8px 10px; text-align: right; font-family: monospace; font-size: 11.5px; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #0f172a;">
              ${formatRupiah(itemVal)}
            </td>
            <td style="padding: 8px 10px; text-align: right; font-family: monospace; font-size: 11.5px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #4338ca;">
              ${percentageOfTotal}%
            </td>
          </tr>
        `;
      }).join('');

      printHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>&#10240;</title>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
            <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Playball&family=Pacifico&display=swap" rel="stylesheet" />
            <style>
              * {
                box-sizing: border-box;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              @media screen {
                html { background-color: #f1f5f9; padding: 20px 16px; min-height: 100vh; }
                body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; background: #ffffff !important; max-width: 980px; margin: 0 auto !important; padding: 24px 28px !important; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05); border: 1px solid #cbd5e1; font-size: 11px; line-height: 1.4; }
              }
              @media print {
                @page { size: A4 portrait; margin: 0; }
                html, body { margin: 0 !important; padding: 6mm 3mm 6mm 3mm !important; background: #ffffff !important; box-shadow: none !important; border: none !important; max-width: none !important; width: 100% !important; }
              }
              body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; font-size: 11px; line-height: 1.4; }
              .header { border-bottom: 3px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px; }
              .header-table { display: table; width: 100%; }
              .header-left { display: table-cell; vertical-align: middle; }
              .header-right { display: table-cell; vertical-align: top; text-align: right; }
              .title { font-size: 16px; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; }
              .subtitle { font-size: 11px; color: #475569; margin-top: 3px; font-weight: 600; }
              .kpi-grid { display: table; width: 100%; border-spacing: 6px; margin-bottom: 14px; page-break-inside: avoid; }
              .kpi-card { display: table-cell; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 10px; background: #f8fafc !important; }
              .kpi-label { font-size: 9.5px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 3px; }
              .kpi-val { font-size: 12.5px; font-weight: 800; font-family: monospace; color: #0f172a; }
              .table-main { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 11px; page-break-inside: auto; }
              .table-main thead { display: table-header-group !important; break-inside: avoid !important; page-break-inside: avoid !important; }
              .table-main th {
                background-color: #0f172a !important;
                color: #ffffff !important;
                padding: 4px 6px 6px 6px !important;
                font-weight: 800;
                text-align: center !important;
                vertical-align: middle !important;
                text-transform: uppercase;
                font-size: 10px;
                letter-spacing: 0.5px;
                line-height: 1.1;
                height: 24px;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .table-main tr { page-break-inside: avoid !important; break-inside: avoid !important; }
              .table-main td { border-bottom: 1px solid #e2e8f0; }
              .total-row { background-color: #f1f5f9 !important; font-weight: 800; }
              .total-row td { padding: 8px 6px; border-top: 2px solid #0f172a; border-bottom: 1px solid #cbd5e1; }
              .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #cbd5e1; font-size: 10px; color: #64748b; page-break-inside: avoid; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="header-table">
                <div style="display: table-cell; vertical-align: middle; width: 100px; padding-right: 12px;">
                  ${getLogoSvgHtml('print-customer')}
                </div>
                <div class="header-left">
                  <div style="font-size: 9px; font-weight: 800; color: #475569; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 2px;">PT JAKARTA PRIMA UTAMA</div>
                  <h1 class="title">Laporan Penjualan Per Customer</h1>
                  <div class="subtitle">Rekapitulasi Penjualan Bersih &bull; Tahun Laporan: ${selectedYear} &bull; Periode s/d: ${formatDateIndo(effectiveEndDate)}</div>
                </div>
                <div class="header-right">
                  <div style="font-size: 11.5px; font-weight: 700; color: #1e293b; margin-top: 4px;">Dicetak: <span style="font-family: monospace; font-size: 12px; font-weight: 700; color: #0f172a;">${printDateStr}</span></div>
                  <div style="font-size: 11px; font-weight: 700; color: #1e293b; margin-top: 2px;">User: <span style="font-family: monospace; font-size: 11.5px; font-weight: 800; color: #0f172a;">${loggedInUser?.User_Name || 'User JPU'} (${loggedInUser?.User_ID || 'SDM'})</span></div>
                </div>
              </div>
            </div>

            <div class="kpi-grid">
              <div class="kpi-card">
                <div class="kpi-label">Total Nilai Proyek</div>
                <div class="kpi-val">${formatRupiah(totalNilaiProyek)}</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label">Jumlah Customer</div>
                <div class="kpi-val" style="color: #4338ca;">${customCustomerReport.length} Entitas</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label">Kontributor Tertinggi</div>
                <div class="kpi-val" style="font-size: 11px; color: #059669; word-break: break-word;">${topCustomer}</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label">Rata-rata Per Customer</div>
                <div class="kpi-val" style="color: #d97706;">${formatRupiah(avgPerCustomer)}</div>
              </div>
            </div>

            <h3 style="margin: 8px 0 2px 0; font-size: 11px; text-transform: uppercase; color: #334155; font-weight: 800; letter-spacing: 0.5px;">Rincian Penjualan Bersih Per Customer</h3>
            <table class="table-main">
              <thead>
                <tr>
                  <th style="width: 30px; text-align: center;">No</th>
                  <th style="width: 60px; text-align: center;">KODE</th>
                  <th style="text-align: center;">CUSTOMER</th>
                  <th style="width: 135px; text-align: center;">TOTAL</th>
                  <th style="width: 80px; text-align: center;">Proporsi (%)</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
                <tr class="total-row">
                  <td colspan="3" style="text-align: right; text-transform: uppercase; font-size: 10.5px;">TOTAL PENJUALAN PER CUSTOMER:</td>
                  <td style="text-align: right; font-family: monospace; font-size: 12px; color: #0f172a; font-weight: 800;">${formatRupiah(totalNilaiProyek)}</td>
                  <td style="text-align: right; font-family: monospace; font-size: 11px; color: #0f172a;">100.0%</td>
                </tr>
              </tbody>
            </table>

            <div class="footer">
              <div>Keterangan : Total adalah Total Nilai Poyek Per Customer Setelah diKurangi PPh 2.65%</div>
            </div>
          </body>
        </html>
      `;
    } else if (activeView === 'proyek_selesai' || activeView === 'proyek_pengerjaan' || activeView === 'proyek_pengerjaan_all' || activeView === 'proyek_semua') {
      if (selectedCusCode === 'Semua' && activeView !== 'proyek_pengerjaan_all') {
        showToast('Silakan pilih Customer terlebih dahulu untuk mencetak Laporan Proyek.', 'info');
        return;
      }
      const viewLabel = activeView === 'proyek_pengerjaan_all' 
        ? 'Proyek Dalam Pengerjaan (Semua Customer)' 
        : (activeView === 'proyek_pengerjaan' ? 'Proyek Belum Selesai' : (activeView === 'proyek_semua' ? 'Gabungan Selesai & Belum' : 'Proyek Selesai (100%)'));
      const hasProgress = activeView === 'proyek_pengerjaan' || activeView === 'proyek_pengerjaan_all' || activeView === 'proyek_semua';
      const isScaled = activeView === 'proyek_pengerjaan' || activeView === 'proyek_pengerjaan_all' || activeView === 'proyek_semua';

      const selectedCusObj = pkpCustomers.find(c => String(c.Cus_Code).trim() === String(selectedCusCode).trim());
      const selectedCusName = activeView === 'proyek_pengerjaan_all' || selectedCusCode === 'Semua'
        ? 'Semua Customer (PKP)'
        : (selectedCusObj 
          ? selectedCusObj.Cus_Name 
          : (selectedCustomerProyeks[0]?.cus_name || selectedCustomerProyeks[0]?.Cus_Name || selectedCusCode));

      const sortedProyeks = [...selectedCustomerProyeks].sort((a, b) => {
        const cusA = (a.Cus_Name || a.cus_name || a.Cus_Code || '').trim();
        const cusB = (b.Cus_Name || b.cus_name || b.Cus_Code || '').trim();
        const cusCompare = cusA.localeCompare(cusB, 'id', { sensitivity: 'base' });
        if (cusCompare !== 0) return cusCompare;

        const isAMenampung = (a.no_po || a.No_PO || '').trim().toLowerCase() === 'menampung biaya';
        const isBMenampung = (b.no_po || b.No_PO || '').trim().toLowerCase() === 'menampung biaya';
        if (isAMenampung && !isBMenampung) return 1;
        if (!isAMenampung && isBMenampung) return -1;
        const dateA = a.tgl_proyek || a.Tgl_Proyek || '';
        const dateB = b.tgl_proyek || b.Tgl_Proyek || '';
        return dateA.localeCompare(dateB);
      });

      let totalNilaiProSum = 0;
      let totalRapSum = 0;
      let totalBiayaSum = 0;
      let totalSelisihSum = 0;

      const rowsHtml = sortedProyeks.map((item, idx) => {
        const { rap, selisih, biaya, totalContributionRap, totalContributionBiaya, totalContributionSelisih } = getItemRapAndSelisih(item, isScaled);
        const rawNilaiPro = Number(item.nilai_pro) || 0;
        totalNilaiProSum += rawNilaiPro;
        totalRapSum += totalContributionRap;
        totalBiayaSum += totalContributionBiaya;
        totalSelisihSum += totalContributionSelisih;

        const progressPercent = typeof item.Persen_Progress === 'number' || typeof item.Persen_Progress === 'string' ? Number(item.Persen_Progress) : 0;
        const rowBg = idx % 2 === 1 ? 'background-color: #f8fafc;' : '#ffffff';

        const cusLabel = item.Cus_Name || item.cus_name || item.Cus_Code || '-';
        const rawPo = (item.no_po || item.No_PO || '').trim();
        const isDashPo = !rawPo || rawPo === '-';
        const renderedPoHtml = isDashPo
          ? `<span style="display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 50%; border: 2px solid #2563eb; color: #1d4ed8; font-weight: 800; font-family: monospace; font-size: 11px; background-color: #eff6ff; line-height: 1;">-</span>`
          : rawPo;

        return `
          <tr style="${rowBg}">
            <td rowspan="2" style="padding: 6px 6px; text-align: center; font-family: monospace; font-size: 11px; border-bottom: 2px solid #0f172a; color: #475569; vertical-align: middle; border-right: 1px solid #e2e8f0;">${idx + 1}</td>
            <td style="padding: 5px 8px; font-weight: 800; border-bottom: 1px solid #e2e8f0; color: #b45309; white-space: nowrap; font-size: 10.5px;">${cusLabel}</td>
            <td colspan="${hasProgress ? 6 : 5}" style="padding: 5px 8px; font-weight: 700; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 10.5px; word-break: break-word; white-space: normal; line-height: 1.4;">${(item.keterangan || '-')}</td>
          </tr>
          <tr style="${rowBg}">
            <td style="padding: 5px 8px; font-family: monospace; font-size: 10.5px; border-bottom: 2px solid #cbd5e1; color: #000000; font-weight: 800; white-space: nowrap;">${renderedPoHtml}</td>
            <td style="padding: 5px 8px; text-align: center; font-family: monospace; font-size: 10.5px; border-bottom: 2px solid #cbd5e1; white-space: nowrap;">${formatDateIndo(item.tgl_proyek || item.Tgl_Proyek)}</td>
            ${hasProgress ? `<td style="padding: 5px 8px; text-align: center; font-family: monospace; font-size: 10.5px; border-bottom: 2px solid #cbd5e1; font-weight: bold;">${progressPercent}%</td>` : ''}
            <td style="padding: 5px 8px; text-align: right; font-family: monospace; font-size: 10.5px; border-bottom: 2px solid #cbd5e1; color: #0f172a; white-space: nowrap;">${formatRupiah(rawNilaiPro)}</td>
            <td style="padding: 5px 8px; text-align: right; font-family: monospace; font-size: 10.5px; font-weight: bold; border-bottom: 2px solid #cbd5e1; color: #1e3a8a; white-space: nowrap;">${formatRupiah(rap)}</td>
            <td style="padding: 5px 8px; text-align: right; font-family: monospace; font-size: 10.5px; font-weight: bold; border-bottom: 2px solid #cbd5e1; color: #4338ca; white-space: nowrap;">${formatRupiah(biaya)}</td>
            <td style="padding: 5px 8px; text-align: right; font-family: monospace; font-size: 10.5px; font-weight: bold; border-bottom: 2px solid #cbd5e1; color: ${selisih >= 0 ? '#059669' : '#e11d48'}; white-space: nowrap;">${formatRupiah(selisih)}</td>
          </tr>
        `;
      }).join('');

      printHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>&#10240;</title>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
            <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Playball&family=Pacifico&display=swap" rel="stylesheet" />
            <style>
              * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
              @media screen {
                html { background-color: #f1f5f9; padding: 20px 16px; min-height: 100vh; }
                body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; background: #ffffff !important; max-width: 980px; margin: 0 auto !important; padding: 24px 28px !important; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05); border: 1px solid #cbd5e1; font-size: 11px; line-height: 1.4; }
              }
              @media print {
                @page { size: A4 portrait; margin: 0; }
                html, body { margin: 0 !important; padding: 6mm 3mm 6mm 3mm !important; background: #ffffff !important; box-shadow: none !important; border: none !important; max-width: none !important; width: 100% !important; }
              }
              body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; font-size: 11px; line-height: 1.4; }
              .header { border-bottom: 3px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px; }
              .header-table { display: table; width: 100%; }
              .header-left { display: table-cell; vertical-align: middle; }
              .header-right { display: table-cell; vertical-align: top; text-align: right; }
              .title { font-size: 15px; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase; }
              .subtitle { font-size: 11px; color: #475569; margin-top: 3px; font-weight: 600; }
              .table-main { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 10.5px; }
              .table-main thead { display: table-header-group !important; }
              .table-main th { background-color: #0f172a !important; color: #ffffff !important; padding: 4px 6px 6px 6px !important; font-weight: 800; text-align: center !important; vertical-align: middle !important; text-transform: uppercase; font-size: 9.5px; height: 24px; }
              .table-main tr { page-break-inside: avoid !important; }
              .total-row { background-color: #f1f5f9 !important; font-weight: 800; }
              .total-row td { padding: 8px 6px; border-top: 2px solid #0f172a; border-bottom: 1px solid #cbd5e1; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="header-table">
                <div style="display: table-cell; vertical-align: middle; width: 100px; padding-right: 12px;">
                  ${getLogoSvgHtml('print-proyek')}
                </div>
                <div class="header-left">
                  <div style="font-size: 9px; font-weight: 800; color: #475569; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 2px;">PT JAKARTA PRIMA UTAMA</div>
                  <h1 class="title">${viewLabel}</h1>
                  <div class="subtitle">Tahun Laporan: ${selectedYear} &bull; Periode s/d: ${formatDateIndo(effectiveEndDate)}</div>
                  <div class="subtitle" style="margin-top: 2px;">Nama Customer: <b>${selectedCusName}</b></div>
                </div>
                <div class="header-right">
                  <div style="font-size: 11.5px; font-weight: 700; color: #1e293b;">Dicetak: <span style="font-family: monospace; font-size: 12px; font-weight: 700; color: #0f172a;">${printDateStr}</span></div>
                  <div style="font-size: 11px; font-weight: 700; color: #1e293b; margin-top: 2px;">User: <span style="font-family: monospace; font-size: 11.5px; font-weight: 800; color: #0f172a;">${loggedInUser?.User_Name || 'User JPU'} (${loggedInUser?.User_ID || 'SDM'})</span></div>
                </div>
              </div>
            </div>

            <table class="table-main">
              <thead>
                <tr>
                  <th rowspan="2" style="width: 28px; text-align: center; vertical-align: middle;">No</th>
                  <th style="width: 140px; text-align: left; background-color: #1e293b !important; color: #fbbf24 !important;">Nama Customer</th>
                  <th colspan="${hasProgress ? 6 : 5}" style="text-align: left;">Keterangan Pekerjaan / Proyek</th>
                </tr>
                <tr>
                  <th style="width: 90px; text-align: left;">No. PO</th>
                  <th style="width: 80px; text-align: center;">Tanggal</th>
                  ${hasProgress ? '<th style="width: 45px; text-align: center;">Progres</th>' : ''}
                  <th style="width: 105px; text-align: right;">Nilai Pro (-2.65%)</th>
                  <th style="width: 105px; text-align: right;">Nilai RAP (75%)</th>
                  <th style="width: 105px; text-align: right;">Total Biaya</th>
                  <th style="width: 105px; text-align: right;">Selisih</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
                <tr class="total-row">
                  <td colSpan="${hasProgress ? 4 : 3}" style="text-align: right; text-transform: uppercase;">TOTAL DETIL:</td>
                  <td style="text-align: right; font-family: monospace; font-size: 12px;">${formatRupiah(totalNilaiProSum)}</td>
                  <td style="text-align: right; font-family: monospace; font-size: 12px; color: #1e3a8a;">${formatRupiah(totalRapSum)}</td>
                  <td style="text-align: right; font-family: monospace; font-size: 12px; color: #4338ca;">${formatRupiah(totalBiayaSum)}</td>
                  <td style="text-align: right; font-family: monospace; font-size: 12px; color: ${totalSelisihSum >= 0 ? '#059669' : '#e11d48'};">${formatRupiah(totalSelisihSum)}</td>
                </tr>
              </tbody>
            </table>
          </body>
        </html>
      `;
    } else if (activeView === 'manager') {
      const managers = [
        { name: 'Andi Wijaya', role: 'Senior Manager', projects: 6, total: 495000000 },
        { name: 'Budi Santoso', role: 'Project Manager', projects: 5, total: 385000000 },
        { name: 'Citra Lestari', role: 'Operational Lead', projects: 4, total: 275000000 },
        { name: 'Dewi Handayani', role: 'Regional Manager', projects: 3, total: 195000000 }
      ];
      const totalAll = 1350000000;
      const rowsHtml = managers.map((m, idx) => `
        <tr style="${idx % 2 === 1 ? 'background-color: #f8fafc;' : '#ffffff'}">
          <td style="padding: 8px 10px; text-align: center; font-family: monospace; border-bottom: 1px solid #e2e8f0; color: #64748b;">${idx + 1}</td>
          <td style="padding: 8px 10px; font-weight: 700; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${m.name}</td>
          <td style="padding: 8px 10px; font-family: monospace; border-bottom: 1px solid #e2e8f0; color: #475569;">${m.role}</td>
          <td style="padding: 8px 10px; text-align: center; font-family: monospace; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #4338ca;">${m.projects} Proyek</td>
          <td style="padding: 8px 10px; text-align: right; font-family: monospace; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${formatRupiah(m.total)}</td>
          <td style="padding: 8px 10px; text-align: right; font-family: monospace; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${((m.total / totalAll) * 100).toFixed(1)}%</td>
        </tr>
      `).join('');

      printHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>&#10240;</title>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
            <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Playball&family=Pacifico&display=swap" rel="stylesheet" />
            <style>
              * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
              @media screen {
                html { background-color: #f1f5f9; padding: 20px 16px; min-height: 100vh; }
                body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; background: #ffffff !important; max-width: 980px; margin: 0 auto !important; padding: 24px 28px !important; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05); border: 1px solid #cbd5e1; font-size: 11px; line-height: 1.4; }
              }
              @media print {
                @page { size: A4 portrait; margin: 0; }
                html, body { margin: 0 !important; padding: 6mm 3mm 6mm 3mm !important; background: #ffffff !important; box-shadow: none !important; border: none !important; max-width: none !important; width: 100% !important; }
              }
              body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; font-size: 11px; line-height: 1.4; }
              .header { border-bottom: 3px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px; }
              .header-table { display: table; width: 100%; }
              .header-left { display: table-cell; vertical-align: middle; }
              .header-right { display: table-cell; vertical-align: top; text-align: right; }
              .title { font-size: 15px; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase; }
              .subtitle { font-size: 11px; color: #475569; margin-top: 3px; font-weight: 600; }
              .table-main { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
              .table-main th { background-color: #0f172a !important; color: #ffffff !important; padding: 6px 8px !important; font-weight: 800; text-align: center !important; vertical-align: middle !important; text-transform: uppercase; font-size: 10px; }
              .total-row { background-color: #f1f5f9 !important; font-weight: 800; }
              .total-row td { padding: 8px 10px; border-top: 2px solid #0f172a; border-bottom: 1px solid #cbd5e1; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="header-table">
                <div style="display: table-cell; vertical-align: middle; width: 100px; padding-right: 12px;">
                  ${getLogoSvgHtml('print-manager')}
                </div>
                <div class="header-left">
                  <div style="font-size: 9px; font-weight: 800; color: #475569; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 2px;">PT JAKARTA PRIMA UTAMA</div>
                  <h1 class="title">Laporan Penjualan Per Manager</h1>
                  <div class="subtitle">Rekapitulasi Kinerja Manager &bull; Tahun Laporan: ${selectedYear} &bull; Periode s/d: ${formatDateIndo(effectiveEndDate)}</div>
                </div>
                <div class="header-right">
                  <div style="font-size: 11.5px; font-weight: 700; color: #1e293b;">Dicetak: <span style="font-family: monospace; font-size: 12px; font-weight: 700; color: #0f172a;">${printDateStr}</span></div>
                </div>
              </div>
            </div>
            <table class="table-main">
              <thead>
                <tr>
                  <th style="width: 30px;">No</th>
                  <th>Nama Manager</th>
                  <th>Jabatan</th>
                  <th style="width: 100px;">Jumlah Proyek</th>
                  <th style="width: 140px;">Total Pencapaian</th>
                  <th style="width: 80px;">Kontribusi</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
                <tr class="total-row">
                  <td colspan="4" style="text-align: right; text-transform: uppercase;">TOTAL PENJUALAN MANAGER:</td>
                  <td style="text-align: right; font-family: monospace; font-size: 12px; color: #0f172a;">${formatRupiah(totalAll)}</td>
                  <td style="text-align: right; font-family: monospace;">100.0%</td>
                </tr>
              </tbody>
            </table>
          </body>
        </html>
      `;
    } else if (activeView === 'seorangan') {
      const sales = [
        { name: 'Eko Prasetyo', deals: 5, total: 380000000, commission: 19000000, target: 95 },
        { name: 'Feri Setiawan', deals: 4, total: 290000000, commission: 14500000, target: 82 },
        { name: 'Gita Rahayu', deals: 3, total: 180000000, commission: 9000000, target: 60 },
        { name: 'Hadi Wibowo', deals: 2, total: 130000000, commission: 6500000, target: 52 }
      ];
      const totalDeal = 980000000;
      const totalComm = 49000000;
      const rowsHtml = sales.map((s, idx) => `
        <tr style="${idx % 2 === 1 ? 'background-color: #f8fafc;' : '#ffffff'}">
          <td style="padding: 8px 10px; text-align: center; font-family: monospace; border-bottom: 1px solid #e2e8f0; color: #64748b;">${idx + 1}</td>
          <td style="padding: 8px 10px; font-weight: 700; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${s.name}</td>
          <td style="padding: 8px 10px; text-align: center; font-family: monospace; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #4338ca;">${s.deals} Deal</td>
          <td style="padding: 8px 10px; text-align: right; font-family: monospace; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${formatRupiah(s.total)}</td>
          <td style="padding: 8px 10px; text-align: right; font-family: monospace; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #059669;">${formatRupiah(s.commission)}</td>
          <td style="padding: 8px 10px; text-align: right; font-family: monospace; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${s.target}%</td>
        </tr>
      `).join('');

      printHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>&#10240;</title>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
            <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Playball&family=Pacifico&display=swap" rel="stylesheet" />
            <style>
              * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
              @media screen {
                html { background-color: #f1f5f9; padding: 20px 16px; min-height: 100vh; }
                body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; background: #ffffff !important; max-width: 980px; margin: 0 auto !important; padding: 24px 28px !important; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05); border: 1px solid #cbd5e1; font-size: 11px; line-height: 1.4; }
              }
              @media print {
                @page { size: A4 portrait; margin: 0; }
                html, body { margin: 0 !important; padding: 6mm 3mm 6mm 3mm !important; background: #ffffff !important; box-shadow: none !important; border: none !important; max-width: none !important; width: 100% !important; }
              }
              body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; font-size: 11px; line-height: 1.4; }
              .header { border-bottom: 3px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px; }
              .header-table { display: table; width: 100%; }
              .header-left { display: table-cell; vertical-align: middle; }
              .header-right { display: table-cell; vertical-align: top; text-align: right; }
              .title { font-size: 15px; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase; }
              .subtitle { font-size: 11px; color: #475569; margin-top: 3px; font-weight: 600; }
              .table-main { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
              .table-main th { background-color: #0f172a !important; color: #ffffff !important; padding: 6px 8px !important; font-weight: 800; text-align: center !important; vertical-align: middle !important; text-transform: uppercase; font-size: 10px; }
              .total-row { background-color: #f1f5f9 !important; font-weight: 800; }
              .total-row td { padding: 8px 10px; border-top: 2px solid #0f172a; border-bottom: 1px solid #cbd5e1; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="header-table">
                <div style="display: table-cell; vertical-align: middle; width: 100px; padding-right: 12px;">
                  ${getLogoSvgHtml('print-sales')}
                </div>
                <div class="header-left">
                  <div style="font-size: 9px; font-weight: 800; color: #475569; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 2px;">PT JAKARTA PRIMA UTAMA</div>
                  <h1 class="title">Laporan Penjualan Per Seorangan / Sales</h1>
                  <div class="subtitle">Rekapitulasi Kinerja & Insentif Sales (5%) &bull; Tahun Laporan: ${selectedYear} &bull; Periode s/d: ${formatDateIndo(effectiveEndDate)}</div>
                </div>
                <div class="header-right">
                  <div style="font-size: 11.5px; font-weight: 700; color: #1e293b;">Dicetak: <span style="font-family: monospace; font-size: 12px; font-weight: 700; color: #0f172a;">${printDateStr}</span></div>
                </div>
              </div>
            </div>
            <table class="table-main">
              <thead>
                <tr>
                  <th style="width: 30px;">No</th>
                  <th>Nama Agen Sales</th>
                  <th style="width: 80px;">Jumlah Deal</th>
                  <th style="width: 140px;">Total Nilai Deal</th>
                  <th style="width: 140px;">Insentif Komisi (5%)</th>
                  <th style="width: 80px;">Target</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
                <tr class="total-row">
                  <td colspan="3" style="text-align: right; text-transform: uppercase;">TOTAL PENCAPAIAN SALES:</td>
                  <td style="text-align: right; font-family: monospace; font-size: 12px; color: #0f172a;">${formatRupiah(totalDeal)}</td>
                  <td style="text-align: right; font-family: monospace; font-size: 12px; color: #059669;">${formatRupiah(totalComm)}</td>
                  <td style="text-align: right; font-family: monospace;">-</td>
                </tr>
              </tbody>
            </table>
          </body>
        </html>
      `;
    } else {
      showToast('Fitur cetak PDF untuk menu ini belum tersedia.', 'info');
      return;
    }

    if (!printHtml) {
      showToast('Gagal menyiapkan dokumen cetak.', 'error');
      return;
    }

    showToast('Membuka dialog cetak PDF...', 'info');

    // Robust multi-stage printing trigger
    let printWin: Window | null = null;
    try {
      printWin = window.open('', '_blank', 'width=1000,height=800');
    } catch (e) {
      console.warn('Popup window error:', e);
    }

    if (printWin) {
      printWin.document.open();
      printWin.document.write(printHtml);
      printWin.document.close();
      try {
        printWin.document.title = '\u2800';
      } catch (e) {
        /* ignore */
      }
      printWin.focus();

      setTimeout(() => {
        try {
          if (printWin?.document) {
            printWin.document.title = '\u2800';
          }
          printWin?.print();
        } catch (err) {
          console.error('Window print error:', err);
        }
      }, 350);
    } else {
      // Fallback if popup blocker is active
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.left = '0';
      iframe.style.top = '0';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      iframe.style.zIndex = '999999';
      iframe.style.backgroundColor = '#ffffff';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(printHtml);
        doc.close();
        try {
          doc.title = '\u2800';
        } catch (e) {
          /* ignore */
        }

        setTimeout(() => {
          try {
            if (iframe.contentWindow?.document) {
              iframe.contentWindow.document.title = '\u2800';
            }
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (e) {
            console.error('Iframe print error:', e);
          } finally {
            setTimeout(() => {
              if (iframe.parentNode) {
                iframe.parentNode.removeChild(iframe);
              }
            }, 1200);
          }
        }, 350);
      }
    }
  };

  // Handle Downloading active report view directly to PDF file
  const handleDownloadPdf = async () => {
    const effectiveEndDate = getEffectiveEndDate(selectedYear, endDateOption, customEndDate);
    const printDateStr = formatDateIndo(new Date().toISOString().split('T')[0]);

    let htmlBody = '';
    let pdfFileName = 'Laporan.pdf';

    if (activeView === 'rap') {
      pdfFileName = `Laporan_Perhitungan_RAP_${selectedYear}.pdf`;
      const totalTotpro = rapReportData.reduce((acc: number, item: any) => acc + Number(item.totpro || 0), 0);
      const totalRap = rapReportData.reduce((acc: number, item: any) => acc + Number(item.Nilai_RAP || 0), 0);
      const totalBiaya = rapReportData.reduce((acc: number, item: any) => acc + Number(item.Total_Biaya || 0), 0);
      const totalSelisih = rapReportData.reduce((acc: number, item: any) => acc + Number(item.Selisih || 0), 0);
      const isEfisien = totalSelisih >= 0;

      const rowsHtml = rapReportData.map((item: any, idx: number) => {
        const rowBg = idx % 2 === 1 ? 'background-color: #f8fafc;' : '#ffffff';
        return `
          <tr style="${rowBg}">
            <td style="padding: 6px 4px; text-align: center; font-family: monospace; font-size: 11.5px; border-bottom: 1px solid #e2e8f0; color: #64748b;">${idx + 1}</td>
            <td style="padding: 6px 4px; font-weight: 700; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${item.Cus_Name || '-'}</td>
            <td style="padding: 6px 8px; text-align: right; font-family: monospace; font-size: 11.5px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${formatRupiah(Number(item.totpro || 0))}</td>
            <td style="padding: 6px 8px; text-align: right; font-family: monospace; font-size: 11.5px; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #1e3a8a;">${formatRupiah(Number(item.Nilai_RAP || 0))}</td>
            <td style="padding: 6px 8px; text-align: right; font-family: monospace; font-size: 11.5px; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #4338ca;">${formatRupiah(Number(item.Total_Biaya || 0))}</td>
            <td style="padding: 6px 8px; text-align: right; font-family: monospace; font-size: 11.5px; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: ${Number(item.Selisih || 0) >= 0 ? '#059669' : '#e11d48'};">${formatRupiah(Number(item.Selisih || 0))}</td>
          </tr>
        `;
      }).join('');

      htmlBody = `
        <div id="pdf-container" style="font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; padding: 12px; background: #fff; font-size: 11px; line-height: 1.4;">
          <style>
            thead { display: table-header-group; }
            tr { page-break-inside: avoid; }
          </style>
          <div style="border-bottom: 3px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px; display: table; width: 100%;">
            <div style="display: table-cell; vertical-align: middle; width: 100px; padding-right: 12px;">
              ${getLogoSvgHtml('dl-rap')}
            </div>
            <div style="display: table-cell; vertical-align: middle;">
              <div style="font-size: 9px; font-weight: 800; color: #475569; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 2px;">PT JAKARTA PRIMA UTAMA</div>
              <h1 style="font-size: 15px; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase;">Laporan Perhitungan RAP</h1>
              <div style="font-size: 11px; color: #475569; margin-top: 3px; font-weight: 600;">Tahun Laporan: ${selectedYear} &bull; Periode s/d: ${formatDateIndo(effectiveEndDate)}</div>
            </div>
            <div style="display: table-cell; vertical-align: top; text-align: right;">
              <div style="font-size: 11.5px; font-weight: 700; color: #1e293b; margin-top: 4px;">Dicetak: <span style="font-family: monospace; font-size: 12px; font-weight: 700; color: #0f172a;">${printDateStr}</span></div>
              <div style="font-size: 10.5px; font-weight: 600; color: #475569; margin-top: 2px;">Admin: <b style="color: #0f172a;">${loggedInUser?.User_Name || 'Admin JPU'}</b> (${loggedInUser?.User_ID || 'SDM'})</div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px;">
            <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 12px; background: #f8fafc;">
              <div style="font-size: 9.5px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 3px;">Nilai Proyek Bersih</div>
              <div style="font-size: 13px; font-weight: 800; font-family: monospace; color: #0f172a;">${formatRupiah(totalTotpro)}</div>
            </div>
            <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 12px; background: #f8fafc;">
              <div style="font-size: 9.5px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 3px;">Nilai RAP</div>
              <div style="font-size: 13px; font-weight: 800; font-family: monospace; color: #1e3a8a;">${formatRupiah(totalRap)}</div>
            </div>
            <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 12px; background: #f8fafc;">
              <div style="font-size: 9.5px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 3px;">Total Biaya</div>
              <div style="font-size: 13px; font-weight: 800; font-family: monospace; color: #4338ca;">${formatRupiah(totalBiaya)}</div>
            </div>
            <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 12px; background: #f8fafc;">
              <div style="font-size: 9.5px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 3px;">Selisih RAP</div>
              <div style="font-size: 13px; font-weight: 800; font-family: monospace; color: ${isEfisien ? '#059669' : '#e11d48'};">
                ${formatRupiah(totalSelisih)}
              </div>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 10.5px;">
            <thead>
              <tr style="background-color: #0f172a !important; color: #ffffff !important;">
                <th style="width: 28px; padding: 4px 6px; text-align: center;">No</th>
                <th style="padding: 4px 6px; text-align: center;">Nama Customer</th>
                <th style="width: 120px; padding: 4px 6px; text-align: center;">Nilai Proyek</th>
                <th style="width: 120px; padding: 4px 6px; text-align: center;">Nilai RAP</th>
                <th style="width: 120px; padding: 4px 6px; text-align: center;">Total Biaya</th>
                <th style="width: 120px; padding: 4px 6px; text-align: center;">Selisih</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
              <tr style="background-color: #f1f5f9; font-weight: 800;">
                <td colSpan="2" style="padding: 8px 6px; text-align: right; text-transform: uppercase;">TOTAL KESELURUHAN:</td>
                <td style="padding: 8px 6px; text-align: right; font-family: monospace; font-size: 12px;">${formatRupiah(totalTotpro)}</td>
                <td style="padding: 8px 6px; text-align: right; font-family: monospace; font-size: 12px; color: #1e3a8a;">${formatRupiah(totalRap)}</td>
                <td style="padding: 8px 6px; text-align: right; font-family: monospace; font-size: 12px; color: #4338ca;">${formatRupiah(totalBiaya)}</td>
                <td style="padding: 8px 6px; text-align: right; font-family: monospace; font-size: 12px; color: ${totalSelisih >= 0 ? '#059669' : '#e11d48'};">${formatRupiah(totalSelisih)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    } else if (activeView === 'overhead') {
      pdfFileName = `Laporan_Perhitungan_Overhead_${selectedYear}.pdf`;
      const summary = overheadReportData?.summary || {};
      const itemsList: any[] = overheadReportData?.items || [];
      const totalNilaiProNet = summary.totalNilaiProNet || 0;
      const targetOverhead25 = summary.targetOverhead25 || 0;
      const debtAccIds = ['002002', '002004', '050300'];
      const isDebtAccount = (accId: any) => debtAccIds.includes(String(accId || '').trim());

      const totalRealisasiOverhead = itemsList.reduce((acc: number, it: any) => {
        if (pembayaranHutangOption === 'tidak_hitung' && isDebtAccount(it.Acc_ID)) {
          return acc;
        }
        return acc + Number(it.Total_Jumlah || 0);
      }, 0);

      const selisihEfisiensi = targetOverhead25 - totalRealisasiOverhead;
      const isEfisien = selisihEfisiensi >= 0;

      const rowsHtml = itemsList.map((item: any, idx: number) => {
        const isDebt = isDebtAccount(item.Acc_ID);
        const isExcluded = pembayaranHutangOption === 'tidak_hitung' && isDebt;
        const ratio = totalRealisasiOverhead > 0 && !isExcluded 
          ? ((Number(item.Total_Jumlah) / totalRealisasiOverhead) * 100).toFixed(1) 
          : '0.0';

        const rowBg = isDebt ? 'background-color: #fffbeb;' : (idx % 2 === 1 ? 'background-color: #f8fafc;' : '#ffffff');
        const amountText = isExcluded 
          ? `<span style="text-decoration: line-through; color: #94a3b8;">${formatRupiah(Number(item.Total_Jumlah))}</span>`
          : formatRupiah(Number(item.Total_Jumlah));

        return `
          <tr style="${rowBg}">
            <td style="padding: 7px 10px; text-align: center; font-family: monospace; border-bottom: 1px solid #e2e8f0; color: #64748b;">${idx + 1}</td>
            <td style="padding: 7px 10px; font-family: monospace; font-weight: bold; border-bottom: 1px solid #e2e8f0;">
              ${isDebt ? `<span style="padding: 2px 6px; background-color: #f59e0b; color: #ffffff; border-radius: 4px; font-weight: 800; font-size: 11px;">${item.Acc_ID}</span>` : `<span style="color: #d97706;">${item.Acc_ID}</span>`}
            </td>
            <td style="padding: 7px 10px; font-weight: 700; border-bottom: 1px solid #e2e8f0; color: #0f172a;">
              ${item.Acc_Name}
              ${isDebt ? `<span style="font-size: 10px; padding: 2px 6px; background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 4px; margin-left: 6px; color: #92400e; font-weight: bold;">Pembayaran Hutang</span>` : ''}
            </td>
            <td style="padding: 7px 10px; text-align: center; font-family: monospace; border-bottom: 1px solid #e2e8f0; color: #4338ca; font-weight: 600;">${item.Total_Voucher} Transaksi</td>
            <td style="padding: 7px 10px; text-align: right; font-family: monospace; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${amountText}</td>
            <td style="padding: 7px 10px; text-align: right; font-family: monospace; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${isExcluded ? '<span style="color: #d97706;">0.0% (Excl.)</span>' : ratio + '%'}</td>
          </tr>
        `;
      }).join('');

      htmlBody = `
        <div id="pdf-container" style="font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; padding: 12px; background: #fff; font-size: 11px; line-height: 1.4;">
          <style>
            thead { display: table-header-group; }
            tr { page-break-inside: avoid; }
          </style>
          <div style="border-bottom: 3px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px; display: table; width: 100%;">
            <div style="display: table-cell; vertical-align: middle; width: 100px; padding-right: 12px;">
              ${getLogoSvgHtml('dl-overhead')}
            </div>
            <div style="display: table-cell; vertical-align: middle;">
              <div style="font-size: 9px; font-weight: 800; color: #475569; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 2px;">PT JAKARTA PRIMA UTAMA</div>
              <h1 style="font-size: 16px; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">Laporan Perhitungan & Simulasi Overhead</h1>
              <div style="font-size: 11px; color: #475569; margin-top: 3px; font-weight: 600;">Divisi: Off & Wks &bull; Tahun Laporan: ${selectedYear} &bull; Periode s/d: ${formatDateIndo(effectiveEndDate)}</div>
            </div>
            <div style="display: table-cell; vertical-align: top; text-align: right;">
              <div style="padding: 5px 10px; background-color: #0f172a; color: #fbbf24; font-weight: 800; font-size: 11px; border-radius: 6px; text-transform: uppercase; display: inline-block; letter-spacing: 0.3px;">
                OPSI: ${pembayaranHutangOption === 'hitung' ? 'PEMBAYARAN HUTANG DIHITUNG' : 'PEMBAYARAN HUTANG TIDAK DIHITUNG'}
              </div>
              <div style="font-size: 11.5px; font-weight: 700; color: #1e293b; margin-top: 4px;">Dicetak: <span style="font-family: monospace; font-size: 12px; font-weight: 700; color: #0f172a;">${printDateStr}</span></div>
              <div style="font-size: 10.5px; font-weight: 600; color: #475569; margin-top: 2px;">Admin: <b style="color: #0f172a;">${loggedInUser?.User_Name || 'Admin JPU'}</b> (${loggedInUser?.User_ID || 'SDM'})</div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px;">
            <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 12px; background: #f8fafc;">
              <div style="font-size: 9.5px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 3px;">Nilai Proyek Bersih (-2.65%)</div>
              <div style="font-size: 13px; font-weight: 800; font-family: monospace; color: #0f172a;">${formatRupiah(totalNilaiProNet)}</div>
            </div>
            <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 12px; background: #f8fafc;">
              <div style="font-size: 9.5px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 3px;">Target Overhead (25%)</div>
              <div style="font-size: 13px; font-weight: 800; font-family: monospace; color: #d97706;">${formatRupiah(targetOverhead25)}</div>
            </div>
            <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 12px; background: #f8fafc;">
              <div style="font-size: 9.5px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 3px;">Realisasi Overhead</div>
              <div style="font-size: 13px; font-weight: 800; font-family: monospace; color: #6d28d9;">${formatRupiah(totalRealisasiOverhead)}</div>
            </div>
            <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 12px; background: #f8fafc;">
              <div style="font-size: 9.5px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 3px;">Status Efisiensi</div>
              <div style="font-size: 13px; font-weight: 800; font-family: monospace; color: ${isEfisien ? '#059669' : '#e11d48'};">
                ${isEfisien ? `EFISIEN (+${formatRupiah(selisihEfisiensi)})` : `MELEBIHI (${formatRupiah(selisihEfisiensi)})`}
              </div>
            </div>
          </div>

          <h3 style="margin: 8px 0 2px 0; font-size: 11px; text-transform: uppercase; color: #334155; font-weight: 800;">Rincian Komponen Biaya Overhead</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 11px;">
            <thead>
              <tr style="background-color: #0f172a !important; color: #ffffff !important;">
                <th style="width: 35px; text-align: center; padding: 4px 6px 6px 6px; font-size: 10px; font-weight: 800; vertical-align: middle; line-height: 1.1; background-color: #0f172a !important; color: #ffffff !important;">No</th>
                <th style="width: 75px; text-align: center; padding: 4px 6px 6px 6px; font-size: 10px; font-weight: 800; vertical-align: middle; line-height: 1.1; background-color: #0f172a !important; color: #ffffff !important;">Kode</th>
                <th style="text-align: center; padding: 4px 6px 6px 6px; font-size: 10px; font-weight: 800; vertical-align: middle; line-height: 1.1; background-color: #0f172a !important; color: #ffffff !important;">Nama Rekening Biaya</th>
                <th style="width: 100px; text-align: center; padding: 4px 6px 6px 6px; font-size: 10px; font-weight: 800; vertical-align: middle; line-height: 1.1; background-color: #0f172a !important; color: #ffffff !important;">Jml Transaksi</th>
                <th style="width: 140px; text-align: center; padding: 4px 6px 6px 6px; font-size: 10px; font-weight: 800; vertical-align: middle; line-height: 1.1; background-color: #0f172a !important; color: #ffffff !important;">Total Biaya (Rp)</th>
                <th style="width: 85px; text-align: center; padding: 4px 6px 6px 6px; font-size: 10px; font-weight: 800; vertical-align: middle; line-height: 1.1; background-color: #0f172a !important; color: #ffffff !important;">Rasio (%)</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
              <tr style="background-color: #f1f5f9; font-weight: 800;">
                <td colspan="4" style="text-align: right; text-transform: uppercase; font-size: 10.5px; padding: 7px 10px; border-top: 2px solid #0f172a; border-bottom: 1px solid #cbd5e1;">TOTAL REALISASI OVERHEAD (Divisi Off & Wks):</td>
                <td style="text-align: right; font-family: monospace; font-size: 12px; color: #0f172a; font-weight: 800; padding: 7px 10px; border-top: 2px solid #0f172a; border-bottom: 1px solid #cbd5e1;">${formatRupiah(totalRealisasiOverhead)}</td>
                <td style="text-align: right; font-family: monospace; font-size: 11px; color: #0f172a; padding: 7px 10px; border-top: 2px solid #0f172a; border-bottom: 1px solid #cbd5e1;">100.0%</td>
              </tr>
              <tr style="background-color: #ffffff; color: #475569; font-weight: 800;">
                <td colspan="4" style="text-align: right; text-transform: uppercase; font-size: 10.5px; padding: 7px 10px; border-bottom: 1px solid #cbd5e1;">NILAI TARGET OVERHEAD (25% dari Net Nilai_Pro):</td>
                <td style="text-align: right; font-family: monospace; color: #d97706; font-size: 11.5px; font-weight: 800; padding: 7px 10px; border-bottom: 1px solid #cbd5e1;">${formatRupiah(targetOverhead25)}</td>
                <td style="text-align: right; font-family: monospace; color: #d97706; font-size: 11px; padding: 7px 10px; border-bottom: 1px solid #cbd5e1;">25.0%</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    } else if (activeView === 'customer') {
      pdfFileName = `Laporan_Penjualan_Per_Customer_${selectedYear}.pdf`;
      const totalNilaiProyek = customCustomerReport.reduce((acc, item) => acc + Number(item.totpro), 0);
      const topCustomerObj = customCustomerReport.reduce((max, item) => Number(item.totpro) > Number(max.totpro) ? item : max, customCustomerReport[0] || { Cus_Name: '-' });
      const topCustomer = topCustomerObj ? topCustomerObj.Cus_Name : '-';
      const avgPerCustomer = Math.round(totalNilaiProyek / (customCustomerReport.length || 1));

      htmlBody = `
      <div id="pdf-container" style="font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; padding: 12px; background: #fff; font-size: 11px; line-height: 1.4;">
          <style>
            thead { display: table-header-group; }
            tr { page-break-inside: avoid; }
          </style>
          <div style="border-bottom: 3px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px; display: table; width: 100%;">
            <div style="display: table-cell; vertical-align: middle; width: 100px; padding-right: 12px;">
              ${getLogoSvgHtml('dl-customer')}
            </div>
            <div style="display: table-cell; vertical-align: middle;">
              <div style="font-size: 9px; font-weight: 800; color: #475569; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 2px;">PT JAKARTA PRIMA UTAMA</div>
              <h1 style="font-size: 16px; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">Laporan Penjualan Per Customer</h1>
              <div style="font-size: 11px; color: #475569; margin-top: 3px; font-weight: 600;">Rekapitulasi Penjualan Bersih &bull; Tahun Laporan: ${selectedYear} &bull; Periode s/d: ${formatDateIndo(effectiveEndDate)}</div>
            </div>
            <div style="display: table-cell; vertical-align: top; text-align: right;">
              <div style="font-size: 11.5px; font-weight: 700; color: #1e293b; margin-top: 4px;">Dicetak: <span style="font-family: monospace; font-size: 12px; font-weight: 700; color: #0f172a;">${printDateStr}</span></div>
              <div style="font-size: 10.5px; font-weight: 600; color: #475569; margin-top: 2px;">Admin: <b style="color: #0f172a;">${loggedInUser?.User_Name || 'Admin JPU'}</b> (${loggedInUser?.User_ID || 'SDM'})</div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px;">
            <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 12px; background: #f8fafc;">
              <div style="font-size: 9.5px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 3px;">Total Nilai Proyek</div>
              <div style="font-size: 13px; font-weight: 800; font-family: monospace; color: #0f172a;">${formatRupiah(totalNilaiProyek)}</div>
            </div>
            <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 12px; background: #f8fafc;">
              <div style="font-size: 9.5px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 3px;">Jumlah Customer</div>
              <div style="font-size: 13px; font-weight: 800; font-family: monospace; color: #4338ca;">${customCustomerReport.length} Entitas</div>
            </div>
            <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 12px; background: #f8fafc;">
              <div style="font-size: 9.5px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 3px;">Kontributor Tertinggi</div>
              <div style="font-size: 11px; font-weight: 800; color: #059669; word-break: break-word;">${topCustomer}</div>
            </div>
            <div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 12px; background: #f8fafc;">
              <div style="font-size: 9.5px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 3px;">Rata-rata Per Customer</div>
              <div style="font-size: 13px; font-weight: 800; font-family: monospace; color: #d97706;">${formatRupiah(avgPerCustomer)}</div>
            </div>
          </div>

          <h3 style="margin: 8px 0 2px 0; font-size: 11px; text-transform: uppercase; color: #334155; font-weight: 800;">Rincian Penjualan Bersih Per Customer</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 11px;">
            <thead>
              <tr style="background-color: #0f172a !important; color: #ffffff !important;">
                <th style="width: 30px; text-align: center; padding: 4px 6px 6px 6px; font-size: 10px; font-weight: 800; vertical-align: middle; line-height: 1.1; background-color: #0f172a !important; color: #ffffff !important;">No</th>
                <th style="width: 60px; text-align: center; padding: 4px 6px 6px 6px; font-size: 10px; font-weight: 800; vertical-align: middle; line-height: 1.1; background-color: #0f172a !important; color: #ffffff !important;">KODE</th>
                <th style="text-align: center; padding: 4px 6px 6px 6px; font-size: 10px; font-weight: 800; vertical-align: middle; line-height: 1.1; background-color: #0f172a !important; color: #ffffff !important;">CUSTOMER</th>
                <th style="width: 135px; text-align: center; padding: 4px 6px 6px 6px; font-size: 10px; font-weight: 800; vertical-align: middle; line-height: 1.1; background-color: #0f172a !important; color: #ffffff !important;">TOTAL</th>
                <th style="width: 80px; text-align: center; padding: 4px 6px 6px 6px; font-size: 10px; font-weight: 800; vertical-align: middle; line-height: 1.1; background-color: #0f172a !important; color: #ffffff !important;">Proporsi (%)</th>
              </tr>
            </thead>
            <tbody>
              ${customCustomerReport.map((item, idx) => {
                const itemVal = Number(item.totpro);
                const percentageOfTotal = totalNilaiProyek > 0 ? ((itemVal / totalNilaiProyek) * 100).toFixed(1) : '0.0';
                const rowBg = idx % 2 === 1 ? 'background-color: #f8fafc;' : '#ffffff';

                return `
                  <tr style="${rowBg}">
                    <td style="padding: 6px 4px; text-align: center; font-family: monospace; border-bottom: 1px solid #e2e8f0; color: #64748b;">${idx + 1}</td>
                    <td style="padding: 6px 4px; font-family: monospace; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #4338ca; text-align: center;">
                      ${item.Cus_Code}
                    </td>
                    <td style="padding: 6px 4px 6px 2px; font-weight: 700; border-bottom: 1px solid #e2e8f0; color: #0f172a;">
                      ${item.Cus_Name}
                    </td>
                    <td style="padding: 6px 8px; text-align: right; font-family: monospace; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #0f172a;">
                      ${formatRupiah(itemVal)}
                    </td>
                    <td style="padding: 6px 8px; text-align: right; font-family: monospace; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #4338ca;">
                      ${percentageOfTotal}%
                    </td>
                  </tr>
                `;
              }).join('')}
              <tr style="background-color: #f1f5f9; font-weight: 800;">
                <td colspan="3" style="text-align: right; text-transform: uppercase; font-size: 10.5px; padding: 7px 6px; border-top: 2px solid #0f172a; border-bottom: 1px solid #cbd5e1;">TOTAL PENJUALAN PER CUSTOMER:</td>
                <td style="text-align: right; font-family: monospace; font-size: 12px; color: #0f172a; font-weight: 800; padding: 7px 6px; border-top: 2px solid #0f172a; border-bottom: 1px solid #cbd5e1;">${formatRupiah(totalNilaiProyek)}</td>
                <td style="text-align: right; font-family: monospace; font-size: 11px; color: #0f172a; padding: 7px 6px; border-top: 2px solid #0f172a; border-bottom: 1px solid #cbd5e1;">100.0%</td>
              </tr>
            </tbody>
          </table>

          <div style="margin-top: 16px; padding-top: 8px; border-top: 1px solid #cbd5e1; font-size: 9.5px; color: #64748b;">
            Keterangan : Total adalah Total Nilai Poyek Per Customer Setelah diKurangi PPh 2.65%
          </div>
        </div>
      `;
    } else if (activeView === 'proyek_selesai' || activeView === 'proyek_pengerjaan' || activeView === 'proyek_semua') {
      if (selectedCusCode === 'Semua') {
        showToast('Silakan pilih Customer terlebih dahulu untuk mengunduh Laporan Proyek PDF.', 'info');
        return;
      }
      pdfFileName = `Laporan_Proyek_${selectedCusCode}_${selectedYear}.pdf`;
      const viewLabel = activeView === 'proyek_pengerjaan' ? 'Proyek Belum Selesai' : (activeView === 'proyek_semua' ? 'Gabungan Selesai & Belum' : 'Proyek Selesai (100%)');
      const hasProgress = activeView === 'proyek_pengerjaan' || activeView === 'proyek_semua';
      const isScaled = activeView === 'proyek_pengerjaan' || activeView === 'proyek_semua';

      const selectedCusObj = pkpCustomers.find(c => String(c.Cus_Code).trim() === String(selectedCusCode).trim());
      const selectedCusName = selectedCusObj 
        ? selectedCusObj.Cus_Name 
        : (selectedCustomerProyeks[0]?.cus_name || selectedCustomerProyeks[0]?.Cus_Name || selectedCusCode);

      const sortedProyeks = [...selectedCustomerProyeks].sort((a, b) => {
        const isAMenampung = (a.no_po || a.No_PO || '').trim().toLowerCase() === 'menampung biaya';
        const isBMenampung = (b.no_po || b.No_PO || '').trim().toLowerCase() === 'menampung biaya';
        if (isAMenampung && !isBMenampung) return 1;
        if (!isAMenampung && isBMenampung) return -1;
        const dateA = a.tgl_proyek || a.Tgl_Proyek || '';
        const dateB = b.tgl_proyek || b.Tgl_Proyek || '';
        return dateA.localeCompare(dateB);
      });

      let totalNilaiProSum = 0;
      let totalRapSum = 0;
      let totalBiayaSum = 0;
      let totalSelisihSum = 0;

      const rowsHtml = sortedProyeks.map((item, idx) => {
        const { rap, selisih, biaya, totalContributionRap, totalContributionBiaya, totalContributionSelisih } = getItemRapAndSelisih(item, isScaled);
        const rawNilaiPro = Number(item.nilai_pro) || 0;
        totalNilaiProSum += rawNilaiPro;
        totalRapSum += totalContributionRap;
        totalBiayaSum += totalContributionBiaya;
        totalSelisihSum += totalContributionSelisih;

        const progressPercent = typeof item.Persen_Progress === 'number' || typeof item.Persen_Progress === 'string' ? Number(item.Persen_Progress) : 0;
        const rowBg = idx % 2 === 1 ? 'background-color: #f8fafc;' : '#ffffff';

        const rawPo = (item.no_po || item.No_PO || '').trim();
        const isDashPo = !rawPo || rawPo === '-';
        const renderedPoHtml = isDashPo
          ? `<span style="display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 50%; border: 2px solid #2563eb; color: #1d4ed8; font-weight: 800; font-family: monospace; font-size: 11px; background-color: #eff6ff; line-height: 1;">-</span>`
          : rawPo;

        return `
          <tr style="${rowBg}">
            <td style="padding: 6px 4px; text-align: center; font-family: monospace; border-bottom: 1px solid #e2e8f0; color: #64748b;">${idx + 1}</td>
            <td style="padding: 6px 4px; font-weight: 700; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${item.keterangan || '-'}</td>
            <td style="padding: 6px 4px; font-family: monospace; border-bottom: 1px solid #e2e8f0; color: #475569;">${renderedPoHtml}</td>
            <td style="padding: 6px 4px; text-align: center; font-family: monospace; border-bottom: 1px solid #e2e8f0;">${formatDateIndo(item.tgl_proyek || item.Tgl_Proyek)}</td>
            ${hasProgress ? `<td style="padding: 6px 4px; text-align: center; font-family: monospace; border-bottom: 1px solid #e2e8f0; font-weight: bold;">${progressPercent}%</td>` : ''}
            <td style="padding: 6px 8px; text-align: right; font-family: monospace; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${formatRupiah(rawNilaiPro)}</td>
            <td style="padding: 6px 8px; text-align: right; font-family: monospace; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #d97706;">${formatRupiah(rap)}</td>
            <td style="padding: 6px 8px; text-align: right; font-family: monospace; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #4338ca;">${formatRupiah(biaya)}</td>
            <td style="padding: 6px 8px; text-align: right; font-family: monospace; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: ${selisih >= 0 ? '#059669' : '#e11d48'};">${formatRupiah(selisih)}</td>
          </tr>
        `;
      }).join('');

      htmlBody = `
        <div id="pdf-container" style="font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; padding: 12px; background: #fff; font-size: 11px; line-height: 1.4;">
          <style>
            thead { display: table-header-group; }
            tr { page-break-inside: avoid; }
          </style>
          <div style="border-bottom: 3px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px; display: table; width: 100%;">
            <div style="display: table-cell; vertical-align: middle; width: 100px; padding-right: 12px;">
              ${getLogoSvgHtml('dl-proyek')}
            </div>
            <div style="display: table-cell; vertical-align: middle;">
              <div style="font-size: 9px; font-weight: 800; color: #475569; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 2px;">PT JAKARTA PRIMA UTAMA</div>
              <h1 style="font-size: 15px; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase;">${viewLabel}</h1>
              <div style="font-size: 11px; color: #475569; margin-top: 3px; font-weight: 600;">Tahun Laporan: ${selectedYear} &bull; Periode s/d: ${formatDateIndo(effectiveEndDate)}</div>
              <div style="font-size: 11px; color: #475569; margin-top: 2px; font-weight: 600;">Nama Customer: <b>${selectedCusName}</b></div>
            </div>
            <div style="display: table-cell; vertical-align: top; text-align: right;">
              <div style="font-size: 11.5px; font-weight: 700; color: #1e293b; margin-top: 4px;">Dicetak: <span style="font-family: monospace; font-size: 12px; font-weight: 700; color: #0f172a;">${printDateStr}</span></div>
              <div style="font-size: 10.5px; font-weight: 600; color: #475569; margin-top: 2px;">Admin: <b style="color: #0f172a;">${loggedInUser?.User_Name || 'Admin JPU'}</b> (${loggedInUser?.User_ID || 'SDM'})</div>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 10.5px;">
            <thead>
              <tr style="background-color: #0f172a !important; color: #ffffff !important;">
                <th style="width: 28px; padding: 4px 6px; text-align: center; background-color: #0f172a !important; color: #ffffff !important;">No</th>
                <th style="padding: 4px 6px; text-align: center; background-color: #0f172a !important; color: #ffffff !important;">Keterangan Proyek</th>
                <th style="width: 80px; padding: 4px 6px; text-align: center; background-color: #0f172a !important; color: #ffffff !important;">No. PO</th>
                <th style="width: 80px; padding: 4px 6px; text-align: center; background-color: #0f172a !important; color: #ffffff !important;">Tanggal</th>
                ${hasProgress ? '<th style="width: 50px; padding: 4px 6px; text-align: center; background-color: #0f172a !important; color: #ffffff !important;">Progres</th>' : ''}
                <th style="width: 105px; padding: 4px 6px; text-align: center; background-color: #0f172a !important; color: #ffffff !important;">Nilai Pro (-2.65%)</th>
                <th style="width: 105px; padding: 4px 6px; text-align: center; background-color: #0f172a !important; color: #ffffff !important;">Nilai RAP (75%)</th>
                <th style="width: 105px; padding: 4px 6px; text-align: center; background-color: #0f172a !important; color: #ffffff !important;">Total Biaya</th>
                <th style="width: 105px; padding: 4px 6px; text-align: center; background-color: #0f172a !important; color: #ffffff !important;">Selisih</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
              <tr style="background-color: #f1f5f9; font-weight: 800;">
                <td colSpan="${hasProgress ? 5 : 4}" style="padding: 8px 6px; text-align: right; text-transform: uppercase; border-top: 2px solid #0f172a; border-bottom: 1px solid #cbd5e1;">TOTAL DETIL:</td>
                <td style="padding: 8px 6px; text-align: right; font-family: monospace; border-top: 2px solid #0f172a; border-bottom: 1px solid #cbd5e1;">${formatRupiah(totalNilaiProSum)}</td>
                <td style="padding: 8px 6px; text-align: right; font-family: monospace; color: #d97706; border-top: 2px solid #0f172a; border-bottom: 1px solid #cbd5e1;">${formatRupiah(totalRapSum)}</td>
                <td style="padding: 8px 6px; text-align: right; font-family: monospace; color: #4338ca; border-top: 2px solid #0f172a; border-bottom: 1px solid #cbd5e1;">${formatRupiah(totalBiayaSum)}</td>
                <td style="padding: 8px 6px; text-align: right; font-family: monospace; color: ${totalSelisihSum >= 0 ? '#059669' : '#e11d48'}; border-top: 2px solid #0f172a; border-bottom: 1px solid #cbd5e1;">${formatRupiah(totalSelisihSum)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    } else if (activeView === 'manager') {
      pdfFileName = `Laporan_Penjualan_Per_Manager_${selectedManager.replace(/\s+/g, '_')}_${selectedYear}.pdf`;
      const managers = [
        { name: 'Andi Wijaya', role: 'Senior Manager', projects: 6, total: 495000000 },
        { name: 'Budi Santoso', role: 'Project Manager', projects: 5, total: 385000000 },
        { name: 'Citra Lestari', role: 'Operational Lead', projects: 4, total: 275000000 },
        { name: 'Dewi Handayani', role: 'Regional Manager', projects: 3, total: 195000000 }
      ];
      const totalAll = 1350000000;
      const rowsHtml = managers.map((m, idx) => `
        <tr style="${idx % 2 === 1 ? 'background-color: #f8fafc;' : '#ffffff'}">
          <td style="padding: 7px 10px; text-align: center; font-family: monospace; border-bottom: 1px solid #e2e8f0; color: #64748b;">${idx + 1}</td>
          <td style="padding: 7px 10px; font-weight: 700; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${m.name}</td>
          <td style="padding: 7px 10px; font-family: monospace; border-bottom: 1px solid #e2e8f0; color: #475569;">${m.role}</td>
          <td style="padding: 7px 10px; text-align: center; font-family: monospace; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #4338ca;">${m.projects} Proyek</td>
          <td style="padding: 7px 10px; text-align: right; font-family: monospace; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${formatRupiah(m.total)}</td>
          <td style="padding: 7px 10px; text-align: right; font-family: monospace; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${((m.total / totalAll) * 100).toFixed(1)}%</td>
        </tr>
      `).join('');

      htmlBody = `
        <div id="pdf-container" style="font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; padding: 12px; background: #fff; font-size: 11px; line-height: 1.4;">
          <div style="border-bottom: 3px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px; display: table; width: 100%;">
            <div style="display: table-cell; vertical-align: middle; width: 100px; padding-right: 12px;">
              ${getLogoSvgHtml('dl-manager')}
            </div>
            <div style="display: table-cell; vertical-align: middle;">
              <div style="font-size: 9px; font-weight: 800; color: #475569; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 2px;">PT JAKARTA PRIMA UTAMA</div>
              <h1 style="font-size: 16px; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">Laporan Penjualan Per Manager</h1>
              <div style="font-size: 11px; color: #475569; margin-top: 3px; font-weight: 600;">Rekapitulasi Kinerja Penjualan Manager &bull; Tahun Laporan: ${selectedYear} &bull; Periode s/d: ${formatDateIndo(effectiveEndDate)}</div>
            </div>
            <div style="display: table-cell; vertical-align: top; text-align: right;">
              <div style="font-size: 11.5px; font-weight: 700; color: #1e293b; margin-top: 4px;">Dicetak: <span style="font-family: monospace; font-size: 12px; font-weight: 700; color: #0f172a;">${printDateStr}</span></div>
            </div>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px;">
            <thead>
              <tr style="background-color: #0f172a !important; color: #ffffff !important;">
                <th style="width: 30px; padding: 6px; text-align: center;">No</th>
                <th style="padding: 6px;">Nama Manager</th>
                <th style="padding: 6px;">Jabatan</th>
                <th style="width: 100px; padding: 6px; text-align: center;">Jumlah Proyek</th>
                <th style="width: 140px; padding: 6px; text-align: right;">Total Pencapaian</th>
                <th style="width: 80px; padding: 6px; text-align: right;">Kontribusi</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
              <tr style="background-color: #f1f5f9; font-weight: 800;">
                <td colspan="4" style="padding: 8px 10px; text-align: right; text-transform: uppercase; border-top: 2px solid #0f172a; border-bottom: 1px solid #cbd5e1;">TOTAL PENJUALAN MANAGER:</td>
                <td style="padding: 8px 10px; text-align: right; font-family: monospace; font-size: 12px; color: #0f172a; border-top: 2px solid #0f172a; border-bottom: 1px solid #cbd5e1;">${formatRupiah(totalAll)}</td>
                <td style="padding: 8px 10px; text-align: right; font-family: monospace; border-top: 2px solid #0f172a; border-bottom: 1px solid #cbd5e1;">100.0%</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    } else if (activeView === 'seorangan') {
      pdfFileName = `Laporan_Penjualan_Per_Sales_${selectedSalesperson.replace(/\s+/g, '_')}_${selectedYear}.pdf`;
      const sales = [
        { name: 'Eko Prasetyo', deals: 5, total: 380000000, commission: 19000000, target: 95 },
        { name: 'Feri Setiawan', deals: 4, total: 290000000, commission: 14500000, target: 82 },
        { name: 'Gita Rahayu', deals: 3, total: 180000000, commission: 9000000, target: 60 },
        { name: 'Hadi Wibowo', deals: 2, total: 130000000, commission: 6500000, target: 52 }
      ];
      const totalDeal = 980000000;
      const totalComm = 49000000;
      const rowsHtml = sales.map((s, idx) => `
        <tr style="${idx % 2 === 1 ? 'background-color: #f8fafc;' : '#ffffff'}">
          <td style="padding: 7px 10px; text-align: center; font-family: monospace; border-bottom: 1px solid #e2e8f0; color: #64748b;">${idx + 1}</td>
          <td style="padding: 7px 10px; font-weight: 700; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${s.name}</td>
          <td style="padding: 7px 10px; text-align: center; font-family: monospace; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #4338ca;">${s.deals} Deal</td>
          <td style="padding: 7px 10px; text-align: right; font-family: monospace; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${formatRupiah(s.total)}</td>
          <td style="padding: 7px 10px; text-align: right; font-family: monospace; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #059669;">${formatRupiah(s.commission)}</td>
          <td style="padding: 7px 10px; text-align: right; font-family: monospace; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${s.target}%</td>
        </tr>
      `).join('');

      htmlBody = `
        <div id="pdf-container" style="font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; padding: 12px; background: #fff; font-size: 11px; line-height: 1.4;">
          <div style="border-bottom: 3px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px; display: table; width: 100%;">
            <div style="display: table-cell; vertical-align: middle; width: 100px; padding-right: 12px;">
              ${getLogoSvgHtml('dl-sales')}
            </div>
            <div style="display: table-cell; vertical-align: middle;">
              <div style="font-size: 9px; font-weight: 800; color: #475569; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 2px;">PT JAKARTA PRIMA UTAMA</div>
              <h1 style="font-size: 16px; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">Laporan Penjualan Per Seorangan / Sales</h1>
              <div style="font-size: 11px; color: #475569; margin-top: 3px; font-weight: 600;">Rekapitulasi Kinerja & Insentif Sales (5%) &bull; Tahun Laporan: ${selectedYear} &bull; Periode s/d: ${formatDateIndo(effectiveEndDate)}</div>
            </div>
            <div style="display: table-cell; vertical-align: top; text-align: right;">
              <div style="font-size: 11.5px; font-weight: 700; color: #1e293b; margin-top: 4px;">Dicetak: <span style="font-family: monospace; font-size: 12px; font-weight: 700; color: #0f172a;">${printDateStr}</span></div>
            </div>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px;">
            <thead>
              <tr style="background-color: #0f172a !important; color: #ffffff !important;">
                <th style="width: 30px; padding: 6px; text-align: center;">No</th>
                <th style="padding: 6px;">Nama Agen Sales</th>
                <th style="width: 80px; padding: 6px; text-align: center;">Jumlah Deal</th>
                <th style="width: 140px; padding: 6px; text-align: right;">Total Nilai Deal</th>
                <th style="width: 140px; padding: 6px; text-align: right;">Insentif Komisi (5%)</th>
                <th style="width: 80px; padding: 6px; text-align: right;">Target</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
              <tr style="background-color: #f1f5f9; font-weight: 800;">
                <td colspan="3" style="padding: 8px 10px; text-align: right; text-transform: uppercase; border-top: 2px solid #0f172a; border-bottom: 1px solid #cbd5e1;">TOTAL PENCAPAIAN SALES:</td>
                <td style="padding: 8px 10px; text-align: right; font-family: monospace; font-size: 12px; color: #0f172a; border-top: 2px solid #0f172a; border-bottom: 1px solid #cbd5e1;">${formatRupiah(totalDeal)}</td>
                <td style="padding: 8px 10px; text-align: right; font-family: monospace; font-size: 12px; color: #059669; border-top: 2px solid #0f172a; border-bottom: 1px solid #cbd5e1;">${formatRupiah(totalComm)}</td>
                <td style="padding: 8px 10px; text-align: right; font-family: monospace; border-top: 2px solid #0f172a; border-bottom: 1px solid #cbd5e1;">-</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    } else {
      showToast('Download PDF untuk menu ini belum tersedia.', 'error');
      return;
    }

    try {
      showToast('Menyiapkan file PDF untuk diunduh...', 'info');
      
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.left = '-9999px';
      iframe.style.top = '0';
      iframe.style.width = '794px';
      iframe.style.border = 'none';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      document.body.appendChild(iframe);

      try {
        const iframeDoc = iframe.contentWindow?.document;
        if (!iframeDoc) {
          throw new Error('Tidak dapat membuat dokumen PDF');
        }

        iframeDoc.open();
        iframeDoc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8" />
              <link rel="preconnect" href="https://fonts.googleapis.com" />
              <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
              <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Playball&family=Pacifico&display=swap" rel="stylesheet" />
              <style>
                * { box-sizing: border-box; }
                body {
                  margin: 0;
                  padding: 0;
                  background-color: #ffffff;
                  color: #0f172a;
                  font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                thead { display: table-header-group; }
                tr { page-break-inside: avoid; }
              </style>
            </head>
            <body>
              ${htmlBody}
            </body>
          </html>
        `);
        iframeDoc.close();

        await new Promise((resolve) => setTimeout(resolve, 150));

        const targetEl = iframeDoc.getElementById('pdf-container') || iframeDoc.body;

        const opt = {
          margin: [15, 12, 15, 12] as [number, number, number, number],
          filename: pdfFileName,
          image: { type: 'jpeg' as const, quality: 0.98 },
          pagebreak: { mode: ['css', 'legacy'], avoid: 'tr' },
          html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false,
            windowWidth: 794,
            onclone: (clonedDoc: Document) => {
              const styleNodes = clonedDoc.querySelectorAll('style, link[rel="stylesheet"]');
              styleNodes.forEach((node) => {
                if (node.textContent?.includes('oklch') || node.textContent?.includes('--color-')) {
                  node.remove();
                }
              });
            }
          },
          jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
        };

        await html2pdf().set(opt).from(targetEl).save();
        showToast('File PDF berhasil diunduh!', 'success');
      } finally {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }
    } catch (err: any) {
      console.error('Error downloading PDF:', err);
      showToast('Gagal mengunduh file PDF: ' + (err?.message || 'Error'), 'error');
    }
  };

  // CRUD operations removed for read-only access.

  // Helper to calculate RAP and Selisih consistently
  const getItemRapAndSelisih = (item: any, isScaled: boolean) => {
    const noPo = (item.no_po || item.No_PO || '').trim();
    const rawNilaiPro = Number(item.nilai_pro || item.Nilai_Pro || 0);
    const progressPercent = typeof item.Persen_Progress === 'number' || typeof item.Persen_Progress === 'string'
      ? Number(item.Persen_Progress)
      : 0;
    
    const rawRapCalculated = Math.round(rawNilaiPro * 0.75);
    let rap = isScaled ? Math.round(rawRapCalculated * (progressPercent / 100)) : rawRapCalculated;
    const biaya = Number(item.bia_kom || item.Bia_Kom || 0);
    
    let selisih = rap - biaya;
    
    let totalContributionRap = rap;
    let totalContributionBiaya = biaya;
    let totalContributionSelisih = selisih;
    
    if (noPo === 'Menampung Biaya') {
      rap = 0;
      selisih = 0 - biaya;
      totalContributionRap = 0;
      totalContributionBiaya = biaya;
      totalContributionSelisih = selisih;
    } else if (rawNilaiPro === 0) {
      rap = 0;
      selisih = 0;
      totalContributionRap = 0;
      totalContributionBiaya = 0;
      totalContributionSelisih = 0;
    }
    
    return { 
      rap, 
      selisih, 
      biaya,
      totalContributionRap,
      totalContributionBiaya,
      totalContributionSelisih
    };
  };

  // Helper formatting currency
  const formatRupiah = (value: number) => {
    const isNegative = value < 0;
    const absValue = Math.abs(value);
    const formatted = new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(absValue);
    return isNegative ? `-${formatted}` : formatted;
  };

  // Helper formatting date
  const formatDateIndo = (dateStr: string) => {
    try {
      const parts = dateStr.substring(0, 10).split('-');
      if (parts.length === 3) {
        const year = parts[0];
        const monthNames = [
          'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
          'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'
        ];
        const monthIdx = parseInt(parts[1], 10) - 1;
        const day = parts[2];
        return `${day} ${monthNames[monthIdx]} ${year}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // List of all categories available in current dataset
  const categoriesList = useMemo(() => {
    const list = new Set<string>();
    salesData.forEach(item => {
      if (item.kategori) list.add(item.kategori);
    });
    return ['Semua', ...Array.from(list)];
  }, [salesData]);

  // Handle table sorting
  const handleSort = (field: keyof Penjualan) => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Filter & Sort Sales Data
  const filteredAndSortedSales = useMemo(() => {
    let result = [...salesData];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        item =>
          item.nama_produk.toLowerCase().includes(query) ||
          item.kategori.toLowerCase().includes(query)
      );
    }

    // Filter by category dropdown
    if (selectedCategory !== 'Semua') {
      result = result.filter(item => item.kategori === selectedCategory);
    }

    // Sort
    result.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      // Numbers
      return sortOrder === 'asc'
        ? (valA as number) - (valB as number)
        : (valB as number) - (valA as number);
    });

    return result;
  }, [salesData, searchQuery, selectedCategory, sortBy, sortOrder]);

  // Compute Statistics / KPIs
  const kpis = useMemo(() => {
    const totalRevenue = salesData.reduce((acc, curr) => acc + Number(curr.total_harga), 0);
    const totalQty = salesData.reduce((acc, curr) => acc + curr.jumlah_terjual, 0);
    const avgPrice = salesData.length > 0 ? totalRevenue / totalQty : 0;

    // Top Category
    const categoryRevenue: Record<string, number> = {};
    salesData.forEach(item => {
      categoryRevenue[item.kategori] = (categoryRevenue[item.kategori] || 0) + Number(item.total_harga);
    });

    let topCategory = '-';
    let maxCategoryRev = 0;
    Object.entries(categoryRevenue).forEach(([cat, rev]) => {
      if (rev > maxCategoryRev) {
        maxCategoryRev = rev;
        topCategory = cat;
      }
    });

    return {
      totalRevenue,
      totalQty,
      avgPrice,
      topCategory,
      totalTransactions: salesData.length
    };
  }, [salesData]);

  // Compute category details for custom CSS micro-chart distribution bar
  const categoryChartData = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    salesData.forEach(item => {
      categoryTotals[item.kategori] = (categoryTotals[item.kategori] || 0) + Number(item.total_harga);
    });

    const sortedCats = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
    const maxVal = sortedCats.length > 0 ? sortedCats[0][1] : 1;

    return sortedCats.map(([name, total]) => ({
      name,
      total,
      percentageOfMax: (total / maxVal) * 100,
      percentageOfTotal: kpis.totalRevenue > 0 ? (total / kpis.totalRevenue) * 100 : 0
    }));
  }, [salesData, kpis.totalRevenue]);

  // 1. Customer Report Aggregate
  const customerReportData = useMemo(() => {
    const map: Record<string, { name: string; totalRevenue: number; totalQty: number; txCount: number; lastTxDate: string }> = {};
    salesData.forEach(item => {
      const cust = item.nama_customer || 'Umum';
      if (!map[cust]) {
        map[cust] = {
          name: cust,
          totalRevenue: 0,
          totalQty: 0,
          txCount: 0,
          lastTxDate: item.tanggal
        };
      }
      const node = map[cust];
      node.totalRevenue += Number(item.total_harga);
      node.totalQty += item.jumlah_terjual;
      node.txCount += 1;
      if (item.tanggal.localeCompare(node.lastTxDate) > 0) {
        node.lastTxDate = item.tanggal;
      }
    });
    return Object.values(map).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [salesData]);

  // 2. Project Report Aggregate
  const projectReportData = useMemo(() => {
    const map: Record<string, { name: string; totalRevenue: number; totalQty: number; txCount: number; lastTxDate: string }> = {};
    salesData.forEach(item => {
      const proj = item.nama_proyek || 'Non-Proyek';
      if (!map[proj]) {
        map[proj] = {
          name: proj,
          totalRevenue: 0,
          totalQty: 0,
          txCount: 0,
          lastTxDate: item.tanggal
        };
      }
      const node = map[proj];
      node.totalRevenue += Number(item.total_harga);
      node.totalQty += item.jumlah_terjual;
      node.txCount += 1;
      if (item.tanggal.localeCompare(node.lastTxDate) > 0) {
        node.lastTxDate = item.tanggal;
      }
    });
    return Object.values(map).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [salesData]);

  if (!isLoggedIn) {
    const isLockedOut = failedAttempts >= 3;
    const selectedUserObj = userList.find((u) => u.User_ID === selectedUserId);

    return (
      <div className="min-h-screen bg-slate-800 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-orange-500 selection:text-white">
        {/* Toast Alert Widget */}
        {toast && (
          <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg border text-sm font-medium transition-all duration-300 transform translate-y-0 scale-100 ${
            toast.type === 'success' 
              ? 'bg-emerald-950 text-emerald-200 border-emerald-800' 
              : toast.type === 'error'
                ? 'bg-rose-950 text-rose-200 border-rose-800'
                : 'bg-orange-950 text-orange-200 border-orange-800'
          }`}>
            {toast.type === 'success' && <Check className="w-5 h-5 text-emerald-400 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
            {toast.type === 'info' && <Database className="w-5 h-5 text-orange-400 shrink-0" />}
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 hover:opacity-75 transition-opacity">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Ambient Gray & Soft Glow Effects */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-slate-500/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-zinc-500/25 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md relative z-10">
          {/* Main Card Frame: Warna Dasar Abu-abu Terang (Slate 600) with Top Orange Lis Border */}
          <div className="bg-slate-600 border-x border-b border-slate-500 border-t-4 border-t-orange-500 rounded-3xl p-8 shadow-2xl shadow-slate-950/40 relative overflow-hidden">
            
            {/* Header Brand & Official JPU Logo */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center p-3.5 px-6 sm:p-4 sm:px-8 bg-white border-[3.5px] border-blue-600 rounded-full shadow-xl shadow-blue-500/20 mb-3 ring-4 ring-blue-500/10 transform hover:scale-105 transition-transform">
                <img 
                  src="/picture/logo_jpu.svg" 
                  alt="Logo PT Jakarta Prima Utama" 
                  className="w-36 h-20 sm:w-44 sm:h-24 object-contain px-1" 
                />
              </div>

              {/* Teks Kuning Segar diatas Frame Manajemen Laporan JPU */}
              <div className="text-yellow-300 font-extrabold text-sm sm:text-base tracking-wide mb-1 flex items-center justify-center gap-1 drop-shadow">
                <span>Login ke ...</span>
              </div>

              {/* Teks Judul Besar dalam Frame Warna Orange (Tinggi dikurangi: py-2) */}
              <div className="mt-1 inline-block w-full bg-orange-500 border border-orange-400/80 rounded-2xl py-2 px-4 shadow-lg shadow-orange-500/30">
                <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                  Manajemen Laporan JPU
                </h1>
              </div>
            </div>

            {/* Lockout Box after 3 failed attempts */}
            {isLockedOut ? (
              <div className="bg-rose-950/90 border-2 border-rose-600 rounded-2xl p-5 text-center space-y-3 animate-shake">
                <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto ring-4 ring-rose-500/10">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-rose-300 uppercase tracking-widest">
                    Akses Dibatasi
                  </h3>
                  <p className="text-sm font-extrabold text-rose-100 mt-1.5 leading-relaxed">
                    "Maaf Anda Belum Bisa Membuka Aplikasi Laporan JPU"
                  </p>
                  <p className="text-xs text-rose-300/80 mt-1 leading-normal">
                    Anda telah salah memasukkan password sebanyak 3 kali berturut-turut.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetAttempts}
                  className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Coba Lagi (Reset Percobaan)</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {/* 1. Combo Box for User_ID (Warna Biru, Tinggi dikurangi: py-2) */}
                <div>
                  <label className="block text-xs font-bold text-slate-100 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-blue-300" />
                      <span>Pilih ID Anda</span>
                    </span>
                    {isLoadingUsers && (
                      <span className="text-[10px] text-blue-200 font-normal flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin text-blue-300" /> Memuat SDM...
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    <select
                      value={selectedUserId}
                      onChange={(e) => handleSelectUser(e.target.value)}
                      className="w-full bg-blue-600 hover:bg-blue-700 border border-blue-400/80 focus:border-blue-300 focus:ring-2 focus:ring-blue-400/30 rounded-xl px-3.5 py-2 text-sm text-white font-mono font-semibold appearance-none transition-all cursor-pointer shadow-md shadow-blue-600/20"
                    >
                      <option value="" className="bg-slate-800 text-slate-300">-- Pilih User_ID --</option>
                      {userList.map((u) => (
                        <option key={u.User_ID} value={u.User_ID} className="bg-slate-800 text-white py-1">
                          {u.User_ID} &bull; {u.User_Name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-blue-100 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  {selectedUserObj && (
                    <div className="mt-1.5 text-xs text-blue-200 font-medium flex items-center gap-1.5 bg-blue-900/60 border border-blue-500/50 px-3 py-1.5 rounded-xl">
                      <UserCheck className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                      <span>Nama User: <b className="text-white">{selectedUserObj.User_Name}</b></span>
                    </div>
                  )}
                </div>

                {/* 2. Password Field (Tinggi dikurangi: py-2) */}
                {selectedUserId && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <label className="block text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-orange-300" />
                      <span>Masukkan Password</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="Masukkan password 8 karakter..."
                        maxLength={8}
                        autoFocus
                        className="w-full bg-slate-700 border border-slate-500 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 rounded-xl pl-4 pr-11 py-2 text-sm text-white font-mono tracking-wider transition-all placeholder:text-slate-300 placeholder:font-sans"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-white p-1 transition-colors cursor-pointer"
                        title={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Error Banner */}
                {loginErrorMsg && !isLockedOut && (
                  <div className="p-3 bg-rose-950/60 border border-rose-800/60 rounded-xl text-xs text-rose-300 font-medium flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <div>{loginErrorMsg}</div>
                      {failedAttempts > 0 && (
                        <div className="text-[11px] text-rose-400/80 mt-0.5 font-mono">
                          Percobaan gagal: <b>{failedAttempts} / 3</b>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Login & Keluar Action Buttons (Tinggi disamakan persis) */}
                <div className="flex flex-col sm:flex-row items-stretch gap-2.5 pt-1">
                  <button
                    type="submit"
                    disabled={!selectedUserId || !passwordInput || isSubmittingLogin}
                    className={`flex-1 py-2.5 px-4 rounded-xl font-extrabold text-sm shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      !selectedUserId || !passwordInput || isSubmittingLogin
                        ? 'bg-slate-700 text-slate-400 cursor-not-allowed border border-slate-600'
                        : 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/30 active:scale-[0.99]'
                    }`}
                  >
                    {isSubmittingLogin ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Memverifikasi...</span>
                      </>
                    ) : (
                      <>
                        <span>Masuk ke Laporan JPU</span>
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUserId('');
                      setPasswordInput('');
                      setLoginErrorMsg(null);
                      localStorage.removeItem('jpu_logged_user');
                      showToast('Layar dibersihkan. Keluar aplikasi...', 'info');
                      try {
                        if (window.history.length > 1) {
                          window.history.back();
                        } else {
                          window.close();
                        }
                      } catch (e) {
                        window.location.href = '/';
                      }
                    }}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/40 rounded-xl font-extrabold text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 shrink-0 active:scale-[0.99]"
                    title="Reset Form Login / Keluar Sesi"
                  >
                    <LogOut className="w-4 h-4 text-white" />
                    <span>Keluar</span>
                  </button>
                </div>
              </form>
            )}

            {/* Frame paling bawah warna dasar abu-abu terang dengan font PT. JAKARTA PRIMA UTAMA */}
            <div className="mt-6 bg-slate-700 border border-slate-500/80 rounded-2xl p-4 text-center shadow-md space-y-3">
              <div className="flex justify-center">
                <PWAInstallButton />
              </div>
              <div>
                <div className="text-sm sm:text-base font-black text-white tracking-wider uppercase">
                  PT. JAKARTA PRIMA UTAMA
                </div>
                <div className="text-[9px] text-slate-200 font-semibold tracking-widest uppercase mt-1">
                  General Contractor &amp; Service
                </div>
              </div>
            </div>
          </div>
        </div>
        <OfflineIndicator />
      </div>
    );
  }

  return (
    <div className="lg:h-screen lg:overflow-hidden flex flex-col bg-slate-50">
      
      {/* Toast Alert Widget */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg border text-sm font-medium transition-all duration-300 transform translate-y-0 scale-100 ${
          toast.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : toast.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-indigo-50 text-indigo-800 border-indigo-200'
        }`}>
          {toast.type === 'success' && <Check className="w-5 h-5 text-emerald-600 shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />}
          {toast.type === 'info' && <Database className="w-5 h-5 text-indigo-600 shrink-0" />}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-75 transition-opacity">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="flex flex-1 flex-col lg:flex-row lg:overflow-hidden">
        
        {/* Sidebar Left Column */}
        <aside className="w-full lg:w-72 bg-slate-900 text-white shrink-0 flex flex-col border-r border-slate-800 lg:h-full lg:overflow-y-auto">
          {/* Brand Logo Section */}
          <div className="p-5 border-b border-slate-800 bg-slate-900/40 flex items-center gap-3.5">
            <div className="shrink-0 bg-white p-1.5 px-3 rounded-full border-[3px] border-blue-600 flex items-center justify-center shadow-md shadow-blue-500/10 animate-fadeIn">
              <img 
                src="/picture/logo_jpu.svg" 
                alt="Logo PT Jakarta Prima Utama" 
                className="w-14 h-11 object-contain" 
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-lg font-bold text-white tracking-tight leading-none whitespace-nowrap">
                Manajemen Laporan
              </span>
              <span className="text-[9px] font-bold text-slate-400 font-mono tracking-widest uppercase mt-1">
                Jakarta Prima Utama
              </span>
            </div>
          </div>

          {/* Connected Database Panel */}
          <div className="p-4 mx-4 mt-4 mb-2 bg-slate-800/40 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Database className="w-3 h-3 text-indigo-400" />
                Status Database
              </span>
              {dbStatus ? (
                dbStatus.activeDb === 'MySQL' && dbStatus.status === 'Connected' ? (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                ) : dbStatus.activeDb.includes('Fallback') ? (
                  <span className="flex h-2 w-2 relative">
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                ) : (
                  <span className="flex h-2 w-2 relative">
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-500"></span>
                  </span>
                )
              ) : (
                <RefreshCw className="w-3 h-3 text-slate-500 animate-spin" />
              )}
            </div>

            <div className="space-y-1">
              <div className="text-xs font-bold text-white truncate">
                {dbStatus ? dbStatus.activeDb : 'Menghubungkan...'}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {dbStatus ? (
                  dbStatus.status === 'Connected' ? (
                    <span className="text-emerald-400 font-semibold">Terkoneksi (VPS Aktif)</span>
                  ) : dbStatus.activeDb.includes('Fallback') ? (
                    <span className="text-amber-400 font-semibold" title={dbStatus.error}>MySQL Offline (Gagal Hubung)</span>
                  ) : (
                    <span className="text-slate-400 font-semibold">Sandbox Lokal Aktif</span>
                  )
                ) : (
                  'Mengecek status...'
                )}
              </div>
            </div>

            {dbStatus && (dbStatus.host || dbStatus.database) && (
              <div className="pt-2 border-t border-slate-800/60 space-y-1 text-[10px] font-mono text-slate-400">
                {dbStatus.host && <div className="truncate"><span className="text-slate-500">Host:</span> {dbStatus.host}</div>}
                {dbStatus.database && <div className="truncate"><span className="text-slate-500">DB:</span> {dbStatus.database}</div>}
              </div>
            )}


          </div>
          <nav className="flex-1 px-4 py-2 space-y-2.5">
            <div className="text-[11px] font-extrabold text-amber-400 uppercase tracking-widest px-3 mb-2 mt-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
              <span>Menu Utama</span>
            </div>
            
            {/* 1. Perhitungan RAP (Hijau Emerald) */}
            <button 
              onClick={() => { setActiveView('rap'); }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm transition-all cursor-pointer ${
                activeView === 'rap' 
                  ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-green-500 text-slate-950 font-black border-l-4 border-emerald-100 pl-3.5 shadow-[0_0_22px_rgba(16,185,129,0.7)] ring-1 ring-emerald-300/80 scale-[1.01]' 
                  : 'bg-slate-800/60 hover:bg-emerald-950/60 text-slate-100 hover:text-white border-l-4 border-emerald-500/40 hover:border-emerald-400 pl-3 font-semibold shadow-sm hover:shadow-md hover:shadow-emerald-500/20'
              }`}
            >
              <div className={`p-1.5 rounded-lg transition-colors ${activeView === 'rap' ? 'bg-slate-950/30 text-slate-950' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'}`}>
                <PieChart className="w-4 h-4 shrink-0" />
              </div>
              <span className="tracking-tight">Perhitungan RAP</span>
            </button>

            {/* 2. Perhitungan Overhead (Ungu Fuchsia / Magenta) */}
            <button 
              onClick={() => { setActiveView('overhead'); }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm transition-all cursor-pointer ${
                activeView === 'overhead' 
                  ? 'bg-gradient-to-r from-fuchsia-600 via-purple-600 to-pink-500 text-white font-extrabold border-l-4 border-fuchsia-200 pl-3.5 shadow-[0_0_22px_rgba(217,70,239,0.7)] ring-1 ring-fuchsia-300/80 scale-[1.01]' 
                  : 'bg-slate-800/60 hover:bg-fuchsia-950/60 text-slate-100 hover:text-white border-l-4 border-fuchsia-500/40 hover:border-fuchsia-400 pl-3 font-semibold shadow-sm hover:shadow-md hover:shadow-fuchsia-500/20'
              }`}
            >
              <div className={`p-1.5 rounded-lg transition-colors ${activeView === 'overhead' ? 'bg-white/20 text-white' : 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40'}`}>
                <Calculator className="w-4 h-4 shrink-0" />
              </div>
              <span className="tracking-tight">Perhitungan Overhead</span>
            </button>

            {/* 3. Penjualan Per Customer (Merah Rose / Crimson) */}
            <button 
              onClick={() => { setActiveView('customer'); }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm transition-all cursor-pointer ${
                activeView === 'customer' 
                  ? 'bg-gradient-to-r from-rose-600 via-pink-600 to-red-500 text-white font-extrabold border-l-4 border-rose-200 pl-3.5 shadow-[0_0_22px_rgba(225,29,72,0.7)] ring-1 ring-rose-300/80 scale-[1.01]' 
                  : 'bg-slate-800/60 hover:bg-rose-950/60 text-slate-100 hover:text-white border-l-4 border-rose-500/40 hover:border-rose-400 pl-3 font-semibold shadow-sm hover:shadow-md hover:shadow-rose-500/20'
              }`}
            >
              <div className={`p-1.5 rounded-lg transition-colors ${activeView === 'customer' ? 'bg-white/20 text-white' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'}`}>
                <Users className="w-4 h-4 shrink-0" />
              </div>
              <span className="tracking-tight">Penjualan Per Customer</span>
            </button>

            {/* 4. Penjualan Per Proyek (Biru Royal / Indigo - Dropdown Main Menu) */}
            <div className="space-y-1.5">
              <button 
                onClick={() => { 
                  if (activeView !== 'proyek_selesai' && activeView !== 'proyek_pengerjaan' && activeView !== 'proyek_semua') {
                    setActiveView('proyek_selesai');
                    setIsProyekMenuOpen(true);
                  } else {
                    setIsProyekMenuOpen(!isProyekMenuOpen);
                  }
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm transition-all cursor-pointer ${
                  activeView === 'proyek_selesai' || activeView === 'proyek_pengerjaan' || activeView === 'proyek_semua'
                    ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white font-extrabold border-l-4 border-blue-200 pl-3.5 shadow-[0_0_22px_rgba(37,99,235,0.7)] ring-1 ring-blue-300/80 scale-[1.01]'
                    : 'bg-slate-800/60 hover:bg-blue-950/60 text-slate-100 hover:text-white border-l-4 border-blue-500/40 hover:border-blue-400 pl-3 font-semibold shadow-sm hover:shadow-md hover:shadow-blue-500/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg transition-colors ${activeView === 'proyek_selesai' || activeView === 'proyek_pengerjaan' || activeView === 'proyek_semua' ? 'bg-white/20 text-white' : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'}`}>
                    <Briefcase className="w-4 h-4 shrink-0" />
                  </div>
                  <span className="tracking-tight">Penjualan Per Proyek</span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isProyekMenuOpen ? 'rotate-180 text-white' : 'text-slate-300'}`} />
              </button>

              {/* Collapsible Submenus dengan Warna Terang & Kontras */}
              {isProyekMenuOpen && (
                <div className="pl-3 space-y-2 pt-1.5 animate-fadeIn">
                  
                  {/* Submenu 1: Proyek Selesai (100%) - Hijau Teal */}
                  <button
                    onClick={() => { setActiveView('proyek_selesai'); }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between gap-2 cursor-pointer ${
                      activeView === 'proyek_selesai' 
                        ? 'bg-gradient-to-r from-teal-500 via-emerald-500 to-green-500 text-white border-l-4 border-teal-200 shadow-[0_0_18px_rgba(20,184,166,0.7)] ring-1 ring-teal-300/80 scale-[1.02]' 
                        : 'bg-slate-900/90 hover:bg-teal-950/80 text-teal-300 hover:text-teal-100 border-l-4 border-teal-500/50 hover:border-teal-400 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="relative flex h-2.5 w-2.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,1)]" />
                      </span>
                      <span className="truncate">Proyek Selesai (100%)</span>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 text-[10px] font-black rounded-full uppercase tracking-wider ${
                      activeView === 'proyek_selesai'
                        ? 'bg-white text-teal-900 shadow-sm'
                        : 'bg-teal-500/30 text-teal-200 border border-teal-400/40'
                    }`}>
                      100%
                    </span>
                  </button>

                  {/* Submenu 2: Proyek Belum Selesai - Kuning Amber */}
                  <button
                    onClick={() => { setActiveView('proyek_pengerjaan'); }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between gap-2 cursor-pointer ${
                      activeView === 'proyek_pengerjaan' 
                        ? 'bg-gradient-to-r from-yellow-500 via-amber-500 to-amber-600 text-slate-950 border-l-4 border-yellow-100 shadow-[0_0_18px_rgba(234,179,8,0.7)] ring-1 ring-yellow-200/80 scale-[1.02]' 
                        : 'bg-slate-900/90 hover:bg-yellow-950/80 text-yellow-300 hover:text-yellow-100 border-l-4 border-yellow-500/50 hover:border-yellow-400 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="relative flex h-2.5 w-2.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,1)]" />
                      </span>
                      <span className="truncate">Proyek Belum Selesai</span>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 text-[10px] font-black rounded-full uppercase tracking-wider ${
                      activeView === 'proyek_pengerjaan'
                        ? 'bg-slate-950 text-yellow-300 shadow-sm'
                        : 'bg-yellow-500/30 text-yellow-200 border border-yellow-400/40'
                    }`}>
                      Progres
                    </span>
                  </button>

                  {/* Submenu 3: Proyek Selesai & Belum Selesai - Biru Sky / Cyan */}
                  <button
                    onClick={() => { setActiveView('proyek_semua'); }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between gap-2 cursor-pointer ${
                      activeView === 'proyek_semua' 
                        ? 'bg-gradient-to-r from-sky-500 via-cyan-500 to-blue-600 text-white border-l-4 border-sky-200 shadow-[0_0_18px_rgba(14,165,233,0.7)] ring-1 ring-sky-300/80 scale-[1.02]' 
                        : 'bg-slate-900/90 hover:bg-sky-950/80 text-sky-300 hover:text-sky-100 border-l-4 border-sky-500/50 hover:border-sky-400 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="relative flex h-2.5 w-2.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,1)]" />
                      </span>
                      <span className="truncate">Gabungan Selesai & Belum</span>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 text-[10px] font-black rounded-full uppercase tracking-wider ${
                      activeView === 'proyek_semua'
                        ? 'bg-white text-sky-950 shadow-sm'
                        : 'bg-sky-500/30 text-sky-200 border border-sky-400/40'
                    }`}>
                      Semua
                    </span>
                  </button>

                </div>
              )}
            </div>

            {/* 5. Proyek Dalam Pengerjaan (Oranye Jingga Warm / Amber Flame) */}
            <button 
              onClick={() => { 
                setActiveView('proyek_pengerjaan_all'); 
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                activeView === 'proyek_pengerjaan_all' 
                  ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-red-500 text-slate-950 font-black border-l-4 border-orange-100 pl-3.5 shadow-[0_0_22px_rgba(249,115,22,0.7)] ring-1 ring-orange-200/80 scale-[1.01]' 
                  : 'bg-slate-800/60 hover:bg-orange-950/60 text-slate-100 hover:text-white border-l-4 border-orange-500/40 hover:border-orange-400 pl-3 font-semibold shadow-sm hover:shadow-md hover:shadow-orange-500/20'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-1.5 rounded-lg transition-colors shrink-0 ${activeView === 'proyek_pengerjaan_all' ? 'bg-slate-950/30 text-slate-950' : 'bg-orange-500/20 text-orange-300 border border-orange-500/40'}`}>
                  <Layers className="w-4 h-4 shrink-0" />
                </div>
                <div className="flex flex-col items-start min-w-0">
                  <span className="tracking-tight truncate font-bold text-sm">Proyek Dalam Pengerjaan</span>
                  <span className={`text-[10px] font-semibold leading-tight mt-0.5 ${activeView === 'proyek_pengerjaan_all' ? 'text-slate-950 font-extrabold' : 'text-orange-300/80'}`}>
                    Semua Customer
                  </span>
                </div>
              </div>
            </button>

            {/* Tombol Back / Kembali ke Halaman Login */}
            <div className="pt-6 mt-6 border-t border-slate-800">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl text-xs font-extrabold text-slate-200 hover:text-white bg-slate-800/80 hover:bg-rose-950/80 border border-slate-700 hover:border-rose-600/70 shadow-md transition-all cursor-pointer group"
                title="Keluar & Kembali ke Halaman Login SDM"
              >
                <ArrowLeft className="w-4 h-4 text-orange-400 group-hover:text-rose-400 group-hover:-translate-x-1 transition-all" />
                <span>Back (Kembali ke Login)</span>
              </button>
            </div>
          </nav>
        </aside>

        {/* Content Area Column */}
        <main className="flex-1 p-6 lg:p-10 lg:h-full overflow-y-auto">
          
          {/* Top Bar with Profile / Add action */}
          <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 py-3.5 px-5 bg-slate-200 border border-slate-300 rounded-2xl mb-8 shadow-xs">
            <div className="shrink-0 flex flex-col items-start gap-1.5">
              <h2 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight whitespace-nowrap">
                {activeView === 'rap' && "Perhitungan & Simulasi RAP"}
                {activeView === 'overhead' && "Perhitungan & Simulasi Overhead"}
                {activeView === 'customer' && "Penjualan Per Customer"}
                {activeView === 'proyek_selesai' && "Proyek Selesai (100%)"}
                {activeView === 'proyek_pengerjaan' && "Proyek Belum Selesai"}
                {activeView === 'proyek_pengerjaan_all' && "Proyek Dalam Pengerjaan (Semua Customer)"}
                {activeView === 'proyek_semua' && "Gabungan Selesai & Belum"}
              </h2>
              <div className="inline-flex items-center shrink-0">
                <span className="text-xs bg-blue-600 text-white font-semibold px-3 py-1.5 rounded-lg shadow-sm whitespace-nowrap">
                  {(() => {
                    const startStr = `01 Januari ${selectedYear}`;
                    const effectiveEnd = getEffectiveEndDate(selectedYear, endDateOption, customEndDate);
                    const endFormatted = formatDateIndo(effectiveEnd);
                    let label = '';
                    if (endDateOption === 'today') {
                      if (selectedYear < new Date().getFullYear()) {
                        label = ' (Akhir Tahun Lalu)';
                      } else {
                        label = ' (Tanggal Hari Ini)';
                      }
                    } else {
                      label = ' (Pilih Tanggal Sendiri)';
                    }
                    return `Per. ${startStr} s/d ${endFormatted}${label}`;
                  })()}
                </span>
              </div>
            </div>

            {/* Actions Panel (Rapatkan ke kanan) */}
            <div className="flex flex-wrap items-center justify-end gap-3 ml-auto">
              {/* Year Selector Combobox */}
              {(activeView === 'rap' || activeView === 'overhead' || activeView === 'customer' || activeView === 'proyek_selesai' || activeView === 'proyek_pengerjaan' || activeView === 'proyek_pengerjaan_all' || activeView === 'proyek_semua') && (
                <div className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 border border-orange-600/20 text-white rounded-lg px-3 py-1.5 shadow-md shadow-orange-500/10 transition-colors shrink-0">
                  <span className="text-[10px] font-extrabold text-orange-950 uppercase tracking-wider whitespace-nowrap">Tahun Laporan:</span>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="text-xs bg-transparent border-none focus:outline-none focus:ring-0 text-white font-extrabold cursor-pointer py-0.5 pr-6 [color-scheme:dark]"
                  >
                    {Array.from({ length: new Date().getFullYear() - 2024 + 1 }, (_, i) => 2024 + i).map((y) => (
                      <option key={y} value={y} className="text-slate-800 bg-white font-semibold">{y}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Tanggal Akhir Selector Control (Rapatkan ke kanan) */}
              {(activeView === 'rap' || activeView === 'overhead' || activeView === 'customer' || activeView === 'proyek_selesai' || activeView === 'proyek_pengerjaan' || activeView === 'proyek_pengerjaan_all' || activeView === 'proyek_semua') && (
                <div className="flex flex-wrap items-center gap-2 bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-1.5 shadow-md shrink-0">
                  <span className="text-[10px] font-extrabold text-indigo-300 uppercase tracking-wider flex items-center gap-1 whitespace-nowrap">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    Tanggal Akhir:
                  </span>
                  <select
                    value={endDateOption}
                    onChange={(e) => setEndDateOption(e.target.value as 'today' | 'custom')}
                    className="text-xs bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-white font-extrabold cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-400 [color-scheme:dark]"
                  >
                    {selectedYear < new Date().getFullYear() ? (
                      <option value="today">Akhir Tahun Lalu ({selectedYear})</option>
                    ) : (
                      <option value="today">Tanggal Hari Ini</option>
                    )}
                    <option value="custom">Pilih Tanggal Sendiri</option>
                  </select>

                  {endDateOption === 'custom' && (
                    <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-0.5 rounded border border-indigo-500/60">
                      <span className="text-[10px] font-semibold text-slate-400">s/d</span>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="text-xs bg-transparent text-white font-mono font-bold border-none focus:outline-none cursor-pointer [color-scheme:dark]"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Tombol Segarkan Data, Cetak PDF, & Download PDF (Sejajar & Rapat Kanan) */}
              <div className="flex items-center gap-2.5 shrink-0">
                <button 
                  onClick={() => {
                    fetchData();
                    fetchMonthlyTrend(selectedYear);
                    if (activeView === 'rap') {
                      fetchRapReport(selectedYear, endDateOption, customEndDate, selectedRapCusCode);
                    } else if (activeView === 'overhead') {
                      fetchOverheadReport(selectedYear, endDateOption, customEndDate);
                    } else if (activeView === 'customer') {
                      fetchCustomCustomerReport(selectedYear, endDateOption, customEndDate);
                    } else if (activeView === 'proyek_selesai') {
                      fetchProjectReport('selesai', selectedYear, endDateOption, customEndDate);
                      if (selectedCusCode !== 'Semua') {
                        fetchSelectedCustomerProyeks(selectedCusCode, selectedYear, 'selesai', endDateOption, customEndDate);
                      }
                    } else if (activeView === 'proyek_pengerjaan') {
                      fetchProjectReport('pengerjaan', selectedYear, endDateOption, customEndDate);
                      if (selectedCusCode !== 'Semua') {
                        fetchSelectedCustomerProyeks(selectedCusCode, selectedYear, 'pengerjaan', endDateOption, customEndDate);
                      }
                    } else if (activeView === 'proyek_semua') {
                      fetchProjectReport('semua', selectedYear, endDateOption, customEndDate);
                      if (selectedCusCode !== 'Semua') {
                        fetchSelectedCustomerProyeks(selectedCusCode, selectedYear, 'semua', endDateOption, customEndDate);
                      }
                    }
                  }}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 hover:text-slate-900 active:scale-95 transition-all disabled:opacity-50 cursor-pointer whitespace-nowrap"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
                  <span>Segarkan Data</span>
                </button>

                <PWAInstallButton />

                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-rose-300 hover:text-white bg-rose-950/80 hover:bg-rose-600 border border-rose-800/80 hover:border-rose-500 rounded-lg transition-all cursor-pointer shadow-sm shrink-0"
                  title="Keluar / Switch User SDM"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Keluar</span>
                </button>
              </div>
            </div>
          </header>


          {/* VIEW: Perhitungan RAP */}
          {activeView === 'rap' && (
            <div className="space-y-6 py-6 animate-fadeIn">

              {/* Banner Summary KPIs for RAP */}
              {(() => {
                const totalTotpro = rapReportData.reduce((acc, item) => acc + Number(item.totpro || 0), 0);
                const totalRap = rapReportData.reduce((acc, item) => acc + Number(item.Nilai_RAP || 0), 0);
                const totalBiaya = rapReportData.reduce((acc, item) => acc + Number(item.Total_Biaya || 0), 0);
                const totalSelisih = rapReportData.reduce((acc, item) => acc + Number(item.Selisih || 0), 0);
                const isEfisien = totalSelisih >= 0;

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
                      <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5" />
                        Nilai Proyek Bersih
                      </span>
                      <div className="text-xl font-extrabold text-white font-mono mt-1">
                        {formatRupiah(totalTotpro)}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-2 font-mono">
                        {rapReportData.length} Customer PKP Terhitung
                      </div>
                    </div>

                    <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
                      <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                        <Calculator className="w-3.5 h-3.5" />
                        Nilai RAP
                      </span>
                      <div className="text-xl font-extrabold text-blue-400 font-mono mt-1">
                        {formatRupiah(totalRap)}
                      </div>
                      <div className="text-[10px] text-blue-300/80 mt-2 font-mono font-semibold">
                        75% dari Nilai Proyek Bersih
                      </div>
                    </div>

                    <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
                      <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5" />
                        Total Biaya Realisasi
                      </span>
                      <div className="text-xl font-extrabold text-indigo-300 font-mono mt-1">
                        {formatRupiah(totalBiaya)}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-2 font-mono">
                        Total Biaya Proyek
                      </div>
                    </div>

                    <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
                      <div className={`absolute -right-4 -bottom-4 w-20 h-20 ${isEfisien ? 'bg-emerald-500/10' : 'bg-rose-500/10'} rounded-full blur-xl pointer-events-none`} />
                      <span className={`text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${isEfisien ? 'text-emerald-400' : 'text-rose-400'}`}>
                        <TrendingUp className="w-3.5 h-3.5" />
                        Selisih RAP
                      </span>
                      <div className={`text-xl font-extrabold font-mono mt-1 ${isEfisien ? 'text-emerald-300' : 'text-rose-300'}`}>
                        {isEfisien ? `+${formatRupiah(totalSelisih)}` : formatRupiah(totalSelisih)}
                      </div>
                      <div className={`text-[10px] mt-2 font-mono font-bold ${isEfisien ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isEfisien ? 'Margin Positif (Efisien)' : 'Overbudget'}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Chart: Visualisasi Hasil Perhitungan RAP Per Customer */}
              {!rapReportLoading && !rapReportError && rapReportData.length > 0 && (
                <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-xl space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-white text-base tracking-tight flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                        <span>Grafik Distribusi & Kontribusi Perhitungan RAP Per Customer</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Visualisasi proporsi Nilai RAP (75% dari Nilai Proyek Bersih), Total Biaya Realisasi, serta Margin Efisiensi per mitra pelanggan.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        onClick={() => setShowRapSqlPeek(!showRapSqlPeek)}
                        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
                      >
                        <Database className="w-3.5 h-3.5" />
                        <span>{showRapSqlPeek ? 'Sembunyikan SQL' : 'Lihat SQL Query'}</span>
                      </button>
                    </div>
                  </div>

                  {/* SQL Query Collapsible Explorer */}
                  {showRapSqlPeek && (
                    <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 font-mono text-[10.5px] leading-relaxed text-emerald-300 overflow-x-auto whitespace-pre animate-fadeIn">
                      <div className="text-slate-500 font-sans font-semibold text-xs mb-2">Query SQL RAP yang Dieksekusi:</div>
                      {rapReportMeta?.query || `SELECT 
    a.Cus_Code AS Cus_Code, 
    b.Cus_Name AS Cus_Name, 
    SUM(ROUND(a.Nilai_PRO * 0.9735)) AS totpro,
    SUM(CASE 
        WHEN a.No_PO = 'Menampung Biaya' THEN 0
        WHEN COALESCE(a.Nilai_PRO, 0) = 0 THEN 0 
        ELSE ROUND(ROUND(ROUND(a.Nilai_PRO * 0.9735) * 0.75) * ((COALESCE(a.Persen_Progress, 0)) / 100))
    END) AS Nilai_RAP,
    SUM(CASE 
        WHEN a.No_PO = 'Menampung Biaya' THEN COALESCE(a.Bia_Kom, 0)
        WHEN COALESCE(a.Nilai_PRO, 0) = 0 THEN 0
        ELSE COALESCE(a.Bia_Kom, 0)
    END) AS Total_Biaya,
    SUM(CASE
        WHEN a.No_PO = 'Menampung Biaya' THEN (0 - COALESCE(a.Bia_Kom, 0))
        WHEN COALESCE(a.Nilai_PRO, 0) = 0 THEN 0
        ELSE (ROUND(ROUND(ROUND(a.Nilai_PRO * 0.9735) * 0.75) * ((COALESCE(a.Persen_Progress, 0)) / 100)) - COALESCE(a.Bia_Kom, 0))
    END) AS Selisih
FROM proyek AS a
INNER JOIN mas_customer AS b 
    ON a.Cus_Code = b.Cus_Code 
WHERE a.Tgl_Proyek BETWEEN '2026-01-01' AND '2026-10-13'
  AND b.PKP = 'Y'
GROUP BY a.Cus_Code, b.Cus_Name 
ORDER BY b.Cus_Name;`}
                    </div>
                  )}

                  {/* Mini KPI Cards for Chart */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                    <div className="sm:col-span-3 p-3">
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Nilai RAP</span>
                      <div className="text-base sm:text-lg font-bold text-blue-400 font-mono mt-0.5">
                        {formatRupiah(rapReportData.reduce((acc: number, item: any) => acc + Number(item.Nilai_RAP || 0), 0))}
                      </div>
                    </div>
                    <div className="sm:col-span-6 p-3 border-t sm:border-t-0 sm:border-l border-slate-800/60">
                      {(() => {
                        const totalKeuntungan = rapReportData.reduce((acc: number, item: any) => acc + Number(item.Selisih || 0), 0);
                        const topKeuntungan = rapReportData.reduce(
                          (max: any, item: any) => Number(item.Selisih || 0) > Number(max.Selisih || 0) ? item : max,
                          rapReportData[0] || { Cus_Name: '-', Selisih: 0 }
                        );
                        return (
                          <div>
                            <div className="text-[11px] sm:text-xs font-bold text-emerald-400 font-mono pb-1 mb-1.5 border-b border-slate-800/80 flex items-center justify-start gap-2 flex-wrap">
                              <span className="text-slate-400 font-sans uppercase text-[10px] font-bold tracking-wider">TOTAL KEUNTUNGAN :</span>
                              <span className="font-extrabold text-emerald-400 text-sm sm:text-base">{formatRupiah(totalKeuntungan)}</span>
                            </div>
                            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">KONTRIBUTOR KEUNTUNGAN TERTINGGI</span>
                            <div className="mt-0.5">
                              <div className="text-[11px] sm:text-xs font-extrabold text-yellow-300 leading-snug break-words drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" title={topKeuntungan.Cus_Name}>
                                {topKeuntungan.Cus_Name}
                              </div>
                              <div className="text-xs font-bold text-emerald-300 font-mono mt-0.5">
                                Nilai Keuntungan: {formatRupiah(Number(topKeuntungan.Selisih || 0))}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    <div className="sm:col-span-3 p-3 border-t sm:border-t-0 sm:border-l border-slate-800/60">
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Biaya Realisasi</span>
                      <div className="text-base sm:text-lg font-bold text-indigo-300 font-mono mt-0.5">
                        {formatRupiah(rapReportData.reduce((acc: number, item: any) => acc + Number(item.Total_Biaya || 0), 0))}
                      </div>
                    </div>
                  </div>

                  {/* Vertical / Horizontal Progress Chart Grid */}
                  <div className="space-y-2 pt-1">
                    {(() => {
                      const maxKeuntungan = Math.max(...rapReportData.map((x: any) => Number(x.Selisih || 0))) || 1;
                      const totalKeuntunganAll = rapReportData.reduce((acc: number, x: any) => acc + Math.max(0, Number(x.Selisih || 0)), 0) || 1;

                      return rapReportData.map((item: any, idx: number) => {
                        const rapVal = Number(item.Nilai_RAP || 0);
                        const biayaVal = Number(item.Total_Biaya || 0);
                        const selisihVal = Number(item.Selisih || 0);

                        const percentageOfMax = (Math.max(0, selisihVal) / maxKeuntungan) * 100;
                        const percentageOfTotal = (Math.max(0, selisihVal) / totalKeuntunganAll) * 100;
                        const isTopContributor = selisihVal === maxKeuntungan && selisihVal > 0;

                        const bgColors = [
                          'bg-slate-950/60 border-l-4 border-emerald-500/90',
                          'bg-slate-950/60 border-l-4 border-blue-500/90',
                          'bg-slate-950/60 border-l-4 border-purple-500/90',
                          'bg-slate-950/60 border-l-4 border-amber-500/90',
                          'bg-slate-950/60 border-l-4 border-rose-500/90',
                          'bg-slate-950/60 border-l-4 border-cyan-500/90',
                          'bg-slate-950/60 border-l-4 border-fuchsia-500/90',
                          'bg-slate-950/60 border-l-4 border-teal-500/90',
                          'bg-slate-950/60 border-l-4 border-orange-500/90',
                          'bg-slate-950/60 border-l-4 border-indigo-500/90'
                        ];
                        const rowBg = bgColors[idx % bgColors.length];

                        const barGradients = [
                          'from-emerald-400 via-teal-500 to-cyan-500',
                          'from-blue-500 via-indigo-500 to-purple-600',
                          'from-purple-500 via-fuchsia-500 to-pink-500',
                          'from-amber-400 via-orange-500 to-red-500',
                          'from-rose-500 via-pink-500 to-violet-500',
                          'from-cyan-400 via-sky-500 to-blue-600',
                          'from-fuchsia-400 via-rose-500 to-amber-500',
                          'from-teal-400 via-emerald-500 to-green-500',
                          'from-orange-400 via-amber-500 to-yellow-400',
                          'from-indigo-400 via-violet-500 to-purple-500'
                        ];
                        const barGradient = barGradients[idx % barGradients.length];

                        return (
                          <div key={item.Cus_Code || idx} className={`group flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2.5 ${rowBg} py-2 px-3.5 rounded-lg transition-colors ${isTopContributor ? 'ring-1 ring-emerald-500/50 bg-emerald-950/20' : ''}`}>
                            {/* Customer Name & Info */}
                            <div className="sm:w-1/2 shrink-0">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-bold text-xs sm:text-[13px] text-white whitespace-nowrap overflow-hidden text-ellipsis" title={item.Cus_Name}>
                                  {item.Cus_Name}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 mt-1 text-[10px] font-mono text-slate-400">
                                <span className="text-blue-300 font-bold bg-blue-950/50 px-1.5 py-0.5 rounded border border-blue-900/40 whitespace-nowrap">
                                  RAP: {formatRupiah(rapVal)}
                                </span>
                                <span className="text-indigo-300 font-bold bg-indigo-950/50 px-1.5 py-0.5 rounded border border-indigo-900/40 whitespace-nowrap">
                                  Biaya: {formatRupiah(biayaVal)}
                                </span>
                                {isTopContributor && (
                                  <span className="text-[9.5px] font-black px-2 py-0.5 rounded bg-yellow-400 text-slate-950 border border-yellow-300 uppercase tracking-wider shrink-0 shadow-[0_0_10px_rgba(250,204,21,0.6)]">
                                    👑 TERTINGGI
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Graphical Bar */}
                            <div className="flex-1 flex items-center gap-2 min-w-0">
                              <div className="flex-1 bg-slate-950 h-5 rounded overflow-hidden relative border border-slate-800">
                                <div 
                                  className={`h-full bg-gradient-to-r ${barGradient} rounded shadow-[inset_-3px_0_10px_rgba(0,0,0,0.05)] transition-all duration-500 saturate-[1.15]`}
                                  style={{ width: `${Math.max(percentageOfMax, 2)}%` }}
                                />
                              </div>
                              
                              {/* Percentage Badge & Status */}
                              <div className="shrink-0 flex items-center gap-1.5">
                                <span className="font-mono text-xs font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 min-w-[58px] text-right" title="Share Kontribusi Keuntungan">
                                  {percentageOfTotal.toFixed(2)}%
                                </span>
                                <span className={`font-mono text-[10px] font-extrabold px-2 py-0.5 rounded border whitespace-nowrap ${
                                  selisihVal >= 0 
                                    ? 'text-emerald-400 bg-emerald-950/60 border-emerald-800/80' 
                                    : 'text-rose-400 bg-rose-950/60 border-rose-800/80'
                                }`}>
                                  {selisihVal >= 0 ? `+${formatRupiah(selisihVal)}` : formatRupiah(selisihVal)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              {/* Data Table Panel Per Customer */}
              <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="font-bold text-white text-base tracking-tight flex items-center gap-2">
                      <PieChart className="w-5 h-5 text-emerald-400" />
                      <span>Rekapitulasi Perhitungan RAP Per Customer</span>
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      onClick={handlePrintPdf}
                      disabled={rapReportLoading || rapReportData.length === 0}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-slate-800 disabled:text-slate-500 border border-rose-700 disabled:border-slate-800 rounded-lg shadow-sm hover:shadow transition-all cursor-pointer whitespace-nowrap"
                      title="Cetak Laporan Perhitungan RAP ke PDF"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Cetak PDF</span>
                    </button>
                    <div className="text-xs text-slate-400 font-mono">
                      Total: <strong className="text-emerald-400">{rapReportData.length}</strong> Customer
                    </div>
                    <button
                      onClick={() => setShowRapSqlPeek(!showRapSqlPeek)}
                      className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
                    >
                      <Database className="w-3.5 h-3.5" />
                      <span>{showRapSqlPeek ? 'Sembunyikan SQL' : 'Lihat SQL Query'}</span>
                    </button>
                  </div>
                </div>

                {/* SQL Query Collapsible Explorer */}
                {showRapSqlPeek && (
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-[10.5px] leading-relaxed text-emerald-300 overflow-x-auto whitespace-pre animate-fadeIn">
                    <div className="text-slate-500 font-sans font-semibold text-xs mb-2">Query SQL RAP yang Dieksekusi:</div>
                    {rapReportMeta?.query || `SELECT 
    a.Cus_Code AS Cus_Code, 
    b.Cus_Name AS Cus_Name, 
    SUM(ROUND(a.Nilai_PRO * 0.9735)) AS totpro,
    SUM(CASE 
        WHEN a.No_PO = 'Menampung Biaya' THEN 0
        WHEN COALESCE(a.Nilai_PRO, 0) = 0 THEN 0 
        ELSE ROUND(ROUND(ROUND(a.Nilai_PRO * 0.9735) * 0.75) * ((COALESCE(a.Persen_Progress, 0)) / 100))
    END) AS Nilai_RAP,
    SUM(CASE 
        WHEN a.No_PO = 'Menampung Biaya' THEN COALESCE(a.Bia_Kom, 0)
        WHEN COALESCE(a.Nilai_PRO, 0) = 0 THEN 0
        ELSE COALESCE(a.Bia_Kom, 0)
    END) AS Total_Biaya,
    SUM(CASE
        WHEN a.No_PO = 'Menampung Biaya' THEN (0 - COALESCE(a.Bia_Kom, 0))
        WHEN COALESCE(a.Nilai_PRO, 0) = 0 THEN 0
        ELSE (ROUND(ROUND(ROUND(a.Nilai_PRO * 0.9735) * 0.75) * ((COALESCE(a.Persen_Progress, 0)) / 100)) - COALESCE(a.Bia_Kom, 0))
    END) AS Selisih
FROM proyek AS a
INNER JOIN mas_customer AS b 
    ON a.Cus_Code = b.Cus_Code 
WHERE a.Tgl_Proyek BETWEEN '2026-01-01' AND '2026-10-13'
  AND b.PKP = 'Y'
GROUP BY a.Cus_Code, b.Cus_Name 
ORDER BY b.Cus_Name;`}
                  </div>
                )}

                {rapReportLoading ? (
                  <div className="py-12 text-center text-slate-400 font-medium flex items-center justify-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
                    <span>Mengeksekusi query RAP per customer...</span>
                  </div>
                ) : rapReportError ? (
                  <div className="py-8 text-center text-rose-400 text-xs font-semibold">
                    {rapReportError}
                  </div>
                ) : rapReportData.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    Tidak ditemukan data customer untuk kriteria yang dipilih.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                          <th className="py-2.5 px-3 text-center font-mono">No</th>
                          <th className="py-2.5 px-4 text-center">Nama Customer</th>
                          <th className="py-2.5 px-3 text-center">Nilai Proyek</th>
                          <th className="py-2.5 px-3 text-center">Nilai RAP</th>
                          <th className="py-2.5 px-3 text-center">Total Biaya</th>
                          <th className="py-2.5 px-3 text-center">Selisih</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 text-slate-300">
                        {rapReportData.map((item: any, idx: number) => {
                          const totproVal = Number(item.totpro || 0);
                          const rapVal = Number(item.Nilai_RAP || 0);
                          const biayaVal = Number(item.Total_Biaya || 0);
                          const selisihVal = Number(item.Selisih || 0);

                          return (
                            <tr key={item.Cus_Code || idx} className="hover:bg-slate-800/40 transition-colors">
                              <td className="py-3 px-3 font-mono text-center text-slate-500 font-semibold text-[13px]">{idx + 1}</td>
                              <td className="py-3 px-4 font-bold text-white whitespace-nowrap">{item.Cus_Name || '-'}</td>
                              <td className="py-3 px-3 text-right font-mono text-slate-200 font-semibold text-[13px]">{formatRupiah(totproVal)}</td>
                              <td className="py-3 px-3 text-right font-mono font-bold text-blue-400 text-[13px]">{formatRupiah(rapVal)}</td>
                              <td className="py-3 px-3 text-right font-mono font-bold text-indigo-300 text-[13px]">{formatRupiah(biayaVal)}</td>
                              <td className={`py-3 px-3 text-right font-mono font-extrabold text-[13px] ${selisihVal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {formatRupiah(selisihVal)}
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="bg-slate-900 font-extrabold border-t-2 border-slate-800 text-white">
                          <td colSpan={2} className="py-3 px-4 text-right font-sans text-xs tracking-wider">TOTAL KESELURUHAN:</td>
                          <td className="py-3 px-3 text-right font-mono text-slate-200 text-[13.5px]">
                            {formatRupiah(rapReportData.reduce((acc, item) => acc + Number(item.totpro || 0), 0))}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-blue-400 text-[13.5px]">
                            {formatRupiah(rapReportData.reduce((acc, item) => acc + Number(item.Nilai_RAP || 0), 0))}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-indigo-300 text-[13.5px]">
                            {formatRupiah(rapReportData.reduce((acc, item) => acc + Number(item.Total_Biaya || 0), 0))}
                          </td>
                          <td className={`py-3 px-3 text-right font-mono text-[13.5px] ${
                            rapReportData.reduce((acc, item) => acc + Number(item.Selisih || 0), 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {formatRupiah(rapReportData.reduce((acc, item) => acc + Number(item.Selisih || 0), 0))}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* VIEW: Perhitungan Overhead */}
          {activeView === 'overhead' && (
            <div className="space-y-6 py-6 animate-fadeIn">

              {/* Container/Frame Option Pembayaran Hutang */}
              <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl shadow-xl text-white space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-amber-400" />
                    <h3 className="font-bold text-white text-xs uppercase tracking-wider">
                      OPSI PERHITUNGAN PEMBAYARAN HUTANG
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold w-fit">
                    Nomer Rekening: 002002, 002004, 050300
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
                  <label 
                    onClick={() => setPembayaranHutangOption('hitung')}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border cursor-pointer transition-all ${
                      pembayaranHutangOption === 'hitung'
                        ? 'bg-amber-500/15 border-amber-400 text-white shadow-md shadow-amber-500/10 ring-1 ring-amber-400/40'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="pembayaranHutang"
                      value="hitung"
                      checked={pembayaranHutangOption === 'hitung'}
                      onChange={() => setPembayaranHutangOption('hitung')}
                      className="text-amber-500 focus:ring-amber-400 cursor-pointer"
                    />
                    <div>
                      <span className="block text-xs font-extrabold text-amber-300">
                        Pembayaran Hutang diHitung
                      </span>
                    </div>
                  </label>

                  <label 
                    onClick={() => setPembayaranHutangOption('tidak_hitung')}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border cursor-pointer transition-all ${
                      pembayaranHutangOption === 'tidak_hitung'
                        ? 'bg-amber-500/15 border-amber-400 text-white shadow-md shadow-amber-500/10 ring-1 ring-amber-400/40'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="pembayaranHutang"
                      value="tidak_hitung"
                      checked={pembayaranHutangOption === 'tidak_hitung'}
                      onChange={() => setPembayaranHutangOption('tidak_hitung')}
                      className="text-amber-500 focus:ring-amber-400 cursor-pointer"
                    />
                    <div>
                      <span className="block text-xs font-extrabold text-amber-300">
                        Pembayaran Hutang Tidak diHitung
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Banner Summary KPIs */}
              {(() => {
                const summary = overheadReportData?.summary || {};
                const itemsList: any[] = overheadReportData?.items || [];
                const totalNilaiProRaw = summary.totalNilaiProRaw || 0;
                const totalNilaiProNet = summary.totalNilaiProNet || 0;
                const targetOverhead25 = summary.targetOverhead25 || 0;
                
                const debtAccIds = ['002002', '002004', '050300'];
                const isDebtAccount = (accId: any) => debtAccIds.includes(String(accId || '').trim());

                const totalRealisasiOverhead = itemsList.reduce((acc: number, it: any) => {
                  if (pembayaranHutangOption === 'tidak_hitung' && isDebtAccount(it.Acc_ID)) {
                    return acc;
                  }
                  return acc + Number(it.Total_Jumlah || 0);
                }, 0);

                const selisihEfisiensi = targetOverhead25 - totalRealisasiOverhead;
                const isEfisien = selisihEfisiensi >= 0;

                return (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
                        <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                          <Briefcase className="w-3.5 h-3.5" />
                          Nilai Proyek Bersih (-2.65%)
                        </span>
                        <div className="text-xl font-extrabold text-white font-mono mt-1">
                          {formatRupiah(totalNilaiProNet)}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-2 font-mono">
                          Raw: {formatRupiah(totalNilaiProRaw)}
                        </div>
                      </div>

                      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
                        <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                          <Percent className="w-3.5 h-3.5" />
                          Target Overhead (25%)
                        </span>
                        <div className="text-xl font-extrabold text-blue-300 font-mono mt-1">
                          {formatRupiah(targetOverhead25)}
                        </div>
                        <div className="text-[10px] text-blue-400/80 mt-2 font-mono font-semibold">
                          25% dari Nilai Proyek Bersih
                        </div>
                      </div>

                      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
                        <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-purple-500/10 rounded-full blur-xl pointer-events-none" />
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                          <Calculator className="w-3.5 h-3.5" />
                          Realisasi Overhead (Off &amp; Wks)
                        </span>
                        <div className="text-xl font-extrabold text-purple-300 font-mono mt-1 flex items-center justify-between">
                          <span>{formatRupiah(totalRealisasiOverhead)}</span>
                          <button
                            onClick={() => fetchOverheadVouchers(undefined, 'Semua Rekening Biaya')}
                            className="text-xs text-amber-400 hover:text-amber-300 font-sans font-semibold underline flex items-center gap-1 cursor-pointer"
                            title="Klik untuk rincian per Nomor Voucher"
                          >
                            <Search className="w-3 h-3" />
                            <span>Detail</span>
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-2 font-mono">
                          {itemsList.length} Akun Biaya Terelasi {pembayaranHutangOption === 'tidak_hitung' && '(3 Hutang Excl.)'}
                        </div>
                      </div>

                      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
                        <div className={`absolute -right-4 -bottom-4 w-20 h-20 ${isEfisien ? 'bg-emerald-500/10' : 'bg-rose-500/10'} rounded-full blur-xl pointer-events-none`} />
                        <span className={`text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${isEfisien ? 'text-emerald-400' : 'text-rose-400'}`}>
                          <TrendingUp className="w-3.5 h-3.5" />
                          Status Efisiensi Overhead
                        </span>
                        <div className={`text-xl font-extrabold font-mono mt-1 ${isEfisien ? 'text-emerald-300' : 'text-rose-300'}`}>
                          {isEfisien ? `+${formatRupiah(selisihEfisiensi)}` : formatRupiah(selisihEfisiensi)}
                        </div>
                        <div className={`text-[10px] mt-2 font-mono font-bold ${isEfisien ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isEfisien ? 'Efisien (Di Bawah Target 25%)' : 'Melebihi Target 25%'}
                        </div>
                      </div>
                    </div>

                    {/* SQL Query Collapsible Explorer for Overhead */}
                    <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-xl space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                        <div>
                          <h3 className="font-bold text-white text-sm tracking-tight flex items-center gap-2">
                            <Calculator className="w-4 h-4 text-amber-400" />
                            <span>Rincian Komponen Biaya Overhead</span>
                          </h3>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={handlePrintPdf}
                            disabled={!overheadReportData || overheadReportLoading}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-slate-800 disabled:text-slate-500 border border-rose-700 disabled:border-slate-800 rounded-lg shadow-sm hover:shadow transition-all cursor-pointer whitespace-nowrap"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Cetak PDF</span>
                          </button>
                          <button
                            onClick={() => setShowOverheadSqlPeek(!showOverheadSqlPeek)}
                            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
                          >
                            <Database className="w-3.5 h-3.5" />
                            <span>{showOverheadSqlPeek ? 'Sembunyikan SQL' : 'Lihat SQL Query'}</span>
                          </button>
                        </div>
                      </div>

                      {showOverheadSqlPeek && (
                        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 font-mono text-[10.5px] leading-relaxed text-amber-300 overflow-x-auto whitespace-pre animate-fadeIn">
                          <div className="text-slate-500 font-sans font-semibold text-xs mb-2">Query SQL Overhead yang Dieksekusi:</div>
                          {overheadReportData?.queryExecuted || `-- Query 1: Target Overhead 25% (Proyek & Customer PKP='Y')
SELECT 
    SUM(a.Nilai_Pro) AS Total_Nilai_Pro_Raw,
    SUM(a.Nilai_Pro * 97.35/100) AS Total_Nilai_Pro_Net,
    SUM(a.Nilai_Pro * 97.35/100) * 0.25 AS Target_Overhead_25
FROM proyek AS a
INNER JOIN mas_customer AS b 
    ON a.Cus_Code = b.Cus_Code
WHERE a.Tgl_Proyek BETWEEN '2026-01-01' AND '2026-10-12'
  AND b.PKP = 'Y';

-- Query 2: Rincian 3 Tabel (KasKeluar_Mas + KasKeluar_Det + AMF_Jpu)
SELECT 
    kd.Acc_ID,
    j.Acc_Name,
    SUM(kd.Jumlah) AS Total_Jumlah,
    COUNT(DISTINCT km.No_Voucher) AS Total_Voucher
FROM KasKeluar_Mas AS km
INNER JOIN KasKeluar_Det AS kd ON km.No_Voucher = kd.No_Voucher
INNER JOIN AMF_Jpu AS j ON kd.Acc_ID = j.Acc_ID
WHERE (km.Divisi = 'Off' OR km.Divisi = 'Wks')
  AND km.Tgl_Voucher BETWEEN '2026-01-01' AND '2026-10-12'
GROUP BY kd.Acc_ID, j.Acc_Name
ORDER BY Total_Jumlah DESC;`}
                        </div>
                      )}

                      {/* Main Data Table */}
                      {overheadReportLoading ? (
                        <div className="py-12 text-center text-slate-400 font-medium flex items-center justify-center gap-2">
                          <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
                          <span>Mengeksekusi query relasi 3 tabel...</span>
                        </div>
                      ) : overheadReportError ? (
                        <div className="py-6 text-center text-rose-400 text-xs font-semibold">
                          {overheadReportError}
                        </div>
                      ) : itemsList.length === 0 ? (
                        <div className="py-12 text-center text-slate-500 text-xs">
                          Tidak ditemukan transaksi Kas Keluar untuk Divisi 'Off' atau 'Wks' pada periode ini.
                        </div>
                      ) : (
                        <div className="overflow-x-auto border border-slate-800 rounded-xl">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                                <th className="py-2 px-3 text-center font-mono">No</th>
                                <th className="py-2 px-3 font-mono">Kode</th>
                                <th className="py-2 px-3">Nama Rekening</th>
                                <th className="py-2 px-3 text-center">Jml.Transaksi</th>
                                <th className="py-2 px-3 text-right">
                                  <span className="cursor-help border-b border-dashed border-amber-400/50" title="Klik pada angka Total Biaya untuk melihat rincian per Nomor Voucher">
                                    Total Biaya (Klik Rincian)
                                  </span>
                                </th>
                                <th className="py-2 px-3 text-right">Rasio (%)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/80 text-slate-300">
                              {itemsList.map((item: any, idx: number) => {
                                const isDebt = isDebtAccount(item.Acc_ID);
                                const isExcluded = pembayaranHutangOption === 'tidak_hitung' && isDebt;
                                const ratio = totalRealisasiOverhead > 0 && !isExcluded 
                                  ? ((Number(item.Total_Jumlah) / totalRealisasiOverhead) * 100).toFixed(1) 
                                  : '0';

                                return (
                                  <tr 
                                    key={item.Acc_ID || idx} 
                                    className={`transition-colors ${
                                      isDebt 
                                        ? 'bg-amber-950/40 border-l-4 border-l-amber-400 hover:bg-amber-900/50' 
                                        : 'hover:bg-slate-800/40'
                                    }`}
                                  >
                                    <td className="py-1.5 px-3 font-mono text-center text-slate-500 font-semibold">{idx + 1}</td>
                                    <td className="py-1.5 px-3 font-mono font-bold">
                                      {isDebt ? (
                                        <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-extrabold text-[11px] shadow-xs">
                                          {item.Acc_ID}
                                        </span>
                                      ) : (
                                        <span className="text-amber-400">{item.Acc_ID}</span>
                                      )}
                                    </td>
                                    <td className="py-1.5 px-3 font-bold text-white">
                                      <div className="flex items-center gap-2">
                                        <span>{item.Acc_Name}</span>
                                        {isDebt && (
                                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold border border-amber-400/40">
                                            Pembayaran Hutang
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-1.5 px-3 text-center font-mono text-indigo-300 font-semibold">
                                      <button
                                        onClick={() => fetchOverheadVouchers(item.Acc_ID, item.Acc_Name)}
                                        className="hover:underline text-indigo-300 hover:text-indigo-200 transition-colors cursor-pointer"
                                        title="Klik rincian per No. Voucher"
                                      >
                                        {item.Total_Voucher} Transaksi
                                      </button>
                                    </td>
                                    <td className="py-1.5 px-3 text-right">
                                      {isExcluded ? (
                                        <button
                                          onClick={() => fetchOverheadVouchers(item.Acc_ID, item.Acc_Name)}
                                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 font-mono font-bold text-slate-400 line-through hover:text-amber-300 transition-all cursor-pointer group shadow-xs"
                                          title="Nomor rekening ini tidak dihitung dalam penjumlahan Total Overhead"
                                        >
                                          <span>{formatRupiah(Number(item.Total_Jumlah))}</span>
                                          <Search className="w-3 h-3 text-slate-500 group-hover:text-amber-300" />
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => fetchOverheadVouchers(item.Acc_ID, item.Acc_Name)}
                                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 font-mono font-bold text-amber-300 hover:bg-amber-400 hover:text-slate-950 transition-all cursor-pointer group shadow-xs"
                                          title="Klik untuk melihat rincian per Nomor Voucher"
                                        >
                                          <span>{formatRupiah(Number(item.Total_Jumlah))}</span>
                                          <Search className="w-3 h-3 text-amber-400 group-hover:text-slate-950 transition-colors" />
                                        </button>
                                      )}
                                    </td>
                                    <td className="py-1.5 px-3 text-right">
                                      {isExcluded ? (
                                        <span className="font-mono text-amber-400/80 text-[10.5px] font-bold">
                                          0.0% (Excl.)
                                        </span>
                                      ) : (
                                        <div className="flex items-center justify-end gap-2">
                                          <span className="font-mono text-slate-400 text-[10.5px] font-semibold">{ratio}%</span>
                                          <div className="w-12 bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                                            <div className="h-full bg-amber-400 rounded-full" style={{ width: `${ratio}%` }} />
                                          </div>
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                              
                              <tr className="bg-slate-950 font-extrabold border-t-2 border-slate-800 text-white">
                                <td colSpan={4} className="py-2 px-3 text-right font-sans text-xs tracking-wider">TOTAL REALISASI OVERHEAD (Divisi Off &amp; Wks):</td>
                                <td className="py-2 px-3 text-right">
                                  <button
                                    onClick={() => fetchOverheadVouchers(undefined, 'Semua Rekening Biaya')}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-mono font-extrabold hover:bg-amber-300 transition-all cursor-pointer shadow-md"
                                    title="Klik untuk melihat semua rincian per Nomor Voucher"
                                  >
                                    <span>{formatRupiah(totalRealisasiOverhead)}</span>
                                    <Search className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-xs text-amber-300">100.0%</td>
                              </tr>

                              <tr className="bg-slate-950/80 font-extrabold border-t border-slate-800 text-slate-300">
                                <td colSpan={4} className="py-2 px-3 text-right font-sans text-xs tracking-wider">NILAI TARGET OVERHEAD (25% dari Net Nilai_Pro):</td>
                                <td className="py-2 px-3 text-right font-mono text-sm text-blue-300 font-extrabold">
                                  {formatRupiah(targetOverhead25)}
                                </td>
                                <td className="py-2 px-3 text-right font-mono text-xs text-blue-400">25.0%</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}

            </div>
          )}

          {/* VIEW: Customer Report */}
          {activeView === 'customer' && (
            <div className="space-y-6 py-6 animate-fadeIn">
              
              {/* Chart: Visualisasi Hasil Data Penjualan Per Customer */}
              {!customReportLoading && !customReportError && customCustomerReport.length > 0 && (
                <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-xl space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-white text-base tracking-tight flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-indigo-400" />
                        <span>Grafik Distribusi & Kontribusi Penjualan Per Customer</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Visualisasi proporsi nominal proyek bersih (dikalikan koefisien 97.35%) yang terdistribusi ke masing-masing mitra pelanggan.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        onClick={() => setShowSqlPeek(!showSqlPeek)}
                        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 hover:text-white transition-colors"
                      >
                        <Database className="w-3.5 h-3.5" />
                        <span>{showSqlPeek ? 'Sembunyikan SQL' : 'Lihat SQL Query'}</span>
                      </button>
                    </div>
                  </div>

                  {/* SQL Query Collapsible Explorer */}
                  {showSqlPeek && (
                    <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 font-mono text-[10.5px] leading-relaxed text-indigo-300 overflow-x-auto whitespace-pre animate-fadeIn">
                      <div className="text-slate-500 font-sans font-semibold text-xs mb-2">Query SQL yang Dieksekusi:</div>
                      {customReportMeta?.query || `SELECT 
    a.Cus_Code, 
    b.Cus_Name, 
    SUM(a.Nilai_Pro * 97.35/100) AS totpro 
FROM proyek AS a
INNER JOIN mas_customer AS b 
    ON a.Cus_Code = b.Cus_Code 
WHERE a.Tgl_Proyek BETWEEN MAKEDATE(YEAR(CURDATE()), 1) AND CURDATE() 
  AND b.PKP = 'Y'
GROUP BY a.Cus_Code, b.Cus_Name 
ORDER BY b.Cus_Name;`}
                    </div>
                  )}

                  {/* Mini KPI Cards for Laporan */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                    <div className="p-3">
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Nilai Proyek</span>
                      <div className="text-lg font-bold text-white font-mono mt-0.5">
                        {formatRupiah(customCustomerReport.reduce((acc, item) => acc + Number(item.totpro), 0))}
                      </div>
                    </div>
                    <div className="p-3 border-t sm:border-t-0 sm:border-l border-slate-800/60">
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Kontributor Tertinggi</span>
                      <div className="text-sm font-bold text-indigo-400 truncate mt-0.5" title={customCustomerReport.reduce((max, item) => Number(item.totpro) > Number(max.totpro) ? item : max, customCustomerReport[0] || { Cus_Name: '-' }).Cus_Name}>
                        {customCustomerReport.reduce((max, item) => Number(item.totpro) > Number(max.totpro) ? item : max, customCustomerReport[0] || { Cus_Name: '-' }).Cus_Name}
                      </div>
                    </div>
                    <div className="p-3 border-t sm:border-t-0 sm:border-l border-slate-800/60">
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Rata-rata Per Customer</span>
                      <div className="text-lg font-bold text-white font-mono mt-0.5">
                        {formatRupiah(Math.round(customCustomerReport.reduce((acc, item) => acc + Number(item.totpro), 0) / (customCustomerReport.length || 1)))}
                      </div>
                    </div>
                  </div>

                  {/* Vertical / Horizontal Progress Chart Grid */}
                  <div className="space-y-1.5 pt-1">
                    {customCustomerReport.map((item, idx) => {
                      const maxVal = Math.max(...customCustomerReport.map(x => Number(x.totpro))) || 1;
                      const totalVal = customCustomerReport.reduce((acc, x) => acc + Number(x.totpro), 0) || 1;
                      const percentageOfMax = (Number(item.totpro) / maxVal) * 100;
                      const percentageOfTotal = (Number(item.totpro) / totalVal) * 100;

                      const bgColors = [
                        'bg-slate-950/45 border-l-4 border-slate-700/80',
                        'bg-slate-950/60 border-l-4 border-indigo-500/80',
                        'bg-slate-950/60 border-l-4 border-emerald-500/80',
                        'bg-slate-950/60 border-l-4 border-blue-500/80',
                        'bg-slate-950/60 border-l-4 border-amber-500/80',
                        'bg-slate-950/60 border-l-4 border-rose-500/80',
                        'bg-slate-950/60 border-l-4 border-violet-500/80'
                      ];
                      const rowBg = bgColors[idx % bgColors.length];

                      const barGradients = [
                        'from-slate-500 to-slate-600',
                        'from-indigo-500 to-indigo-600',
                        'from-emerald-500 to-emerald-600',
                        'from-blue-500 to-blue-600',
                        'from-amber-500 to-amber-600',
                        'from-rose-500 to-rose-600',
                        'from-violet-500 to-violet-600'
                      ];
                      const barGradient = barGradients[idx % barGradients.length];

                      return (
                        <div key={item.Cus_Code} className={`group flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 ${rowBg} py-1.5 px-3 rounded-lg transition-colors`}>
                          {/* Customer Name info */}
                          <div className="sm:w-1/3 shrink-0">
                            <div className="font-bold text-xs text-white truncate" title={item.Cus_Name}>
                              {item.Cus_Name}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2.5 mt-0.5 text-[10px] font-mono text-slate-500 font-semibold">
                              <span>Kode: {item.Cus_Code}</span>
                              <span className="text-indigo-300 font-bold bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-900/40">
                                Nilai Proyek: {formatRupiah(Number(item.totpro))}
                              </span>
                            </div>
                          </div>

                          {/* Graphical Bar */}
                          <div className="flex-1 flex items-center gap-3">
                            <div className="flex-1 bg-slate-950 h-5 rounded overflow-hidden relative border border-slate-800">
                              <div 
                                className={`h-full bg-gradient-to-r ${barGradient} rounded shadow-[inset_-3px_0_10px_rgba(0,0,0,0.05)] transition-all duration-500 saturate-[1.15]`}
                                style={{ width: `${Math.max(percentageOfMax, 2)}%` }}
                              />
                            </div>
                            
                            {/* Percentage Badge */}
                            <div className="w-16 text-right shrink-0">
                              <span className="font-mono text-xs font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                                {percentageOfTotal.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Loading / Error / Empty States */}
              {customReportLoading ? (
                <div className="bg-slate-900 p-12 rounded-2xl border border-slate-800 shadow-xl text-center">
                  <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-3" />
                  <p className="text-sm font-semibold text-white">Sedang mengeksekusi query database...</p>
                  <p className="text-xs text-slate-400 mt-1">Harap tunggu beberapa saat.</p>
                </div>
              ) : customReportError ? (
                <div className="bg-rose-950/30 p-6 rounded-2xl border border-rose-900/40 text-center">
                  <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-rose-300">Gagal Mengeksekusi Query</h4>
                  <p className="text-xs text-rose-400 mt-1 max-w-md mx-auto">{customReportError}</p>
                  <button 
                    onClick={() => fetchCustomCustomerReport(selectedYear)}
                    className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors"
                  >
                    Ulangi Percobaan
                  </button>
                </div>
              ) : customCustomerReport.length === 0 ? (
                <div className="bg-slate-900 p-16 rounded-2xl border border-slate-800 shadow-xl text-center">
                  <Database className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                  <h4 className="text-sm font-semibold text-white">Tidak Ada Data Ditemukan</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
                    Tidak ditemukan kecocokan data proyek aktif atau pelanggan PKP antara tanggal '2026-01-01' dan '2026-09-30'.
                  </p>
                </div>
              ) : (
                /* Main Query Results Table */
                <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
                  <div className="p-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-white text-sm tracking-tight">Data Penjualan Per Customer</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Hasil rekapitulasi nominal proyek bersih (dikalikan koefisien 97.35%) per pelanggan.</p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={handlePrintPdf}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 border border-rose-700 rounded-lg shadow-sm hover:shadow transition-all cursor-pointer whitespace-nowrap"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Cetak PDF</span>
                      </button>
                      <span className="font-mono text-xs font-bold text-indigo-300 bg-indigo-950/50 border border-indigo-900/30 px-2.5 py-1 rounded-full">
                        {customCustomerReport.length} Entitas Terdaftar
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                          <th className="py-3 px-5 text-center font-mono">No</th>
                          <th className="py-3 px-4 text-center">Kode</th>
                          <th className="py-3 px-4 text-center">CUSTOMER</th>
                          <th className="py-3 px-4 text-center">Total Proyek Bersih</th>
                          <th className="py-3 px-4 text-right">Nilai Proporsi Finansial</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {customCustomerReport.map((item, idx) => {
                          const maxTotpro = Math.max(...customCustomerReport.map(x => Number(x.totpro))) || 1;
                          const contributionPercent = (Number(item.totpro) / maxTotpro) * 100;

                          const tableRowBgs = [
                            'bg-slate-900 hover:bg-slate-800/40',
                            'bg-slate-900/80 hover:bg-slate-800/60',
                            'bg-indigo-950/10 hover:bg-indigo-950/20',
                            'bg-emerald-950/10 hover:bg-emerald-950/20',
                            'bg-amber-950/10 hover:bg-amber-950/20',
                            'bg-blue-950/10 hover:bg-blue-950/20',
                            'bg-rose-950/10 hover:bg-rose-950/20'
                          ];
                          const rowBg = tableRowBgs[idx % tableRowBgs.length];

                          return (
                            <tr key={item.Cus_Code} className={`${rowBg} transition-colors`}>
                              <td className="py-2.5 px-5 font-mono text-center text-slate-500 font-semibold text-[13px]">{idx + 1}</td>
                              <td className="py-2.5 px-4 font-mono font-bold text-blue-400 text-[13px]">{item.Cus_Code}</td>
                              <td className="py-2.5 px-4 font-semibold text-white">{item.Cus_Name}</td>
                              <td className="py-2.5 px-4 text-right font-mono font-bold text-blue-300 text-[13.5px]">
                                {formatRupiah(Number(item.totpro))}
                              </td>
                              <td className="py-2.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-2.5">
                                  <span className="font-mono text-slate-300 font-bold text-[12px]">
                                    {((Number(item.totpro) / (customCustomerReport.reduce((acc, c) => acc + Number(c.totpro), 0) || 1)) * 100).toFixed(1)}%
                                  </span>
                                  <div className="w-16 bg-slate-950 h-1.5 rounded-full overflow-hidden shrink-0 border border-slate-800">
                                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${contributionPercent}%` }} />
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-4 border-t border-slate-800 bg-slate-950 text-[11px] text-slate-400 leading-relaxed font-mono">
                    <span className="font-semibold text-slate-300">Catatan Kalkulasi:</span> Rumus kalkulasi dihitung otomatis pada server database menggunakan formula <code className="text-indigo-400 font-bold">INNER JOIN</code> dan penjumlahan tertimbang <code className="text-indigo-400 font-bold">SUM(Nilai_Pro * 97.35 / 100)</code> secara utuh sesuai spesifikasi laporan proyek.
                  </div>
                </div>
              )}

            </div>
          )}



          {/* VIEW: Laporan Penjualan Per Proyek */}
          {(activeView === 'proyek_selesai' || activeView === 'proyek_pengerjaan' || activeView === 'proyek_pengerjaan_all' || activeView === 'proyek_semua') && (
            <div className="space-y-4 pt-0 pb-6 -mt-5 animate-fadeIn">
              
              {/* ComboBox Customer Filter for Proyek & Cetak PDF (Sembunyikan untuk Proyek Dalam Pengerjaan Semua Customer) */}
              {activeView !== 'proyek_pengerjaan_all' && (
                <div className="bg-slate-900 border-2 border-indigo-500/30 p-4 rounded-2xl shadow-xl text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ring-1 ring-slate-800">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs font-extrabold text-indigo-300 bg-indigo-950/90 border border-indigo-500/40 px-3.5 py-2 rounded-xl shrink-0 uppercase tracking-wider flex items-center gap-2 shadow-inner">
                      <User className="w-3.5 h-3.5 text-indigo-400" />
                      Pilih Customer:
                    </span>
                    <select
                      value={selectedCusCode}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedCusCode(val);
                        fetchSelectedCustomerProyeks(val, selectedYear, activeView === 'proyek_pengerjaan' ? 'pengerjaan' : (activeView === 'proyek_semua' ? 'semua' : 'selesai'), endDateOption, customEndDate);
                      }}
                      className="text-xs bg-emerald-600 hover:bg-emerald-500 border border-emerald-500 text-white font-extrabold rounded-xl px-4 py-2 cursor-pointer min-w-[220px] sm:min-w-[280px] shadow-md transition-all focus:ring-2 focus:ring-emerald-400 focus:outline-none [color-scheme:dark]"
                    >
                      <option value="Semua">-- Pilih Customer (PKP = Y) --</option>
                      {pkpCustomers.map((c) => (
                        <option key={c.Cus_Code} value={c.Cus_Code} className="bg-slate-900 text-white">
                          [{c.Cus_Code}] {c.Cus_Name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={handlePrintPdf}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 border border-rose-500/60 rounded-xl shadow-md hover:shadow-rose-900/40 transition-all cursor-pointer whitespace-nowrap active:scale-95 shrink-0"
                    title="Cetak Laporan Proyek ke PDF"
                  >
                    <Printer className="w-4 h-4 text-rose-100" />
                    <span>Cetak PDF</span>
                  </button>
                </div>
              )}

              {/* Informational Prompt when no specific customer is selected (kecuali untuk Proyek Dalam Pengerjaan) */}
              {selectedCusCode === 'Semua' && activeView !== 'proyek_pengerjaan_all' && (
                <div className="bg-slate-900/90 border border-slate-800 p-8 rounded-2xl text-center space-y-3.5 animate-fadeIn shadow-xl">
                  <div className="w-12 h-12 rounded-full bg-indigo-950/80 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400 shadow-inner">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-base">Pilih Customer Untuk Menampilkan Laporan Proyek</h4>
                    <p className="text-slate-400 text-xs max-w-md mx-auto mt-1 leading-relaxed">
                      Silakan pilih salah satu Customer pada menu pilihan di atas untuk melihat rincian laporan <strong className="text-indigo-300">{activeView === 'proyek_semua' ? 'Gabungan Selesai & Belum' : (activeView === 'proyek_pengerjaan' ? 'Proyek Belum Selesai' : 'Proyek Selesai (100%)')}</strong> serta mengunduh/mencetak dokumen PDF.
                    </p>
                  </div>
                  <div className="pt-1">
                    <button
                      onClick={handlePrintPdf}
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 border border-rose-500 rounded-xl shadow-lg transition-all cursor-pointer"
                    >
                      <Printer className="w-4 h-4 text-rose-100" />
                      <span>Cetak PDF</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Detailed Project Budget Report for Selected Customer or Proyek Dalam Pengerjaan (Semua Customer) */}
              {(selectedCusCode !== 'Semua' || activeView === 'proyek_pengerjaan_all') && !showCategoryPage && (() => {
                const selectedCusObj = pkpCustomers.find(c => String(c.Cus_Code).trim() === String(selectedCusCode).trim());
                const selectedCusName = activeView === 'proyek_pengerjaan_all' || selectedCusCode === 'Semua'
                  ? 'Semua Customer (PKP)'
                  : (selectedCusObj 
                    ? selectedCusObj.Cus_Name 
                    : (selectedCustomerProyeks[0]?.cus_name || selectedCustomerProyeks[0]?.Cus_Name || selectedCusCode));

                const showCustomerCol = selectedCusCode === 'Semua' || activeView === 'proyek_pengerjaan_all';

                return (
                  <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4 animate-fadeIn">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                      <div>
                        <h4 className="font-bold text-white text-base flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-emerald-400" />
                          <span>{activeView === 'proyek_pengerjaan_all' ? 'Proyek Dalam Pengerjaan (Semua Customer)' : (activeView === 'proyek_pengerjaan' ? 'Proyek Belum Selesai' : (activeView === 'proyek_semua' ? 'Gabungan Selesai & Belum' : 'Proyek Selesai (100%)'))}</span>
                        </h4>
                        <p className="text-xs text-slate-300 font-medium mt-1">
                          Customer: <span className="text-emerald-400 font-bold">{selectedCusName}</span>
                        </p>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2.5">
                        {/* Search Input for Keterangan or No. PO */}
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            placeholder="Cari Keterangan / No. PO / Customer..."
                            value={projectSearchQuery}
                            onChange={(e) => setProjectSearchQuery(e.target.value)}
                            className="pl-8 pr-7 py-1.5 text-xs bg-slate-950 border border-slate-700/80 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400 w-52 sm:w-64 transition-all"
                          />
                          {projectSearchQuery && (
                            <button
                              onClick={() => setProjectSearchQuery('')}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-pointer"
                              title="Bersihkan pencarian"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Cetak PDF Button in Table Header */}
                        <button
                          onClick={handlePrintPdf}
                          className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 border border-rose-500 rounded-lg shadow-md hover:shadow transition-all cursor-pointer whitespace-nowrap active:scale-95"
                          title="Cetak Laporan Proyek ke PDF"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Cetak PDF</span>
                        </button>

                        <button
                          onClick={() => setShowProyekSqlPeek(!showProyekSqlPeek)}
                          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
                        >
                          <Database className="w-3.5 h-3.5" />
                          <span>{showProyekSqlPeek ? 'Sembunyikan SQL' : 'Lihat SQL Query'}</span>
                        </button>
                      </div>
                    </div>

                    {/* SQL Peek Indicator */}
                    {showProyekSqlPeek && (
                      <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800/80 font-mono text-[10.5px] leading-relaxed text-indigo-300 overflow-x-auto whitespace-pre animate-fadeIn">
                        <div className="text-slate-500 font-sans font-semibold text-xs mb-1.5">Query Detail yang Dieksekusi:</div>
                        {selectedCustomerProyeksMeta?.query || (
                          activeView === 'proyek_pengerjaan_all'
                            ? `SELECT a.Cus_Code AS Cus_Code, b.Cus_Name AS Cus_Name, a.Keterangan AS keterangan, a.No_PO AS no_po, a.Tgl_Proyek AS tgl_proyek, ROUND(a.Nilai_PRO * 0.9735) AS nilai_pro, a.No_Proyek AS No_Proyek, CASE 
          WHEN a.No_PO = 'Menampung Biaya' THEN 0
          WHEN COALESCE(a.Nilai_PRO, 0) = 0 THEN 0 
          ELSE ROUND(ROUND(ROUND(a.Nilai_PRO * 0.9735) * 0.75) * ((COALESCE(a.Persen_Progress, 0)) / 100)) 
        END AS nilai_rap, a.Bia_Kom AS bia_kom, CASE 
        WHEN a.No_PO = 'Menampung Biaya' THEN (0 - a.Bia_Kom) 
        WHEN COALESCE(a.Nilai_PRO, 0) = 0 THEN 0
        ELSE (CASE 
          WHEN a.No_PO = 'Menampung Biaya' THEN 0
          WHEN COALESCE(a.Nilai_PRO, 0) = 0 THEN 0 
          ELSE ROUND(ROUND(ROUND(a.Nilai_PRO * 0.9735) * 0.75) * ((COALESCE(a.Persen_Progress, 0)) / 100)) 
        END - a.Bia_Kom) 
      END AS selisih, a.Persen_Progress AS Persen_Progress
        FROM proyek AS a
        INNER JOIN mas_customer AS b ON a.Cus_Code = b.Cus_Code
        WHERE a.Tgl_Proyek BETWEEN '${selectedYear}-01-01' AND '${getEffectiveEndDate(selectedYear, endDateOption, customEndDate)}' AND b.PKP = 'Y' 
       AND (a.Persen_Progress < 100 OR a.Persen_Progress IS NULL) ORDER BY b.Cus_Name ASC, a.Tgl_Proyek ASC;`
                            : `SELECT keterangan, no_po, tgl_proyek, ROUND(Nilai_Pro * 0.9735) AS nilai_pro, ROUND((Nilai_Pro * 0.75)) AS nilai_rap, bia_kom AS total_biaya FROM proyek WHERE cus_code = '${selectedCusCode}' ${activeView === 'proyek_pengerjaan' ? 'AND persen_progress < 100' : (activeView === 'proyek_semua' ? '' : 'AND persen_progress = 100')};`
                        )}
                      </div>
                    )}

                    {/* Loading / Empty / Data Table */}
                    {selectedCustomerProyeksLoading ? (
                      <div className="py-8 text-center text-slate-400 font-medium flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                        <span>Memuat rincian query...</span>
                      </div>
                    ) : selectedCustomerProyeksError ? (
                      <div className="py-4 text-center text-rose-400 text-xs font-semibold">
                        {selectedCustomerProyeksError}
                      </div>
                    ) : selectedCustomerProyeks.length === 0 ? (
                      <div className="py-6 text-center text-slate-500 text-xs">
                        Tidak ditemukan proyek aktif untuk kriteria ini pada rentang waktu tersebut.
                      </div>
                    ) : (
                      <div className="overflow-x-auto border border-slate-800 rounded-xl">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            {/* Baris 1 Header: No, Nama Customer, Keterangan Pekerjaan / Proyek */}
                            <tr className="bg-slate-950 text-slate-300 font-semibold border-b border-slate-800">
                              <th rowSpan={2} className="py-2 px-3 text-center font-mono whitespace-nowrap w-12 border-r border-slate-800 text-slate-400 align-middle">
                                No
                              </th>
                              <th className="py-2 px-3 whitespace-nowrap text-left text-amber-300 bg-slate-900/90 font-bold border-r border-slate-800/60 w-64 align-middle">
                                Nama Customer
                              </th>
                              <th colSpan={(activeView === 'proyek_pengerjaan' || activeView === 'proyek_pengerjaan_all' || activeView === 'proyek_semua') ? 6 : 5} className="py-2 px-3 whitespace-nowrap text-left text-slate-200 bg-slate-900/60 font-bold align-middle">
                                Keterangan Pekerjaan / Proyek
                              </th>
                            </tr>
                            {/* Baris 2 Header: Dimulai dari kiri, tepat di bawah kolom Nama Customer */}
                            <tr className="bg-slate-950/95 text-slate-400 font-semibold border-b-2 border-slate-800">
                              <th className="py-2 px-3 whitespace-nowrap text-left font-mono border-r border-slate-800/40 w-64 align-middle">No. PO</th>
                              <th className="py-2 px-3 text-center whitespace-nowrap font-mono align-middle">Tanggal Proyek</th>
                              {(activeView === 'proyek_pengerjaan' || activeView === 'proyek_pengerjaan_all' || activeView === 'proyek_semua') && (
                                <th className="py-2 px-3 text-center whitespace-nowrap align-middle">Progres</th>
                              )}
                              <th className="py-2 px-3 text-right whitespace-nowrap align-middle">Nilai Pro (-2.65%)</th>
                              <th className="py-2 px-3 text-right whitespace-nowrap align-middle">Nilai RAP (75%)</th>
                              <th className="py-2 px-3 text-right whitespace-nowrap align-middle">Total Biaya</th>
                              <th className="py-2 px-3 text-right whitespace-nowrap align-middle">Selisih</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800 text-slate-300">
                             {(() => {
                               const sortedProyeks = [...selectedCustomerProyeks].sort((a, b) => {
                                 const cusA = (a.Cus_Name || a.cus_name || a.Cus_Code || '').trim();
                                 const cusB = (b.Cus_Name || b.cus_name || b.Cus_Code || '').trim();
                                 const cusCompare = cusA.localeCompare(cusB, 'id', { sensitivity: 'base' });
                                 if (cusCompare !== 0) return cusCompare;

                                 const isAMenampung = (a.no_po || a.No_PO || '').trim().toLowerCase() === 'menampung biaya';
                                 const isBMenampung = (b.no_po || b.No_PO || '').trim().toLowerCase() === 'menampung biaya';
                                 
                                 if (isAMenampung && !isBMenampung) return 1;
                                 if (!isAMenampung && isBMenampung) return -1;
                                 
                                 const dateA = a.tgl_proyek || a.Tgl_Proyek || '';
                                 const dateB = b.tgl_proyek || b.Tgl_Proyek || '';
                                 return dateA.localeCompare(dateB); // Oldest first (Ascending)
                               });

                               const filteredProyeks = sortedProyeks.filter((item) => {
                                 if (!projectSearchQuery.trim()) return true;
                                 const q = projectSearchQuery.toLowerCase().trim();
                                 const ket = (item.keterangan || '').toLowerCase();
                                 const po = (item.no_po || item.No_PO || '').toLowerCase();
                                 const cus = (item.Cus_Name || item.cus_name || item.Cus_Code || '').toLowerCase();
                                 return ket.includes(q) || po.includes(q) || cus.includes(q);
                               });

                               const hasProgress = activeView === 'proyek_pengerjaan' || activeView === 'proyek_pengerjaan_all' || activeView === 'proyek_semua';
                               const totalCols = hasProgress ? 8 : 7;

                               if (filteredProyeks.length === 0) {
                                 return (
                                   <tr>
                                     <td colSpan={totalCols} className="py-8 text-center text-slate-400 text-xs">
                                       <span>Tidak ditemukan proyek dengan pencarian "<strong>{projectSearchQuery}</strong>".</span>
                                       <button
                                         onClick={() => setProjectSearchQuery('')}
                                         className="ml-2 text-emerald-400 hover:underline font-bold cursor-pointer"
                                       >
                                         Bersihkan Pencarian
                                       </button>
                                     </td>
                                   </tr>
                                 );
                               }
                               
                                return (
                                 <>
                                   {filteredProyeks.map((item, idx) => {
                                     const isScaled = hasProgress;
                                     const { rap, selisih, biaya } = getItemRapAndSelisih(item, isScaled);
                                     const rawNilaiPro = Number(item.nilai_pro) || 0;
                                     const progressPercent = typeof item.Persen_Progress === 'number' || typeof item.Persen_Progress === 'string'
                                       ? Number(item.Persen_Progress)
                                       : 0;
                                     const noPo = item.no_po || '';
                                     const rowBg = idx % 2 === 1 ? 'bg-slate-900/50' : 'bg-slate-950/70';
                                     const cleanKeterangan = (item.keterangan || '-').trim().replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');
                                     
                                     return (
                                       <Fragment key={`proj-${idx}`}>
                                         {/* Baris Atas: No (rowspan 2), Nama Customer, Keterangan Pekerjaan memanjang */}
                                         <tr className={`${rowBg} hover:bg-slate-800/40 transition-colors`}>
                                           <td rowSpan={2} className="py-1.5 px-3 font-mono text-center text-slate-400 font-bold text-xs border-r border-b-2 border-slate-800 align-middle">
                                             {idx + 1}
                                           </td>
                                           <td className="py-1.5 px-3 font-bold text-amber-300 whitespace-nowrap border-b border-slate-800/50 border-r border-slate-800/30 align-middle">
                                             <div className="flex items-center gap-1.5">
                                               <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                               <span>{item.Cus_Name || item.cus_name || item.Cus_Code || '-'}</span>
                                             </div>
                                           </td>
                                           <td colSpan={hasProgress ? 6 : 5} className="py-1.5 px-3 border-b border-slate-800/50 align-middle" title={item.keterangan}>
                                             <div className="flex items-start gap-2 leading-snug">
                                               <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider bg-slate-800/90 px-1.5 py-0.5 rounded border border-slate-700/60 shrink-0">
                                                 Pekerjaan
                                               </span>
                                               <span className="text-white font-medium text-xs break-words leading-snug whitespace-pre-line">
                                                 {cleanKeterangan}
                                               </span>
                                             </div>
                                           </td>
                                         </tr>

                                         {/* Baris Bawah: Dimulai dari kiri, tepat di bawah Nama Customer */}
                                         <tr className={`${rowBg} hover:bg-slate-800/40 transition-colors border-b-2 border-slate-800`}>
                                           <td className="py-1.5 px-3 font-mono text-slate-300 font-medium text-xs whitespace-nowrap border-r border-slate-800/30 align-middle">
                                             <div className="flex items-center gap-1.5">
                                               <span className="text-[10px] text-slate-500 font-semibold">PO:</span>
                                               {(() => {
                                                 const rawPo = (item.no_po || item.No_PO || '').trim();
                                                 const isDashPo = !rawPo || rawPo === '-';
                                                 if (isDashPo) {
                                                   return (
                                                     <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border-2 border-blue-500 text-blue-400 font-extrabold text-[11px] bg-blue-950/80 shadow-xs" title="No. PO = -">
                                                       -
                                                     </span>
                                                   );
                                                 }
                                                 return (
                                                   <span className="bg-slate-100 text-black font-extrabold px-1.5 py-0.5 rounded text-xs border border-slate-300 shadow-sm">
                                                     {rawPo}
                                                   </span>
                                                 );
                                               })()}
                                             </div>
                                           </td>
                                           <td className="py-1.5 px-3 text-center font-mono text-slate-400 whitespace-nowrap text-xs align-middle">
                                             {formatDateIndo(item.tgl_proyek)}
                                           </td>
                                           {hasProgress && (
                                              <td className="py-1.5 px-3 text-center whitespace-nowrap align-middle">
                                                <button
                                                  onClick={() => handleOpenUpdateProgressModal(item)}
                                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-sm group bg-slate-900 hover:bg-amber-400 border border-slate-700 hover:border-amber-300 text-slate-200 hover:text-slate-950"
                                                  title="Klik di sini untuk memperbarui Progress, Tanggal, Info, & Sumber Informasi Proyek"
                                                >
                                                  <span className={`px-2 py-0.5 text-[10.5px] font-extrabold rounded-full ${
                                                    progressPercent === 100 
                                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 group-hover:bg-slate-950 group-hover:text-emerald-300' 
                                                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 group-hover:bg-slate-950 group-hover:text-amber-300'
                                                  }`}>
                                                    {progressPercent}%
                                                  </span>
                                                  <span className="text-[10px] font-extrabold tracking-tight group-hover:underline">Update Progres ✎</span>
                                                </button>
                                              </td>
                                            )}
                                           <td className="py-1.5 px-3 text-right font-mono text-slate-300 font-semibold text-[12.5px] whitespace-nowrap align-middle">
                                             {formatRupiah(Number(item.nilai_pro))}
                                           </td>
                                           <td className="py-1.5 px-3 text-right font-mono font-bold text-blue-400 text-[12.5px] whitespace-nowrap align-middle">
                                             <div>{formatRupiah(rap)}</div>
                                             {rawNilaiPro > 0 && noPo !== 'Menampung Biaya' && progressPercent < 100 && (
                                               <div className="text-[9px] text-slate-400 font-normal leading-none mt-0.5">
                                                 (dikalikan {progressPercent}%)
                                               </div>
                                             )}
                                           </td>
                                           <td 
                                             onClick={() => {
                                               const noProyekVal = item.No_Proyek || item.no_proyek;
                                               if (noProyekVal) {
                                                 setSelectedNoProyek(noProyekVal);
                                                 setSelectedNoPo(item.no_po || item.No_PO || 'Tidak Ada PO');
                                                 setSelectedProjectKeterangan(item.keterangan || 'Proyek Tanpa Nama');
                                                 setShowCategoryPage(true);
                                                 fetchCategoryCosts(noProyekVal);
                                               } else {
                                                 showToast('No. Proyek tidak tersedia untuk baris ini di database lokal.', 'info');
                                               }
                                             }}
                                             className="py-1.5 px-3 text-right font-mono text-indigo-300 font-semibold hover:text-indigo-100 hover:bg-slate-800/40 cursor-pointer transition-all underline decoration-dotted decoration-indigo-400/40 select-none whitespace-nowrap align-middle text-[12.5px]"
                                             title="Klik untuk melihat rincian biaya per kategori"
                                           >
                                             {formatRupiah(biaya)}
                                           </td>
                                           <td className={`py-1.5 px-3 text-right font-mono font-bold text-[12.5px] whitespace-nowrap align-middle ${
                                             selisih >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                           }`}>
                                             {formatRupiah(selisih)}
                                           </td>
                                         </tr>
                                       </Fragment>
                                     );
                                   })}
                                   {/* Row Total Customer Details Table */}
                                   <tr className="bg-slate-950 font-extrabold border-t-2 border-slate-800 text-white">
                                     <td colSpan={hasProgress ? 4 : 3} className="py-3 px-4 text-right font-sans text-xs tracking-wider">TOTAL DETIL:</td>
                                     <td className="py-3 px-4 text-right font-mono text-[13px] text-slate-300 font-bold whitespace-nowrap">
                                       {formatRupiah(filteredProyeks.reduce((acc, item) => acc + Number(item.nilai_pro || 0), 0))}
                                     </td>
                                     <td className="py-3 px-4 text-right font-mono text-[13.5px] text-blue-400 font-bold whitespace-nowrap">
                                       {formatRupiah(filteredProyeks.reduce((acc, item) => {
                                         return acc + getItemRapAndSelisih(item, hasProgress).totalContributionRap;
                                       }, 0))}
                                     </td>
                                     <td className="py-3 px-4 text-right font-mono text-xs text-indigo-300 font-bold whitespace-nowrap">
                                       {formatRupiah(filteredProyeks.reduce((acc, item) => {
                                         return acc + getItemRapAndSelisih(item, hasProgress).totalContributionBiaya;
                                       }, 0))}
                                     </td>
                                     <td className={`py-3 px-4 text-right font-mono text-xs font-bold whitespace-nowrap ${
                                       filteredProyeks.reduce((acc, item) => {
                                         return acc + getItemRapAndSelisih(item, hasProgress).totalContributionSelisih;
                                       }, 0) >= 0 
                                         ? 'text-emerald-400' 
                                         : 'text-rose-400'
                                     }`}>
                                       {formatRupiah(filteredProyeks.reduce((acc, item) => {
                                         return acc + getItemRapAndSelisih(item, hasProgress).totalContributionSelisih;
                                       }, 0))}
                                     </td>
                                   </tr>
                                 </>
                               );
                             })()}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Halaman Tampil Kategori Biaya */}
              {(selectedCusCode !== 'Semua' || activeView === 'proyek_pengerjaan_all') && showCategoryPage && !showVoucherPage && (
                <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-xl space-y-6 animate-fadeIn">
                  
                  {/* Back Button & Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                    <div className="space-y-1">
                      <button
                        onClick={() => setShowCategoryPage(false)}
                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all cursor-pointer mb-2 shadow-md shadow-blue-600/10"
                      >
                        <span className="text-sm font-extrabold">&larr;</span> Kembali ke Daftar Proyek
                      </button>
                      
                      <h4 className="font-bold text-white text-base flex items-center gap-2">
                        <Layers className="w-5 h-5 text-indigo-400" />
                        <span>Rincian Penggunaan Biaya Per Kategori</span>
                      </h4>
                      <p className="text-xs text-slate-400">
                        No. Proyek: <span className="text-emerald-400 font-mono font-bold mr-3">{selectedNoProyek}</span>
                        No. PO: <span className="text-amber-400 font-mono font-bold">{selectedNoPo}</span>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Cari Kategori Biaya..."
                          value={categorySearchQuery}
                          onChange={(e) => setCategorySearchQuery(e.target.value)}
                          className="pl-8 pr-7 py-1.5 text-xs bg-slate-950 border border-slate-700/80 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 w-48 sm:w-56 transition-all"
                        />
                        {categorySearchQuery && (
                          <button
                            onClick={() => setCategorySearchQuery('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-pointer"
                            title="Bersihkan pencarian"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          const el = document.getElementById('category-sql-peek-page');
                          if (el) el.classList.toggle('hidden');
                        }}
                        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 hover:text-white transition-colors"
                      >
                        <Database className="w-3.5 h-3.5" />
                        <span>Lihat SQL Query</span>
                      </button>
                    </div>
                  </div>

                  {/* Keterangan Proyek Card */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/60">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Keterangan Proyek</span>
                    <span className="text-xs font-semibold text-white mt-1 block leading-relaxed">{selectedProjectKeterangan}</span>
                  </div>

                  {/* SQL Peek inside category page */}
                  <div id="category-sql-peek-page" className="hidden bg-slate-950 p-3.5 rounded-lg border border-slate-800 font-mono text-[10.5px] leading-relaxed text-indigo-300 overflow-x-auto whitespace-pre animate-fadeIn">
                    <div className="text-slate-500 font-sans font-semibold text-xs mb-1.5">Query yang Dieksekusi:</div>
                    {categoryCostsMeta?.query}
                  </div>

                  {/* Loading / Error / Data Content */}
                  {categoryCostsLoading ? (
                    <div className="py-12 text-center text-slate-400 font-medium flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                      <span>Mengambil rincian biaya dari database...</span>
                    </div>
                  ) : categoryCostsError ? (
                    <div className="py-4 text-center text-rose-400 text-xs font-semibold">
                      {categoryCostsError}
                    </div>
                  ) : categoryCosts.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 text-xs">
                      Tidak ditemukan rincian biaya terdaftar untuk No. Proyek ini.
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-800 rounded-xl">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                            <th className="py-2.5 px-4 text-center font-mono">Kode</th>
                            <th className="py-2.5 px-4">Kategori Biaya</th>
                            <th className="py-2.5 px-4 text-right">Total Jumlah Biaya</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300">
                          {(() => {
                            const filteredCategoryCosts = categoryCosts.filter((item: any) => {
                              if (!categorySearchQuery.trim()) return true;
                              const q = categorySearchQuery.toLowerCase().trim();
                              const nama = (item.Nama_Kategori || item.nama_kategori || '').toLowerCase();
                              const kode = (item.Kode_Kategori || item.kode_kategori || '').toLowerCase();
                              return nama.includes(q) || kode.includes(q);
                            });

                            if (filteredCategoryCosts.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={3} className="py-8 text-center text-slate-400 text-xs">
                                    <span>Tidak ditemukan kategori biaya dengan pencarian "<strong>{categorySearchQuery}</strong>".</span>
                                    <button
                                      onClick={() => setCategorySearchQuery('')}
                                      className="ml-2 text-indigo-400 hover:underline font-bold cursor-pointer"
                                    >
                                      Bersihkan Pencarian
                                    </button>
                                  </td>
                                </tr>
                              );
                            }

                            return filteredCategoryCosts.map((item: any, idx: number) => {
                              const totalSum = categoryCosts.reduce((acc: number, c: any) => acc + Number(c.TotKat || 0), 0) || 1;
                              const ratio = ((Number(item.TotKat || 0) / totalSum) * 100).toFixed(1);

                            
                            const barGradients = [
                              'from-emerald-400 to-emerald-500',
                              'from-blue-400 to-blue-500',
                              'from-amber-400 to-amber-500',
                              'from-rose-400 to-rose-500',
                              'from-violet-400 to-violet-500'
                            ];
                            const activeGradient = barGradients[idx % barGradients.length];

                            return (
                              <tr key={idx} className="hover:bg-slate-800/35 transition-colors">
                                <td className="py-1.5 px-4 text-center font-mono text-indigo-400 font-bold">
                                  <span className="bg-indigo-950/50 border border-indigo-900/30 px-2 py-0.5 rounded-md text-[10px]">
                                    {item.Kode_Kategori || item.kode_kategori}
                                  </span>
                                </td>
                                <td className="py-1.5 px-4">
                                  <div className="font-semibold text-white">{item.Nama_Kategori || item.nama_kategori || 'Kategori Umum'}</div>
                                  <div className="w-full max-w-xs bg-slate-950 h-2.5 rounded overflow-hidden mt-1 border border-slate-800">
                                    <div className={`h-full bg-gradient-to-r ${activeGradient} rounded shadow-[inset_-3px_0_10px_rgba(0,0,0,0.05)] transition-all duration-500 saturate-[1.3]`} style={{ width: `${ratio}%` }} />
                                  </div>
                                </td>
                                <td 
                                  onClick={() => {
                                    const kodeKat = item.Kode_Kategori || item.kode_kategori;
                                    const namaKat = item.Nama_Kategori || item.nama_kategori || 'Kategori Umum';
                                    if (selectedNoProyek && kodeKat) {
                                      setSelectedKodeKategori(kodeKat);
                                      setSelectedNamaKategori(namaKat);
                                      setShowVoucherPage(true);
                                      fetchVoucherCosts(selectedNoProyek, kodeKat);
                                    } else {
                                      showToast('Kode Kategori atau No. Proyek tidak valid.', 'info');
                                    }
                                  }}
                                  className="py-1.5 px-4 text-right font-mono font-bold text-indigo-300 hover:text-indigo-100 hover:bg-slate-800/40 cursor-pointer transition-all underline decoration-dotted decoration-indigo-400/40 select-none"
                                  title="Klik untuk melihat rincian biaya per No. Voucher"
                                >
                                  <div>{formatRupiah(Number(item.TotKat || 0))}</div>
                                  <div className="text-[10px] text-slate-400 font-normal mt-0.5">{ratio}% dari total (Klik untuk Detail Voucher)</div>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                          {/* Summary row */}
                          <tr className="bg-slate-950 font-extrabold border-t-2 border-slate-800 text-white">
                            <td colSpan={2} className="py-3 px-4 text-right font-sans text-xs tracking-wider">Total Biaya Proyek Saat Ini :</td>
                            <td className="py-3 px-4 text-right font-mono text-xs text-indigo-300 font-bold">
                              {formatRupiah(categoryCosts.reduce((acc: number, item: any) => acc + Number(item.TotKat || 0), 0))}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Footnote button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCategoryPage(false)}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer text-center shadow-md shadow-blue-600/10"
                    >
                      Kembali ke Rincian Proyek
                    </button>
                  </div>

                </div>
              )}

              {/* Halaman Tampil Rincian Biaya Per No. Voucher */}
              {(selectedCusCode !== 'Semua' || activeView === 'proyek_pengerjaan_all') && showCategoryPage && showVoucherPage && (
                <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-xl space-y-6 animate-fadeIn">
                  
                  {/* Back Button & Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                    <div className="space-y-1">
                      <button
                        onClick={() => setShowVoucherPage(false)}
                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all cursor-pointer mb-2 shadow-md shadow-indigo-600/10"
                      >
                        <span className="text-sm font-extrabold">&larr;</span> Kembali ke Rincian Kategori Biaya
                      </button>
                      
                      <h4 className="font-bold text-white text-base flex items-center gap-2">
                        <Layers className="w-5 h-5 text-indigo-400" />
                        <span>Rincian Biaya Per No. Voucher</span>
                      </h4>
                      <p className="text-xs text-slate-400">
                        No. Proyek: <span className="text-emerald-400 font-mono font-bold mr-3">{selectedNoProyek}</span>
                        Kategori: <span className="text-indigo-300 font-mono font-bold font-sans">[{selectedKodeKategori}] {selectedNamaKategori}</span>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Cari Uraian Biaya / No. Voucher..."
                          value={voucherSearchQuery}
                          onChange={(e) => setVoucherSearchQuery(e.target.value)}
                          className="pl-8 pr-7 py-1.5 text-xs bg-slate-950 border border-slate-700/80 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 w-52 sm:w-64 transition-all"
                        />
                        {voucherSearchQuery && (
                          <button
                            onClick={() => setVoucherSearchQuery('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-pointer"
                            title="Bersihkan pencarian"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          const el = document.getElementById('voucher-sql-peek-page');
                          if (el) el.classList.toggle('hidden');
                        }}
                        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 hover:text-white transition-colors"
                      >
                        <Database className="w-3.5 h-3.5" />
                        <span>Lihat SQL Query</span>
                      </button>
                    </div>
                  </div>

                  {/* SQL Peek inside voucher page */}
                  <div id="voucher-sql-peek-page" className="hidden bg-slate-950 p-3.5 rounded-lg border border-slate-800 font-mono text-[10.5px] leading-relaxed text-indigo-300 overflow-x-auto whitespace-pre animate-fadeIn">
                    <div className="text-slate-500 font-sans font-semibold text-xs mb-1.5">Query yang Dieksekusi dari Biayapro_Det (`Ket_Detail`) & Biayapro_Mas:</div>
                    {voucherCostsMeta?.query}
                  </div>

                  {/* Loading / Error / Data Content */}
                  {voucherCostsLoading ? (
                    <div className="py-12 text-center text-slate-400 font-medium flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                      <span>Mengambil rincian voucher dari database...</span>
                    </div>
                  ) : voucherCostsError ? (
                    <div className="py-4 text-center text-rose-400 text-xs font-semibold">
                      {voucherCostsError}
                    </div>
                  ) : voucherCosts.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 text-xs">
                      Tidak ditemukan rincian voucher terdaftar untuk Kategori Biaya ini pada No. Proyek tersebut.
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-800 rounded-xl">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                            <th className="py-2.5 px-3 text-center font-mono w-12 shrink-0">No</th>
                            <th className="py-2.5 px-4 font-mono w-36 shrink-0 whitespace-nowrap">No. Voucher</th>
                            <th className="py-2.5 px-4 text-center font-mono w-28 shrink-0 whitespace-nowrap">Tanggal</th>
                            <th className="py-2.5 px-4 w-full">Uraian Biaya</th>
                            <th className="py-2.5 px-4 text-right w-36 shrink-0 whitespace-nowrap">Jumlah</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300">
                          {(() => {
                            const filteredVoucherCosts = voucherCosts.filter((item: any) => {
                              if (!voucherSearchQuery.trim()) return true;
                              const q = voucherSearchQuery.toLowerCase().trim();
                              const uraianText = (item.Ket_Detail || item.ket_detail || item.Keterangan || item.keterangan || '').toLowerCase();
                              const noVoucher = (item.No_Voucher || item.no_voucher || '').toLowerCase();
                              return uraianText.includes(q) || noVoucher.includes(q);
                            });

                            if (filteredVoucherCosts.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                                    <span>Tidak ditemukan uraian biaya dengan pencarian "<strong>{voucherSearchQuery}</strong>".</span>
                                    <button
                                      onClick={() => setVoucherSearchQuery('')}
                                      className="ml-2 text-indigo-400 hover:underline font-bold cursor-pointer"
                                    >
                                      Bersihkan Pencarian
                                    </button>
                                  </td>
                                </tr>
                              );
                            }

                            return filteredVoucherCosts.map((item: any, idx: number) => {
                              const uraianText = item.Ket_Detail || item.ket_detail || item.Keterangan || item.keterangan || 'Tanpa Keterangan';
                              
                              return (
                                <tr key={idx} className="hover:bg-slate-800/35 transition-colors">
                                  <td className="py-2.5 px-3 text-center font-mono text-slate-500 font-semibold w-12 shrink-0">
                                    {idx + 1}
                                  </td>
                                  <td className="py-2.5 px-4 font-mono text-amber-400 font-bold w-36 shrink-0">
                                    <span className="bg-amber-950/50 border border-amber-900/30 px-2.5 py-1 rounded-md text-[11px] whitespace-nowrap inline-block">
                                      {item.No_Voucher || item.no_voucher}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-4 text-center font-mono text-slate-400 w-28 shrink-0 whitespace-nowrap">
                                    {formatDateIndo(item.Tgl_Voucher || item.tgl_voucher || '')}
                                  </td>
                                  <td className="py-2.5 px-4 font-semibold text-white break-words leading-relaxed">
                                    {uraianText}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-400 w-36 shrink-0 whitespace-nowrap">
                                    {formatRupiah(Number(item.Jumlah || item.jumlah || 0))}
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                          {/* Summary row */}
                          <tr className="bg-slate-950 font-extrabold border-t-2 border-slate-800 text-white">
                            <td colSpan={4} className="py-3 px-4 text-right font-sans text-xs tracking-wider">TOTAL BIAYA VOUCHER KATEGORI INI :</td>
                            <td className="py-3 px-4 text-right font-mono text-xs text-emerald-400 font-bold whitespace-nowrap">
                              {formatRupiah(voucherCosts.reduce((acc: number, item: any) => acc + Number(item.Jumlah || item.jumlah || 0), 0))}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Back buttons */}
                  <div className="pt-2 flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={() => setShowVoucherPage(false)}
                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer text-center shadow-md shadow-indigo-600/10"
                    >
                      &larr; Kembali ke Rincian Kategori Biaya
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowVoucherPage(false);
                        setShowCategoryPage(false);
                      }}
                      className="py-2.5 px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
                    >
                      Kembali ke Daftar Proyek Utama
                    </button>
                  </div>

                </div>
              )}

              {/* Guide prompt when customer is not selected */}
              {selectedCusCode === 'Semua' && (
                <div className="bg-white p-12 rounded-2xl border border-slate-200/80 shadow-xs text-center space-y-3 animate-fadeIn">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mx-auto shadow-sm">
                    <Layers className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Silakan Pilih Pelanggan untuk Melihat Laporan</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                    Pilih salah satu mitra pelanggan PKP pada pilihan di atas untuk memuat rincian anggaran proyek, formula Nilai RAP (75%), total biaya komisi, dan selisih laba/rugi finansial secara transparan.
                  </p>
                </div>
              )}

            </div>
          )}



        </main>
      </div>



      {/* MODAL: Rincian Transaksi Per Nomor Voucher (Overhead) */}
      {showOverheadVoucherModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 z-50 animate-fadeIn overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-6xl w-full overflow-hidden my-auto flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Rincian Transaksi Per Nomor Voucher</h3>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  {selectedOverheadAcc?.accId 
                    ? `Rekening: Kode ${selectedOverheadAcc.accId} - ${selectedOverheadAcc.accName}`
                    : 'Semua Rekening Biaya Overhead (Divisi Off & Wks)'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowOverheadVoucherModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
                  title="Tutup Modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Filter & Search */}
            <div className="p-4 bg-slate-900/90 border-b border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari Voucher atau Keterangan..."
                  value={overheadVoucherSearch}
                  onChange={(e) => setOverheadVoucherSearch(e.target.value)}
                  className="w-full bg-slate-950 text-slate-200 text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div className="text-xs text-slate-400 font-mono">
                Total: <strong className="text-amber-400">{filteredOverheadVouchers.length}</strong> transaksi voucher
              </div>
            </div>

            {/* Modal Table Content */}
            <div className="p-6 overflow-y-auto grow space-y-4">
              {overheadVouchersLoading ? (
                <div className="py-16 text-center text-slate-400 font-medium flex items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
                  <span>Memuat rincian transaksi per Nomor Voucher...</span>
                </div>
              ) : overheadVouchersError ? (
                <div className="py-12 text-center text-rose-400 text-xs font-semibold">
                  {overheadVouchersError}
                </div>
              ) : filteredOverheadVouchers.length === 0 ? (
                <div className="py-16 text-center text-slate-500 text-xs">
                  Tidak ada voucher transaksi yang cocok dengan pencarian.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-800 rounded-2xl bg-slate-950">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800">
                        <th className="py-2.5 px-2 text-center font-mono w-10">No</th>
                        <th className="py-2.5 px-2 font-mono whitespace-nowrap w-28">Voucher</th>
                        <th className="py-2.5 px-2 font-mono whitespace-nowrap w-24">Tanggal</th>
                        <th className="py-2.5 px-2 text-center font-mono whitespace-nowrap w-20">Biaya</th>
                        <th className="py-2.5 px-4">Keterangan Detail</th>
                        <th className="py-2.5 px-3 text-right font-mono whitespace-nowrap w-36">Jumlah</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-300">
                      {filteredOverheadVouchers.map((v: any, idx: number) => {
                        const formatDateVal = (dStr: string) => {
                          if (!dStr) return '-';
                          const str = String(dStr).trim();
                          const m = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
                          if (m) {
                            return `${m[3].padStart(2, '0')}/${m[2].padStart(2, '0')}/${m[1]}`;
                          }
                          const d = new Date(str);
                          if (!isNaN(d.getTime())) {
                            const day = String(d.getDate()).padStart(2, '0');
                            const month = String(d.getMonth() + 1).padStart(2, '0');
                            const year = d.getFullYear();
                            return `${day}/${month}/${year}`;
                          }
                          return str;
                        };

                        return (
                          <tr key={`${v.No_Voucher}-${idx}`} className="hover:bg-slate-800/50 transition-colors">
                            <td className="py-2 px-2 text-center font-mono text-slate-500 font-semibold">{idx + 1}</td>
                            <td className="py-2 px-2 font-mono font-bold text-amber-400 whitespace-nowrap">{v.No_Voucher}</td>
                            <td className="py-2 px-2 font-mono text-slate-300 whitespace-nowrap">{formatDateVal(v.Tgl_Voucher)}</td>
                            <td className="py-2 px-2 text-center whitespace-nowrap">
                              <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                {v.Divisi}
                              </span>
                            </td>
                            <td className="py-2 px-4 text-slate-300 leading-relaxed" title={v.Ket_Detail}>
                              {v.Ket_Detail}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-amber-300 whitespace-nowrap">
                              {formatRupiah(Number(v.Jumlah))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-900 font-bold border-t-2 border-slate-800 text-white">
                        <td colSpan={5} className="py-3 px-4 text-right uppercase tracking-wider font-mono text-slate-400">
                          Total Biaya Voucher ({filteredOverheadVouchers.length} Transaksi):
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-extrabold text-amber-300 text-sm">
                          {formatRupiah(filteredOverheadVouchers.reduce((sum: number, item: any) => sum + Number(item.Jumlah || 0), 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center shrink-0">
              <div className="text-[11px] text-slate-500 font-mono">
                Periode: {selectedYear}-01-01 s/d {getEffectiveEndDate(selectedYear, endDateOption, customEndDate)} (Divisi Off & Wks)
              </div>
              <button
                onClick={() => setShowOverheadVoucherModal(false)}
                className="px-4 py-2 text-xs font-semibold bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    
      {/* Modal Update Progres Proyek (SqlRubah) */}
      {showUpdateProgressModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[99999] flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-slate-900 border-2 border-amber-500/50 rounded-2xl max-w-xl w-full text-white shadow-2xl overflow-hidden my-8">
            
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 border-b border-amber-500/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-950/40 rounded-xl text-amber-200 border border-amber-300/30 shadow-inner">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-white tracking-tight">Update Progres Proyek</h3>
                  <p className="text-xs text-amber-100/90 font-medium">Form pembaruan progress, sumber informasi, &amp; status pengerjaan</p>
                </div>
              </div>
              <button
                onClick={() => setShowUpdateProgressModal(false)}
                className="p-1.5 rounded-lg bg-slate-950/30 hover:bg-slate-950/70 text-amber-100 hover:text-white transition-colors cursor-pointer"
                title="Tutup Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveProgress} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              
              {/* Context Summary Cards */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                      No. Proyek
                    </span>
                    <span className="font-mono text-sm font-extrabold text-amber-400 bg-amber-950/80 px-2.5 py-0.5 rounded border border-amber-500/40">
                      {vNo_Proyek}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-indigo-300 font-semibold">
                    <User className="w-3.5 h-3.5 text-indigo-400" />
                    <span>User Login: <b className="text-white">{loggedInUser?.User_Name || 'Admin JPU'}</b></span>
                  </div>
                </div>

                <div className="text-xs space-y-1">
                  <div className="flex items-start gap-2">
                    <span className="text-slate-400 font-bold shrink-0">Customer:</span>
                    <span className="text-amber-300 font-bold">{selectedProgressProject?.Cus_Name || selectedProgressProject?.cus_name || selectedProgressProject?.Cus_Code || '-'}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-slate-400 font-bold shrink-0">Pekerjaan:</span>
                    <span className="text-slate-200">{selectedProgressProject?.keterangan || '-'}</span>
                  </div>
                </div>
              </div>

              {updateProgressError && (
                <div className="p-3.5 bg-rose-950/60 border border-rose-600/80 rounded-xl text-rose-200 text-xs flex items-center gap-2.5 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{updateProgressError}</span>
                </div>
              )}

              {/* Form Input Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* 1. Tanggal Progress */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-amber-300">
                    Tanggal Progress <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={sTgl_Progress}
                      onChange={(e) => setSTgl_Progress(e.target.value)}
                      placeholder="YYYY/MM/DD"
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">Format: yyyy/mm/dd (Hari ini)</p>
                </div>

                {/* 2. Tanggal Update */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    Tanggal Update
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={sTgl_Update}
                      readOnly
                      className="w-full pl-9 pr-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-400 cursor-not-allowed"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">Otomatis diisi tanggal sistem saat ini</p>
                </div>

              </div>

              {/* 3. Nilai Persen Progress */}
              <div className="space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-amber-300">
                    Nilai Persen Progress <span className="text-rose-400">*</span>
                  </label>
                  <span className="font-mono text-sm font-extrabold text-amber-400 bg-amber-950/90 px-3 py-0.5 rounded-lg border border-amber-500/50">
                    {nPersen_Progress}%
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={nPersen_Progress}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setNPersen_Progress(val);
                      if (val === 100) {
                        setVInfo_Progress('Selesai');
                      } else if (vInfo_Progress === 'Selesai') {
                        setVInfo_Progress('Masih Dalam Pengerjaan');
                      }
                    }}
                    className="flex-1 accent-amber-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={nPersen_Progress}
                    onChange={(e) => {
                      const val = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                      setNPersen_Progress(val);
                      if (val === 100) {
                        setVInfo_Progress('Selesai');
                      } else if (vInfo_Progress === 'Selesai') {
                        setVInfo_Progress('Masih Dalam Pengerjaan');
                      }
                    }}
                    className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-center font-mono font-bold text-xs text-white"
                  />
                </div>

                {/* Quick Percent Presets: 20%, 35%, 65%, 95%, 100% */}
                <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Preset:</span>
                  {[20, 35, 65, 95, 100].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => {
                        setNPersen_Progress(pct);
                        if (pct === 100) {
                          setVInfo_Progress('Selesai');
                        } else {
                          setVInfo_Progress('Masih Dalam Pengerjaan');
                        }
                      }}
                      className={`px-2.5 py-1 text-[11px] font-extrabold rounded-md transition-all cursor-pointer ${
                        nPersen_Progress === pct
                          ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Informasi Progress (ComboBox) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-amber-300">
                  Informasi Progress <span className="text-rose-400">*</span>
                </label>
                <select
                  value={vInfo_Progress}
                  onChange={(e) => setVInfo_Progress(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer [color-scheme:dark]"
                >
                  <option value="Masih Dalam Pengerjaan">Masih Dalam Pengerjaan</option>
                  <option value="Selesai">Selesai</option>
                </select>
                <p className="text-[10px] text-slate-400">Pilihan status kualitatif pengerjaan proyek</p>
              </div>

              {/* 5. Sumber / Pemberi Informasi */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-amber-300">
                  Sumber / Pemberi Informasi
                </label>
                <input
                  type="text"
                  value={vSumber_Info}
                  onChange={(e) => setVSumber_Info(e.target.value)}
                  placeholder="Contoh: Laporan Site Manager, Laporan Pengawas Lapangan, Kuitansi Lapangan..."
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium"
                />
                <p className="text-[10px] text-slate-400">Pemberi rincian atau bukti verifikasi nilai progress</p>
              </div>

              {/* Modal Action Bar: Tampilkan Script MySQL, Batal & Simpan Progress Proyek (Rata Kanan Satu Baris) */}
              <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-end gap-2 sm:gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowSqlPreview(!showSqlPreview)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-300 bg-slate-950 border border-slate-800 rounded-xl hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                >
                  <Database className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{showSqlPreview ? 'Sembunyikan Script MySQL' : 'Tampilkan Script MySQL'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowUpdateProgressModal(false)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingProgress}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold text-slate-950 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 hover:from-amber-300 hover:to-orange-300 rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50 active:scale-95 shrink-0"
                >
                  {isSubmittingProgress ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-950" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 text-slate-950" />
                      <span>Simpan Progress Proyek</span>
                    </>
                  )}
                </button>
              </div>

              {/* Collapsible Script MySQL Preview Box */}
              {showSqlPreview && (
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1 font-mono text-[10.5px] animate-fadeIn">
                  <div className="text-[10px] font-sans font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Pratinjau Query SQL (SqlRubah):</span>
                    <span className="text-slate-500 font-normal">Script VB/MySQL</span>
                  </div>
                  <div className="p-2.5 bg-slate-900/90 rounded border border-slate-800 text-amber-300 font-bold overflow-x-auto whitespace-pre-wrap leading-relaxed select-all">
                    Update Proyek Set Tgl_Progress= '{sTgl_Progress}', Persen_Progress='{nPersen_Progress}', Info_Progress= '{vInfo_Progress}', Sumber_Info= '{vSumber_Info || '-'}', U_Name= '{loggedInUser?.User_Name || 'Admin JPU'}', Tgl_Update= '{sTgl_Update}' Where No_Proyek='{vNo_Proyek}'
                  </div>
                </div>
              )}

            </form>
          </div>
        </div>
      )}

      <OfflineIndicator />
    </div>
  );
}