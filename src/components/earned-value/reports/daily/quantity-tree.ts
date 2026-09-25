import type { TreeNode } from "@/components/earned-value/common/tree-table/tree-rows";
import type { EvQtyTreeRow } from "@/lib/api/models";

/**
 * PLN-F3.4 · GİR miktar tablosu — backend `quantities[]` DÜZ bir DFS
 * ön-sıra listesidir (`level` alanıyla, F3-SÖZLEŞME §0: "ağaç `parent_id`den
 * DEĞİL" — burada `parent_id` de yok, sıra + `level` tek kaynaktır).
 * `TreeTable` iç içe `TreeNode<T>` bekler (`tree-rows.ts`); bu SAF fonksiyon
 * düz listeyi bir YIĞIN (stack) ile iç içe ağaca çevirir: bir satır, ondan
 * ÖNCE gelen ve `level`i KENDİSİNDEN küçük en yakın satırın çocuğu olur.
 *
 * Girdi BOZULMAZ, yeni ağaç döner.
 */
export function buildQuantityTree(rows: readonly EvQtyTreeRow[]): TreeNode<EvQtyTreeRow>[] {
  interface Building {
    row: EvQtyTreeRow;
    children: Building[];
  }

  const roots: Building[] = [];
  const stack: Building[] = [];

  for (const row of rows) {
    const node: Building = { row, children: [] };
    while (stack.length > 0 && stack[stack.length - 1]!.row.level >= row.level) {
      stack.pop();
    }
    const parent = stack[stack.length - 1];
    if (parent === undefined) {
      roots.push(node);
    } else {
      parent.children.push(node);
    }
    stack.push(node);
  }

  const toTreeNode = (node: Building): TreeNode<EvQtyTreeRow> => ({
    id: node.row.node_id,
    data: node.row,
    children: node.children.length === 0 ? undefined : node.children.map(toTreeNode),
  });

  return roots.map(toTreeNode);
}
