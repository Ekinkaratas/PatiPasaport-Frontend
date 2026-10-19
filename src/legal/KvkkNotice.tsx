import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { CONTACT_EMAIL } from '@/config/site';

// KVKK Aydınlatma Metni. DİKKAT: Taslak metindir; veri sorumlusu bilgileri ve iletişim adresi yer tutucudur

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="font-extrabold text-cocoa-900">{title}</h3>
      {children}
    </section>
  );
}

function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5 marker:text-brand-400">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

function Highlight({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl bg-brand-50 px-4 py-3 font-semibold text-brand-800 ring-1 ring-brand-100">
      {children}
    </p>
  );
}

const Email = () => (
  <a
    href={`mailto:${CONTACT_EMAIL}`}
    className="font-semibold text-brand-700 underline"
  >
    {CONTACT_EMAIL}
  </a>
);

function KvkkNoticeTr() {
  return (
    <>
      <p className="text-xs text-cocoa-500">Son güncelleme: 19 Ekim 2026</p>
      <Highlight>
        PatiPasaport, yazılım geliştirme pratiği amacıyla hazırlanmış, ticari
        olmayan bir eğitim ve demo projesidir. Gerçek bir veteriner sağlık
        hizmeti sunmaz; buradaki hiçbir içerik tıbbi tavsiye niteliği taşımaz.
      </Highlight>

      <Section title="1. Projenin niteliği">
        <p>
          Bu web sitesi ve bağlı olduğu altyapı, yalnızca öğrenim ve gösterim
          amacıyla geliştirilmiştir. Herhangi bir şirketin, kliniğin ya da
          kurumun resmî hizmeti değildir; ücret alınmaz ve ticari bir amaç
          güdülmez.
        </p>
        <List
          items={[
            'Hizmetin kesintisiz, hatasız ya da sürekli erişilebilir olacağı taahhüt edilmez.',
            'Özellikler önceden haber verilmeksizin değiştirilebilir, kaldırılabilir ya da tamamen durdurulabilir.',
            'Sistemdeki hesaplar ve kayıtlar, bakım veya sıfırlama gerektiğinde herhangi bir zamanda silinebilir.',
          ]}
        />
      </Section>

      <Section title="2. Deneme ve test kullanımı">
        <p>
          Projeyi incelemek isteyen herkes kendi hesabını açarak ya da proje
          kapsamında paylaşılan test hesaplarıyla tüm özellikleri serbestçe
          deneyebilir. Deneme yaparken lütfen:
        </p>
        <List
          items={[
            'Gerçek kişisel verilerinizi değil, kurgusal ad, telefon ve e-posta bilgilerini kullanın.',
            'Başka sitelerde kullandığınız bir şifreyi burada kullanmayın.',
            'Gerçek hasta, hayvan ya da tıbbi kayıt bilgisi yüklemeyin.',
            'Sistemin işleyişini bozmaya, başkalarının hesaplarına erişmeye veya kötüye kullanıma yönelik girişimlerde bulunmayın.',
          ]}
        />
      </Section>

      <Section title="3. Sorumluluğun reddi">
        <p>
          Site ve tüm içeriği “olduğu gibi” ve “mevcut hâliyle” sunulur.
          Yürürlükteki mevzuatın izin verdiği azami ölçüde, aşağıdakiler dahil
          olmak üzere bu siteden kaynaklanan hiçbir doğrudan veya dolaylı
          zarardan sorumluluk kabul edilmez:
        </p>
        <List
          items={[
            'Veri kaybı, verilerin silinmesi ya da bozulması,',
            'Hizmet kesintileri, hatalar ve güvenlik açıkları,',
            'Sitede gösterilen bilgilere dayanılarak alınan kararlar,',
            'Kullanıcıların girdiği içerikler ve üçüncü kişilerin eylemleri.',
          ]}
        />
        <p>
          Evcil hayvanınızın sağlığıyla ilgili her konuda mutlaka bir veteriner
          hekime başvurun.
        </p>
      </Section>

      <Section title="4. Kişisel verilerin korunması (KVKK)">
        <p>
          6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında, siteye
          girdiğiniz veriler (ad soyad, e-posta, telefon, evcil hayvan ve sağlık
          kayıtları, izin kayıtları) yalnızca projenin işleyişi için, yani
          hesabınızın oluşturulması, kayıtların size gösterilmesi ve izin
          verdiğiniz kliniklerle paylaşılması amacıyla işlenir.
        </p>
        <List
          items={[
            'Veriler satılmaz, reklam veya başka bir ticari amaçla kullanılmaz ve üçüncü kişilere aktarılmaz.',
            'Şifreler geri döndürülemez biçimde özetlenerek, çip numaraları şifrelenerek saklanır; ancak bir demo ortamında mutlak güvenlik garanti edilemez.',
            'KVKK’nın 11. maddesindeki haklarınızı kullanabilir; verilerinizin silinmesini her zaman talep edebilirsiniz.',
          ]}
        />
      </Section>

      <Section title="5. Kabul">
        <p>
          Siteye üye olarak veya siteyi kullanarak bu metni okuduğunuzu,
          anladığınızı ve koşulları kabul ettiğinizi beyan etmiş olursunuz.
        </p>
      </Section>

      <Section title="6. İletişim">
        <p>
          Soru, görüş ve veri silme talepleriniz için: <Email />
        </p>
      </Section>
    </>
  );
}

