/* =====================================================
   Logika halaman admin (page/admin.html)
   ===================================================== */
(function () {
    'use strict';

    var D = window.MediChatData;
    var $ = function (sel) { return document.querySelector(sel); };

    var loginView = $('#login-view');
    var dashView = $('#dashboard-view');
    var loginForm = $('#login-form');
    var loginError = $('#login-error');
    var loginBtn = $('#login-btn');
    var dirtyInfo = $('#dirty-info');
    var toastEl = $('#toast');

    var data = null;
    var dirty = false;
    var failed = 0;
    var lockedUntil = 0;
    var toastTimer = null;

    /* ---------- Util ---------- */
    function toast(msg, type) {
        toastEl.textContent = msg;
        toastEl.className = 'toast ' + (type || 'ok');
        toastEl.hidden = false;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toastEl.hidden = true; }, 3500);
    }

    function setDirty(v) {
        dirty = v;
        dirtyInfo.textContent = v
            ? 'Ada perubahan yang belum disimpan.'
            : 'Semua perubahan sudah tersimpan.';
        dirtyInfo.classList.toggle('unsaved', v);
    }

    function lines(text) {
        return text.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
    }

    /* ---------- Tampilan login / dashboard ---------- */
    function showView() {
        var ok = D.isLoggedIn();
        loginView.hidden = ok;
        dashView.hidden = !ok;
        if (ok) {
            data = D.load();
            renderAll();
            setDirty(false);
        } else {
            $('#login-user').focus();
        }
    }

    loginForm.addEventListener('submit', function (e) {
        e.preventDefault();
        loginError.hidden = true;

        var wait = lockedUntil - Date.now();
        if (wait > 0) {
            loginError.textContent = 'Terlalu banyak percobaan. Coba lagi dalam ' + Math.ceil(wait / 1000) + ' detik.';
            loginError.hidden = false;
            return;
        }

        loginBtn.disabled = true;
        D.login($('#login-user').value, $('#login-pass').value).then(function (ok) {
            if (ok) {
                failed = 0;
                $('#login-pass').value = '';
                showView();
            } else {
                failed++;
                if (failed >= 5) {
                    lockedUntil = Date.now() + 30000;
                    failed = 0;
                    loginError.textContent = 'Terlalu banyak percobaan. Tunggu 30 detik.';
                } else {
                    loginError.textContent = 'Username atau password salah.';
                }
                loginError.hidden = false;
            }
        }).catch(function (err) {
            loginError.textContent = err.message || 'Terjadi kesalahan saat login.';
            loginError.hidden = false;
        }).then(function () {
            loginBtn.disabled = false;
        });
    });

    $('#btn-logout').addEventListener('click', function () {
        if (dirty && !confirm('Ada perubahan yang belum disimpan. Tetap keluar?')) return;
        D.logout();
        setDirty(false);
        showView();
    });

    /* ---------- Tab ---------- */
    document.querySelectorAll('.tab-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.tab-btn').forEach(function (b) {
                b.classList.toggle('active', b === btn);
            });
            document.querySelectorAll('.tab-panel').forEach(function (p) {
                p.hidden = p.id !== 'tab-' + btn.dataset.tab;
            });
        });
    });

    /* ---------- Editor tabel (jadwal & biaya) ---------- */
    function renderRows(tbodySel, key, fields) {
        var tbody = $(tbodySel);
        tbody.innerHTML = '';

        data[key].forEach(function (row, i) {
            var tr = document.createElement('tr');

            fields.forEach(function (f) {
                var td = document.createElement('td');
                var inp = document.createElement('input');
                inp.type = 'text';
                inp.value = row[f];
                inp.setAttribute('aria-label', f + ' baris ' + (i + 1));
                inp.addEventListener('input', function () {
                    row[f] = inp.value;
                    setDirty(true);
                });
                td.appendChild(inp);
                tr.appendChild(td);
            });

            var tdAksi = document.createElement('td');
            tdAksi.className = 'col-aksi';
            var del = document.createElement('button');
            del.type = 'button';
            del.className = 'admin-btn danger small';
            del.textContent = 'Hapus';
            del.addEventListener('click', function () {
                data[key].splice(i, 1);
                setDirty(true);
                renderRows(tbodySel, key, fields);
            });
            tdAksi.appendChild(del);
            tr.appendChild(tdAksi);

            tbody.appendChild(tr);
        });

        if (!data[key].length) {
            var empty = document.createElement('tr');
            var td = document.createElement('td');
            td.colSpan = fields.length + 1;
            td.className = 'admin-muted';
            td.textContent = 'Belum ada data. Klik "+ Tambah Baris".';
            empty.appendChild(td);
            tbody.appendChild(empty);
        }
    }

    function addRow(tbodySel, key, fields) {
        var row = {};
        fields.forEach(function (f) { row[f] = ''; });
        data[key].push(row);
        setDirty(true);
        renderRows(tbodySel, key, fields);
        var inputs = $(tbodySel).querySelectorAll('tr:last-child input');
        if (inputs.length) inputs[0].focus();
    }

    var JADWAL_FIELDS = ['layanan', 'hari', 'jam'];
    var BIAYA_FIELDS = ['layanan', 'umum', 'bpjs'];

    $('#add-jadwal').addEventListener('click', function () { addRow('#tbody-jadwal', 'jadwal', JADWAL_FIELDS); });
    $('#add-biaya').addEventListener('click', function () { addRow('#tbody-biaya', 'biaya', BIAYA_FIELDS); });

    /* ---------- Render semua ---------- */
    function renderAll() {
        $('#area-bpjs').value = data.pendaftaran.bpjs.join('\n');
        $('#area-umum').value = data.pendaftaran.umum.join('\n');
        $('#note-jadwal').value = data.catatanJadwal;
        $('#note-biaya').value = data.catatanBiaya;
        renderRows('#tbody-jadwal', 'jadwal', JADWAL_FIELDS);
        renderRows('#tbody-biaya', 'biaya', BIAYA_FIELDS);
    }

    $('#area-bpjs').addEventListener('input', function (e) {
        data.pendaftaran.bpjs = lines(e.target.value);
        setDirty(true);
    });
    $('#area-umum').addEventListener('input', function (e) {
        data.pendaftaran.umum = lines(e.target.value);
        setDirty(true);
    });
    $('#note-jadwal').addEventListener('input', function (e) {
        data.catatanJadwal = e.target.value;
        setDirty(true);
    });
    $('#note-biaya').addEventListener('input', function (e) {
        data.catatanBiaya = e.target.value;
        setDirty(true);
    });

    /* ---------- Simpan ---------- */
    $('#btn-save').addEventListener('click', function () {
        if (!D.isLoggedIn()) {
            toast('Sesi berakhir, silakan login ulang.', 'err');
            showView();
            return;
        }
        var saved = D.save(data);
        if (!saved) {
            toast('Gagal menyimpan data (penyimpanan browser penuh/diblokir).', 'err');
            return;
        }
        data = saved;
        renderAll();
        setDirty(false);
        toast('Perubahan berhasil disimpan.');
    });

    /* ---------- Ganti password ---------- */
    $('#pass-form').addEventListener('submit', function (e) {
        e.preventDefault();
        var oldP = $('#pass-old').value;
        var newP = $('#pass-new').value;
        var newP2 = $('#pass-new2').value;

        if (newP.length < 8) { toast('Password baru minimal 8 karakter.', 'err'); return; }
        if (newP !== newP2) { toast('Konfirmasi password tidak sama.', 'err'); return; }

        D.verifyPassword(oldP).then(function (ok) {
            if (!ok) { toast('Password saat ini salah.', 'err'); return; }
            return D.setPassword(newP).then(function () {
                $('#pass-form').reset();
                toast('Password berhasil diubah.');
            });
        }).catch(function (err) {
            toast(err.message || 'Gagal mengubah password.', 'err');
        });
    });

    /* ---------- Ekspor / impor / reset ---------- */
    $('#btn-export').addEventListener('click', function () {
        var blob = new Blob([JSON.stringify(D.sanitize(data), null, 2)], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'medichat-data.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    });

    $('#file-import').addEventListener('change', function (e) {
        var file = e.target.files[0];
        e.target.value = '';
        if (!file) return;
        if (file.size > 1024 * 1024) { toast('File terlalu besar (maks. 1 MB).', 'err'); return; }

        var reader = new FileReader();
        reader.onload = function () {
            try {
                var clean = D.sanitize(JSON.parse(reader.result));
                if (!clean) throw new Error('format');
                if (!confirm('Impor akan menimpa data yang sedang diedit. Lanjutkan?')) return;
                data = clean;
                renderAll();
                setDirty(true);
                toast('File dimuat. Klik "Simpan Perubahan" untuk menerapkan.');
            } catch (err) {
                toast('File JSON tidak valid.', 'err');
            }
        };
        reader.readAsText(file);
    });

    $('#btn-reset').addEventListener('click', function () {
        if (!confirm('Kembalikan semua data ke versi awal? Perubahan yang pernah disimpan akan hilang.')) return;
        data = D.reset();
        renderAll();
        setDirty(false);
        toast('Data dikembalikan ke versi awal.');
    });

    window.addEventListener('beforeunload', function (e) {
        if (dirty) { e.preventDefault(); e.returnValue = ''; }
    });

    showView();
})();
