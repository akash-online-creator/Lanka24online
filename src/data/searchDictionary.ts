import { SearchSynonymGroup, SearchSuggestionPrompt } from '../types';
import { getSinglishExpandedKeywords } from '../utils/singlishUtils';

const SEARCH_DICTIONARY_STORAGE_KEY = 'sahaya_search_synonym_dict_v1';

export const initialSearchDictionary: SearchSynonymGroup[] = [
  // 1. Food, Rice & Essentials
  {
    id: 'syn_rice',
    canonical: 'සහල්',
    terms: ['හාල්', 'සහල්', 'rice', 'කැකුළු', 'නාඩු', 'සම්බා', 'බාස්මතී', 'කීරි සම්බා', 'සුදු කැකුළු', 'රතු කැකුළු', 'හාල් පිටි'],
    category: 'ආහාර',
    confirmedCount: 15,
  },
  {
    id: 'syn_food_meals',
    canonical: 'ආහාර',
    terms: ['කෑම', 'ආහාර', 'බත්', 'පාර්සල්', 'food', 'lunch', 'meal', 'ආහාර පාන', 'කෑම බීම', 'දිවා ආහාරය', 'උදෑසන ආහාරය', 'රාත්‍රී ආහාරය', 'කෑම පාර්සල්'],
    category: 'ආහාර',
    confirmedCount: 12,
  },
  {
    id: 'syn_flour',
    canonical: 'පිටි',
    terms: ['පිටි', 'තිරිඟු පිටි', 'හාල් පිටි', 'flour', 'wheat flour', 'rice flour', 'පාන් පිටි'],
    category: 'ආහාර',
    confirmedCount: 5,
  },
  {
    id: 'syn_sugar',
    canonical: 'සීනි',
    terms: ['සීනි', 'sugar', 'සුදු සීනි', 'දුඹුරු සීනි', 'සීනි පැකට්'],
    category: 'ආහාර',
    confirmedCount: 3,
  },
  {
    id: 'syn_milk_powder',
    canonical: 'කිරිපිටි',
    terms: ['කිරි', 'කිරිපිටි', 'milk', 'milk powder', 'නෙස්ටමෝල්ට්', 'ඇන්කර්', 'හයිලන්ඩ්', 'පැල්වත්ත'],
    category: 'ආහාර',
    confirmedCount: 8,
  },
  {
    id: 'syn_vegetables',
    canonical: 'එළවළු',
    terms: ['එළවළු', 'vegetables', 'veggies', 'අල', 'ලූනු', 'තක්කාලි', 'කැරට්', 'බෝංචි', 'මාළු මිරිස්', 'එලවලු', 'බණ්ඩක්කා'],
    category: 'ආහාර',
    confirmedCount: 6,
  },
  {
    id: 'syn_fruits',
    canonical: 'පළතුරු',
    terms: ['පළතුරු', 'fruits', 'කෙසෙල්', 'අඹ', 'පැපොල්', 'දොඩම්', 'ඇපල්', 'අන්නාසි', 'පලතුරු'],
    category: 'ආහාර',
    confirmedCount: 4,
  },
  {
    id: 'syn_fish_meat',
    canonical: 'මස් / මාළු',
    terms: ['මාළු', 'මස්', 'කුකුල් මස්', 'fish', 'meat', 'chicken', 'කරවල', 'සැමන්', 'හාල්මැස්සන්'],
    category: 'ආහාර',
    confirmedCount: 5,
  },
  {
    id: 'syn_oil_coconut',
    canonical: 'පොල්තෙල්',
    terms: ['පොල්', 'coconut', 'පොල්තෙල්', 'තෙල්', 'oil', 'cooking oil', 'පොල් ගෙඩි'],
    category: 'ආහාර',
    confirmedCount: 4,
  },
  {
    id: 'syn_bread_bakery',
    canonical: 'පාන් / බේකරි',
    terms: ['පාන්', 'bread', 'බනිස්', 'රොටී', 'බේකරි', 'bakery', 'කේක්'],
    category: 'ආහාර',
    confirmedCount: 3,
  },

  // 2. Drinking Water & Liquids
  {
    id: 'syn_water',
    canonical: 'ජලය',
    terms: ['වතුර', 'ජලය', 'water', 'බීම ජලය', 'බවුසර්', 'ජල බවුසර්', 'water bowser', 'පිරිසිදු ජලය', 'වතුර බෝතල්', 'පානීය ජලය'],
    category: 'ජලය',
    confirmedCount: 20,
  },
  {
    id: 'syn_drinks',
    canonical: 'බීම / පානීය',
    terms: ['බීම', 'සිසිල් බීම', 'ජූස්', 'juice', 'drinks', 'පානයන්', 'තැඹිලි'],
    category: 'ජලය',
    confirmedCount: 3,
  },

  // 3. Medicine, Healthcare & Emergency
  {
    id: 'syn_medicine',
    canonical: 'ඖෂධ',
    terms: ['බෙහෙත්', 'ඖෂධ', 'medicine', 'pharmacy', 'පැරසිටමෝල්', 'ප්‍රතිකාර', 'medical', 'drugs', 'ෆාමසිය', 'පෙති', 'සිරප්', 'ඉන්සියුලින්', 'ඇන්ටිජන්'],
    category: 'සෞඛ්‍ය',
    confirmedCount: 25,
  },
  {
    id: 'syn_sick_patients',
    canonical: 'රෝගී / අසනීප',
    terms: ['ලෙඩ', 'රෝගී', 'රෝග', 'අසනීප', 'sick', 'illness', 'patient', 'රෝගීන්', 'අසනීප තත්ත්ව', 'වයෝවෘද්ධ', 'ආබාධිත'],
    category: 'සෞඛ්‍ය',
    confirmedCount: 14,
  },
  {
    id: 'syn_hospital',
    canonical: 'රෝහල',
    terms: ['රෝහල', 'ඉස්පිරිතාලෙ', 'hospital', 'ඩිස්පෙන්සරිය', 'ක්ලිනික්', 'clinic', 'වෛද්‍ය මධ්‍යස්ථානය', 'මහ රෝහල', 'මූලික රෝහල'],
    category: 'සෞඛ්‍ය',
    confirmedCount: 18,
  },
  {
    id: 'syn_ambulance',
    canonical: 'ගිලන්රථය',
    terms: ['ගිලන්රථ', 'ගිලන් රථ', 'ඇම්බියුලන්ස්', 'ambulance', '1990', 'සුවසැරිය', 'සුව සැරිය', 'රෝගී ප්‍රවාහන'],
    category: 'හදිසි',
    confirmedCount: 22,
  },
  {
    id: 'syn_doctor',
    canonical: 'වෛද්‍යවරයා',
    terms: ['ඩොක්ටර්', 'වෛද්‍ය', 'දොස්තර', 'doctor', 'physician', 'දොස්තර මහතා', 'වෛද්‍යවරයා', 'ස්පෙෂලිස්ට්'],
    category: 'සෞඛ්‍ය',
    confirmedCount: 10,
  },
  {
    id: 'syn_blood',
    canonical: 'රුධිරය',
    terms: ['ලේ', 'රුධිරය', 'blood', 'blood donor', 'රුධිර පරිත්‍යාග', 'blood bank', 'ලේ බැංකුව'],
    category: 'සෞඛ්‍ය',
    confirmedCount: 16,
  },
  {
    id: 'syn_wheelchair',
    canonical: 'රෝද පුටු',
    terms: ['රෝද පුටු', 'wheelchair', 'ක්‍රචස්', 'crutches', 'ඇවිදින ආධාරක', 'වෝකර්', 'walker'],
    category: 'සෞඛ්‍ය',
    confirmedCount: 7,
  },
  {
    id: 'syn_oxygen',
    canonical: 'ඔක්සිජන්',
    terms: ['ඔක්සිජන්', 'oxygen', 'oxygen cylinder', 'සිලින්ඩර', 'ඔක්සිජන් බට'],
    category: 'සෞඛ්‍ය',
    confirmedCount: 9,
  },
  {
    id: 'syn_glasses',
    canonical: 'ඇස් කණ්ණාඩි',
    terms: ['ඇස් කණ්ණාඩි', 'කණ්ණාඩි', 'spectacles', 'glasses', 'optician', 'ඇස් පරීක්ෂාව'],
    category: 'සෞඛ්‍ය',
    confirmedCount: 4,
  },

  // 4. Housing, Rooms & Boarding
  {
    id: 'syn_house_rooms',
    canonical: 'නිවස / කාමර',
    terms: ['ගෙදර', 'නිවස', 'කාමර', 'බෝඩිම', 'house', 'home', 'room', 'boarding', 'annex', 'ඇනෙක්ස්', 'නවාතැන්', 'කුලියට'],
    category: 'නිවාස',
    confirmedCount: 18,
  },
  {
    id: 'syn_rent_lease',
    canonical: 'කුලියට / බදු',
    terms: ['කුලියට', 'රෙන්ට්', 'rent', 'බදු', 'hire', 'for rent', 'lease', 'කුලී'],
    category: 'නිවාස',
    confirmedCount: 14,
  },
  {
    id: 'syn_land_property',
    canonical: 'ඉඩම් / දේපල',
    terms: ['ඉඩම්', 'ඉඩම', 'land', 'plots', 'දේපල', 'property', 'පර්චස්', 'කුඹුරු'],
    category: 'නිවාස',
    confirmedCount: 6,
  },

  // 5. Vehicles, Transport & Taxis
  {
    id: 'syn_vehicles',
    canonical: 'වාහන',
    terms: ['වාහන', 'කාර්', 'වෑන්', 'ත්‍රීවීල්', 'ට්‍රක්', 'vehicle', 'car', 'van', 'lorry', 'truck', 'bike', 'මෝටර් බයිසිකල්'],
    category: 'ප්‍රවාහන',
    confirmedCount: 15,
  },
  {
    id: 'syn_threewheel',
    canonical: 'ත්‍රීරෝද රථ',
    terms: ['ත්‍රීවීල්', 'ත්‍රීරෝද', 'ත්‍රීවිල්', 'tuk tuk', 'threewheel', 'බජාජ්', 'tuk', 'auto', 'ත්‍රීවීලර්'],
    category: 'ප්‍රවාහන',
    confirmedCount: 19,
  },
  {
    id: 'syn_bikes',
    canonical: 'යතුරුපැදි',
    terms: ['බයික්', 'මෝටර් සයිකල්', 'යතුරුපැදි', 'bike', 'motorcycle', 'scooter', 'ස්කූටර්'],
    category: 'ප්‍රවාහන',
    confirmedCount: 8,
  },
  {
    id: 'syn_lorry_transport',
    canonical: 'ප්‍රවාහන / ලොරි',
    terms: ['ලොරි', 'ට්‍රක්', 'ඩිලිවරි', 'lorry', 'truck', 'transport', 'movers', 'ප්‍රවාහන', 'හයර්', 'ටැක්සි', 'taxi', 'cab', 'කුලී රථ', 'රියදුරු', 'driver'],
    category: 'ප්‍රවාහන',
    confirmedCount: 12,
  },

  // 6. Professional Services, Repairs & Work
  {
    id: 'syn_work_jobs',
    canonical: 'සේවා / රැකියා',
    terms: ['වැඩ', 'සේවා', 'රැකියා', 'ජොබ්', 'job', 'work', 'service', 'vacancy', 'සේවාවන්', 'රැකියා අවස්ථා'],
    category: 'සේවා',
    confirmedCount: 16,
  },
  {
    id: 'syn_mason',
    canonical: 'මේසන් / ඉදිකිරීම්',
    terms: ['මේසන්', 'බදාම', 'ගඩොල්', 'කොන්ක්‍රීට්', 'mason', 'masonry', 'ගොඩනැගිලි', 'බාස්', 'මේසන් බාස්', 'ඉදිකිරීම්'],
    category: 'සේවා',
    confirmedCount: 11,
  },
  {
    id: 'syn_carpenter',
    canonical: 'වඩු කාර්මික',
    terms: ['වඩු', 'ලී', 'ලීවැඩ', 'carpenter', 'carpentry', 'wood', 'furniture', 'ගෘහ භාණ්ඩ', 'වඩු බාස්', 'දොර ජනෙල්'],
    category: 'සේවා',
    confirmedCount: 9,
  },
  {
    id: 'syn_plumber',
    canonical: 'නල කාර්මික',
    terms: ['ප්ලම්බර්', 'නල', 'බට', 'වතුර බට', 'plumber', 'plumbing', 'pipe', 'water leak', 'කාණු', 'නල කාර්මික'],
    category: 'සේවා',
    confirmedCount: 14,
  },
  {
    id: 'syn_electrician',
    canonical: 'විදුලි කාර්මික',
    terms: ['ඉලෙක්ට්‍රික්', 'විදුලි', 'වයරින්', 'කරන්ට්', 'electrician', 'electrical', 'wiring', 'fuse', 'විදුලි කාර්මික', 'ස්විච්'],
    category: 'සේවා',
    confirmedCount: 17,
  },
  {
    id: 'syn_painter',
    canonical: 'තීන්ත ආලේප',
    terms: ['පේන්ට්', 'තීන්ත', 'painter', 'painting', 'තීන්ත ආලේප', 'පේන්ටර්'],
    category: 'සේවා',
    confirmedCount: 6,
  },
  {
    id: 'syn_welder',
    canonical: 'වෙල්ඩින් / යකඩ',
    terms: ['වෙල්ඩින්', 'යකඩ', 'welder', 'welding', 'iron work', 'ග්‍රිල්', 'grill', 'ගේට්ටු'],
    category: 'සේවා',
    confirmedCount: 7,
  },
  {
    id: 'syn_tile_bas',
    canonical: 'ටයිල් කාර්මික',
    terms: ['ටයිල්', 'ටයිල් බාස්', 'tile', 'tiling', 'flooring', 'පොළොව ගැසීම'],
    category: 'සේවා',
    confirmedCount: 5,
  },
  {
    id: 'syn_labor_helper',
    canonical: 'අත්වැඩ / ශ්‍රමය',
    terms: ['කුලී වැඩ', 'දෛනික වැටුප්', 'daily wage', 'helper', 'අත්වැඩ', 'ශ්‍රමය', 'labor', 'කුලීකරු', 'කම්කරු'],
    category: 'සේවා',
    confirmedCount: 8,
  },
  {
    id: 'syn_tailor',
    canonical: 'ඇඳුම් මැසීම',
    terms: ['ඇඳුම් මහන', 'ටේලර්', 'මහන මැෂින්', 'tailor', 'dress maker', 'stitching', 'sewing', 'මහන අය'],
    category: 'සේවා',
    confirmedCount: 6,
  },
  {
    id: 'syn_salon_barber',
    canonical: 'රූපලාවණ්‍ය / බාබර්',
    terms: ['සැලූන්', 'කොණ්ඩය', 'බාබර්', 'salon', 'barber', 'hair cut', 'beauty', 'රූපලාවණ්‍ය'],
    category: 'සේවා',
    confirmedCount: 5,
  },
  {
    id: 'syn_cleaning',
    canonical: 'පිරිසිදු කිරීම්',
    terms: ['පිරිසිදු කිරීම', 'ක්ලීනින්', 'cleaning', 'cleaner', 'housekeeping', 'වත්ත සුද්ද', 'කුණු ඉවත් කිරීම'],
    category: 'සේවා',
    confirmedCount: 9,
  },

  // 7. Education, Classes & Tuition
  {
    id: 'syn_tuition_classes',
    canonical: 'පන්ති / ටියුෂන්',
    terms: ['ගුරු', 'ටියුෂන්', 'පන්ති', 'ගුරුවරයා', 'teacher', 'tuition', 'classes', 'ගණිතය', 'විද්‍යාව', 'ඉංග්‍රීසි', 'සිංහල', 'ඕලෙවල්', 'ඒලෙවල්'],
    category: 'අධ්‍යාපන',
    confirmedCount: 16,
  },
  {
    id: 'syn_stationery_books',
    canonical: 'පොත් / ලිපිද්‍රව්‍ය',
    terms: ['පොත්', 'ලිපිද්‍රව්‍ය', 'books', 'stationery', 'අභ්‍යාස පොත්', 'පෑන්', 'පැන්සල්', 'පාසල් උපකරණ', 'school bag', 'බැග්'],
    category: 'අධ්‍යාපන',
    confirmedCount: 11,
  },
  {
    id: 'syn_childcare_daycare',
    canonical: 'ළමා සුරැකුම්',
    terms: ['ළමා රැකවරණය', 'ඩේ කෙයාර්', 'daycare', 'childcare', 'babysitter', 'නැනී', 'ළමයි බලාගැනීම', 'බබාලා'],
    category: 'සුබසාධන',
    confirmedCount: 6,
  },

  // 8. Fuel, Gas & Energy
  {
    id: 'syn_gas',
    canonical: 'ගෑස් සිලින්ඩර',
    terms: ['ගෑස්', 'ලිට්රෝ', 'ලාෆ්', 'gas', 'cylinder', 'litro', 'laugfs', 'ගෑස් සිලින්ඩර', '12.5kg', '5kg'],
    category: 'ඉන්ධන',
    confirmedCount: 22,
  },
  {
    id: 'syn_fuel',
    canonical: 'ඉන්ධන',
    terms: ['පෙට්‍රල්', 'ඩීසල්', 'ඉන්ධන', 'petrol', 'diesel', 'fuel', 'shed', 'පිරවුම්හල', 'ඔක්ටේන් 92', 'ඔක්ටේන් 95', 'සුපිරි ඩීසල්'],
    category: 'ඉන්ධන',
    confirmedCount: 18,
  },
  {
    id: 'syn_electricity',
    canonical: 'විදුලිය',
    terms: ['විදුලිය', 'කරන්ට්', 'ලයිට්', 'electricity', 'power', 'ceb', 'leco', 'විදුලි බිඳවැටීම්', 'ජෙනරේටර්', 'generator'],
    category: 'බලශක්ති',
    confirmedCount: 15,
  },
  {
    id: 'syn_solar',
    canonical: 'සූර්ය බලශක්ති',
    terms: ['සෝලා', 'සූර්ය බලශක්ති', 'solar', 'solar panel', 'inverter', 'බැටරි', 'battery'],
    category: 'බලශක්ති',
    confirmedCount: 8,
  },

  // 9. IT, Electronics & Mobile
  {
    id: 'syn_computer_laptop',
    canonical: 'පරිගණක / ලැප්ටොප්',
    terms: ['ලැප්ටොප්', 'පරිගණක', 'computer', 'laptop', 'pc', 'repair', 'windows', 'හදන්න', 'ඩෙස්ක්ටොප්'],
    category: 'තාක්ෂණික',
    confirmedCount: 12,
  },
  {
    id: 'syn_phone_mobile',
    canonical: 'දුරකථන / මොබයිල්',
    terms: ['ෆෝන්', 'දුරකථන', 'ස්මාර්ට්ෆෝන්', 'phone', 'mobile', 'smartphone', 'repair', 'ඩිස්ප්ලේ', 'display', 'බැටරි'],
    category: 'තාක්ෂණික',
    confirmedCount: 14,
  },
  {
    id: 'syn_tv_fridge',
    canonical: 'ගෘහ උපකරණ',
    terms: ['ටීවී', 'රූපවාහිනී', 'tv', 'television', 'fridge', 'ශීතකරණ', 'washing machine', 'රෙදි සෝදන යන්ත්‍ර', 'repair'],
    category: 'තාක්ෂණික',
    confirmedCount: 7,
  },

  // 10. Financial, Donations & Cash
  {
    id: 'syn_money_finance',
    canonical: 'මුදල් / ආධාර',
    terms: ['සල්ලි', 'මුදල්', 'ණය', 'ආධාර', 'loan', 'money', 'cash', 'donation', 'මුදල් ආධාර', 'ක්‍රෙඩිට්', 'financial aid'],
    category: 'මූල්‍ය',
    confirmedCount: 16,
  },
  {
    id: 'syn_clothes_fabrics',
    canonical: 'ඇඳුම් පැළඳුම්',
    terms: ['ඇඳුම්', 'රෙදිපිළි', 'clothes', 'clothing', 'shirts', 'pants', 'froks', 'රෙදි', 'සරම්', 'ගවුම්', 'කලිසම්'],
    category: 'ද්‍රව්‍ය',
    confirmedCount: 10,
  },

  // 11. Agriculture, Farming & Pets
  {
    id: 'syn_agriculture_fertilizer',
    canonical: 'කෘෂිකර්ම / පොහොර',
    terms: ['ගොවිතැන්', 'පොහොර', 'බීජ', 'කෘෂිකර්ම', 'fertilizer', 'seeds', 'plants', 'පැළ', 'කාබනික පොහොර', 'යූරියා', 'බීජ පැළ'],
    category: 'කෘෂිකර්ම',
    confirmedCount: 9,
  },
  {
    id: 'syn_pets_animals',
    canonical: 'සුරතල් සතුන්',
    terms: ['බල්ලන්', 'පූසන්', 'සුරතල් සතුන්', 'pets', 'dogs', 'cats', 'veterinary', 'පශු වෛද්‍ය', 'සතුන්', 'කුරුල්ලන්'],
    category: 'සතුන්',
    confirmedCount: 6,
  },

  // 12. Emergencies & Disasters
  {
    id: 'syn_disaster_flood',
    canonical: 'ආපදා / ගංවතුර',
    terms: ['ගංවතුර', 'ආපදා', 'ජල ගැලීම්', 'නායයෑම්', 'flood', 'disaster', 'landslide', 'ආපදා සහන', 'ආරක්ෂිත ස්ථාන', 'කඳවුරු'],
    category: 'ආපදා',
    confirmedCount: 24,
  },
  {
    id: 'syn_police_security',
    canonical: 'පොලිසිය / ආරක්ෂක',
    terms: ['පොලිස්', 'පොලිසිය', 'police', 'නඩු', 'පැමිණිලි', '119', 'ආරක්ෂක', 'security'],
    category: 'ආරක්ෂක',
    confirmedCount: 17,
  },
  {
    id: 'syn_fire_rescue',
    canonical: 'ගිනි නිවන සේවා',
    terms: ['ගිනි', 'ගින්න', 'ගිනි නිවන', 'fire', '110', 'ගිනි නිවන හමුදාව', 'ගිනි නිවීම්'],
    category: 'හදිසි',
    confirmedCount: 15,
  },
];

