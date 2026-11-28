import type { Metadata } from 'next';
import LegalPage, { Section, List } from '@/app/components/LegalPage';

export const metadata: Metadata = { title: 'Məxfilik siyasəti' };

export default function PrivacyPage() {
  return (
    <LegalPage title="Məxfilik siyasəti" updated="28 noyabr 2026">
      <p>
        Bu siyasət TourFlow platformasının (bundan sonra — “TourFlow”, “biz”) hansı məlumatları topladığını,
        onlardan necə istifadə etdiyini və necə qoruduğunu izah edir. Siyasət həm platformadan istifadə edən
        turizm agentliklərinə, həm də agentliklərin təklif göndərdiyi müştərilərə aiddir.
      </p>

      <Section n={1} title="Rollar">
        <p>
          Agentliklər öz müştərilərinin məlumatlarını TourFlow-a özləri daxil edir və bu məlumatların nə məqsədlə
          istifadə olunacağını özləri müəyyən edir. Bu məlumatlar baxımından agentlik məlumatların sahibi
          (operatoru), TourFlow isə agentliyin tapşırığı ilə onları emal edən texniki xidmət təminatçısıdır.
        </p>
        <p>Agentlik hesabının məlumatlarına görə isə TourFlow birbaşa məsuliyyət daşıyır.</p>
      </Section>

      <Section n={2} title="Topladığımız məlumatlar">
        <p className="font-medium text-ink">Agentlik hesabı</p>
        <List items={[
          'E-poçt ünvanı və şifrə (şifrə yalnız şifrələnmiş şəkildə saxlanılır)',
          'Agentliyin adı, loqosu, menecerin adı və WhatsApp nömrəsi',
          'Komanda üzvlərinin e-poçt ünvanları və adları',
          'Plan, abunə və istifadə göstəriciləri',
        ]} />
        <p className="font-medium text-ink pt-2">Agentliyin müştəriləri</p>
        <List items={[
          'Ad, soyad və telefon nömrəsi (agentlik tərəfindən daxil edilir)',
          'Səyahət üstünlükləri: istiqamətlər, büdcə, səyahətçi sayı, doğum tarixi (əgər daxil edilibsə)',
          'Təklif səhifəsindəki fəaliyyət: təklifin açılma vaxtı və sayı, verilən cavab, seçilən otel, yazılan qeyd',
        ]} />
        <p className="font-medium text-ink pt-2">Texniki məlumatlar</p>
        <List items={[
          'Giriş sessiyası üçün zəruri cookie faylları',
          'Xətaların aşkarlanması üçün server jurnalları (IP ünvanı, brauzer növü, vaxt)',
        ]} />
        <p>TourFlow reklam məqsədli izləmə və ya üçüncü tərəf reklam cookie-lərindən istifadə etmir.</p>
      </Section>

      <Section n={3} title="Məlumatlardan necə istifadə edirik">
        <List items={[
          'Təklif səhifələrini yaratmaq və müştəriyə göstərmək',
          'Agentliyə müştərinin reaksiyası (baxış, cavab, seçim) haqqında bildiriş göndərmək',
          'Müştəri bazası, xatırlatmalar və analitika funksiyalarını təmin etmək',
          'Hesabın təhlükəsizliyini qorumaq və texniki xətaları aradan qaldırmaq',
          'Xidmətlə bağlı vacib məlumatları (məs. şifrənin bərpası) e-poçtla göndərmək',
        ]} />
        <p>Məlumatları satmırıq və icazəsiz başqa məqsədlər üçün istifadə etmirik.</p>
      </Section>

      <Section n={4} title="Xidmət təminatçıları">
        <p>Platformanın işləməsi üçün aşağıdakı xidmətlərdən istifadə edirik. Onlar məlumatları yalnız bizim tapşırığımızla emal edir:</p>
        <List items={[
          'Supabase — verilənlər bazası, autentifikasiya və fayl yaddaşı',
          'Vercel — veb-saytın yerləşdirilməsi',
          'E-poçt göndərmə xidməti — sistem məktubları',
          'Telegram — agentlik bunu aktivləşdirdikdə bildirişlər',
        ]} />
        <p>
          Bu xidmətlərin serverləri Azərbaycandan kənarda yerləşə bilər. Məlumatların ötürülməsi zamanı
          müvafiq təhlükəsizlik tədbirləri tətbiq olunur.
        </p>
      </Section>

      <Section n={5} title="Saxlanma müddəti">
        <List items={[
          'Agentlik hesabı aktiv olduğu müddətdə məlumatlar saxlanılır',
          'Agentlik müştəri kartını və ya təklifi sildikdə məlumat bazadan silinir',
          'Hesab bağlandıqdan sonra məlumatlar 30 gün ərzində silinir (qanunla saxlanması tələb olunanlar istisna olmaqla)',
        ]} />
      </Section>

      <Section n={6} title="Təhlükəsizlik">
        <p>
          Məlumatlar şifrələnmiş əlaqə (HTTPS) üzərindən ötürülür. Hər agentlik yalnız öz məlumatlarını görür —
          bu, verilənlər bazası səviyyəsində məhdudlaşdırılır. Şifrə dəyişikliyi yalnız hesabın e-poçtuna
          göndərilən təsdiq linki ilə mümkündür.
        </p>
      </Section>

      <Section n={7} title="Hüquqlarınız">
        <p>
          “Fərdi məlumatlar haqqında” Azərbaycan Respublikası Qanununa uyğun olaraq məlumatlarınızla tanış olmaq,
          onların düzəldilməsini və ya silinməsini tələb etmək hüququnuz var.
        </p>
        <List items={[
          'Agentliyin müştərisi kimi sorğunuzla ilk növbədə sizə təklif göndərən agentliyə müraciət edin',
          'Agentlik olaraq hesab məlumatlarınızı Parametrlər bölməsindən dəyişə və ya bizimlə əlaqə saxlaya bilərsiniz',
        ]} />
      </Section>

      <Section n={8} title="Dəyişikliklər">
        <p>
          Bu siyasət yenilənə bilər. Əhəmiyyətli dəyişikliklər barədə agentlikləri e-poçt və ya platforma
          daxilində məlumatlandıracağıq.
        </p>
      </Section>
    </LegalPage>
  );
}
