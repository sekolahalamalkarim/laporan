// ============================================================
//  PORTAL SEKOLAH ALAM AL-KARIM — Google Apps Script Backend
//  Deploy sebagai Web App → Execute as: Me → Anyone can access
// ============================================================

const SS_NAME = 'Portal Sekolah Alam Al-Karim — Database';

// ============================================================
//  SPREADSHEET SETUP
// ============================================================

function getOrCreateSS() {
  const files = DriveApp.getFilesByName(SS_NAME);
  if (files.hasNext()) return SpreadsheetApp.open(files.next());
  const ss = SpreadsheetApp.create(SS_NAME);
  initSheets(ss);
  return ss;
}

function initSheets(ss) {
  const defs = [
    {
      name: 'Users',
      headers: ['Username','Password','Role','Nama Lengkap','Jabatan','Nama Anak','Jenjang','Active','Tipe Guru','Kelas Ampu'],
      color: '#E8EAF6',
      width: { 1:130, 2:110, 3:90, 4:180, 5:150, 6:160, 7:70, 8:70, 9:100, 10:120 },
    },
    {
      name: 'Murid',
      headers: ['ID','Nama Lengkap','Kelas','Jenjang','Username Ortu','PIN','Active'],
      color: '#FFF3E0',
      width: { 1:60, 2:180, 3:100, 4:70, 5:160, 6:70, 7:60 },
    },
    {
      name: 'TugasPimpinan',
      headers: ['ID','Timestamp','Dari','Target','Agenda','Deadline','Catatan','Status'],
      color: '#F3E5F5',
      width: { 1:60, 2:160, 3:160, 4:160, 5:240, 6:120, 7:200, 8:90 },
    },
    {
      name: 'JadwalAgenda',
      headers: ['Key','Value','UpdatedAt'],
      color: '#E8F5E9',
    },
    {
      name: 'JobTracker',
      headers: ['Timestamp','Tanggal','Sesi','Karyawan','Jabatan','No','Agenda','Status','Target Selesai','Skor','Bukti','Catatan','Nilai Rekap'],
      color: '#E8F5E9',
    },
    {
      name: 'BukuGuru',
      headers: ['Timestamp','Siswa','Minggu','Status','Kat No','Kategori','No','Aktivitas','Senin','Selasa','Rabu','Kamis','Jumat'],
      color: '#E3F2FD',
    },
    {
      name: 'BukuOrtu',
      headers: ['Timestamp','Siswa','Tanggal Kirim','Kat No','Kategori','No','Aktivitas','Senin','Selasa','Rabu','Kamis','Jumat'],
      color: '#FFF9C4',
    },
    {
      name: 'Pendaftaran',
      headers: ['ID','Timestamp','Nama Lengkap','Email','No HP','Role','Jabatan','Nama Anak','Jenjang','Username','Password','Status','Catatan Admin'],
      color: '#FCE4EC',
      width: { 1:50, 2:160, 3:180, 4:180, 5:120, 6:80, 7:150, 8:160, 9:70, 10:130, 11:110, 12:90, 13:180 },
    },
    {
      name: 'KPI',
      headers: ['Timestamp','Guru','Jabatan','Indikator KPI','Target','Capaian','% Progres','Status','Keterangan'],
      color: '#F3E5F5',
    },
    {
      name: 'KpiHarian',
      headers: ['Timestamp','Tanggal','Guru','Jabatan','No','Item KPI','Nilai (0/100)','Total Skor'],
      color: '#E8EAF6',
    },
    {
      name: '_Data',
      headers: ['Key','Value','UpdatedAt'],
      color: '#F5F5F5',
    },
  ];

  const existing = ss.getSheets().map(s => s.getName());
  const defaultSheet = ss.getSheets()[0];

  defs.forEach(def => {
    let sheet = ss.getSheetByName(def.name);
    if (!sheet) sheet = ss.insertSheet(def.name);
    const hr = sheet.getRange(1, 1, 1, def.headers.length);
    hr.setValues([def.headers]);
    hr.setBackground(def.color);
    hr.setFontWeight('bold');
    sheet.setFrozenRows(1);
    if (def.width) {
      Object.entries(def.width).forEach(([col, w]) => sheet.setColumnWidth(+col, w));
    }
  });

  // Hapus default sheet jika masih kosong
  if (!existing.includes('Users')) {
    try { ss.deleteSheet(defaultSheet); } catch(e) {}
    // Seed akun default pimpinan
    seedDefaultUsers(ss);
  }
}

function seedDefaultUsers(ss) {
  const sheet = ss.getSheetByName('Users');
  const now = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
  // Default: pimpinan, 2 guru demo, 1 ortu demo
  sheet.appendRow(['admin',      'admin123',   'pimpinan', 'Kepala Sekolah',    'Pimpinan',       '',            '',    'Y', '',      '']);
  sheet.appendRow(['bu.siti',    'guru123',    'guru',     'Bu Siti Rahayu',   'Guru Kelas 1A',  '',            '',    'Y', 'kelas', '1A']);
  sheet.appendRow(['pak.ahmad',  'guru123',    'guru',     'Pak Ahmad Firdaus','Guru Kelas 2B',  '',            '',    'Y', 'kelas', '2B']);
  sheet.appendRow(['ortu.zahra', 'ortu123',    'ortu',     'Ortu Zahra',       '',               'Zahra Putri', 'SD',  'Y', '',      '']);
}

