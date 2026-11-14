import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Calendar, Combobox, PhoneField, NumberField, Slider, Tabs, TimeSlotPicker, formatSlot, type ISODate, type Slot } from "../src";
import "./styles.css";

type Lang = "en" | "ar";

const treatments = [
  { en: "Dental implants", ar: "زِراعَة الأسنان" },
  { en: "All-on-4", ar: "تقنية أول أون فور" },
  { en: "Veneers", ar: "قشور الأسنان (الفينير)" },
  { en: "Teeth whitening", ar: "تبييض الأسنان" },
  { en: "Hair transplant", ar: "زِراعَة الشَّعر" },
  { en: "Root canal", ar: "علاج العصب" },
  { en: "Orthodontics", ar: "تقويم الأسنان" },
];

const zones = ["Europe/Istanbul", "Asia/Dubai", "Asia/Riyadh", "Europe/London", "America/New_York"];

const t = {
  en: {
    switch: "العربية",
    lead: "Unstyled, accessible React components that work the same in Arabic and English. Each follows its WAI-ARIA pattern and is tested with axe. This page is one booking flow built from them.",
    step1: "Treatment",
    step1Body: "Combobox with Arabic-aware search: “زراعه” finds “زِراعَة”, with or without hamza and diacritics.",
    cbxLabel: "Which treatment?",
    cbxEmpty: "No matching treatment",
    step2: "Date",
    step2Body: "Calendar in Gregorian or Umm al-Qura Hijri. The week starts where the locale says: Sunday in Saudi Arabia, Saturday in Egypt, Monday in Türkiye.",
    calTabs: "Calendar system",
    gregorian: "Gregorian",
    hijri: "Hijri",
    prev: "Previous month",
    next: "Next month",
    step3: "Time",
    step3Body: "The clinic works 09:00–13:00 Istanbul time. Times are shown in your zone; daylight-saving gaps are skipped. Arrow keys follow reading direction.",
    zone: "Show times in",
    gridLabel: "Available times",
    step4: "Budget",
    step4Body: "Slider whose track and arrow keys flip in RTL, with the value spoken in the reader's numerals and currency.",
    budget: "Budget per person",
    step5: "Contact",
    step5Body: "Fields that accept Arabic-Indic and Persian digits. The phone stays left-to-right inside Arabic text and is stored in E.164.",
    phone: "WhatsApp number",
    phoneHint: "We'll confirm the booking on WhatsApp",
    phoneError: "Enter a full phone number",
    age: "Age",
    ageError: "Numbers only",
    summary: "Your booking",
    none: "—",
    stores: "Stored as",
    footer: "Built by Awab Elkhalil",
  },
  ar: {
    switch: "English",
    lead: "مكوّنات React مجرّدة من التنسيق، سهلة الوصول، تعمل بالعربية كما تعمل بالإنجليزية. كل مكوّن يتّبع نمط WAI-ARIA ومختبَر بأداة axe. هذه الصفحة نموذج حجز مبنيّ منها.",
    step1: "العلاج",
    step1Body: "قائمة اختيار مع بحث يفهم العربية: «زراعه» تجد «زِراعَة»، بالهمزة أو بدونها، بالتشكيل أو بدونه.",
    cbxLabel: "ما العلاج المطلوب؟",
    cbxEmpty: "لا يوجد علاج مطابق",
    step2: "التاريخ",
    step2Body: "تقويم ميلادي أو هجري (أم القرى). يبدأ الأسبوع حسب البلد: الأحد في السعودية، والسبت في مصر، والاثنين في تركيا.",
    calTabs: "نوع التقويم",
    gregorian: "ميلادي",
    hijri: "هجري",
    prev: "الشهر السابق",
    next: "الشهر التالي",
    step3: "الوقت",
    step3Body: "تعمل العيادة من ٩ إلى ١ ظهرًا بتوقيت إسطنبول. تظهر المواعيد بتوقيتك مع تخطّي فجوات التوقيت الصيفي، والأسهم تتبع اتجاه القراءة.",
    zone: "عرض المواعيد بتوقيت",
    gridLabel: "المواعيد المتاحة",
    step4: "الميزانية",
    step4Body: "شريط تمرير ينعكس مساره وأسهمه في العربية، وتُنطق قيمته بالأرقام والعملة المناسبة للقارئ.",
    budget: "الميزانية للشخص",
    step5: "التواصل",
    step5Body: "حقول تقبل الأرقام العربية والفارسية. يبقى رقم الهاتف من اليسار إلى اليمين داخل النص العربي ويُحفظ بصيغة دولية.",
    phone: "رقم الواتساب",
    phoneHint: "سنؤكد الحجز عبر الواتساب",
    phoneError: "أدخل رقم هاتف كاملًا",
    age: "العمر",
    ageError: "أرقام فقط",
    summary: "حجزك",
    none: "—",
    stores: "يُحفظ بصيغة",
    footer: "من تصميم وتطوير أواب الخليل",
  },
} as const;

const todayIso = new Date().toISOString().slice(0, 10);

