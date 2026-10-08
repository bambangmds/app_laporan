import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Enable JSON middleware and CORS for all origins
app.use(cors());
app.use(express.json());

// Database configuration setup
const dbConfig = {
  host: process.env.DB_HOST || '',
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || '',
  port: parseInt(process.env.DB_PORT || '3306', 10),
};

// Check if MySQL should be enabled (configured via env variables or code defaults)
const isMySqlConfigured = !!(dbConfig.host && dbConfig.user && dbConfig.database);
let mysqlPool: mysql.Pool | null = null;
let isMySqlOnline = false;

if (isMySqlConfigured) {
  try {
    console.log(`[Database] Attempting to initialize MySQL pool: ${dbConfig.user}@${dbConfig.host}/${dbConfig.database}`);
    mysqlPool = mysql.createPool({
      ...dbConfig,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 5000, // 5s reliable timeout for actual database connections
    });
    
    // Non-blocking connection probe
    mysqlPool.getConnection()
      .then((conn) => {
        console.log('[Database] Successful connection established with MySQL.');
        isMySqlOnline = true;
        conn.release();
      })
      .catch((err) => {
        isMySqlOnline = false;
        if (err.code === 'ECONNREFUSED' || err.message.includes('ECONNREFUSED')) {
          console.log('[Database] Connection Probe Info: Sandbox Mode Active. Seamlessly ready to fallback to local JSON storage.');
        } else {
          console.log(`[Database] Connection Probe Info: MySQL server is not currently reachable (${err.message}). Ready to fallback dynamically to JSON local storage if needed.`);
        }
      });
  } catch (error: any) {
    console.log('[Database] Info: Failed to create MySQL pool setup:', error.message);
  }
} else {
  console.log('[Database] MySQL environment variables not configured. Seamlessly falling back to JSON local file storage (data/penjualan.json).');
}

// JSON file storage fallback configuration
const jsonDirectory = path.join(__dirname, 'data');

