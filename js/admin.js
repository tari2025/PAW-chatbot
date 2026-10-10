/* ============================================================
   admin.js - Logika dashboard admin Puskesmas
   + Fitur Upload / Backup / Template Chatbot
   ============================================================ */
(function () {
    'use strict';

    const D = window.MediChatData;
    if (!D) { alert('data.js belum dimuat'); return; }

    const $  = (s) => document.querySelector(s);
    const $$ = (s) => document.querySelectorAll(s);

    const KEYS = {
        layanan: 'medichat_layanan_v1',
        jadwalAdmin: 'medichat_jadwal_admin_v1',
        info: 'medichat_info_v1'
    };

    function loadLocal(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) { return fallback; }
    }
    function saveLocal(key, val) {
        try { localStorage.setItem(key, JSON.stringify(val)); return true; }
        catch (e) { return false; }
    }
    function escapeHtml(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    let dataLayanan = loadLocal(KEYS.layanan, [
        { nama: 'Rawat Jalan', deskripsi: 'Pelayanan pemeriksaan umum oleh dokter.' },
        { nama: 'Rawat Inap',  deskripsi: 'Pelayanan rawat inap untuk pasien.' }
    ]);
    let dataJadwal = loadLocal(KEYS.jadwalAdmin, [
        { nama: 'dr. Andi', spesialis: 'Dokter Umum', hari: 'Senin', mulai: '08:00', selesai: '14:00' }
    ]);
    let dataInfo = loadLocal(KEYS.info, [
        { nama: 'Visi Puskesmas', alamat: 'Menjadi puskesmas unggulan.', telepon: 'umum' }
    ]);

    let notifTimer = null;
    function notif(msg, type) {
        const el = $('#notif');
        if (!el) return alert(msg);
        el.textContent = msg;
        el.className = 'notif ' + (type === 'err' ? 'err' : '');
        el.style.display = 'block';
        clearTimeout(notifTimer);
        notifTimer = setTimeout(() => { el.style.display = 'none'; }, 3000);
    }

    /* ===== LOGIN / LOGOUT ===== */
    const loginSection = $('#loginSection');
    const dashboardSection = $('#dashboardSection');
    const loginForm = $('#loginForm');
    const errorMsg = $('#errorMsg');
    const btnLogin = $('#btnLogin');

    function showView() {
        const ok = D.isLoggedIn();
        loginSection.style.display = ok ? 'none' : 'block';
        dashboardSection.style.display = ok ? 'block' : 'none';
        if (!ok) {
            const u = $('#username');
            if (u) u.focus();
        } else {
            renderSemua();
        }
    }

    if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
            e.preventDefault();
            errorMsg.style.display = 'none';
            btnLogin.disabled = true;
            btnLogin.textContent = 'Memproses...';

            D.login($('#username').value, $('#password').value)
                .then(function (ok) {
                    if (ok) {
                        $('#password').value = '';
                        showView();
                    } else {
                        errorMsg.textContent = 'Username atau password salah!';
                        errorMsg.style.display = 'block';
                    }
                })
                .catch(function (err) {
                    errorMsg.textContent = err.message || 'Login gagal.';
                    errorMsg.style.display = 'block';
                })
                .then(function () {
                    btnLogin.disabled = false;
                    btnLogin.textContent = 'Login';
                });
        });
    }

    const btnLogout = $('#btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', function () {
            if (!confirm('Yakin ingin logout?')) return;
            D.logout();
            showView();
        });
    }

    /* ===== NAVIGASI SIDEBAR ===== */
    $$('.menu-item').forEach(function (item) {
        item.addEventListener('click', function () {
            const target = item.dataset.section;
            $$('.menu-item').forEach((c) => c.classList.toggle('active', c === item));
            $$('.section-box').forEach((s) => {
                s.classList.toggle('active', s.id === 'section-' + target);
            });
        });
    });

    /* ===== LAYANAN ===== */
    function renderLayanan(filter) {
        const list = $('#listLayanan');
        if (!list) return;
        const q = (filter || '').toLowerCase().trim();
        const filtered = dataLayanan.filter(function (item) {
            if (!q) return true;
            return (item.nama || '').toLowerCase().includes(q) ||
                   (item.deskripsi || '').toLowerCase().includes(q);
        });
        if (!filtered.length) {
            list.innerHTML = '<div class="empty-msg">Belum ada data layanan.</div>';
            return;
        }
        list.innerHTML = filtered.map(function (item) {
            const i = dataLayanan.indexOf(item);
            return '<div class="data-item"><div class="info"><b>' + escapeHtml(item.nama) +
                '</b><small>' + escapeHtml(item.deskripsi || '-') + '</small></div><div>' +
                '<button class="btn-sm btn-edit" data-act="edit-layanan" data-idx="' + i + '">✏️ Edit</button> ' +
                '<button class="btn-sm btn-hapus" data-act="hapus-layanan" data-idx="' + i + '">🗑️ Hapus</button>' +
                '</div></div>';
        }).join('');
    }
    function resetFormLayanan() {
        $('#editIndexLayanan').value = '';
        $('#namaLayanan').value = '';
        $('#deskripsiLayanan').value = '';
        $('#btnSimpanLayanan').textContent = 'Tambah Layanan';
        $('#btnBatalLayanan').hidden = true;
    }
    function simpanLayanan() {
        const idx = $('#editIndexLayanan').value;
        const nama = $('#namaLayanan').value.trim();
        const deskripsi = $('#deskripsiLayanan').value.trim();
        if (!nama) { notif('Nama layanan wajib diisi!', 'err'); return; }
        if (idx === '') {
            dataLayanan.push({ nama, deskripsi });
            notif('✅ Layanan ditambahkan.');
        } else {
            dataLayanan[parseInt(idx, 10)] = { nama, deskripsi };
            notif('✅ Layanan diperbarui.');
        }
        saveLocal(KEYS.layanan, dataLayanan);
        resetFormLayanan();
        renderLayanan($('#searchLayanan').value);
    }
    function editLayanan(idx) {
        const item = dataLayanan[idx]; if (!item) return;
        $('#editIndexLayanan').value = idx;
        $('#namaLayanan').value = item.nama;
        $('#deskripsiLayanan').value = item.deskripsi || '';
        $('#btnSimpanLayanan').textContent = 'Perbarui Layanan';
        $('#btnBatalLayanan').hidden = false;
        $('#namaLayanan').focus();
    }
    function hapusLayanan(idx) {
        if (!confirm('Hapus layanan ini?')) return;
        dataLayanan.splice(idx, 1);
        saveLocal(KEYS.layanan, dataLayanan);
        renderLayanan($('#searchLayanan').value);
        notif('🗑️ Layanan dihapus.');
    }

    /* ===== JADWAL ===== */
    function renderJadwal(filter) {
        const list = $('#listJadwal');
        if (!list) return;
        const q = (filter || '').toLowerCase().trim();
        const filtered = dataJadwal.filter(function (item) {
            if (!q) return true;
            return (item.nama || '').toLowerCase().includes(q) ||
                   (item.spesialis || '').toLowerCase().includes(q) ||
                   (item.hari || '').toLowerCase().includes(q);
        });
        if (!filtered.length) {
            list.innerHTML = '<div class="empty-msg">Belum ada jadwal.</div>';
            return;
        }
        list.innerHTML = filtered.map(function (item) {
            const i = dataJadwal.indexOf(item);
            return '<div class="data-item"><div class="info"><b>' + escapeHtml(item.nama) +
                '</b><span class="badge">' + escapeHtml(item.spesialis) + '</span>' +
                '<small>📅 ' + escapeHtml(item.hari) + ' • 🕐 ' + escapeHtml(item.mulai) + ' - ' + escapeHtml(item.selesai) + '</small>' +
                '</div><div><button class="btn-sm btn-edit" data-act="edit-jadwal" data-idx="' + i + '">✏️ Edit</button> ' +
                '<button class="btn-sm btn-hapus" data-act="hapus-jadwal" data-idx="' + i + '">🗑️ Hapus</button></div></div>';
        }).join('');
    }
    function resetFormJadwal() {
        $('#editIndexJadwal').value = '';
        $('#namaDokter').value = '';
        $('#spesialis').value = '';
        $('#hari').value = '';
        $('#jamMulai').value = '';
        $('#jamSelesai').value = '';
        $('#btnSimpanJadwal').textContent = 'Tambah Jadwal';
        $('#btnBatalJadwal').hidden = true;
    }
    function simpanJadwal() {
        const idx = $('#editIndexJadwal').value;
        const nama = $('#namaDokter').value.trim();
        const spesialis = $('#spesialis').value.trim();
        const hari = $('#hari').value.trim();
        const mulai = $('#jamMulai').value;
        const selesai = $('#jamSelesai').value;
        if (!nama || !hari) { notif('Nama & hari wajib!', 'err'); return; }
        const row = { nama, spesialis, hari, mulai, selesai };
        if (idx === '') { dataJadwal.push(row); notif('✅ Jadwal ditambahkan.'); }
        else { dataJadwal[parseInt(idx, 10)] = row; notif('✅ Jadwal diperbarui.'); }
        saveLocal(KEYS.jadwalAdmin, dataJadwal);
        resetFormJadwal();
        renderJadwal($('#searchJadwal').value);
    }
    function editJadwal(idx) {
        const item = dataJadwal[idx]; if (!item) return;
        $('#editIndexJadwal').value = idx;
        $('#namaDokter').value = item.nama;
        $('#spesialis').value = item.spesialis || '';
        $('#hari').value = item.hari || '';
        $('#jamMulai').value = item.mulai || '';
        $('#jamSelesai').value = item.selesai || '';
        $('#btnSimpanJadwal').textContent = 'Perbarui Jadwal';
        $('#btnBatalJadwal').hidden = false;
        $('#namaDokter').focus();
    }
    function hapusJadwal(idx) {
        if (!confirm('Hapus jadwal ini?')) return;
        dataJadwal.splice(idx, 1);
        saveLocal(KEYS.jadwalAdmin, dataJadwal);
        renderJadwal($('#searchJadwal').value);
        notif('🗑️ Jadwal dihapus.');
    }

    /* ===== INFO ===== */
    function renderInfo(filter) {
        const list = $('#listInfo');
        if (!list) return;
        const q = (filter || '').toLowerCase().trim();
        const filtered = dataInfo.filter(function (item) {
            if (!q) return true;
            return (item.nama || '').toLowerCase().includes(q) ||
                   (item.alamat || '').toLowerCase().includes(q) ||
                   (item.telepon || '').toLowerCase().includes(q);
        });
        if (!filtered.length) {
            list.innerHTML = '<div class="empty-msg">Belum ada informasi.</div>';
            return;
        }
        list.innerHTML = filtered.map(function (item) {
            const i = dataInfo.indexOf(item);
            return '<div class="data-item"><div class="info"><b>' + escapeHtml(item.nama) +
                '</b><span class="badge">' + escapeHtml(item.telepon || 'umum') + '</span>' +
                '<small>' + escapeHtml(item.alamat || '-') + '</small></div><div>' +
                '<button class="btn-sm btn-edit" data-act="edit-info" data-idx="' + i + '">✏️ Edit</button> ' +
                '<button class="btn-sm btn-hapus" data-act="hapus-info" data-idx="' + i + '">🗑️ Hapus</button></div></div>';
        }).join('');
    }
    function resetFormInfo() {
        $('#editIndexInfo').value = '';
        $('#namaRS').value = '';
        $('#alamatRS').value = '';
        $('#teleponRS').value = '';
        $('#btnSimpanInfo').textContent = 'Tambah Informasi';
        $('#btnBatalInfo').hidden = true;
    }
    function simpanInfo() {
        const idx = $('#editIndexInfo').value;
        const nama = $('#namaRS').value.trim();
        const alamat = $('#alamatRS').value.trim();
        const telepon = $('#teleponRS').value.trim();
        if (!nama) { notif('Judul wajib!', 'err'); return; }
        const row = { nama, alamat, telepon };
        if (idx === '') { dataInfo.push(row); notif('✅ Info ditambahkan.'); }
        else { dataInfo[parseInt(idx, 10)] = row; notif('✅ Info diperbarui.'); }
        saveLocal(KEYS.info, dataInfo);
        resetFormInfo();
        renderInfo($('#searchInfo').value);
    }
    function editInfo(idx) {
        const item = dataInfo[idx]; if (!item) return;
        $('#editIndexInfo').value = idx;
        $('#namaRS').value = item.nama;
        $('#alamatRS').value = item.alamat || '';
        $('#teleponRS').value = item.telepon || '';
        $('#btnSimpanInfo').textContent = 'Perbarui Informasi';
        $('#btnBatalInfo').hidden = false;
        $('#namaRS').focus();
    }
    function hapusInfo(idx) {
        if (!confirm('Hapus info ini?')) return;
        dataInfo.splice(idx, 1);
        saveLocal(KEYS.info, dataInfo);
        renderInfo($('#searchInfo').value);
        notif('🗑️ Info dihapus.');
    }

    /* ===== CHATBOT ===== */
    function normalizeChatbot(c) {
        return {
            id: c.id,
            judul: c.judul || c.pertanyaan || '',
            kategori: c.kategori || 'umum',
            deskripsi: c.deskripsi || c.jawaban || ''
        };
    }
    function renderChatbot(filter) {
        const list = $('#listChatbot');
        if (!list) return;
        const q = (filter || '').toLowerCase().trim();

        const all = D.getChatbotList().map(normalizeChatbot);
        const filtered = all.filter(function (item) {
            if (!q) return true;
            return (item.judul || '').toLowerCase().includes(q) ||
                   (item.deskripsi || '').toLowerCase().includes(q) ||
                   (item.kategori || '').toLowerCase().includes(q);
        });

        if (!filtered.length) {
            list.innerHTML = '<div class="empty-msg">Belum ada data chatbot.</div>';
            return;
        }

        list.innerHTML = filtered.map(function (item) {
            return '<div class="data-item"><div class="info"><b>📌 ' + escapeHtml(item.judul) +
                '</b><span class="badge">' + escapeHtml(item.kategori) + '</span>' +
                '<small>💬 ' + escapeHtml(item.deskripsi) + '</small></div><div>' +
                '<button class="btn-sm btn-edit" data-act="edit-chatbot" data-id="' + item.id + '">✏️ Edit</button> ' +
                '<button class="btn-sm btn-hapus" data-act="hapus-chatbot" data-id="' + item.id + '">🗑️ Hapus</button></div></div>';
        }).join('');
    }
    function resetFormChatbot() {
        $('#editIndexChatbot').value = '';
        $('#judulChatbot').value = '';
        $('#kategoriChatbot').value = 'umum';
        $('#deskripsiChatbot').value = '';
        $('#btnSimpanChatbot').textContent = 'Tambah Chatbot';
        $('#btnBatalChatbot').hidden = true;
    }
    function simpanChatbot() {
        const idField   = $('#editIndexChatbot').value;
        const judul     = $('#judulChatbot').value.trim();
        const kategori  = $('#kategoriChatbot').value;
        const deskripsi = $('#deskripsiChatbot').value.trim();

        if (!judul || !deskripsi) {
            notif('Judul & deskripsi wajib diisi!', 'err');
            return;
        }

        if (idField === '') {
            const baru = D.addChatbot(judul, deskripsi, kategori);
            if (!baru) { notif('Gagal menambah chatbot.', 'err'); return; }
            notif('✅ Chatbot ditambahkan.');
        } else {
            const ok = D.updateChatbot(parseInt(idField, 10), judul, deskripsi, kategori);
            if (!ok) { notif('Gagal memperbarui chatbot.', 'err'); return; }
            notif('✅ Chatbot diperbarui.');
        }

        resetFormChatbot();
        renderChatbot($('#searchChatbot').value);
    }
    function editChatbot(id) {
        const raw = D.getChatbotList().find((c) => c.id === id);
        if (!raw) return;
        const item = normalizeChatbot(raw);
        $('#editIndexChatbot').value = item.id;
        $('#judulChatbot').value = item.judul;
        $('#kategoriChatbot').value = item.kategori;
        $('#deskripsiChatbot').value = item.deskripsi;
        $('#btnSimpanChatbot').textContent = 'Perbarui Chatbot';
        $('#btnBatalChatbot').hidden = false;
        $('#judulChatbot').focus();
    }
    function hapusChatbot(id) {
        const raw = D.getChatbotList().find((c) => c.id === id);
        if (!raw) return;
        const item = normalizeChatbot(raw);
        if (!confirm('Hapus chatbot: "' + item.judul + '"?')) return;
        if (D.deleteChatbot(id)) {
            renderChatbot($('#searchChatbot').value);
            notif('🗑️ Chatbot dihapus.');
        } else {
            notif('Gagal menghapus chatbot.', 'err');
        }
    }

    /* ============================================================
       UPLOAD / EXPORT CHATBOT  (BARU)
       ============================================================ */

    function getTemplateChatbot() {
        return [
            { judul: "Jam Buka Puskesmas", kategori: "jadwal", deskripsi: "Puskesmas buka Senin-Jumat, 08.00-16.00 WIB." },
            { judul: "Cara Daftar Berobat", kategori: "layanan", deskripsi: "Datang ke loket dengan membawa KTP dan BPJS." }
        ];
    }

    function downloadFile(content, filename, mime) {
        const blob = new Blob([content], { type: mime });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }

    /* Tombol: Download Template */
    if ($('#btnTemplate')) {
        $('#btnTemplate').addEventListener('click', function () {
            downloadFile(
                JSON.stringify(getTemplateChatbot(), null, 2),
                'template-chatbot.json',
                'application/json'
            );
            notif('📄 Template berhasil di-download.');
        });
    }

    /* Tombol: Backup Data Chatbot */
    if ($('#btnExportChatbot')) {
        $('#btnExportChatbot').addEventListener('click', function () {
            const data = D.getChatbotList().map(normalizeChatbot);
            if (!data.length) {
                notif('Belum ada data untuk di-backup.', 'err');
                return;
            }
            const clean = data.map(c => ({
                judul: c.judul,
                kategori: c.kategori,
                deskripsi: c.deskripsi
            }));
            downloadFile(
                JSON.stringify(clean, null, 2),
                'chatbot-backup-' + Date.now() + '.json',
                'application/json'
            );
            notif('💾 Backup berhasil di-download.');
        });
    }

    /* Parser CSV sederhana */
    function parseCSV(text) {
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) return [];
        const delimiter = lines[0].indexOf(';') > -1 ? ';' : ',';
        const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase());
        const idxJudul     = headers.findIndex(h => h.includes('judul') || h.includes('pertanyaan'));
        const idxKategori  = headers.findIndex(h => h.includes('kategori'));
        const idxDeskripsi = headers.findIndex(h => h.includes('deskripsi') || h.includes('jawaban'));
        if (idxJudul < 0 || idxDeskripsi < 0) return [];
        const result = [];
        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));
            const judul = cols[idxJudul] || '';
            const kategori = idxKategori >= 0 ? (cols[idxKategori] || 'umum') : 'umum';
            const deskripsi = cols[idxDeskripsi] || '';
            if (judul && deskripsi) result.push({ judul, kategori, deskripsi });
        }
        return result;
    }

    /* Handler Upload File */
    if ($('#fileChatbot')) {
        $('#fileChatbot').addEventListener('change', function (e) {
            const file = e.target.files[0];
            e.target.value = '';
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) {
                notif('File terlalu besar (maks. 2 MB).', 'err');
                return;
            }

            const reader = new FileReader();
            reader.onload = function (ev) {
                try {
                    const text = ev.target.result;
                    let items = [];

                    if (file.name.toLowerCase().endsWith('.json') ||
                        text.trim().startsWith('[') ||
                        text.trim().startsWith('{')) {
                        let parsed = JSON.parse(text);
                        if (!Array.isArray(parsed)) {
                            if (parsed.chatbot && Array.isArray(parsed.chatbot)) parsed = parsed.chatbot;
                            else parsed = [parsed];
                        }
                        items = parsed.map(p => ({
                            judul: (p.judul || p.pertanyaan || '').toString().trim(),
                            kategori: (p.kategori || 'umum').toString().trim(),
                            deskripsi: (p.deskripsi || p.jawaban || '').toString().trim()
                        })).filter(p => p.judul && p.deskripsi);
                    } else {
                        items = parseCSV(text);
                    }

                    if (!items.length) {
                        notif('Tidak ada data valid di file.', 'err');
                        return;
                    }

                    if (!confirm('Ditemukan ' + items.length + ' data chatbot.\n\nOK = TAMBAH ke daftar yang ada.\nCancel = GANTI SEMUA data lama.')) {
                        if (!confirm('Ganti SEMUA data chatbot dengan data baru? Data lama akan hilang.')) {
                            return;
                        }
                        const lama = D.getChatbotList();
                        lama.forEach(c => D.deleteChatbot(c.id));
                    }

                    let sukses = 0;
                    items.forEach(item => {
                        const hasil = D.addChatbot(item.judul, item.deskripsi, item.kategori);
                        if (hasil) sukses++;
                    });

                    renderChatbot($('#searchChatbot').value);
                    notif('✅ ' + sukses + ' data chatbot berhasil di-upload.');
                } catch (err) {
                    notif('File tidak valid: ' + err.message, 'err');
                }
            };
            reader.readAsText(file);
        });
    }

    /* ===== EVENT DELEGATION ===== */
    document.addEventListener('click', function (e) {
        const btn = e.target.closest('button[data-act]');
        if (!btn) return;
        const act = btn.dataset.act;
        const idx = btn.dataset.idx !== undefined ? parseInt(btn.dataset.idx, 10) : null;
        const id  = btn.dataset.id  !== undefined ? parseInt(btn.dataset.id, 10)  : null;

        if (act === 'edit-layanan')  editLayanan(idx);
        if (act === 'hapus-layanan') hapusLayanan(idx);
        if (act === 'edit-jadwal')   editJadwal(idx);
        if (act === 'hapus-jadwal')  hapusJadwal(idx);
        if (act === 'edit-info')     editInfo(idx);
        if (act === 'hapus-info')    hapusInfo(idx);
        if (act === 'edit-chatbot')  editChatbot(id);
        if (act === 'hapus-chatbot') hapusChatbot(id);
    });

    /* ===== TOMBOL ===== */
    if ($('#btnSimpanLayanan')) $('#btnSimpanLayanan').addEventListener('click', simpanLayanan);
    if ($('#btnBatalLayanan'))  $('#btnBatalLayanan').addEventListener('click', resetFormLayanan);
    if ($('#btnSimpanJadwal'))  $('#btnSimpanJadwal').addEventListener('click', simpanJadwal);
    if ($('#btnBatalJadwal'))   $('#btnBatalJadwal').addEventListener('click', resetFormJadwal);
    if ($('#btnSimpanInfo'))    $('#btnSimpanInfo').addEventListener('click', simpanInfo);
    if ($('#btnBatalInfo'))     $('#btnBatalInfo').addEventListener('click', resetFormInfo);
    if ($('#btnSimpanChatbot')) $('#btnSimpanChatbot').addEventListener('click', simpanChatbot);
    if ($('#btnBatalChatbot'))  $('#btnBatalChatbot').addEventListener('click', resetFormChatbot);

    /* ===== SEARCH ===== */
    if ($('#searchLayanan')) $('#searchLayanan').addEventListener('input', (e) => renderLayanan(e.target.value));
    if ($('#searchJadwal'))  $('#searchJadwal').addEventListener('input',  (e) => renderJadwal(e.target.value));
    if ($('#searchInfo'))    $('#searchInfo').addEventListener('input',    (e) => renderInfo(e.target.value));
    if ($('#searchChatbot')) $('#searchChatbot').addEventListener('input', (e) => renderChatbot(e.target.value));

    /* ===== RENDER SEMUA ===== */
    function renderSemua() {
        renderLayanan('');
        renderJadwal('');
        renderInfo('');
        renderChatbot('');
    }

    /* ===== INIT ===== */
    showView();
})();