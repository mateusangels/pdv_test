import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Read the uploaded file from request body
    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    const normalizeUnidade = (u: string): string => {
      const upper = (u || "").trim().toUpperCase();
      if (["UNIDADE", "UND", "UNI"].includes(upper)) return "UN";
      if (["QUILOGRAMA"].includes(upper)) return "KG";
      if (["CAIXA"].includes(upper)) return "CX";
      const valid = ["UN", "KG", "CX", "PT", "FD", "LT", "DS", "DP", "CJ"];
      return valid.includes(upper) ? upper : "UN";
    };

    // Skip header row
    const produtos = rows.slice(1).filter(r => r[2] && String(r[2]).trim().length > 0).map(r => ({
      codigo_barras: String(r[0] || "").trim(),
      descricao: String(r[2] || "").trim().toUpperCase(),
      preco_custo: parseFloat(r[3]) || 0,
      preco_venda: parseFloat(r[4]) || 0,
      preco_atacado: parseFloat(r[5]) || 0,
      qtd_minima_atacado: parseInt(r[6]) || 0,
      unidade: normalizeUnidade(String(r[7] || "UN")),
      ativo: String(r[8] || "").trim().toLowerCase() === "sim",
      categoria: String(r[9] || "").trim(),
      movimenta_estoque: String(r[11] || "").trim().toLowerCase() === "sim",
      estoque_minimo: parseInt(r[12]) || 0,
      estoque_atual: parseFloat(r[13]) || 0,
      marca: String(r[14] || "").trim().toUpperCase(),
      codigo_interno: String(r[17] || "").trim(),
    }));

    // Buscar produtos existentes para comparar
    const { data: existentes } = await supabase.from("produtos").select("id, codigo_barras, descricao");
    const existentesList = existentes || [];

    const porBarras = new Map<string, string>();
    const porDescricao = new Map<string, string>();
    for (const p of existentesList) {
      if (p.codigo_barras && p.codigo_barras.trim() !== "") {
        porBarras.set(p.codigo_barras.trim().toUpperCase(), p.id);
      }
      if (p.descricao && p.descricao.trim() !== "") {
        porDescricao.set(p.descricao.trim().toUpperCase(), p.id);
      }
    }

    const paraAtualizar: { id: string; dados: any }[] = [];
    const paraInserir: any[] = [];

    for (const prod of produtos) {
      const barrasKey = prod.codigo_barras.toUpperCase();
      const descKey = prod.descricao.toUpperCase();
      const idExistente = (barrasKey !== "" && porBarras.get(barrasKey)) || porDescricao.get(descKey);

      if (idExistente) {
        paraAtualizar.push({ id: idExistente, dados: prod });
      } else {
        paraInserir.push(prod);
      }
    }

    // Atualizar existentes
    let atualizados = 0;
    const errors: string[] = [];
    for (const item of paraAtualizar) {
      const { error } = await supabase.from("produtos").update(item.dados).eq("id", item.id);
      if (error) {
        errors.push(`Update ${item.id}: ${error.message}`);
      } else {
        atualizados++;
      }
    }

    // Inserir novos em lotes de 100
    const batchSize = 100;
    let inseridos = 0;
    for (let i = 0; i < paraInserir.length; i += batchSize) {
      const batch = paraInserir.slice(i, i + batchSize);
      const { error } = await supabase.from("produtos").insert(batch);
      if (error) {
        errors.push(`Batch ${i}: ${error.message}`);
      } else {
        inseridos += batch.length;
      }
    }

    return new Response(
      JSON.stringify({ success: true, total: produtos.length, inseridos, atualizados, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
