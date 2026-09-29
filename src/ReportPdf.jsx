// Tài liệu PDF báo cáo — dùng @react-pdf/renderer. File này được App.jsx import ĐỘNG
// (await import('./ReportPdf')) nên thư viện chỉ tải khi người dùng bấm xem trước/xuất.
// Dữ liệu (đã định dạng sẵn thành chuỗi) do buildReportData() trong App.jsx cung cấp.
import { Document, Page, View, Text, Font, StyleSheet, pdf } from '@react-pdf/renderer';

const BASE = import.meta.env.BASE_URL || '/';
// Font phải hỗ trợ tiếng Việt (Helvetica mặc định không có dấu). File nằm ở public/fonts/.
Font.register({
  family: 'Nunito',
  fonts: [
    { src: `${BASE}fonts/Nunito-Regular.ttf`, fontWeight: 400 },
    { src: `${BASE}fonts/Nunito-Bold.ttf`, fontWeight: 700 },
  ],
});
// Không tự ngắt từ bằng dấu gạch nối (tiếng Việt bị cắt sai).
Font.registerHyphenationCallback((word) => [word]);

const C = { turquoise: '#0DBACC', pink: '#E0568F', steel: '#7E7F90', ink: '#303150', line: '#E2E2EA', soft: '#F0F0F4' };
// Màu riêng cho từng mục báo cáo — mỗi mục có 1 dải màu bên trái + tiêu đề cùng tông,
// giúp lướt mắt phân biệt nhanh giữa các phần khi in ra hoặc xem trên máy.
const ACCENT = {
  overview: C.turquoise,
  income_by_cat: '#12B76A',
  expense_by_cat: C.pink,
  funds: '#8E6CF1',
  wallets: '#3E9BE0',
  fund_history: '#F0A93E',
  transactions: C.steel,
};
// Bảng màu xoay vòng cho các thanh % góp quỹ theo từng quỹ (để phân biệt quỹ này với quỹ khác).
const FUND_COLORS = ['#0DBACC', '#8E6CF1', '#F0A93E', '#3E9BE0', '#12B76A', '#E0568F'];

// Trộn 1 màu hex với độ trong suốt để làm nền nhạt (react-pdf hiểu rgba trực tiếp).
function tint(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16), g = parseInt(h.substring(2, 4), 16), b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const s = StyleSheet.create({
  page: { fontFamily: 'Nunito', fontSize: 10, color: C.ink, paddingTop: 36, paddingBottom: 48, paddingHorizontal: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderBottomWidth: 2, borderBottomColor: C.turquoise, paddingBottom: 10, marginBottom: 18 },
  title: { fontSize: 18, fontWeight: 700 },
  sub: { fontSize: 9, color: C.steel, marginTop: 3 },
  section: { marginBottom: 18, borderLeftWidth: 3, paddingLeft: 11 },
  sectionTitle: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 9 },
  groupTitle: { fontSize: 10, fontWeight: 700, marginTop: 6, marginBottom: 5, color: C.ink },
  cards: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  card: { flex: 1, borderWidth: 1, borderLeftWidth: 3, borderColor: C.line, borderRadius: 6, padding: 8 },
  cardLabel: { fontSize: 8, color: C.steel, marginBottom: 3 },
  cardValue: { fontSize: 12, fontWeight: 700 },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.soft, paddingVertical: 4 },
  totalRow: { flexDirection: 'row', paddingVertical: 5, borderRadius: 4 },
  thRow: { flexDirection: 'row', paddingVertical: 4, marginBottom: 2, borderRadius: 4 },
  th: { fontSize: 8, color: C.steel, fontWeight: 700 },
  td: { fontSize: 9 },
  right: { textAlign: 'right' },
  bold: { fontWeight: 700 },
  muted: { color: C.steel },
  empty: { fontSize: 9, color: C.steel },
  note: { fontSize: 8, color: C.steel, marginTop: 5 },
  fundRow: { marginBottom: 9 },
  fundRowHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: C.soft, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  footer: { position: 'absolute', bottom: 22, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', fontSize: 8, color: C.steel },
});

// Emoji không hiển thị được nếu chưa đăng ký nguồn emoji → bỏ khỏi PDF, chỉ giữ tên.
const clean = (t) => String(t ?? '').replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '').replace(/\s+/g, ' ').trim();

const toneColor = (tone) => (tone === 'in' ? C.turquoise : tone === 'out' ? C.pink : C.ink);

