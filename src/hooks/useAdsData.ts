import { useCallback } from "react";
import { useOperator } from "../contexts/OperatorContext";
import { supabase } from "../lib/supabase";

// Tabelas sensíveis cujas colunas secretas (capi_access_token, secret, token) não devem
// ser lidas/escritas pelo client via o helper genérico abaixo. Acesso a essas colunas é
// feito exclusivamente por rotas dedicadas no servidor (ver server.ts).
const SENSITIVE_TABLES = ["operator_webhook_tokens", "webhook_secrets", "capi_configs"] as const;

export type AdsTableResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Hook genérico de acesso aos dados do módulo de Anúncios. Toda leitura/escrita feita por
 * aqui é automaticamente filtrada pelo operador atual, para evitar que tasks futuras
 * esqueçam o filtro de `operator` ao consultar qualquer uma das tabelas novas.
 *
 * Não usar para `operator_webhook_tokens`, `webhook_secrets` ou `capi_configs` quando o
 * objetivo for ler/escrever as colunas sensíveis (token/secret/capi_access_token) — essas
 * são acessadas só via rotas dedicadas em server.ts.
 */
export function useAdsData() {
  const operator = useOperator();

  const useAdsTable = useCallback(
    function useAdsTable<T = any>(table: string) {
      const isSensitive = SENSITIVE_TABLES.includes(table as any);
      if (isSensitive) {
        console.warn(
          `[useAdsData] Acesso à tabela sensível "${table}" via useAdsTable é bloqueado no client. Use uma rota dedicada em server.ts.`
        );
      }
      const sensitiveBlockError = <D,>(): AdsTableResult<D> => ({
        success: false,
        error: `"${table}" é uma tabela sensível — use uma rota dedicada do backend.`
      });

      const list = async (
        columns = "*",
        modify?: (query: any) => any
      ): Promise<AdsTableResult<T[]>> => {
        if (isSensitive) return sensitiveBlockError<T[]>();
        if (!supabase) return { success: false, error: "Supabase não configurado." };
        try {
          let query = supabase.from(table).select(columns).eq("operator", operator);
          if (modify) query = modify(query);
          const { data, error } = await query;
          if (error) throw error;
          return { success: true, data: (data || []) as T[] };
        } catch (err: any) {
          console.error(`[useAdsData] Erro ao listar "${table}":`, err);
          return { success: false, error: err.message || "Erro ao buscar dados." };
        }
      };

      const insert = async (values: Partial<T> | Partial<T>[]): Promise<AdsTableResult<T[]>> => {
        if (isSensitive) return sensitiveBlockError<T[]>();
        if (!supabase) return { success: false, error: "Supabase não configurado." };
        try {
          const rows = (Array.isArray(values) ? values : [values]).map((row) => ({
            ...row,
            operator
          }));
          const { data, error } = await supabase.from(table).insert(rows).select();
          if (error) throw error;
          return { success: true, data: (data || []) as T[] };
        } catch (err: any) {
          console.error(`[useAdsData] Erro ao inserir em "${table}":`, err);
          return { success: false, error: err.message || "Erro ao inserir dados." };
        }
      };

      const update = async (
        id: string,
        values: Partial<T>
      ): Promise<AdsTableResult<T[]>> => {
        if (isSensitive) return sensitiveBlockError<T[]>();
        if (!supabase) return { success: false, error: "Supabase não configurado." };
        try {
          const { data, error } = await supabase
            .from(table)
            .update(values as any)
            .eq("id", id)
            .eq("operator", operator)
            .select();
          if (error) throw error;
          return { success: true, data: (data || []) as T[] };
        } catch (err: any) {
          console.error(`[useAdsData] Erro ao atualizar "${table}":`, err);
          return { success: false, error: err.message || "Erro ao atualizar dados." };
        }
      };

      const remove = async (id: string): Promise<AdsTableResult<null>> => {
        if (isSensitive) return sensitiveBlockError<null>();
        if (!supabase) return { success: false, error: "Supabase não configurado." };
        try {
          const { error } = await supabase
            .from(table)
            .delete()
            .eq("id", id)
            .eq("operator", operator);
          if (error) throw error;
          return { success: true, data: null };
        } catch (err: any) {
          console.error(`[useAdsData] Erro ao remover de "${table}":`, err);
          return { success: false, error: err.message || "Erro ao remover dados." };
        }
      };

      return { list, insert, update, remove };
    },
    [operator]
  );

  return { operator, useAdsTable };
}