// ============================================================
//  KEY-VALUE STORE
// ============================================================

function kvGet(ss, key) {
  const data = ss.getSheetByName('_Data').getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) { try { return JSON.parse(data[i][1]); } catch(e) { return data[i][1]; } }
  }
  return null;
}

function kvSet(ss, key, value) {
  const sheet = ss.getSheetByName('_Data');
  const data = sheet.getDataRange().getValues();
  const now = new Date().toISOString();
  const json = JSON.stringify(value);
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) { sheet.getRange(i+1, 2, 1, 2).setValues([[json, now]]); return; }
  }
  sheet.appendRow([key, json, now]);
}

function ts() { return new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }); }

// ============================================================
//  MAIN HANDLER
// ============================================================

function doGet(e)  { return handleRequest(e); }
function doPost(e) { return handleRequest(e); }

function handleRequest(e) {
  try {
    let params = {};
    if (e.postData && e.postData.contents) {
      try { params = JSON.parse(e.postData.contents); } catch(err) { params = e.parameter || {}; }
    } else {
      params = e.parameter || {};
    }

    const action = params.action;
    const ss = getOrCreateSS();
    // Auto-init jika sheet Users belum ada
    if (!ss.getSheetByName('Users')) initSheets(ss);
    let result;

    switch (action) {
      case 'verifyPin':           result = verifyPin(ss, params); break;
      case 'generatePin':         result = generatePin(ss, params); break;
      case 'resetPin':            result = resetPin(ss, params); break;
      case 'getMuridByJenjang':   result = getMuridByJenjang(ss, params.jenjang); break;
      case 'getJadwalAgenda':     result = getJadwalAgenda(ss); break;
      case 'setJadwalAgenda':     result = setJadwalAgenda(ss, params); break;
      case 'assignTugas':         result = assignTugas(ss, params); break;
      case 'getTugasPimpinan':    result = getTugasPimpinan(ss, params.karyawan); break;
      case 'register':            result = doRegister(ss, params); break;
      case 'getPendaftaran':      result = getPendaftaran(ss); break;
      case 'approvePendaftaran':  result = approvePendaftaran(ss, params); break;
      case 'rejectPendaftaran':   result = rejectPendaftaran(ss, params); break;
      case 'login':           result = doLogin(ss, params); break;
      case 'getUsers':        result = getUsers(ss); break;
      case 'saveUser':        result = saveUser(ss, params); break;
      case 'deleteUser':      result = deleteUser(ss, params.username); break;
      case 'getMurid':        result = getMurid(ss); break;
      case 'saveMurid':       result = saveMurid(ss, params); break;
      case 'deleteMurid':     result = deleteMurid(ss, params.id); break;
      case 'saveJobTracker':     result = saveJobTracker(ss, params); break;
      case 'getAllJobTracker':   result = getAllJobTracker(ss); break;
      case 'getJobTracker':     result = getJobTracker(ss, params.karyawan); break;
      case 'getJobTrackerToday': result = getJobTrackerToday(ss, params); break;
      case 'saveKpiHarian':       result = saveKpiHarian(ss, params); break;
      case 'getKpiHarian':        result = getKpiHarian(ss, params); break;
      case 'getAllKpiHarian':     result = getAllKpiHarian(ss, params); break;
      case 'batchImportMurid':   result = batchImportMurid(ss, params); break;
      case 'batchImportUsers':   result = batchImportUsers(ss, params); break;
      case 'saveBukuGuru':    result = saveBukuGuru(ss, params); break;
      case 'publishBukuGuru': result = publishBukuGuru(ss, params.siswa); break;
      case 'getBukuGuru':     result = getBukuGuru(ss, params.siswa); break;
      case 'getAllBukuStatus': result = getAllBukuStatus(ss); break;
      case 'saveBukuOrtu':    result = saveBukuOrtu(ss, params); break;
      case 'getBukuOrtu':     result = getBukuOrtu(ss, params.siswa); break;
      case 'saveKpi':         result = saveKpi(ss, params); break;
      case 'getKpi':          result = getKpi(ss, params.guru); break;
      case 'init':            initSheets(ss); result = { message: 'OK', ssUrl: ss.getUrl() }; break;
      default: result = { error: 'Unknown action: ' + action };
    }

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, ...result }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================
//  AUTH — LOGIN
// ============================================================

function doLogin(ss, params) {
  const { username, password } = params;
  if (!username || !password) throw new Error('Username dan password wajib diisi');

  const sheet = ss.getSheetByName('Users');
  const data = sheet.getDataRange().getValues();
  const headers = data[0]; // Username|Password|Role|Nama|Jabatan|NamaAnak|Jenjang|Active

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0] === username && row[1] === password && row[7] === 'Y') {
      return {
        user: {
          username:  row[0],
          role:      row[2],
          nama:      row[3],
          jabatan:   row[4],
          namaAnak:  row[5],
          jenjang:   row[6],
          tipeGuru:  row[8] || 'kelas',
          kelasAmpu: row[9] || '',
        }
      };
    }
  }
  throw new Error('Username atau password salah');
}

