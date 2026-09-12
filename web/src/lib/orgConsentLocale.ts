// src/lib/orgConsentLocale.ts — Rapor Paylaşımı Onayı sayfası
// (app/(app)/organizations/[orgId]/consent/page.tsx) için yerel çeviri
// sözlüğü. orgReportLocale.ts (Kurum Raporu) ile aynı desen.
//
// İstatistik & Raporlama V2 öncelik #3, Faz 3 madde G — "KVKK onay
// mekanizması": kurum raporundaki (madde B) "top_learners" bölümü üyeleri
// İSİMLİ gösteriyor ve artık PDF/CSV/Excel'e export edilip e-postayla
// gönderilebiliyor (madde F) — bu sayfa, üyenin kendi rızasıyla (opt-in)
// bu görünürlüğe onay verip vermeyeceğini/geri çekeceğini yönettiği yer.
import type { Locale } from '@/lib/i18n';

export interface OrgConsentStrings {
  title: string;
  subtitle: string;
  explanation: string;
  loading: string;
  loadError: string;
  forbiddenError: string;
  retryBtn: string;
  grantedLabel: string;
  notGrantedLabel: string;
  consentedAtTpl: string;
  grantBtn: string;
  revokeBtn: string;
  saving: string;
  saveError: string;
}

export const ORG_CONSENT_L: Record<Locale, OrgConsentStrings> = {
  tr: {
    title: 'Rapor Paylaşımı Onayı',
    subtitle: 'Kurum yöneticinizin göreceği raporlarda isminizin görünüp görünmeyeceğini burada yönetebilirsiniz.',
    explanation: 'Bu kurumun yöneticisi, dönemsel bir kurum raporunda (ekranda, PDF/CSV/Excel olarak indirilebilir veya e-posta ile gönderilebilir) en aktif üyeleri kullanıcı adı ve kazanılan XP ile görebilir. Bu bölümde isminizin görünmesi TAMAMEN SİZİN TERCİHİNİZE bağlıdır — onay vermezseniz bu raporlarda isminizle görünmezsiniz. Onayı istediğiniz zaman geri çekebilirsiniz.',
    loading: 'Yükleniyor…', loadError: 'Onay durumu yüklenemedi.',
    forbiddenError: 'Bu kurumun üyesi değilsiniz.', retryBtn: 'Tekrar dene',
    grantedLabel: 'Onay verildi', notGrantedLabel: 'Onay verilmedi',
    consentedAtTpl: '{date} tarihinde onay verdiniz.',
    grantBtn: 'Onay Ver', revokeBtn: 'Onayı Geri Çek',
    saving: 'Kaydediliyor…', saveError: 'Bir şeyler ters gitti, lütfen tekrar dene.',
  },
  en: {
    title: 'Report Sharing Consent',
    subtitle: 'Manage whether your name appears in the reports your organization manager can see.',
    explanation: "Your organization's manager can see a periodic organization report (on screen, downloaded as PDF/CSV/Excel, or emailed) that lists top learners by username and XP earned. Whether your name appears there is entirely YOUR CHOICE — if you don't consent, you won't be listed by name in these reports. You can withdraw your consent at any time.",
    loading: 'Loading…', loadError: 'Could not load consent status.',
    forbiddenError: 'You are not a member of this organization.', retryBtn: 'Try again',
    grantedLabel: 'Consent given', notGrantedLabel: 'Consent not given',
    consentedAtTpl: 'You gave consent on {date}.',
    grantBtn: 'Give Consent', revokeBtn: 'Withdraw Consent',
    saving: 'Saving…', saveError: 'Something went wrong, please try again.',
  },
  de: {
    title: 'Einwilligung zur Berichtsfreigabe',
    subtitle: 'Verwalte, ob dein Name in den Berichten erscheint, die dein Organisationsmanager sehen kann.',
    explanation: 'Der Manager deiner Organisation kann einen periodischen Organisationsbericht einsehen (auf dem Bildschirm, als PDF/CSV/Excel heruntergeladen oder per E-Mail versendet), der die aktivsten Mitglieder mit Benutzername und erhaltenen XP auflistet. Ob dein Name dort erscheint, ist vollständig DEINE ENTSCHEIDUNG — ohne deine Zustimmung wirst du in diesen Berichten nicht namentlich aufgeführt. Du kannst deine Zustimmung jederzeit widerrufen.',
    loading: 'Lädt…', loadError: 'Zustimmungsstatus konnte nicht geladen werden.',
    forbiddenError: 'Du bist kein Mitglied dieser Organisation.', retryBtn: 'Erneut versuchen',
    grantedLabel: 'Zustimmung erteilt', notGrantedLabel: 'Keine Zustimmung',
    consentedAtTpl: 'Du hast am {date} zugestimmt.',
    grantBtn: 'Zustimmen', revokeBtn: 'Zustimmung widerrufen',
    saving: 'Wird gespeichert…', saveError: 'Etwas ist schiefgelaufen, bitte versuche es erneut.',
  },
  fr: {
    title: 'Consentement au partage du rapport',
    subtitle: "Gère si ton nom apparaît dans les rapports que ton gestionnaire d'organisation peut voir.",
    explanation: "Le gestionnaire de ton organisation peut consulter un rapport périodique de l'organisation (à l'écran, téléchargé en PDF/CSV/Excel, ou envoyé par e-mail) qui liste les membres les plus actifs avec leur nom d'utilisateur et l'XP gagné. Que ton nom y apparaisse ou non est ENTIÈREMENT TON CHOIX — si tu ne consens pas, tu n'apparaîtras pas nommément dans ces rapports. Tu peux retirer ton consentement à tout moment.",
    loading: 'Chargement…', loadError: 'Impossible de charger le statut du consentement.',
    forbiddenError: "Tu n'es pas membre de cette organisation.", retryBtn: 'Réessayer',
    grantedLabel: 'Consentement donné', notGrantedLabel: 'Consentement non donné',
    consentedAtTpl: 'Tu as donné ton consentement le {date}.',
    grantBtn: 'Donner mon consentement', revokeBtn: 'Retirer mon consentement',
    saving: 'Enregistrement…', saveError: "Une erreur s'est produite, réessaie.",
  },
  es: {
    title: 'Consentimiento para compartir el informe',
    subtitle: 'Gestiona si tu nombre aparece en los informes que puede ver el administrador de tu organización.',
    explanation: 'El administrador de tu organización puede ver un informe periódico de la organización (en pantalla, descargado como PDF/CSV/Excel, o enviado por correo) que enumera a los miembros más activos con su nombre de usuario y XP ganado. Que tu nombre aparezca allí es COMPLETAMENTE TU DECISIÓN — si no das tu consentimiento, no aparecerás con tu nombre en estos informes. Puedes retirar tu consentimiento en cualquier momento.',
    loading: 'Cargando…', loadError: 'No se pudo cargar el estado del consentimiento.',
    forbiddenError: 'No eres miembro de esta organización.', retryBtn: 'Reintentar',
    grantedLabel: 'Consentimiento otorgado', notGrantedLabel: 'Consentimiento no otorgado',
    consentedAtTpl: 'Diste tu consentimiento el {date}.',
    grantBtn: 'Dar Consentimiento', revokeBtn: 'Retirar Consentimiento',
    saving: 'Guardando…', saveError: 'Algo salió mal, inténtalo de nuevo.',
  },
  it: {
    title: 'Consenso alla condivisione del report',
    subtitle: 'Gestisci se il tuo nome appare nei report che il responsabile della tua organizzazione può vedere.',
    explanation: "Il responsabile della tua organizzazione può visualizzare un report periodico dell'organizzazione (a schermo, scaricato come PDF/CSV/Excel, o inviato via email) che elenca i membri più attivi con nome utente e XP guadagnati. Che il tuo nome vi appaia o meno è COMPLETAMENTE UNA TUA SCELTA — se non acconsenti, non apparirai con il tuo nome in questi report. Puoi revocare il tuo consenso in qualsiasi momento.",
    loading: 'Caricamento…', loadError: 'Impossibile caricare lo stato del consenso.',
    forbiddenError: 'Non sei un membro di questa organizzazione.', retryBtn: 'Riprova',
    grantedLabel: 'Consenso dato', notGrantedLabel: 'Consenso non dato',
    consentedAtTpl: 'Hai dato il consenso il {date}.',
    grantBtn: 'Dai il Consenso', revokeBtn: 'Revoca il Consenso',
    saving: 'Salvataggio…', saveError: 'Qualcosa è andato storto, riprova.',
  },
  ar: {
    title: 'الموافقة على مشاركة التقرير',
    subtitle: 'إدارة ما إذا كان اسمك سيظهر في التقارير التي يمكن لمدير مؤسستك رؤيتها.',
    explanation: 'يمكن لمدير مؤسستك الاطلاع على تقرير دوري للمؤسسة (على الشاشة، أو كملف PDF/CSV/Excel يتم تنزيله، أو يُرسل بالبريد الإلكتروني) يسرد الأعضاء الأكثر نشاطًا باسم المستخدم وXP المكتسب. ظهور اسمك هناك هو اختيارك الكامل — إذا لم توافق، فلن تظهر باسمك في هذه التقارير. يمكنك سحب موافقتك في أي وقت.',
    loading: 'جارٍ التحميل…', loadError: 'تعذر تحميل حالة الموافقة.',
    forbiddenError: 'أنت لست عضوًا في هذه المؤسسة.', retryBtn: 'إعادة المحاولة',
    grantedLabel: 'تمت الموافقة', notGrantedLabel: 'لم تتم الموافقة',
    consentedAtTpl: 'وافقت بتاريخ {date}.',
    grantBtn: 'الموافقة', revokeBtn: 'سحب الموافقة',
    saving: 'جارٍ الحفظ…', saveError: 'حدث خطأ ما، يرجى المحاولة مرة أخرى.',
  },
  ru: {
    title: 'Согласие на публикацию в отчёте',
    subtitle: 'Управляй тем, будет ли твоё имя отображаться в отчётах, которые видит менеджер твоей организации.',
    explanation: 'Менеджер твоей организации может просматривать периодический отчёт организации (на экране, скачанный как PDF/CSV/Excel, или отправленный по почте), в котором перечислены самые активные участники с именем пользователя и полученным XP. Появится ли там твоё имя — это ПОЛНОСТЬЮ ТВОЙ ВЫБОР — без твоего согласия ты не будешь указан по имени в этих отчётах. Ты можешь отозвать своё согласие в любой момент.',
    loading: 'Загрузка…', loadError: 'Не удалось загрузить статус согласия.',
    forbiddenError: 'Ты не являешься участником этой организации.', retryBtn: 'Повторить',
    grantedLabel: 'Согласие дано', notGrantedLabel: 'Согласие не дано',
    consentedAtTpl: 'Ты дал согласие {date}.',
    grantBtn: 'Дать согласие', revokeBtn: 'Отозвать согласие',
    saving: 'Сохранение…', saveError: 'Что-то пошло не так, попробуй ещё раз.',
  },
  ja: {
    title: 'レポート共有への同意',
    subtitle: '組織の管理者が閲覧できるレポートにあなたの名前を表示するかどうかを管理します。',
    explanation: '組織の管理者は、ユーザー名と獲得XPで最も活発なメンバーを一覧表示する定期的な組織レポート（画面上、またはPDF/CSV/Excelとしてダウンロード、あるいはメールで送信）を閲覧できます。そこにあなたの名前が表示されるかどうかは完全にあなたの選択です — 同意しない場合、これらのレポートに名前で表示されることはありません。同意はいつでも撤回できます。',
    loading: '読み込み中…', loadError: '同意状況を読み込めませんでした。',
    forbiddenError: 'あなたはこの組織のメンバーではありません。', retryBtn: '再試行',
    grantedLabel: '同意済み', notGrantedLabel: '未同意',
    consentedAtTpl: '{date} に同意しました。',
    grantBtn: '同意する', revokeBtn: '同意を撤回する',
    saving: '保存中…', saveError: '問題が発生しました。もう一度お試しください。',
  },
  pt: {
    title: 'Consentimento para Partilha do Relatório',
    subtitle: 'Gere se o teu nome aparece nos relatórios que o administrador da tua organização pode ver.',
    explanation: 'O administrador da tua organização pode ver um relatório periódico da organização (no ecrã, transferido como PDF/CSV/Excel, ou enviado por email) que lista os membros mais ativos com nome de utilizador e XP ganho. O teu nome aparecer ou não aí é TOTALMENTE A TUA ESCOLHA — se não deres consentimento, não aparecerás com o teu nome nestes relatórios. Podes retirar o teu consentimento a qualquer momento.',
    loading: 'A carregar…', loadError: 'Não foi possível carregar o estado do consentimento.',
    forbiddenError: 'Não és membro desta organização.', retryBtn: 'Tentar novamente',
    grantedLabel: 'Consentimento dado', notGrantedLabel: 'Consentimento não dado',
    consentedAtTpl: 'Deste consentimento em {date}.',
    grantBtn: 'Dar Consentimento', revokeBtn: 'Retirar Consentimento',
    saving: 'A guardar…', saveError: 'Algo correu mal, tenta novamente.',
  },
};