/* Bảng dùng chung.
   cols: [{ key, label, flex, align?: 'right', tone?: true, muted?: true }]
   rows: [{ ...giá trị theo key, tone?: 'in' | 'out' }]   total: dòng tổng (tuỳ chọn)
   accent: màu của mục hiện tại — tô nhạt cho hàng tiêu đề và dòng tổng. */
function Table({ cols, rows, total, accent = C.steel }) {
  const cell = (c) => ({ flex: c.flex || 1, paddingRight: 4, textAlign: c.align === 'right' ? 'right' : 'left' });
  const head = (
    <View style={[s.thRow, { backgroundColor: tint(accent, 0.1) }]}>
      {cols.map((c) => <Text key={c.key} style={[s.th, cell(c), { color: accent }]}>{c.label}</Text>)}
    </View>
  );
  const renderRow = (r, i) => (
    <View key={i} style={s.row} wrap={false}>
      {cols.map((c) => (
        <Text key={c.key} style={[s.td, cell(c), c.muted ? s.muted : null, c.tone ? { color: toneColor(r.tone), fontWeight: 700 } : null]}>
          {clean(r[c.key]) || (c.muted ? '—' : '')}
        </Text>
      ))}
    </View>
  );
  return (
    <View>
      {/* Tiêu đề cột luôn đi cùng dòng đầu tiên, tránh bị kẹt một mình ở cuối trang. */}
      <View wrap={false}>
        {head}
        {rows[0] && renderRow(rows[0], 0)}
      </View>
      {rows.slice(1).map((r, i) => renderRow(r, i + 1))}
      {total && (
        <View style={[s.totalRow, { backgroundColor: tint(accent, 0.14) }]} wrap={false}>
          {cols.map((c) => <Text key={c.key} style={[s.td, s.bold, cell(c)]}>{clean(total[c.key])}</Text>)}
        </View>
      )}
    </View>
  );
}

function Section({ title, accent = C.steel, children }) {
  return (
    <View style={[s.section, { borderLeftColor: accent }]}>
      <Text style={[s.sectionTitle, { color: accent }]} minPresenceAhead={70}>{title}</Text>
      {children}
    </View>
  );
}

