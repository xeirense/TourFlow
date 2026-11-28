import type { Metadata } from 'next';
import Link from 'next/link';
import LegalPage, { Section, List } from '@/app/components/LegalPage';

export const metadata: Metadata = { title: 'İstifadə şərtləri' };

export default function TermsPage() {
  return (
    <LegalPage title="İstifadə şərtləri" updated="28 noyabr 2026">
      <p>
        Bu şərtlər turizm agentliklərinin TourFlow platformasından (bundan sonra — “Xidmət”) istifadə qaydalarını
        müəyyən edir. Qeydiyyatdan keçməklə və ya Xidmətdən istifadə etməklə bu şərtləri qəbul etmiş olursunuz.
      </p>

      <Section n={1} title="Xidmət">
        <p>
          TourFlow agentliklərə tur təklifləri hazırlamaq, onları müştərilərə link vasitəsilə göndərmək, müştəri
          reaksiyalarını izləmək və müştəri bazasını idarə etmək imkanı verən onlayn platformadır. Turların
          satışı, qiymətlərin düzgünlüyü və müştəri ilə müqavilə münasibətləri agentliyin məsuliyyətindədir;
          TourFlow tur xidməti göstərmir və satışda tərəf deyil.
        </p>
      </Section>

      <Section n={2} title="Hesab">
        <List items={[
          'Qeydiyyat zamanı düzgün və aktual məlumat təqdim etməlisiniz',
          'Hesabınızın və şifrənizin təhlükəsizliyinə görə siz cavabdehsiniz',
          'Komanda üzvlərinin hesabdakı fəaliyyətinə görə agentlik məsuliyyət daşıyır',
          'Hesabın icazəsiz istifadəsindən şübhələndikdə dərhal bizə bildirin',
        ]} />
      </Section>

      <Section n={3} title="Planlar və ödəniş">
        <List items={[
          'Hər yeni agentliyə 14 günlük pulsuz sınaq verilir',
          'Sınaq bitdikdən sonra Xidmətdən istifadə seçilmiş planın aylıq ödənişi ilə davam edir',
          'Qiymətlər və plan imkanları saytın Qiymətlər bölməsində göstərilir; dəyişikliklər barədə əvvəlcədən xəbər verilir',
          'Abunəni istənilən vaxt dayandıra bilərsiniz; dayandırma cari ödəniş dövrünün sonunda qüvvəyə minir',
        ]} />
      </Section>

      <Section n={4} title="Agentliyin öhdəlikləri">
        <List items={[
          'Müştəri məlumatlarını Xidmətə yalnız qanuni əsasla (məs. müştərinin razılığı ilə) daxil etmək',
          'Təkliflərdə düzgün qiymət, tarix və otel məlumatı göstərmək',
          'Xidmətdən spam, aldadıcı və ya qanunsuz məzmun göndərmək üçün istifadə etməmək',
          'Başqasının əqli mülkiyyət hüququnu pozan şəkil və mətnlər yükləməmək',
        ]} />
      </Section>

      <Section n={5} title="Məlumatlar">
        <p>
          Agentliyin daxil etdiyi məlumatlar agentliyə məxsusdur. Müştəri bazasını istənilən vaxt CSV formatında
          ixrac edə bilərsiniz (plana uyğun olaraq). Məlumatların emalı <Link href="/privacy" className="text-brand-700 hover:underline">Məxfilik siyasətində</Link> təsvir olunub.
        </p>
      </Section>

      <Section n={6} title="Xidmətin əlçatanlığı">
        <p>
          Xidmətin fasiləsiz işləməsi üçün səy göstəririk, lakin texniki işlər və ya üçüncü tərəf xidmətlərindəki
          nasazlıqlar səbəbindən qısa fasilələr ola bilər. Planlaşdırılmış işlər barədə mümkün olduqca əvvəlcədən
          məlumat veririk.
        </p>
      </Section>

      <Section n={7} title="Məsuliyyətin məhdudlaşdırılması">
        <p>
          Qanunla icazə verilən həddə TourFlow agentliyin təkliflərindəki məlumatlara, agentlik və müştəri
          arasındakı mübahisələrə və dolayı itkilərə (itirilmiş gəlir və s.) görə məsuliyyət daşımır.
        </p>
      </Section>

      <Section n={8} title="Hesabın dayandırılması">
        <p>
          Bu şərtlər ciddi şəkildə pozulduqda hesabı xəbərdarlıq edərək dayandıra bilərik. Hesabı özünüz
          bağlamaq üçün bizimlə əlaqə saxlayın.
        </p>
      </Section>

      <Section n={9} title="Tətbiq olunan hüquq">
        <p>Bu şərtlər Azərbaycan Respublikasının qanunvericiliyinə uyğun tənzimlənir.</p>
      </Section>
    </LegalPage>
  );
}
