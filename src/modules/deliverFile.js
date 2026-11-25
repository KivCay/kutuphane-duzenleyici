// Oluşturulan dosyayı kullanıcıya verir: telefonda paylaşım menüsü (Dosyalar'a kaydet, WhatsApp,
// e-posta…), bilgisayarda doğrudan indirme.
export async function deliverFile(blob, filename, type) {
  const file = new File([blob], filename, { type });
  const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (mobile && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return 'paylasildi';
    } catch (e) {
      if (e?.name === 'AbortError') return 'iptal';
      // paylaşım olmadıysa indirmeye geç
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return 'indirildi';
}
