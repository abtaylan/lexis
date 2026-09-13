// src/lib/orgListLocale.ts — "Kurumlarım" (Organizations) liste sayfası
// (app/(app)/organizations/page.tsx) için yerel çeviri sözlüğü.
//
// V2 öncelik #4 (12 Eylül 2026) — "B2B Kurumsal Lig Arayüzü": kurum
// oluşturma/listeleme ekranı. Backend zaten hazırdı (routes/organizations.py,
// madde B/F/G'de kurum RAPORU/export/onay eklendi ama kurum OLUŞTURMA/
// listeleme ekranı hiç yoktu — bu dosya + page.tsx onu kapatıyor).
import type { Locale } from '@/lib/i18n';

export interface OrgListStrings {
  title: string;
  subtitle: string;
  loading: string;
  error: string;
  retryBtn: string;
  emptyTitle: string;
  emptyBody: string;
  roleOwner: string;
  roleAdmin: string;
  roleMember: string;
  viewBtn: string;
}

export const ORG_LIST_L: Record<Locale, OrgListStrings> = {
  tr: {
    title: 'Kurumlarım',
    subtitle: 'Üyesi olduğun veya yönettiğin kurumlar — kurum raporu, üye yönetimi ve daha fazlası buradan.',
    loading: 'Yükleniyor…',
    error: 'Kurumlar yüklenemedi.',
    retryBtn: 'Tekrar dene',
    emptyTitle: 'Henüz bir kurumun yok',
    emptyBody: 'Kurumlar artık Lexis ekibi tarafından, B2B paketini satın alan müşteriler için açılıyor. Kurumsal bir hesap istersen bizimle iletişime geç.',
    roleOwner: 'Sahip',
    roleAdmin: 'Yönetici',
    roleMember: 'Üye',
    viewBtn: 'Görüntüle',
  },
  en: {
    title: 'My Organizations',
    subtitle: 'Organizations you belong to or manage — organization reports, member management and more, from here.',
    loading: 'Loading…',
    error: 'Could not load organizations.',
    retryBtn: 'Retry',
    emptyTitle: "You don't have an organization yet",
    emptyBody: 'Organizations are now set up by the Lexis team for customers who purchase the B2B package. Contact us if you’d like a corporate account.',
    roleOwner: 'Owner',
    roleAdmin: 'Admin',
    roleMember: 'Member',
    viewBtn: 'View',
  },
  de: {
    title: 'Meine Organisationen',
    subtitle: 'Organisationen, denen du angehörst oder die du verwaltest — Berichte, Mitgliederverwaltung und mehr, von hier aus.',
    loading: 'Wird geladen…',
    error: 'Organisationen konnten nicht geladen werden.',
    retryBtn: 'Erneut versuchen',
    emptyTitle: 'Du hast noch keine Organisation',
    emptyBody: 'Organisationen werden jetzt vom Lexis-Team für Kunden eingerichtet, die das B2B-Paket erwerben. Kontaktiere uns, wenn du ein Unternehmenskonto möchtest.',
    roleOwner: 'Eigentümer',
    roleAdmin: 'Admin',
    roleMember: 'Mitglied',
    viewBtn: 'Anzeigen',
  },
  fr: {
    title: 'Mes organisations',
    subtitle: 'Les organisations dont tu fais partie ou que tu gères — rapports, gestion des membres et plus encore, ici.',
    loading: 'Chargement…',
    error: 'Impossible de charger les organisations.',
    retryBtn: 'Réessayer',
    emptyTitle: "Tu n'as pas encore d'organisation",
    emptyBody: "Les organisations sont désormais créées par l’équipe Lexis pour les clients qui achètent le pack B2B. Contacte-nous si tu souhaites un compte professionnel.",
    roleOwner: 'Propriétaire',
    roleAdmin: 'Admin',
    roleMember: 'Membre',
    viewBtn: 'Voir',
  },
  es: {
    title: 'Mis organizaciones',
    subtitle: 'Organizaciones a las que perteneces o que administras — informes, gestión de miembros y más, desde aquí.',
    loading: 'Cargando…',
    error: 'No se pudieron cargar las organizaciones.',
    retryBtn: 'Reintentar',
    emptyTitle: 'Aún no tienes ninguna organización',
    emptyBody: 'Las organizaciones ahora las crea el equipo de Lexis para los clientes que compran el paquete B2B. Contáctanos si deseas una cuenta corporativa.',
    roleOwner: 'Propietario',
    roleAdmin: 'Administrador',
    roleMember: 'Miembro',
    viewBtn: 'Ver',
  },
  it: {
    title: 'Le mie organizzazioni',
    subtitle: 'Le organizzazioni a cui appartieni o che gestisci — report, gestione dei membri e altro, da qui.',
    loading: 'Caricamento…',
    error: 'Impossibile caricare le organizzazioni.',
    retryBtn: 'Riprova',
    emptyTitle: 'Non hai ancora un’organizzazione',
    emptyBody: 'Le organizzazioni vengono ora create dal team Lexis per i clienti che acquistano il pacchetto B2B. Contattaci se desideri un account aziendale.',
    roleOwner: 'Proprietario',
    roleAdmin: 'Amministratore',
    roleMember: 'Membro',
    viewBtn: 'Visualizza',
  },
  ar: {
    title: 'مؤسساتي',
    subtitle: 'المؤسسات التي تنتمي إليها أو تديرها — تقارير المؤسسة وإدارة الأعضاء والمزيد، من هنا.',
    loading: 'جارٍ التحميل…',
    error: 'تعذّر تحميل المؤسسات.',
    retryBtn: 'أعد المحاولة',
    emptyTitle: 'ليس لديك مؤسسة بعد',
    emptyBody: 'أصبحت المؤسسات الآن تُنشأ من قبل فريق Lexis للعملاء الذين يشترون باقة B2B. تواصل معنا إذا كنت ترغب في حساب مؤسسي.',
    roleOwner: 'المالك',
    roleAdmin: 'مسؤول',
    roleMember: 'عضو',
    viewBtn: 'عرض',
  },
  ru: {
    title: 'Мои организации',
    subtitle: 'Организации, в которых вы состоите или которыми управляете — отчёты, управление участниками и многое другое.',
    loading: 'Загрузка…',
    error: 'Не удалось загрузить организации.',
    retryBtn: 'Повторить',
    emptyTitle: 'У вас пока нет организации',
    emptyBody: 'Теперь организации создаются командой Lexis для клиентов, которые приобрели пакет B2B. Свяжитесь с нами, если хотите корпоративный аккаунт.',
    roleOwner: 'Владелец',
    roleAdmin: 'Администратор',
    roleMember: 'Участник',
    viewBtn: 'Открыть',
  },
  ja: {
    title: '所属組織',
    subtitle: 'あなたが所属または管理している組織 — 組織レポート、メンバー管理などはこちらから。',
    loading: '読み込み中…',
    error: '組織を読み込めませんでした。',
    retryBtn: '再試行',
    emptyTitle: 'まだ組織がありません',
    emptyBody: '組織は現在、B2Bパッケージを購入した顧客向けにLexisチームが開設しています。法人アカウントをご希望の場合はお問い合わせください。',
    roleOwner: 'オーナー',
    roleAdmin: '管理者',
    roleMember: 'メンバー',
    viewBtn: '表示',
  },
  pt: {
    title: 'Minhas Organizações',
    subtitle: 'Organizações às quais você pertence ou administra — relatórios, gestão de membros e mais, a partir daqui.',
    loading: 'Carregando…',
    error: 'Não foi possível carregar as organizações.',
    retryBtn: 'Tentar novamente',
    emptyTitle: 'Você ainda não tem uma organização',
    emptyBody: 'As organizações agora são criadas pela equipe Lexis para clientes que adquirem o pacote B2B. Entre em contato se quiser uma conta corporativa.',
    roleOwner: 'Proprietário',
    roleAdmin: 'Administrador',
    roleMember: 'Membro',
    viewBtn: 'Ver',
  },
};
