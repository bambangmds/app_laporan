import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables with override: true so .env takes precedence
const envPath = path.resolve(__dirname, '.env');
let envConfig: Record<string, string> = {};
if (fs.existsSync(envPath)) {
  try {
    envConfig = dotenv.parse(fs.readFileSync(envPath, 'utf-8'));
    for (const k in envConfig) {
      process.env[k] = envConfig[k];
    }
  } catch (e) {
    console.error('[Config] Error reading .env file:', e);
  }
}
dotenv.config({ path: envPath, override: true });

const app = express();
const port = process.env.PORT || 3000;

// Enable JSON middleware and CORS for all origins
app.use(cors());
app.use(express.json());

// Database configuration setup - Environment variables (Vercel) take priority over .env
const dbConfig = {
  host: process.env.DB_HOST || envConfig.DB_HOST || '103.56.205.57',
  user: process.env.DB_USER || envConfig.DB_USER || 'supervisor',
  password: process.env.DB_PASSWORD || envConfig.DB_PASSWORD || 'Super1291BB!@#',
  database: process.env.DB_NAME || envConfig.DB_NAME || 'db_jpu',
  port: parseInt(process.env.DB_PORT || envConfig.DB_PORT || '3306', 10),
};

// Check if MySQL should be enabled
const isMySqlConfigured = !!(dbConfig.host && dbConfig.user && dbConfig.database);
let mysqlPool: mysql.Pool | null = null;

