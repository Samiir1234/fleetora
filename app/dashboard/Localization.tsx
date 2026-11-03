"use client";

import { useEffect } from "react";

const translations: Record<string, string> = {
  "WORKSPACE": "SHAQADA",
  "FINANCE & OPERATIONS": "MAALIYADDA IYO HAWLGALLADA",
  "ADMINISTRATION": "MAAMULKA",
  "Overview": "Dulmar",
  "Fleet Management": "Maamulka gaadiidka",
  "Bookings": "Boos-celinnada",
  "Live Tracking": "Raadraaca tooska ah",
  "Customers": "Macaamiisha",
  "Contracts & Notary": "Qandaraasyada iyo nootaayada",
  "Payments": "Lacag-bixinta",
  "Payments & Expenses": "Lacag-bixinta iyo kharashaadka",
  "Expenses": "Kharashaadka",
  "Inspections": "Kormeerka",
  "Maintenance": "Dayactirka",
  "Reports": "Warbixinnada",
  "Reports & Analytics": "Warbixinnada iyo falanqaynta",
  "Notifications": "Ogeysiisyada",
  "Users & Roles": "Isticmaalayaasha iyo doorarka",
  "Settings": "Dejinta",
  "Logout": "Ka bax",
  "Sign out": "Ka bax",
  "Need help?": "Caawimo ma u baahan tahay?",
  "Visit help center": "Booqo xarunta caawinta",
  "Administrator": "Maamule",
  "Search anything...": "Raadi wax kasta...",
  "Search notifications...": "Raadi ogeysiisyada...",
  "Search reports...": "Raadi warbixinnada...",
  "Search settings...": "Raadi dejinta...",
  "Search payments...": "Raadi lacag-bixinnada...",
  "Search expenses...": "Raadi kharashaadka...",
  "Search inspections...": "Raadi kormeerka...",
  "Search maintenance...": "Raadi dayactirka...",
  "Search records...": "Raadi diiwaannada...",
  "Add": "Ku dar",
  "add": "ku dar",
  "vehicle": "gaari",
  "booking": "boos-celin",
  "customer": "macmiil",
  "payment": "lacag-bixin",
  "expense": "kharash",
  "inspection": "kormeer",
  "maintenance": "dayactir",
  "notary": "nootaayo",
  "contact": "xiriir",
  "records": "diiwaanno",
  "Service": "Adeeg",
  "Collected this month": "Lacagta la ururiyey bishan",
  "Collected this week": "Lacagta la ururiyey toddobaadkan",
  "Total collected": "Wadarta lacagta la ururiyey",
  "TRANSACTION": "MACAAMIL",
  "EXPENSE": "KHARASH",
  "INSPECTION": "KORMEER",
  "BOOKING": "BOOS-CELIN",
  "SERVICE": "ADEEG",
  "CONTRACT": "HESHIIS",
  "NOTIFICATION": "OGEYSIIS",
  "Live GPS tracking": "Raadraaca tooska ah ee GPS",
  "Manage devices": "Maamul qalabka",
  "Moving": "Socda",
  "Offline": "Khadka ka maqan",
  "View route history": "Eeg taariikhda jidka",
  "Schedule service": "Jadwal u samee adeegga",
  "Print / PDF": "Daabac / PDF",
  "Export report (.doc)": "U dhoofi warbixinta (.doc)",
  "Auto-Compile Now": "Hadda si toos ah u diyaari",
  "Automated Executive Intelligence Summary": "Soo koobid otomaatig ah oo fulineed",
  "Revenue and operating expenses": "Dakhliga iyo kharashaadka hawlgalka",
  "Permissions Matrix": "Jadwalka oggolaanshaha",
  "Add Team Member": "Ku dar xubin kooxda",
  "All (8)": "Dhammaan (8)",
  "Admins (2)": "Maamulayaasha (2)",
  "Ops (2)": "Hawl-wadeennada (2)",
  "Company Profile": "Macluumaadka shirkadda",
  "Company profile": "Macluumaadka shirkadda",
  "Localization & Currency": "Luqadda iyo lacagta",
  "SMS & Notifications": "SMS iyo ogeysiisyada",
  "Notary directory (0)": "Liiska nootaayada (0)",
  "Live tracking": "Raadraaca tooska ah",
  "System overview": "Dulmarka nidaamka",
  "Fleet status": "Xaaladda gaadiidka",
  "Open bookings": "Boos-celinnada furan",
  "Completed bookings": "Boos-celinnada la dhammaystiray",
  "Payment records": "Diiwaannada lacag-bixinta",
  "Expense records": "Diiwaannada kharashaadka",
  "No results found": "Natiijooyin lama helin",
  "No results found.": "Natiijooyin lama helin.",
  "Create new": "Abuur cusub",
  "Create": "Abuur",
  "Save": "Kaydi",
  "Save changes": "Kaydi isbeddellada",
  "Cancel": "Jooji",
  "Delete": "Tirtir",
  "Edit": "Wax ka beddel",
  "View": "Eeg",
  "Export": "Dhoofin",
  "Export Word": "U dhoofi Word",
  "Filters": "Shaandheeyeyaasha",
  "Filter": "Shaandhee",
  "Clear filters": "Nadiifi shaandheeyeyaasha",
  "All statuses": "Dhammaan xaaladaha",
  "All categories": "Dhammaan qaybaha",
  "All priorities": "Dhammaan mudnaanta",
  "All branches": "Dhammaan laamaha",
  "Status": "Xaalad",
  "Category": "Qayb",
  "Priority": "Mudnaan",
  "Branch": "Laan",
  "Date": "Taariikh",
  "Actions": "Falalka",
  "Action": "Ficil",
  "Details": "Faahfaahin",
  "Description": "Sharaxaad",
  "Amount": "Qaddar",
  "Total": "Wadar",
  "Paid revenue": "Dakhliga la bixiyey",
  "Needs attention": "U baahan fiiro gaar ah",
  "Open maintenance": "Dayactir socda",
  "Expenses & operations": "Kharashaadka iyo hawlgallada",
  "Pickup & return": "Qaadashada iyo soo celinta",
  "Fleet overview": "Dulmarka gaadiidka",
  "System summary": "Soo koobidda nidaamka",
  "System sections": "Qaybaha nidaamka",
  "Recent activity": "Hawlihii u dambeeyey",
  "This month": "Bishan",
  "This week": "Toddobaadkan",
  "Today": "Maanta",
  "This year": "Sannadkan",
  "All time": "Waqti kasta",
  "Saved records": "Diiwaanno la kaydiyey",
  "Synced to your account": "Waxaa lala waafajiyey akoonkaaga",
  "Current records": "Diiwaannada hadda jira",
  "Updated just now": "Hadda la cusboonaysiiyey",
  "Total records": "Wadarta diiwaannada",
  "Total payments": "Wadarta lacag-bixinnada",
  "Total expenses": "Wadarta kharashaadka",
  "Total revenue": "Wadarta dakhliga",
  "Amount paid": "Qaddarka la bixiyey",
  "Outstanding balance": "Hadhaaga aan la bixin",
  "Payment status": "Xaaladda lacag-bixinta",
  "Expense status": "Xaaladda kharashka",
  "Search anything": "Raadi wax kasta",
  "Add new": "Ku dar cusub",
  "Create new payment": "Abuur lacag-bixin cusub",
  "Create new expense": "Abuur kharash cusub",
  "Create new inspection": "Abuur kormeer cusub",
  "Create new maintenance": "Abuur dayactir cusub",
  "Create new booking": "Abuur boos-celin cusub",
  "Create new customer": "Abuur macmiil cusub",
  "Create new vehicle": "Abuur gaari cusub",
  "Search payments and expenses": "Raadi lacag-bixinnada iyo kharashaadka",
  "No saved activity yet.": "Weli ma jiraan hawlo la kaydiyey.",
  "Select status": "Dooro xaalad",
  "Select category": "Dooro qayb",
  "Select priority": "Dooro mudnaan",
  "All types": "Dhammaan noocyada",
  "All dates": "Dhammaan taariikhaha",
  "All vehicles": "Dhammaan gaadiidka",
  "All customers": "Dhammaan macaamiisha",
  "From date": "Laga bilaabo taariikhda",
  "To date": "Ilaa taariikhda",
  "Start date": "Taariikhda bilowga",
  "End date": "Taariikhda dhammaadka",
  "Pickup date": "Taariikhda qaadashada",
  "Return date": "Taariikhda soo celinta",
  "Transaction ID": "Lambarka macaamilka",
  "Booking reference": "Tixraaca boos-celinta",
  "Vehicle name": "Magaca gaariga",
  "Registration number": "Lambarka diiwaangelinta",
  "Customer name": "Magaca macmiilka",
  "Document type": "Nooca dukumentiga",
  "Service type": "Nooca adeegga",
  "Appointment date": "Taariikhda ballanta",
  "Appointment time": "Waqtiga ballanta",
  "Expected completion": "Waqtiga la filayo in la dhammaystiro",
  "Document title": "Cinwaanka dukumentiga",
  "Notary name": "Magaca nootaayada",
  "Assigned notary": "Nootaayada loo xilsaaray",
  "Add supporting document": "Ku dar dukumenti taageero ah",
  "Upload document": "Soo geli dukumenti",
  "Preview": "Hor-u-eeg",
  "Print": "Daabac",
  "Download": "Soo dejiso",
  "Refresh": "Cusboonaysii",
  "Reset filters": "Dib u deji shaandheeyeyaasha",
  "Apply filters": "Adeegso shaandheeyeyaasha",
  "Clear all": "Dhammaan nadiifi",
  "All records": "Dhammaan diiwaannada",
  "Per page": "Bog kasta",
  "Showing": "Muujinaya",
  "of": "ka mid ah",
  "Previous": "Hore",
  "Next": "Xiga",
  "First": "Ugu horreeya",
  "Last": "Ugu dambeeya",
  "Confirm": "Xaqiiji",
  "Save settings": "Kaydi dejinta",
  "Company name": "Magaca shirkadda",
  "License number": "Lambarka ruqsadda",
  "Support email": "Iimaylka taageerada",
  "Head office": "Xarunta dhexe",
  "Security deposit": "Dammaanadda amniga",
  "Grace period": "Muddada dulqaadka",
  "Fuel policy": "Siyaasadda shidaalka",
  "Minimum age": "Da'da ugu yar",
  "Email notifications": "Ogeysiisyada iimaylka",
  "Booking notifications": "Ogeysiisyada boos-celinta",
  "System language": "Luqadda nidaamka",
  "Currency": "Lacagta",
  "Date format": "Qaabka taariikhda",
  "Policies": "Siyaasadaha",
  "Localization": "Dejinta luqadda",
  "Alerts": "Digniinaha",
  "Data": "Xogta",
  "No notifications found": "Ogeysiisyo lama helin",
  "Automatic system notification dispatcher is active · Monitoring fleet, bookings, contracts, GPS and finance triggers · Alerts are automatically pushed live": "Nidaamka ogeysiisyada tooska ah waa shaqaynayaa · Wuxuu la socdaa gaadiidka, boos-celinnada, qandaraasyada, GPS-ka iyo maaliyadda · Digniinaha si toos ah ayaa loo soo bandhigaa",
  "Add an internal notification to the system feed.": "Ku dar ogeysiis gudaha ah liiska nidaamka.",
  "Notification title": "Cinwaanka ogeysiiska",
  "Stay ahead of real-time fleet, bookings & financial operations": "La soco gaadiidka, boos-celinnada iyo hawlgallada maaliyadeed",
  "Default Ledger Currency": "Lacagta caadiga ah ee xisaabaadka",
  "Date Notation": "Qaabka taariikhda",
  "Review and manage rental activity.": "Dib u eeg oo maamul hawlaha kirada.",
  "View and manage all records.": "Eeg oo maamul dhammaan diiwaannada.",
  "Page": "Bog",
  "of pages": "bog",
  "Quick actions": "Falal degdeg ah",
  "More options": "Ikhtiyaarro dheeraad ah",
  "Open menu": "Fur liiska",
  "Close": "Xir",
  "Back": "Dib u noqo",
  "Help": "Caawimo",
  "Language": "Luqad",
  "English (United States)": "Ingiriisi (Maraykanka)",
  "Somali (Af-Soomaali)": "Af-Soomaali",
  "Reference": "Tixraac",
  "Customer": "Macmiil",
  "Vehicle": "Gaari",
  "Name": "Magac",
  "Full name": "Magaca oo buuxa",
  "Phone": "Telefoon",
  "Phone number": "Lambarka telefoonka",
  "Email": "Iimayl",
  "Email address": "Cinwaanka iimaylka",
  "City": "Magaalo",
  "Location": "Goob",
  "Type": "Nooc",
  "Payment date": "Taariikhda lacag-bixinta",
  "Due date": "Taariikhda kama dambaysta ah",
  "Vendor": "Iibiye",
  "Expense category": "Qaybta kharashka",
  "Inspection type": "Nooca kormeerka",
  "Scheduled date": "Taariikhda jadwalaysan",
  "Mileage": "Masaafada",
  "Fuel level": "Heerka shidaalka",
  "Notes": "Qoraallo",
  "Additional notes": "Qoraallo dheeraad ah",
  "Title": "Cinwaan",
  "Search": "Raadi",
  "Loading...": "Waa la soo rarayaa...",
  "Loading section…": "Qaybta waa la soo rarayaa…",
  "No records found.": "Diiwaanno lama helin.",
  "No records found. Add one or adjust your search and filters.": "Diiwaanno lama helin. Ku dar mid cusub ama beddel raadinta iyo shaandheeyeyaasha.",
  "No notifications match your search or filters. New activity from connected sections will appear here automatically.": "Ogeysiisyo ku habboon raadinta ama shaandheeyeyaasha lama helin. Hawlaha cusub ee qaybaha isku xiran halkan ayay si toos ah uga muuqan doonaan.",
  "No saved activity is available yet.": "Weli ma jiraan hawlo la kaydiyey.",
  "Paid": "La bixiyey",
  "Pending": "Sugaya",
  "Approved": "La ansixiyey",
  "Review": "Dib-u-eegis",
  "Under Review": "Dib-u-eegis ku jira",
  "Rejected": "La diiday",
  "Completed": "La dhammaystiray",
  "Cancelled": "La joojiyey",
  "Active": "Firfircoon",
  "Inactive": "Aan firfircoonayn",
  "Available": "Diyaar",
  "Rented": "La kiraystay",
  "Confirmed": "La xaqiijiyey",
  "Unread": "Aan la akhrin",
  "Read": "La akhriyey",
  "Resolved": "La xalliyey",
  "High": "Sare",
  "Normal": "Caadi",
  "Low": "Hoose",
  "Create new notary contact": "Abuur xiriir nootaayo cusub",
  "Create new notary contact & booking": "Abuur xiriir nootaayo iyo boos-celin cusub",
  "Add vehicle": "Ku dar gaari",
  "Add booking": "Ku dar boos-celin",
  "Add customer": "Ku dar macmiil",
  "Add expense": "Ku dar kharash",
  "Add payment": "Ku dar lacag-bixin",
  "Add inspection": "Ku dar kormeer",
  "Add maintenance": "Ku dar dayactir",
  "Mark all read": "Dhammaan u calaamadee la akhriyey",
  "View reports": "Eeg warbixinnada",
  "Recent payments": "Lacag-bixinnadii u dambeeyey",
  "Recent expenses": "Kharashaadkii u dambeeyey",
  "Recent inspections": "Kormeeradii u dambeeyey",
  "Recent maintenance": "Dayactirradii u dambeeyey",
  "Save Localization": "Kaydi dejinta luqadda",
  "General Settings": "Dejinta guud",
  "Rental Policies": "Siyaasadaha kirada",
  "Somali": "Af-Soomaali",
  "English": "Ingiriisi",
  "Your workspace records are securely synced to Supabase.": "Xogta workspace-kaaga si ammaan ah ayaa loogu kaydiyaa Supabase.",
  "Your rental operations at a glance": "Halkaan ka eeg hawlaha kiradaada",
  "Track every transaction, balance and operating cost": "La soco macaamil kasta, hadhaaga iyo kharashka hawlgalka",
  "Manage vehicles and their availability.": "Maamul gaadiidka iyo helitaankooda.",
  "Create and track rental reservations.": "Abuur oo la soco boos-celinnada kirada.",
  "Keep customer contact details together.": "Isku kaydi faahfaahinta xiriirka macaamiisha.",
  "Generate, review and deliver rental agreements": "Diyaari, dib u eeg oo gudbi heshiisyada kirada",
  "Track operating costs, vendors and approvals": "La soco kharashaadka hawlgalka, iibiyeyaasha iyo ansixinnada",
  "Document condition, mileage, fuel and damages": "Diiwaangeli xaaladda, masaafada, shidaalka iyo waxyeellada",
  "Stay informed about your fleet and operations.": "La soco xaaladda gaadiidkaaga iyo hawlgallada.",
  "No saved records yet.": "Weli ma jiraan diiwaanno la kaydiyey.",
  "Add a record": "Ku dar diiwaan",
  "All": "Dhammaan",
};

