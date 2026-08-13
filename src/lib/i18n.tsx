import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "ta";

const dict = {
  appName: { en: "AgroHealthy AI", ta: "அக்ரோஹெல்தி AI" },
  tagline: {
    en: "Your intelligent digital companion for a healthier farm.",
    ta: "உங்கள் வயலின் ஆரோக்கியத்திற்கான புத்திசாலி டிஜிட்டல் துணை.",
  },
  subtitle: {
    en: "Monitor your farm using GPS, satellite NDVI, weather intelligence and AI crop-health analysis.",
    ta: "GPS, செயற்கைக்கோள் NDVI, வானிலை தகவல் மற்றும் AI பயிர் ஆரோக்கிய ஆய்வு மூலம் உங்கள் வயலை கண்காணியுங்கள்.",
  },
  registerFarm: { en: "Register My Farm", ta: "என் வயலை பதிவு செய்" },
  scanCrop: { en: "Scan My Crop", ta: "என் பயிரை ஸ்கேன் செய்" },
  home: { en: "Home", ta: "முகப்பு" },
  myFarm: { en: "My Farm", ta: "என் வயல்" },
  ndvi: { en: "NDVI", ta: "NDVI" },
  cropDoctor: { en: "Crop Doctor", ta: "பயிர் மருத்துவர்" },
  weather: { en: "Weather", ta: "வானிலை" },
  alerts: { en: "Alerts", ta: "எச்சரிக்கைகள்" },
  history: { en: "History", ta: "வரலாறு" },
  expert: { en: "Expert", ta: "நிபுணர்" },
  signIn: { en: "Sign in", ta: "உள்நுழை" },
  signUp: { en: "Create account", ta: "கணக்கு உருவாக்கு" },
  signOut: { en: "Sign out", ta: "வெளியேறு" },
  email: { en: "Email", ta: "மின்னஞ்சல்" },
  password: { en: "Password", ta: "கடவுச்சொல்" },
  name: { en: "Name", ta: "பெயர்" },
  mobile: { en: "Mobile number", ta: "கைபேசி எண்" },
  language: { en: "Preferred language", ta: "விருப்ப மொழி" },
  district: { en: "District", ta: "மாவட்டம்" },
  crop: { en: "Crop", ta: "பயிர்" },
  cropVariety: { en: "Crop variety", ta: "பயிர் ரகம்" },
  sowingDate: { en: "Sowing date", ta: "விதைத்த தேதி" },
  farmName: { en: "Farm name", ta: "வயல் பெயர்" },
  useMyLocation: { en: "Use My Current Location", ta: "என் தற்போதைய இடத்தை பயன்படுத்து" },
  confirmLocation: { en: "Confirm this location", ta: "இந்த இடத்தை உறுதிசெய்" },
  drawBoundary: { en: "Draw your farm boundary", ta: "உங்கள் வயல் எல்லையை வரையவும்" },
  saveFarm: { en: "Save farm boundary", ta: "வயல் எல்லையை சேமி" },
  farmArea: { en: "Farm area", ta: "வயல் பரப்பு" },
  hectares: { en: "hectares", ta: "ஹெக்டேர்" },
  farmHealth: { en: "Farm health", ta: "வயல் ஆரோக்கியம்" },
  good: { en: "Good", ta: "நல்லது" },
  watch: { en: "Watch", ta: "கவனிக்கவும்" },
  atRisk: { en: "At Risk", ta: "ஆபத்தில்" },
  latestNdvi: { en: "Latest NDVI", ta: "சமீபத்திய NDVI" },
  ndviTrend: { en: "NDVI trend", ta: "NDVI போக்கு" },
  improving: { en: "Improving", ta: "மேம்படுகிறது" },
  stable: { en: "Stable", ta: "நிலையாக உள்ளது" },
  declining: { en: "Declining", ta: "குறைந்து வருகிறது" },
  refreshSatellite: { en: "Refresh Satellite Data", ta: "செயற்கைக்கோள் தரவை புதுப்பி" },
  ndviUnavailable: { en: "NDVI data temporarily unavailable.", ta: "NDVI தரவு தற்போது கிடைக்கவில்லை." },
  satelliteUnavailable: { en: "Satellite data unavailable", ta: "செயற்கைக்கோள் தரவு கிடைக்கவில்லை" },
  ndviExplain: {
    en: "NDVI measures vegetation greenness using satellite imagery. It can help identify changes in crop vegetation but does not by itself diagnose disease.",
    ta: "NDVI என்பது செயற்கைக்கோள் படங்களைப் பயன்படுத்தி பயிரின் பசுமையை அளக்கிறது. இது பயிர் மாற்றங்களை அறிய உதவும், ஆனால் நோயை உறுதிப்படுத்தாது.",
  },
  ndviCaveat: {
    en: "A low vegetation index may indicate crop stress caused by disease, water stress, nutrient problems, harvesting, bare soil, cloud contamination or other factors.",
    ta: "குறைந்த NDVI என்பது நோய், நீர் பற்றாக்குறை, ஊட்டச்சத்து குறைபாடு, அறுவடை, வெற்று மண் அல்லது மேக மறைப்பு போன்ற காரணங்களால் ஏற்படலாம்.",
  },
  veryLow: { en: "Very low vegetation", ta: "மிகக் குறைந்த பசுமை" },
  low: { en: "Low", ta: "குறைவு" },
  moderate: { en: "Moderate", ta: "நடுத்தரம்" },
  healthy: { en: "Healthy", ta: "ஆரோக்கியம்" },
  veryHealthy: { en: "Very healthy", ta: "மிக ஆரோக்கியம்" },
  uploadLeaf: { en: "Upload or take a leaf photo", ta: "இலை புகைப்படத்தை பதிவேற்று" },
  analyze: { en: "Analyse crop", ta: "பயிரை ஆய்வு செய்" },
  confidence: { en: "Confidence", ta: "நம்பகத்தன்மை" },
  severity: { en: "Severity", ta: "தீவிரம்" },
  symptoms: { en: "Symptoms detected", ta: "கண்டறியப்பட்ட அறிகுறிகள்" },
  altCauses: { en: "Possible alternative causes", ta: "மற்ற சாத்தியமான காரணங்கள்" },
  nextSteps: { en: "Recommended next steps", ta: "அடுத்த படிகள்" },
  lowConfidence: {
    en: "Unable to confidently identify the problem. Please upload a clearer image or consult an agricultural expert.",
    ta: "பிரச்சனையை உறுதியாக கண்டறிய முடியவில்லை. தெளிவான படத்தை பதிவேற்றவும் அல்லது வேளாண் நிபுணரை அணுகவும்.",
  },
  voiceAssistant: { en: "Voice assistant", ta: "குரல் உதவியாளர்" },
  ask: { en: "Ask", ta: "கேள்" },
  listen: { en: "Speak", ta: "பேசு" },
  noFarmYet: { en: "You have not registered a farm yet.", ta: "நீங்கள் இன்னும் வயலை பதிவு செய்யவில்லை." },
  demoData: { en: "DEMO DATA — NOT REAL SATELLITE OBSERVATION", ta: "டெமோ தரவு — உண்மையான செயற்கைக்கோள் அவதானிப்பு அல்ல" },
  smsAlerts: { en: "SMS alerts", ta: "SMS எச்சரிக்கைகள்" },
  sendTestSms: { en: "Send alert by SMS", ta: "SMS மூலம் எச்சரிக்கை அனுப்பு" },
  captureCropImage: { en: "Capture Crop Image", ta: "பயிர் படத்தை எடு" },
  openCamera: { en: "Open camera", ta: "கேமராவை திற" },
  retake: { en: "Retake photo", ta: "மீண்டும் எடு" },
  switchCamera: { en: "Switch camera", ta: "கேமராவை மாற்று" },
  chooseFromGallery: { en: "Choose from gallery instead", ta: "கேலரியிலிருந்து தேர்ந்தெடு" },
  cameraPermission: {
    en: "Camera permission is needed to take a crop photo. Please allow camera access, or choose a photo from your gallery.",
    ta: "பயிர் படம் எடுக்க கேமரா அனுமதி தேவை. கேமரா அணுகலை அனுமதிக்கவும் அல்லது கேலரியிலிருந்து படத்தை தேர்ந்தெடுக்கவும்.",
  },
  soilInformation: { en: "Soil information", ta: "மண் தகவல்" },
  soilType: { en: "Soil type", ta: "மண் வகை" },
  soilMoisture: { en: "Soil moisture", ta: "மண் ஈரப்பதம்" },
  airHumidity: { en: "Air humidity", ta: "காற்று ஈரப்பதம்" },
  soilPh: { en: "Soil pH", ta: "மண் pH" },
  dataSource: { en: "Source", ta: "தரவு ஆதாரம்" },
  dry: { en: "Dry", ta: "வறண்டது" },
  normalMoisture: { en: "Normal", ta: "சாதாரணம்" },
  wet: { en: "Wet", ta: "ஈரம்" },
  soilUnavailable: { en: "Soil data unavailable for this location.", ta: "இந்த இடத்திற்கு மண் தரவு கிடைக்கவில்லை." },
  moistureUnavailable: { en: "Real-time soil moisture unavailable.", ta: "நேரடி மண் ஈரப்பத தரவு கிடைக்கவில்லை." },
  enterManually: { en: "Enter manually", ta: "கைமுறையாக உள்ளிடு" },
  save: { en: "Save", ta: "சேமி" },
  soilEstimateNote: {
    en: "Soil type is estimated from your farm's location using global soil maps. It is not a laboratory soil test.",
    ta: "மண் வகை உங்கள் வயலின் இருப்பிடத்திலிருந்து உலகளாவிய மண் வரைபடங்கள் மூலம் மதிப்பிடப்பட்டது. இது ஆய்வக சோதனை அல்ல.",
  },
  lowCostActions: { en: "Low-cost actions first", ta: "முதலில் குறைந்த செலவு நடவடிக்கைகள்" },
  noCost: { en: "No cost", ta: "செலவு இல்லை" },
} as const;


export type TKey = keyof typeof dict;

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: TKey) => string }>({
  lang: "en",
  setLang: () => {},
  t: (k) => dict[k].en,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = window.localStorage.getItem("agro_lang");
    if (saved === "ta" || saved === "en") setLangState(saved);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    window.localStorage.setItem("agro_lang", l);
  }, []);

  const t = useCallback((k: TKey) => dict[k][lang] ?? dict[k].en, [lang]);

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  return useContext(Ctx);
}
