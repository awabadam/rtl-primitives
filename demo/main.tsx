import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Combobox, TimeSlotPicker, formatSlot, type Slot } from "../src";
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
    title: "rtl-primitives",
    lead: "Unstyled, accessible React components that work the same in Arabic and English. Every one follows the WAI-ARIA pattern and is tested with axe.",
    cbxTitle: "Combobox with Arabic-aware search",
    cbxBody: "Type without diacritics or hamza. Searching “زراعه” still finds “زِراعَة”. Up and Down move through options, Enter picks one, Escape closes the list.",
    cbxLabel: "Treatment",
    cbxEmpty: "No matching treatment",
    picked: "Selected",
    slotTitle: "Time-slot picker that respects time zones",
    slotBody: "The clinic works 09:00–13:00 Istanbul time. Times are shown in the visitor's zone, with daylight-saving gaps skipped. Arrow keys follow reading direction, so in Arabic ← moves forward.",
    zone: "Show times in",
    gridLabel: "Available times on 18 November 2026",
    none: "Nothing selected",
    stores: "Stored as",
    footer: "Built by Awab Elkhalil",
  },
  ar: {
    switch: "English",
    title: "rtl-primitives",
    lead: "مكوّنات React مجرّدة من التنسيق، سهلة الوصول، تعمل بالعربية كما تعمل بالإنجليزية. كل مكوّن يتّبع نمط WAI-ARIA ومختبَر بأداة axe.",
    cbxTitle: "قائمة اختيار مع بحث يفهم العربية",
    cbxBody: "اكتب بلا تشكيل ولا همزات: البحث عن «زراعه» يجد «زِراعَة». الأسهم للأعلى والأسفل تتنقّل بين الخيارات، و Enter للاختيار، و Escape للإغلاق.",
    cbxLabel: "العلاج",
    cbxEmpty: "لا يوجد علاج مطابق",
    picked: "الاختيار",
    slotTitle: "اختيار موعد يحترم المناطق الزمنية",
    slotBody: "تعمل العيادة من ٩ إلى ١ ظهرًا بتوقيت إسطنبول. تظهر المواعيد بتوقيت الزائر مع تخطّي فجوات التوقيت الصيفي. الأسهم تتبع اتجاه القراءة، فالسهم ← يتقدّم في العربية.",
    zone: "عرض المواعيد بتوقيت",
    gridLabel: "المواعيد المتاحة يوم ١٨ نوفمبر ٢٠٢٦",
    none: "لم يتم الاختيار",
    stores: "يُحفظ بصيغة",
    footer: "من تصميم وتطوير أواب الخليل",
  },
} as const;

function App() {
  const [lang, setLang] = useState<Lang>("en");
  const [treatment, setTreatment] = useState<(typeof treatments)[number] | null>(null);
  const [zone, setZone] = useState("Asia/Dubai");
  const [slot, setSlot] = useState<Slot | null>(null);
  const s = t[lang];
  const locale = lang === "ar" ? "ar-EG" : "en-GB";

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  return (
    <main>
      <header>
        <h1>{s.title}</h1>
        <button type="button" className="lang" onClick={() => setLang(lang === "en" ? "ar" : "en")} lang={lang === "en" ? "ar" : "en"}>
          {s.switch}
        </button>
      </header>
      <p className="lead">{s.lead}</p>

      <section aria-labelledby="cbx-title">
        <h2 id="cbx-title">{s.cbxTitle}</h2>
        <p>{s.cbxBody}</p>
        <Combobox
          key={lang}
          className="cbx"
          label={s.cbxLabel}
          items={treatments}
          getLabel={(x) => x[lang]}
          onSelect={setTreatment}
          emptyMessage={s.cbxEmpty}
        />
        <p className="out">
          {s.picked}: <strong>{treatment ? treatment[lang] : s.none}</strong>
        </p>
      </section>

      <section aria-labelledby="slot-title">
        <h2 id="slot-title">{s.slotTitle}</h2>
        <p>{s.slotBody}</p>
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
          label={s.gridLabel}
          date="2026-11-18"
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
        <p className="out">
          {s.picked}: <strong>{slot ? formatSlot(slot.date, locale, zone, { weekday: "long", hour: "numeric", minute: "2-digit" }) : s.none}</strong>
          {slot ? (
            <>
              {" · "}
              {s.stores} <code dir="ltr">{slot.iso}</code>
            </>
          ) : null}
        </p>
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
