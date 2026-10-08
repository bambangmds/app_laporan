import { useState, useEffect, useMemo } from 'react';
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
  Download
} from 'lucide-react';
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

export default function App() {
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
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [activeView, setActiveView] = useState<'customer' | 'proyek_selesai' | 'proyek_pengerjaan' | 'proyek_semua' | 'manager' | 'seorangan'>('customer');
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

  // States for Category Costs modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
  const [showCategoryPage, setShowCategoryPage] = useState<boolean>(false);
  const [selectedNoProyek, setSelectedNoProyek] = useState<string | null>(null);
  const [selectedNoPo, setSelectedNoPo] = useState<string | null>(null);
  const [selectedProjectKeterangan, setSelectedProjectKeterangan] = useState<string | null>(null);
  const [categoryCosts, setCategoryCosts] = useState<any[]>([]);
  const [categoryCostsLoading, setCategoryCostsLoading] = useState<boolean>(false);
  const [categoryCostsError, setCategoryCostsError] = useState<string | null>(null);
  const [categoryCostsMeta, setCategoryCostsMeta] = useState<any | null>(null);

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

  // Custom Notifications / Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

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

  // Show Toast helper
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
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
          fetchCustomCustomerReport(selectedYear);
        } else if (activeView === 'proyek_selesai') {
          fetchProjectReport('selesai', selectedYear);
          if (selectedCusCode !== 'Semua') {
            fetchSelectedCustomerProyeks(selectedCusCode, selectedYear, 'selesai');
          }
        } else if (activeView === 'proyek_pengerjaan') {
          fetchProjectReport('pengerjaan', selectedYear);
          if (selectedCusCode !== 'Semua') {
            fetchSelectedCustomerProyeks(selectedCusCode, selectedYear, 'pengerjaan');
          }
        } else if (activeView === 'proyek_semua') {
          fetchProjectReport('semua', selectedYear);
          if (selectedCusCode !== 'Semua') {
            fetchSelectedCustomerProyeks(selectedCusCode, selectedYear, 'semua');
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
          fetchCustomCustomerReport(selectedYear);
        } else if (activeView === 'proyek_selesai') {
          fetchProjectReport('selesai', selectedYear);
          if (selectedCusCode !== 'Semua') {
            fetchSelectedCustomerProyeks(selectedCusCode, selectedYear, 'selesai');
          }
        } else if (activeView === 'proyek_pengerjaan') {
          fetchProjectReport('pengerjaan', selectedYear);
          if (selectedCusCode !== 'Semua') {
            fetchSelectedCustomerProyeks(selectedCusCode, selectedYear, 'pengerjaan');
          }
        } else if (activeView === 'proyek_semua') {
          fetchProjectReport('semua', selectedYear);
          if (selectedCusCode !== 'Semua') {
            fetchSelectedCustomerProyeks(selectedCusCode, selectedYear, 'semua');
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

  // Fetch specific details for a selected customer
  const fetchSelectedCustomerProyeks = async (
    cusCode: string, 
    year: number = selectedYear, 
    status: 'selesai' | 'pengerjaan' | 'semua' = activeView === 'proyek_pengerjaan' ? 'pengerjaan' : (activeView === 'proyek_semua' ? 'semua' : 'selesai')
  ) => {
    if (!cusCode || cusCode === 'Semua') {
      setSelectedCustomerProyeks([]);
      setSelectedCustomerProyeksMeta(null);
      return;
    }
    setSelectedCustomerProyeksLoading(true);
    setSelectedCustomerProyeksError(null);
    try {
      const res = await fetch(`/api/laporan/proyek-detail?cus_code=${cusCode}&year=${year}&status=${status}`);
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
  const fetchCustomCustomerReport = async (year: number = selectedYear) => {
    setCustomReportLoading(true);
    setCustomReportError(null);
    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      
      let startOfYearStr = `${year}-01-01`;
      let todayStr = '';
      
      if (year === currentYear) {
        todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      } else {
        todayStr = `${year}-12-31`;
      }

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
  const fetchProjectReport = async (status: 'selesai' | 'pengerjaan' | 'semua', year: number = selectedYear) => {
    setProjectReportLoading(true);
    setProjectReportError(null);
    try {
      const res = await fetch(`/api/laporan/proyek?status=${status}&year=${year}`);
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
    fetchMonthlyTrend(selectedYear);
    if (activeView === 'customer') {
      fetchCustomCustomerReport(selectedYear);
    } else if (activeView === 'proyek_selesai') {
      fetchProjectReport('selesai', selectedYear);
      if (selectedCusCode !== 'Semua') {
        fetchSelectedCustomerProyeks(selectedCusCode, selectedYear, 'selesai');
      }
    } else if (activeView === 'proyek_pengerjaan') {
      fetchProjectReport('pengerjaan', selectedYear);
      if (selectedCusCode !== 'Semua') {
        fetchSelectedCustomerProyeks(selectedCusCode, selectedYear, 'pengerjaan');
      }
    } else if (activeView === 'proyek_semua') {
      fetchProjectReport('semua', selectedYear);
      if (selectedCusCode !== 'Semua') {
        fetchSelectedCustomerProyeks(selectedCusCode, selectedYear, 'semua');
      }
    }
  }, [activeView, selectedYear, selectedCusCode]);

  // Handle Exporting any active report view to Excel (CSV format)
  const handleExportToExcel = () => {
    let csvContent = '\uFEFF'; // UTF-8 BOM to ensure Excel opens with correct encoding and layout
    let fileName = `Laporan_SalesFlow_${activeView}_${selectedYear}.csv`;

    if (activeView === 'customer') {
      fileName = `Laporan_Penjualan_Per_Customer_${selectedYear}.csv`;
      csvContent += 'No;Kode Customer;Nama Customer;Total Proyek Bersih;Nilai Proporsi Finansial (%)\n';
      customCustomerReport.forEach((item, idx) => {
        const totalProyek = Number(item.totpro) || 0;
        const totalAll = customCustomerReport.reduce((acc, c) => acc + Number(c.totpro), 0) || 1;
        const percent = ((totalProyek / totalAll) * 100).toFixed(1) + '%';
        csvContent += `${idx + 1};"${item.Cus_Code}";"${item.Cus_Name.replace(/"/g, '""')}";${totalProyek};"${percent}"\n`;
      });
      const totalAll = customCustomerReport.reduce((acc, c) => acc + Number(c.totpro), 0);
      csvContent += `TOTAL;-;-(Semua Pelanggan);${totalAll};"100.0%"\n`;

    } else if (activeView === 'proyek_selesai' || activeView === 'proyek_pengerjaan' || activeView === 'proyek_semua') {
      const viewLabel = activeView === 'proyek_selesai' ? 'Selesai_100' : (activeView === 'proyek_pengerjaan' ? 'Dalam_Pengerjaan' : 'Semua_Proyek');
      fileName = `Laporan_Proyek_${viewLabel}_${selectedCusCode}_${selectedYear}.csv`;
      const hasProgress = activeView === 'proyek_pengerjaan' || activeView === 'proyek_semua';
      
      if (hasProgress) {
        csvContent += 'No;Keterangan Proyek;No. PO;Tanggal Proyek;Progres (%);Nilai Pro (-2.65%);Nilai RAP (75%);Total Biaya;Selisih\n';
      } else {
        csvContent += 'No;Keterangan Proyek;No. PO;Tanggal Proyek;Nilai Pro (-2.65%);Nilai RAP (75%);Total Biaya;Selisih\n';
      }

      const sortedProyeks = [...selectedCustomerProyeks].sort((a, b) => {
        const isAMenampung = (a.no_po || a.No_PO || '').trim().toLowerCase() === 'menampung biaya';
        const isBMenampung = (b.no_po || b.No_PO || '').trim().toLowerCase() === 'menampung biaya';
        if (isAMenampung && !isBMenampung) return 1;
        if (!isAMenampung && isBMenampung) return -1;
        const dateA = a.tgl_proyek || a.Tgl_Proyek || '';
        const dateB = b.tgl_proyek || b.Tgl_Proyek || '';
        return dateA.localeCompare(dateB);
      });

      sortedProyeks.forEach((item, idx) => {
        const isScaled = activeView === 'proyek_pengerjaan' || activeView === 'proyek_semua';
        const { rap, selisih, biaya } = getItemRapAndSelisih(item, isScaled);
        const rawNilaiPro = Number(item.nilai_pro) || 0;
        const progressPercent = typeof item.Persen_Progress === 'number' || typeof item.Persen_Progress === 'string'
          ? Number(item.Persen_Progress)
          : 0;
        const noPo = item.no_po || '';
        const formattedDate = formatDateIndo(item.tgl_proyek || item.Tgl_Proyek);
        const keteranganStr = (item.keterangan || '').replace(/"/g, '""');

        if (hasProgress) {
          csvContent += `${idx + 1};"${keteranganStr}";"${noPo}";"${formattedDate}";${progressPercent};${rawNilaiPro};${rap};${biaya};${selisih}\n`;
        } else {
          csvContent += `${idx + 1};"${keteranganStr}";"${noPo}";"${formattedDate}";${rawNilaiPro};${rap};${biaya};${selisih}\n`;
        }
      });

      const isScaled = activeView === 'proyek_pengerjaan' || activeView === 'proyek_semua';
      const totalNilaiPro = selectedCustomerProyeks.reduce((acc, item) => acc + Number(item.nilai_pro || 0), 0);
      const totalRap = selectedCustomerProyeks.reduce((acc, item) => acc + getItemRapAndSelisih(item, isScaled).totalContributionRap, 0);
      const totalBiaya = selectedCustomerProyeks.reduce((acc, item) => acc + getItemRapAndSelisih(item, isScaled).totalContributionBiaya, 0);
      const totalSelisih = selectedCustomerProyeks.reduce((acc, item) => acc + getItemRapAndSelisih(item, isScaled).totalContributionSelisih, 0);

      if (hasProgress) {
        csvContent += `TOTAL DETIL;-;-;-;-;${totalNilaiPro};${totalRap};${totalBiaya};${totalSelisih}\n`;
      } else {
        csvContent += `TOTAL DETIL;-;-;-;${totalNilaiPro};${totalRap};${totalBiaya};${totalSelisih}\n`;
      }

    } else if (activeView === 'manager') {
      if (selectedManager === 'Semua') {
        fileName = `Laporan_Pencapaian_Manager_${selectedYear}.csv`;
        csvContent += 'No;Nama Manager;Jabatan;Jumlah Proyek;Total Pencapaian;Kontribusi\n';
        const managers = [
          { name: 'Andi Wijaya', role: 'Senior Manager', projects: 6, total: 495000000 },
          { name: 'Budi Santoso', role: 'Project Manager', projects: 5, total: 385000000 },
          { name: 'Citra Lestari', role: 'Operational Lead', projects: 4, total: 275000000 },
          { name: 'Dewi Handayani', role: 'Regional Manager', projects: 3, total: 195000000 }
        ];
        managers.forEach((m, idx) => {
          const percent = ((m.total / 1350000000) * 100).toFixed(1) + '%';
          csvContent += `${idx + 1};"${m.name}";"${m.role}";${m.projects};${m.total};"${percent}"\n`;
        });
        csvContent += `TOTAL;-;-;18;1350000000;"100.0%"\n`;
      } else {
        fileName = `Laporan_Detail_Proyek_Manager_${selectedManager.replace(/\s+/g, '_')}_${selectedYear}.csv`;
        csvContent += 'No;Nama Proyek / Klien;No. PO;Status Pengerjaan;Nilai Anggaran\n';
        const projectsData: { [key: string]: any[] } = {
          'Andi Wijaya': [
            { name: 'PT Sinar Abadi - Instalasi Kemang', po: 'PO/2026/001', status: 'Selesai 100%', val: 120000000 },
            { name: 'Kafe Kopi Kita - Interior Tebet', po: 'PO/2026/004', status: 'Selesai 100%', val: 85000000 },
            { name: 'Hotel Grand Kemang - Suplai Premium', po: 'PO/2026/005', status: 'Dalam Pengerjaan (85%)', val: 150000000 },
            { name: 'Distributor Agung - Logistik Wilayah', po: 'PO/2026/012', status: 'Dalam Pengerjaan (50%)', val: 140000000 }
          ],
          'Budi Santoso': [
            { name: 'Kafe Kopi Kita - Operasional Cabang', po: 'PO/2026/007', status: 'Selesai 100%', val: 95000000 },
            { name: 'PT Sinar Abadi - Upgrade Fasilitas', po: 'PO/2026/009', status: 'Dalam Pengerjaan (90%)', val: 110000000 },
            { name: 'Hotel Grand Kemang - Maintenance', po: 'PO/2026/014', status: 'Dalam Pengerjaan (40%)', val: 180000000 }
          ],
          'Citra Lestari': [
            { name: 'PT Sinar Abadi - Renovasi Gedung B', po: 'PO/2026/002', status: 'Selesai 100%', val: 160000000 },
            { name: 'Kafe Kopi Kita - Pengadaan Meja', po: 'PO/2026/011', status: 'Dalam Pengerjaan (75%)', val: 115000000 }
          ],
          'Dewi Handayani': [
            { name: 'Distributor Agung - Penataan Gudang', po: 'PO/2026/003', status: 'Selesai 100%', val: 195000000 }
          ]
        };
        const list = projectsData[selectedManager] || [];
        list.forEach((item, idx) => {
          csvContent += `${idx + 1};"${item.name}";"${item.po}";"${item.status}";${item.val}\n`;
        });
        const totalVal = list.reduce((acc, item) => acc + item.val, 0);
        csvContent += `TOTAL DETIL;-;-;-;${totalVal}\n`;
      }

    } else if (activeView === 'seorangan') {
      if (selectedSalesperson === 'Semua') {
        fileName = `Laporan_Kinerja_Sales_${selectedYear}.csv`;
        csvContent += 'No;Nama Agen Sales;Jumlah Deal;Total Nilai Deal;Insentif Komisi (5%);Persentase Target\n';
        const sales = [
          { name: 'Eko Prasetyo', deals: 5, total: 380000000, commission: 19000000, target: 95 },
          { name: 'Feri Setiawan', deals: 4, total: 290000000, commission: 14500000, target: 82 },
          { name: 'Gita Rahayu', deals: 3, total: 180000000, commission: 9000000, target: 60 },
          { name: 'Hadi Wibowo', deals: 2, total: 130000000, commission: 6500000, target: 52 }
        ];
        sales.forEach((s, idx) => {
          csvContent += `${idx + 1};"${s.name}";${s.deals};${s.total};${s.commission};"${s.target}%"\n`;
        });
        csvContent += `TOTAL;-;14;980000000;49000000;-\n`;
      } else {
        fileName = `Laporan_Deal_Sales_${selectedSalesperson.replace(/\s+/g, '_')}_${selectedYear}.csv`;
        csvContent += 'No;Nama Proyek / Klien;No. PO;Nilai Anggaran;Komisi Sales (5%)\n';
        const salesDataMap: { [key: string]: any[] } = {
          'Eko Prasetyo': [
            { client: 'PT Sinar Abadi - Project C', po: 'PO/2026/015', val: 150000000, comm: 7500000 },
            { client: 'Kafe Kopi Kita - Restock Furnitur', po: 'PO/2026/018', val: 120000000, comm: 6000000 },
            { client: 'Hotel Grand Kemang - Renovasi Lobby', po: 'PO/2026/020', val: 110000000, comm: 5500000 }
          ],
          'Feri Setiawan': [
            { client: 'Bakeri Citra Rasa - Oven Pengadaan', po: 'PO/2026/022', val: 160000000, comm: 8000000 },
            { client: 'Hotel Grand Kemang - Service Bulanan', po: 'PO/2026/025', val: 130000000, comm: 6500000 }
          ],
          'Gita Rahayu': [
            { client: 'PT Sinar Abadi - Servis AC Kantor', po: 'PO/2026/028', val: 100000000, comm: 5000000 },
            { client: 'Kafe Kopi Kita - Upgrade Mesin Kopi', po: 'PO/2026/030', val: 80000000, comm: 4000000 }
          ],
          'Hadi Wibowo': [
            { client: 'Distributor Agung - Sistem Baru', po: 'PO/2026/032', val: 130000000, comm: 6500000 }
          ]
        };
        const list = salesDataMap[selectedSalesperson] || [];
        list.forEach((item, idx) => {
          csvContent += `${idx + 1};"${item.client}";"${item.po}";${item.val};${item.comm}\n`;
        });
        const totalVal = list.reduce((acc, item) => acc + item.val, 0);
        const totalComm = list.reduce((acc, item) => acc + item.comm, 0);
        csvContent += `TOTAL PENCAPAIAN SALES & KOMISI;-;-;${totalVal};${totalComm}\n`;
      }
    }

    // Trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Laporan berhasil diekspor ke Excel!', 'success');
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
            <div className="shrink-0 bg-white p-1.5 rounded-xl border-2 border-blue-600 flex items-center justify-center shadow-md shadow-blue-500/10 animate-fadeIn">
              <svg className="w-14 h-11" viewBox="0 0 140 90" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  {/* Glossy radial gradient for Jakarta red dot */}
                  <radialGradient id="dot-grad" cx="35%" cy="35%" r="65%">
                    <stop offset="0%" stopColor="#FF8F9C" />
                    <stop offset="40%" stopColor="#E51C24" />
                    <stop offset="100%" stopColor="#8A0810" />
                  </radialGradient>
                  {/* Linear gradient for underline swoosh and text/blocks */}
                  <linearGradient id="red-gradient-jpu" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#E51C24" />
                    <stop offset="100%" stopColor="#A80A12" />
                  </linearGradient>
                </defs>
                
                {/* Red Globe/Sphere above cursive 'j' on the top-left */}
                <circle cx="28" cy="22" r="10" fill="url(#dot-grad)" />

                {/* 'jakarta' in premium cursive calligraphy */}
                <text 
                  x="12" 
                  y="52" 
                  fill="#E51C24" 
                  fontSize="33" 
                  fontWeight="normal" 
                  fontFamily="'Playball', 'Pacifico', 'Brush Script MT', 'Great Vibes', cursive"
                  style={{ letterSpacing: '0px' }}
                >
                  jakarta
                </text>

                {/* Elegant swoosh underline under the text */}
                <path 
                  d="M 12 59 C 45 54, 90 53, 128 58 C 105 65, 55 64, 12 59 Z" 
                  fill="url(#red-gradient-jpu)" 
                />

                {/* JPU rectangular blocks at the right side of the swoosh */}
                <g transform="translate(68, 62)">
                  {/* J block */}
                  <rect x="0" y="0" width="16" height="16" rx="2.5" fill="url(#red-gradient-jpu)" />
                  <text x="8" y="12" fill="white" fontSize="11" fontWeight="bold" fontFamily="'Plus Jakarta Sans', sans-serif" textAnchor="middle">J</text>

                  {/* P block */}
                  <rect x="19" y="0" width="16" height="16" rx="2.5" fill="url(#red-gradient-jpu)" />
                  <text x="27" y="12" fill="white" fontSize="11" fontWeight="bold" fontFamily="'Plus Jakarta Sans', sans-serif" textAnchor="middle">P</text>

                  {/* U block */}
                  <rect x="38" y="0" width="16" height="16" rx="2.5" fill="url(#red-gradient-jpu)" />
                  <text x="46" y="12" fill="white" fontSize="11" fontWeight="bold" fontFamily="'Plus Jakarta Sans', sans-serif" textAnchor="middle">U</text>
                </g>
              </svg>
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

            <div className="pt-2">
              <button
                onClick={() => setIsConfigModalOpen(true)}
                className="w-full py-1.5 px-3 text-center text-[11px] font-semibold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700/80 rounded-lg border border-slate-700 transition-colors cursor-pointer"
              >
                Atur Koneksi VPS
              </button>
            </div>
          </div>
          <nav className="flex-1 px-4 py-2 space-y-2">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2 mt-4">Menu Utama</div>
            
            <button 
              onClick={() => { setActiveView('customer'); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                activeView === 'customer' 
                  ? 'bg-indigo-500/25 text-white border-l-4 border-indigo-400 pl-2 font-bold shadow-md shadow-indigo-500/10' 
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-white border-l-4 border-transparent pl-2'
              }`}
            >
              <BarChart3 className={`w-4 h-4 ${activeView === 'customer' ? 'text-indigo-300' : 'text-slate-500'}`} />
              <span>Penjualan Per Customer</span>
            </button>
 
            {/* Penjualan Per Proyek (Collapsible Main Menu) */}
            <div className="space-y-1">
              <button 
                onClick={() => { setIsProyekMenuOpen(!isProyekMenuOpen); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  activeView === 'proyek_selesai' || activeView === 'proyek_pengerjaan' || activeView === 'proyek_semua'
                    ? 'bg-blue-500/25 text-white border-l-4 border-blue-400 pl-2 font-bold shadow-md shadow-blue-500/10'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-white border-l-4 border-transparent pl-2'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Briefcase className={`w-4 h-4 ${activeView === 'proyek_selesai' || activeView === 'proyek_pengerjaan' || activeView === 'proyek_semua' ? 'text-blue-300' : 'text-slate-500'}`} />
                  <span>Penjualan Per Proyek</span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isProyekMenuOpen ? 'rotate-180 text-blue-300' : 'text-slate-500'}`} />
              </button>
 
              {/* Collapsible Submenus */}
              {isProyekMenuOpen && (
                <div className="pl-4 space-y-1 pt-1 animate-fadeIn">
                  <button
                    onClick={() => { setActiveView('proyek_selesai'); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                      activeView === 'proyek_selesai' 
                        ? 'bg-emerald-500/20 text-emerald-200 border-l-2 border-emerald-400 pl-2 font-bold shadow-sm' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border-l-2 border-transparent pl-2'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeView === 'proyek_selesai' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`}></span>
                    <span>Proyek Selesai 100%</span>
                  </button>
                  <button
                    onClick={() => { setActiveView('proyek_pengerjaan'); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                      activeView === 'proyek_pengerjaan' 
                        ? 'bg-amber-500/20 text-amber-200 border-l-2 border-amber-400 pl-2 font-bold shadow-sm' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border-l-2 border-transparent pl-2'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeView === 'proyek_pengerjaan' ? 'bg-amber-400 animate-pulse' : 'bg-slate-600'}`}></span>
                    <span>Proyek Dalam Pengerjaan</span>
                  </button>
                  <button
                    onClick={() => { setActiveView('proyek_semua'); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                      activeView === 'proyek_semua' 
                        ? 'bg-blue-500/20 text-blue-200 border-l-2 border-blue-400 pl-2 font-bold shadow-sm' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border-l-2 border-transparent pl-2'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeView === 'proyek_semua' ? 'bg-blue-400 animate-pulse' : 'bg-slate-600'}`}></span>
                    <span>Semua Proyek</span>
                  </button>
                </div>
              )}
            </div>

            <button 
              onClick={() => { setActiveView('manager'); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                activeView === 'manager' 
                  ? 'bg-purple-500/25 text-white border-l-4 border-purple-400 pl-2 font-bold shadow-md shadow-purple-500/10' 
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-white border-l-4 border-transparent pl-2'
              }`}
            >
              <Users className={`w-4 h-4 ${activeView === 'manager' ? 'text-purple-300' : 'text-slate-500'}`} />
              <span>Penjualan Per Manager</span>
            </button>

            <button 
              onClick={() => { setActiveView('seorangan'); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                activeView === 'seorangan' 
                  ? 'bg-teal-500/25 text-white border-l-4 border-teal-400 pl-2 font-bold shadow-md shadow-teal-500/10' 
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-white border-l-4 border-transparent pl-2'
              }`}
            >
              <User className={`w-4 h-4 ${activeView === 'seorangan' ? 'text-teal-300' : 'text-slate-500'}`} />
              <span>Penjualan Per Seorangan</span>
            </button>
          </nav>

          {/* Developer Quick Guide Footer */}
          <div className="p-4 border-t border-slate-800 mt-auto bg-slate-950/30">
            <div className="flex gap-2">
              <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-medium text-slate-200">Panduan Sinkronisasi</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Jika ingin menggunakan database MySQL asli, lengkapi berkas <code className="text-slate-200 font-mono font-semibold">.env</code> dengan rincian akun database Anda lalu jalankan ulang server.
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* Content Area Column */}
        <main className="flex-1 p-6 lg:p-10 lg:h-full overflow-y-auto">
          
          {/* Top Bar with Profile / Add action */}
          <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 py-3.5 px-5 bg-slate-200 border border-slate-300 rounded-2xl mb-8 shadow-xs">
            <div>
              <h2 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
                {activeView === 'customer' && "Penjualan Per Customer"}
                {activeView === 'proyek_selesai' && "Laporan Penjualan Per Proyek - Selesai 100%"}
                {activeView === 'proyek_pengerjaan' && "Laporan Penjualan Per Proyek - Dalam Pengerjaan"}
                {activeView === 'proyek_semua' && "Laporan Penjualan Per Proyek - Semua Proyek"}
                {activeView === 'manager' && "Penjualan Per Manager"}
                {activeView === 'seorangan' && "Penjualan Per Seorangan"}
              </h2>
              <div className="inline-flex items-center mt-2">
                <span className="text-xs bg-blue-600 text-white font-semibold px-3 py-1.5 rounded-lg shadow-sm">
                  {selectedYear === new Date().getFullYear() ? (
                    `Per. 01 Januari s/d ${new Date().getDate().toString().padStart(2, '0')} ${[
                      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
                    ][new Date().getMonth()]} ${selectedYear}`
                  ) : (
                    `Per. 01 Januari ${selectedYear} s/d 31 Desember ${selectedYear}`
                  )}
                </span>
              </div>
            </div>

            {/* Actions Panel */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Year Selector Combobox */}
              {(activeView === 'customer' || activeView === 'proyek_selesai' || activeView === 'proyek_pengerjaan' || activeView === 'proyek_semua' || activeView === 'manager' || activeView === 'seorangan') && (
                <div className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 border border-orange-600/20 text-white rounded-lg px-3 py-1.5 shadow-md shadow-orange-500/10 transition-colors">
                  <span className="text-[10px] font-extrabold text-orange-950 uppercase tracking-wider">Tahun Laporan:</span>
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

              <button 
                onClick={() => {
                  fetchData();
                  fetchMonthlyTrend(selectedYear);
                  if (activeView === 'customer') {
                    fetchCustomCustomerReport(selectedYear);
                  } else if (activeView === 'proyek_selesai') {
                    fetchProjectReport('selesai', selectedYear);
                    if (selectedCusCode !== 'Semua') {
                      fetchSelectedCustomerProyeks(selectedCusCode, selectedYear, 'selesai');
                    }
                  } else if (activeView === 'proyek_pengerjaan') {
                    fetchProjectReport('pengerjaan', selectedYear);
                    if (selectedCusCode !== 'Semua') {
                      fetchSelectedCustomerProyeks(selectedCusCode, selectedYear, 'pengerjaan');
                    }
                  } else if (activeView === 'proyek_semua') {
                    fetchProjectReport('semua', selectedYear);
                    if (selectedCusCode !== 'Semua') {
                      fetchSelectedCustomerProyeks(selectedCusCode, selectedYear, 'semua');
                    }
                  }
                }}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 hover:text-slate-900 transition-all disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Segarkan Data</span>
              </button>

              <button 
                onClick={handleExportToExcel}
                disabled={
                  loading || 
                  (activeView === 'customer' && customCustomerReport.length === 0) ||
                  ((activeView === 'proyek_selesai' || activeView === 'proyek_pengerjaan' || activeView === 'proyek_semua') && selectedCusCode === 'Semua')
                }
                title={
                  (activeView === 'proyek_selesai' || activeView === 'proyek_pengerjaan' || activeView === 'proyek_semua') && selectedCusCode === 'Semua'
                    ? "Pilih customer terlebih dahulu untuk mengekspor laporan proyek"
                    : "Ekspor laporan aktif ke Excel (CSV)"
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-800 disabled:text-slate-500 border border-emerald-700 disabled:border-slate-800 rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Ekspor Excel</span>
              </button>
            </div>
          </header>


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
                      <span className={`px-2.5 py-1 text-[11px] font-mono rounded-full font-bold ${
                        customReportMeta?.source === 'MySQL' 
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        Koneksi: {customReportMeta?.source || 'Memuat...'}
                      </span>
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
                  <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-white text-sm tracking-tight">Data Penjualan Per Customer</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Hasil rekapitulasi nominal proyek bersih (dikalikan koefisien 97.35%) per pelanggan.</p>
                    </div>
                    <span className="font-mono text-xs font-bold text-indigo-300 bg-indigo-950/50 border border-indigo-900/30 px-2.5 py-1 rounded-full">
                      {customCustomerReport.length} Entitas Terdaftar
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                          <th className="py-3 px-5 text-center font-mono">No</th>
                          <th className="py-3 px-4">Kode Pelanggan</th>
                          <th className="py-3 px-4">Nama Pelanggan</th>
                          <th className="py-3 px-4 text-right">Total Proyek Bersih</th>
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
                              <td className="py-2.5 px-5 font-mono text-center text-slate-500 font-semibold">{idx + 1}</td>
                              <td className="py-2.5 px-4 font-mono font-bold text-slate-300">{item.Cus_Code}</td>
                              <td className="py-2.5 px-4 font-semibold text-white">{item.Cus_Name}</td>
                              <td className="py-2.5 px-4 text-right font-mono font-bold text-indigo-300">
                                {formatRupiah(Number(item.totpro))}
                              </td>
                              <td className="py-2.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-2.5">
                                  <span className="font-mono text-slate-400 font-semibold text-[10.5px]">
                                    {((Number(item.totpro) / (customCustomerReport.reduce((acc, c) => acc + Number(c.totpro), 0) || 1)) * 100).toFixed(1)}%
                                  </span>
                                  <div className="w-16 bg-slate-950 h-1.5 rounded-full overflow-hidden shrink-0 border border-slate-800">
                                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${contributionPercent}%` }} />
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

          {/* VIEW: Penjualan Per Manager */}
          {activeView === 'manager' && (
            <div className="space-y-6 py-6 animate-fadeIn">
              
              {/* KPI Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Penjualan Proyek</span>
                  <div className="text-2xl font-extrabold text-white font-mono mt-1">
                    {formatRupiah(1350000000)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-2 font-mono">Periode Aktif {selectedYear}</div>
                </div>
                <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Manager Kontributor Tertinggi</span>
                  <div className="text-lg font-bold text-purple-400 truncate mt-1">
                    Andi Wijaya
                  </div>
                  <div className="text-[10px] text-slate-400 mt-2 font-mono">Pencapaian: {formatRupiah(495000000)}</div>
                </div>
                <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Project Pipeline</span>
                  <div className="text-2xl font-extrabold text-white font-mono mt-1">
                    18 Proyek
                  </div>
                  <div className="text-[10px] text-slate-400 mt-2 font-mono">Terbagi ke 4 Divisi Wilayah</div>
                </div>
              </div>

              {/* Interactive Manager Filter Dropdown */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Penyaringan Data Per Manager</h4>
                  <p className="text-xs text-slate-500">
                    Pilih nama Manager di samping untuk melihat rincian alokasi anggaran proyek dan pencapaian detail mereka.
                  </p>
                </div>
                
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold text-purple-800 bg-purple-100/70 border border-purple-200 px-3 py-2 rounded-lg shrink-0">
                    Pilih Manager:
                  </span>
                  <select
                    value={selectedManager}
                    onChange={(e) => setSelectedManager(e.target.value)}
                    className="text-xs bg-purple-600 hover:bg-purple-700 border border-purple-700 text-white font-extrabold rounded-lg px-4 py-2 cursor-pointer min-w-[200px] shadow-sm transition-all focus:ring-2 focus:ring-purple-500 focus:outline-none [color-scheme:dark]"
                  >
                    <option value="Semua">-- Semua Manager --</option>
                    <option value="Andi Wijaya">Andi Wijaya (Senior Manager)</option>
                    <option value="Budi Santoso">Budi Santoso (Project Manager)</option>
                    <option value="Citra Lestari">Citra Lestari (Operational Lead)</option>
                    <option value="Dewi Handayani">Dewi Handayani (Regional Manager)</option>
                  </select>
                </div>
              </div>

              {/* Tables Container */}
              {selectedManager === 'Semua' ? (
                /* Overview Table of all Managers */
                <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-xl overflow-hidden animate-fadeIn">
                  <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-white text-sm tracking-tight">Kinerja Penjualan Seluruh Manager</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Rekapitulasi total pencapaian anggaran proyek tertimbang berdasarkan alokasi manager.</p>
                    </div>
                    <span className="font-mono text-xs font-bold text-purple-300 bg-purple-950/50 border border-purple-900/30 px-2.5 py-1 rounded-full">
                      4 Manager Aktif
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                          <th className="py-3 px-5 text-center font-mono">No</th>
                          <th className="py-3 px-4">Nama Manager</th>
                          <th className="py-3 px-4">Jabatan</th>
                          <th className="py-3 px-4 text-center">Jumlah Proyek</th>
                          <th className="py-3 px-4 text-right">Total Pencapaian</th>
                          <th className="py-3 px-4 text-right">Kontribusi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {[
                          { name: 'Andi Wijaya', role: 'Senior Manager', projects: 6, total: 495000000 },
                          { name: 'Budi Santoso', role: 'Project Manager', projects: 5, total: 385000000 },
                          { name: 'Citra Lestari', role: 'Operational Lead', projects: 4, total: 275000000 },
                          { name: 'Dewi Handayani', role: 'Regional Manager', projects: 3, total: 195000000 }
                        ].map((m, idx) => {
                          const percent = (m.total / 1350000000) * 100;
                          return (
                            <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                              <td className="py-3 px-5 font-mono text-center text-slate-500 font-semibold">{idx + 1}</td>
                              <td className="py-3 px-4 font-semibold text-white">{m.name}</td>
                              <td className="py-3 px-4 font-mono text-slate-400">{m.role}</td>
                              <td className="py-3 px-4 text-center font-mono text-indigo-300 font-bold">{m.projects} Proyek</td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-amber-400">{formatRupiah(m.total)}</td>
                              <td className="py-3 px-4 text-right font-mono font-semibold text-slate-400">
                                {percent.toFixed(1)}%
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* Selected Manager's Specific Project Detail List */
                <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4 animate-fadeIn">
                  <div className="border-b border-slate-800 pb-4">
                    <h4 className="font-bold text-white text-base">
                      Alokasi Proyek Detail Manager: <span className="text-purple-400 font-mono">{selectedManager}</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Menampilkan rincian pipeline proyek yang dipimpin dan dikelola langsung oleh {selectedManager}.
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                          <th className="py-2.5 px-4 text-center font-mono">No</th>
                          <th className="py-2.5 px-4">Nama Proyek / Klien</th>
                          <th className="py-2.5 px-4">No. PO / Ref</th>
                          <th className="py-2.5 px-4 text-center">Status Pengerjaan</th>
                          <th className="py-2.5 px-4 text-right">Nilai Anggaran</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {(() => {
                          const projectsData: { [key: string]: any[] } = {
                            'Andi Wijaya': [
                              { name: 'PT Sinar Abadi - Instalasi Kemang', po: 'PO/2026/001', status: 'Selesai 100%', val: 120000000 },
                              { name: 'Kafe Kopi Kita - Interior Tebet', po: 'PO/2026/004', status: 'Selesai 100%', val: 85000000 },
                              { name: 'Hotel Grand Kemang - Suplai Premium', po: 'PO/2026/005', status: 'Dalam Pengerjaan (85%)', val: 150000000 },
                              { name: 'Distributor Agung - Logistik Wilayah', po: 'PO/2026/012', status: 'Dalam Pengerjaan (50%)', val: 140000000 }
                            ],
                            'Budi Santoso': [
                              { name: 'Kafe Kopi Kita - Operasional Cabang', po: 'PO/2026/007', status: 'Selesai 100%', val: 95000000 },
                              { name: 'PT Sinar Abadi - Upgrade Fasilitas', po: 'PO/2026/009', status: 'Dalam Pengerjaan (90%)', val: 110000000 },
                              { name: 'Hotel Grand Kemang - Maintenance', po: 'PO/2026/014', status: 'Dalam Pengerjaan (40%)', val: 180000000 }
                            ],
                            'Citra Lestari': [
                              { name: 'PT Sinar Abadi - Renovasi Gedung B', po: 'PO/2026/002', status: 'Selesai 100%', val: 160000000 },
                              { name: 'Kafe Kopi Kita - Pengadaan Meja', po: 'PO/2026/011', status: 'Dalam Pengerjaan (75%)', val: 115000000 }
                            ],
                            'Dewi Handayani': [
                              { name: 'Distributor Agung - Penataan Gudang', po: 'PO/2026/003', status: 'Selesai 100%', val: 195000000 }
                            ]
                          };
                          
                          const list = projectsData[selectedManager] || [];
                          if (list.length === 0) {
                            return (
                              <tr>
                                <td colSpan={5} className="py-4 text-center text-slate-500">Tidak ada proyek aktif.</td>
                              </tr>
                            );
                          }

                          return list.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                              <td className="py-3 px-4 font-mono text-center text-slate-500 font-semibold">{idx + 1}</td>
                              <td className="py-3 px-4 font-semibold text-white">{item.name}</td>
                              <td className="py-3 px-4 font-mono text-slate-400">{item.po}</td>
                              <td className="py-3 px-4 text-center">
                                <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${
                                  item.status.includes('100%') 
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                }`}>
                                  {item.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-purple-300">{formatRupiah(item.val)}</td>
                            </tr>
                          ));
                        })()}
                        {/* Summary total */}
                        <tr className="bg-slate-950 font-bold border-t border-slate-800 text-white">
                          <td colSpan={4} className="py-3 px-4 text-right">TOTAL ALOKASI ANGGARAN:</td>
                          <td className="py-3 px-4 text-right font-mono text-amber-400 font-extrabold text-sm">
                            {(() => {
                              const projectsDataTotals: { [key: string]: number } = {
                                'Andi Wijaya': 495000000,
                                'Budi Santoso': 385000000,
                                'Citra Lestari': 275000000,
                                'Dewi Handayani': 195000000
                              };
                              return formatRupiah(projectsDataTotals[selectedManager] || 0);
                            })()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* VIEW: Penjualan Per Seorangan */}
          {activeView === 'seorangan' && (
            <div className="space-y-6 py-6 animate-fadeIn">
              
              {/* KPI Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Penjualan Sales</span>
                  <div className="text-2xl font-extrabold text-white font-mono mt-1">
                    {formatRupiah(980000000)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-2 font-mono">Tercatat di Sistem Keuangan</div>
                </div>
                <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Top Account Executive</span>
                  <div className="text-lg font-bold text-teal-400 truncate mt-1">
                    Eko Prasetyo
                  </div>
                  <div className="text-[10px] text-slate-400 mt-2 font-mono">Pencapaian: {formatRupiah(380000000)}</div>
                </div>
                <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Komisi Terbayar (5%)</span>
                  <div className="text-2xl font-extrabold text-white font-mono mt-1">
                    {formatRupiah(49000000)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-2 font-mono">Komisi Insentif Agen Lapangan</div>
                </div>
              </div>

              {/* Interactive Salesperson Selector Dropdown */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Penyaringan Data Sales/Seorangan</h4>
                  <p className="text-xs text-slate-500">
                    Pilih nama Personil Sales untuk menampilkan rincian insentif komisi dan daftar transaksi proyek individual.
                  </p>
                </div>
                
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold text-teal-800 bg-teal-100/70 border border-teal-200 px-3 py-2 rounded-lg shrink-0">
                    Pilih Sales:
                  </span>
                  <select
                    value={selectedSalesperson}
                    onChange={(e) => setSelectedSalesperson(e.target.value)}
                    className="text-xs bg-teal-600 hover:bg-teal-700 border border-teal-700 text-white font-extrabold rounded-lg px-4 py-2 cursor-pointer min-w-[200px] shadow-sm transition-all focus:ring-2 focus:ring-teal-500 focus:outline-none [color-scheme:dark]"
                  >
                    <option value="Semua">-- Semua Sales --</option>
                    <option value="Eko Prasetyo">Eko Prasetyo (Account Exec.)</option>
                    <option value="Feri Setiawan">Feri Setiawan (Sales Representative)</option>
                    <option value="Gita Rahayu">Gita Rahayu (Junior Sales)</option>
                    <option value="Hadi Wibowo">Hadi Wibowo (Lead Agent)</option>
                  </select>
                </div>
              </div>

              {/* Tables Container */}
              {selectedSalesperson === 'Semua' ? (
                /* Overview Table of all Salespersons */
                <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-xl overflow-hidden animate-fadeIn">
                  <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-white text-sm tracking-tight">Kinerja Penjualan Individual Sales</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Rekapitulasi total pencapaian nominal proyek bersih dan komisi insentif (5%) per agen.</p>
                    </div>
                    <span className="font-mono text-xs font-bold text-teal-300 bg-teal-950/50 border border-teal-900/30 px-2.5 py-1 rounded-full">
                      4 Sales Aktif
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                          <th className="py-3 px-5 text-center font-mono">No</th>
                          <th className="py-3 px-4">Nama Agen Sales</th>
                          <th className="py-3 px-4 text-center">Jumlah Deal</th>
                          <th className="py-3 px-4 text-right">Total Nilai Deal</th>
                          <th className="py-3 px-4 text-right">Insentif Komisi (5%)</th>
                          <th className="py-3 px-4 text-right">Persentase Target</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {[
                          { name: 'Eko Prasetyo', deals: 5, total: 380000000, commission: 19000000, target: 95 },
                          { name: 'Feri Setiawan', deals: 4, total: 290000000, commission: 14500000, target: 82 },
                          { name: 'Gita Rahayu', deals: 3, total: 180000000, commission: 9000000, target: 60 },
                          { name: 'Hadi Wibowo', deals: 2, total: 130000000, commission: 6500000, target: 52 }
                        ].map((s, idx) => {
                          return (
                            <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                              <td className="py-3 px-5 font-mono text-center text-slate-500 font-semibold">{idx + 1}</td>
                              <td className="py-3 px-4 font-semibold text-white">{s.name}</td>
                              <td className="py-3 px-4 text-center font-mono text-indigo-300 font-bold">{s.deals} Deal</td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-slate-300">{formatRupiah(s.total)}</td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-teal-400">{formatRupiah(s.commission)}</td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <span className="font-mono text-slate-400 font-semibold">{s.target}%</span>
                                  <div className="w-12 bg-slate-950 h-1 rounded-full overflow-hidden border border-slate-800">
                                    <div className="h-full bg-teal-500" style={{ width: `${s.target}%` }} />
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* Selected Salesperson's Transaction History */
                <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4 animate-fadeIn">
                  <div className="border-b border-slate-800 pb-4">
                    <h4 className="font-bold text-white text-base">
                      Daftar Deal Individual Agen: <span className="text-teal-400 font-mono">{selectedSalesperson}</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Menampilkan rincian transaksi proyek individual, beserta perhitungan komisi $5\%$ langsung yang diperoleh oleh {selectedSalesperson}.
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                          <th className="py-2.5 px-4 text-center font-mono">No</th>
                          <th className="py-2.5 px-4">Nama Proyek / Klien</th>
                          <th className="py-2.5 px-4">No. PO</th>
                          <th className="py-2.5 px-4 text-right">Nilai Anggaran</th>
                          <th className="py-2.5 px-4 text-right">Komisi Sales (5%)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {(() => {
                          const salesDataMap: { [key: string]: any[] } = {
                            'Eko Prasetyo': [
                              { client: 'PT Sinar Abadi - Project C', po: 'PO/2026/015', val: 150000000, comm: 7500000 },
                              { client: 'Kafe Kopi Kita - Restock Furnitur', po: 'PO/2026/018', val: 120000000, comm: 6000000 },
                              { client: 'Hotel Grand Kemang - Renovasi Lobby', po: 'PO/2026/020', val: 110000000, comm: 5500000 }
                            ],
                            'Feri Setiawan': [
                              { client: 'Bakeri Citra Rasa - Oven Pengadaan', po: 'PO/2026/022', val: 160000000, comm: 8000000 },
                              { client: 'Hotel Grand Kemang - Service Bulanan', po: 'PO/2026/025', val: 130000000, comm: 6500000 }
                            ],
                            'Gita Rahayu': [
                              { client: 'PT Sinar Abadi - Servis AC Kantor', po: 'PO/2026/028', val: 100000000, comm: 5000000 },
                              { client: 'Kafe Kopi Kita - Upgrade Mesin Kopi', po: 'PO/2026/030', val: 80000000, comm: 4000000 }
                            ],
                            'Hadi Wibowo': [
                              { client: 'Distributor Agung - Sistem Baru', po: 'PO/2026/032', val: 130000000, comm: 6500000 }
                            ]
                          };
                          
                          const list = salesDataMap[selectedSalesperson] || [];
                          if (list.length === 0) {
                            return (
                              <tr>
                                <td colSpan={5} className="py-4 text-center text-slate-500">Tidak ada deal terdaftar.</td>
                              </tr>
                            );
                          }

                          return list.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                              <td className="py-3 px-4 font-mono text-center text-slate-500 font-semibold">{idx + 1}</td>
                              <td className="py-3 px-4 font-semibold text-white">{item.client}</td>
                              <td className="py-3 px-4 font-mono text-slate-400">{item.po}</td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-slate-300">{formatRupiah(item.val)}</td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-teal-400">{formatRupiah(item.comm)}</td>
                            </tr>
                          ));
                        })()}
                        {/* Summary total */}
                        <tr className="bg-slate-950 font-bold border-t border-slate-800 text-white">
                          <td colSpan={3} className="py-3 px-4 text-right">TOTAL PENCAPAIAN SALES & KOMISI:</td>
                          <td className="py-3 px-4 text-right font-mono text-slate-300 font-bold">
                            {(() => {
                              const salesTotalMap: { [key: string]: number } = {
                                'Eko Prasetyo': 380000000,
                                'Feri Setiawan': 290000000,
                                'Gita Rahayu': 180000000,
                                'Hadi Wibowo': 130000000
                              };
                              return formatRupiah(salesTotalMap[selectedSalesperson] || 0);
                            })()}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-teal-400 font-extrabold text-sm">
                            {(() => {
                              const salesCommMap: { [key: string]: number } = {
                                'Eko Prasetyo': 19000000,
                                'Feri Setiawan': 14500000,
                                'Gita Rahayu': 9000000,
                                'Hadi Wibowo': 6500000
                              };
                              return formatRupiah(salesCommMap[selectedSalesperson] || 0);
                            })()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* VIEW: Laporan Penjualan Per Proyek */}
          {(activeView === 'proyek_selesai' || activeView === 'proyek_pengerjaan' || activeView === 'proyek_semua') && (
            <div className="space-y-6 py-6 animate-fadeIn">
              
              {/* ComboBox Customer Filter for Proyek */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Penyaringan Kode Pelanggan (Cus_Code)</h4>
                  <p className="text-xs text-slate-500">
                    Gunakan Combo Box di bawah sebagai kunci relasi database untuk memfilter proyek {activeView === 'proyek_pengerjaan' ? 'Dalam Pengerjaan' : (activeView === 'proyek_semua' ? 'Semua Proyek' : 'Selesai 100%')}.
                  </p>
                </div>
                
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold text-blue-800 bg-blue-100/70 border border-blue-200 px-3 py-2 rounded-lg shrink-0">
                    Pilih Customer:
                  </span>
                  <select
                    value={selectedCusCode}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedCusCode(val);
                      fetchSelectedCustomerProyeks(val, selectedYear, activeView === 'proyek_pengerjaan' ? 'pengerjaan' : (activeView === 'proyek_semua' ? 'semua' : 'selesai'));
                    }}
                    className="text-xs bg-emerald-600 hover:bg-emerald-700 border border-emerald-700 text-white font-extrabold rounded-lg px-4 py-2 cursor-pointer min-w-[225px] shadow-sm transition-all focus:ring-2 focus:ring-emerald-500 focus:outline-none [color-scheme:dark]"
                  >
                    <option value="Semua">-- Semua Customer (PKP = Y) --</option>
                    {pkpCustomers.map((c) => (
                      <option key={c.Cus_Code} value={c.Cus_Code}>
                        [{c.Cus_Code}] {c.Cus_Name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Detailed Project Budget Report for Selected Customer */}
              {selectedCusCode !== 'Semua' && !showCategoryPage && (
                <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4 animate-fadeIn">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                    <div>
                      <h4 className="font-bold text-white text-base flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                        <span>Rincian Nilai RAP, Biaya dan Selisih Per No.PO {activeView === 'proyek_pengerjaan' ? '(Dalam Pengerjaan)' : (activeView === 'proyek_semua' ? '(Semua Proyek)' : '(Selesai 100%)')} : <span className="text-emerald-400 font-mono">{selectedCusCode}</span></span>
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">
                        Menampilkan rincian Nilai Proyek Bersih (dikurangi 2.65%), RAP (75% dari Nilai Proyek), Total Biaya, dan Selisih Finansial.
                      </p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className={`px-2.5 py-1 text-[11px] font-mono rounded-full font-bold ${
                        selectedCustomerProyeksMeta?.source === 'MySQL' 
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        Koneksi Detail: {selectedCustomerProyeksMeta?.source || 'Memuat...'}
                      </span>
                      <button
                        onClick={() => setShowProyekSqlPeek(!showProyekSqlPeek)}
                        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 hover:text-white transition-colors"
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
                      {selectedCustomerProyeksMeta?.query || `SELECT keterangan, no_po, tgl_proyek, ROUND(Nilai_Pro * 0.9735) AS nilai_pro, ROUND((Nilai_Pro * 0.75)) AS nilai_rap, bia_kom AS total_biaya FROM proyek WHERE cus_code = '${selectedCusCode}' ${activeView === 'proyek_pengerjaan' ? 'AND persen_progress < 100' : (activeView === 'proyek_semua' ? '' : 'AND persen_progress = 100')};`}
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
                      Tidak ditemukan proyek aktif untuk Kode Customer ini pada rentang waktu tersebut.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                            <th className="py-2.5 px-4 text-center font-mono">No</th>
                            <th className="py-2.5 px-4">Keterangan Proyek</th>
                            <th className="py-2.5 px-4">No. PO</th>
                            <th className="py-2.5 px-4 text-center">Tanggal Proyek</th>
                            {(activeView === 'proyek_pengerjaan' || activeView === 'proyek_semua') && (
                              <th className="py-2.5 px-4 text-center">Progres</th>
                            )}
                            <th className="py-2.5 px-4 text-right">Nilai Pro (-2.65%)</th>
                            <th className="py-2.5 px-4 text-right">Nilai RAP (75%)</th>
                            <th className="py-2.5 px-4 text-right">Total Biaya</th>
                            <th className="py-2.5 px-4 text-right">Selisih</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300">
                           {(() => {
                             const sortedProyeks = [...selectedCustomerProyeks].sort((a, b) => {
                               const isAMenampung = (a.no_po || a.No_PO || '').trim().toLowerCase() === 'menampung biaya';
                               const isBMenampung = (b.no_po || b.No_PO || '').trim().toLowerCase() === 'menampung biaya';
                               
                               if (isAMenampung && !isBMenampung) return 1;
                               if (!isAMenampung && isBMenampung) return -1;
                               
                               const dateA = a.tgl_proyek || a.Tgl_Proyek || '';
                               const dateB = b.tgl_proyek || b.Tgl_Proyek || '';
                               return dateA.localeCompare(dateB); // Oldest first (Ascending)
                             });
                             
                              return sortedProyeks.map((item, idx) => {
                               const isScaled = activeView === 'proyek_pengerjaan' || activeView === 'proyek_semua';
                               const { rap, selisih, biaya } = getItemRapAndSelisih(item, isScaled);
                               const rawNilaiPro = Number(item.nilai_pro) || 0;
                               const progressPercent = typeof item.Persen_Progress === 'number' || typeof item.Persen_Progress === 'string'
                                 ? Number(item.Persen_Progress)
                                 : 0;
                               const noPo = item.no_po || '';
                               
                               return (
                                 <tr key={idx} className="hover:bg-slate-800/35 transition-colors">
                                   <td className="py-3 px-4 font-mono text-center text-slate-500 font-semibold">{idx + 1}</td>
                                   <td className="py-3 px-4 font-semibold text-white">
                                     {item.keterangan}
                                   </td>
                                   <td className="py-3 px-4 font-mono text-slate-400 font-medium">{item.no_po}</td>
                                   <td className="py-3 px-4 text-center font-mono text-slate-400">{formatDateIndo(item.tgl_proyek)}</td>
                                   {(activeView === 'proyek_pengerjaan' || activeView === 'proyek_semua') && (
                                     <td className="py-3 px-4 text-center">
                                       <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                                         progressPercent === 100 
                                           ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                                           : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                       }`}>
                                         {progressPercent}%
                                       </span>
                                     </td>
                                   )}
                                   <td className="py-3 px-4 text-right font-mono text-slate-300 font-semibold">{formatRupiah(Number(item.nilai_pro))}</td>
                                   <td className="py-3 px-4 text-right font-mono font-bold text-amber-400">
                                     {formatRupiah(rap)}
                                     {(activeView === 'proyek_pengerjaan' || activeView === 'proyek_semua') && rawNilaiPro > 0 && noPo !== 'Menampung Biaya' && progressPercent < 100 && (
                                       <div className="text-[9px] text-slate-400 font-normal">
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
                                     className="py-3 px-4 text-right font-mono text-indigo-300 font-semibold hover:text-indigo-100 hover:bg-slate-800/40 cursor-pointer transition-all underline decoration-dotted decoration-indigo-400/40 select-none"
                                     title="Klik untuk melihat rincian biaya per kategori"
                                   >
                                     {formatRupiah(biaya)}
                                   </td>
                                   <td className={`py-3 px-4 text-right font-mono font-bold ${
                                     selisih >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                   }`}>
                                     {formatRupiah(selisih)}
                                   </td>
                                 </tr>
                               );
                             });
                           })()}
                           {/* Row Total Customer Details Table */}
                           <tr className="bg-slate-950 font-extrabold border-t-2 border-slate-800 text-white">
                             <td colSpan={(activeView === 'proyek_pengerjaan' || activeView === 'proyek_semua') ? 5 : 4} className="py-3 px-4 text-right font-sans text-xs tracking-wider">TOTAL DETIL:</td>
                             <td className="py-3 px-4 text-right font-mono text-xs text-slate-300 font-bold">
                               {formatRupiah(selectedCustomerProyeks.reduce((acc, item) => acc + Number(item.nilai_pro || 0), 0))}
                             </td>
                             <td className="py-3 px-4 text-right font-mono text-xs text-amber-400 font-bold">
                               {formatRupiah(selectedCustomerProyeks.reduce((acc, item) => {
                                 const isScaled = activeView === 'proyek_pengerjaan' || activeView === 'proyek_semua';
                                 return acc + getItemRapAndSelisih(item, isScaled).totalContributionRap;
                               }, 0))}
                             </td>
                             <td className="py-3 px-4 text-right font-mono text-xs text-indigo-300 font-bold">
                               {formatRupiah(selectedCustomerProyeks.reduce((acc, item) => {
                                 const isScaled = activeView === 'proyek_pengerjaan' || activeView === 'proyek_semua';
                                 return acc + getItemRapAndSelisih(item, isScaled).totalContributionBiaya;
                               }, 0))}
                             </td>
                             <td className={`py-3 px-4 text-right font-mono text-xs font-bold ${
                               selectedCustomerProyeks.reduce((acc, item) => {
                                 const isScaled = activeView === 'proyek_pengerjaan' || activeView === 'proyek_semua';
                                 return acc + getItemRapAndSelisih(item, isScaled).totalContributionSelisih;
                               }, 0) >= 0 
                                 ? 'text-emerald-400' 
                                 : 'text-rose-400'
                             }`}>
                               {formatRupiah(selectedCustomerProyeks.reduce((acc, item) => {
                                 const isScaled = activeView === 'proyek_pengerjaan' || activeView === 'proyek_semua';
                                 return acc + getItemRapAndSelisih(item, isScaled).totalContributionSelisih;
                               }, 0))}
                             </td>
                           </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Halaman Tampil Kategori Biaya */}
              {selectedCusCode !== 'Semua' && showCategoryPage && (
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
                      <span className={`px-2.5 py-1 text-[11px] font-mono rounded-full font-bold ${
                        categoryCostsMeta?.source === 'MySQL' 
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        Koneksi: {categoryCostsMeta?.source || 'Memuat...'}
                      </span>
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
                          {categoryCosts.map((item: any, idx: number) => {
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
                                <td className="py-1.5 px-4 text-right font-mono font-bold text-slate-100">
                                  <div>{formatRupiah(Number(item.TotKat || 0))}</div>
                                  <div className="text-[10px] text-slate-400 font-normal mt-0.5">{ratio}% dari total</div>
                                </td>
                              </tr>
                            );
                          })}
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

      {/* Database Connection Config Modal */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-scaleIn flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <Database className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base">Konfigurasi Database VPS</h3>
              </div>
              <button 
                onClick={() => setIsConfigModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveConfig} className="p-6 space-y-4 overflow-y-auto flex-1">
              <p className="text-xs text-slate-500 leading-relaxed">
                Masukkan detail koneksi database MySQL di VPS Anda. Konfigurasi ini akan disimpan secara otomatis ke berkas <code className="font-mono text-indigo-600 bg-indigo-50 px-1 rounded">.env</code> dan diaktifkan langsung secara real-time di server.
              </p>

              {/* Connected error indicator section */}
              {configError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-xs text-rose-800 animate-fadeIn">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="font-semibold text-[11px] uppercase tracking-wider text-rose-900">
                      Deteksi Kesalahan Koneksi:
                    </div>
                  </div>
                  <div className="pl-6 font-mono text-[10.5px] leading-relaxed break-all bg-white/80 p-2 rounded border border-rose-100 max-h-32 overflow-y-auto">
                    {configError}
                  </div>
                  {getLikelyErrorCause(configError) && (
                    <div className="pl-6 text-[11px] text-rose-700/95 leading-normal">
                      <strong className="text-rose-950 font-bold">Rekomendasi Solusi: </strong>
                      {getLikelyErrorCause(configError)?.message}
                    </div>
                  )}
                </div>
              )}

              {(() => {
                const cause = getLikelyErrorCause(configError || '');
                const errorField = cause ? cause.field : null;
                
                return (
                  <div className="space-y-3">
                    {/* Host */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex justify-between">
                        <span>Host / IP VPS</span>
                        {errorField === 'host' && <span className="text-rose-500 text-[10px] font-bold">Harap Periksa</span>}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: 103.14.22.88"
                        value={dbHost}
                        onChange={(e) => setDbHost(e.target.value)}
                        className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 font-semibold transition-colors ${
                          errorField === 'host' 
                            ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/30' 
                            : 'border-slate-200 focus:ring-indigo-500'
                        }`}
                      />
                    </div>

                    {/* Port */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex justify-between">
                        <span>Port</span>
                        {errorField === 'host' && <span className="text-rose-500 text-[10px] font-bold">Harap Periksa</span>}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Default: 3306"
                        value={dbPort}
                        onChange={(e) => setDbPort(e.target.value)}
                        className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 font-mono font-semibold transition-colors ${
                          errorField === 'host' 
                            ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/30' 
                            : 'border-slate-200 focus:ring-indigo-500'
                        }`}
                      />
                    </div>

                    {/* User */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex justify-between">
                        <span>User Database</span>
                        {errorField === 'auth' && <span className="text-rose-500 text-[10px] font-bold">Harap Periksa</span>}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: root atau admin_sales"
                        value={dbUser}
                        onChange={(e) => setDbUser(e.target.value)}
                        className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 font-semibold transition-colors ${
                          errorField === 'auth' 
                            ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/30' 
                            : 'border-slate-200 focus:ring-indigo-500'
                        }`}
                      />
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex justify-between">
                        <span>Password Database</span>
                        {errorField === 'auth' && <span className="text-rose-500 text-[10px] font-bold">Harap Periksa</span>}
                      </label>
                      <input
                        type="password"
                        placeholder="Password database Anda"
                        value={dbPassword}
                        onChange={(e) => setDbPassword(e.target.value)}
                        className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 font-semibold transition-colors ${
                          errorField === 'auth' 
                            ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/30' 
                            : 'border-slate-200 focus:ring-indigo-500'
                        }`}
                      />
                    </div>

                    {/* Database Name */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex justify-between">
                        <span>Nama Database</span>
                        {errorField === 'database' && <span className="text-rose-500 text-[10px] font-bold">Harap Periksa</span>}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: db_penjualan atau db_jpu"
                        value={dbName}
                        onChange={(e) => setDbName(e.target.value)}
                        className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 font-semibold transition-colors ${
                          errorField === 'database' 
                            ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/30' 
                            : 'border-slate-200 focus:ring-indigo-500'
                        }`}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={configSubmitting}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {configSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menguji & Menghubungkan...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Simpan & Hubungkan Database</span>
                    </>
                  )}
                </button>

                {dbStatus && dbStatus.activeDb !== 'Local JSON File' && (
                  <button
                    type="button"
                    onClick={handleResetConfig}
                    disabled={configSubmitting}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Kembalikan ke Sandbox JSON Lokal</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(false)}
                  disabled={configSubmitting}
                  className="w-full py-2 text-slate-400 hover:text-slate-600 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
