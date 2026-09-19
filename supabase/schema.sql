-- Talentcore — Supabase sxemi (vakansiyalar)
-- İstifadə: Supabase panelində "SQL Editor" bölməsinə keç, bu faylın tamamını
-- yapışdır və "Run" düyməsinə bas. Cədvəl, təhlükəsizlik qaydaları və mövcud
-- 16 nümunə vakansiya bir dəfəyə yaranacaq.

create table vacancies (
    id bigint generated always as identity primary key,
    title text not null,
    company text not null,
    category text not null,        -- js/vacancies.js-dəki CATEGORIES id-ləri ilə eyni olmalıdır (it, finance, marketing, construction, logistics, banking, hr)
    location text not null,
    job_type text not null,        -- "Tam ştat", "Yarı ştat" və s.
    work_mode text not null,       -- "Ofisdən", "Hibrid", "Uzaqdan"
    posted_at date not null default current_date,
    description text not null,
    requirements text[] not null default '{}',
    offer text[] not null default '{}',
    is_active boolean not null default true,   -- vakansiyanı silmədən "bağlamaq" üçün false et
    created_at timestamptz not null default now()
);

-- Sətir Səviyyəli Təhlükəsizlik (RLS) — açıq sayt yalnız OXUYA bilsin, YAZA bilməsin.
-- Supabase panelindəki Table Editor bu qaydalardan təsirlənmir (ayrıca, "admin"
-- səlahiyyəti ilə daxil olursan), ona görə panel üzərindən əlavə/redaktə/silmə
-- həmişə normal işləyəcək.
alter table vacancies enable row level security;

create policy "Aktiv vakansiyaları hamı oxuya bilər"
    on vacancies for select
    using (is_active = true);

-- --- NÜMUNƏ MƏLUMATLAR (mövcud js/vacancies.js-dəki 16 vakansiya) ---
insert into vacancies (title, company, category, location, job_type, work_mode, posted_at, description, requirements, offer) values
('Senior Backend Developer', 'TechCore Solutions', 'it', 'Bakı', 'Tam ştat', 'Hibrid', '2026-09-17',
 'Məhsul komandamızda backend infrastrukturunun dizaynı və inkişafı üçün təcrübəli Backend Developer axtarırıq. Yüksək yüklənməyə davamlı sistemlər üzərində işləyəcəksiniz.',
 array['Node.js və ya Java ilə 4+ il təcrübə','PostgreSQL / MySQL ilə verilənlər bazası dizaynı','Mikroservis arxitekturası təcrübəsi','Komanda daxilində effektiv kommunikasiya'],
 array['Rəqabətqabiliyyətli maaş paketi','Sağlamlıq sığortası','Peşəkar inkişaf büdcəsi']),

('Frontend Developer (React)', 'TechCore Solutions', 'it', 'Bakı', 'Tam ştat', 'Ofisdən', '2026-09-14',
 'İstifadəçi interfeyslərinin React əsasında qurulması və mövcud məhsulun inkişaf etdirilməsi üçün Frontend Developer axtarırıq.',
 array['React.js ilə 3+ il təcrübə','TypeScript biliyi','REST API inteqrasiyası təcrübəsi','Diqqətli və detallara həssas yanaşma'],
 array['Çevik iş qrafiki','Müasir texnologiya stəki','Komanda daxili təlimlər']),

('Maliyyə Meneceri', 'Baku Finance Group', 'finance', 'Bakı', 'Tam ştat', 'Ofisdən', '2026-09-18',
 'Şirkətin maliyyə planlaşdırılması, büdcələşdirmə və hesabatlılıq proseslərinə rəhbərlik edəcək təcrübəli Maliyyə Meneceri axtarırıq.',
 array['Maliyyə/Mühasibatlıq üzrə ali təhsil','5+ il müvafiq iş təcrübəsi','Maliyyə hesabatlılığı standartları biliyi (IFRS üstünlükdür)','Excel-də irəli səviyyə'],
 array['İllik bonus sistemi','Nahar kompensasiyası','Karyera inkişafı imkanları']),