function Card({ label, value, color }) {
  return (
    <View style={[s.card, color ? { borderLeftColor: color, backgroundColor: tint(color, 0.05) } : null]} wrap={false}>
      <Text style={s.cardLabel}>{label}</Text>
      <Text style={[s.cardValue, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

// Thanh % góp quỹ — mỗi quỹ 1 dòng: tên + %, thanh ngang tô màu theo tỷ lệ, số tiền bên dưới.
function PoolAllocationBlock({ p }) {
  if (!p || !p.hasPool) return null;
  return (
    <>
      <Text style={s.groupTitle}>Thu nhập được chi — góp quỹ theo mục</Text>
      <View style={s.cards}>
        <Card label="Thu nhập được chi" value={p.pool} color={C.turquoise} />
        <Card label={`Đã góp quỹ (${p.totalPct})`} value={p.total} color="#8E6CF1" />
        <Card label="Còn lại (không phải quỹ)" value={p.remaining} color={p.remainingPositive ? C.turquoise : C.pink} />
      </View>
      {p.rows.length > 0 && (
        <View style={{ marginTop: 4, marginBottom: 4 }}>
          {p.rows.map((r, i) => {
            const color = FUND_COLORS[i % FUND_COLORS.length];
            return (
              <View key={i} style={s.fundRow} wrap={false}>
                <View style={s.fundRowHead}>
                  <Text style={[s.td, s.bold]}>{clean(r.name)}</Text>
                  <Text style={[s.td, s.bold, { color }]}>{r.pct}  ·  {r.amount}</Text>
                </View>
                <View style={s.barTrack}>
                  <View style={[s.barFill, { width: `${Math.min(100, r.pctNum)}%`, backgroundColor: color }]} />
                </View>
              </View>
            );
          })}
        </View>
      )}
      {p.nonFundExpense && (
        <Text style={s.note}>Đã chi tiêu (ngoài quỹ) từ Thu nhập được chi: {p.nonFundExpense}.</Text>
      )}
    </>
  );
}

/* ---------- Các mục ---------- */
function OverviewSection({ o }) {
  const accent = ACCENT.overview;
  return (
    <Section title="Tổng quan" accent={accent}>
      <View style={s.cards}>
        <Card label="Tổng tài sản đầu kỳ" value={o.assetsStart} color={C.ink} />
        <Card label="Tổng tài sản cuối kỳ" value={o.assetsEnd} color={C.ink} />
        <Card label={o.assetsChangePct ? `Chênh lệch tài sản (${o.assetsChangePct})` : 'Chênh lệch tài sản'} value={o.assetsChange} color={o.assetsPositive ? C.turquoise : C.pink} />
      </View>
      <View style={s.cards}>
        <Card label="Tổng thu nhập trong kỳ" value={o.income} color={C.turquoise} />
        <Card label="Tổng chi tiêu trong kỳ" value={o.expense} color={C.pink} />
        <Card label="Thu nhập - Chi tiêu" value={o.net} color={o.netPositive ? C.turquoise : C.pink} />
      </View>

      <Text style={s.groupTitle}>Cơ cấu tài sản</Text>
      <Table
        accent={accent}
        cols={[
          { key: 'label', label: 'Nhóm', flex: 2 },
          { key: 'start', label: 'Đầu kỳ', flex: 2, align: 'right' },
          { key: 'end', label: 'Cuối kỳ', flex: 2, align: 'right' },
          { key: 'diff', label: 'Chênh lệch', flex: 2, align: 'right' },
        ]}
        rows={o.composition}
        total={o.compositionTotal}
      />

      {o.expenseBySource.length > 0 && (
        <>
          <Text style={s.groupTitle}>Chi tiêu theo nguồn tiền</Text>
          <Table
            accent={accent}
            cols={[
              { key: 'label', label: 'Nguồn tiền', flex: 3 },
              { key: 'amount', label: 'Số tiền', flex: 2, align: 'right' },
              { key: 'pct', label: 'Tỷ trọng', flex: 1, align: 'right' },
            ]}
            rows={o.expenseBySource}
          />
        </>
      )}
      {o.allocation && (
        <Text style={s.note}>Góp vào quỹ trong kỳ: {o.allocation} (chuyển tiền sang quỹ, {o.allocationCountedAsExpense ? 'ĐÃ' : 'không'} tính vào chi tiêu).</Text>
      )}

      <PoolAllocationBlock p={o.poolAllocation} />
    </Section>
  );
}

function CategorySection({ title, accent, rows, total, empty }) {
  return (
    <Section title={title} accent={accent}>
      {rows.length === 0 ? <Text style={s.empty}>{empty}</Text> : (
        <Table
          accent={accent}
          cols={[
            { key: 'name', label: 'Nguồn / Danh mục', flex: 4 },
            { key: 'count', label: 'Số GD', flex: 1, align: 'right' },
            { key: 'amount', label: 'Số tiền', flex: 2, align: 'right' },
            { key: 'pct', label: 'Tỷ trọng', flex: 1, align: 'right' },
          ]}
          rows={rows}
          total={{ name: 'Tổng', count: total.count, amount: total.amount, pct: '100%' }}
        />
      )}
    </Section>
  );
}

function FundsSection({ funds }) {
  const accent = ACCENT.funds;
  return (
    <Section title="Quỹ — số dư cuối kỳ" accent={accent}>
      {funds.rows.length === 0 ? <Text style={s.empty}>Chưa có quỹ nào.</Text> : (
        <Table
          accent={accent}
          cols={[
            { key: 'name', label: 'Quỹ', flex: 2.4 },
            { key: 'start', label: 'Đầu kỳ', flex: 2, align: 'right' },
            { key: 'deposit', label: 'Nạp', flex: 2, align: 'right' },
            { key: 'withdraw', label: 'Rút', flex: 2, align: 'right' },
            { key: 'profit', label: 'Lãi', flex: 1.6, align: 'right' },
            { key: 'end', label: 'Cuối kỳ', flex: 2, align: 'right' },
          ]}
          rows={funds.rows}
          total={funds.total}
        />
      )}
      <Text style={s.note}>Lãi = số dư cuối kỳ - số dư đầu kỳ - nạp + rút (lợi nhuận tự sinh của quỹ trong kỳ).</Text>
    </Section>
  );
}

function WalletsSection({ groups }) {
  const accent = ACCENT.wallets;
  return (
    <Section title="Ví — tổng quan" accent={accent}>
      {groups.length === 0 ? <Text style={s.empty}>Chưa có ví nào.</Text> : groups.map((g, i) => (
        <View key={i} style={{ marginBottom: 8 }}>
          <Text style={s.groupTitle} minPresenceAhead={50}>{g.title}</Text>
          <Table
            accent={accent}
            cols={[
              { key: 'name', label: 'Ví', flex: 1.9 },
              { key: 'typeLabel', label: 'Loại', flex: 1.2, muted: true },
              { key: 'start', label: 'Đầu kỳ', flex: 2.2, align: 'right' },
              { key: 'inflow', label: 'Thu vào', flex: 2.2, align: 'right' },
              { key: 'outflow', label: 'Chi ra', flex: 2, align: 'right' },
              { key: 'toFund', label: 'Nạp quỹ', flex: 2, align: 'right' },
              { key: 'adjust', label: 'Điều chỉnh', flex: 2, align: 'right' },
              { key: 'end', label: 'Cuối kỳ', flex: 2.3, align: 'right' },
            ]}
            rows={g.rows}
            total={g.total}
          />
        </View>
      ))}
    </Section>
  );
}

function FundHistorySection({ history }) {
  const accent = ACCENT.fund_history;
  return (
    <Section title="Lịch sử quỹ trong kỳ" accent={accent}>
      {history.length === 0 ? <Text style={s.empty}>Chưa có quỹ nào.</Text> : history.map((f, i) => (
        <View key={i} style={{ marginBottom: 8 }}>
          <Text style={s.groupTitle} minPresenceAhead={50}>{clean(f.name)}</Text>
          {f.rows.length === 0 ? <Text style={s.empty}>Không có nạp/rút trong kỳ.</Text> : (
            <Table
              accent={accent}
              cols={[
                { key: 'date', label: 'Ngày', flex: 1.3 },
                { key: 'kind', label: 'Loại', flex: 1.2 },
                { key: 'note', label: 'Ghi chú', flex: 3, muted: true },
                { key: 'amount', label: 'Số tiền', flex: 2, align: 'right', tone: true },
                { key: 'balance', label: 'Số dư sau GD', flex: 2, align: 'right' },
              ]}
              rows={f.rows}
            />
          )}
        </View>
      ))}
    </Section>
  );
}

function TransactionsSection({ txs, count }) {
  const accent = ACCENT.transactions;
  return (
    <Section title={`Tất cả giao dịch trong kỳ (${count})`} accent={accent}>
      {txs.length === 0 ? <Text style={s.empty}>Không có giao dịch trong khoảng này.</Text> : (
        <Table
          accent={accent}
          cols={[
            { key: 'date', label: 'Ngày', flex: 1.3 },
            { key: 'kind', label: 'Loại', flex: 1.4 },
            { key: 'cat', label: 'Danh mục', flex: 2 },
            { key: 'source', label: 'Ví / Nguồn', flex: 2 },
            { key: 'note', label: 'Ghi chú', flex: 2.6, muted: true },
            { key: 'amount', label: 'Số tiền', flex: 1.9, align: 'right', tone: true },
          ]}
          rows={txs}
        />
      )}
    </Section>
  );
}

function ReportDocument({ data }) {
  const sec = data.sections;
  return (
    <Document title="Báo cáo tài chính PandaFi" author="PandaFi">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.title}>PandaFi — Báo cáo tài chính</Text>
            <Text style={s.sub}>Từ {data.startDate} đến {data.endDate}</Text>
          </View>
          <Text style={s.sub}>Xuất lúc {data.generatedAt}</Text>
        </View>

        {sec.overview && <OverviewSection o={data.overview} />}
        {sec.income_by_cat && <CategorySection title="Thu nhập trong kỳ — theo nguồn" accent={ACCENT.income_by_cat} rows={data.incomeByCat} total={data.incomeTotal} empty="Không có khoản thu nhập nào trong kỳ." />}
        {sec.expense_by_cat && <CategorySection title="Chi tiêu trong kỳ — theo nguồn" accent={ACCENT.expense_by_cat} rows={data.expenseByCat} total={data.expenseTotal} empty="Không có khoản chi tiêu nào trong kỳ." />}
        {sec.funds && <FundsSection funds={data.funds} />}
        {sec.wallets && <WalletsSection groups={data.walletGroups} />}
        {sec.fund_history && <FundHistorySection history={data.fundHistory} />}
        {sec.transactions && <TransactionsSection txs={data.txs} count={data.txCount} />}

        <View style={s.footer} fixed>
          <Text>PandaFi</Text>
          <Text render={({ pageNumber, totalPages }) => `Trang ${pageNumber}/${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function renderReportPdfBlob(data) {
  return pdf(<ReportDocument data={data} />).toBlob();
}
