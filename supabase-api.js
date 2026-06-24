/**
 * supabase-api.js — Portal Al-Karim
 * Menggantikan GAS (Google Apps Script) apiCall() dengan Supabase.
 * Include file ini SETELAH @supabase/supabase-js CDN script.
 *
 * Usage (sama persis seperti sebelumnya):
 *   apiCall('login', { username, password }).then(res => { ... });
 */

const SUPABASE_URL  = 'https://xfdufzmrkvdimtpagxax.supabase.co';
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmZHVmem1ya3ZkaW10cGFneGF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NTQzMDcsImV4cCI6MjA5NjUzMDMwN30.Z2HzaW7icWFix3G3VKdtXJeLs0tokYLvrFPh7p-lXtY';

const _sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ─── KV helpers (app_config table) ─────────────────────────── */

async function _kvGet(key) {
  const { data } = await _sb.from('app_config').select('value').eq('key', key).maybeSingle();
  return data?.value ?? null;
}

async function _kvSet(key, value) {
  const { error } = await _sb.from('app_config')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) throw error;
}

/* ─── Main dispatcher ────────────────────────────────────────── */

async function apiCall(action, payload = {}) {
  try {
    switch (action) {
      /* AUTH */
      case 'login':              return await _login(payload);

      /* USERS */
      case 'getUsers':           return await _getUsers();
      case 'saveUser':           return await _saveUser(payload);
      case 'deleteUser':         return await _deleteUser(payload);

      /* MURID */
      case 'getMurid':           return await _getMurid();
      case 'getMuridByJenjang':  return await _getMuridByJenjang(payload);
      case 'saveMurid':          return await _saveMurid(payload);
      case 'deleteMurid':        return await _deleteMurid(payload);
      case 'batchDeleteMurid':   return await _batchDeleteMurid(payload);
      case 'generatePin':        return await _generatePin(payload);
      case 'resetPin':           return await _generatePin(payload);
      case 'verifyPin':          return await _verifyPin(payload);

      /* JOB TRACKER */
      case 'saveJobTracker':     return await _saveJobTracker(payload);
      case 'getJobTrackerToday': return await _getJobTrackerToday(payload);
      case 'getAllJobTracker':   return await _getAllJobTracker(payload);

      /* KPI HARIAN */
      case 'saveKpiHarian':      return await _saveKpiHarian(payload);
      case 'getKpiHarian':       return await _getKpiHarian(payload);
      case 'getAllKpiHarian':    return await _getAllKpiHarian(payload);
      case 'getKpiHarianBulan': return await _getKpiHarianBulan(payload);

      /* JADWAL */
      case 'getJadwalAgenda':    return await _getJadwalAgenda();
      case 'setJadwalAgenda':    return await _setJadwalAgenda(payload);

      /* TUGAS PIMPINAN */
      case 'assignTugas':        return await _assignTugas(payload);
      case 'getTugasPimpinan':   return await _getTugasPimpinan(payload);

      /* BUKU GURU */
      case 'saveBukuGuru':       return await _saveBukuGuru(payload);
      case 'getBukuGuru':        return await _getBukuGuru(payload);
      case 'publishBukuGuru':    return await _publishBukuGuru(payload);
      case 'getAllBukuStatus':   return await _getAllBukuStatus();

      /* BUKU ORTU */
      case 'saveBukuOrtu':       return await _saveBukuOrtu(payload);
      case 'getBukuOrtu':        return await _getBukuOrtu(payload);
      case 'deleteBukuOrtu':     return await _deleteBukuOrtu(payload);

      /* BUKU PENGHUBUNG DIGITAL */
      case 'getBukuSekolah':     return await _getBukuSekolah(payload);
      case 'saveBukuSekolah':    return await _saveBukuSekolah(payload);
      case 'getBukuRumah':       return await _getBukuRumah(payload);
      case 'saveBukuRumah':      return await _saveBukuRumah(payload);
      case 'getRekapBuku':       return await _getRekapBuku(payload);
      case 'getNilaiKeaktifan':  return await _getNilaiKeaktifan(payload);

      /* KPI TAHUNAN */
      case 'saveKpi':            return await _saveKpi(payload);
      case 'getKpi':             return await _getKpi(payload);

      /* PENDAFTARAN */
      case 'register':           return await _register(payload);
      case 'getPendaftaran':     return await _getPendaftaran();
      case 'approvePendaftaran': return await _approvePendaftaran(payload);
      case 'rejectPendaftaran':  return await _rejectPendaftaran(payload);

      /* IMPORT MASSAL */
      case 'batchImportMurid':   return await _batchImportMurid(payload);
      case 'batchImportUsers':   return await _batchImportUsers(payload);

      default: return { ok: false, error: 'Action tidak dikenal: ' + action };
    }
  } catch (err) {
    console.error('[apiCall]', action, err);
    return { ok: false, error: err.message || 'Terjadi kesalahan' };
  }
}

/* ─── AUTH ───────────────────────────────────────────────────── */

async function _login({ username, password }) {
  const { data, error } = await _sb.from('users')
    .select('*')
    .eq('username', username)
    .eq('password', password)
    .eq('active', 'Y')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Username atau password salah');

  return {
    ok: true,
    user: {
      username:  data.username,
      role:      data.role,
      nama:      data.nama,
      jabatan:   data.jabatan  || '',
      namaAnak:  data.nama_anak || '',
      jenjang:   data.jenjang  || '',
      tipeGuru:  data.tipe_guru || 'kelas',
      kelasAmpu: data.kelas_ampu || '',
    },
  };
}

/* ─── USERS ──────────────────────────────────────────────────── */

async function _getUsers() {
  const { data, error } = await _sb.from('users')
    .select('*').eq('active', 'Y').order('id');
  if (error) throw error;
  return {
    ok: true,
    data: data.map(_mapUser),
  };
}

function _mapUser(u) {
  return {
    username:  u.username,
    password:  u.password,
    role:      u.role,
    nama:      u.nama,
    jabatan:   u.jabatan    || '',
    namaAnak:  u.nama_anak  || '',
    jenjang:   u.jenjang    || '',
    active:    u.active,
    tipeGuru:  u.tipe_guru  || '',
    kelasAmpu: u.kelas_ampu || '',
  };
}