// ============================================================
//  USER MANAGEMENT
// ============================================================

function getUsers(ss) {
  const sheet = ss.getSheetByName('Users');
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return { data: [] };
  const headers = data[0];
  const users = data.slice(1).map(row => ({
    username:  row[0],
    password:  row[1],
    role:      row[2],
    nama:      row[3],
    jabatan:   row[4],
    namaAnak:  row[5],
    jenjang:   row[6],
    active:    row[7],
    tipeGuru:  row[8] || '',
    kelasAmpu: row[9] || '',
  }));
  return { data: users };
}

function saveUser(ss, params) {
  const { username, password, role, nama, jabatan, namaAnak, jenjang, tipeGuru, kelasAmpu, isNew } = params;
  if (!username || !password || !role || !nama) throw new Error('Username, password, role, dan nama wajib diisi');

  const sheet = ss.getSheetByName('Users');
  const data = sheet.getDataRange().getValues();

  // Cek apakah username sudah ada
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === username) {
      if (isNew) throw new Error('Username "' + username + '" sudah digunakan');
      // Update baris yang ada (10 kolom)
      sheet.getRange(i+1, 1, 1, 10).setValues([[
        username, password, role, nama,
        jabatan||'', namaAnak||'', jenjang||'', 'Y', tipeGuru||'', kelasAmpu||''
      ]]);
      return { message: 'Akun ' + username + ' berhasil diupdate' };
    }
  }

  // Tambah baris baru
  sheet.appendRow([username, password, role, nama, jabatan||'', namaAnak||'', jenjang||'', 'Y', tipeGuru||'', kelasAmpu||'']);
  return { message: 'Akun ' + username + ' berhasil ditambahkan' };
}

function deleteUser(ss, username) {
  if (!username) throw new Error('Username wajib diisi');
  if (username === 'admin') throw new Error('Akun admin tidak bisa dihapus');

  const sheet = ss.getSheetByName('Users');
  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][0] === username) {
      sheet.deleteRow(i + 1);
      return { message: 'Akun ' + username + ' berhasil dihapus' };
    }
  }
  throw new Error('Akun tidak ditemukan');
}

// ============================================================
//  MURID MANAGEMENT
// ============================================================

function getMurid(ss) {
  const sheet = ss.getSheetByName('Murid');
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return { data: [] };
  const murid = data.slice(1).filter(r => r[6] === 'Y').map(row => ({
    id:           row[0],
    nama:         row[1],
    kelas:        row[2],
    jenjang:      row[3],
    usernameOrtu: row[4],
    pin:          row[5] ? String(row[5]) : '',
    active:       row[6],
  }));
  return { data: murid };
}

function saveMurid(ss, params) {
  const { id, nama, kelas, jenjang, usernameOrtu, isNew } = params;
  if (!nama || !kelas) throw new Error('Nama dan kelas wajib diisi');

  const sheet = ss.getSheetByName('Murid');
  const data = sheet.getDataRange().getValues();

  if (!isNew && id) {
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        const existingPin = data[i][5] || '';
        sheet.getRange(i+1, 1, 1, 7).setValues([[id, nama, kelas, jenjang||'', usernameOrtu||'', existingPin, 'Y']]);
        return { message: 'Data murid ' + nama + ' berhasil diupdate' };
      }
    }
  }

  // Buat ID baru
  const newId = data.length; // simple auto-increment
  sheet.appendRow([newId, nama, kelas, jenjang||'', usernameOrtu||'', '', 'Y']); // PIN kosong, digenerate terpisah
  return { message: 'Murid ' + nama + ' berhasil ditambahkan', id: newId };
}

function deleteMurid(ss, id) {
  if (!id) throw new Error('ID murid wajib diisi');
  const sheet = ss.getSheetByName('Murid');
  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]) === String(id)) {
      sheet.getRange(i+1, 7).setValue('N'); // soft delete (kolom Active = 7)
      return { message: 'Murid berhasil dinonaktifkan' };
    }
  }
  throw new Error('Data murid tidak ditemukan');
}

// ============================================================
//  JOB TRACKER
// ============================================================

