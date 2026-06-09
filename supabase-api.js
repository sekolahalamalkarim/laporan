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
      case 'generatePin':        return await _generatePin(payload);
      case 'resetPin':           return await _generatePin(payload);
      case 'verifyPin':          return await _verifyPin(payload);

      /* JOB TRACKER */
      case 'saveJobTracker':     return await _saveJobTracker(payload);
      case 'getJobTrackerToday': return await _getJobTrackerToday(payload);
      case 'getAllJobTracker':   return await _getAllJobTracker();

      /* KPI HARIAN */
      case 'saveKpiHarian':      return await _saveKpiHarian(payload);
      case 'getKpiHarian':       return await _getKpiHarian(payload);
      case 'getAllKpiHarian':    return await _getAllKpiHarian(payload);

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
    jabatan:   u.jabatan   || '',
    namaAnak:  u.nama_anak || '',
    jenjang:   u.jenjang   || '',
    active:    u.active,
    tipeGuru:  u.tipe_guru  || '',
    kelasAmpu: u.kelas_ampu || '',
  };
}

async function _saveUser({ username, password, role, nama, jabatan, namaAnak, jenjang, tipeGuru, kelasAmpu, isNew }) {
  if (!username || !password || !role || !nama)
    throw new Error('Field wajib tidak lengkap (username/password/role/nama)');

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
    usernameOrtu: m.username_ortu || '',
    pin:          m.pin          || '',
  };
}

