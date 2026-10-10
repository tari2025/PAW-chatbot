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
        catatanBiaya: '',

        /* ============ BARU: DATA CHATBOT ============ */
        chatbot: [
            {
                id: 1,
                pertanyaan: 'Jam buka puskesmas?',
                jawaban: 'Puskesmas buka Senin-Jumat, 08.00-16.00 WIB.',
                kategori: 'jadwal'
            },
            {
                id: 2,
                pertanyaan: 'Bagaimana cara daftar berobat?',
                jawaban: 'Datang langsung ke loket pendaftaran dengan membawa KTP dan BPJS.',
                kategori: 'layanan'
            },
            {
                id: 3,
                pertanyaan: 'Apakah ada layanan vaksin?',
                jawaban: 'Ya, layanan vaksin tersedia setiap hari Selasa dan Kamis.',
                kategori: 'layanan'
            },
            {
                id: 4,
                pertanyaan: 'Berapa biaya rawat jalan?',
                jawaban: 'Rawat jalan untuk pasien umum Rp 15.000, untuk BPJS ditanggung.',
                kategori: 'obat'
            }
        ]
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

    /* ============ BARU: normalisasi chatbot ============ */
    function chatbotRows(v) {
        if (!Array.isArray(v)) return [];
        var usedIds = {};
        var nextId = 1;
        return v.map(function (item) {
            var p = str(item && item.pertanyaan).trim();
            var j = str(item && item.jawaban).trim();
            var k = str(item && item.kategori).trim() || 'umum';
            var id = parseInt(item && item.id, 10);
            if (!id || usedIds[id]) {
                while (usedIds[nextId]) nextId++;
                id = nextId;
            }
            usedIds[id] = true;
            return { id: id, pertanyaan: p, jawaban: j, kategori: k };
        }).filter(function (o) {
            return o.pertanyaan && o.jawaban;
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
            catatanBiaya: str(obj.catatanBiaya).trim(),
            chatbot: chatbotRows(obj.chatbot)   /* <-- BARU */
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

    /* =====================================================
       ============ BARU: API KHUSUS CHATBOT ============
       ===================================================== */

    /**
     * Ambil semua data chatbot.
     */
    function getChatbotList() {
        return load().chatbot || [];
    }

    /**
     * Tambah chatbot baru. Mengembalikan objek chatbot baru,
     * atau null jika gagal.
     */
    function addChatbot(pertanyaan, jawaban, kategori) {
        pertanyaan = str(pertanyaan).trim();
        jawaban    = str(jawaban).trim();
        kategori   = str(kategori).trim() || 'umum';
        if (!pertanyaan || !jawaban) return null;

        var data = load();
        var list = data.chatbot || [];
        var newId = list.length > 0
            ? Math.max.apply(null, list.map(function (c) { return c.id; })) + 1
            : 1;

        var baru = { id: newId, pertanyaan: pertanyaan, jawaban: jawaban, kategori: kategori };
        list.push(baru);
        data.chatbot = list;
        return save(data) ? baru : null;
    }

    /**
     * Update chatbot berdasarkan id.
     */
    function updateChatbot(id, pertanyaan, jawaban, kategori) {
        id = parseInt(id, 10);
        pertanyaan = str(pertanyaan).trim();
        jawaban    = str(jawaban).trim();
        kategori   = str(kategori).trim() || 'umum';
        if (!id || !pertanyaan || !jawaban) return null;

        var data = load();
        var list = data.chatbot || [];
        var found = false;

        list = list.map(function (c) {
            if (c.id === id) {
                found = true;
                return { id: id, pertanyaan: pertanyaan, jawaban: jawaban, kategori: kategori };
            }
            return c;
        });

        if (!found) return null;
        data.chatbot = list;
        return save(data) ? { id: id, pertanyaan: pertanyaan, jawaban: jawaban, kategori: kategori } : null;
    }

    /**
     * Hapus chatbot berdasarkan id.
     */
    function deleteChatbot(id) {
        id = parseInt(id, 10);
        if (!id) return false;

        var data = load();
        var list = data.chatbot || [];
        var before = list.length;
        list = list.filter(function (c) { return c.id !== id; });

        if (list.length === before) return false; // tidak ada yg dihapus
        data.chatbot = list;
        return !!save(data);
    }

    /**
     * Cari chatbot terbaik berdasarkan pertanyaan user.
     * Menggunakan simple scoring (kecocokan kata).
     */
    function findChatbotAnswer(input) {
        input = str(input).trim().toLowerCase();
        if (!input) return null;

        var list = getChatbotList();
        if (!list.length) return null;

        var inputWords = input.split(/\s+/).filter(function (w) { return w.length > 2; });
        if (!inputWords.length) return null;

        var best = null;
        var bestScore = 0;

        list.forEach(function (c) {
            var q = c.pertanyaan.toLowerCase();
            var score = 0;
            inputWords.forEach(function (w) {
                if (q.indexOf(w) !== -1) score++;
            });
            // Bonus jika pertanyaan mengandung seluruh input
            if (q.indexOf(input) !== -1) score += 3;
            if (score > bestScore) {
                bestScore = score;
                best = c;
            }
        });

        // Butuh minimal 1 kata cocok
        return bestScore > 0 ? best : null;
    }

    /* ================== EXPORT ================== */
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
        setPassword: setPassword,

        /* Chatbot API */
        getChatbotList: getChatbotList,
        addChatbot: addChatbot,
        updateChatbot: updateChatbot,
        deleteChatbot: deleteChatbot,
        findChatbotAnswer: findChatbotAnswer
    };
})();