function saveJobTracker(ss, params) {
  const { karyawan, jabatan, tanggal, tasks, sesi } = params;
  if (!karyawan || !tasks) throw new Error('karyawan dan tasks wajib diisi');

  const sheet = ss.getSheetByName('JobTracker');
  const now = ts();
  const taskArr = Array.isArray(tasks) ? tasks : JSON.parse(tasks);
  const sesiLabel = sesi === 'sore' ? 'Sore' : 'Pagi';

  // Hapus baris lama untuk karyawan+tanggal+sesi ini
  const allData = sheet.getDataRange().getValues();
  for (let i = allData.length - 1; i >= 1; i--) {
    if (String(allData[i][3]) === karyawan && String(allData[i][1]) === tanggal && String(allData[i][2]) === sesiLabel) {
      sheet.deleteRow(i + 1);
    }
  }

  // Hitung nilai rekap (sore only): selesai/(selesai+tidakSelesai)*100, onProgres tidak dihitung
  let nilaiRekap = null;
  if (sesi === 'sore') {
    const selesai     = taskArr.filter(t => t.status === 'Selesai').length;
    const tidakSelesai = taskArr.filter(t => t.status === 'Tidak Selesai').length;
    const totalHitung  = selesai + tidakSelesai;
    nilaiRekap = totalHitung > 0 ? Math.round(selesai / totalHitung * 100) : 0;
  }

  taskArr.forEach((t, i) => {
    const skorTask = sesi === 'sore'
      ? (t.status === 'Selesai' ? 100 : t.status === 'Tidak Selesai' ? 0 : null)
      : null;
    // Cols: Timestamp|Tanggal|Sesi|Karyawan|Jabatan|No|Agenda|Status|Target Selesai|Skor|Bukti|Catatan|Nilai Rekap
    sheet.appendRow([
      now, tanggal, sesiLabel, karyawan, jabatan||'', i+1,
      t.agenda, sesi === 'sore' ? (t.status || 'On Progres') : 'On Progres',
      t.target||'', skorTask, t.file||'', t.catatan||'',
      i === 0 && nilaiRekap !== null ? nilaiRekap : ''
    ]);
  });

  // KV per sesi
  const kvSesi = `job_${sesiLabel.toLowerCase()}_${karyawan}_${tanggal}`;
  kvSet(ss, kvSesi, { karyawan, jabatan, tanggal, sesi: sesiLabel, tasks: taskArr, nilaiRekap, updatedAt: now });

  // KV master (selalu update dgn data terbaru)
  const existing = kvGet(ss, `job_${karyawan}`) || {};
  kvSet(ss, `job_${karyawan}`, {
    karyawan, jabatan, tanggal,
    tasks: taskArr,
    nilaiRekap: sesi === 'sore' ? nilaiRekap : existing.nilaiRekap,
    pagiSubmittedAt: sesi === 'pagi' ? now : existing.pagiSubmittedAt,
    soreSubmittedAt: sesi === 'sore' ? now : existing.soreSubmittedAt,
    updatedAt: now,
  });

  return { message: `Job tracker ${karyawan} (${sesiLabel}) tersimpan`, nilaiRekap };
}

function getJobTrackerToday(ss, params) {
  const { karyawan } = params;
  const tanggal = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd');
  const pagi = kvGet(ss, `job_pagi_${karyawan}_${tanggal}`);
  const sore = kvGet(ss, `job_sore_${karyawan}_${tanggal}`);
  return { pagi, sore, tanggal };
}

function getAllJobTracker(ss) {
  const userData = ss.getSheetByName('Users').getDataRange().getValues();
  const grouped = {};
  userData.slice(1)
    .filter(row => row[2] === 'guru' && row[7] === 'Y')
    .forEach(row => {
      const nama = row[3];
      const data = kvGet(ss, `job_${nama}`);
      grouped[nama] = {
        karyawan: nama,
        jabatan:  row[4],
        tipeGuru: row[8] || 'kelas',
        kelasAmpu: row[9] || '',
        tasks: data ? (data.tasks || []) : [],
        nilaiRekap: data ? data.nilaiRekap : null,
        pagiSubmittedAt: data ? data.pagiSubmittedAt : null,
        soreSubmittedAt: data ? data.soreSubmittedAt : null,
        tanggal: data ? data.tanggal : null,
      };
    });
  return { data: grouped };
}

function getJobTracker(ss, karyawan) {
  return { data: kvGet(ss, `job_${karyawan}`) };
}

// ============================================================
//  BUKU PENGHUBUNG GURU
// ============================================================

const BUKU_KAT = [
  { no:1, label:'Pembiasaan Ibadah Harian', items:[
    'Shalat Subuh','Shalat Dzuhur','Shalat Ashar','Shalat Maghrib','Shalat Isya',
    'Shalat Dhuha','Shalat Tahajud','Membaca Dzikir Pagi dan Petang',
    'Murajaah Hafalan Alquran','Membaca Alquran ½ juz per hari',
  ]},
  { no:2, label:'Kedisiplinan', items:[
    'Tidur maksimal pukul 21.00 WIB','Bangun tidur sebelum adzan subuh / maks. 05.30 WIB',
    'Membawa bekal makanan sehat dan bergizi seimbang','Penggunaan HP/TV maksimal 30 menit',
    'Belajar minimal 15–30 menit selama di rumah',
  ]},
  { no:3, label:'Memuliakan Orangtua', items:[
    'Merapikan tempat tidur','Mencuci piring setelah makan',
    'Menyapu / mengepel lantai','Memijat orangtua (minimal 1 pekan sekali)',
  ]},
];