// Expose jenjang in login response for admin/pimpinan


async function _saveUser({ username, password, role, nama, jabatan, namaAnak, jenjang, tipeGuru, kelasAmpu, isNew }) {
  if (!username || !password || !role || !nama)
    throw new Error('Field wajib tidak lengkap (username/password/role/nama)');
  const validRoles = ['guru', 'kepala sekolah', 'ortu', 'pimpinan', 'admin'];
  if (!validRoles.includes(role)) throw new Error('Role tidak valid');

  const row = {
    username, password, role, nama,
    jabatan:    jabatan   || '',
    nama_anak:  namaAnak  || '',
    jenjang:    jenjang   || '',
    active:     'Y',
    tipe_guru:  tipeGuru  || '',
    kelas_ampu: kelasAmpu || '',
  };

  if (isNew) {
    const { data: ex } = await _sb.from('users').select('username').eq('username', username).maybeSingle();
    if (ex) throw new Error(`Username "${username}" sudah digunakan`);
    const { error } = await _sb.from('users').insert(row);
    if (error) throw error;
    return { ok: true, message: `Akun ${username} berhasil ditambahkan` };
  } else {
    const { error } = await _sb.from('users').update(row).eq('username', username);
    if (error) throw error;
    return { ok: true, message: `Akun ${username} berhasil diperbarui` };
  }
}

async function _deleteUser({ username }) {
  if (!username) throw new Error('Username wajib');
  if (username === 'admin') throw new Error('Akun admin tidak bisa dihapus');
  const { error } = await _sb.from('users').update({ active: 'N' }).eq('username', username);
  if (error) throw error;
  return { ok: true, message: `Akun ${username} berhasil dinonaktifkan` };
}

/* ─── MURID ──────────────────────────────────────────────────── */

async function _getMurid() {
  const { data, error } = await _sb.from('murid')
    .select('*').eq('active', 'Y').order('kelas').order('nama');
  if (error) throw error;
  return { ok: true, data: data.map(_mapMurid) };
}

async function _getMuridByJenjang({ jenjang }) {
  const q = _sb.from('murid').select('*').eq('active', 'Y').order('nama');
  if (jenjang && jenjang !== 'Semua') q.eq('jenjang', jenjang);
  const { data, error } = await q;
  if (error) throw error;
  return { ok: true, data: data.map(_mapMurid) };
}

function _mapMurid(m) {
  return {
    id:           m.id,
    nama:         m.nama,
    kelas:        m.kelas        || '',
    jenjang:      m.jenjang      || '',
    namaOrtu:     m.nama_ortu    || '',
    noHpOrtu:     m.no_hp_ortu   || '',
    pin:          m.pin          || '',
  };
}

async function _saveMurid({ id, nama, kelas, jenjang, namaOrtu, noHpOrtu, isNew }) {
  if (!nama) throw new Error('Nama murid wajib diisi');
  const row = { nama, kelas: kelas || '', jenjang: jenjang || '', nama_ortu: namaOrtu || '', no_hp_ortu: noHpOrtu || '', active: 'Y' };
  if (isNew) {
    const { error } = await _sb.from('murid').insert(row);
    if (error) throw error;
    return { ok: true, message: `Murid ${nama} berhasil ditambahkan` };
  } else {
    const { error } = await _sb.from('murid').update(row).eq('id', id);
    if (error) throw error;
    return { ok: true, message: `Murid ${nama} berhasil diperbarui` };
  }
}

async function _deleteMurid({ id }) {
  const { error } = await _sb.from('murid').update({ active: 'N' }).eq('id', id);
  if (error) throw error;
  return { ok: true, message: 'Murid berhasil dihapus' };
}

async function _batchDeleteMurid({ ids }) {
  if (!ids || !ids.length) throw new Error('Tidak ada ID yang diberikan');
  const { error } = await _sb.from('murid').update({ active: 'N' }).in('id', ids);
  if (error) throw error;
  return { ok: true, message: `${ids.length} murid berhasil dihapus` };
}

async function _generatePin({ muridId }) {
  if (!muridId) throw new Error('muridId wajib');
  const pin = String(Math.floor(1000 + Math.random() * 9000));
  const { error } = await _sb.from('murid').update({ pin }).eq('id', muridId);
  if (error) throw error;
  return { ok: true, pin, message: `PIN berhasil dibuat: ${pin}` };
}

async function _verifyPin({ muridId, pin }) {
  if (!muridId || !pin) throw new Error('muridId dan pin wajib');
  const { data, error } = await _sb.from('murid')
    .select('*').eq('id', muridId).eq('pin', pin).eq('active', 'Y').maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('PIN salah atau tidak valid');
  return { ok: true, murid: _mapMurid(data) };
}

/* ─── JOB TRACKER ────────────────────────────────────────────── */