// Helper to dynamically get table columns
async function getTableColumns(tableName: string): Promise<string[]> {
  if (!mysqlPool || !isMySqlOnline) return [];
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

// GET DB Status Endpoint
app.get('/api/db-status', async (req, res) => {
  if (mysqlPool) {
    try {
      // Test connectivity
      const conn = await mysqlPool.getConnection();
      conn.release();
      isMySqlOnline = true;
      res.json({
        activeDb: 'MySQL',
        status: 'Connected',
        host: dbConfig.host,
        database: dbConfig.database,
        user: dbConfig.user,
      });
      return;
    } catch (err: any) {
      isMySqlOnline = false;
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
DB_HOST=${host}
DB_PORT=${parsedPort}
DB_USER=${user}
DB_PASSWORD=${password || ''}
DB_NAME=${database}
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
      isMySqlOnline = true;
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
      isMySqlOnline = false;
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
    isMySqlOnline = false;
    
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

  if (mysqlPool && isMySqlOnline) {
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

// GET Laporan Penjualan Per Proyek (Selesai 100% atau Dalam Pengerjaan)
app.get('/api/laporan/proyek', async (req, res) => {
  const status = req.query.status as string; // 'selesai' or 'pengerjaan'
  const year = parseInt(req.query.year as string) || new Date().getFullYear();

  const startOfYearStr = `${year}-01-01`;
  const endOfYearStr = `${year}-12-31`;

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

  if (mysqlPool && isMySqlOnline) {
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
  
  if (mysqlPool && isMySqlOnline) {
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
  const cusCode = req.query.cus_code as string;
  const year = parseInt(req.query.year as string) || new Date().getFullYear();
  const status = req.query.status as string || 'selesai'; // 'selesai' or 'pengerjaan'

  if (!cusCode) {
    res.status(400).json({ error: 'Harap sertakan parameter cus_code!' });
    return;
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const startOfYearStr = `${year}-01-01`;
  let endOfPeriodStr = '';

  if (year === currentYear) {
    // Current year: filter up to today (current day and month)
    endOfPeriodStr = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  } else {
    // Other years: filter up to Dec 31
    endOfPeriodStr = `${year}-12-31`;
  }

  let queryStr = `
    SELECT keterangan, no_po, tgl_proyek, ROUND(Nilai_Pro * 0.9735) AS nilai_pro, ROUND(ROUND(Nilai_Pro * 0.9735) * 0.75) AS nilai_rap, bia_kom, No_Proyek  
    FROM proyek 
    WHERE cus_code = ? 
      AND tgl_proyek BETWEEN ? AND ?;
  `;

  if (mysqlPool && isMySqlOnline) {
    try {
      const proyekCols = await getTableColumns('proyek');

      const pCusCode = getColName(proyekCols, 'Cus_Code');
      const pTglProyek = getColName(proyekCols, 'Tgl_Proyek');
      const pNilaiPro = getColName(proyekCols, 'Nilai_Pro');

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

      // Select statements
      const selectFields = [];
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
      
      // Calculate Selisih based on rules:
      // 1. If Nilai_Pro = 0, Selisih = 0
      // 2. If No_PO = 'Menampung Biaya', Selisih = 0 - biaya
      // 3. Otherwise, Selisih = RAP - biaya
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

      queryStr = `
        SELECT ${selectFields.join(', ')}
        FROM proyek AS a
        WHERE a.${pCusCode} = ? 
          AND a.${pTglProyek} BETWEEN ? AND ?
      `;

      if (hasPersenProgress && pPersenProgress) {
        if (status === 'selesai') {
          queryStr += ` AND a.${pPersenProgress} = 100`;
        } else if (status === 'pengerjaan') {
          queryStr += ` AND (a.${pPersenProgress} < 100 OR a.${pPersenProgress} IS NULL)`;
        }
      }

      const [rows]: any = await mysqlPool.query(queryStr, [cusCode, startOfYearStr, endOfPeriodStr]);

      let finalData = rows;
      if (!hasPersenProgress) {
        // If there's no persen_progress, filter so that we only count projects that are finished vs in progress comparing with today
        const nowStr = new Date().toISOString().substring(0, 10);
        finalData = rows.filter((r: any) => {
          const dateObj = new Date(r.tgl_proyek);
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
          .replace('?', `'${cusCode}'`)
          .replace('?', `'${startOfYearStr}'`)
          .replace('?', `'${endOfPeriodStr}'`)
      });
      return;
    } catch (err: any) {
      console.log('[Database] Error in proyek-detail query:', err.message);
    }
  }

  // Simulation JSON Fallback
  try {
    const proyekPath = path.join(__dirname, 'data', 'proyek.json');
    if (!fs.existsSync(proyekPath)) {
      res.status(404).json({ error: 'Berkas data proyek tidak ditemukan.' });
      return;
    }

    const proyeks = JSON.parse(fs.readFileSync(proyekPath, 'utf-8'));
    const nowStr = new Date().toISOString().substring(0, 10);
    const filtered = proyeks
      .filter((p: any) => {
        const cCode = p.cus_code || p.Cus_Code;
        const pDate = p.tgl_proyek || p.Tgl_Proyek;
        if (cCode !== cusCode || pDate < startOfYearStr || pDate > endOfPeriodStr) {
          return false;
        }

        const progressVal = p.Persen_Progress !== undefined ? p.Persen_Progress : p.persen_progress;
        const hasPersenProgress = progressVal !== undefined;

        let isSelesai = false;
        if (hasPersenProgress) {
          isSelesai = Number(progressVal) === 100;
        } else {
          isSelesai = pDate <= nowStr;
        }

        if (status === 'selesai' && !isSelesai) return false;
        if (status === 'pengerjaan' && isSelesai) return false;

        return true;
      })
      .map((p: any) => {
        const originalNilaiPro = p.nilai_pro || p.Nilai_Pro || 0;
        const progressVal = p.Persen_Progress !== undefined ? p.Persen_Progress : p.persen_progress;
        const pDate = p.tgl_proyek || p.Tgl_Proyek;
        const rawRap = Math.round(Math.round(originalNilaiPro * 0.9735) * 0.75);
        
        const progressPercent = progressVal !== undefined 
          ? Number(progressVal) 
          : (pDate <= nowStr ? 100 : 0);

        let rap = status === 'pengerjaan' || status === 'semua'
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
      });

    res.json({
      data: filtered,
      source: 'Local JSON File (Simulated SQL)',
      queryExecuted: queryStr.trim()
        .replace('?', `'${cusCode}'`)
        .replace('?', `'${startOfYearStr}'`)
        .replace('?', `'${endOfPeriodStr}'`)
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

  if (mysqlPool && isMySqlOnline) {
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

// CRUD write routes removed because the application is read-only.

// Serve frontend with Vite middlewares in development or compiled folder in production
const isProduction = process.env.NODE_ENV === 'production';

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
  app.use(express.static(path.resolve(__dirname, 'dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`[Server] Laporan Penjualan full-stack server listening on http://localhost:${port}`);
});