function saveBukuGuru(ss, params) {
  const { siswa, minggu, data, taklim } = params;
  if (!siswa) throw new Error('siswa wajib diisi');
  const dataObj   = typeof data   === 'string' ? JSON.parse(data)   : data;
  const taklimObj = typeof taklim === 'string' ? JSON.parse(taklim) : taklim;

  const sheet = ss.getSheetByName('BukuGuru');
  const now = ts();
  deleteRowsByCol(sheet, 'Siswa', siswa);

  let rn = 1;
  BUKU_KAT.forEach((kat, ki) => {
    kat.items.forEach((item, ii) => {
      const h = dataObj[ki]&&dataObj[ki][ii] ? dataObj[ki][ii] : {};
      sheet.appendRow([now, siswa, minggu||'Minggu Ini', 'Draft', kat.no, kat.label, rn++, item,
        h['Senin']||'—', h['Selasa']||'—', h['Rabu']||'—', h['Kamis']||'—', h['Jumat']||'—']);
    });
  });
  ['Senin','Selasa','Rabu','Kamis','Jumat'].forEach(h => {
    const t = taklimObj&&taklimObj[h] ? taklimObj[h] : {tema:'',val:'—'};
    sheet.appendRow([now, siswa, minggu||'Minggu Ini', 'Draft', 4, 'Taklim', rn++,
      'Tema: '+(t.tema||'—'),
      h==='Senin'?t.val:'—', h==='Selasa'?t.val:'—', h==='Rabu'?t.val:'—',
      h==='Kamis'?t.val:'—', h==='Jumat'?t.val:'—']);
  });

  const existing = kvGet(ss, `buku_guru_${siswa}`) || {};
  kvSet(ss, `buku_guru_${siswa}`, {
    siswa, minggu, data: dataObj, taklim: taklimObj,
    published: existing.published||false, updatedAt: now,
  });
  return { message: `Buku guru ${siswa} tersimpan` };
}

function publishBukuGuru(ss, siswa) {
  const existing = kvGet(ss, `buku_guru_${siswa}`);
  if (!existing) throw new Error('Simpan buku dulu sebelum publish');
  existing.published = true;
  existing.publishedAt = ts();
  kvSet(ss, `buku_guru_${siswa}`, existing);

  const sheet = ss.getSheetByName('BukuGuru');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === siswa) sheet.getRange(i+1, 4).setValue('Published ✅');
  }
  return { message: `Buku ${siswa} dipublish` };
}

function getBukuGuru(ss, siswa) {
  return { data: kvGet(ss, `buku_guru_${siswa}`) };
}

function getAllBukuStatus(ss) {
  const { data: murid } = getMurid(ss);
  const result = {};
  murid.forEach(m => {
    const d = kvGet(ss, `buku_guru_${m.nama}`);
    result[m.nama] = d ? { published: d.published, updatedAt: d.updatedAt } : null;
  });
  return { data: result };
}

// ============================================================
//  BUKU ORTU
// ============================================================

function saveBukuOrtu(ss, params) {
  const { siswa, tanggal, data, taklim } = params;
  if (!siswa) throw new Error('siswa wajib diisi');
  const dataObj   = typeof data   === 'string' ? JSON.parse(data)   : data;
  const taklimObj = typeof taklim === 'string' ? JSON.parse(taklim) : taklim;

  const sheet = ss.getSheetByName('BukuOrtu');
  const now = ts();
  let rn = 1;
  BUKU_KAT.forEach((kat, ki) => {
    kat.items.forEach((item, ii) => {
      const h = dataObj[ki]&&dataObj[ki][ii] ? dataObj[ki][ii] : {};
      sheet.appendRow([now, siswa, tanggal||now, kat.no, kat.label, rn++, item,
        h['Senin']||'—', h['Selasa']||'—', h['Rabu']||'—', h['Kamis']||'—', h['Jumat']||'—']);
    });
  });

  const existing = kvGet(ss, `buku_ortu_${siswa}`) || [];
  existing.unshift({ siswa, tanggal: tanggal||now, data: dataObj, taklim: taklimObj, createdAt: now });
  kvSet(ss, `buku_ortu_${siswa}`, existing);
  return { message: `Laporan rumah ${siswa} tersimpan` };
}

function getBukuOrtu(ss, siswa) {
  return { data: kvGet(ss, `buku_ortu_${siswa}`) || [] };
}

// ============================================================
//  KPI
// ============================================================

function saveKpi(ss, params) {
  const { guru, jabatan, rows } = params;
  const rowArr = typeof rows === 'string' ? JSON.parse(rows) : rows;
  const sheet = ss.getSheetByName('KPI');
  const now = ts();
  deleteRowsByCol(sheet, 'Guru', guru);
  rowArr.forEach(r => {
    sheet.appendRow([now, guru, jabatan||'', r.ind, r.target, r.capaian, r.pct+'%', r.status, r.ket||'']);
  });
  kvSet(ss, `kpi_${guru}`, { guru, jabatan, rows: rowArr, updatedAt: now });
  return { message: `KPI ${guru} tersimpan` };
}

function getKpi(ss, guru) {
  return { data: kvGet(ss, `kpi_${guru}`) };
}

// ============================================================
//  UTILITIES
// ============================================================

function deleteRowsByCol(sheet, colName, value) {
  const data = sheet.getDataRange().getValues();
  const idx = data[0].indexOf(colName);
  if (idx < 0) return;
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][idx] === value) sheet.deleteRow(i + 1);
  }
}