function App() {
  const [lang, setLang] = useState<Lang>("en");
  const [treatment, setTreatment] = useState<(typeof treatments)[number] | null>(null);
  const [calIndex, setCalIndex] = useState(0);
  const [date, setDate] = useState<ISODate | null>(null);
  const [zone, setZone] = useState("Asia/Dubai");
  const [slot, setSlot] = useState<Slot | null>(null);
  const [budget, setBudget] = useState(2500);
  const [phone, setPhone] = useState<{ e164: string; valid: boolean } | null>(null);
  const s = t[lang];
  const locale = lang === "ar" ? "ar-SA" : "en-GB";
  const calendar = calIndex === 1 ? "islamic-umalqura" : "gregory";
  const closed = (d: ISODate) => d < todayIso || new Date(`${d}T12:00:00Z`).getUTCDay() === 0;

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const calendarEl = (
    <Calendar
      key={`${lang}-${calendar}`}
      className="cal"
      locale={locale}
      calendar={calendar}
      value={date}
      onChange={(d) => {
        setDate(d);
        setSlot(null);
      }}
      isDateDisabled={closed}
      previousLabel={s.prev}
      nextLabel={s.next}
    />
  );

  const fmtDate = (d: ISODate) => new Intl.DateTimeFormat(`${locale}-u-ca-${calendar}`, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));

  return (
    <main>
      <header>
        <h1>rtl-primitives</h1>
        <button type="button" className="lang" onClick={() => setLang(lang === "en" ? "ar" : "en")} lang={lang === "en" ? "ar" : "en"}>
          {s.switch}
        </button>
      </header>
      <p className="lead">{s.lead}</p>

      <section aria-labelledby="s1">
        <h2 id="s1">
          <span className="n">1</span> {s.step1}
        </h2>
        <p>{s.step1Body}</p>
        <Combobox key={lang} className="cbx" label={s.cbxLabel} items={treatments} getLabel={(x) => x[lang]} onSelect={setTreatment} emptyMessage={s.cbxEmpty} />
      </section>

      <section aria-labelledby="s2">
        <h2 id="s2">
          <span className="n">2</span> {s.step2}
        </h2>
        <p>{s.step2Body}</p>
        <Tabs
          className="tabs"
          label={s.calTabs}
          selectedIndex={calIndex}
          onChange={setCalIndex}
          items={[
            { label: s.gregorian, content: calIndex === 0 ? calendarEl : null },
            { label: s.hijri, content: calIndex === 1 ? calendarEl : null },
          ]}
        />
      </section>

      <section aria-labelledby="s3">
        <h2 id="s3">
          <span className="n">3</span> {s.step3}
        </h2>
        <p>{s.step3Body}</p>
        <label className="zone">
          {s.zone}{" "}
          <select value={zone} onChange={(e) => setZone(e.target.value)}>
            {zones.map((z) => (
              <option key={z} value={z}>
                {z.replace("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <TimeSlotPicker
          className="slots"
          label={`${s.gridLabel}${date ? ` · ${fmtDate(date)}` : ""}`}
          date={date ?? todayIso}
          timeZone="Europe/Istanbul"
          start="09:00"
          end="13:00"
          stepMinutes={30}
          columns={4}
          locale={locale}
          displayTimeZone={zone}
          value={slot?.iso ?? null}
          onChange={setSlot}
          isSlotDisabled={(x) => x.wallTime === "10:30" || x.wallTime === "12:00"}
        />
      </section>

      <section aria-labelledby="s4">
        <h2 id="s4">
          <span className="n">4</span> {s.step4}
        </h2>
        <p>{s.step4Body}</p>
        <Slider
          className="slider"
          label={s.budget}
          min={500}
          max={10000}
          step={250}
          value={budget}
          onChange={setBudget}
          locale={locale}
          formatOptions={{ style: "currency", currency: "USD", maximumFractionDigits: 0 }}
        />
      </section>

      <section aria-labelledby="s5">
        <h2 id="s5">
          <span className="n">5</span> {s.step5}
        </h2>
        <p>{s.step5Body}</p>
        <div className="fields">
          <PhoneField key={`p-${lang}`} className="field" label={s.phone} hint={s.phoneHint} countryCode="+90" invalidMessage={s.phoneError} onPhoneChange={setPhone} placeholder="+90 5xx xxx xx xx" />
          <NumberField key={`a-${lang}`} className="field short" label={s.age} locale={locale} minValue={1} maxValue={120} invalidMessage={s.ageError} />
        </div>
      </section>

      <section aria-labelledby="sum" className="summary">
        <h2 id="sum">{s.summary}</h2>
        <dl>
          <dt>{s.step1}</dt>
          <dd>{treatment ? treatment[lang] : s.none}</dd>
          <dt>{s.step2}</dt>
          <dd>{date ? fmtDate(date) : s.none}</dd>
          <dt>{s.step3}</dt>
          <dd>
            {slot ? (
              <>
                {formatSlot(slot.date, locale, zone)} · {s.stores} <code dir="ltr">{slot.iso}</code>
              </>
            ) : (
              s.none
            )}
          </dd>
          <dt>{s.step4}</dt>
          <dd>{new Intl.NumberFormat(locale, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(budget)}</dd>
          <dt>{s.phone}</dt>
          <dd>{phone?.valid ? <code dir="ltr">{phone.e164}</code> : s.none}</dd>
        </dl>
      </section>

      <footer>
        <a href="https://github.com/awabadam/rtl-primitives">GitHub</a> · <a href="https://www.awab.design">{s.footer}</a>
      </footer>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
