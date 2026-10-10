// ============================================================
// KELOLA CHATBOT - Admin Puskesmas
// File: js/chatbot-admin.js
// ============================================================

// Data awal (bisa nanti diganti ambil dari API/database)
let dataChatbot = JSON.parse(localStorage.getItem('dataChatbot')) || [
  {
    id: 1,
    pertanyaan: "Jam buka puskesmas?",
    jawaban: "Puskesmas buka Senin-Jumat, 08.00-16.00 WIB.",
    kategori: "jadwal"
  },
  {
    id: 2,
    pertanyaan: "Bagaimana cara daftar berobat?",
    jawaban: "Datang langsung ke loket pendaftaran dengan membawa KTP dan BPJS.",
    kategori: "layanan"
  },
  {
    id: 3,
    pertanyaan: "Apakah ada layanan vaksin?",
    jawaban: "Ya, layanan vaksin tersedia setiap hari Selasa dan Kamis.",
    kategori: "layanan"
  }
];

// ============================================================
// 1. RENDER TABEL
// ============================================================
function renderTabelChatbot() {
  const tbody = document.getElementById('body-chatbot');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (dataChatbot.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center; padding:16px;">
          Belum ada data chatbot.
        </td>
      </tr>`;
    return;
  }

  dataChatbot.forEach((item, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${item.pertanyaan}</td>
      <td>${item.jawaban}</td>
      <td><span class="badge">${item.kategori}</span></td>
      <td>
        <button class="btn-edit" onclick="editChatbot(${item.id})">✏️ Edit</button>
        <button class="btn-hapus" onclick="hapusChatbot(${item.id})">🗑️ Hapus</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// ============================================================
// 2. SIMPAN (Tambah / Update)
// ============================================================
function simpanChatbot() {
  const idField     = document.getElementById('chatbot-id').value;
  const pertanyaan  = document.getElementById('pertanyaan').value.trim();
  const jawaban     = document.getElementById('jawaban').value.trim();
  const kategori    = document.getElementById('kategori').value;

  // Validasi
  if (!pertanyaan || !jawaban) {
    alert('⚠️ Pertanyaan dan Jawaban wajib diisi!');
    return;
  }

  if (idField) {
    // === Mode UPDATE ===
    const id = parseInt(idField);
    const index = dataChatbot.findIndex(item => item.id === id);
    if (index !== -1) {
      dataChatbot[index] = { id, pertanyaan, jawaban, kategori };
      alert('✅ Data chatbot berhasil diperbarui!');
    }
  } else {
    // === Mode TAMBAH ===
    const newId = dataChatbot.length > 0 
      ? Math.max(...dataChatbot.map(i => i.id)) + 1 
      : 1;

    dataChatbot.push({ id: newId, pertanyaan, jawaban, kategori });
    alert('✅ Chatbot baru berhasil ditambahkan!');
  }

  simpanKeStorage();
  renderTabelChatbot();
  resetForm();
}

// ============================================================
// 3. EDIT
// ============================================================
function editChatbot(id) {
  const item = dataChatbot.find(i => i.id === id);
  if (!item) return;

  document.getElementById('chatbot-id').value  = item.id;
  document.getElementById('pertanyaan').value  = item.pertanyaan;
  document.getElementById('jawaban').value     = item.jawaban;
  document.getElementById('kategori').value    = item.kategori;

  // Scroll ke form
  document.getElementById('kelola-chatbot')
          .scrollIntoView({ behavior: 'smooth' });
}

// ============================================================
// 4. HAPUS
// ============================================================
function hapusChatbot(id) {
  const item = dataChatbot.find(i => i.id === id);
  if (!item) return;

  const konfirmasi = confirm(
    `Yakin ingin menghapus chatbot:\n"${item.pertanyaan}" ?`
  );
  if (!konfirmasi) return;

  dataChatbot = dataChatbot.filter(i => i.id !== id);
  simpanKeStorage();
  renderTabelChatbot();
  alert('🗑️ Data berhasil dihapus.');
}

// ============================================================
// 5. RESET FORM
// ============================================================
function resetForm() {
  document.getElementById('chatbot-id').value  = '';
  document.getElementById('pertanyaan').value  = '';
  document.getElementById('jawaban').value     = '';
  document.getElementById('kategori').value    = 'umum';
}

// ============================================================
// 6. SIMPAN KE LOCAL STORAGE
// ============================================================
function simpanKeStorage() {
  localStorage.setItem('dataChatbot', JSON.stringify(dataChatbot));
}

// ============================================================
// 7. INISIALISASI SAAT HALAMAN DIBUKA
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  renderTabelChatbot();
});