function KvkkNoticeEn() {
  return (
    <>
      <p className="text-xs text-cocoa-500">Last updated: 19 October 2026</p>
      <Highlight>
        PatiPasaport is a non-commercial educational and demo project built to
        practise software development. It does not provide real veterinary
        services, and nothing on this site is medical advice.
      </Highlight>

      <Section title="1. About this project">
        <p>
          This website and its infrastructure were built solely for learning and
          demonstration. It is not an official service of any company, clinic or
          institution; it is free of charge and has no commercial purpose.
        </p>
        <List
          items={[
            'There is no commitment that the service will be uninterrupted, error-free or always available.',
            'Features may be changed, removed or discontinued entirely without notice.',
            'Accounts and records may be deleted at any time for maintenance or a reset.',
          ]}
        />
      </Section>

      <Section title="2. Trying it out">
        <p>
          Anyone who wants to explore the project can create their own account
          or use the test accounts shared as part of the project and try every
          feature freely. While trying it out, please:
        </p>
        <List
          items={[
            'use fictional names, phone numbers and email addresses rather than your real personal data;',
            "don't reuse a password you use on other sites;",
            "don't upload real patient, animal or medical records;",
            "don't attempt to disrupt the system, access other people's accounts or misuse the service.",
          ]}
        />
      </Section>

      <Section title="3. Disclaimer">
        <p>
          The site and all of its content are provided “as is” and “as
          available”. To the fullest extent permitted by applicable law, no
          liability is accepted for any direct or indirect damage arising from
          this site, including:
        </p>
        <List
          items={[
            'loss, deletion or corruption of data;',
            'service interruptions, errors and security vulnerabilities;',
            'decisions made based on information shown on the site;',
            'content entered by users and the actions of third parties.',
          ]}
        />
        <p>Always consult a veterinarian about your pet’s health.</p>
      </Section>

      <Section title="4. Personal data (KVKK)">
        <p>
          Under Turkish Law No. 6698 on the Protection of Personal Data, the
          data you enter (name, email, phone, pet and health records, permission
          records) is processed only to run the project: creating your account,
          showing your records and sharing them with the clinics you authorise.
        </p>
        <List
          items={[
            'Data is not sold, not used for advertising or any other commercial purpose, and not transferred to third parties.',
            'Passwords are stored as irreversible hashes and microchip numbers are encrypted, but absolute security cannot be guaranteed in a demo environment.',
            'You can exercise your rights under Article 11 of KVKK and ask for your data to be deleted at any time.',
          ]}
        />
      </Section>

      <Section title="5. Acceptance">
        <p>
          By signing up for or using the site, you confirm that you have read
          and understood this notice and accept its terms.
        </p>
      </Section>

      <Section title="6. Contact">
        <p>
          For questions, feedback and data deletion requests: <Email />
        </p>
      </Section>
    </>
  );
}

export function KvkkNotice() {
  const { i18n } = useTranslation();
  return (
    <div className="space-y-5 text-sm leading-relaxed text-cocoa-700">
      {i18n.language === 'tr' ? <KvkkNoticeTr /> : <KvkkNoticeEn />}
    </div>
  );
}
