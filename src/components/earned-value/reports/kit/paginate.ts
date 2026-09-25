/**
 * PLN-F3.4 · Yazdırma sayfalaması — GİR miktar ağacının A4 yatay sayfalara
 * bölünmesi (`Planlama - Günlük İlerleme Raporu.dc.html:299-386`, sayfa 2/3
 * disiplin (L1) SINIRINDA kırılır: "✂ Sayfa kırılımı · Kaba İnşaat").
 *
 * SAF fonksiyon: girdi zaten DFS ön-sıra (grup üyeleri ARDIŞIK gelir, bkz.
 * `report-screen.ts` `QtyTreeRow` sözleşmesi). Kural: bir grup (`groupOf`
 * anahtarı — GİR'de L1 disiplin `node_id`si) MÜMKÜNSE bölünmeden TEK sayfaya
 * konur; sayfada yer kalmıyorsa grubun TAMAMI bir sonraki sayfaya taşınır
 * (satır satır bölünmez). Yalnız bir grup TEK BAŞINA `capacity`den büyükse
 * (kapasiteyi aşan grup) o grup zorunlu olarak birden çok sayfaya
 * BÖLÜNÜR; ilk parça `continued: false`, sonraki parçalar `continued: true`
 * ("devam" işareti — mockup GİR:304 `pg.breakLabel`).
 */
export interface PaginatedGroup<T> {
  readonly rows: readonly T[];
  /** `true` → bu parça önceki sayfadan DEVAM eder (grup kapasiteden büyük, bölünmüş). */
  readonly continued: boolean;
}

export function paginateByGroup<T>(
  rows: readonly T[],
  capacity: number,
  groupOf: (row: T) => string,
): PaginatedGroup<T>[][] {
  if (rows.length === 0) return [];
  if (capacity <= 0) {
    throw new RangeError("paginateByGroup: capacity 0'dan büyük olmalı");
  }

  // Ardışık aynı-anahtarlı satırları tek kümeye topla (girdi DFS ön-sıra).
  const clusters: { rows: T[] }[] = [];
  for (const row of rows) {
    const key = groupOf(row);
    const last = clusters[clusters.length - 1];
    if (last !== undefined && groupOf(last.rows[0]) === key) {
      last.rows.push(row);
    } else {
      clusters.push({ rows: [row] });
    }
  }

  const pages: PaginatedGroup<T>[][] = [];
  let currentPage: PaginatedGroup<T>[] = [];
  let used = 0;

  const flushPage = () => {
    if (currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [];
      used = 0;
    }
  };

  for (const cluster of clusters) {
    if (cluster.rows.length <= capacity) {
      // Grup TEK sayfaya sığar — kırılmaz; sığmıyorsa TAMAMEN sonraki sayfaya geç.
      if (used + cluster.rows.length > capacity) flushPage();
      currentPage.push({ rows: cluster.rows, continued: false });
      used += cluster.rows.length;
      continue;
    }

    // Grup TEK BAŞINA kapasiteden büyük — zorunlu bölünme.
    let remaining: T[] = cluster.rows;
    let isFirstPart = true;
    while (remaining.length > 0) {
      const capacityLeft = capacity - used;
      if (capacityLeft <= 0) {
        flushPage();
        continue;
      }
      if (remaining.length <= capacityLeft) {
        currentPage.push({ rows: remaining, continued: !isFirstPart });
        used += remaining.length;
        remaining = [];
      } else {
        const take = remaining.slice(0, capacityLeft);
        currentPage.push({ rows: take, continued: !isFirstPart });
        used += take.length;
        remaining = remaining.slice(capacityLeft);
        isFirstPart = false;
        flushPage();
      }
    }
  }
  flushPage();

  return pages;
}