async function _saveJobTracker({ karyawan, jabatan, tanggal, tasks, sesi }) {
  if (!karyawan || !tasks) throw new Error('karyawan dan tasks wajib');
  // tasks bisa dikirim sebagai JSON string dari portal-guru.html
  const tasksArr = typeof tasks === 'string' ? JSON.parse(tasks) : (tasks || []);

  const sesiLabel = sesi === 'sore' ? 'Sore' : 'Pagi';
  const today     = tanggal || _isoToday();
  const now       = new Date().toISOString();

  // Hapus baris lama sesi ini
  await _sb.from('job_tracker')
    .delete().eq('karyawan', karyawan).eq('tanggal', today).eq('sesi', sesiLabel);

  // Hitung nilai rekap (sore only)
  let nilaiRekap = null;
  if (sesi === 'sore') {
    const selesai      = tasksArr.filter(t => t.status === 'Selesai').length;
    const tidakSelesai = tasksArr.filter(t => t.status === 'Tidak Selesai').length;
    nilaiRekap = (selesai + tidakSelesai) > 0
      ? Math.round(selesai / (selesai + tidakSelesai) * 100)
      : 0;
  }

  // Insert baris baru
  const rows = tasksArr.map((t, i) => ({
    tanggal: today, sesi: sesiLabel, karyawan, jabatan: jabatan || '',
    no: i + 1, agenda: t.agenda || '',
    status: sesi === 'sore' ? (t.status || 'On Progres') : 'On Progres',
    target_selesai: t.target || '',
    skor: sesi === 'sore'
      ? (t.status === 'Selesai' ? 100 : t.status === 'Tidak Selesai' ? 0 : null)
      : null,
    bukti: t.bukti || t.file || '', catatan: t.catatan || '',
    nilai_rekap: (i === 0 && sesi === 'sore') ? nilaiRekap : null,
  }));

  if (rows.length > 0) {
    const { error } = await _sb.from('job_tracker').insert(rows);
    if (error) throw error;
  }

  // KV per-sesi
  await _kvSet(`job_${sesi}_${karyawan}_${today}`,
    { karyawan, jabatan, tanggal: today, tasks: tasksArr, nilaiRekap, submittedAt: now });

  // KV master (baca dulu agar tidak menimpa sesi lain)
  const prev = (await _kvGet(`job_${karyawan}`)) || {};
  await _kvSet(`job_${karyawan}`, {
    ...prev,
    karyawan, jabatan, tasks: tasksArr, tanggal: today,
    nilaiRekap:       sesi === 'sore'  ? nilaiRekap        : (prev.nilaiRekap       ?? null),
    pagiSubmittedAt:  sesi === 'pagi'  ? now                : (prev.pagiSubmittedAt  ?? null),
    soreSubmittedAt:  sesi === 'sore'  ? now                : (prev.soreSubmittedAt  ?? null),
  });

  return {
    ok: true,
    message:    sesi === 'sore' ? `Sore submit OK. Nilai Rekap: ${nilaiRekap ?? 0}` : 'Pagi submit OK',
    nilaiRekap,
  };
}

async function _getJobTrackerToday({ karyawan }) {
  const today = _isoToday();
  const [pagi, sore] = await Promise.all([
    _kvGet(`job_pagi_${karyawan}_${today}`),
    _kvGet(`job_sore_${karyawan}_${today}`),
  ]);
  return { ok: true, pagi, sore, tanggal: today };
}