const originalText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();
const normalizedTranslations = new Map(Object.entries(translations).map(([source, translated]) => [source.toLowerCase(), translated]));

function getTranslation(source: string) {
  const exact = translations[source];
  if (exact) return exact;
  const translated = normalizedTranslations.get(source.toLowerCase());
  if (translated && source === source.toUpperCase()) return translated.toLocaleUpperCase("so");
  return translated;
}

function translatedText(source: string) {
  const translated = getTranslation(source.trim());
  if (!translated) return undefined;
  const leading = source.match(/^\s*/)?.[0] ?? "";
  const trailing = source.match(/\s*$/)?.[0] ?? "";
  return `${leading}${translated}${trailing}`;
}

function localizeText(text: Text, language: string) {
  let original = originalText.get(text);
  const priorTranslation = original === undefined ? undefined : translatedText(original);
  if (original === undefined || (text.data !== original && text.data !== priorTranslation)) {
    original = text.data;
    originalText.set(text, original);
  }
  if (language === "en") {
    if (text.data !== original) text.data = original;
    return;
  }

  const localized = translatedText(original);
  if (localized && text.data !== localized) text.data = localized;
}

function localizeAttribute(element: Element, attribute: string, language: string) {
  const value = element.getAttribute(attribute);
  if (value === null) return;
  let originals = originalAttributes.get(element);
  if (!originals) {
    originals = new Map();
    originalAttributes.set(element, originals);
  }
  let original = originals.get(attribute);
  const priorTranslation = original === undefined ? undefined : getTranslation(original.trim());
  if (original === undefined || (value !== original && value !== priorTranslation)) {
    original = value;
    originals.set(attribute, original);
  }
  const translated = language === "so" ? getTranslation(original.trim()) : undefined;
  if (translated && value !== translated) {
    element.setAttribute(attribute, translated);
  } else if (language === "en" && value !== original) {
    element.setAttribute(attribute, original);
  }
}

