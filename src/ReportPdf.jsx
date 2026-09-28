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

const C = { turquoise: '#0DBACC', pink: '#F18AB5', steel: '#7E7F90', ink: '#303150', line: '#E2E2EA', soft: '#F0F0F4' };

const s = StyleSheet.create({
  page: { fontFamily: 'Nunito', fontSize: 10, color: C.ink, paddingTop: 36, paddingBottom: 48, paddingHorizontal: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderBottomWidth: 1, borderBottomColor: C.line, paddingBottom: 10, marginBottom: 18 },
  title: { fontSize: 18, fontWeight: 700 },
  sub: { fontSize: 9, color: C.steel, marginTop: 3 },
  section: { marginBottom: 18 },
  sectionTitle: { fontSize: 9, fontWeight: 700, color: C.steel, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  groupTitle: { fontSize: 10, fontWeight: 700, marginTop: 6, marginBottom: 5 },
  cards: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  card: { flex: 1, borderWidth: 1, borderColor: C.line, borderRadius: 6, padding: 8 },
  cardLabel: { fontSize: 8, color: C.steel, marginBottom: 3 },
  cardValue: { fontSize: 12, fontWeight: 700 },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.soft, paddingVertical: 4 },
  totalRow: { flexDirection: 'row', paddingVertical: 5, backgroundColor: C.soft },
  thRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.line, paddingBottom: 4, marginBottom: 2 },
  th: { fontSize: 8, color: C.steel, fontWeight: 700 },
  td: { fontSize: 9 },
  right: { textAlign: 'right' },
  bold: { fontWeight: 700 },
  muted: { color: C.steel },
  empty: { fontSize: 9, color: C.steel },
  note: { fontSize: 8, color: C.steel, marginTop: 5 },
  footer: { position: 'absolute', bottom: 22, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', fontSize: 8, color: C.steel },
});

// Emoji không hiển thị được nếu chưa đăng ký nguồn emoji → bỏ khỏi PDF, chỉ giữ tên.
const clean = (t) => String(t ?? '').replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '').replace(/\s+/g, ' ').trim();

const toneColor = (tone) => (tone === 'in' ? C.turquoise : tone === 'out' ? C.pink : C.ink);

/* Bảng dùng chung.
   cols: [{ key, label, flex, align?: 'right', tone?: true, muted?: true }]
   rows: [{ ...giá trị theo key, tone?: 'in' | 'out' }]   total: dòng tổng (tuỳ chọn) */
function Table({ cols, rows, total }) {
  const cell = (c) => ({ flex: c.flex || 1, paddingRight: 4, textAlign: c.align === 'right' ? 'right' : 'left' });
  const head = (
    <View style={s.thRow}>
      {cols.map((c) => <Text key={c.key} style={[s.th, cell(c)]}>{c.label}</Text>)}
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
        <View style={s.totalRow} wrap={false}>
          {cols.map((c) => <Text key={c.key} style={[s.td, s.bold, cell(c)]}>{clean(total[c.key])}</Text>)}
        </View>
      )}
    </View>
  );
}

function Section({ title, children }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle} minPresenceAhead={70}>{title}</Text>
      {children}
    </View>
  );
}

function Card({ label, value, color }) {
  return (
    <View style={s.card} wrap={false}>
      <Text style={s.cardLabel}>{label}</Text>
      <Text style={[s.cardValue, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

/* ---------- Các mục ---------- */
function OverviewSection({ o }) {
  return (
    <Section title="Tổng quan">
      <View style={s.cards}>
        <Card label="Tổng tài sản đầu kỳ" value={o.assetsStart} />
        <Card label="Tổng tài sản cuối kỳ" value={o.assetsEnd} />
        <Card label={o.assetsChangePct ? `Chênh lệch tài sản (${o.assetsChangePct})` : 'Chênh lệch tài sản'} value={o.assetsChange} color={o.assetsPositive ? C.turquoise : C.pink} />
      </View>
      <View style={s.cards}>
        <Card label="Tổng thu nhập trong kỳ" value={o.income} color={C.turquoise} />
        <Card label="Tổng chi tiêu trong kỳ" value={o.expense} color={C.pink} />
        <Card label="Thu nhập - Chi tiêu" value={o.net} color={o.netPositive ? C.turquoise : C.pink} />
      </View>

      <Text style={s.groupTitle}>Cơ cấu tài sản</Text>
      <Table
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
    </Section>
  );
}

function CategorySection({ title, rows, total, empty }) {
  return (
    <Section title={title}>
      {rows.length === 0 ? <Text style={s.empty}>{empty}</Text> : (
        <Table
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
  return (
    <Section title="Quỹ — số dư cuối kỳ">
      {funds.rows.length === 0 ? <Text style={s.empty}>Chưa có quỹ nào.</Text> : (
        <Table
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
  return (
    <Section title="Ví — tổng quan">
      {groups.length === 0 ? <Text style={s.empty}>Chưa có ví nào.</Text> : groups.map((g, i) => (
        <View key={i} style={{ marginBottom: 8 }}>
          <Text style={s.groupTitle} minPresenceAhead={50}>{g.title}</Text>
          <Table
            cols={[
              { key: 'name', label: 'Ví', flex: 2.2 },
              { key: 'typeLabel', label: 'Loại', flex: 1.5, muted: true },
              { key: 'start', label: 'Đầu kỳ', flex: 2, align: 'right' },
              { key: 'inflow', label: 'Thu vào', flex: 1.9, align: 'right' },
              { key: 'outflow', label: 'Chi ra', flex: 1.9, align: 'right' },
              { key: 'toFund', label: 'Nạp quỹ', flex: 1.7, align: 'right' },
              { key: 'adjust', label: 'Điều chỉnh', flex: 1.7, align: 'right' },
              { key: 'end', label: 'Cuối kỳ', flex: 2, align: 'right' },
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
  return (
    <Section title="Lịch sử quỹ trong kỳ">
      {history.length === 0 ? <Text style={s.empty}>Chưa có quỹ nào.</Text> : history.map((f, i) => (
        <View key={i} style={{ marginBottom: 8 }}>
          <Text style={s.groupTitle} minPresenceAhead={50}>{clean(f.name)}</Text>
          {f.rows.length === 0 ? <Text style={s.empty}>Không có nạp/rút trong kỳ.</Text> : (
            <Table
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
  return (
    <Section title={`Tất cả giao dịch trong kỳ (${count})`}>
      {txs.length === 0 ? <Text style={s.empty}>Không có giao dịch trong khoảng này.</Text> : (
        <Table
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
        {sec.income_by_cat && <CategorySection title="Thu nhập trong kỳ — theo nguồn" rows={data.incomeByCat} total={data.incomeTotal} empty="Không có khoản thu nhập nào trong kỳ." />}
        {sec.expense_by_cat && <CategorySection title="Chi tiêu trong kỳ — theo nguồn" rows={data.expenseByCat} total={data.expenseTotal} empty="Không có khoản chi tiêu nào trong kỳ." />}
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
