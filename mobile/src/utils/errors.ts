// src/utils/errors.ts — web'deki lib/errors.ts'in mobil karşılığı.
// FastAPI, pydantic doğrulaması başarısız olduğunda (422) `detail` alanını
// bir string DEĞİL, bir hata objesi listesi olarak döner. Bu yardımcı,
// detail'in string mi yoksa pydantic hata listesi mi olduğunu ayırt edip
// her zaman güvenli bir string döner.
export function getErrorMessage(err: unknown, fallback: string): string {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;

  if (typeof detail === 'string' && detail.trim()) return detail;

  if (Array.isArray(detail) && detail.length > 0) {
    const msgs = detail
      .map((d) => (d && typeof d === 'object' && 'msg' in d ? String((d as { msg: unknown }).msg) : null))
      .filter((m): m is string => !!m);
    if (msgs.length > 0) return msgs.join(' ');
  }

  return fallback;
}

export function isNetworkError(err: unknown): boolean {
  const e = err as { code?: string; message?: string; response?: unknown };
  return !e.response && (e.code === 'ECONNABORTED' || e.message === 'Network Error' || !!e.message?.includes('Network'));
}
