import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import { randomUUID } from 'crypto';

const SUPABASE_URL = 'https://ocasuvctasprdrjxjyhs.supabase.co';
const SUPABASE_KEY = 'SUA_SERVICE_ROLE_KEY_AQUI';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Parse date "31/03/2026 20:04:19" -> ISO string
function parseDate(str) {
  if (!str || typeof str !== 'string') return null;
  const match = str.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, dd, mm, yyyy, hh, mi, ss] = match;
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
}

// Parse number - handles "0" string and numbers
function parseNum(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  return parseFloat(String(val).replace('.', '').replace(',', '.')) || 0;
}

async function main() {
  console.log('Lendo arquivo ReportSale.xls...');
  const wb = XLSX.readFile('sales/ReportSale.xls');
  const ws = wb.Sheets['Plan 1'];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

  // Filter valid sales (skip header and summary rows)
  const vendas = rows.slice(1).filter(r => {
    return r[0] === 'PDV' && r[5] && typeof r[5] === 'string' && r[5].includes('/');
  });

  console.log(`Total de vendas válidas: ${vendas.length}`);

  // Check existing numero_venda to avoid duplicates
  const { data: existingVendas } = await supabase
    .from('vendas')
    .select('numero_venda')
    .order('numero_venda', { ascending: false })
    .limit(1);

  const maxExisting = existingVendas?.[0]?.numero_venda || 0;
  console.log(`Maior numero_venda existente: ${maxExisting}`);

  // Map vendedor names to find operador_id
  const { data: profiles } = await supabase.from('profiles').select('user_id, nome');
  const profileMap = new Map();
  (profiles || []).forEach(p => profileMap.set(p.nome?.toUpperCase(), p.user_id));
  console.log('Profiles encontrados:', profiles?.map(p => p.nome));

  // Prepare batches
  const BATCH_SIZE = 100;
  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < vendas.length; i += BATCH_SIZE) {
    const batch = vendas.slice(i, i + BATCH_SIZE);
    const records = [];

    for (const row of batch) {
      const [canal, pedido, origem, cliente, vendedor, data, tipoNf, nNf, totalProdutos, valorEntrega, valorBruto, desconto, totalVenda] = row;

      const createdAt = parseDate(data);
      if (!createdAt) { skipped++; continue; }

      const total = parseNum(totalVenda);
      const descontoVal = parseNum(desconto);
      const subtotal = parseNum(valorBruto);
      const numeroCupom = typeof pedido === 'number' ? pedido : parseInt(pedido) || 0;

      // Find operador by name
      let operadorId = null;
      if (vendedor && vendedor !== 'Sem vendedor') {
        operadorId = profileMap.get(vendedor.toUpperCase()) || null;
      }

      records.push({
        id: randomUUID(),
        numero_venda: numeroCupom,
        created_at: createdAt,
        status: 'finalizada',
        tipo: 'pdv',
        metodo_pagamento: 'dinheiro',
        subtotal: subtotal,
        desconto_total: descontoVal,
        total: total,
        valor_pago: total,
        troco: 0,
        operador_id: operadorId,
        cliente_id: null,
      });
    }

    if (records.length === 0) continue;

    const { error } = await supabase.from('vendas').insert(records);
    if (error) {
      console.error(`Erro no batch ${i}-${i + BATCH_SIZE}:`, error.message);
      errors += records.length;
    } else {
      inserted += records.length;
    }

    // Progress
    const pct = Math.round(((i + batch.length) / vendas.length) * 100);
    process.stdout.write(`\rProgresso: ${pct}% (${inserted} inseridas, ${skipped} puladas, ${errors} erros)`);
  }

  console.log(`\n\nImportação concluída!`);
  console.log(`  Inseridas: ${inserted}`);
  console.log(`  Puladas: ${skipped}`);
  console.log(`  Erros: ${errors}`);
  console.log(`  Total processadas: ${vendas.length}`);
}

main().catch(console.error);