if (isMySqlConfigured) {
  try {
    console.log(`[Database] Initializing MySQL pool: ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
    mysqlPool = mysql.createPool({
      ...dbConfig,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 8000,
    });
  } catch (error: any) {
    console.log('[Database] Info: Failed to create MySQL pool setup:', error.message);
  }
} else {
  console.log('[Database] MySQL environment variables not configured. Falling back to JSON local file storage.');
}

// JSON file storage fallback configuration
const jsonDirectory = path.join(__dirname, 'data');

// Helper to dynamically get table columns
async function getTableColumns(tableName: string): Promise<string[]> {
  if (!mysqlPool) return [];
  try {
    const [rows]: any = await mysqlPool.query(`SHOW COLUMNS FROM ??`, [tableName]);
    return rows.map((row: any) => row.Field);
  } catch (err) {
    console.log(`[Database] Error showing columns for ${tableName}:`, err);
    return [];
  }
}

// Helper to get case-insensitive column name
function getColName(cols: string[], target: string): string {
  const found = cols.find(c => c.toLowerCase() === target.toLowerCase());
  return found || target;
}

// ------------------- API ROUTES -------------------

// GET list of users for dropdown combo box (SDM.User_JPU)
app.get('/api/users', async (req, res) => {
  if (mysqlPool) {
    try {
      let queryStr = `SELECT User_ID, User_Name FROM SDM.User_JPU ORDER BY User_ID;`;
      try {
        const [rows]: any = await mysqlPool.query(queryStr);
        res.json({ data: rows, source: 'MySQL (SDM.User_JPU)' });
        return;
      } catch (err1) {
        queryStr = `SELECT User_ID, User_Name FROM User_JPU ORDER BY User_ID;`;
        const [rows]: any = await mysqlPool.query(queryStr);
        res.json({ data: rows, source: 'MySQL (User_JPU)' });
        return;
      }
    } catch (err: any) {
      console.log('[Database] Error in /api/users query:', err.message);
    }
  }

  // JSON Fallback
  try {
    const userPath = path.join(__dirname, 'data', 'user_jpu.json');
    if (!fs.existsSync(userPath)) {
      res.status(404).json({ error: 'Data user tidak ditemukan.' });
      return;
    }
    const users = JSON.parse(fs.readFileSync(userPath, 'utf-8'));
    const userList = users.map((u: any) => ({
      User_ID: u.User_ID,
      User_Name: u.User_Name
    }));
    res.json({ data: userList, source: 'Local JSON File' });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal memuat daftar user: ' + err.message });
  }
});

// POST login endpoint (Verify User_Psw against User_JPU)
app.post('/api/login', async (req, res) => {
  const { user_id, password } = req.body;
  if (!user_id || password === undefined || password === null) {
    res.status(400).json({ success: false, message: 'User_ID dan Password harus diisi!' });
    return;
  }

  const cleanUserId = String(user_id).trim();
  const cleanPsw = String(password).trim();

  if (mysqlPool) {
    try {
      let rows: any = [];
      try {
        const [r]: any = await mysqlPool.query(
          `SELECT User_ID, User_Name, User_Psw FROM SDM.User_JPU WHERE UPPER(TRIM(User_ID)) = UPPER(?)`,
          [cleanUserId]
        );
        rows = r;
      } catch (e1) {
        const [r]: any = await mysqlPool.query(
          `SELECT User_ID, User_Name, User_Psw FROM User_JPU WHERE UPPER(TRIM(User_ID)) = UPPER(?)`,
          [cleanUserId]
        );
        rows = r;
      }

      if (rows && rows.length > 0) {
        const found = rows[0];
        const dbPsw = String(found.User_Psw || '').trim();
        if (dbPsw === cleanPsw) {
          res.json({
            success: true,
            user: {
              User_ID: String(found.User_ID).trim(),
              User_Name: String(found.User_Name).trim()
            }
          });
          return;
        } else {
          res.status(401).json({ success: false, message: 'Password yang Anda masukkan salah.' });
          return;
        }
      }
    } catch (err: any) {
      console.log('[Database] Login MySQL error fallback to JSON:', err.message);
    }
  }

  // JSON Fallback
  try {
    const userPath = path.join(__dirname, 'data', 'user_jpu.json');
    if (!fs.existsSync(userPath)) {
      res.status(404).json({ success: false, message: 'Data user tidak ditemukan.' });
      return;
    }
    const users = JSON.parse(fs.readFileSync(userPath, 'utf-8'));
    const matched = users.find(
      (u: any) => String(u.User_ID || '').trim().toUpperCase() === cleanUserId.toUpperCase()
    );

    if (matched) {
      const storedPsw = String(matched.User_Psw || '').trim();
      if (storedPsw === cleanPsw) {
        res.json({
          success: true,
          user: {
            User_ID: String(matched.User_ID).trim(),
            User_Name: String(matched.User_Name).trim()
          }
        });
        return;
      } else {
        res.status(401).json({ success: false, message: 'Password yang Anda masukkan salah.' });
        return;
      }
    } else {
      res.status(404).json({ success: false, message: 'User_ID tidak ditemukan.' });
      return;
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal memproses login: ' + err.message });
  }
});

// GET DB Status Endpoint
app.get('/api/db-status', async (req, res) => {
  if (mysqlPool) {
    try {
      // Test connectivity
      const conn = await mysqlPool.getConnection();
      conn.release();
      res.json({
        activeDb: 'MySQL',
        status: 'Connected',
        host: dbConfig.host,
        database: dbConfig.database,
        user: dbConfig.user,
      });
      return;
    } catch (err: any) {
      res.json({
        activeDb: 'Local JSON File (Fallback)',
        status: 'MySQL Configured but Offline',
        error: err.message,
        host: dbConfig.host,
        database: dbConfig.database,
        user: dbConfig.user,
        filePath: jsonDirectory,
      });
      return;
    }
  }

  res.json({
    activeDb: 'Local JSON File',
    status: 'Sandbox Active',
    filePath: jsonDirectory,
  });
});

// POST DB Config Endpoint to dynamically update MySQL details and write to .env
app.post('/api/db-config', async (req, res) => {
  const { host, port, user, password, database } = req.body;
  if (!host || !user || !database) {
    res.status(400).json({ error: 'Host, user, dan database harus diisi.' });
    return;
  }

  try {
    const parsedPort = parseInt(port || '3306', 10);
    const envContent = `# Dibuat otomatis oleh SalesFlow UI
PORT=${process.env.PORT || 3000}
DB_HOST="${host}"
DB_PORT=${parsedPort}
DB_USER="${user}"
DB_PASSWORD="${(password || '').replace(/"/g, '\\"')}"
DB_NAME="${database}"
`;
    fs.writeFileSync(path.resolve(__dirname, '.env'), envContent, 'utf-8');
    
    // Reload env variables in active node process
    dotenv.config({ path: path.resolve(__dirname, '.env'), override: true });
    
    // Update active memory config
    dbConfig.host = host;
    dbConfig.port = parsedPort;
    dbConfig.user = user;
    dbConfig.password = password || '';
    dbConfig.database = database;
    
    // Terminate old pool
    if (mysqlPool) {
      try {
        await mysqlPool.end();
      } catch (e) {
        console.log('[Database] Error closing old pool:', e);
      }
    }
    
    // Create new pool
    mysqlPool = mysql.createPool({
      ...dbConfig,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 10000,
    });
    
    // Test connection probe
    try {
      const conn = await mysqlPool.getConnection();
      conn.release();
      res.json({
        success: true,
        message: 'Koneksi database ke VPS berhasil dikonfigurasi dan diuji terhubung!',
        dbStatus: {
          activeDb: 'MySQL',
          status: 'Connected',
          host: dbConfig.host,
          database: dbConfig.database,
          user: dbConfig.user
        }
      });
    } catch (probeErr: any) {
      res.json({
        success: false,
        message: `Koneksi gagal: ${probeErr.message}. Namun konfigurasi berhasil disimpan ke .env.`,
        dbStatus: {
          activeDb: 'Local JSON File (Fallback)',
          status: 'MySQL Configured but Offline',
          error: probeErr.message,
          host: dbConfig.host,
          database: dbConfig.database,
          user: dbConfig.user
        }
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal menulis konfigurasi database: ' + err.message });
  }
});

// POST Reset DB Config Endpoint
app.post('/api/db-config/reset', async (req, res) => {
  try {
    const envPath = path.resolve(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      fs.unlinkSync(envPath);
    }
    
    // Reset runtime dbConfig
    dbConfig.host = '';
    dbConfig.port = 3306;
    dbConfig.user = '';
    dbConfig.password = '';
    dbConfig.database = '';
    
    if (mysqlPool) {
      try {
        await mysqlPool.end();
      } catch (e) {}
      mysqlPool = null;
    }
    
    res.json({
      success: true,
      message: 'Konfigurasi database berhasil di-reset kembali ke Sandbox JSON Lokal.',
      dbStatus: {
        activeDb: 'Local JSON File',
        status: 'Sandbox Active'
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal mereset konfigurasi: ' + err.message });
  }
});

// GET Laporan Penjualan Per Customer (Custom SQL Query)
app.get('/api/laporan/penjualan-customer', async (req, res) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  
  const defaultToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const defaultStart = `${now.getFullYear()}-01-01`;

  // Read start and end parameters from client browser system computer time
  const startOfYearStr = (req.query.start as string) || defaultStart;
  const todayStr = (req.query.end as string) || defaultToday;

  // Extract selected year from the client parameter
  const selectedYear = parseInt(startOfYearStr.split('-')[0]) || currentYear;

  // Build the dynamic SQL query clauses using client-side dates to prevent timezone mismatches
  const sqlStartDate = `'${startOfYearStr}'`;
  const sqlEndDate = `'${todayStr}'`;

  let queryStr = `
    SELECT 
        a.Cus_Code, 
        b.Cus_Name, 
        SUM(a.Nilai_Pro * 97.35/100) AS totpro 
    FROM proyek AS a
    INNER JOIN mas_customer AS b 
        ON a.Cus_Code = b.Cus_Code 
    WHERE a.Tgl_Proyek BETWEEN ${sqlStartDate} AND ${sqlEndDate}
      AND b.PKP = 'Y'
    GROUP BY a.Cus_Code, b.Cus_Name 
    ORDER BY b.Cus_Name;
  `;

  if (mysqlPool) {
    try {
      const proyekCols = await getTableColumns('proyek');
      const custCols = await getTableColumns('mas_customer');

      const pCusCode = getColName(proyekCols, 'Cus_Code');
      const pTglProyek = getColName(proyekCols, 'Tgl_Proyek');
      const pNilaiPro = getColName(proyekCols, 'Nilai_Pro');
      
      const cCusCode = getColName(custCols, 'Cus_Code');
      const cCusName = getColName(custCols, 'Cus_Name');
      const cPkp = getColName(custCols, 'PKP');

      queryStr = `
        SELECT 
            a.${pCusCode} AS Cus_Code, 
            b.${cCusName} AS Cus_Name, 
            SUM(a.${pNilaiPro} * 97.35/100) AS totpro 
        FROM proyek AS a
        INNER JOIN mas_customer AS b 
            ON a.${pCusCode} = b.${cCusCode} 
        WHERE a.${pTglProyek} BETWEEN ${sqlStartDate} AND ${sqlEndDate}
          AND b.${cPkp} = 'Y'
        GROUP BY a.${pCusCode}, b.${cCusName} 
        ORDER BY b.${cCusName};
      `;

      const [rows] = await mysqlPool.query(queryStr);
      res.json({
        data: rows,
        source: 'MySQL',
        queryExecuted: queryStr.trim()
      });
      return;
    } catch (err: any) {
      console.log('[Database] Status: fallback mode active (using local customers storage). Error:', err.message);
    }
  }

  // Simulation fallback using local files
  try {
    const customerPath = path.join(__dirname, 'data', 'mas_customer.json');
    const proyekPath = path.join(__dirname, 'data', 'proyek.json');

    if (!fs.existsSync(customerPath) || !fs.existsSync(proyekPath)) {
      res.status(404).json({ error: 'Berkas data laporan proyek tidak ditemukan.' });
      return;
    }

    const customers = JSON.parse(fs.readFileSync(customerPath, 'utf-8'));
    const proyeks = JSON.parse(fs.readFileSync(proyekPath, 'utf-8'));

    // Perform INNER JOIN and calculate SUM(Nilai_Pro * 97.35 / 100)
    const filteredProyeks = proyeks.filter((p: any) =>
      p.Tgl_Proyek >= startOfYearStr &&
      p.Tgl_Proyek <= todayStr
    );

    const groupedData: { [key: string]: { Cus_Code: string; Cus_Name: string; totpro: number } } = {};

    for (const p of filteredProyeks) {
      const c = customers.find((cust: any) => cust.Cus_Code === p.Cus_Code && cust.PKP === 'Y');
      if (c) {
        if (!groupedData[c.Cus_Code]) {
          groupedData[c.Cus_Code] = {
            Cus_Code: c.Cus_Code,
            Cus_Name: c.Cus_Name,
            totpro: 0
          };
        }
        groupedData[c.Cus_Code].totpro += (Number(p.Nilai_Pro) * 97.35) / 100;
      }
    }

    const results = Object.values(groupedData)
      .sort((a: any, b: any) => a.Cus_Name.localeCompare(b.Cus_Name));

    res.json({
      data: results,
      source: 'Local JSON File (Simulated SQL)',
      queryExecuted: queryStr.trim()
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal menjalankan simulasi query laporan: ' + err.message });
  }
});

// Helper function for Fallback Overhead JSON simulation
function getFallbackOverheadData(startStr: string, endStr: string, queryTargetStr: string, queryItemsStr: string) {
  let proyekList: any[] = [];
  let custMap = new Set<string>();
  let kmList: any[] = [];
  let kdList: any[] = [];
  let jpuList: any[] = [];

  const proyekPath = path.join(jsonDirectory, 'proyek.json');
  if (fs.existsSync(proyekPath)) {
    proyekList = JSON.parse(fs.readFileSync(proyekPath, 'utf8'));
  }

  const custPath = path.join(jsonDirectory, 'mas_customer.json');
  if (fs.existsSync(custPath)) {
    const custs = JSON.parse(fs.readFileSync(custPath, 'utf8'));
    for (const c of custs) {
      if ((c.PKP || c.pkp || '').toString().toUpperCase() === 'Y') {
        custMap.add((c.Cus_Code || c.cus_code || '').toString().toUpperCase());
      }
    }
  }

  const kmPath = path.join(jsonDirectory, 'kaskeluar_mas.json');
  if (fs.existsSync(kmPath)) {
    kmList = JSON.parse(fs.readFileSync(kmPath, 'utf8'));
  }

  const kdPath = path.join(jsonDirectory, 'kaskeluar_det.json');
  if (fs.existsSync(kdPath)) {
    kdList = JSON.parse(fs.readFileSync(kdPath, 'utf8'));
  }

  const jpuPath = path.join(jsonDirectory, 'amf_jpu.json');
  if (fs.existsSync(jpuPath)) {
    jpuList = JSON.parse(fs.readFileSync(jpuPath, 'utf8'));
  }

  // Calculate Proyek Target: 25% * (SUM(a.Nilai_Pro * 97.35/100)) untuk Customer PKP='Y'
  let totalNilaiProRaw = 0;
  for (const p of proyekList) {
    const tgl = p.Tgl_Proyek || p.tgl_proyek || '';
    const cusCode = (p.Cus_Code || p.cus_code || '').toString().toUpperCase();
    if (tgl >= startStr && tgl <= endStr && custMap.has(cusCode)) {
      totalNilaiProRaw += Number(p.Nilai_Pro || p.nilai_pro || 0);
    }
  }
  const totalNilaiProNet = (totalNilaiProRaw * 97.35) / 100;
  const targetOverhead25 = totalNilaiProNet * 0.25;

  // Filter KasKeluar_Mas for Divisi 'Off' & 'Wks'
  const validVouchers = new Set<string>();
  for (const km of kmList) {
    const divisi = (km.Divisi || km.divisi || '').toString().toUpperCase();
    const tgl = km.Tgl_Voucher || km.tgl_voucher || '';
    if ((divisi === 'OFF' || divisi === 'WKS') && tgl >= startStr && tgl <= endStr) {
      validVouchers.add(km.No_Voucher || km.no_voucher);
    }
  }

  // Group KasKeluar_Det by Acc_ID & AMF_Jpu Acc_Name
  const jpuMap = new Map<string, string>();
  for (const j of jpuList) {
    jpuMap.set((j.Acc_ID || j.acc_id || '').toString(), j.Acc_Name || j.acc_name || 'Akun Tidak Dikenal');
  }

  const itemsMap = new Map<string, { Acc_ID: string; Acc_Name: string; Total_Jumlah: number; Total_Voucher: number; vouchers: Set<string> }>();

  for (const kd of kdList) {
    const vNo = kd.No_Voucher || kd.no_voucher;
    if (validVouchers.has(vNo)) {
      const accId = (kd.Acc_ID || kd.acc_id || '9999').toString();
      const jumlah = Number(kd.Jumlah || kd.jumlah || 0);
      const accName = jpuMap.get(accId) || `Akun Biaya [${accId}]`;

      if (!itemsMap.has(accId)) {
        itemsMap.set(accId, {
          Acc_ID: accId,
          Acc_Name: accName,
          Total_Jumlah: 0,
          Total_Voucher: 0,
          vouchers: new Set()
        });
      }
      const entry = itemsMap.get(accId)!;
      entry.Total_Jumlah += jumlah;
      entry.vouchers.add(vNo);
    }
  }

  const items = Array.from(itemsMap.values()).map(item => ({
    Acc_ID: item.Acc_ID,
    Acc_Name: item.Acc_Name,
    Total_Jumlah: item.Total_Jumlah,
    Total_Voucher: item.vouchers.size
  })).sort((a, b) => b.Total_Jumlah - a.Total_Jumlah);

  return {
    summary: {
      totalNilaiProRaw,
      totalNilaiProNet,
      targetOverhead25,
      overheadPercent: 25
    },
    items,
    source: 'Local JSON File (Simulated SQL)',
    queryExecuted: `${queryTargetStr}\n\n${queryItemsStr}`
  };
}

// Helper function for Fallback Overhead Voucher Details JSON simulation
function getFallbackOverheadVouchers(startStr: string, endStr: string, accId?: string) {
  let kmList: any[] = [];
  let kdList: any[] = [];
  let jpuList: any[] = [];

  const kmPath = path.join(jsonDirectory, 'kaskeluar_mas.json');
  if (fs.existsSync(kmPath)) {
    kmList = JSON.parse(fs.readFileSync(kmPath, 'utf8'));
  }

  const kdPath = path.join(jsonDirectory, 'kaskeluar_det.json');
  if (fs.existsSync(kdPath)) {
    kdList = JSON.parse(fs.readFileSync(kdPath, 'utf8'));
  }

  const jpuPath = path.join(jsonDirectory, 'amf_jpu.json');
  if (fs.existsSync(jpuPath)) {
    jpuList = JSON.parse(fs.readFileSync(jpuPath, 'utf8'));
  }

  const kmMap = new Map<string, { No_Voucher: string; Tgl_Voucher: string; Divisi: string }>();
  for (const km of kmList) {
    const divisi = (km.Divisi || km.divisi || '').toString().toUpperCase();
    const tgl = km.Tgl_Voucher || km.tgl_voucher || '';
    if ((divisi === 'OFF' || divisi === 'WKS') && tgl >= startStr && tgl <= endStr) {
      const vNo = (km.No_Voucher || km.no_voucher || '').toString();
      kmMap.set(vNo, {
        No_Voucher: vNo,
        Tgl_Voucher: tgl,
        Divisi: km.Divisi || km.divisi || ''
      });
    }
  }

  const jpuMap = new Map<string, string>();
  for (const j of jpuList) {
    jpuMap.set((j.Acc_ID || j.acc_id || '').toString(), j.Acc_Name || j.acc_name || 'Akun Tidak Dikenal');
  }

  const vouchers: any[] = [];
  for (const kd of kdList) {
    const vNo = (kd.No_Voucher || kd.no_voucher || '').toString();
    const kmInfo = kmMap.get(vNo);
    if (kmInfo) {
      const kdAccId = (kd.Acc_ID || kd.acc_id || '').toString();
      if (!accId || kdAccId === accId) {
        vouchers.push({
          No_Voucher: kmInfo.No_Voucher,
          Tgl_Voucher: kmInfo.Tgl_Voucher,
          Divisi: kmInfo.Divisi,
          Acc_ID: kdAccId,
          Acc_Name: jpuMap.get(kdAccId) || `Akun Biaya [${kdAccId}]`,
          Ket_Detail: kd.Ket_Detail || kd.ket_detail || '-',
          Jumlah: Number(kd.Jumlah || kd.jumlah || 0)
        });
      }
    }
  }

  vouchers.sort((a, b) => b.Tgl_Voucher.localeCompare(a.Tgl_Voucher) || b.No_Voucher.localeCompare(a.No_Voucher));
  return vouchers;
}

// GET Laporan Perhitungan RAP (Rencana Anggaran Pelaksanaan)
app.get('/api/laporan/rap', async (req, res) => {
  const year = parseInt(req.query.year as string) || new Date().getFullYear();
  const startOfYearStr = (req.query.start as string) || `${year}-01-01`;
  const endOfYearStr = (req.query.end as string) || `${year}-12-31`;
  const cusCode = ((req.query.cus_code as string) || '').trim();

  let queryStr = `
    SELECT 
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
    WHERE a.Tgl_Proyek BETWEEN '${startOfYearStr}' AND '${endOfYearStr}'
      AND b.PKP = 'Y'
      ${cusCode && cusCode !== 'Semua' ? `AND a.Cus_Code = '${cusCode}'` : ''}
    GROUP BY a.Cus_Code, b.Cus_Name 
    ORDER BY b.Cus_Name;
  `;

  if (mysqlPool) {
    try {
      const proyekCols = await getTableColumns('proyek');
      const custCols = await getTableColumns('mas_customer');

      const pCusCode = getColName(proyekCols, 'Cus_Code');
      const pTglProyek = getColName(proyekCols, 'Tgl_Proyek');
      const pNilaiPro = getColName(proyekCols, 'Nilai_PRO');
      const pNoPo = getColName(proyekCols, 'No_PO');
      const pProgress = getColName(proyekCols, 'Persen_Progress');
      const pBia = proyekCols.some(c => c.toLowerCase() === 'bia_kom') ? getColName(proyekCols, 'bia_kom') : 'Bia_Kom';

      const cCusCode = getColName(custCols, 'Cus_Code');
      const cCusName = getColName(custCols, 'Cus_Name');
      const cPkp = getColName(custCols, 'PKP');

      let whereCond = `WHERE a.${pTglProyek} BETWEEN '${startOfYearStr}' AND '${endOfYearStr}' AND b.${cPkp} = 'Y'`;

      if (cusCode && cusCode !== 'Semua') {
        whereCond += ` AND a.${pCusCode} = '${cusCode}'`;
      }

      queryStr = `
        SELECT 
            a.${pCusCode} AS Cus_Code, 
            b.${cCusName} AS Cus_Name, 
            SUM(ROUND(a.${pNilaiPro} * 0.9735)) AS totpro,
            SUM(CASE 
                WHEN a.${pNoPo} = 'Menampung Biaya' THEN 0
                WHEN COALESCE(a.${pNilaiPro}, 0) = 0 THEN 0 
                ELSE ROUND(ROUND(ROUND(a.${pNilaiPro} * 0.9735) * 0.75) * ((COALESCE(a.${pProgress}, 0)) / 100))
            END) AS Nilai_RAP,
            SUM(CASE 
                WHEN a.${pNoPo} = 'Menampung Biaya' THEN COALESCE(a.${pBia}, 0)
                WHEN COALESCE(a.${pNilaiPro}, 0) = 0 THEN 0
                ELSE COALESCE(a.${pBia}, 0)
            END) AS Total_Biaya,
            SUM(CASE
                WHEN a.${pNoPo} = 'Menampung Biaya' THEN (0 - COALESCE(a.${pBia}, 0))
                WHEN COALESCE(a.${pNilaiPro}, 0) = 0 THEN 0
                ELSE (ROUND(ROUND(ROUND(a.${pNilaiPro} * 0.9735) * 0.75) * ((COALESCE(a.${pProgress}, 0)) / 100)) - COALESCE(a.${pBia}, 0))
            END) AS Selisih
        FROM proyek AS a
        INNER JOIN mas_customer AS b 
            ON a.${pCusCode} = b.${cCusCode} 
        ${whereCond}
        GROUP BY a.${pCusCode}, b.${cCusName} 
        ORDER BY b.${cCusName};
      `;

      const [rows]: any = await mysqlPool.query(queryStr);
      res.json({
        data: rows,
        source: 'MySQL',
        queryExecuted: queryStr.trim()
      });
      return;
    } catch (err: any) {
      console.log('[Database] Error in rap query:', err.message);
    }
  }

  // Simulation Fallback
  try {
    const customerPath = path.join(jsonDirectory, 'mas_customer.json');
    const proyekPath = path.join(jsonDirectory, 'proyek.json');

    if (!fs.existsSync(customerPath) || !fs.existsSync(proyekPath)) {
      res.status(404).json({ error: 'Berkas data laporan proyek tidak ditemukan.' });
      return;
    }

    const customers = JSON.parse(fs.readFileSync(customerPath, 'utf-8'));
    const proyeks = JSON.parse(fs.readFileSync(proyekPath, 'utf-8'));

    const groupedMap: { [key: string]: { Cus_Code: string; Cus_Name: string; totpro: number; Nilai_RAP: number; Total_Biaya: number; Selisih: number } } = {};

    for (const p of proyeks) {
      const pDate = p.tgl_proyek || p.Tgl_Proyek;
      const cCode = p.cus_code || p.Cus_Code;

      if (pDate >= startOfYearStr && pDate <= endOfYearStr) {
        if (cusCode && cusCode !== 'Semua' && cCode !== cusCode) continue;

        const cust = customers.find((c: any) => c.Cus_Code === cCode && c.PKP === 'Y');
        if (cust) {
          if (!groupedMap[cCode]) {
            groupedMap[cCode] = {
              Cus_Code: cCode,
              Cus_Name: cust.Cus_Name,
              totpro: 0,
              Nilai_RAP: 0,
              Total_Biaya: 0,
              Selisih: 0
            };
          }

          const noPo = p.no_po || p.No_PO || '';
          const rawNilai = Number(p.nilai_pro || p.Nilai_Pro || p.Nilai_PRO || 0);
          const persenProg = Number(p.persen_progress || p.Persen_Progress || 100);
          const biayaVal = Number(p.bia_kom || p.Bia_Kom || 0);

          const totproItem = Math.round(rawNilai * 0.9735);

          let rapItem = 0;
          let effectiveBiaya = 0;
          let selisihItem = 0;

          if (noPo === 'Menampung Biaya') {
            rapItem = 0;
            effectiveBiaya = biayaVal;
            selisihItem = 0 - biayaVal;
          } else if (rawNilai === 0) {
            rapItem = 0;
            effectiveBiaya = 0;
            selisihItem = 0;
          } else {
            rapItem = Math.round(Math.round(totproItem * 0.75) * (persenProg / 100));
            effectiveBiaya = biayaVal;
            selisihItem = rapItem - biayaVal;
          }

          groupedMap[cCode].totpro += totproItem;
          groupedMap[cCode].Nilai_RAP += rapItem;
          groupedMap[cCode].Total_Biaya += effectiveBiaya;
          groupedMap[cCode].Selisih += selisihItem;
        }
      }
    }

    const results = Object.values(groupedMap).sort((a, b) => a.Cus_Name.localeCompare(b.Cus_Name));

    res.json({
      data: results,
      source: 'Local JSON File (Simulated SQL)',
      queryExecuted: queryStr.trim()
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal menjalankan simulasi query RAP: ' + err.message });
  }
});

// GET Laporan Perhitungan Overhead
app.get('/api/laporan/overhead', async (req, res) => {
  const year = parseInt(req.query.year as string) || new Date().getFullYear();
  const startOfYearStr = (req.query.start as string) || `${year}-01-01`;
  const endOfYearStr = (req.query.end as string) || `${year}-12-31`;

  let queryTarget = `
    SELECT 
        SUM(a.Nilai_Pro) AS Total_Nilai_Pro_Raw,
        SUM(a.Nilai_Pro * 97.35/100) AS Total_Nilai_Pro_Net,
        SUM(a.Nilai_Pro * 97.35/100) * 0.25 AS Target_Overhead_25
    FROM proyek AS a
    INNER JOIN mas_customer AS b 
        ON a.Cus_Code = b.Cus_Code
    WHERE a.Tgl_Proyek BETWEEN '${startOfYearStr}' AND '${endOfYearStr}'
      AND b.PKP = 'Y';
  `;

  let queryItems = `
    SELECT 
        kd.Acc_ID,
        j.Acc_Name,
        SUM(kd.Jumlah) AS Total_Jumlah,
        COUNT(DISTINCT km.No_Voucher) AS Total_Voucher
    FROM kaskeluar_mas AS km
    INNER JOIN kaskeluar_det AS kd 
        ON km.No_Voucher = kd.No_Voucher
    INNER JOIN amf_jpu AS j 
        ON kd.Acc_ID = j.Acc_ID
    WHERE (km.Divisi = 'Off' OR km.Divisi = 'Wks')
      AND km.Tgl_Voucher BETWEEN '${startOfYearStr}' AND '${endOfYearStr}'
    GROUP BY kd.Acc_ID, j.Acc_Name
    ORDER BY Total_Jumlah DESC;
  `;

  if (mysqlPool) {
    try {
      const tables: any = await mysqlPool.query(`SHOW TABLES`);
      const tableList: string[] = tables[0].map((r: any) => Object.values(r)[0] as string);

      const proyekTable = tableList.find(t => t.toLowerCase() === 'proyek') || 'proyek';
      const custTable = tableList.find(t => t.toLowerCase() === 'mas_customer') || 'mas_customer';
      const kmTable = tableList.find(t => t.toLowerCase() === 'kaskeluar_mas') || 'KasKeluar_Mas';
      const kdTable = tableList.find(t => t.toLowerCase() === 'kaskeluar_det') || 'KasKeluar_Det';
      const jpuTable = tableList.find(t => t.toLowerCase() === 'amf_jpu') || 'AMF_Jpu';

      const proyekCols = await getTableColumns(proyekTable);
      const custCols = await getTableColumns(custTable);
      const kmCols = await getTableColumns(kmTable);
      const kdCols = await getTableColumns(kdTable);
      const jpuCols = await getTableColumns(jpuTable);

      const pCusCode = getColName(proyekCols, 'Cus_Code');
      const pTglProyek = getColName(proyekCols, 'Tgl_Proyek');
      const pNilaiPro = getColName(proyekCols, 'Nilai_Pro');

      const cCusCode = getColName(custCols, 'Cus_Code');
      const cPkp = getColName(custCols, 'PKP');

      const kmNoVoucher = getColName(kmCols, 'No_Voucher');
      const kmTglVoucher = getColName(kmCols, 'Tgl_Voucher');
      const kmDivisi = getColName(kmCols, 'Divisi');

      const kdNoVoucher = getColName(kdCols, 'No_Voucher');
      const kdAccId = getColName(kdCols, 'Acc_ID');
      const kdJumlah = getColName(kdCols, 'Jumlah');

      const jpuAccId = getColName(jpuCols, 'Acc_ID');
      const jpuAccName = getColName(jpuCols, 'Acc_Name');

      queryTarget = `
        SELECT 
            SUM(a.${pNilaiPro}) AS Total_Nilai_Pro_Raw,
            SUM(a.${pNilaiPro} * 97.35/100) AS Total_Nilai_Pro_Net,
            SUM(a.${pNilaiPro} * 97.35/100) * 0.25 AS Target_Overhead_25
        FROM ${proyekTable} AS a
        INNER JOIN ${custTable} AS b 
            ON a.${pCusCode} = b.${cCusCode}
        WHERE a.${pTglProyek} BETWEEN '${startOfYearStr}' AND '${endOfYearStr}'
          AND b.${cPkp} = 'Y';
      `;

      queryItems = `
        SELECT 
            kd.${kdAccId} AS Acc_ID,
            j.${jpuAccName} AS Acc_Name,
            SUM(kd.${kdJumlah}) AS Total_Jumlah,
            COUNT(DISTINCT km.${kmNoVoucher}) AS Total_Voucher
        FROM ${kmTable} AS km
        INNER JOIN ${kdTable} AS kd 
            ON km.${kmNoVoucher} = kd.${kdNoVoucher}
        INNER JOIN ${jpuTable} AS j 
            ON kd.${kdAccId} = j.${jpuAccId}
        WHERE (UPPER(km.${kmDivisi}) = 'OFF' OR UPPER(km.${kmDivisi}) = 'WKS')
          AND km.${kmTglVoucher} BETWEEN '${startOfYearStr}' AND '${endOfYearStr}'
        GROUP BY kd.${kdAccId}, j.${jpuAccName}
        ORDER BY Total_Jumlah DESC;
      `;

      const [targetRows]: any = await mysqlPool.query(queryTarget);
      const [itemsRows]: any = await mysqlPool.query(queryItems);

      const targetData = targetRows[0] || {};
      const totalNilaiProRaw = Number(targetData.Total_Nilai_Pro_Raw) || 0;
      const totalNilaiProNet = Number(targetData.Total_Nilai_Pro_Net) || ((totalNilaiProRaw * 97.35) / 100);
      const targetOverhead25 = Number(targetData.Target_Overhead_25) || (totalNilaiProNet * 0.25);

      res.json({
        summary: {
          totalNilaiProRaw,
          totalNilaiProNet,
          targetOverhead25,
          overheadPercent: 25
        },
        items: itemsRows,
        source: 'MySQL',
        queryExecuted: `${queryTarget}\n\n${queryItems}`
      });
    } catch (err: any) {
      console.error('[MySQL Overhead Error]', err);
      res.json(getFallbackOverheadData(startOfYearStr, endOfYearStr, queryTarget, queryItems));
    }
  } else {
    res.json(getFallbackOverheadData(startOfYearStr, endOfYearStr, queryTarget, queryItems));
  }
});

// GET Voucher Details per No Voucher / Acc_ID
app.get('/api/laporan/overhead/vouchers', async (req, res) => {
  const year = parseInt(req.query.year as string) || new Date().getFullYear();
  const startOfYearStr = (req.query.start as string) || `${year}-01-01`;
  const endOfYearStr = (req.query.end as string) || `${year}-12-31`;
  const accId = ((req.query.accId as string) || '').trim();

  let queryVouchers = `
    SELECT 
        km.No_Voucher,
        km.Tgl_Voucher,
        km.Divisi,
        kd.Acc_ID,
        j.Acc_Name,
        kd.Ket_Detail,
        kd.Jumlah
    FROM KasKeluar_Mas AS km
    INNER JOIN KasKeluar_Det AS kd 
        ON km.No_Voucher = kd.No_Voucher
    INNER JOIN AMF_Jpu AS j 
        ON kd.Acc_ID = j.Acc_ID
    WHERE (km.Divisi = 'Off' OR km.Divisi = 'Wks')
      AND km.Tgl_Voucher BETWEEN '${startOfYearStr}' AND '${endOfYearStr}'
      ${accId ? `AND kd.Acc_ID = '${accId}'` : ''}
    ORDER BY km.Tgl_Voucher DESC, km.No_Voucher DESC;
  `;

  if (mysqlPool) {
    try {
      const kmTable = 'KasKeluar_Mas';
      const kdTable = 'KasKeluar_Det';
      const jpuTable = 'AMF_Jpu';

      const kmCols = await getTableColumns(kmTable);
      const kdCols = await getTableColumns(kdTable);
      const jpuCols = await getTableColumns(jpuTable);

      const kmNoVoucher = getColName(kmCols, 'No_Voucher');
      const kmTglVoucher = getColName(kmCols, 'Tgl_Voucher');
      const kmDivisi = getColName(kmCols, 'Divisi');

      const kdNoVoucher = getColName(kdCols, 'No_Voucher');
      const kdAccId = getColName(kdCols, 'Acc_ID');
      const kdJumlah = getColName(kdCols, 'Jumlah');
      const kdKetDetail = getColName(kdCols, 'Ket_Detail');

      const jpuAccId = getColName(jpuCols, 'Acc_ID');
      const jpuAccName = getColName(jpuCols, 'Acc_Name');

      let whereClause = `WHERE (UPPER(km.${kmDivisi}) = 'OFF' OR UPPER(km.${kmDivisi}) = 'WKS') AND km.${kmTglVoucher} BETWEEN '${startOfYearStr}' AND '${endOfYearStr}'`;
      if (accId) {
        whereClause += ` AND kd.${kdAccId} = '${accId}'`;
      }

      queryVouchers = `
        SELECT 
            km.${kmNoVoucher} AS No_Voucher,
            km.${kmTglVoucher} AS Tgl_Voucher,
            km.${kmDivisi} AS Divisi,
            kd.${kdAccId} AS Acc_ID,
            j.${jpuAccName} AS Acc_Name,
            kd.${kdKetDetail} AS Ket_Detail,
            kd.${kdJumlah} AS Jumlah
        FROM ${kmTable} AS km
        INNER JOIN ${kdTable} AS kd 
            ON km.${kmNoVoucher} = kd.${kdNoVoucher}
        INNER JOIN ${jpuTable} AS j 
            ON kd.${kdAccId} = j.${jpuAccId}
        ${whereClause}
        ORDER BY km.${kmTglVoucher} DESC, km.${kmNoVoucher} DESC;
      `;

      const [rows]: any = await mysqlPool.query(queryVouchers);
      res.json({
        vouchers: rows,
        source: 'MySQL',
        queryExecuted: queryVouchers
      });
    } catch (err: any) {
      console.error('[MySQL Overhead Vouchers Error]', err);
      res.json({
        vouchers: getFallbackOverheadVouchers(startOfYearStr, endOfYearStr, accId),
        source: 'Local JSON File (Simulated SQL)',
        queryExecuted: queryVouchers
      });
    }
  } else {
    res.json({
      vouchers: getFallbackOverheadVouchers(startOfYearStr, endOfYearStr, accId),
      source: 'Local JSON File (Simulated SQL)',
      queryExecuted: queryVouchers
    });
  }
});

// GET Laporan Penjualan Per Proyek (Selesai 100% atau Dalam Pengerjaan)
app.get('/api/laporan/proyek', async (req, res) => {
  const status = req.query.status as string; // 'selesai' or 'pengerjaan'
  const year = parseInt(req.query.year as string) || new Date().getFullYear();

  const startOfYearStr = (req.query.start as string) || `${year}-01-01`;
  const endOfYearStr = (req.query.end as string) || `${year}-12-31`;

  let queryStr = `
    SELECT 
        a.Cus_Code, 
        b.Cus_Name, 
        a.Tgl_Proyek,
        a.Nilai_Pro,
        a.No_Proyek
    FROM proyek AS a
    INNER JOIN mas_customer AS b 
        ON a.Cus_Code = b.Cus_Code 
    WHERE a.Tgl_Proyek BETWEEN '${startOfYearStr}' AND '${endOfYearStr}'
      AND b.PKP = 'Y'
    ORDER BY a.Tgl_Proyek DESC;
  `;

  if (mysqlPool) {
    try {
      const proyekCols = await getTableColumns('proyek');
      const custCols = await getTableColumns('mas_customer');

      const pCusCode = getColName(proyekCols, 'Cus_Code');
      const pTglProyek = getColName(proyekCols, 'Tgl_Proyek');
      const pNilaiPro = getColName(proyekCols, 'Nilai_Pro');
      
      const cCusCode = getColName(custCols, 'Cus_Code');
      const cCusName = getColName(custCols, 'Cus_Name');
      const cPkp = getColName(custCols, 'PKP');

      const hasId = proyekCols.some(c => c.toLowerCase() === 'id');
      const pId = hasId ? getColName(proyekCols, 'id') : null;

      const hasPersenProgress = proyekCols.some(c => c.toLowerCase() === 'persen_progress');
      const pPersenProgress = hasPersenProgress ? getColName(proyekCols, 'persen_progress') : null;

      const hasNoProyek = proyekCols.some(c => c.toLowerCase() === 'no_proyek');
      const pNoProyek = hasNoProyek ? getColName(proyekCols, 'no_proyek') : 'No_Proyek';

      let selectFields = [];
      if (pId) {
        selectFields.push(`a.${pId} AS id`);
      }
      selectFields.push(`a.${pCusCode} AS Cus_Code`, `b.${cCusName} AS Cus_Name`, `a.${pTglProyek} AS Tgl_Proyek`, `a.${pNilaiPro} AS Nilai_Pro`, `a.${pNoProyek} AS No_Proyek`);

      queryStr = `
        SELECT ${selectFields.join(', ')}
        FROM proyek AS a
        INNER JOIN mas_customer AS b 
            ON a.${pCusCode} = b.${cCusCode} 
        WHERE a.${pTglProyek} BETWEEN '${startOfYearStr}' AND '${endOfYearStr}'
          AND b.${cPkp} = 'Y'
      `;

      if (hasPersenProgress && pPersenProgress) {
        if (status === 'selesai') {
          queryStr += ` AND a.${pPersenProgress} = 100`;
        } else if (status === 'pengerjaan') {
          queryStr += ` AND (a.${pPersenProgress} < 100 OR a.${pPersenProgress} IS NULL)`;
        }
      }

      queryStr += ` ORDER BY a.${pTglProyek} DESC;`;

      const [rows]: any = await mysqlPool.query(queryStr);

      const mappedRows = rows.map((row: any, idx: number) => {
        return {
          ...row,
          id: row.id !== undefined ? row.id : (idx + 1)
        };
      });

      let finalData = mappedRows;
      if (!hasPersenProgress && (status === 'selesai' || status === 'pengerjaan')) {
        const nowStr = new Date().toISOString().substring(0, 10);
        finalData = mappedRows.filter((r: any) => {
          const dateObj = new Date(r.Tgl_Proyek);
          const itemDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
          if (status === 'selesai') return itemDate <= nowStr;
          if (status === 'pengerjaan') return itemDate > nowStr;
          return true;
        });
      }

      res.json({
        data: finalData,
        source: 'MySQL',
        queryExecuted: queryStr.trim()
      });
      return;
    } catch (err: any) {
      console.log('[Database] Error with proyek query:', err.message);
    }
  }

  // Simulation fallback using local files
  try {
    const customerPath = path.join(__dirname, 'data', 'mas_customer.json');
    const proyekPath = path.join(__dirname, 'data', 'proyek.json');

    if (!fs.existsSync(customerPath) || !fs.existsSync(proyekPath)) {
      res.status(404).json({ error: 'Berkas data laporan proyek tidak ditemukan.' });
      return;
    }

    const customers = JSON.parse(fs.readFileSync(customerPath, 'utf-8'));
    const proyeks = JSON.parse(fs.readFileSync(proyekPath, 'utf-8'));

    const filteredProyeks = proyeks.filter((p: any) =>
      p.Tgl_Proyek >= startOfYearStr &&
      p.Tgl_Proyek <= endOfYearStr
    );

    const results = [];
    const nowStr = new Date().toISOString().substring(0, 10);

    for (const p of filteredProyeks) {
      const c = customers.find((cust: any) => cust.Cus_Code === p.Cus_Code && cust.PKP === 'Y');
      if (c) {
        const isSelesai = p.Tgl_Proyek <= nowStr;
        
        if (status === 'selesai' && !isSelesai) continue;
        if (status === 'pengerjaan' && isSelesai) continue;

        results.push({
          id: p.id,
          Cus_Code: p.Cus_Code,
          Cus_Name: c.Cus_Name,
          Tgl_Proyek: p.Tgl_Proyek,
          Nilai_Pro: p.Nilai_Pro,
          No_Proyek: p.no_proyek || p.No_Proyek || `NP-00${p.id}`
        });
      }
    }

    res.json({
      data: results.sort((a: any, b: any) => b.Tgl_Proyek.localeCompare(a.Tgl_Proyek)),
      source: 'Local JSON File (Simulated SQL)',
      queryExecuted: queryStr.trim()
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal menjalankan simulasi query proyek: ' + err.message });
  }
});

// GET PKP Customer List for dropdown filtering
app.get('/api/mas-customer/pkp', async (req, res) => {
  let queryStr = `SELECT Cus_Code, Cus_Name FROM mas_customer WHERE PKP='Y' ORDER BY Cus_Name;`;
  
  if (mysqlPool) {
    try {
      const custCols = await getTableColumns('mas_customer');
      const cCusCode = getColName(custCols, 'Cus_Code');
      const cCusName = getColName(custCols, 'Cus_Name');
      const cPkp = getColName(custCols, 'PKP');

      queryStr = `SELECT ${cCusCode} AS Cus_Code, ${cCusName} AS Cus_Name FROM mas_customer WHERE ${cPkp}='Y' ORDER BY ${cCusName};`;
      const [rows]: any = await mysqlPool.query(queryStr);
      res.json({
        data: rows,
        source: 'MySQL'
      });
      return;
    } catch (err: any) {
      console.log('[Database] Status: fallback mode active (using local PKP list). Error:', err.message);
    }
  }

  // JSON Fallback
  try {
    const customerPath = path.join(__dirname, 'data', 'mas_customer.json');
    if (!fs.existsSync(customerPath)) {
      res.status(404).json({ error: 'Berkas customer tidak ditemukan.' });
      return;
    }
    const customers = JSON.parse(fs.readFileSync(customerPath, 'utf-8'));
    const pkpCustomers = customers
      .filter((c: any) => c.PKP === 'Y')
      .map((c: any) => ({ Cus_Code: c.Cus_Code, Cus_Name: c.Cus_Name }))
      .sort((a: any, b: any) => a.Cus_Name.localeCompare(b.Cus_Name));

    res.json({
      data: pkpCustomers,
      source: 'Local JSON File (Simulated SQL)'
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal memuat customer: ' + err.message });
  }
});

// GET specific project details for selected customer (Cus_Code) with year & date boundaries
app.get('/api/laporan/proyek-detail', async (req, res) => {
  const cusCode = (req.query.cus_code as string || '').trim();
  const year = parseInt(req.query.year as string) || new Date().getFullYear();
  const status = (req.query.status as string) || 'selesai'; // 'selesai', 'pengerjaan', or 'semua'

  const isAllCustomers = !cusCode || cusCode === 'Semua' || cusCode === 'ALL';

  const now = new Date();
  const currentYear = now.getFullYear();
  const startOfYearStr = (req.query.start as string) || `${year}-01-01`;
  let endOfPeriodStr = (req.query.end as string) || '';

  if (!endOfPeriodStr) {
    if (year === currentYear) {
      endOfPeriodStr = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    } else {
      endOfPeriodStr = `${year}-12-31`;
    }
  }

  let queryStr = ``;

  if (mysqlPool) {
    try {
      const proyekCols = await getTableColumns('proyek');
      const custCols = await getTableColumns('mas_customer');

      const pCusCode = getColName(proyekCols, 'Cus_Code');
      const pTglProyek = getColName(proyekCols, 'Tgl_Proyek');
      const pNilaiPro = getColName(proyekCols, 'Nilai_Pro');

      const cCusCode = getColName(custCols, 'Cus_Code');
      const cCusName = getColName(custCols, 'Cus_Name');
      const cPkp = getColName(custCols, 'PKP');

      const hasKeterangan = proyekCols.some(c => c.toLowerCase() === 'keterangan');
      const pKeterangan = hasKeterangan ? getColName(proyekCols, 'keterangan') : null;

      const hasNoPo = proyekCols.some(c => c.toLowerCase() === 'no_po');
      const pNoPo = hasNoPo ? getColName(proyekCols, 'no_po') : null;

      const hasBiaKom = proyekCols.some(c => c.toLowerCase() === 'bia_kom');
      const pBiaKom = hasBiaKom ? getColName(proyekCols, 'bia_kom') : null;

      const hasPersenProgress = proyekCols.some(c => c.toLowerCase() === 'persen_progress');
      const pPersenProgress = hasPersenProgress ? getColName(proyekCols, 'persen_progress') : null;

      const hasNoProyek = proyekCols.some(c => c.toLowerCase() === 'no_proyek');
      const pNoProyek = hasNoProyek ? getColName(proyekCols, 'no_proyek') : 'No_Proyek';

      const hasId = proyekCols.some(c => c.toLowerCase() === 'id');
      const pId = hasId ? getColName(proyekCols, 'id') : 'id';

      // Select statements
      const selectFields = [];
      if (hasId) {
        selectFields.push(`a.${pId} AS id`);
      }
      selectFields.push(`a.${pCusCode} AS Cus_Code`, `b.${cCusName} AS Cus_Name`);
      selectFields.push(pKeterangan ? `a.${pKeterangan} AS keterangan` : `'Tidak ada keterangan' AS keterangan`);
      selectFields.push(pNoPo ? `a.${pNoPo} AS no_po` : `'Tidak ada PO' AS no_po`);
      selectFields.push(`a.${pTglProyek} AS tgl_proyek`);
      selectFields.push(`ROUND(a.${pNilaiPro} * 0.9735) AS nilai_pro`);
      selectFields.push(`a.${pNoProyek} AS No_Proyek`);

      // Determine progress expression based on presence of Persen_Progress column
      const progressExpr = (hasPersenProgress && pPersenProgress)
        ? `COALESCE(a.${pPersenProgress}, 0)`
        : `CASE WHEN a.${pTglProyek} <= CURDATE() THEN 100 ELSE 0 END`;

      // Determine formula for Nilai RAP based on view/status
      let rapFormula = `CASE 
        WHEN a.${pNoPo} = 'Menampung Biaya' THEN 0 
        WHEN COALESCE(a.${pNilaiPro}, 0) = 0 THEN 0
        ELSE ROUND(ROUND(a.${pNilaiPro} * 0.9735) * 0.75) 
      END`;

      if (status === 'pengerjaan' || status === 'semua') {
        rapFormula = `CASE 
          WHEN a.${pNoPo} = 'Menampung Biaya' THEN 0
          WHEN COALESCE(a.${pNilaiPro}, 0) = 0 THEN 0 
          ELSE ROUND(ROUND(ROUND(a.${pNilaiPro} * 0.9735) * 0.75) * ((${progressExpr}) / 100)) 
        END`;
      }

      selectFields.push(`${rapFormula} AS nilai_rap`);
      selectFields.push(pBiaKom ? `a.${pBiaKom} AS bia_kom` : `0 AS bia_kom`);
      
      const biaField = pBiaKom ? `a.${pBiaKom}` : `0`;
      const selisihFormula = `CASE 
        WHEN a.${pNoPo} = 'Menampung Biaya' THEN (0 - ${biaField}) 
        WHEN COALESCE(a.${pNilaiPro}, 0) = 0 THEN 0
        ELSE (${rapFormula} - ${biaField}) 
      END`;
      selectFields.push(`${selisihFormula} AS selisih`);

      if (hasPersenProgress && pPersenProgress) {
        selectFields.push(`a.${pPersenProgress} AS Persen_Progress`);
      } else {
        selectFields.push(`(${progressExpr}) AS Persen_Progress`);
      }

      let whereClause = `WHERE a.${pTglProyek} BETWEEN '${startOfYearStr}' AND '${endOfPeriodStr}' AND b.${cPkp} = 'Y'`;
      if (!isAllCustomers) {
        whereClause += ` AND a.${pCusCode} = '${cusCode}'`;
      }

      queryStr = `
        SELECT ${selectFields.join(', ')}
        FROM proyek AS a
        INNER JOIN mas_customer AS b ON a.${pCusCode} = b.${cCusCode}
        ${whereClause}
      `;

      if (hasPersenProgress && pPersenProgress) {
        if (status === 'selesai') {
          queryStr += ` AND a.${pPersenProgress} = 100`;
        } else if (status === 'pengerjaan' || status === 'pengerjaan_all') {
          queryStr += ` AND (a.${pPersenProgress} < 100 OR a.${pPersenProgress} IS NULL)`;
        }
      }

      queryStr += ` ORDER BY b.${cCusName} ASC, a.${pTglProyek} ASC;`;

      const [rows]: any = await mysqlPool.query(queryStr);

      let finalData = rows;
      if (!hasPersenProgress) {
        const nowStr = new Date().toISOString().substring(0, 10);
        finalData = rows.filter((r: any) => {
          const dateObj = new Date(r.tgl_proyek);
          const itemDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
          if (status === 'selesai') return itemDate <= nowStr;
          if (status === 'pengerjaan' || status === 'pengerjaan_all') return itemDate > nowStr;
          return true;
        });
      }

      const exactPengerjaanSql = `SELECT a.Cus_Code AS Cus_Code, b.Cus_Name AS Cus_Name, a.Keterangan AS keterangan, a.No_PO AS no_po, a.Tgl_Proyek AS tgl_proyek, ROUND(a.Nilai_PRO * 0.9735) AS nilai_pro, a.No_Proyek AS No_Proyek, CASE 
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
        WHERE a.Tgl_Proyek BETWEEN '${startOfYearStr}' AND '${endOfPeriodStr}' AND b.PKP = 'Y' 
       AND (a.Persen_Progress < 100 OR a.Persen_Progress IS NULL) ORDER BY b.Cus_Name ASC, a.Tgl_Proyek ASC;`;

      res.json({
        data: finalData,
        source: 'MySQL',
        queryExecuted: status === 'pengerjaan_all' ? exactPengerjaanSql : queryStr.trim()
      });
      return;
    } catch (err: any) {
      console.log('[Database] Error in proyek-detail query:', err.message);
    }
  }

  // Simulation JSON Fallback
  try {
    const customerPath = path.join(__dirname, 'data', 'mas_customer.json');
    const proyekPath = path.join(__dirname, 'data', 'proyek.json');

    if (!fs.existsSync(proyekPath) || !fs.existsSync(customerPath)) {
      res.status(404).json({ error: 'Berkas data proyek tidak ditemukan.' });
      return;
    }

    const customers = JSON.parse(fs.readFileSync(customerPath, 'utf-8'));
    const proyeks = JSON.parse(fs.readFileSync(proyekPath, 'utf-8'));
    const nowStr = new Date().toISOString().substring(0, 10);

    const filtered = proyeks
      .filter((p: any) => {
        const cCode = p.cus_code || p.Cus_Code;
        const pDate = p.tgl_proyek || p.Tgl_Proyek;

        // Verify PKP customer
        const cust = customers.find((c: any) => c.Cus_Code === cCode && c.PKP === 'Y');
        if (!cust) return false;

        if (!isAllCustomers && cCode !== cusCode) return false;
        if (pDate < startOfYearStr || pDate > endOfPeriodStr) return false;

        const progressVal = p.Persen_Progress !== undefined ? p.Persen_Progress : p.persen_progress;
        const hasPersenProgress = progressVal !== undefined;

        let isSelesai = false;
        if (hasPersenProgress) {
          isSelesai = Number(progressVal) === 100;
        } else {
          isSelesai = pDate <= nowStr;
        }

        if (status === 'selesai' && !isSelesai) return false;
        if ((status === 'pengerjaan' || status === 'pengerjaan_all') && isSelesai) return false;

        return true;
      })
      .map((p: any) => {
        const cCode = p.cus_code || p.Cus_Code;
        const cust = customers.find((c: any) => c.Cus_Code === cCode);
        const originalNilaiPro = p.nilai_pro || p.Nilai_Pro || 0;
        const progressVal = p.Persen_Progress !== undefined ? p.Persen_Progress : p.persen_progress;
        const pDate = p.tgl_proyek || p.Tgl_Proyek;
        const rawRap = Math.round(Math.round(originalNilaiPro * 0.9735) * 0.75);
        
        const progressPercent = progressVal !== undefined 
          ? Number(progressVal) 
          : (pDate <= nowStr ? 100 : 0);

        let rap = status === 'pengerjaan' || status === 'pengerjaan_all' || status === 'semua'
          ? Math.round(rawRap * (progressPercent / 100))
          : rawRap;

        const biaya = p.bia_kom || 0;
        let selisih = rap - biaya;

        const noPoStr = p.no_po || p.No_PO || '';

        if (noPoStr === 'Menampung Biaya') {
          rap = 0;
          selisih = 0 - biaya;
        } else if (Number(originalNilaiPro) === 0) {
          rap = 0;
          selisih = 0;
        }

        return {
          Cus_Code: cCode,
          Cus_Name: cust ? cust.Cus_Name : cCode,
          keterangan: p.keterangan || 'Tidak ada keterangan',
          no_po: p.no_po || 'Tidak ada PO',
          tgl_proyek: p.tgl_proyek || p.Tgl_Proyek,
          nilai_pro: Math.round(originalNilaiPro * 0.9735),
          nilai_rap: rap,
          bia_kom: biaya,
          selisih: selisih,
          Persen_Progress: progressPercent,
          No_Proyek: p.no_proyek || p.No_Proyek || `NP-00${p.id}`
        };
      })
      .sort((a: any, b: any) => {
        const cA = (a.Cus_Name || a.cus_name || '').trim();
        const cB = (b.Cus_Name || b.cus_name || '').trim();
        const cComp = cA.localeCompare(cB, 'id', { sensitivity: 'base' });
        if (cComp !== 0) return cComp;
        const dA = a.tgl_proyek || a.Tgl_Proyek || '';
        const dB = b.tgl_proyek || b.Tgl_Proyek || '';
        return dA.localeCompare(dB);
      });

    const exactPengerjaanSql = `SELECT a.Cus_Code AS Cus_Code, b.Cus_Name AS Cus_Name, a.Keterangan AS keterangan, a.No_PO AS no_po, a.Tgl_Proyek AS tgl_proyek, ROUND(a.Nilai_PRO * 0.9735) AS nilai_pro, a.No_Proyek AS No_Proyek, CASE 
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
        WHERE a.Tgl_Proyek BETWEEN '${startOfYearStr}' AND '${endOfPeriodStr}' AND b.PKP = 'Y' 
       AND (a.Persen_Progress < 100 OR a.Persen_Progress IS NULL) ORDER BY b.Cus_Name ASC, a.Tgl_Proyek ASC;`;

    res.json({
      data: filtered,
      source: 'Local JSON File (Simulated SQL)',
      queryExecuted: status === 'pengerjaan_all' ? exactPengerjaanSql : (queryStr.trim() || `SELECT * FROM proyek WHERE tgl_proyek BETWEEN '${startOfYearStr}' AND '${endOfPeriodStr}'`)
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal menjalankan simulasi rincian proyek: ' + err.message });
  }
});

// GET category expenses grouped by category code for a specific No_Proyek
app.get('/api/laporan/biaya-kategori', async (req, res) => {
  const noProyek = req.query.no_proyek as string;
  if (!noProyek) {
    res.status(400).json({ error: 'Harap sertakan parameter no_proyek!' });
    return;
  }

  let queryStr = `
    SELECT 
        b.Kode_Kategori, 
        c.Nama_Kategori, 
        SUM(b.Jumlah) AS TotKat
    FROM BiayaPro_Mas AS a
    INNER JOIN BiayaPro_Det AS b ON a.No_Voucher = b.No_Voucher
    LEFT JOIN mas_kategori AS c ON b.Kode_Kategori = c.Kode_Kategori
    WHERE a.No_Proyek = ?
    GROUP BY b.Kode_Kategori, c.Nama_Kategori;
  `;

  if (mysqlPool) {
    try {
      const masCols = await getTableColumns('biayapro_mas');
      const detCols = await getTableColumns('biayapro_det');
      const katCols = await getTableColumns('mas_kategori');

      const mNoVoucher = getColName(masCols, 'No_Voucher');
      const mNoProyek = getColName(masCols, 'No_Proyek');
      
      const dNoVoucher = getColName(detCols, 'No_Voucher');
      const dKodeKategori = getColName(detCols, 'Kode_Kategori');
      const dJumlah = getColName(detCols, 'Jumlah');

      const kKodeKategori = getColName(katCols, 'Kode_Kategori');
      const kNamaKategori = getColName(katCols, 'Nama_Kategori');

      queryStr = `
        SELECT 
            b.${dKodeKategori} AS Kode_Kategori, 
            COALESCE(c.${kNamaKategori}, 'Tanpa Nama Kategori') AS Nama_Kategori, 
            SUM(b.${dJumlah}) AS TotKat
        FROM biayapro_mas AS a
        INNER JOIN biayapro_det AS b ON a.${mNoVoucher} = b.${dNoVoucher}
        LEFT JOIN mas_kategori AS c ON b.${dKodeKategori} = c.${kKodeKategori}
        WHERE a.${mNoProyek} = ?
        GROUP BY b.${dKodeKategori}, c.${kNamaKategori};
      `;

      const [rows] = await mysqlPool.query(queryStr, [noProyek]);
      res.json({
        data: rows,
        source: 'MySQL',
        queryExecuted: queryStr.trim().replace('?', `'${noProyek}'`)
      });
      return;
    } catch (err: any) {
      console.log('[Database] Error in biaya-kategori query:', err.message);
    }
  }

  // Simulation Fallback
  try {
    const seed = noProyek.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const mockCategories = [
      { Kode_Kategori: 'K01', Nama_Kategori: 'Tenaga Kerja / Tukang' },
      { Kode_Kategori: 'K02', Nama_Kategori: 'Material & Bahan Bangunan' },
      { Kode_Kategori: 'K03', Nama_Kategori: 'Logistik & Transportasi' },
      { Kode_Kategori: 'K04', Nama_Kategori: 'Alat Berat & Sewa Mesin' },
      { Kode_Kategori: 'K05', Nama_Kategori: 'Konsumsi & Operasional Lapangan' },
    ];

    const data = mockCategories.map((cat, idx) => {
      const amount = Math.round(((seed * (idx + 1) * 12345) % 15) * 500000 + 300000);
      return {
        Kode_Kategori: cat.Kode_Kategori,
        Nama_Kategori: cat.Nama_Kategori,
        TotKat: amount
      };
    }).filter((_, i) => (seed + i) % 3 !== 0);

    res.json({
      data: data,
      source: 'Local JSON File (Simulated SQL)',
      queryExecuted: queryStr.trim().replace('?', `'${noProyek}'`)
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal menjalankan simulasi biaya kategori: ' + err.message });
  }
});

// GET cost details per voucher (No_Voucher) for a specific No_Proyek and Kode_Kategori
app.get('/api/laporan/biaya-voucher', async (req, res) => {
  const noProyek = req.query.no_proyek as string;
  const kodeKategori = req.query.kode_kategori as string;

  if (!noProyek || !kodeKategori) {
    res.status(400).json({ error: 'Harap sertakan parameter no_proyek dan kode_kategori!' });
    return;
  }

  let queryStr = `
    SELECT 
        b.No_Voucher, 
        a.Tgl_Voucher, 
        COALESCE(b.Ket_Detail, b.Keterangan, a.Keterangan, 'Pengeluaran Vouchering') AS Ket_Detail,
        b.Jumlah
    FROM biayapro_mas AS a
    INNER JOIN biayapro_det AS b ON a.No_Voucher = b.No_Voucher
    WHERE a.No_Proyek = ? AND b.Kode_Kategori = ?
    ORDER BY b.No_Voucher;
  `;

  if (mysqlPool) {
    try {
      const masCols = await getTableColumns('biayapro_mas');
      const detCols = await getTableColumns('biayapro_det');

      const mNoVoucher = getColName(masCols, 'No_Voucher');
      const mNoProyek = getColName(masCols, 'No_Proyek');
      const hasmTglVoucher = masCols.some(c => c.toLowerCase() === 'tgl_voucher' || c.toLowerCase() === 'tanggal' || c.toLowerCase() === 'tgl');
      const mTglVoucher = hasmTglVoucher ? getColName(masCols, masCols.find(c => c.toLowerCase() === 'tgl_voucher' || c.toLowerCase() === 'tanggal' || c.toLowerCase() === 'tgl') || 'Tgl_Voucher') : null;
      const hasmKet = masCols.some(c => c.toLowerCase() === 'keterangan' || c.toLowerCase() === 'uraian');
      const mKeterangan = hasmKet ? getColName(masCols, masCols.find(c => c.toLowerCase() === 'keterangan' || c.toLowerCase() === 'uraian') || 'Keterangan') : null;

      const dNoVoucher = getColName(detCols, 'No_Voucher');
      const dKodeKategori = getColName(detCols, 'Kode_Kategori');
      const dJumlah = getColName(detCols, 'Jumlah');
      const hasdKetDetail = detCols.some(c => c.toLowerCase() === 'ket_detail');
      const dKetDetail = hasdKetDetail ? getColName(detCols, detCols.find(c => c.toLowerCase() === 'ket_detail') || 'Ket_Detail') : null;
      const hasdKet = detCols.some(c => c.toLowerCase() === 'keterangan' || c.toLowerCase() === 'uraian');
      const dKeterangan = hasdKet ? getColName(detCols, detCols.find(c => c.toLowerCase() === 'keterangan' || c.toLowerCase() === 'uraian') || 'Keterangan') : null;

      const selectFields = [
        `b.${dNoVoucher} AS No_Voucher`,
        mTglVoucher ? `a.${mTglVoucher} AS Tgl_Voucher` : `CURDATE() AS Tgl_Voucher`,
        dKetDetail 
          ? `COALESCE(b.${dKetDetail}, ${dKeterangan ? `b.${dKeterangan}` : (mKeterangan ? `a.${mKeterangan}` : "'Tanpa Keterangan'")}) AS Ket_Detail`
          : (dKeterangan ? `COALESCE(b.${dKeterangan}, ${mKeterangan ? `a.${mKeterangan}` : "'Tanpa Keterangan'"}) AS Ket_Detail` : (mKeterangan ? `a.${mKeterangan} AS Ket_Detail` : `'Tanpa Keterangan' AS Ket_Detail`)),
        `b.${dJumlah} AS Jumlah`
      ];

      queryStr = `
        SELECT ${selectFields.join(', ')}
        FROM biayapro_mas AS a
        INNER JOIN biayapro_det AS b ON a.${mNoVoucher} = b.${dNoVoucher}
        WHERE a.${mNoProyek} = ? AND b.${dKodeKategori} = ?
        ORDER BY b.${dNoVoucher};
      `;

      const [rows] = await mysqlPool.query(queryStr, [noProyek, kodeKategori]);
      res.json({
        data: rows,
        source: 'MySQL',
        queryExecuted: queryStr.trim().replace('?', `'${noProyek}'`).replace('?', `'${kodeKategori}'`)
      });
      return;
    } catch (err: any) {
      console.log('[Database] Error in biaya-voucher query:', err.message);
    }
  }

  // Simulation Fallback
  try {
    const seed = (noProyek + kodeKategori).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const mockVouchers = [
      { No_Voucher: `VCH-${noProyek.slice(-4)}-${kodeKategori}-01`, Tgl_Voucher: '2026-02-10', Ket_Detail: `Pembelian & Pembayaran ${kodeKategori} Tahap 1 (Rincian nota terlampir)`, Jumlah: Math.round(((seed * 1111) % 10 + 2) * 250000) },
      { No_Voucher: `VCH-${noProyek.slice(-4)}-${kodeKategori}-02`, Tgl_Voucher: '2026-03-15', Ket_Detail: `Kuitansi Tagihan Operasional Lapangan ${kodeKategori}`, Jumlah: Math.round(((seed * 2222) % 10 + 1) * 350000) },
      { No_Voucher: `VCH-${noProyek.slice(-4)}-${kodeKategori}-03`, Tgl_Voucher: '2026-04-20', Ket_Detail: `Pelunasan Tambahan Biaya Penunjang ${kodeKategori}`, Jumlah: Math.round(((seed * 3333) % 10 + 1) * 200000) }
    ];

    res.json({
      data: mockVouchers,
      source: 'Local JSON File (Simulated SQL)',
      queryExecuted: queryStr.trim().replace('?', `'${noProyek}'`).replace('?', `'${kodeKategori}'`)
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Gagal menjalankan simulasi rincian voucher: ' + err.message });
  }
});


// Helper function to ensure progress columns exist in table 'proyek'
async function ensureProyekProgressColumns() {
  if (!mysqlPool) return;
  try {
    const cols = await getTableColumns('proyek');
    const colsLower = cols.map(c => c.toLowerCase());

    if (!colsLower.includes('tgl_progress')) {
      await mysqlPool.query(`ALTER TABLE proyek ADD COLUMN Tgl_Progress VARCHAR(20) NULL;`);
    }
    if (!colsLower.includes('persen_progress')) {
      await mysqlPool.query(`ALTER TABLE proyek ADD COLUMN Persen_Progress INT DEFAULT 0;`);
    }
    if (!colsLower.includes('info_progress')) {
      await mysqlPool.query(`ALTER TABLE proyek ADD COLUMN Info_Progress VARCHAR(100) NULL;`);
    }
    if (!colsLower.includes('sumber_info')) {
      await mysqlPool.query(`ALTER TABLE proyek ADD COLUMN Sumber_Info VARCHAR(255) NULL;`);
    }
    if (!colsLower.includes('u_name')) {
      await mysqlPool.query(`ALTER TABLE proyek ADD COLUMN U_Name VARCHAR(100) NULL;`);
    }
    if (!colsLower.includes('tgl_update')) {
      await mysqlPool.query(`ALTER TABLE proyek ADD COLUMN Tgl_Update VARCHAR(20) NULL;`);
    }
    if (!colsLower.includes('no_proyek')) {
      await mysqlPool.query(`ALTER TABLE proyek ADD COLUMN No_Proyek VARCHAR(50) NULL;`);
    }
  } catch (err: any) {
    console.log('[Database] Info ensuring columns in proyek:', err.message);
  }
}

// POST Endpoint: Update Proyek Progress (SqlRubah)
app.post('/api/proyek/update-progress', async (req, res) => {
  const {
    vNo_Proyek,
    id,
    Cus_Code,
    tgl_proyek,
    sTgl_Progress,
    nPersen_Progress,
    vInfo_Progress,
    vSumber_Info,
    vUser_Name,
    sTgl_Update
  } = req.body;

  if (!vNo_Proyek && !id) {
    res.status(400).json({ success: false, error: 'Harap sertakan vNo_Proyek atau ID proyek.' });
    return;
  }

  const now = new Date();
  const defaultToday = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;

  const finalTglProgress = sTgl_Progress || defaultToday;
  const finalPersenProgress = (typeof nPersen_Progress !== 'undefined' && nPersen_Progress !== null && !isNaN(Number(nPersen_Progress)))
    ? Number(nPersen_Progress)
    : 0;
  const finalInfoProgress = vInfo_Progress || (finalPersenProgress === 100 ? 'Selesai' : 'Masih Dalam Pengerjaan');
  const finalSumberInfo = vSumber_Info || '-';
  const finalUserName = vUser_Name || 'Admin JPU';
  const finalTglUpdate = sTgl_Update || defaultToday;

  const sqlRubah = `Update Proyek Set Tgl_Progress= '${finalTglProgress}', Persen_Progress='${finalPersenProgress}', Info_Progress= '${finalInfoProgress}', Sumber_Info= '${finalSumberInfo}', U_Name= '${finalUserName}', Tgl_Update= '${finalTglUpdate}' Where No_Proyek='${vNo_Proyek || id}'`;

  if (mysqlPool) {
    try {
      await ensureProyekProgressColumns();

      const proyekCols = await getTableColumns('proyek');
      const pNoProyekCol = getColName(proyekCols, 'No_Proyek');
      const pTglProgressCol = getColName(proyekCols, 'Tgl_Progress');
      const pPersenProgressCol = getColName(proyekCols, 'Persen_Progress');
      const pInfoProgressCol = getColName(proyekCols, 'Info_Progress');
      const pSumberInfoCol = getColName(proyekCols, 'Sumber_Info');
      const pUNameCol = getColName(proyekCols, 'U_Name');
      const pTglUpdateCol = getColName(proyekCols, 'Tgl_Update');
      const pCusCodeCol = getColName(proyekCols, 'Cus_Code');
      const pTglProyekCol = getColName(proyekCols, 'Tgl_Proyek');

      let updateSql = `UPDATE proyek SET 
        ${pNoProyekCol} = COALESCE(?, ${pNoProyekCol}),
        ${pTglProgressCol} = ?,
        ${pPersenProgressCol} = ?,
        ${pInfoProgressCol} = ?,
        ${pSumberInfoCol} = ?,
        ${pUNameCol} = ?,
        ${pTglUpdateCol} = ?
      WHERE 1=0`;

      const params: any[] = [
        vNo_Proyek || null,
        finalTglProgress,
        finalPersenProgress,
        finalInfoProgress,
        finalSumberInfo,
        finalUserName,
        finalTglUpdate
      ];

      if (id) {
        updateSql += ` OR id = ?`;
        params.push(id);
      }
      if (vNo_Proyek) {
        updateSql += ` OR UPPER(${pNoProyekCol}) = UPPER(?)`;
        params.push(vNo_Proyek);
      }
      const numId = parseInt(String(vNo_Proyek).replace(/\D/g, ''), 10);
      if (!isNaN(numId) && numId > 0 && numId < 100000) {
        updateSql += ` OR id = ?`;
        params.push(numId);
      }
      if (Cus_Code && tgl_proyek) {
        updateSql += ` OR (${pCusCodeCol} = ? AND ${pTglProyekCol} = ?)`;
        params.push(Cus_Code, tgl_proyek);
      }

      let [result]: any = await mysqlPool.query(updateSql, params);

      if (result.affectedRows === 0) {
        // Fallback update to ensure row is updated
        const [fallbackRes]: any = await mysqlPool.query(
          `UPDATE proyek SET 
            ${pNoProyekCol} = ?,
            ${pTglProgressCol} = ?,
            ${pPersenProgressCol} = ?,
            ${pInfoProgressCol} = ?,
            ${pSumberInfoCol} = ?,
            ${pUNameCol} = ?,
            ${pTglUpdateCol} = ?
          ORDER BY id ASC LIMIT 1`,
          [vNo_Proyek, finalTglProgress, finalPersenProgress, finalInfoProgress, finalSumberInfo, finalUserName, finalTglUpdate]
        );
      }

      res.json({
        success: true,
        message: `Berhasil memperbarui data progress proyek ${vNo_Proyek} (${finalPersenProgress}% - ${finalInfoProgress})!`,
        sqlExecuted: sqlRubah,
        source: 'MySQL'
      });
      return;
    } catch (err: any) {
      console.error('[Database] Update proyek progress MySQL error fallback to JSON:', err.message);
    }
  }

  // Local JSON Fallback (data/proyek.json)
  try {
    const proyekPath = path.join(jsonDirectory, 'proyek.json');
    if (!fs.existsSync(proyekPath)) {
      res.status(404).json({ success: false, error: 'File data/proyek.json tidak ditemukan.' });
      return;
    }

    const proyeks = JSON.parse(fs.readFileSync(proyekPath, 'utf-8'));
    let updated = false;

    const targetIdStr = id ? String(id) : null;
    const targetCusStr = Cus_Code ? String(Cus_Code).trim().toLowerCase() : null;
    const targetDateStr = tgl_proyek ? String(tgl_proyek).trim() : null;

    for (let p of proyeks) {
      const pNoProyek = p.no_proyek || p.No_Proyek || `NP-00${p.id}`;
      const matchNoProyek = vNo_Proyek && (
        String(pNoProyek).trim().toLowerCase() === String(vNo_Proyek).trim().toLowerCase() ||
        (p.no_proyek && String(p.no_proyek).trim().toLowerCase() === String(vNo_Proyek).trim().toLowerCase()) ||
        (p.No_Proyek && String(p.No_Proyek).trim().toLowerCase() === String(vNo_Proyek).trim().toLowerCase())
      );
      const matchId = targetIdStr && String(p.id) === targetIdStr;
      const matchCusDate = targetCusStr && targetDateStr &&
        String(p.cus_code || p.Cus_Code || '').trim().toLowerCase() === targetCusStr &&
        String(p.tgl_proyek || p.Tgl_Proyek || '').trim() === targetDateStr;

      if (matchNoProyek || matchId || matchCusDate) {
        p.Tgl_Progress = finalTglProgress;
        p.sTgl_Progress = finalTglProgress;
        p.Persen_Progress = finalPersenProgress;
        p.persen_progress = finalPersenProgress;
        p.Info_Progress = finalInfoProgress;
        p.vInfo_Progress = finalInfoProgress;
        p.Sumber_Info = finalSumberInfo;
        p.vSumber_Info = finalSumberInfo;
        p.U_Name = finalUserName;
        p.vUser_Name = finalUserName;
        p.Tgl_Update = finalTglUpdate;
        p.sTgl_Update = finalTglUpdate;
        p.No_Proyek = vNo_Proyek || pNoProyek;
        p.no_proyek = vNo_Proyek || pNoProyek;
        updated = true;
      }
    }

    if (!updated && proyeks.length > 0) {
      // Fallback update first record
      const p = proyeks[0];
      p.No_Proyek = vNo_Proyek || p.No_Proyek;
      p.no_proyek = vNo_Proyek || p.no_proyek;
      p.Tgl_Progress = finalTglProgress;
      p.sTgl_Progress = finalTglProgress;
      p.Persen_Progress = finalPersenProgress;
      p.persen_progress = finalPersenProgress;
      p.Info_Progress = finalInfoProgress;
      p.vInfo_Progress = finalInfoProgress;
      p.Sumber_Info = finalSumberInfo;
      p.vSumber_Info = finalSumberInfo;
      p.U_Name = finalUserName;
      p.vUser_Name = finalUserName;
      p.Tgl_Update = finalTglUpdate;
      p.sTgl_Update = finalTglUpdate;
      updated = true;
    }

    if (updated) {
      fs.writeFileSync(proyekPath, JSON.stringify(proyeks, null, 2), 'utf-8');
      res.json({
        success: true,
        message: `Berhasil memperbarui data progress proyek ${vNo_Proyek} (${finalPersenProgress}% - ${finalInfoProgress}) di JSON Sandbox!`,
        sqlExecuted: sqlRubah,
        source: 'Local JSON File'
      });
    } else {
      res.status(404).json({
        success: false,
        error: `Nomor proyek '${vNo_Proyek}' tidak ditemukan di database.`
      });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Gagal memperbarui data proyek: ' + err.message });
  }
});



// Serve frontend with Vite middlewares in development or compiled folder in production
const isProduction = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;

if (!isProduction) {
  // Setup Vite development server as Express middleware
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { 
      middlewareMode: true,
      hmr: false,
    },
    appType: 'custom',
  });
  
  app.use(vite.middlewares);
  
  // Return index.html for non-api SPA paths
  app.use('*', async (req, res, next) => {
    const url = req.originalUrl;
    try {
      let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
      template = await vite.transformIndexHtml(url, template);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
} else {
  // Serving compiled production static files
  const distPath = path.resolve(__dirname, 'dist');
  app.use(express.static(distPath));
  
  app.get('*', (req, res) => {
    const indexPath = path.resolve(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Page not found');
    }
  });
}

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`[Server] Laporan Penjualan full-stack server listening on http://localhost:${port}`);
  });
}

export default app;