function sheetGetAll(ss, name) {
  const data = ss.getSheetByName(name).getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

// ============================================================
//  PIN ORANGTUA
// ============================================================

function generatePin(ss, params) {
  const { muridId } = params;
  if (!muridId) throw new Error('muridId wajib diisi');
  const sheet = ss.getSheetByName('Murid');
  const data = sheet.getDataRange().getValues();
  const pin = String(Math.floor(1000 + Math.random() * 9000)); // 4 digit

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(muridId)) {
      sheet.getRange(i + 1, 6).setValue(pin); // kolom PIN (index 5, kolom 6)
      return { pin, nama: data[i][1], message: 'PIN berhasil digenerate untuk ' + data[i][1] };
    }
  }
  throw new Error('Murid tidak ditemukan');
}

function resetPin(ss, params) {
  return generatePin(ss, params); // sama logikanya, generate ulang
}

function verifyPin(ss, params) {
  const { muridId, pin } = params;
  if (!muridId || !pin) throw new Error('muridId dan pin wajib diisi');
  const sheet = ss.getSheetByName('Murid');
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(muridId) && data[i][6] === 'Y') {
      const storedPin = String(data[i][5]);
      if (!storedPin) throw new Error('PIN belum diset. Hubungi admin.');
      if (storedPin === String(pin)) {
        return {
          verified: true,
          murid: {
            id:      data[i][0],
            nama:    data[i][1],
            kelas:   data[i][2],
            jenjang: data[i][3],
          }
        };
      }
      throw new Error('PIN salah. Coba lagi atau hubungi admin.');
    }
  }
  throw new Error('Data siswa tidak ditemukan');
}

function getMuridByJenjang(ss, jenjang) {
  const sheet = ss.getSheetByName('Murid');
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return { data: [] };
  const result = data.slice(1)
    .filter(row => row[6] === 'Y' && (!jenjang || row[3] === jenjang))
    .map(row => ({ id: row[0], nama: row[1], kelas: row[2], jenjang: row[3] }));
  return { data: result };
}

// ============================================================
//  JADWAL AGENDA
// ============================================================

function getJadwalAgenda(ss) {
  const sheet = ss.getSheetByName('JadwalAgenda');
  if (!sheet) return { jamBuka:'05:00', jamTutup:'08:00', jamBukaSore:'15:00', jamTutupSore:'17:00' };
  const data = sheet.getDataRange().getValues();
  let jamBuka = '05:00', jamTutup = '08:00', jamBukaSore = '15:00', jamTutupSore = '17:00';
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === 'jamBuka')      jamBuka      = data[i][1];
    if (data[i][0] === 'jamTutup')     jamTutup     = data[i][1];
    if (data[i][0] === 'jamBukaSore')  jamBukaSore  = data[i][1];
    if (data[i][0] === 'jamTutupSore') jamTutupSore = data[i][1];
  }
  return { jamBuka, jamTutup, jamBukaSore, jamTutupSore };
}

function setJadwalAgenda(ss, params) {
  const { jamBuka, jamTutup, jamBukaSore, jamTutupSore } = params;
  if (!jamBuka || !jamTutup) throw new Error('jamBuka dan jamTutup wajib diisi');
  const sheet = ss.getSheetByName('JadwalAgenda');
  const data = sheet.getDataRange().getValues();
  const now = ts();

  const updates = { jamBuka, jamTutup };
  if (jamBukaSore)  updates.jamBukaSore  = jamBukaSore;
  if (jamTutupSore) updates.jamTutupSore = jamTutupSore;

  const found = {};
  for (let i = 1; i < data.length; i++) {
    const k = data[i][0];
    if (updates[k] !== undefined) { sheet.getRange(i+1,2,1,2).setValues([[updates[k], now]]); found[k] = true; }
  }
  Object.keys(updates).forEach(k => { if (!found[k]) sheet.appendRow([k, updates[k], now]); });

  return { message: 'Jadwal agenda berhasil diupdate: Pagi ' + jamBuka + '–' + jamTutup + ', Sore ' + (jamBukaSore||'15:00') + '–' + (jamTutupSore||'17:00') };
}

// ============================================================
//  ASSIGN TUGAS DARI PIMPINAN
// ============================================================

function assignTugas(ss, params) {
  const { dari, target, agenda, deadline, catatan } = params;
  if (!target || !agenda) throw new Error('Target dan agenda wajib diisi');

  const sheet = ss.getSheetByName('TugasPimpinan');
  const now = ts();
  const newId = sheet.getLastRow(); // auto ID

  // Jika target = 'semua', ambil semua karyawan dari Users
  let targets = [];
  if (target === 'semua') {
    const usersSheet = ss.getSheetByName('Users');
    const usersData = usersSheet.getDataRange().getValues();
    usersData.slice(1).forEach(row => {
      if (row[2] === 'guru' && row[7] === 'Y') targets.push(row[3]); // Nama Lengkap
    });
  } else {
    targets = [target];
  }

  targets.forEach((namaTarget, idx) => {
    sheet.appendRow([newId + idx, now, dari || 'Pimpinan', namaTarget, agenda, deadline || '', catatan || '', 'Baru']);

    // Tambah ke job tracker karyawan yang bersangkutan
    const existing = kvGet(ss, `job_${namaTarget}`);
    const tasks = (existing && existing.tasks) ? [...existing.tasks] : [];
    tasks.unshift({
      agenda: '📌 [Dari Pimpinan] ' + agenda,
      status: 'Pending',
      target: deadline || '',
      skor: 0,
      file: '',
      catatan: catatan || '',
      dariPimpinan: true,
    });
    kvSet(ss, `job_${namaTarget}`, {
      karyawan: namaTarget,
      jabatan: existing ? existing.jabatan : '',
      tanggal: new Date().toISOString().split('T')[0],
      tasks,
      updatedAt: now,
    });
  });

  return { message: 'Tugas berhasil diberikan ke ' + (target === 'semua' ? targets.length + ' karyawan' : target) };
}