async function _saveMurid({ id, nama, kelas, jenjang, usernameOrtu, isNew }) {
  if (!nama) throw new Error('Nama murid wajib diisi');
  const row = { nama, kelas: kelas || '', jenjang: jenjang || '', username_ortu: usernameOrtu || '', active: 'Y' };
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
  const sesiLabel = sesi === 'sore' ? 'Sore' : 'Pagi';
  const today     = tanggal || _isoToday();
  const now       = new Date().toISOString();

  // Hapus baris lama sesi ini
  await _sb.from('job_tracker')
    .delete().eq('karyawan', karyawan).eq('tanggal', today).eq('sesi', sesiLabel);

  // Hitung nilai rekap (sore only)
  let nilaiRekap = null;
  if (sesi === 'sore') {
    const selesai      = tasks.filter(t => t.status === 'Selesai').length;
    const tidakSelesai = tasks.filter(t => t.status === 'Tidak Selesai').length;
    nilaiRekap = (selesai + tidakSelesai) > 0
      ? Math.round(selesai / (selesai + tidakSelesai) * 100)
      : 0;
  }

  // Insert baris baru
  const rows = tasks.map((t, i) => ({
    tanggal: today, sesi: sesiLabel, karyawan, jabatan: jabatan || '',
    no: i + 1, agenda: t.agenda || '',
    status: sesi === 'sore' ? (t.status || 'On Progres') : 'On Progres',
    target_selesai: t.target || '',
    skor: sesi === 'sore'
      ? (t.status === 'Selesai' ? 100 : t.status === 'Tidak Selesai' ? 0 : null)
      : null,
    bukti: t.file || '', catatan: t.catatan || '',
    nilai_rekap: (i === 0 && sesi === 'sore') ? nilaiRekap : null,
  }));

  if (rows.length > 0) {
    const { error } = await _sb.from('job_tracker').insert(rows);
    if (error) throw error;
  }

  // KV per-sesi
  await _kvSet(`job_${sesi}_${karyawan}_${today}`,
    { karyawan, jabatan, tanggal: today, tasks, nilaiRekap, submittedAt: now });

  // KV master (baca dulu agar tidak menimpa sesi lain)
  const prev = (await _kvGet(`job_${karyawan}`)) || {};
  await _kvSet(`job_${karyawan}`, {
    ...prev,
    karyawan, jabatan, tasks, tanggal: today,
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

async function _getAllJobTracker() {
  // Ambil semua guru & semua KV job_ dalam 2 query paralel
  const [{ data: guruList, error: e1 }, { data: kvRows, error: e2 }] = await Promise.all([
    _sb.from('users').select('nama, jabatan, tipe_guru, kelas_ampu')
       .eq('role', 'guru').eq('active', 'Y'),
    _sb.from('app_config').select('key, value')
       .like('key', 'job_%')
       .not('key', 'like', 'job_pagi_%')
       .not('key', 'like', 'job_sore_%'),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;

  const kvMap = {};
  (kvRows || []).forEach(r => { kvMap[r.key] = r.value; });

  const grouped = {};
  (guruList || []).forEach(g => {
    const d = kvMap[`job_${g.nama}`] || null;
    grouped[g.nama] = {
      karyawan:        g.nama,
      jabatan:         g.jabatan   || '',
      tipeGuru:        g.tipe_guru  || 'kelas',
      kelasAmpu:       g.kelas_ampu || '',
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
  const itemArr  = items || [];
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

async function _getAllKpiHarian({ tanggal } = {}) {
  const today = tanggal || _isoToday();
  const [{ data: guruList, error: e1 }, { data: kvRows, error: e2 }] = await Promise.all([
    _sb.from('users').select('nama, jabatan').eq('role', 'guru').eq('active', 'Y'),
    _sb.from('app_config').select('key, value').like('key', `kpi_harian_%_${today}`),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;

  const kvMap = {};
  (kvRows || []).forEach(r => { kvMap[r.key] = r.value; });

  const result = {};
  (guruList || []).forEach(g => {
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

/* ─── BUKU GURU ──────────────────────────────────────────────── */

const _BUKU_KAT = [
  { no: 1, label: 'Pembiasaan Ibadah Harian', items: [
    'Shalat Subuh','Shalat Dzuhur','Shalat Ashar','Shalat Maghrib','Shalat Isya',
    'Shalat Dhuha','Shalat Tahajud','Membaca Dzikir Pagi dan Petang',
    'Murajaah Hafalan Alquran','Membaca Alquran ½ juz per hari',
  ]},
  { no: 2, label: 'Kedisiplinan', items: [
    'Tidur maksimal pukul 21.00 WIB','Bangun tidur sebelum adzan subuh / maks. 05.30 WIB',
    'Membawa bekal makanan sehat dan bergizi seimbang',
    'Penggunaan HP/TV maksimal 30 menit','Belajar minimal 15–30 menit selama di rumah',
  ]},
  { no: 3, label: 'Memuliakan Orangtua', items: [
    'Merapikan tempat tidur','Mencuci piring setelah makan',
    'Menyapu / mengepel lantai','Memijat orangtua (minimal 1 pekan sekali)',
  ]},
];
const _HARI = ['Senin','Selasa','Rabu','Kamis','Jumat'];

async function _saveBukuGuru({ siswa, minggu, data: dataRaw, taklim: taklimRaw }) {
  if (!siswa) throw new Error('Nama siswa wajib');
  const mingguVal = minggu || 'Minggu Ini';
  const dataObj   = typeof dataRaw  === 'string' ? JSON.parse(dataRaw)  : (dataRaw  || {});
  const taklimObj = typeof taklimRaw === 'string' ? JSON.parse(taklimRaw) : (taklimRaw || {});

  await _sb.from('buku_guru').delete().eq('siswa', siswa).eq('minggu', mingguVal);

  const rows = [];
  _BUKU_KAT.forEach((kat, ki) => {
    kat.items.forEach((item, ii) => {
      const h = (dataObj[ki] && dataObj[ki][ii]) ? dataObj[ki][ii] : {};
      rows.push({
        siswa, minggu: mingguVal, status: 'Draft',
        kat_no: kat.no, kategori: kat.label, no: ii + 1, aktivitas: item,
        senin:  h['Senin']  || '—', selasa: h['Selasa'] || '—',
        rabu:   h['Rabu']   || '—', kamis:  h['Kamis']  || '—', jumat: h['Jumat'] || '—',
      });
    });
  });
  _HARI.forEach(h => {
    const t = taklimObj[h] || { tema: '', val: '—' };
    rows.push({
      siswa, minggu: mingguVal, status: 'Draft',
      kat_no: 4, kategori: 'Taklim', no: 1,
      aktivitas: 'Tema: ' + (taklimObj['_tema'] || taklimObj[h]?.tema || '—'),
      senin:  h === 'Senin'  ? (t.val || '—') : '—',
      selasa: h === 'Selasa' ? (t.val || '—') : '—',
      rabu:   h === 'Rabu'   ? (t.val || '—') : '—',
      kamis:  h === 'Kamis'  ? (t.val || '—') : '—',
      jumat:  h === 'Jumat'  ? (t.val || '—') : '—',
    });
  });

  if (rows.length > 0) {
    const { error } = await _sb.from('buku_guru').insert(rows);
    if (error) throw error;
  }
  return { ok: true, message: `Buku penghubung ${siswa} berhasil disimpan` };
}

async function _getBukuGuru({ siswa }) {
  const { data, error } = await _sb.from('buku_guru')
    .select('*').eq('siswa', siswa).order('kat_no').order('no');
  if (error) throw error;
  if (!data || !data.length) return { ok: true, data: null };

  // Rekonstruksi objek data seperti yang diharapkan portal-guru.html
  const dataObj   = {};
  const taklimObj = {};
  _BUKU_KAT.forEach((kat, ki) => {
    dataObj[ki] = {};
    kat.items.forEach((_, ii) => {
      dataObj[ki][ii] = {};
      _HARI.forEach(h => { dataObj[ki][ii][h] = '—'; });
    });
  });
  _HARI.forEach(h => { taklimObj[h] = { tema: '', val: '—' }; });

  let status = 'Draft';
  data.forEach(row => {
    if (row.kat_no === 4) {
      const aktif = _HARI.find(h => row[h.toLowerCase()] && row[h.toLowerCase()] !== '—');
      if (aktif) taklimObj[aktif] = { val: row[aktif.toLowerCase()], tema: '' };
      const tema = row.aktivitas.replace('Tema: ', '');
      if (tema && tema !== '—') taklimObj['_tema'] = tema;
    } else {
      const ki = row.kat_no - 1;
      const ii = row.no - 1;
      if (!dataObj[ki]) dataObj[ki] = {};
      if (!dataObj[ki][ii]) dataObj[ki][ii] = {};
      _HARI.forEach(h => { dataObj[ki][ii][h] = row[h.toLowerCase()] || '—'; });
    }
    if (row.status) status = row.status;
  });

  return { ok: true, data: { data: dataObj, taklim: taklimObj, status, siswa } };
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

async function _saveBukuOrtu({ siswa, tanggal, data: dataRaw, taklim: taklimRaw }) {
  if (!siswa) throw new Error('Nama siswa wajib');
  const tgl     = tanggal || _isoToday();
  const dataObj = typeof dataRaw   === 'string' ? JSON.parse(dataRaw)   : (dataRaw   || {});
  const taklim  = typeof taklimRaw === 'string' ? JSON.parse(taklimRaw) : (taklimRaw || {});

  await _sb.from('buku_ortu').delete().eq('siswa', siswa).eq('tanggal', tgl);

  const rows = [];
  _BUKU_KAT.forEach((kat, ki) => {
    kat.items.forEach((item, ii) => {
      const h = (dataObj[ki] && dataObj[ki][ii]) ? dataObj[ki][ii] : {};
      rows.push({
        siswa, tanggal: tgl,
        kat_no: kat.no, kategori: kat.label, no: ii + 1, aktivitas: item,
        senin:  h['Senin']  || '—', selasa: h['Selasa'] || '—',
        rabu:   h['Rabu']   || '—', kamis:  h['Kamis']  || '—', jumat: h['Jumat'] || '—',
      });
    });
  });
  _HARI.forEach(h => {
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
  return { ok: true, data: data || [] };
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
      username_ortu: r.usernameOrtu || '', active: 'Y',
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

/* ─── Utility ────────────────────────────────────────────────── */

function _isoToday() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
