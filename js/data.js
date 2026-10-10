/* =====================================================
   MediChatData - data bersama untuk halaman Informasi & Admin
   Data disimpan di localStorage browser (situs ini statis,
   tanpa backend). Login admin = hash SHA-256 di sisi klien.
   ===================================================== */
(function () {
    'use strict';

    var DATA_KEY = 'medichat_data_v1';
    var PASS_KEY = 'medichat_admin_hash_v1';
    var SESSION_KEY = 'medichat_admin_session_v1';
    var SESSION_MS = 30 * 60 * 1000; // sesi berlaku 30 menit

    // Kredensial bawaan -> username: admin | password: admin123
    // (segera ganti password lewat menu "Akun & Data" di halaman admin)
    var ADMIN_USER = 'admin';
    var DEFAULT_PASS_HASH = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';

    var DEFAULTS = {
        pendaftaran: {
            bpjs: [
                'Siapkan KTP/KK atau kartu identitas lain yang berlaku, dan kartu BPJS.',
                'Datang ke loket pendaftaran. Petugas menanyakan apakah Anda memiliki kartu BPJS.',
                'Petugas memeriksa status kepesertaan dan mencatat kunjungan di aplikasi.'
            ],
            umum: [
                'Siapkan KTP/KK atau kartu identitas lain yang berlaku.',
                'Petugas mencatat Anda sebagai pasien umum, lalu membuatkan Rekam Medik dan Kartu Identitas Berobat (untuk pasien baru).',
                'Petugas membuatkan tanda bukti pelayanan seperti retribusi.',
                'Bayar biaya administrasi, lalu kembali ke bagian pendaftaran.'
            ]
        },
        jadwal: [
            { layanan: 'Dokter Umum', hari: 'Senin - Sabtu', jam: '08.00 - 14.00' },
            { layanan: 'Dokter Gigi', hari: 'Senin - Kamis', jam: '08.00 - 12.00' },
            { layanan: 'Imunisasi', hari: 'Rabu', jam: '08.00 - 11.00' }
        ],
        biaya: [
            { layanan: 'Rawat Jalan', umum: 'Rp 15.000', bpjs: 'Ditanggung BPJS' },
            { layanan: 'Rawat Inap (per hari)', umum: 'Rp 150.000', bpjs: 'Ditanggung BPJS' }
        ],
        catatanJadwal: '',
        catatanBiaya: ''
    };

    function clone(o) { return JSON.parse(JSON.stringify(o)); }
    function str(v) { return typeof v === 'string' ? v : ''; }

    function strList(v) {
        if (!Array.isArray(v)) return [];
        return v.map(function (s) { return str(s).trim(); })
                .filter(Boolean);
    }

    function rows(v, fields) {
        if (!Array.isArray(v)) return [];
        return v.map(function (r) {
            var o = {};
            fields.forEach(function (f) { o[f] = str(r && r[f]).trim(); });
            return o;
        }).filter(function (o) {
            return fields.some(function (f) { return o[f]; });
        });
    }

    // Normalisasi: pastikan struktur & tipe data selalu benar
    function sanitize(obj) {
        if (!obj || typeof obj !== 'object') return null;
        var p = obj.pendaftaran || {};
        return {
            pendaftaran: { bpjs: strList(p.bpjs), umum: strList(p.umum) },
            jadwal: rows(obj.jadwal, ['layanan', 'hari', 'jam']),
            biaya: rows(obj.biaya, ['layanan', 'umum', 'bpjs']),
            catatanJadwal: str(obj.catatanJadwal).trim(),
            catatanBiaya: str(obj.catatanBiaya).trim()
        };
    }

    function load() {
        try {
            var raw = localStorage.getItem(DATA_KEY);
            if (raw) {
                var clean = sanitize(JSON.parse(raw));
                if (clean) return clean;
            }
        } catch (e) { /* abaikan, pakai default */ }
        return clone(DEFAULTS);
    }

    function save(obj) {
        var clean = sanitize(obj);
        if (!clean) return null;
        try {
            localStorage.setItem(DATA_KEY, JSON.stringify(clean));
            return clean;
        } catch (e) {
            return null;
        }
    }

    function reset() {
        try { localStorage.removeItem(DATA_KEY); } catch (e) { /* abaikan */ }
        return clone(DEFAULTS);
    }

    /* ---------- Autentikasi ---------- */
    function sha256(text) {
        if (!window.crypto || !window.crypto.subtle) {
            return Promise.reject(new Error('Browser tidak mendukung crypto.subtle (gunakan https atau localhost).'));
        }
        return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (buf) {
            return Array.prototype.map.call(new Uint8Array(buf), function (b) {
                return ('0' + b.toString(16)).slice(-2);
            }).join('');
        });
    }

    function currentHash() {
        try { return localStorage.getItem(PASS_KEY) || DEFAULT_PASS_HASH; }
        catch (e) { return DEFAULT_PASS_HASH; }
    }

    function verifyPassword(pass) {
        return sha256(pass).then(function (h) { return h === currentHash(); });
    }

    function login(user, pass) {
        if (String(user).trim().toLowerCase() !== ADMIN_USER) {
            // tetap hash agar waktu respons mirip
            return sha256(pass).then(function () { return false; });
        }
        return verifyPassword(pass).then(function (ok) {
            if (ok) {
                try { sessionStorage.setItem(SESSION_KEY, String(Date.now() + SESSION_MS)); } catch (e) { return false; }
            }
            return ok;
        });
    }

    function logout() {
        try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* abaikan */ }
    }

    function isLoggedIn() {
        try {
            var exp = parseInt(sessionStorage.getItem(SESSION_KEY), 10);
            if (exp && Date.now() < exp) return true;
            sessionStorage.removeItem(SESSION_KEY);
        } catch (e) { /* abaikan */ }
        return false;
    }

    function setPassword(newPass) {
        return sha256(newPass).then(function (h) {
            localStorage.setItem(PASS_KEY, h);
        });
    }

    window.MediChatData = {
        defaults: function () { return clone(DEFAULTS); },
        load: load,
        save: save,
        reset: reset,
        sanitize: sanitize,
        login: login,
        logout: logout,
        isLoggedIn: isLoggedIn,
        verifyPassword: verifyPassword,
        setPassword: setPassword
    };
})();