function getTugasPimpinan(ss, karyawan) {
  const sheet = ss.getSheetByName('TugasPimpinan');
  if (!sheet) return { data: [] };
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return { data: [] };
  const result = data.slice(1)
    .filter(row => !karyawan || row[3] === karyawan)
    .map(row => ({
      id: row[0], timestamp: row[1], dari: row[2], target: row[3],
      agenda: row[4], deadline: row[5], catatan: row[6], status: row[7],
    }));
  return { data: result };
}

// ============================================================
//  PENDAFTARAN (REGISTRASI)
// ============================================================

function doRegister(ss, params) {
  const { nama, email, noHp, role, jabatan, namaAnak, jenjang, username, password } = params;

  if (!nama || !email || !noHp || !role || !username || !password)
    throw new Error('Semua field wajib diisi');
  if (!['guru','ortu'].includes(role))
    throw new Error('Role tidak valid. Pilih guru atau orangtua.');

  // Cek username tidak duplikat di Users
  const usersSheet = ss.getSheetByName('Users');
  if (usersSheet) {
    const usersData = usersSheet.getDataRange().getValues();
    for (let i = 1; i < usersData.length; i++) {
      if (usersData[i][0] === username)
        throw new Error('Username "' + username + '" sudah digunakan. Pilih username lain.');
    }
  }

  // Cek username tidak duplikat di Pendaftaran (yg masih pending)
  const sheet = ss.getSheetByName('Pendaftaran');
  if (sheet) {
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][9] === username && data[i][11] === 'Menunggu')
        throw new Error('Username "' + username + '" sudah ada dalam antrian pendaftaran.');
    }
  }

  const now = ts();
  const newId = sheet ? sheet.getLastRow() : 1; // auto ID
  sheet.appendRow([
    newId, now, nama, email, noHp, role,
    jabatan || '', namaAnak || '', jenjang || '',
    username, password, 'Menunggu', ''
  ]);

  return { message: 'Pendaftaran berhasil dikirim! Tunggu persetujuan admin sebelum bisa login.' };
}

function getPendaftaran(ss) {
  const sheet = ss.getSheetByName('Pendaftaran');
  if (!sheet) return { data: [] };
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return { data: [] };
  const headers = data[0];
  return {
    data: data.slice(1).map(row => ({
      id:        row[0],
      timestamp: row[1],
      nama:      row[2],
      email:     row[3],
      noHp:      row[4],
      role:      row[5],
      jabatan:   row[6],
      namaAnak:  row[7],
      jenjang:   row[8],
      username:  row[9],
      password:  row[10],
      status:    row[11],
      catatan:   row[12],
    }))
  };
}

function approvePendaftaran(ss, params) {
  const { id } = params;
  if (!id) throw new Error('ID pendaftaran wajib diisi');

  const sheet = ss.getSheetByName('Pendaftaran');
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      const row = data[i];
      const username = row[9], password = row[10], role = row[5];
      const nama = row[2], jabatan = row[6], namaAnak = row[7], jenjang = row[8];

      // Cek duplikat username di Users
      const usersSheet = ss.getSheetByName('Users');
      const usersData = usersSheet.getDataRange().getValues();
      for (let j = 1; j < usersData.length; j++) {
        if (usersData[j][0] === username)
          throw new Error('Username "' + username + '" sudah ada di sistem. Edit username di form pendaftaran.');
      }

      // Tambah ke Users
      usersSheet.appendRow([username, password, role, nama, jabatan, namaAnak, jenjang, 'Y', '', '']);

      // Update status di Pendaftaran
      sheet.getRange(i + 1, 12).setValue('Diterima ✅');
      sheet.getRange(i + 1, 13).setValue('Disetujui oleh admin — ' + ts());

      return { message: 'Pendaftaran ' + nama + ' berhasil diterima. Akun sudah aktif.' };
    }
  }
  throw new Error('Data pendaftaran tidak ditemukan');
}

function rejectPendaftaran(ss, params) {
  const { id, catatan } = params;
  if (!id) throw new Error('ID wajib diisi');

  const sheet = ss.getSheetByName('Pendaftaran');
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.getRange(i + 1, 12).setValue('Ditolak ❌');
      sheet.getRange(i + 1, 13).setValue(catatan || 'Ditolak oleh admin — ' + ts());
      return { message: 'Pendaftaran ditolak.' };
    }
  }
  throw new Error('Data pendaftaran tidak ditemukan');
}

// ============================================================
//  KPI HARIAN (6 item tetap, self-assessment guru)
// ============================================================

const KPI_HARIAN_ITEMS = [
  'Berpenampilan rapi, sopan, dan sesuai syariat Islam serta ketentuan Al-Karim.',
  'Menggunakan ID Card sebagai identitas selama menjalankan tugas.',
  'Melengkapi Tugas harian, termasuk absensi dan jurnal mengajar, dengan tertib.',
  'Berpartisipasi aktif menyebarkan informasi positif Sekolah ke sosial media',
];