('Baş Mühasib', 'Baku Finance Group', 'finance', 'Bakı', 'Tam ştat', 'Ofisdən', '2026-09-12',
 'Bütün mühasibat uçotu proseslərinin aparılması və vergi hesabatlarının vaxtında təqdim edilməsinə görə məsuliyyət daşıyacaq Baş Mühasib axtarırıq.',
 array['Mühasibatlıq üzrə 7+ il təcrübə, 2+ il rəhbər vəzifədə','1C proqramında sərbəst işləmə bacarığı','Vergi Məcəlləsi üzrə dərin bilik','Komanda idarəetmə bacarığı'],
 array['Rəqabətqabiliyyətli maaş','Sağlamlıq sığortası','Sabit iş qrafiki']),

('Rəqəmsal Marketinq Mütəxəssisi', 'BrightWave Agency', 'marketing', 'Bakı', 'Tam ştat', 'Uzaqdan', '2026-09-16',
 'Sosial media, SEO və performans reklamları üzrə strategiyaların hazırlanması və icrası üçün Rəqəmsal Marketinq Mütəxəssisi axtarırıq.',
 array['Rəqəmsal marketinqdə 2+ il təcrübə','Meta Ads və Google Ads təcrübəsi','Analitik düşüncə və hesabatlılıq bacarığı','Yaradıcı məzmun hazırlama bacarığı'],
 array['Tam uzaqdan iş imkanı','Çevik iş saatları','Performansa əsaslanan bonuslar']),

('Satış Təmsilçisi', 'BrightWave Agency', 'marketing', 'Bakı', 'Tam ştat', 'Ofisdən', '2026-09-15',
 'Yeni müştərilərin cəlb edilməsi və mövcud müştəri portfelinin inkişaf etdirilməsi üçün nəticəyönümlü Satış Təmsilçisi axtarırıq.',
 array['Satışda 1+ il təcrübə','Güclü ünsiyyət və danışıqlar bacarığı','Nəticəyönümlülük','B kateqoriyalı sürücülük vəsiqəsi üstünlükdür'],
 array['Sabit əmək haqqı + komissiya','Nəqliyyat kompensasiyası','Satış təlimləri']),

('Layihə Meneceri (Tikinti)', 'NorthBuild MMC', 'construction', 'Bakı', 'Tam ştat', 'Ofisdən', '2026-09-13',
 'Tikinti layihələrinin planlaşdırılması, büdcəyə və müddətə uyğun icrasının təmin edilməsi üçün təcrübəli Layihə Meneceri axtarırıq.',
 array['İnşaat mühəndisliyi üzrə ali təhsil','5+ il layihə idarəetməsi təcrübəsi','MS Project / AutoCAD bilikləri','Sahədə iş qrafikinə uyğunluq'],
 array['Layihə bonusları','Nəqliyyat təminatı','Peşəkar sertifikat proqramları']),

('Anbar Nəzarətçisi', 'LogiFlow Az', 'logistics', 'Sumqayıt', 'Tam ştat', 'Ofisdən', '2026-09-16',
 'Anbar əməliyyatlarının səmərəli təşkili, ehtiyatların uçotu və komandanın rəhbərliyi üçün Anbar Nəzarətçisi axtarırıq.',
 array['Anbar/logistika sahəsində 2+ il təcrübə','WMS proqram təminatı ilə iş bacarığı','Komanda idarəetmə bacarığı','Fiziki aktivliyə açıqlıq'],
 array['Nahar təminatı','Nəqliyyat xətti','İş yerində təlim']),

('Kredit Analitiki', 'AtlasBank', 'banking', 'Bakı', 'Tam ştat', 'Ofisdən', '2026-09-17',
 'Kredit müraciətlərinin qiymətləndirilməsi və risk analizinin aparılması üçün Kredit Analitiki axtarırıq.',
 array['Maliyyə/İqtisadiyyat üzrə ali təhsil','2+ il bank sektorunda təcrübə','Maliyyə analizi və risk qiymətləndirməsi bacarığı','Excel-də irəli səviyyə bilik'],
 array['Bank sektoru üzrə sosial paket','İllik təlim büdcəsi','Karyera yüksəlişi imkanları']),

('HR Business Partner', 'TalentCore Partner Co.', 'hr', 'Bakı', 'Tam ştat', 'Hibrid', '2026-09-18',
 'Biznes bölmələri ilə sıx əməkdaşlıq edərək işə qəbul, işçi təcrübəsi və təşkilati inkişaf proseslərinə dəstək olacaq HR Business Partner axtarırıq.',
 array['HR sahəsində 3+ il təcrübə','İşə qəbul proseslərini idarəetmə bacarığı','Əmək Məcəlləsi üzrə bilik','Güclü kommunikasiya bacarığı'],
 array['Hibrid iş formatı','Peşəkar HR sertifikatları üçün dəstək','Dostluq mühiti']),