function localizeSubtree(root: Node, language: string) {
  if (root.nodeType === Node.TEXT_NODE) {
    localizeText(root as Text, language);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
  const elementRoot = root.nodeType === Node.ELEMENT_NODE ? root as Element : document.documentElement;
  const localizeElementAttributes = (element: Element) => {
    for (const attribute of ["placeholder", "aria-label", "title"]) {
      localizeAttribute(element, attribute, language);
    }
  };
  if (elementRoot instanceof HTMLElement || elementRoot instanceof SVGElement) localizeElementAttributes(elementRoot);
  const elementWalker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let currentElement: Node | null;
  while ((currentElement = elementWalker.nextNode())) localizeElementAttributes(currentElement as Element);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let text: Node | null;
  while ((text = walker.nextNode())) localizeText(text as Text, language);
}

export default function Localization() {
  useEffect(() => {
    let language = "en";
    try {
      language = localStorage.getItem("fleetora-language") === "so" ? "so" : "en";
    } catch (error) {
      console.error("Could not read the saved language preference.", error);
    }
    document.documentElement.lang = language;

    const localize = () => {
      document.documentElement.lang = language;
      localizeSubtree(document, language);
    };

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData" && mutation.target instanceof Text) {
          localizeText(mutation.target, language);
        } else if (mutation.type === "attributes" && mutation.target instanceof Element && mutation.attributeName) {
          localizeAttribute(mutation.target, mutation.attributeName, language);
        } else {
          mutation.addedNodes.forEach((node) => localizeSubtree(node, language));
        }
      }
    });

    const updateLanguage = (event: Event) => {
      let selected: unknown;
      if (event instanceof CustomEvent) {
        selected = event.detail;
      } else {
        try {
          selected = localStorage.getItem("fleetora-language");
        } catch (error) {
          console.error("Could not read the saved language preference.", error);
          return;
        }
      }
      language = selected === "so" ? "so" : "en";
      localize();
    };

    localize();
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["placeholder", "aria-label", "title"],
    });
    window.addEventListener("fleetora-language-changed", updateLanguage);
    window.addEventListener("storage", updateLanguage);
    return () => {
      observer.disconnect();
      window.removeEventListener("fleetora-language-changed", updateLanguage);
      window.removeEventListener("storage", updateLanguage);
    };
  }, []);

  return null;
}