function saveKpiHarian(ss, params) {
  const { guru, jabatan, tanggal, items } = params;
  const itemArr = typeof items === 'string' ? JSON.parse(items) : items;
  if (!guru || !itemArr) throw new Error('guru dan items wajib diisi');

  const sheet = ss.getSheetByName('KpiHarian');
  const now = ts();

  // Hapus baris lama untuk guru+tanggal
  const allData = sheet.getDataRange().getValues();
  for (let i = allData.length - 1; i >= 1; i--) {
    if (String(allData[i][2]) === guru && String(allData[i][1]) === tanggal) sheet.deleteRow(i + 1);
  }

  const totalSkor = itemArr.length
    ? Math.round(itemArr.reduce((s, it) => s + (Number(it.nilai) || 0), 0) / itemArr.length)
    : 0;

  itemArr.forEach((item, i) => {
    sheet.appendRow([now, tanggal, guru, jabatan||'', i+1, item.label, item.nilai, i===0 ? totalSkor : '']);
  });

  const kpiKey = `kpi_harian_${guru}_${tanggal}`;
  kvSet(ss, kpiKey, { guru, jabatan, tanggal, items: itemArr, totalSkor, updatedAt: now });
  return { message: `KPI harian ${guru} tersimpan`, totalSkor };
}

function getKpiHarian(ss, params) {
  const { guru, tanggal } = params;
  return { data: kvGet(ss, `kpi_harian_${guru}_${tanggal}`) };
}

function getAllKpiHarian(ss, params) {
  const tanggal = (params && params.tanggal)
    ? params.tanggal
    : Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd');
  const userData = ss.getSheetByName('Users').getDataRange().getValues();
  const result = {};
  userData.slice(1)
    .filter(row => row[2] === 'guru' && row[7] === 'Y')
    .forEach(row => {
      const nama = row[3];
      const jabatan = row[4];
      const data = kvGet(ss, `kpi_harian_${nama}_${tanggal}`);
      result[nama] = {
        guru: nama,
        jabatan,
        tanggal,
        submitted: !!data,
        totalSkor: data ? data.totalSkor : null,
        items: data ? data.items : [],
      };
    });
  return { data: result, tanggal };
}

// ============================================================
//  BATCH IMPORT
// ============================================================

function batchImportMurid(ss, params) {
  // params.rows = [{ nama, kelas, jenjang, usernameOrtu? }]
  const sheet = ss.getSheetByName('Murid');
  const existing = sheet.getDataRange().getValues();
  const existingNames = existing.slice(1).map(r => String(r[1]).toLowerCase());
  let added = 0, skipped = 0;
  const rows = params.rows || [];
  rows.forEach(r => {
    const nama = String(r.nama || '').trim();
    if (!nama) { skipped++; return; }
    if (existingNames.includes(nama.toLowerCase())) { skipped++; return; }
    const newId = existing.length + added; // simple auto-increment
    sheet.appendRow([newId, nama, r.kelas||'', r.jenjang||'', r.usernameOrtu||'', '', 'Y']);
    existingNames.push(nama.toLowerCase());
    added++;
  });
  return { message: `Import selesai: ${added} siswa ditambahkan, ${skipped} dilewati (sudah ada/kosong)`, added, skipped };
}

function batchImportUsers(ss, params) {
  // params.rows = [{ username, password, role, nama, jabatan?, namaAnak?, jenjang?, tipeGuru?, kelasAmpu? }]
  const sheet = ss.getSheetByName('Users');
  const existing = sheet.getDataRange().getValues();
  const existingUsernames = existing.slice(1).map(r => String(r[0]).toLowerCase());
  let added = 0, skipped = 0;
  const rows = params.rows || [];
  rows.forEach(r => {
    const username = String(r.username || '').trim().toLowerCase().replace(/\s+/g, '.');
    const nama = String(r.nama || '').trim();
    if (!username || !nama) { skipped++; return; }
    if (existingUsernames.includes(username)) { skipped++; return; }
    const password = r.password || 'alkarim123';
    const role = r.role || 'guru';
    sheet.appendRow([username, password, role, nama,
      r.jabatan||'', r.namaAnak||'', r.jenjang||'', 'Y', r.tipeGuru||'', r.kelasAmpu||'']);
    existingUsernames.push(username);
    added++;
  });
  return { message: `Import selesai: ${added} akun ditambahkan, ${skipped} dilewati (sudah ada/kosong)`, added, skipped };
}

// ============================================================
//  TEST (jalankan manual dari editor)
// ============================================================

function testInit() {
  const ss = getOrCreateSS();
  Logger.log('URL: ' + ss.getUrl());
  Logger.log('Sheets: ' + ss.getSheets().map(s => s.getName()).join(', '));
}

function testLogin() {
  const ss = getOrCreateSS();
  Logger.log(JSON.stringify(doLogin(ss, { username: 'admin', password: 'admin123' })));
  Logger.log(JSON.stringify(doLogin(ss, { username: 'bu.siti', password: 'guru123' })));
}