async function _getAllJobTracker({ jenjang } = {}) {
  // Ambil SEMUA guru aktif + semua KV job_ dalam 2 query paralel
  // Jenjang difilter client-side agar fallback ke semua jika belum ada jenjang di DB
  const [{ data: rawGuru, error: e1 }, { data: kvRows, error: e2 }] = await Promise.all([
    _sb.from('users').select('nama, jabatan, tipe_guru, kelas_ampu, jenjang')
       .in('role', ['guru', 'kepala sekolah']).eq('active', 'Y'),
    _sb.from('app_config').select('key, value').like('key', 'job_%'),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;

  // Filter jenjang secara ketat (case-insensitive) — tidak ada fallback "tampilkan semua"
  let guruList = rawGuru || [];
  if (jenjang) {
    const jL = jenjang.toLowerCase();
    guruList = guruList.filter(g => (g.jenjang || '').toLowerCase() === jL);
  }

  const kvMap = {};
  (kvRows || [])
    .filter(r => !r.key.startsWith('job_pagi_') && !r.key.startsWith('job_sore_'))
    .forEach(r => { kvMap[r.key] = r.value; });

  const grouped = {};
  guruList.forEach(g => {
    const d = kvMap[`job_${g.nama}`] || null;
    grouped[g.nama] = {
      karyawan:        g.nama,
      jabatan:         g.jabatan    || '',
      tipeGuru:        g.tipe_guru  || 'kelas',
      kelasAmpu:       g.kelas_ampu || '',
      jenjang:         g.jenjang    || '',
      tasks:           d ? (d.tasks || [])      : [],
      nilaiRekap:      d ? d.nilaiRekap          : null,
      pagiSubmittedAt: d ? d.pagiSubmittedAt     : null,
      soreSubmittedAt: d ? d.soreSubmittedAt     : null,
      tanggal:         d ? d.tanggal             : null,
    };
  });
  return { ok: true, data: grouped };
}

/* ─── KPI HARIAN ─────────────────────────────────────────────── */

async function _saveKpiHarian({ guru, jabatan, tanggal, items }) {
  if (!guru) throw new Error('Nama guru wajib');
  const today    = tanggal || _isoToday();
  // items bisa dikirim sebagai JSON string dari portal-guru.html
  const itemArr  = typeof items === 'string' ? JSON.parse(items) : (items || []);
  const totalSkor = itemArr.length
    ? Math.round(itemArr.reduce((s, it) => s + (Number(it.nilai) || 0), 0) / itemArr.length)
    : 0;

  // Hapus lama
  await _sb.from('kpi_harian').delete().eq('guru', guru).eq('tanggal', today);

  if (itemArr.length) {
    const rows = itemArr.map((item, i) => ({
      tanggal: today, guru, jabatan: jabatan || '',
      no: i + 1, item_kpi: item.label,
      nilai: item.nilai, total_skor: i === 0 ? totalSkor : 0,
    }));
    const { error } = await _sb.from('kpi_harian').insert(rows);
    if (error) throw error;
  }

  await _kvSet(`kpi_harian_${guru}_${today}`,
    { guru, jabatan, tanggal: today, items: itemArr, totalSkor, updatedAt: new Date().toISOString() });

  return { ok: true, message: `KPI harian ${guru} tersimpan`, totalSkor };
}

async function _getKpiHarian({ guru, tanggal }) {
  const today = tanggal || _isoToday();
  const data  = await _kvGet(`kpi_harian_${guru}_${today}`);
  return { ok: true, data };
}

async function _getAllKpiHarian({ tanggal, jenjang } = {}) {
  const today = tanggal || _isoToday();
  // Ambil semua guru, filter jenjang client-side (fallback jika belum ada data jenjang)
  const [{ data: rawGuru2, error: e1 }, { data: kvRows, error: e2 }] = await Promise.all([
    _sb.from('users').select('nama, jabatan, jenjang').eq('role', 'guru').eq('active', 'Y'),
    _sb.from('app_config').select('key, value').like('key', `kpi_harian_%_${today}`),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;

  let guruList = rawGuru2 || [];
  if (jenjang) {
    const jL = jenjang.toLowerCase();
    guruList = guruList.filter(g => (g.jenjang || '').toLowerCase() === jL);
  }

  const kvMap = {};
  (kvRows || []).forEach(r => { kvMap[r.key] = r.value; });

  const result = {};
  guruList.forEach(g => {
    const d = kvMap[`kpi_harian_${g.nama}_${today}`] || null;
    result[g.nama] = {
      guru:       g.nama,
      jabatan:    g.jabatan || '',
      tanggal:    today,
      submitted:  !!d,
      totalSkor:  d ? d.totalSkor : null,
      items:      d ? d.items      : [],
    };
  });
  return { ok: true, data: result, tanggal: today };
}

async function _getKpiHarianBulan({ bulan, jenjang } = {}) {
  // bulan = 'YYYY-MM'; default = bulan ini
  const bln = bulan || _isoToday().substring(0, 7);
  const startDate = bln + '-01';
  const endDate   = bln + '-31'; // tanggal 31+ tidak ada → Supabase lte aman

  const [{ data: rawGuru, error: e1 }, { data: kpiRows, error: e2 }] = await Promise.all([
    _sb.from('users').select('nama, jabatan, jenjang').eq('role', 'guru').eq('active', 'Y'),
    _sb.from('kpi_harian').select('*')
       .gte('tanggal', startDate).lte('tanggal', endDate)
       .order('tanggal').order('guru'),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;

  let guruList = rawGuru || [];
  if (jenjang) {
    const jL = jenjang.toLowerCase();
    guruList = guruList.filter(g => (g.jenjang || '').toLowerCase() === jL);
  }
  const guruNames = new Set(guruList.map(g => g.nama));

  // Struktur: grouped[guruNama] = { guru, jabatan, jenjang, dates: { 'YYYY-MM-DD': { totalSkor, items } } }
  const grouped = {};
  guruList.forEach(g => {
    grouped[g.nama] = { guru: g.nama, jabatan: g.jabatan || '', jenjang: g.jenjang || '', dates: {} };
  });

  (kpiRows || []).forEach(r => {
    if (guruNames.size && !guruNames.has(r.guru)) return;
    if (!grouped[r.guru]) grouped[r.guru] = { guru: r.guru, jabatan: r.jabatan || '', jenjang: '', dates: {} };
    const gd = grouped[r.guru].dates;
    if (!gd[r.tanggal]) gd[r.tanggal] = { totalSkor: 0, items: [] };
    if (r.no === 1 && r.total_skor) gd[r.tanggal].totalSkor = r.total_skor;
    gd[r.tanggal].items.push({ label: r.item_kpi, nilai: r.nilai });
  });

  return { ok: true, data: grouped, bulan: bln };
}

/* ─── JADWAL AGENDA ──────────────────────────────────────────── */

async function _getJadwalAgenda() {
  const { data, error } = await _sb.from('jadwal_agenda').select('*');
  if (error) throw error;
  const cfg = {};
  (data || []).forEach(r => { cfg[r.key] = r.value; });
  return {
    ok: true,
    jamBuka:      cfg.jamBuka      || '05:00',
    jamTutup:     cfg.jamTutup     || '08:00',
    jamBukaSore:  cfg.jamBukaSore  || '15:00',
    jamTutupSore: cfg.jamTutupSore || '17:00',
  };
}

async function _setJadwalAgenda({ jamBuka, jamTutup, jamBukaSore, jamTutupSore }) {
  const rows = [
    { key: 'jamBuka',      value: jamBuka      || '05:00' },
    { key: 'jamTutup',     value: jamTutup     || '08:00' },
    { key: 'jamBukaSore',  value: jamBukaSore  || '15:00' },
    { key: 'jamTutupSore', value: jamTutupSore || '17:00' },
  ];
  for (const r of rows) {
    const { error } = await _sb.from('jadwal_agenda')
      .upsert({ ...r, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (error) throw error;
  }
  return { ok: true, message: 'Jadwal berhasil disimpan' };
}

/* ─── TUGAS PIMPINAN ─────────────────────────────────────────── */

async function _assignTugas({ dari, target, agenda, deadline, catatan }) {
  if (!target || !agenda) throw new Error('Target dan agenda wajib');
  // Support single target (string) atau multiple (array)
  const targets = Array.isArray(target) ? target : [target];
  const rows = targets.map(t => ({
    dari: dari || 'Pimpinan', target: t, agenda,
    deadline: deadline || '', catatan: catatan || '', status: 'Baru',
  }));
  const { error } = await _sb.from('tugas_pimpinan').insert(rows);
  if (error) throw error;
  return { ok: true, message: `Tugas berhasil dikirim ke ${targets.join(', ')}` };
}

async function _getTugasPimpinan({ karyawan }) {
  const { data, error } = await _sb.from('tugas_pimpinan')
    .select('*').eq('target', karyawan)
    .in('status', ['Baru', 'Dibaca'])
    .order('created_at', { ascending: false });
  if (error) throw error;
  return { ok: true, data: data || [] };
}

/* ─── BUKU GURU PER JENJANG ──────────────────────────────────── */

const _BUKU_KAT_TK = [
  { no: 1, label: 'Kedisiplinan', items: [
    { label: 'Hadir tepat waktu' },
    { label: 'Membawa perlengkapan pribadi (celemek, lap tangan, lap serbaguna, sajadah)' },
  ]},
  { no: 2, label: 'Pencapaian Keagamaan', items: [
    { label: 'Membaca Iqro' },
    { label: 'Hafalan Al-Qur\'an Surah' },
    { label: 'Hafalan Doa' },
    { label: 'Hafalan Hadis' },
    { label: 'Bacaan Wudhu (Niat + doa setelah)' },
    { label: 'Bacaan Sholat (takbiratul ihram s.d. tasyahud akhir)' },
  ]},
  { no: 3, label: 'Pencapaian Membaca', items: [
    { label: 'Pencapaian Membaca' },
  ]},
  { no: 4, label: 'Pencapaian Umum', items: [
    { label: 'Pencapaian Umum', opts: ['—','A','B','C'], weekly: true },
  ]},
  { no: 5, label: 'Pesan Khusus', items: [
    { label: 'Pesan Khusus Fasilitator', type: 'text', weekly: true },
  ]},
];

const _BUKU_KAT_SD = [
  { no: 1, label: 'Kedisiplinan', items: [
    { label: 'Hadir tepat waktu' },
    { label: 'Mengumpulkan tugas tepat waktu' },
    { label: 'Membawa peralatan pribadi (alat tulis, lap tangan, celemek, sepatu, sandal)' },
  ]},
  { no: 2, label: 'Pencapaian Keagamaan', items: [
    { label: 'Ibadah Harian', opts: ['—','A','B','C'], weekly: true },
    { label: 'Tahsin', opts: ['—','Lancar','Tidak Lancar'], weekly: true },
    { label: 'Tahfidz', opts: ['—','Lancar','Tidak Lancar'], weekly: true },
    { label: 'Hadis/Doa' },
  ]},
  { no: 3, label: 'Pencapaian Umum', items: [
    { label: 'Pencapaian Umum', opts: ['—','A','B','C'], weekly: true },
  ]},
  { no: 4, label: 'Pencapaian Akhlak', items: [
    { label: 'Pencapaian Akhlak', opts: ['—','A','B','C'], weekly: true },
  ]},
  { no: 5, label: 'Pesan Khusus', items: [
    { label: 'Pesan Khusus Fasilitator', type: 'text', weekly: true },
  ]},
];

const _BUKU_KAT_SMP = [
  { no: 1, label: 'Kedisiplinan', items: [
    { label: 'Hadir di sekolah tepat waktu' },
    { label: 'Mengumpulkan tugas tepat waktu' },
    { label: 'Membawa perlengkapan pribadi (Laptop, Alquran, Al-ma\'tsurat, dll.)' },
    { label: 'Menggunakan seragam sesuai jadwal' },
  ]},
  { no: 2, label: 'Pencapaian Ibadah Harian', items: [
    { label: 'Pencapaian Ibadah Harian', opts: ['—','A','B','C'], weekly: true },
    { label: 'Tahsin', opts: ['—','Lancar','Tidak Lancar'], weekly: true },
    { label: 'Tahfidz', opts: ['—','Lancar','Tidak Lancar'], weekly: true },
    { label: 'Pencapaian Umum', opts: ['—','A','B','C'], weekly: true },
    { label: 'Pencapaian Akhlak', opts: ['—','A','B','C'], weekly: true },
  ]},
  { no: 3, label: 'Pesan Khusus', items: [
    { label: 'Pesan Khusus Fasilitator', type: 'text', weekly: true },
  ]},
];

const _BUKU_KAT_SMA = [
  { no: 1, label: 'Kedisiplinan', items: [
    { label: 'Hadir di sekolah tepat waktu' },
    { label: 'Mengumpulkan tugas/menyelesaikan project tepat waktu' },
    { label: 'Membawa perlengkapan pribadi (Laptop, Alquran, Al-ma\'tsurat, dll.)' },
    { label: 'Menggunakan seragam sesuai jadwal (termasuk sepatu & sandal)' },
  ]},
  { no: 2, label: 'Pencapaian Keagamaan', items: [
    { label: 'Pencapaian Ibadah Harian', opts: ['—','A','B','C'], weekly: true },
    { label: 'Perkembangan capaian Tahsin', opts: ['—','Lancar','Tidak Lancar'], weekly: true },
    { label: 'Perkembangan capaian Tahfiz', opts: ['—','Lancar','Tidak Lancar'], weekly: true },
  ]},
  { no: 3, label: 'Pencapaian Akhlak', items: [
    { label: 'Progres pembiasaan Akhlak dan Adab', opts: ['—','A','B','C'], weekly: true },
  ]},
  { no: 4, label: 'Pencapaian Umum', items: [
    { label: 'Progres perkembangan ilmu pengetahuan', opts: ['—','A','B','C'], weekly: true },
  ]},
  { no: 5, label: 'Pesan Khusus', items: [
    { label: 'Pesan Khusus Fasilitator', type: 'text', weekly: true },
  ]},
];

const _BUKU_KAT_BY_JENJANG = {
  'TK':  _BUKU_KAT_TK,
  'SD':  _BUKU_KAT_SD,
  'SMP': _BUKU_KAT_SMP,
  'SMA': _BUKU_KAT_SMA,
};

const _HARI = ['Senin','Selasa','Rabu','Kamis','Jumat'];
const _HARI_ORTU = ['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'];

async function _saveBukuGuru({ siswa, jenjang, minggu, data: dataRaw }) {
  if (!siswa) throw new Error('Nama siswa wajib');
  const mingguVal = minggu || 'Minggu Ini';
  const dataObj   = typeof dataRaw === 'string' ? JSON.parse(dataRaw) : (dataRaw || {});
  const kat = _BUKU_KAT_BY_JENJANG[(jenjang || '').toUpperCase()] || _BUKU_KAT_SD;

  await _sb.from('buku_guru').delete().eq('siswa', siswa).eq('minggu', mingguVal);

  const rows = [];
  kat.forEach((kategori, ki) => {
    kategori.items.forEach((item, ii) => {
      const h = (dataObj[ki] && dataObj[ki][ii]) ? dataObj[ki][ii] : {};
      if (item.weekly) {
        const wv = item.type === 'text' ? (h['Senin'] || '') : (h['Senin'] || '—');
        rows.push({
          siswa, minggu: mingguVal, status: 'Draft',
          kat_no: kategori.no, kategori: kategori.label, no: ii + 1, aktivitas: item.label,
          senin: wv, selasa: '—', rabu: '—', kamis: '—', jumat: '—',
        });
      } else {
        rows.push({
          siswa, minggu: mingguVal, status: 'Draft',
          kat_no: kategori.no, kategori: kategori.label, no: ii + 1, aktivitas: item.label,
          senin:  h['Senin']  || '—', selasa: h['Selasa'] || '—',
          rabu:   h['Rabu']   || '—', kamis:  h['Kamis']  || '—', jumat: h['Jumat'] || '—',
        });
      }
    });
  });

  if (rows.length > 0) {
    const { error } = await _sb.from('buku_guru').insert(rows);
    if (error) throw error;
  }
  return { ok: true, message: `Buku penghubung ${siswa} berhasil disimpan` };
}

async function _getBukuGuru({ siswa, jenjang }) {
  const { data, error } = await _sb.from('buku_guru')
    .select('*').eq('siswa', siswa).order('kat_no').order('no');
  if (error) throw error;
  if (!data || !data.length) return { ok: true, data: null };

  const kat = _BUKU_KAT_BY_JENJANG[(jenjang || '').toUpperCase()] || _BUKU_KAT_SD;

  // Rekonstruksi objek data
  const dataObj = {};
  kat.forEach((kategori, ki) => {
    dataObj[ki] = {};
    kategori.items.forEach((item, ii) => {
      dataObj[ki][ii] = {};
      if (item.weekly) {
        dataObj[ki][ii]['Senin'] = item.type === 'text' ? '' : '—';
      } else {
        _HARI.forEach(h => { dataObj[ki][ii][h] = '—'; });
      }
    });
  });

  let status = 'Draft';
  data.forEach(row => {
    if (row.status) status = row.status;
    const ki = row.kat_no - 1;
    const ii = row.no - 1;
    if (ki < 0 || !dataObj[ki] || dataObj[ki][ii] === undefined) return;
    const item = kat[ki] && kat[ki].items[ii];
    if (!item) return;
    if (item.weekly) {
      dataObj[ki][ii]['Senin'] = item.type === 'text' ? (row.senin || '') : (row.senin || '—');
    } else {
      _HARI.forEach(h => { dataObj[ki][ii][h] = row[h.toLowerCase()] || '—'; });
    }
  });

  return { ok: true, data: { data: dataObj, status, siswa } };
}

async function _publishBukuGuru({ siswa }) {
  const { error } = await _sb.from('buku_guru').update({ status: 'Published' }).eq('siswa', siswa);
  if (error) throw error;
  return { ok: true, message: `Buku penghubung ${siswa} berhasil dipublish` };
}

async function _getAllBukuStatus() {
  const { data, error } = await _sb.from('buku_guru')
    .select('siswa, status, created_at').order('created_at', { ascending: false });
  if (error) throw error;

  const result = {};
  (data || []).forEach(row => {
    if (!result[row.siswa]) {
      result[row.siswa] = { published: row.status === 'Published', updatedAt: row.created_at };
    }
  });
  return { ok: true, data: result };
}

/* ─── BUKU ORTU ──────────────────────────────────────────────── */

// Indikator buku ortu (di rumah) — berbeda dari guru, tidak berubah
const _BUKU_KAT_ORTU = [
  { no: 1, label: 'Pembiasaan Ibadah Harian', items: [
    { label: 'Shalat Subuh' }, { label: 'Shalat Dzuhur' }, { label: 'Shalat Ashar' },
    { label: 'Shalat Maghrib' }, { label: 'Shalat Isya' }, { label: 'Shalat Dhuha' },
    { label: 'Shalat Tahajud' }, { label: 'Membaca Dzikir Pagi dan Petang' },
    { label: 'Murajaah Hafalan Alquran' }, { label: 'Membaca Alquran ½ juz per hari' },
  ]},
  { no: 2, label: 'Kedisiplinan', items: [
    { label: 'Tidur maksimal pukul 21.00 WIB' },
    { label: 'Bangun tidur sebelum adzan subuh / maks. 05.30 WIB' },
    { label: 'Membawa bekal makanan sehat dan bergizi seimbang' },
    { label: 'Penggunaan HP/TV maksimal 30 menit' },
    { label: 'Belajar minimal 15–30 menit selama di rumah' },
  ]},
  { no: 3, label: 'Memuliakan Orangtua', items: [
    { label: 'Merapikan tempat tidur' }, { label: 'Mencuci piring setelah makan' },
    { label: 'Menyapu / mengepel lantai' }, { label: 'Memijat orangtua (minimal 1 pekan sekali)' },
  ]},
];

async function _saveBukuOrtu({ siswa, tanggal, data: dataRaw, taklim: taklimRaw }) {
  if (!siswa) throw new Error('Nama siswa wajib');
  const tgl     = tanggal || _isoToday();
  const dataObj = typeof dataRaw   === 'string' ? JSON.parse(dataRaw)   : (dataRaw   || {});
  const taklim  = typeof taklimRaw === 'string' ? JSON.parse(taklimRaw) : (taklimRaw || {});

  await _sb.from('buku_ortu').delete().eq('siswa', siswa).eq('tanggal', tgl);

  const rows = [];
  _BUKU_KAT_ORTU.forEach((kat, ki) => {
    kat.items.forEach((item, ii) => {
      const h = (dataObj[ki] && dataObj[ki][ii]) ? dataObj[ki][ii] : {};
      rows.push({
        siswa, tanggal: tgl,
        kat_no: kat.no, kategori: kat.label, no: ii + 1, aktivitas: item.label,
        senin:  h['Senin']  || '—', selasa: h['Selasa'] || '—',
        rabu:   h['Rabu']   || '—', kamis:  h['Kamis']  || '—', jumat:  h['Jumat']  || '—',
        sabtu:  h['Sabtu']  || '—', minggu: h['Minggu'] || '—',
      });
    });
  });
  _HARI_ORTU.forEach(h => {
    const t = taklim[h] || { val: '—' };
    rows.push({
      siswa, tanggal: tgl,
      kat_no: 4, kategori: 'Taklim', no: 1,
      aktivitas: 'Tema: ' + (taklim['_tema'] || '—'),
      senin:  h === 'Senin'  ? (t.val || '—') : '—',
      selasa: h === 'Selasa' ? (t.val || '—') : '—',
      rabu:   h === 'Rabu'   ? (t.val || '—') : '—',
      kamis:  h === 'Kamis'  ? (t.val || '—') : '—',
      jumat:  h === 'Jumat'  ? (t.val || '—') : '—',
      sabtu:  h === 'Sabtu'  ? (t.val || '—') : '—',
      minggu: h === 'Minggu' ? (t.val || '—') : '—',
    });
  });

  if (rows.length > 0) {
    const { error } = await _sb.from('buku_ortu').insert(rows);
    if (error) throw error;
  }
  return { ok: true, message: 'Catatan ortu berhasil disimpan' };
}

async function _getBukuOrtu({ siswa }) {
  const { data, error } = await _sb.from('buku_ortu')
    .select('*').eq('siswa', siswa).order('tanggal', { ascending: false }).order('kat_no').order('no');
  if (error) throw error;
  if (!data || !data.length) return { ok: true, data: [] };

  // Rekonstruksi per tanggal → format {tanggal, data, taklim}
  const grouped = {};
  data.forEach(row => {
    if (!grouped[row.tanggal]) {
      const dataObj = {};
      _BUKU_KAT_ORTU.forEach((kat, ki) => {
        dataObj[ki] = {};
        kat.items.forEach((_, ii) => {
          dataObj[ki][ii] = {};
          _HARI_ORTU.forEach(h => { dataObj[ki][ii][h] = '—'; });
        });
      });
      grouped[row.tanggal] = { tanggal: row.tanggal, data: dataObj, taklim: {} };
    }
    const entry = grouped[row.tanggal];
    if (row.kat_no === 4) {
      // Baris taklim
      _HARI_ORTU.forEach(h => {
        const v = row[h.toLowerCase()];
        if (v && v !== '—') {
          const temaRaw = (row.aktivitas || '').replace('Tema: ', '');
          entry.taklim[h] = { tema: temaRaw === '—' ? '' : temaRaw, val: v };
        }
      });
    } else {
      const ki = row.kat_no - 1;
      const ii = row.no - 1;
      if (ki >= 0 && entry.data[ki] && entry.data[ki][ii] !== undefined) {
        _HARI_ORTU.forEach(h => { entry.data[ki][ii][h] = row[h.toLowerCase()] || '—'; });
      }
    }
  });

  // Normalkan tanggal sebelum sort (handle ISO "2026-06-12" maupun lokal "Jumat, 12 Juni 2026")
  function _toISO(tgl) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(tgl)) return tgl;
    const BLN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    const m = tgl.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
    if (m) { const mi = BLN.indexOf(m[2]) + 1; if (mi > 0) return `${m[3]}-${String(mi).padStart(2,'0')}-${m[1].padStart(2,'0')}`; }
    return tgl;
  }
  const result = Object.values(grouped).sort((a, b) => _toISO(b.tanggal).localeCompare(_toISO(a.tanggal)));
  return { ok: true, data: result };
}

async function _deleteBukuOrtu({ siswa, tanggal }) {
  if (!siswa || !tanggal) throw new Error('siswa dan tanggal wajib');
  const { error } = await _sb.from('buku_ortu').delete().eq('siswa', siswa).eq('tanggal', tanggal);
  if (error) throw error;
  return { ok: true };
}

/* ─── KPI TAHUNAN ────────────────────────────────────────────── */

async function _saveKpi({ guru, jabatan, rows: rowArr }) {
  if (!guru) throw new Error('Nama guru wajib');
  await _sb.from('kpi').delete().eq('guru', guru);

  if (rowArr && rowArr.length) {
    const rows = rowArr.map(r => ({
      guru, jabatan: jabatan || '',
      indikator_kpi: r.ind, target: r.target, capaian: r.capaian,
      pct_progres: r.pct + '%', status: r.status, keterangan: r.ket || '',
    }));
    const { error } = await _sb.from('kpi').insert(rows);
    if (error) throw error;
  }
  await _kvSet(`kpi_${guru}`, { guru, jabatan, rows: rowArr, updatedAt: new Date().toISOString() });
  return { ok: true, message: `KPI ${guru} tersimpan` };
}

async function _getKpi({ guru }) {
  const data = await _kvGet(`kpi_${guru}`);
  return { ok: true, data };
}

/* ─── PENDAFTARAN ────────────────────────────────────────────── */

async function _register({ nama, email, noHp, role, jabatan, namaAnak, jenjang, username, password }) {
  if (!nama || !username || !password || !role)
    throw new Error('Field wajib tidak lengkap');

  // Cek duplikat
  const [{ data: ex1 }, { data: ex2 }] = await Promise.all([
    _sb.from('users').select('username').eq('username', username).maybeSingle(),
    _sb.from('pendaftaran').select('username').eq('username', username).eq('status', 'Menunggu').maybeSingle(),
  ]);
  if (ex1 || ex2) throw new Error('Username sudah digunakan atau sedang dalam proses pendaftaran');

  const { error } = await _sb.from('pendaftaran').insert({
    nama, email: email || '', no_hp: noHp || '', role,
    jabatan: jabatan || '', nama_anak: namaAnak || '', jenjang: jenjang || '',
    username, password, status: 'Menunggu', catatan_admin: '',
  });
  if (error) throw error;
  return { ok: true, message: 'Pendaftaran berhasil. Menunggu persetujuan pimpinan.' };
}

async function _getPendaftaran() {
  const { data, error } = await _sb.from('pendaftaran')
    .select('*').eq('status', 'Menunggu')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return {
    ok: true,
    data: (data || []).map(p => ({
      id: p.id, timestamp: p.created_at,
      nama: p.nama, email: p.email, noHp: p.no_hp,
      role: p.role, jabatan: p.jabatan, namaAnak: p.nama_anak,
      jenjang: p.jenjang, username: p.username, password: p.password, status: p.status,
    })),
  };
}

async function _approvePendaftaran({ id, catatan }) {
  const { data: pend, error: e1 } = await _sb.from('pendaftaran').select('*').eq('id', id).maybeSingle();
  if (e1) throw e1;
  if (!pend) throw new Error('Data pendaftaran tidak ditemukan');

  const { data: ex } = await _sb.from('users').select('username').eq('username', pend.username).maybeSingle();
  if (ex) throw new Error(`Username "${pend.username}" sudah ada di sistem`);

  const [{ error: e2 }, { error: e3 }] = await Promise.all([
    _sb.from('users').insert({
      username: pend.username, password: pend.password,
      role: pend.role, nama: pend.nama,
      jabatan: pend.jabatan || '', nama_anak: pend.nama_anak || '',
      jenjang: pend.jenjang || '', active: 'Y', tipe_guru: '', kelas_ampu: '',
    }),
    _sb.from('pendaftaran').update({ status: 'Diterima ✅', catatan_admin: catatan || '' }).eq('id', id),
  ]);
  if (e2) throw e2;
  if (e3) throw e3;
  return { ok: true, message: `Pendaftaran ${pend.nama} disetujui` };
}

async function _rejectPendaftaran({ id, catatan }) {
  const { error } = await _sb.from('pendaftaran')
    .update({ status: 'Ditolak ❌', catatan_admin: catatan || '' }).eq('id', id);
  if (error) throw error;
  return { ok: true, message: 'Pendaftaran ditolak' };
}

/* ─── IMPORT MASSAL ──────────────────────────────────────────── */

async function _batchImportMurid({ rows }) {
  const { data: existing } = await _sb.from('murid').select('nama').eq('active', 'Y');
  const existingNames = (existing || []).map(m => m.nama.toLowerCase());

  const newRows = (rows || [])
    .filter(r => r.nama && !existingNames.includes(r.nama.toLowerCase()))
    .map(r => ({
      nama: r.nama, kelas: r.kelas || '', jenjang: r.jenjang || '',
      nama_ortu: r.namaOrtu || '', no_hp_ortu: r.noHpOrtu || '', active: 'Y',
    }));

  const skipped = (rows || []).length - newRows.length;
  if (newRows.length > 0) {
    const { error } = await _sb.from('murid').insert(newRows);
    if (error) throw error;
  }
  return {
    ok: true,
    message: `Import selesai: ${newRows.length} siswa ditambahkan, ${skipped} dilewati`,
    added: newRows.length, skipped,
  };
}

async function _batchImportUsers({ rows }) {
  const { data: existing } = await _sb.from('users').select('username');
  const existingUsernames = (existing || []).map(u => u.username.toLowerCase());

  const newRows = (rows || [])
    .filter(r => r.nama && r.username && !existingUsernames.includes(r.username.toLowerCase()))
    .map(r => ({
      username:   r.username,
      password:   r.password   || 'alkarim123',
      role:       r.role       || 'guru',
      nama:       r.nama,
      jabatan:    r.jabatan    || '',
      nama_anak:  r.namaAnak   || '',
      jenjang:    r.jenjang    || '',
      active:     'Y',
      tipe_guru:  r.tipeGuru   || '',
      kelas_ampu: r.kelasAmpu  || '',
    }));

  const skipped = (rows || []).length - newRows.length;
  if (newRows.length > 0) {
    const { error } = await _sb.from('users').insert(newRows);
    if (error) throw error;
  }
  return {
    ok: true,
    message: `Import selesai: ${newRows.length} akun ditambahkan, ${skipped} dilewati`,
    added: newRows.length, skipped,
  };
}

/* ─── BUKU PENGHUBUNG DIGITAL ────────────────────────────────── */

async function _getBukuSekolah({ siswaId, tanggal } = {}) {
  const tgl = tanggal || _isoToday();
  const { data, error } = await _sb.from('buku_sekolah')
    .select('*').eq('siswa_id', siswaId).eq('tanggal', tgl).maybeSingle();
  if (error) throw error;
  return { ok: true, data: data ? { aktivitas: data.aktivitas || {}, guruId: data.guru_id, tanggal: data.tanggal } : null };
}

async function _saveBukuSekolah({ siswaId, jenjang, tanggal, aktivitas, guruId } = {}) {
  const tgl = tanggal || _isoToday();
  const akt = typeof aktivitas === 'string' ? JSON.parse(aktivitas) : (aktivitas || {});
  const { error } = await _sb.from('buku_sekolah').upsert(
    { siswa_id: siswaId, jenjang: (jenjang || '').toUpperCase(), tanggal: tgl, aktivitas: akt, guru_id: guruId || null, updated_at: new Date().toISOString() },
    { onConflict: 'siswa_id,tanggal' }
  );
  if (error) throw error;
  return { ok: true, message: 'Aktivitas sekolah tersimpan' };
}

async function _getBukuRumah({ siswaId, tanggal } = {}) {
  const tgl = tanggal || _isoToday();
  const { data, error } = await _sb.from('buku_rumah')
    .select('*').eq('siswa_id', siswaId).eq('tanggal', tgl).maybeSingle();
  if (error) throw error;
  return { ok: true, data: data ? { aktivitas: data.aktivitas || {}, tanggal: data.tanggal } : null };
}

async function _saveBukuRumah({ siswaId, jenjang, tanggal, aktivitas } = {}) {
  const tgl = tanggal || _isoToday();
  const akt = typeof aktivitas === 'string' ? JSON.parse(aktivitas) : (aktivitas || {});
  const { error } = await _sb.from('buku_rumah').upsert(
    { siswa_id: siswaId, jenjang: (jenjang || '').toUpperCase(), tanggal: tgl, aktivitas: akt, updated_at: new Date().toISOString() },
    { onConflict: 'siswa_id,tanggal' }
  );
  if (error) throw error;
  return { ok: true, message: 'Aktivitas rumah tersimpan' };
}

async function _getRekapBuku({ siswaId, startDate, endDate } = {}) {
  const [{ data: sekolah, error: e1 }, { data: rumah, error: e2 }] = await Promise.all([
    _sb.from('buku_sekolah').select('tanggal, aktivitas, guru_id').eq('siswa_id', siswaId).gte('tanggal', startDate).lte('tanggal', endDate).order('tanggal'),
    _sb.from('buku_rumah').select('tanggal, aktivitas').eq('siswa_id', siswaId).gte('tanggal', startDate).lte('tanggal', endDate).order('tanggal'),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  return { ok: true, sekolah: sekolah || [], rumah: rumah || [] };
}

async function _getNilaiKeaktifan({ siswaId, bulan, tahun } = {}) {
  const bln  = String(bulan).padStart(2, '0');
  const startDate = `${tahun}-${bln}-01`;
  const endDate   = `${tahun}-${bln}-31`;
  const { data, error } = await _sb.from('buku_rumah')
    .select('tanggal').eq('siswa_id', siswaId).gte('tanggal', startDate).lte('tanggal', endDate);
  if (error) throw error;
  return { ok: true, jumlahHari: (data || []).length, bulan, tahun };
}

/* ─── Utility ────────────────────────────────────────────────── */

function _isoToday() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