('UI/UX Dizayner', 'DesignHub Creative', 'it', 'Bakı', 'Tam ştat', 'Uzaqdan', '2026-09-15',
 'Məhsul komandası ilə birgə istifadəçi interfeyslərinin dizaynını hazırlayacaq, prototip qurulmasında iştirak edəcək UI/UX Dizayner axtarırıq.',
 array['Figma ilə 2+ il təcrübə','İstifadəçi təcrübəsi (UX) prinsipləri üzrə bilik','Vizual dizayn portfolio-su','Frontend komandası ilə əməkdaşlıq bacarığı'],
 array['Tam uzaqdan iş imkanı','Yaradıcı komanda mühiti','Müasir dizayn alətlərinə giriş']),

('Anbar Operatoru', 'LogiFlow Az', 'logistics', 'Sumqayıt', 'Tam ştat', 'Ofisdən', '2026-09-14',
 'Anbarda malların qəbulu, yerləşdirilməsi və sifarişlərin hazırlanması proseslərində iştirak edəcək Anbar Operatoru axtarırıq.',
 array['Fiziki aktivliyə açıqlıq','Komanda daxilində işləmə bacarığı','Məsuliyyətlilik və dəqiqlik','Növbəli iş qrafikinə uyğunluq'],
 array['Nahar təminatı','Nəqliyyat xətti','İş yerində təlim']),

('Sığorta Məhsulları üzrə Menecer', 'AtlasBank', 'banking', 'Bakı', 'Tam ştat', 'Ofisdən', '2026-09-17',
 'Yeni sığorta məhsullarının hazırlanması və mövcud məhsul xəttinin bazar tələblərinə uyğun inkişaf etdirilməsi üçün Menecer axtarırıq.',
 array['Sığorta və ya bank sektorunda 3+ il təcrübə','Məhsul idarəetməsi bacarığı','Bazar araşdırması aparma təcrübəsi','Analitik düşüncə'],
 array['Bank sektoru üzrə sosial paket','İllik bonus sistemi','Peşəkar inkişaf imkanları']),

('Tikinti Mühəndisi', 'NorthBuild MMC', 'construction', 'Gəncə', 'Tam ştat', 'Ofisdən', '2026-09-12',
 'Tikinti sahəsində texniki nəzarəti həyata keçirəcək, layihə sənədləri ilə sahə işlərinin uyğunluğunu təmin edəcək Tikinti Mühəndisi axtarırıq.',
 array['İnşaat mühəndisliyi üzrə ali təhsil','2+ il sahə təcrübəsi','AutoCAD biliyi','Texniki sənədləşmə bacarığı'],
 array['Yol xərclərinin ödənilməsi','Sahə əlavəsi','Peşəkar sertifikat proqramları']),

('İnsan Resursları üzrə Mütəxəssis', 'TalentCore Partner Co.', 'hr', 'Bakı', 'Tam ştat', 'Hibrid', '2026-09-16',
 'İşə qəbul prosesləri, işçi sənədləşməsi və HR sistemlərinin aparılmasında məsul olacaq İnsan Resursları üzrə Mütəxəssis axtarırıq.',
 array['HR sahəsində 1+ il təcrübə','MS Office proqramlarında sərbəst işləmə','Təşkilatçılıq bacarığı','Məxfiliyə riayət etmə'],
 array['Hibrid iş formatı','Öyrənmə və inkişaf proqramları','Dostluq mühiti']),

('Maliyyə Analitiki', 'Baku Finance Group', 'finance', 'Bakı', 'Tam ştat', 'Ofisdən', '2026-09-13',
 'Maliyyə hesabatlarının hazırlanması, büdcə təhlili və proqnozlaşdırma proseslərində iştirak edəcək Maliyyə Analitiki axtarırıq.',
 array['Maliyyə/İqtisadiyyat üzrə ali təhsil','1+ il analitik təcrübə','Excel-də irəli səviyyə bilik','Detallara diqqətlilik'],
 array['Rəqabətqabiliyyətli maaş','İllik təlim büdcəsi','Karyera inkişafı imkanları']);