/**
 * Retrieve current dictionary from localStorage (merged with base dictionary).
 */
export function getStoredSearchDictionary(): SearchSynonymGroup[] {
  try {
    const raw = localStorage.getItem(SEARCH_DICTIONARY_STORAGE_KEY);
    if (raw) {
      const parsed: SearchSynonymGroup[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Merge any new built-in groups that might not exist in parsed
        const existingIds = new Set(parsed.map((g) => g.id));
        const missing = initialSearchDictionary.filter((g) => !existingIds.has(g.id));
        if (missing.length > 0) {
          const merged = [...parsed, ...missing];
          saveSearchDictionary(merged);
          return merged;
        }
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to parse search dictionary from storage:', err);
  }
  return initialSearchDictionary;
}

/**
 * Save updated dictionary to localStorage.
 */
export function saveSearchDictionary(dict: SearchSynonymGroup[]): void {
  try {
    localStorage.setItem(SEARCH_DICTIONARY_STORAGE_KEY, JSON.stringify(dict));
  } catch (err) {
    console.warn('Failed to save search dictionary:', err);
  }
}

/**
 * Clean and normalize a string token.
 */
export function normalizeWord(word: string): string {
  return (word || '').trim().toLowerCase();
}

/**
 * Find all synonym groups matching any word in query or its Singlish phonetic transliteration.
 */
export function findMatchingSynonymGroups(query: string, dictionary?: SearchSynonymGroup[]): SearchSynonymGroup[] {
  const dict = dictionary || getStoredSearchDictionary();
  const q = normalizeWord(query);
  if (!q || q.length < 2) return [];

  // Expand with Singlish transliterations
  const queryKeywords = getSinglishExpandedKeywords(q).map((k) => normalizeWord(k));

  const matched: SearchSynonymGroup[] = [];
  const matchedIds = new Set<string>();

  for (const group of dict) {
    const groupTerms = group.terms.map((t) => normalizeWord(t));
    
    // Check match against query and its Singlish equivalents
    const isMatched = queryKeywords.some((qk) => {
      const isDirect = groupTerms.some((t) => t.includes(qk) || qk.includes(t));
      if (isDirect) return true;
      const subWords = qk.split(/\s+/).filter((w) => w.length >= 2);
      return subWords.some((w) => groupTerms.some((t) => t.includes(w) || w.includes(t)));
    });

    if (isMatched && !matchedIds.has(group.id)) {
      matchedIds.add(group.id);
      matched.push(group);
    }
  }

  return matched;
}

/**
 * Get all synonym alternatives for a given query (expanded list of words including Singlish).
 */
export function getExpandedSearchKeywords(query: string): string[] {
  const q = normalizeWord(query);
  if (!q) return [];

  const keywordsSet = new Set<string>();
  
  // 1. Add direct Singlish expansions
  const singlishExpansions = getSinglishExpandedKeywords(q);
  singlishExpansions.forEach((kw) => {
    const norm = normalizeWord(kw);
    if (norm) keywordsSet.add(norm);
    norm.split(/\s+/).forEach((w) => {
      if (w.length >= 2) keywordsSet.add(w);
    });
  });

  // 2. Find matching groups across all expansions
  const groups = findMatchingSynonymGroups(q);
  for (const g of groups) {
    g.terms.forEach((term) => {
      const norm = normalizeWord(term);
      if (norm) keywordsSet.add(norm);
    });
  }

  return Array.from(keywordsSet);
}

/**
 * Search Engine Suggestion Analyzer:
 * Given a search query (e.g. "හාල්") and a list of available items/strings in the current view:
 * Determines if there's an alternative synonym (e.g. "සහල්") present in the data or known in dictionary.
 * Returns the suggestion prompt if a valid alternate term is found!
 */
export function findSynonymSuggestionPrompt<T>(
  query: string,
  items: T[],
  extractSearchableText: (item: T) => string
): SearchSuggestionPrompt | null {
  const q = normalizeWord(query);
  if (!q || q.length < 2) return null;

  const dict = getStoredSearchDictionary();
  const matchedGroups = findMatchingSynonymGroups(q, dict);
  if (matchedGroups.length === 0) return null;

  // Build searchable text corpus of current dataset
  const datasetTexts = items.map((it) => extractSearchableText(it).toLowerCase());
  const combinedDataText = datasetTexts.join(' ');

  // Look through matched groups to find the best candidate alternate word
  for (const group of matchedGroups) {
    const allTerms = group.terms.map((t) => t.trim());
    
    // Check if query is in terms
    const matchingTermIndex = allTerms.findIndex((t) => normalizeWord(t) === q || q.includes(normalizeWord(t)));
    
    // Candidate terms are the other terms in this group
    const candidateTerms = allTerms.filter((t) => normalizeWord(t) !== q);

    // 1. First priority: terms that actually appear in the existing posts / ad dataset!
    for (const cand of candidateTerms) {
      const candNorm = normalizeWord(cand);
      if (candNorm.length < 2) continue;

      let countInDataset = 0;
      for (const text of datasetTexts) {
        if (text.includes(candNorm)) {
          countInDataset++;
        }
      }

      // If this synonym appears in available ads or posts, suggest it!
      if (countInDataset > 0) {
        return {
          originalQuery: query.trim(),
          suggestedTerm: cand,
          canonicalTerm: group.canonical,
          matchingCount: countInDataset,
          allSynonyms: group.terms,
        };
      }
    }

    // 2. Second priority: If no ads have direct hits, suggest the canonical term if it's different from typed query
    if (normalizeWord(group.canonical) !== q && candidateTerms.length > 0) {
      // Pick the canonical or the first high-confidence synonym
      const topSynonym = group.canonical || candidateTerms[0];
      return {
        originalQuery: query.trim(),
        suggestedTerm: topSynonym,
        canonicalTerm: group.canonical,
        matchingCount: 0,
        allSynonyms: group.terms,
      };
    }
  }

  return null;
}

/**
 * Self-Learning Engine:
 * When a user confirms a synonym question (clicks "✓ ඔව්"):
 * e.g., searched "හාල්", confirmed "සහල්".
 * Stores and associates these two words in the persistent dictionary, incrementing confirmation score!
 */
export function learnAndSaveSynonymPair(
  searchedWord: string,
  confirmedWord: string,
  categoryHint?: string
): { updatedGroup: SearchSynonymGroup; isNew: boolean } {
  const sWord = searchedWord.trim();
  const cWord = confirmedWord.trim();
  if (!sWord || !cWord) {
    throw new Error('Valid searchedWord and confirmedWord required.');
  }

  const sNorm = normalizeWord(sWord);
  const cNorm = normalizeWord(cWord);

  const dict = getStoredSearchDictionary();
  let foundGroupIndex = -1;

  // Search if any existing group already contains either searchedWord or confirmedWord
  for (let i = 0; i < dict.length; i++) {
    const groupTerms = dict[i].terms.map((t) => normalizeWord(t));
    if (groupTerms.includes(sNorm) || groupTerms.includes(cNorm)) {
      foundGroupIndex = i;
      break;
    }
  }

  const nowIso = new Date().toISOString();

  if (foundGroupIndex >= 0) {
    // Update existing group
    const existing = dict[foundGroupIndex];
    const termsSet = new Set(existing.terms.map((t) => t.trim()));
    termsSet.add(sWord);
    termsSet.add(cWord);

    const updated: SearchSynonymGroup = {
      ...existing,
      terms: Array.from(termsSet),
      confirmedCount: (existing.confirmedCount || 0) + 1,
      isLearned: true,
      updatedAt: nowIso,
    };

    dict[foundGroupIndex] = updated;
    saveSearchDictionary(dict);
    return { updatedGroup: updated, isNew: false };
  } else {
    // Create new learned group
    const newGroup: SearchSynonymGroup = {
      id: `syn_learned_${Date.now()}`,
      canonical: cWord,
      terms: Array.from(new Set([sWord, cWord])),
      category: categoryHint || 'සාමාන්‍ය',
      isLearned: true,
      confirmedCount: 1,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    dict.unshift(newGroup);
    saveSearchDictionary(dict);
    return { updatedGroup: newGroup, isNew: true };
  }
}

/**
 * Add a completely custom synonym group (e.g. from Admin).
 */
export function addCustomSynonymGroup(
  canonical: string,
  terms: string[],
  category?: string
): SearchSynonymGroup {
  const dict = getStoredSearchDictionary();
  const cWord = canonical.trim();
  const cleanTerms = Array.from(
    new Set([cWord, ...terms.map((t) => t.trim()).filter(Boolean)])
  );

  const newGroup: SearchSynonymGroup = {
    id: `syn_custom_${Date.now()}`,
    canonical: cWord,
    terms: cleanTerms,
    category: category || 'සාමාන්‍ය',
    isLearned: true,
    confirmedCount: 1,
    createdAt: new Date().toISOString(),
  };

  const updated = [newGroup, ...dict];
  saveSearchDictionary(updated);
  return newGroup;
}

/**
 * Update an existing synonym group.
 */
export function updateSynonymGroup(
  id: string,
  canonical: string,
  terms: string[],
  category?: string
): SearchSynonymGroup[] {
  const dict = getStoredSearchDictionary();
  const updated = dict.map((g) => {
    if (g.id === id) {
      const cleanTerms = Array.from(
        new Set([canonical.trim(), ...terms.map((t) => t.trim()).filter(Boolean)])
      );
      return {
        ...g,
        canonical: canonical.trim(),
        terms: cleanTerms,
        category: category || g.category,
        updatedAt: new Date().toISOString(),
      };
    }
    return g;
  });
  saveSearchDictionary(updated);
  return updated;
}

/**
 * Delete a synonym group from storage.
 */
export function deleteSynonymGroup(id: string): SearchSynonymGroup[] {
  const dict = getStoredSearchDictionary();
  const updated = dict.filter((g) => g.id !== id);
  saveSearchDictionary(updated);
  return updated;
}

/**
 * Reset dictionary back to initial defaults.
 */
export function resetSearchDictionaryToDefault(): SearchSynonymGroup[] {
  saveSearchDictionary(initialSearchDictionary);
  return initialSearchDictionary;
}
