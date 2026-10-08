-- ==========================================================
-- SQL Schema untuk Aplikasi Dashboard CRUD Data Penjualan
-- ==========================================================

-- 1. Buat Database (Jika belum ada)
CREATE DATABASE IF NOT EXISTS db_penjualan;
USE db_penjualan;

-- 2. Buat Tabel `penjualan`
-- Sesuai dengan spesifikasi teknis:
CREATE TABLE IF NOT EXISTS penjualan (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tanggal DATE NOT NULL,
  nama_produk VARCHAR(255) NOT NULL,
  kategori VARCHAR(100) NOT NULL,
  jumlah_terjual INT NOT NULL,
  harga_satuan DECIMAL(15, 2) NOT NULL,
  total_harga DECIMAL(15, 2) GENERATED ALWAYS AS (jumlah_terjual * harga_satuan) STORED,
  nama_customer VARCHAR(255) DEFAULT 'Umum',
  nama_proyek VARCHAR(255) DEFAULT 'Non-Proyek',
  INDEX (tanggal),
  INDEX (kategori),
  INDEX (nama_customer),
  INDEX (nama_proyek)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Memasukkan Data Awal (Seed Data) untuk Tabel `penjualan`
INSERT INTO penjualan (tanggal, nama_produk, kategori, jumlah_terjual, harga_satuan, nama_customer, nama_proyek) VALUES
('2026-09-15', 'Kopi Arabika Toraja 250g', 'Kopi', 15, 85000.00, 'PT Sinar Abadi', 'Operasional Kantor'),
('2026-09-18', 'Susu Oat Barista Edition 1L', 'Minuman', 24, 45000.00, 'Kafe Kopi Kita', 'Suplai Bulanan'),
('2026-09-20', 'Teh Matcha Premium Uji 100g', 'Teh', 8, 120000.00, 'Hotel Grand Kemang', 'Restock Kafe'),
('2026-09-22', 'Sirup Vanila Gourmet 750ml', 'Bahan Baku', 12, 95000.00, 'Kafe Kopi Kita', 'Suplai Bulanan'),
('2026-09-25', 'Kopi Robusta Temanggung 500g', 'Kopi', 30, 60000.00, 'Kafe Kopi Kita', 'Suplai Bulanan'),
('2026-09-28', 'Cokelat Bubuk Organik 1kg', 'Bahan Baku', 10, 150000.00, 'Bakeri Citra Rasa', 'Produksi Kue'),
('2026-10-01', 'Susu Almond Unsweetened 1L', 'Minuman', 18, 48000.00, 'Hotel Grand Kemang', 'Restock Kafe');


-- ==========================================================
-- MODUL BARU: Skema Tambahan untuk Laporan Penjualan Per Customer
-- Berdasarkan query spesifik proyek & mas_customer
-- ==========================================================

-- 4. Buat Tabel `mas_customer`
CREATE TABLE IF NOT EXISTS mas_customer (
  Cus_Code VARCHAR(50) PRIMARY KEY,
  Cus_Name VARCHAR(255) NOT NULL,
  PKP CHAR(1) DEFAULT 'N',
  INDEX (Cus_Name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Buat Tabel `proyek`
CREATE TABLE IF NOT EXISTS proyek (
  id INT AUTO_INCREMENT PRIMARY KEY,
  Cus_Code VARCHAR(50) NOT NULL,
  Tgl_Proyek DATE NOT NULL,
  Nilai_Pro DECIMAL(15, 2) NOT NULL,
  INDEX (Cus_Code),
  INDEX (Tgl_Proyek),
  FOREIGN KEY (Cus_Code) REFERENCES mas_customer(Cus_Code) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Masukkan Data Awal untuk `mas_customer`
INSERT INTO mas_customer (Cus_Code, Cus_Name, PKP) VALUES
('C001', 'PT Sinar Abadi', 'Y'),
('C002', 'Kafe Kopi Kita', 'Y'),
('C003', 'Hotel Grand Kemang', 'Y'),
('C004', 'Bakeri Citra Rasa', 'N'),
('C005', 'Distributor Agung', 'Y');

-- 7. Masukkan Data Awal untuk `proyek`
INSERT INTO proyek (Cus_Code, Tgl_Proyek, Nilai_Pro) VALUES
('C001', '2026-03-15', 120000000.00),
('C001', '2026-06-20', 45000000.00),
('C002', '2026-04-10', 85000000.00),
('C003', '2026-08-05', 150000000.00),
('C004', '2026-05-12', 95000000.00), -- Di-filter keluar karena PKP = 'N'
('C005', '2026-11-20', 200000000.00); -- Di-filter keluar karena tanggal proyek di luar kisaran '2026-01-01' s/d '2026-09-30'

-- 8. Uji Query Laporan Penjualan Per Customer:
-- SELECT 
--     a.Cus_Code, 
--     b.Cus_Name, 
--     SUM(a.Nilai_Pro * 97.35/100) AS totpro 
-- FROM proyek AS a
-- INNER JOIN mas_customer AS b 
--     ON a.Cus_Code = b.Cus_Code 
-- WHERE a.Tgl_Proyek BETWEEN '2026-01-01' AND '2026-09-30'
--   AND b.PKP = 'Y'
-- GROUP BY a.Cus_Code, b.Cus_Name ORDER BY b.Cus_Name;
