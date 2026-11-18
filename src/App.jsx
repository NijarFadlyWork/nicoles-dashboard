import { Fragment, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const rupiah = (v) => "Rp " + Number(v).toLocaleString("id-ID", { maximumFractionDigits: 0 });
const angka = (v) => Number(v).toLocaleString("id-ID", { maximumFractionDigits: 2 });
const jt = (v) => `${(v / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 0 })} jt`;
const namaBulan = (s) =>
  new Date(s + "T00:00:00").toLocaleDateString("id-ID", { month: "short", year: "numeric" });

// Ambil satu view dari Supabase. Error satu bagian tidak menghentikan bagian lain.
function useView(nama, ubah) {
  const [state, setState] = useState({ data: [], loading: true, error: null });
  useEffect(() => {
    let batal = false;
    ubah(supabase.from(nama).select("*")).then(({ data, error }) => {
      if (batal) return;
      setState({ data: data ?? [], loading: false, error: error ? error.message : null });
    });
    return () => {
      batal = true;
    };
  }, [nama]);
  return state;
}

function Bagian({ judul, state, kosong, children }) {
  return (
    <section className="bagian">
      <h2>{judul}</h2>
      {state.loading && <p className="info">Memuat data…</p>}
      {state.error && <p className="galat">Gagal memuat: {state.error}</p>}
      {!state.loading && !state.error && state.data.length === 0 && <p className="info">{kosong}</p>}
      {!state.loading && !state.error && state.data.length > 0 && children}
    </section>
  );
}

const tanggalIndo = (s) =>
  new Date(s + "T00:00:00").toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

// Daftar faktur satu pelanggan. Dimuat saat baris dibuka.
function DetailFaktur({ pelanggan }) {
  const [state, setState] = useState({ data: [], loading: true, error: null });
  useEffect(() => {
    let batal = false;
    supabase
      .from("v_faktur_detail")
      .select("*")
      .eq("pelanggan", pelanggan)
      .order("tanggal")
      .then(({ data, error }) => {
        if (batal) return;
        setState({ data: data ?? [], loading: false, error: error ? error.message : null });
      });
    return () => {
      batal = true;
    };
  }, [pelanggan]);

  if (state.loading) return <p className="info">Memuat faktur…</p>;
  if (state.error) return <p className="galat">Gagal memuat faktur: {state.error}</p>;
  if (state.data.length === 0) return <p className="info">Tidak ada faktur.</p>;

  return (
    <table className="detail">
      <thead>
        <tr>
          <th>Nomor faktur</th>
          <th>Tanggal</th>
          <th>Tipe</th>
          <th className="kanan">Jumlah</th>
        </tr>
      </thead>
      <tbody>
        {state.data.map((f) => (
          <tr key={f.nomor_faktur}>
            <td>{f.nomor_faktur}</td>
            <td>{tanggalIndo(f.tanggal)}</td>
            <td>{f.tipe}</td>
            <td className="kanan">{rupiah(f.jumlah)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Produk yang dibeli satu pelanggan, diurutkan dari yang paling banyak.
function DetailProduk({ pelanggan }) {
  const [state, setState] = useState({ data: [], loading: true, error: null });
  useEffect(() => {
    let batal = false;
    supabase
      .from("v_produk_per_pelanggan")
      .select("*")
      .eq("pelanggan", pelanggan)
      .order("total_qty", { ascending: false })
      .limit(15)
      .then(({ data, error }) => {
        if (batal) return;
        setState({ data: data ?? [], loading: false, error: error ? error.message : null });
      });
    return () => {
      batal = true;
    };
  }, [pelanggan]);

  if (state.loading) return <p className="info">Memuat produk…</p>;
  if (state.error) return <p className="galat">Gagal memuat produk: {state.error}</p>;
  if (state.data.length === 0)
    return <p className="info">Belum ada data produk untuk pelanggan ini.</p>;

  const maks = Math.max(...state.data.map((p) => p.total_qty), 1);

  return (
    <table className="detail">
      <thead>
        <tr>
          <th>Produk</th>
          <th className="lebar-bar">Jumlah terjual</th>
          <th className="kanan">Nilai</th>
        </tr>
      </thead>
      <tbody>
        {state.data.map((p) => (
          <tr key={p.produk}>
            <td>{p.produk}</td>
            <td>
              <div className="bar-wadah">
                <div
                  className="bar-isi"
                  style={{ width: `${Math.max(2, (p.total_qty / maks) * 100)}%` }}
                />
                <span>{angka(p.total_qty)}</span>
              </div>
            </td>
            <td className="kanan">{rupiah(p.total_nilai)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Penjualan satu pelanggan per bulan. Bulan tanpa faktur diisi 0 supaya tren tidak menipu.
function DetailTren({ pelanggan, bulan }) {
  const [state, setState] = useState({ data: [], loading: true, error: null });
  useEffect(() => {
    let batal = false;
    supabase
      .from("v_penjualan_bulanan_pelanggan")
      .select("*")
      .eq("pelanggan", pelanggan)
      .order("bulan")
      .then(({ data, error }) => {
        if (batal) return;
        setState({ data: data ?? [], loading: false, error: error ? error.message : null });
      });
    return () => {
      batal = true;
    };
  }, [pelanggan]);

  if (state.loading) return <p className="info">Memuat tren…</p>;
  if (state.error) return <p className="galat">Gagal memuat tren: {state.error}</p>;
  if (state.data.length === 0) return <p className="info">Tidak ada data penjualan.</p>;

  const peta = Object.fromEntries(state.data.map((r) => [r.bulan, r.total]));
  const daftarBulan = bulan.length > 0 ? bulan : state.data.map((r) => r.bulan);
  const deret = daftarBulan.map((b) => ({ bulan: b, total: peta[b] ?? 0 }));

  const jumlah = deret.reduce((a, r) => a + r.total, 0);
  const rata = jumlah / deret.length;
  const tertinggi = deret.reduce((a, r) => (r.total > a.total ? r : a), deret[0]);
  const terakhir = deret[deret.length - 1];
  const sebelum = deret.length > 1 ? deret[deret.length - 2] : null;
  const perubahan =
    sebelum && sebelum.total > 0 ? ((terakhir.total - sebelum.total) / sebelum.total) * 100 : null;

  return (
    <div>
      <ul className="ringkas">
        <li>
          Rata-rata per bulan <strong>{rupiah(rata)}</strong>
        </li>
        <li>
          Tertinggi <strong>{rupiah(tertinggi.total)}</strong> ({namaBulan(tertinggi.bulan)})
        </li>
        {perubahan !== null && (
          <li>
            {namaBulan(terakhir.bulan)} vs {namaBulan(sebelum.bulan)}{" "}
            <strong className={perubahan >= 0 ? "naik" : "turun"}>
              {perubahan >= 0 ? "naik" : "turun"} {Math.abs(perubahan).toLocaleString("id-ID", { maximumFractionDigits: 0 })}%
            </strong>
          </li>
        )}
      </ul>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={deret} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#e4ddd0" />
          <XAxis dataKey="bulan" tickFormatter={namaBulan} />
          <YAxis tickFormatter={jt} width={70} />
          <Tooltip formatter={(v) => rupiah(v)} labelFormatter={namaBulan} />
          <Line
            type="monotone"
            dataKey="total"
            name="Penjualan"
            stroke="#2f5d50"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function DetailPelanggan({ pelanggan, bulan }) {
  const [tab, setTab] = useState("faktur");
  return (
    <div>
      <div className="tab" role="tablist">
        <button
          role="tab"
          aria-selected={tab === "faktur"}
          className={tab === "faktur" ? "aktif" : ""}
          onClick={() => setTab("faktur")}
        >
          Faktur
        </button>
        <button
          role="tab"
          aria-selected={tab === "produk"}
          className={tab === "produk" ? "aktif" : ""}
          onClick={() => setTab("produk")}
        >
          Produk
        </button>
        <button
          role="tab"
          aria-selected={tab === "tren"}
          className={tab === "tren" ? "aktif" : ""}
          onClick={() => setTab("tren")}
        >
          Tren
        </button>
      </div>
      {tab === "faktur" && <DetailFaktur pelanggan={pelanggan} />}
      {tab === "produk" && <DetailProduk pelanggan={pelanggan} />}
      {tab === "tren" && <DetailTren pelanggan={pelanggan} bulan={bulan} />}
    </div>
  );
}

const WARNA_TIPE = ["#2f5d50", "#b5651d", "#a33a2a", "#5b6c8f", "#8a7a2f", "#7a4e7a"];

// Rincian per jenis transaksi (faktur penjualan, retur, dst). Jenis diambil dari data.
function TipeTransaksi({ data }) {
  const daftarTipe = [...new Set(data.map((r) => r.tipe))];
  const daftarBulan = [...new Set(data.map((r) => r.bulan))].sort();

  const deret = daftarBulan.map((b) => {
    const baris = { bulan: b };
    daftarTipe.forEach((t) => (baris[t] = 0));
    data.filter((r) => r.bulan === b).forEach((r) => (baris[r.tipe] = r.total));
    return baris;
  });

  const ringkas = daftarTipe
    .map((t) => {
      const baris = data.filter((r) => r.tipe === t);
      return {
        tipe: t,
        total: baris.reduce((a, r) => a + r.total, 0),
        jumlah: baris.reduce((a, r) => a + r.jumlah, 0),
      };
    })
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));

  const bersih = ringkas.reduce((a, r) => a + r.total, 0);
  const totalFaktur = ringkas.reduce((a, r) => a + r.jumlah, 0);

  return (
    <div>
      {daftarTipe.length === 1 && (
        <p className="info" style={{ marginBottom: 12 }}>
          Semua transaksi bertipe "{daftarTipe[0]}". Belum ada retur atau jenis lain di data.
        </p>
      )}
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={deret} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#e4ddd0" />
          <XAxis dataKey="bulan" tickFormatter={namaBulan} />
          <YAxis tickFormatter={jt} width={70} />
          <Tooltip formatter={(v) => rupiah(v)} labelFormatter={namaBulan} />
          <Legend />
          {daftarTipe.map((t, i) => (
            <Bar key={t} dataKey={t} stackId="tipe" fill={WARNA_TIPE[i % WARNA_TIPE.length]} />
          ))}
        </BarChart>
      </ResponsiveContainer>

      <div className="gulir" style={{ marginTop: 16 }}>
        <table>
          <thead>
            <tr>
              <th>Jenis transaksi</th>
              <th className="kanan">Jumlah</th>
              <th className="kanan">Total</th>
            </tr>
          </thead>
          <tbody>
            {ringkas.map((r) => (
              <tr key={r.tipe}>
                <td>{r.tipe}</td>
                <td className="kanan">{r.jumlah}</td>
                <td className={"kanan" + (r.total < 0 ? " turun-teks" : "")}>{rupiah(r.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>Total bersih</td>
              <td className="kanan">{totalFaktur}</td>
              <td className="kanan">{rupiah(bersih)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ---------- Custom Table ----------
const DIMENSI = [
  { id: "produk", label: "Product Item", kolom: "nama_produk" },
  { id: "kategori", label: "Category", kolom: "kategori" },
  { id: "toko", label: "Consignment Store", kolom: "toko" },
];
const UKURAN = [
  { id: "stok", label: "Item Stock", kolom: "total_stok", format: angka },
  { id: "terjual", label: "Item Sold", kolom: "total_terjual", format: angka },
  { id: "revenue", label: "Total Revenue", kolom: "total_revenue", format: rupiah },
  { id: "demand", label: "Demand", kolom: "total_demand", format: angka },
];
const FORM_AWAL = {
  dims: ["produk"],
  ukuran: ["terjual", "revenue"],
  urut: "revenue",
  tampil: "tabel",
  mulai: "",
  akhir: "",
  kategori: "",
  item: "",
  batas: "10",
};
const MAKS_BARIS = 300;

function Pilihan({ tipe, nama, nilai, label, cek, onChange }) {
  return (
    <label className="pilihan">
      <input type={tipe} name={nama} value={nilai} checked={cek} onChange={onChange} />
      {label}
    </label>
  );
}

function CustomTable() {
  const [form, setForm] = useState(FORM_AWAL);
  const [terapan, setTerapan] = useState(FORM_AWAL);
  const [pesan, setPesan] = useState(null);
  const [hasil, setHasil] = useState({ data: [], loading: true, error: null });

  useEffect(() => {
    let batal = false;
    setHasil((h) => ({ ...h, loading: true }));
    supabase
      .rpc("custom_table", {
        p_dims: terapan.dims,
        p_urut: terapan.urut,
        p_batas: terapan.batas === "semua" ? null : Number(terapan.batas),
        p_mulai: terapan.mulai || null,
        p_akhir: terapan.akhir || null,
        p_kategori: terapan.kategori.trim() || null,
        p_item: terapan.item.trim() || null,
      })
      .then(({ data, error }) => {
        if (batal) return;
        setHasil({ data: data ?? [], loading: false, error: error ? error.message : null });
      });
    return () => {
      batal = true;
    };
  }, [terapan]);

  const ubah = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggle = (k, id) =>
    setForm((f) => ({
      ...f,
      [k]: f[k].includes(id) ? f[k].filter((x) => x !== id) : [...f[k], id],
    }));

  const terapkan = () => {
    if (form.dims.length === 0) {
      setPesan("Pilih minimal satu dari Product Item, Category, atau Consignment Store.");
      return;
    }
    if (form.mulai && form.akhir && form.mulai > form.akhir) {
      setPesan("Start Date tidak boleh lebih baru dari End Date.");
      return;
    }
    setPesan(null);
    setTerapan(form);
  };
  const reset = () => {
    setPesan(null);
    setForm(FORM_AWAL);
    setTerapan(FORM_AWAL);
  };

  const dimTampil = DIMENSI.filter((d) => terapan.dims.includes(d.id));
  const ukTampil = UKURAN.filter((u) => terapan.ukuran.includes(u.id) || u.id === terapan.urut);
  const metrikUrut = UKURAN.find((u) => u.id === terapan.urut);
  const nilaiDim = (r, d) => r[d.kolom] ?? (d.id === "kategori" ? "Tanpa kategori" : "-");
  const label = (r) => dimTampil.map((d) => nilaiDim(r, d)).join(" · ");
  const adaStok = hasil.data.some((r) => Number(r.total_stok) > 0);
  const tampilStok = ukTampil.some((u) => u.id === "stok");

  return (
    <div>
      <div className="ct-form">
        <fieldset className="ct-grup">
          <legend>Table Value</legend>
          {DIMENSI.map((d) => (
            <Pilihan
              key={d.id}
              tipe="checkbox"
              nama="dims"
              nilai={d.id}
              label={d.label}
              cek={form.dims.includes(d.id)}
              onChange={() => toggle("dims", d.id)}
            />
          ))}
          {UKURAN.filter((u) => u.id !== "demand").map((u) => (
            <Pilihan
              key={u.id}
              tipe="checkbox"
              nama="ukuran"
              nilai={u.id}
              label={u.label}
              cek={form.ukuran.includes(u.id)}
              onChange={() => toggle("ukuran", u.id)}
            />
          ))}
        </fieldset>

        <fieldset className="ct-grup">
          <legend>Compare by</legend>
          {UKURAN.map((u) => (
            <Pilihan
              key={u.id}
              tipe="radio"
              nama="urut"
              nilai={u.id}
              label={u.label}
              cek={form.urut === u.id}
              onChange={() => ubah("urut", u.id)}
            />
          ))}
        </fieldset>

        <fieldset className="ct-grup">
          <legend>Data Visualization</legend>
          <Pilihan tipe="radio" nama="tampil" nilai="tabel" label="Table"
            cek={form.tampil === "tabel"} onChange={() => ubah("tampil", "tabel")} />
          <Pilihan tipe="radio" nama="tampil" nilai="grafik" label="Graph"
            cek={form.tampil === "grafik"} onChange={() => ubah("tampil", "grafik")} />
          <legend className="ct-sub">Date Range</legend>
          <label className="ct-isian">
            Start Date
            <input type="date" value={form.mulai} onChange={(e) => ubah("mulai", e.target.value)} />
          </label>
          <label className="ct-isian">
            End Date
            <input type="date" value={form.akhir} onChange={(e) => ubah("akhir", e.target.value)} />
          </label>
        </fieldset>

        <fieldset className="ct-grup">
          <legend>Filter</legend>
          <label className="ct-isian">
            Specify Category
            <input type="text" value={form.kategori} placeholder="mis. sabun"
              onChange={(e) => ubah("kategori", e.target.value)} />
          </label>
          <label className="ct-isian">
            Specify Item
            <input type="text" value={form.item} placeholder="mis. lavender"
              onChange={(e) => ubah("item", e.target.value)} />
          </label>
        </fieldset>

        <fieldset className="ct-grup">
          <legend>Sort by</legend>
          {[
            ["semua", "All Item"],
            ["20", "Top 20"],
            ["10", "Top 10"],
          ].map(([v, l]) => (
            <Pilihan key={v} tipe="radio" nama="batas" nilai={v} label={l}
              cek={form.batas === v} onChange={() => ubah("batas", v)} />
          ))}
        </fieldset>
      </div>

      <div className="ct-aksi">
        <button className="tombol tombol-isi" onClick={terapkan}>Terapkan</button>
        <button className="tombol" onClick={reset}>Reset</button>
        {pesan && <span className="galat">{pesan}</span>}
      </div>

      {hasil.loading && <p className="info">Memuat data…</p>}
      {hasil.error && <p className="galat">Gagal memuat: {hasil.error}</p>}
      {!hasil.loading && !hasil.error && hasil.data.length === 0 && (
        <p className="info">Tidak ada data yang cocok dengan pilihan ini.</p>
      )}

      {!hasil.loading && !hasil.error && hasil.data.length > 0 && terapan.tampil === "tabel" && (
        <div className="gulir ct-tabel">
          <table>
            <thead>
              <tr>
                <th>#</th>
                {dimTampil.map((d) => (
                  <th key={d.id}>{d.label}</th>
                ))}
                {ukTampil.map((u) => (
                  <th key={u.id} className={"kanan" + (u.id === terapan.urut ? " sorot" : "")}>
                    {u.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hasil.data.slice(0, MAKS_BARIS).map((r, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  {dimTampil.map((d) => (
                    <td key={d.id}>{nilaiDim(r, d)}</td>
                  ))}
                  {ukTampil.map((u) => (
                    <td key={u.id} className={"kanan" + (u.id === terapan.urut ? " sorot" : "")}>
                      {u.format(r[u.kolom] ?? 0)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!hasil.loading && !hasil.error && hasil.data.length > 0 && terapan.tampil === "grafik" && (
        <ResponsiveContainer width="100%" height={Math.max(260, Math.min(hasil.data.length, 20) * 36)}>
          <BarChart
            data={hasil.data.slice(0, 20).map((r) => ({
              nama: label(r),
              nilai: Number(r[metrikUrut.kolom] ?? 0),
            }))}
            layout="vertical"
            margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
          >
            <CartesianGrid horizontal={false} stroke="#e4ddd0" />
            <XAxis type="number" tickFormatter={metrikUrut.id === "revenue" ? jt : angka} />
            <YAxis type="category" dataKey="nama" width={220} interval={0} />
            <Tooltip formatter={(v) => metrikUrut.format(v)} />
            <Bar dataKey="nilai" name={metrikUrut.label} fill="#2f5d50" radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}

      {!hasil.loading && hasil.data.length > MAKS_BARIS && terapan.tampil === "tabel" && (
        <p className="info">Menampilkan {MAKS_BARIS} baris pertama dari {hasil.data.length}.</p>
      )}
      {terapan.tampil === "grafik" && hasil.data.length > 20 && (
        <p className="info">Grafik menampilkan 20 teratas. Pakai Table untuk melihat semuanya.</p>
      )}
      {!hasil.loading && !hasil.error && tampilStok && !adaStok && (
        <p className="info">Data stok belum ada di database, jadi Item Stock bernilai 0.</p>
      )}
      <p className="catatan">
        Demand = rata-rata Item Sold per bulan (dibagi lama periode laporan). Date Range pada
        penjualan memakai periode laporan yang beririsan; pada stok memakai opname terbaru di
        rentang itu.
      </p>
    </div>
  );
}

export default function App() {
  const [terbuka, setTerbuka] = useState(null);
  const tipe = useView("v_penjualan_per_tipe", (q) => q.order("bulan"));
  const bulanan = useView("v_penjualan_bulanan", (q) => q.order("bulan"));
  const pelanggan = useView("v_top_pelanggan", (q) =>
    q.order("total", { ascending: false }).limit(10)
  );
  const produk = useView("v_produk_terlaris", (q) =>
    q.order("total_qty", { ascending: false }).limit(10)
  );

  const totalSemua = bulanan.data.reduce((a, r) => a + r.total, 0);

  return (
    <>
      <style>{css}</style>
      <main className="halaman">
        <header>
          <h1>Penjualan Nicole's Natural</h1>
          {bulanan.data.length > 0 && (
            <p className="total">
              Total {namaBulan(bulanan.data[0].bulan)} sampai{" "}
              {namaBulan(bulanan.data[bulanan.data.length - 1].bulan)}:{" "}
              <strong>{rupiah(totalSemua)}</strong>
            </p>
          )}
        </header>

        <Bagian judul="Penjualan per bulan" state={bulanan} kosong="Belum ada data faktur.">
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={bulanan.data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#e4ddd0" />
              <XAxis dataKey="bulan" tickFormatter={namaBulan} />
              <YAxis tickFormatter={jt} width={70} />
              <Tooltip formatter={(v) => rupiah(v)} labelFormatter={namaBulan} />
              <Bar dataKey="total" name="Penjualan" fill="#2f5d50" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Bagian>

        <Bagian judul="Jenis transaksi" state={tipe} kosong="Belum ada data transaksi.">
          <TipeTransaksi data={tipe.data} />
        </Bagian>

        <Bagian judul="10 pelanggan teratas" state={pelanggan} kosong="Belum ada data pelanggan.">
          <div className="gulir">
            <table>
              <thead>
                <tr>
                  <th>Pelanggan</th>
                  <th className="kanan">Jumlah faktur</th>
                  <th className="kanan">Total penjualan</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pelanggan.data.map((r) => {
                  const buka = terbuka === r.pelanggan;
                  return (
                    <Fragment key={r.pelanggan}>
                      <tr className={buka ? "terpilih" : ""}>
                        <td>{r.pelanggan}</td>
                        <td className="kanan">{r.jumlah_faktur}</td>
                        <td className="kanan">{rupiah(r.total)}</td>
                        <td className="kanan">
                          <button
                            className="tombol"
                            aria-expanded={buka}
                            onClick={() => setTerbuka(buka ? null : r.pelanggan)}
                          >
                            {buka ? "Tutup" : "Detail"}
                          </button>
                        </td>
                      </tr>
                      {buka && (
                        <tr className="baris-detail">
                          <td colSpan={4}>
                            <DetailPelanggan
                              pelanggan={r.pelanggan}
                              bulan={bulanan.data.map((b) => b.bulan)}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Bagian>

        <Bagian
          judul="10 produk terlaris"
          state={produk}
          kosong="Belum ada data produk. Impor laporan Penjualan per Barang lewat python -m nicoles --file ..."
        >
          <ResponsiveContainer width="100%" height={Math.max(260, produk.data.length * 40)}>
            <BarChart
              data={produk.data}
              layout="vertical"
              margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
            >
              <CartesianGrid horizontal={false} stroke="#e4ddd0" />
              <XAxis type="number" tickFormatter={angka} />
              <YAxis type="category" dataKey="produk" width={200} interval={0} />
              <Tooltip
                formatter={(v, nama) => (nama === "Nilai" ? rupiah(v) : angka(v) + " unit")}
              />
              <Bar dataKey="total_qty" name="Jumlah terjual" fill="#b5651d" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Bagian>

        <section className="bagian">
          <h2>Custom Table</h2>
          <CustomTable />
        </section>
      </main>
    </>
  );
}

const css = `
  :root { color-scheme: light; }
  body { display: block; margin: 0; background: #f6f2ea; color: #1f2a26;
         font-family: "Segoe UI", system-ui, -apple-system, sans-serif; }
  #root { max-width: none; margin: 0; padding: 0; text-align: left; }
  .halaman { max-width: 960px; margin: 0 auto; padding: 32px 20px 64px; }
  h1 { font-size: 1.9rem; margin: 0 0 6px; }
  h2 { font-size: 1.2rem; margin: 0 0 16px; }
  .total { margin: 0; color: #4a5750; }
  .total strong { color: #1f2a26; }
  .bagian { background: #fffdf8; border: 1px solid #e4ddd0; border-radius: 8px;
            padding: 20px; margin-top: 24px; }
  .info { color: #6b766f; margin: 0; }
  .galat { color: #a33a2a; margin: 0; }
  .gulir { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 10px 8px; border-bottom: 1px solid #ece6da; text-align: left; }
  th { font-weight: 600; color: #4a5750; }
  .kanan { text-align: right; white-space: nowrap; }
  .tombol { font: inherit; font-size: 0.9rem; padding: 4px 12px; cursor: pointer;
            border: 1px solid #2f5d50; border-radius: 6px; background: transparent; color: #2f5d50; }
  .tombol:hover { background: #2f5d50; color: #fffdf8; }
  .tombol:focus-visible { outline: 2px solid #2f5d50; outline-offset: 2px; }
  tr.terpilih td { background: #f1ece0; }
  .baris-detail td { background: #f8f4ea; padding: 12px 16px; }
  .tab { display: flex; gap: 4px; margin-bottom: 10px; border-bottom: 1px solid #e4ddd0; }
  .tab button { font: inherit; padding: 6px 14px; cursor: pointer; background: transparent;
                border: none; border-bottom: 2px solid transparent; color: #6b766f; }
  .tab button.aktif { color: #1f2a26; font-weight: 600; border-bottom-color: #2f5d50; }
  .tab button:focus-visible { outline: 2px solid #2f5d50; outline-offset: -2px; }
  .ringkas { display: flex; flex-wrap: wrap; gap: 6px 24px; list-style: none;
             margin: 0 0 12px; padding: 0; color: #4a5750; font-size: 0.95rem; }
  .ringkas strong { color: #1f2a26; }
  .ringkas .naik { color: #2f6b3a; }
  .ringkas .turun { color: #a33a2a; }
  tfoot td { font-weight: 600; border-top: 2px solid #d8cfbd; border-bottom: none; }
  .turun-teks { color: #a33a2a; }
  .lebar-bar { width: 45%; }
  .bar-wadah { position: relative; display: flex; align-items: center; min-height: 22px; }
  .bar-isi { position: absolute; left: 0; top: 2px; bottom: 2px; background: #e3c9a8;
             border-radius: 3px; }
  .bar-wadah span { position: relative; padding-left: 6px; }
  table.detail th, table.detail td { padding: 7px 8px; }
  table.detail tr:last-child td { border-bottom: none; }
  .ct-form { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
             gap: 16px; margin-bottom: 16px; }
  .ct-grup { border: none; margin: 0; padding: 0; min-width: 0; }
  .ct-grup legend { font-size: 0.8rem; color: #6b766f; padding: 0; margin-bottom: 6px; }
  .ct-grup legend.ct-sub { margin-top: 14px; }
  .pilihan { display: flex; align-items: center; gap: 8px; padding: 3px 0; cursor: pointer; }
  .pilihan input { accent-color: #2f5d50; }
  .ct-isian { display: flex; flex-direction: column; gap: 4px; font-size: 0.9rem;
              margin-bottom: 8px; color: #4a5750; }
  .ct-isian input { font: inherit; padding: 6px 8px; border: 1px solid #d8cfbd;
                    border-radius: 6px; background: #fff; color: #1f2a26; }
  .ct-aksi { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
  .tombol-isi { background: #2f5d50; color: #fffdf8; }
  .tombol-isi:hover { background: #244a40; }
  .ct-tabel { max-height: 520px; overflow-y: auto; }
  .ct-tabel thead th { position: sticky; top: 0; background: #fffdf8; }
  th.sorot, td.sorot { background: #f1ece0; font-weight: 600; }
  .catatan { color: #6b766f; font-size: 0.85rem; margin: 12px 0 0; }
  @media (max-width: 600px) { h1 { font-size: 1.5rem; } .bagian { padding: 14px; } }
`;