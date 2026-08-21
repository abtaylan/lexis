// FastAPI, request body/query pydantic doğrulaması başarısız olduğunda
// (422) `detail` alanını bir string DEĞİL, bir hata objesi listesi olarak
// döner: [{ type, loc, msg, input, ctx }, ...]. Bazı ekranlarda
// `err.response.data.detail` doğrudan string bekleyen bir yere (ör. bir
// <p>{error}</p>) verildiği için, bu durumda React "Objects are not valid
// as a React child" hatasıyla tüm sayfayı çökertiyordu. Bu yardımcı,
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
