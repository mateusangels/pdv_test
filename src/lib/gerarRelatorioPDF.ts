import { formatBRL, formatDate } from './format';

// ── Styles ─────────────────────────────────────────────────────────────────────
const CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1a1a2e; background: #fff; padding: 32px; font-size: 13px; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #1a237e; padding-bottom: 16px; margin-bottom: 24px; }
  .header h1 { font-size: 22px; color: #1a237e; }
  .header .meta { text-align: right; font-size: 11px; color: #666; }
  .section { margin-bottom: 20px; }
  .section-title { font-size: 14px; font-weight: 700; color: #1a237e; border-bottom: 1px solid #e0e0e0; padding-bottom: 4px; margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  th { background: #f5f5f5; text-align: left; padding: 6px 8px; font-size: 10px; text-transform: uppercase; color: #555; border-bottom: 2px solid #ddd; }
  td { padding: 6px 8px; border-bottom: 1px solid #eee; font-size: 12px; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; }
  .badge-pendente { background: #fff3cd; color: #856404; }
  .badge-parcial { background: #cce5ff; color: #004085; }
  .badge-pago { background: #d4edda; color: #155724; }
  .badge-vencido { background: #f8d7da; color: #721c24; }
  .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 20px; }
  .summary-card { border: 1px solid #e0e0e0; border-radius: 8px; padding: 12px; text-align: center; }
  .summary-card .label { font-size: 10px; text-transform: uppercase; color: #666; margin-bottom: 4px; }
  .summary-card .value { font-size: 18px; font-weight: 700; color: #1a237e; }
  .summary-card .value.danger { color: #c62828; }
  .summary-card .value.success { color: #2e7d32; }
  .footer { margin-top: 32px; border-top: 1px solid #e0e0e0; padding-top: 12px; font-size: 10px; color: #999; text-align: center; }
  @media print { body { padding: 16px; } }
`;

function openPrintWindow(title: string, bodyHTML: string) {
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>${CSS}</style></head><body>${bodyHTML}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
}

function statusBadge(status: string, vencido?: boolean) {
    if (vencido) return `<span class="badge badge-vencido">VENCIDO</span>`;
    const cls = status === 'pago' ? 'badge-pago' : status === 'parcial' ? 'badge-parcial' : 'badge-pendente';
    return `<span class="badge ${cls}">${status.toUpperCase()}</span>`;
}

function headerHTML(titulo: string, subtitulo?: string) {
    return `
    <div class="header">
      <div style="display:flex;align-items:center;gap:12px">
        <img src="/logo_preta.png" alt="NEXOR" style="width:80px;height:auto" />
        <div>
          <h1>NEXOR</h1>
          <p style="font-size:12px;color:#666;margin-top:2px">${titulo}</p>
          ${subtitulo ? `<p style="font-size:11px;color:#888">${subtitulo}</p>` : ''}
        </div>
      </div>
      <div class="meta">
        <p>Data de emissão</p>
        <p style="font-weight:600;font-size:13px">${new Date().toLocaleDateString('pt-BR')}</p>
      </div>
    </div>`;
}

// ── Relatório de um Fiado ──────────────────────────────────────────────────────
export function gerarRelatorioFiadoPDF(
    fiado: any,
    itens: any[],
    pagamentos: any[],
    cliente: any
) {
    const saldo = Number(fiado.valor_total) - Number(fiado.valor_pago);
    const hoje = new Date().toISOString().slice(0, 10);
    const vencido = fiado.data_vencimento && fiado.data_vencimento < hoje && fiado.status !== 'pago';

    let html = headerHTML(
        `Relatório de Fiado #${fiado.id.slice(0, 8)}`,
        `Cliente: ${cliente?.nome || '—'}`
    );

    // Resumo
    html += `
    <div class="summary-grid">
      <div class="summary-card"><div class="label">Valor Total</div><div class="value">${formatBRL(Number(fiado.valor_total))}</div></div>
      <div class="summary-card"><div class="label">Valor Pago</div><div class="value success">${formatBRL(Number(fiado.valor_pago))}</div></div>
      <div class="summary-card"><div class="label">Saldo Pendente</div><div class="value danger">${formatBRL(saldo)}</div></div>
      <div class="summary-card"><div class="label">Status</div><div class="value">${statusBadge(fiado.status, vencido)}</div></div>
    </div>`;

    // Datas
    html += `
    <div class="section">
      <div class="section-title">Informações</div>
      <table>
        <tr><td style="width:160px;font-weight:600">Descrição</td><td>${fiado.descricao || '—'}</td></tr>
        <tr><td style="font-weight:600">Data da Compra</td><td>${fiado.data_compra ? formatDate(fiado.data_compra) : formatDate(fiado.created_at)}</td></tr>
        <tr><td style="font-weight:600">Data de Vencimento</td><td>${fiado.data_vencimento ? formatDate(fiado.data_vencimento) : 'Não definida'}</td></tr>
        <tr><td style="font-weight:600">Cliente</td><td>${cliente?.nome || '—'} ${cliente?.cpf ? `(CPF: ${cliente.cpf})` : ''}</td></tr>
        <tr><td style="font-weight:600">Telefone</td><td>${cliente?.telefone || '—'}</td></tr>
      </table>
    </div>`;

    // Itens
    if (itens.length > 0) {
        html += `<div class="section"><div class="section-title">Produtos</div><table>
      <thead><tr><th>Produto</th><th class="text-center">Qtd</th><th class="text-right">Unit.</th><th class="text-right">Total</th></tr></thead><tbody>`;
        itens.forEach(i => {
            html += `<tr><td>${i.produto}</td><td class="text-center">${i.quantidade}</td><td class="text-right">${formatBRL(Number(i.valor_unitario))}</td><td class="text-right">${formatBRL(Number(i.valor_total))}</td></tr>`;
        });
        html += `</tbody></table></div>`;
    }

    // Pagamentos
    if (pagamentos.length > 0) {
        html += `<div class="section"><div class="section-title">Pagamentos</div><table>
      <thead><tr><th>Data</th><th>Método</th><th class="text-right">Valor</th><th class="text-center">Status</th></tr></thead><tbody>`;
        pagamentos.forEach(p => {
            html += `<tr class="${p.estornado ? 'style="opacity:0.4;text-decoration:line-through"' : ''}">
        <td>${formatDate(p.created_at)}</td><td style="text-transform:uppercase">${p.metodo}</td>
        <td class="text-right">${formatBRL(Number(p.valor))}</td>
        <td class="text-center">${p.estornado ? '<span class="badge badge-vencido">ESTORNADO</span>' : '<span class="badge badge-pago">OK</span>'}</td></tr>`;
        });
        html += `</tbody></table></div>`;
    }

    html += `<div class="footer">Relatório gerado automaticamente pelo sistema NEXOR</div>`;
    openPrintWindow(`Fiado #${fiado.id.slice(0, 8)} – ${cliente?.nome || ''}`, html);
}


// ── Relatório do Cliente ────────────────────────────────────────────────────────
export function gerarRelatorioClientePDF(
    cliente: any,
    fiados: any[],
    todosItens: Map<string, any[]>
) {
    const totalGeral = fiados.reduce((a, f) => a + Number(f.valor_total), 0);
    const totalPago = fiados.reduce((a, f) => a + Number(f.valor_pago), 0);
    const saldoGeral = totalGeral - totalPago;
    const hoje = new Date().toISOString().slice(0, 10);

    let html = headerHTML(
        `Relatório do Cliente`,
        `${cliente.nome} ${cliente.cpf ? `– CPF: ${cliente.cpf}` : ''}`
    );

    // Resumo do cliente
    html += `
    <div class="summary-grid">
      <div class="summary-card"><div class="label">Total de Fiados</div><div class="value">${fiados.length}</div></div>
      <div class="summary-card"><div class="label">Total Comprado</div><div class="value">${formatBRL(totalGeral)}</div></div>
      <div class="summary-card"><div class="label">Total Pago</div><div class="value success">${formatBRL(totalPago)}</div></div>
      <div class="summary-card"><div class="label">Saldo Devedor</div><div class="value danger">${formatBRL(saldoGeral)}</div></div>
    </div>`;

    // Info do cliente
    html += `
    <div class="section">
      <div class="section-title">Dados do Cliente</div>
      <table>
        <tr><td style="width:160px;font-weight:600">Nome</td><td>${cliente.nome}</td></tr>
        <tr><td style="font-weight:600">Código Interno</td><td>${cliente.codigo_interno || '—'}</td></tr>
        <tr><td style="font-weight:600">CPF</td><td>${cliente.cpf || '—'}</td></tr>
        <tr><td style="font-weight:600">Telefone</td><td>${cliente.telefone || '—'}</td></tr>
        <tr><td style="font-weight:600">Limite de Crédito</td><td>${formatBRL(Number(cliente.limite_credito || 0))}</td></tr>
        <tr><td style="font-weight:600">Status</td><td>${cliente.status?.toUpperCase() || 'ATIVO'}</td></tr>
      </table>
    </div>`;

    // Lista de fiados
    html += `<div class="section"><div class="section-title">Histórico de Compras Fiadas</div>`;

    if (fiados.length === 0) {
        html += `<p style="color:#666;padding:16px 0">Nenhum fiado registrado.</p>`;
    } else {
        fiados.forEach(f => {
            const saldo = Number(f.valor_total) - Number(f.valor_pago);
            const vencido = f.data_vencimento && f.data_vencimento < hoje && f.status !== 'pago';
            const itens = todosItens.get(f.id) || [];

            html += `
        <div style="border:1px solid #e0e0e0;border-radius:8px;padding:12px;margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <div>
              <strong style="color:#1a237e">Fiado #${f.id.slice(0, 8)}</strong>
              <span style="margin-left:8px;font-size:11px;color:#666">${f.descricao || ''}</span>
            </div>
            ${statusBadge(f.status, vencido)}
          </div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;font-size:11px;margin-bottom:8px">
            <div><span style="color:#666">Compra:</span> ${f.data_compra ? formatDate(f.data_compra) : formatDate(f.created_at)}</div>
            <div><span style="color:#666">Vencimento:</span> ${f.data_vencimento ? formatDate(f.data_vencimento) : '—'}</div>
            <div><span style="color:#666">Total:</span> <strong>${formatBRL(Number(f.valor_total))}</strong></div>
            <div><span style="color:#666">Pendente:</span> <strong style="color:#c62828">${formatBRL(saldo)}</strong></div>
          </div>`;

            if (itens.length > 0) {
                html += `<table><thead><tr><th>Produto</th><th class="text-center">Qtd</th><th class="text-right">Unit.</th><th class="text-right">Total</th></tr></thead><tbody>`;
                itens.forEach(i => {
                    html += `<tr><td>${i.produto}</td><td class="text-center">${i.quantidade}</td><td class="text-right">${formatBRL(Number(i.valor_unitario))}</td><td class="text-right">${formatBRL(Number(i.valor_total))}</td></tr>`;
                });
                html += `</tbody></table>`;
            }

            html += `</div>`;
        });
    }

    html += `</div>`;
    html += `<div class="footer">Relatório gerado automaticamente pelo sistema NEXOR</div>`;
    openPrintWindow(`Cliente – ${cliente.nome}`, html);
}
