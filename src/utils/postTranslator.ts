import { HelpPost, Language } from '../types/index';

/**
 * Multi-language Phrase Dictionary for exact and prominent sentences
 */
const POST_DICTIONARY: Record<string, { en: string; ta: string; si?: string }> = {
  // Quick Services & General
  'වහලයේ උළු කැට කිහිපයක් බිඳී වැසි ජලය කාන්දු වේ.': {
    en: 'Several roof tiles are broken and rainwater is leaking inside.',
    ta: 'கூரை ஓடுகள் உடைந்து மழைநீர் கசிகிறது.',
    si: 'වහලයේ උළු කැට කිහිපයක් බිඳී වැසි ජලය කාන්දු වේ.',
  },
  'වහලය පරීක්ෂා කර අලුත්වැඩියා කර දීමට සහායකයෙක් අවශ්‍යයි.': {
    en: 'Need a technician to inspect and repair the roof.',
    ta: 'கூரை பழுதுபார்க்க ஒரு உதவியாளர் தேவை.',
    si: 'වහලය පරීක්ෂා කර අලුත්වැඩියා කර දීමට සහායකයෙක් අවශ්‍යයි.',
  },
  'පළපුරුදු අය පමණක් විමසන්න.': {
    en: 'Experienced technicians only, please.',
    ta: 'அனுபவமுள்ளவர்கள் மட்டும் தொடர்பு கொள்ளவும்.',
    si: 'පළපුරුදු අය පමණක් විමසන්න.',
  },
  'පළපුරුදු කාර්මික ශිල්පින් විමසන්න.': {
    en: 'Experienced technicians only, please.',
    ta: 'அனுபவமுள்ள தொழில்நுட்ப வல்லுநர்கள் மட்டும் தொடர்பு கொள்ளவும்.',
    si: 'පළපුරුදු කාර්මික ශිල්පින් විමසන්න.',
  },
  'හදිසි අවශ්‍යතාවයකි.': {
    en: 'Urgent requirement.',
    ta: 'அவசர தேவை.',
    si: 'හදිසි අවශ්‍යතාවයකි.',
  },
  'ඔබ පැමිණිය යුතුයි (ප්‍රවාහන වියදම් ගෙවනු ලැබේ)': {
    en: 'You must visit the location (transport costs covered)',
    ta: 'நீங்கள் நேரில் வர வேண்டும் (போக்குவரத்து செலவு வழங்கப்படும்)',
    si: 'ඔබ පැමිණිය යුතුයි (ප්‍රවාහන වියදම් ගෙවනු ලැබේ)',
  },
  'ඔබ පැමිණිය යුතුයි': {
    en: 'You must visit',
    ta: 'நீங்கள் வர வேண்டும்',
    si: 'ඔබ පැමිණිය යුතුයි',
  },
  'මම රැගෙන එන්නම්': {
    en: 'I will deliver',
    ta: 'நான் கொண்டு வருகிறேன்',
    si: 'මම රැගෙන එන්නම්',
  },
  'රු. 3,500/= (මුදලින්)': {
    en: 'Rs. 3,500/= (Cash)',
    ta: 'ரூ. 3,500/= (பணம்)',
    si: 'රු. 3,500/= (මුදලින්)',
  },
  'ඔබගේ ගාස්තුවට මම එකඟ වෙමි (I agree to your fee)': {
    en: 'I agree to your fee',
    ta: 'உங்கள் கட்டணத்திற்கு நான் சம்மதிக்கிறேன்',
    si: 'ඔබගේ ගාස්තුවට මම එකඟ වෙමි',
  },
  'ඔබගේ ගාස්තුවට මම එකඟ වෙමි': {
    en: 'I agree to your fee',
    ta: 'உங்கள் கட்டணத்திற்கு நான் சம்மதிக்கிறேன்',
    si: 'ඔබගේ ගාස්තුවට මම එකඟ වෙමි',
  },
  'මගේ බයික් එක කැඩිලා': {
    en: 'My motorbike is broken down.',
    ta: 'எனது மோட்டார் பைக் பழுதடைந்துள்ளது.',
    si: 'මගේ යතුරුපැදිය කැඩී ඇත.',
  },
  'අලුත්වැඩියා කරගන්න ඔනේ': {
    en: 'Need to get it repaired.',
    ta: 'பழுதுபார்க்க வேண்டும்.',
    si: 'අලුත්වැඩියා කරගත යුතුය.',
  },
  'අද දවස තුල': {
    en: 'Within today',
    ta: 'இன்றைய தினத்திற்குள்',
    si: 'අද දවස තුළ',
  },
  'අද දවස තුළ': {
    en: 'Within today',
    ta: 'இன்றைய தினத்திற்குள்',
    si: 'අද දවස තුළ',
  },
  'මගේ ළඟ පළපුරුදු බයික් කාර්මිකයෙක් ඉන්නවා. මම විනාඩි 15කින් කටුනායකට එන්නම්.': {
    en: 'I have an experienced motorcycle mechanic. I can reach Katunayake in 15 minutes.',
    ta: 'என்னிடம் அனுபவமுள்ள பைக் மெக்கானிக் உள்ளார். 15 நிமிடங்களில் கட்டுநாயக்கவிற்கு வருகிறேன்.',
    si: 'මා ළඟ පළපුරුදු යතුරුපැදි කාර්මිකයෙක් සිටී. විනාඩි 15කින් කටුනායකට පැමිණිය හැක.',
  },
  'ඔබ සිටින ස්ථානය කෝවින්නට ආසන්නයි. මගේ ගැරාජය ළඟම තිබෙනවා, මට ඇවිත් උදව් කරන්න පුළුවන්.': {
    en: 'Your location is near Kovinna. My garage is close by, I can come over to help.',
    ta: 'உங்கள் இடம் கோவின்னவுக்கு அருகில் உள்ளது. எனது கேரேஜ் அருகிலுள்ளது, வந்து உதவ முடியும்.',
    si: 'ඔබ සිටින ස්ථානය කෝවින්නට ආසන්නයි. මගේ ගැරාජය ළඟම තිබෙනවා, මට ඇවිත් උදව් කරන්න පුළුවන්.',
  },

  // Vehicle Breakdown / Repair
  'මෝටර් රථයේ බැටරිය බැස ඇති අතර පණගැන්විය නොහැක.': {
    en: 'Car battery is dead and vehicle cannot be started.',
    ta: 'கார் பேட்டரி தீர்ந்துவிட்டது, வாகனத்தை ஸ்டார்ட் செய்ய முடியவில்லை.',
    si: 'මෝටර් රථයේ බැටරිය බැස ඇති අතර පණගැන්විය නොහැක.',
  },
  'Jump start කිරීමට jumper cables සහ සහායකයෙක් අවශ්‍යයි.': {
    en: 'Need jump start cables and an assistant to restart the car.',
    ta: 'ஜம்ப் ஸ்டார்ட் செய்ய கேபிள்கள் மற்றும் உதவியாளர் தேவை.',
    si: 'Jump start කිරීමට jumper cables සහ සහායකයෙක් අවශ්‍යයි.',
  },
  'කෝවින්න හන්දිය අසල': {
    en: 'Near Kovinna Junction',
    ta: 'கோவின்ன சந்திக்கு அருகில்',
    si: 'කෝවින්න හන්දිය අසල',
  },
  'රු. 2,000/= (මුදලින්)': {
    en: 'Rs. 2,000/= (Cash)',
    ta: 'ரூ. 2,000/= (பணம்)',
    si: 'රු. 2,000/= (මුදලින්)',
  },

  // Lost & Found (Find For Me)
  'නැතිවූ කළු පැහැති පසුම්බිය සොයාදෙන්න.': {
    en: 'Please help find the lost black leather wallet.',
    ta: 'தொலைந்துபோன கருப்பு பணப்பையைக் கண்டுபிடிக்க உதவவும்.',
    si: 'නැතිවූ කළු පැහැති පසුම්බිය සොයාදෙන්න.',
  },
  'කළු පැහැති Leather පසුම්බිය': {
    en: 'Black Leather Wallet',
    ta: 'கருப்பு லெதர் பணப்பை',
    si: 'කළු පැහැති සම් පසුම්බිය',
  },
  'කළු පැහැති සම් පසුම්බිය': {
    en: 'Black Leather Wallet',
    ta: 'கருப்பு லெதர் பணப்பை',
    si: 'කළු පැහැති සම් පසුම්බිය',
  },
  'මීගමුව බස් නැවතුම්පොළ අසල': {
    en: 'Near Negombo Bus Stand',
    ta: 'நீர்கொழும்பு பஸ் நிலையம் அருகில்',
    si: 'මීගමුව බස් නැවතුම්පොළ අසල',
  },
  'හදිසි ලියකියවිලි සහිතයි.': {
    en: 'Contains urgent identity documents.',
    ta: 'அவசர ஆவணங்கள் உள்ளன.',
    si: 'හදිසි ලියකියවිලි සහිතයි.',
  },
  'සෘජු සම්බන්ධතා ලබාගන්න': {
    en: 'Direct contact required',
    ta: 'நேரடி தொடர்பு தேவை',
    si: 'සෘජු සම්බන්ධතා ලබාගන්න',
  },
  'ත්‍යාගය: රු. 5,000/= මුදල් ත්‍යාගයක්': {
    en: 'Reward: Rs. 5,000/= Cash Reward',
    ta: 'பரிசு: ரூ. 5,000/= ரொக்கப் பரிசு',
    si: 'ත්‍යාගය: රු. 5,000/= මුදල් ත්‍යාගයක්',
  },
  'රු. 5,000/= ක මුදල් ත්‍යාගයක් ලබාදෙමි': {
    en: 'Offering a cash reward of Rs. 5,000/=',
    ta: 'ரூ. 5,000/= ரொக்கப் பரிசு வழங்கப்படும்',
    si: 'රු. 5,000/= ක මුදල් ත්‍යාගයක් ලබාදෙමි',
  },
  'පසුම්බිය තුළ රියදුරු බලපත්‍රය සහ රක්ෂණ කාඩ්පත ද අඩංගු වේ.': {
    en: 'The wallet contains driving license and insurance card.',
    ta: 'பணப்பையில் ஓட்டுநர் உரிமம் மற்றும் காப்பீட்டு அட்டை உள்ளது.',
    si: 'පසුම්බිය තුළ රියදුරු බලපත්‍රය සහ රක්ෂණ කාඩ්පත ද අඩංගු වේ.',
  },
  'කරුණාකර සොයාගත් අයෙක් වේනම් දුරකථනයෙන් හෝ WhatsApp මගින් දැනුම් දෙන්න.': {
    en: 'If found, please notify via phone call or WhatsApp.',
    ta: 'கண்டெடுத்தால் தயவுசெய்து போன் அல்லது WhatsApp மூலம் தெரிவிக்கவும்.',
    si: 'කරුණාකර සොයාගත් අයෙක් වේනම් දුරකථනයෙන් හෝ WhatsApp මගින් දැනුම් දෙන්න.',
  },

  // Searching for item (Find For Me - Search)
  'විදුලි වතුර මෝටරයක් (0.5 HP) සොයාදෙන්න.': {
    en: 'Looking for an electric water pump motor (0.5 HP).',
    ta: 'மின்சார தண்ணீர் மோட்டார் (0.5 HP) தேடப்படுகிறது.',
    si: 'විදුලි වතුර මෝටරයක් (0.5 HP) සොයාදෙන්න.',
  },
  'විදුලි වතුර මෝටරයක් (0.5 HP)': {
    en: 'Electric Water Motor (0.5 HP)',
    ta: 'மின்சார தண்ணீர் மோட்டார் (0.5 HP)',
    si: 'විදුලි වතුර මෝටරයක් (0.5 HP)',
  },
  'ගෙනවිත් දෙන්න ඒ සදහා මම ඔබට වෙනම ගෙවන්නම්': {
    en: 'Please deliver to my address, I will pay delivery fee separately',
    ta: 'முகவரிக்கு டெலிவரி செய்யவும், கட்டணம் தனியாக வழங்கப்படும்',
    si: 'ගෙනවිත් දෙන්න ඒ සදහා මම ඔබට වෙනම ගෙවන්නම්',
  },
  'හොඳ ධාවන තත්වයේ ඇති එකක් විය යුතුය.': {
    en: 'Must be in good working condition.',
    ta: 'நல்ல இயங்கும் நிலையில் இருக்க வேண்டும்.',
    si: 'හොඳ ධාවන තත්වයේ ඇති එකක් විය යුතුය.',
  },
  'ගණුදෙනුව සිදුවියයුතු ආකාරය: ගෙනවිත් දෙන්න ඒ සදහා මම ඔබට වෙනම ගෙවන්නම්': {
    en: 'Transaction method: Please deliver to my address, delivery fee paid separately',
    ta: 'பரிவர்த்தனை முறை: முகவரிக்கு டெலிவரி செய்யவும், கட்டணம் தனியாக வழங்கப்படும்',
    si: 'ගණුදෙනුව සිදුවියයුතු ආකාරය: ගෙනවිත් දෙන්න ඒ සදහා මම ඔබට වෙනම ගෙවන්නම්',
  },

  // From Me To You (Donations & Exchange)
  'පරිත්‍යාගයකි: පාසල් බෑග් සහ පොත්පත් කට්ටල': {
    en: 'Donation: School bags and stationery book sets',
    ta: 'நன்கொடை: பள்ளி பைகள் மற்றும் புத்தக தொகுப்புகள்',
    si: 'පරිත්‍යාගයකි: පාසල් බෑග් සහ පොත්පත් කට්ටල',
  },
  'අවශ්‍ය දරුවන්ට නොමිලේ ලබාදීම.': {
    en: 'Free giveaway for deserving students in need.',
    ta: 'தேவையுள்ள மாணவர்களுக்கு இலவசமாக வழங்கப்படுகிறது.',
    si: 'අවශ්‍ය දරුවන්ට නොමිලේ ලබාදීම.',
  },
  'ඇවිත් රැගෙන යන්න': {
    en: 'Self pickup at location',
    ta: 'நேரில் வந்து பெற்றுக்கொள்ளவும்',
    si: 'ඇවිත් රැගෙන යන්න',
  },
  'නොමිලේ (පරිත්‍යාගයකි)': {
    en: 'Free (Donation)',
    ta: 'இலவசம் (நன்கொடை)',
    si: 'නොමිලේ (පරිත්‍යාගයකි)',
  },
  'පරිත්‍යාගයකි': {
    en: 'Donation',
    ta: 'நன்கொடை',
    si: 'පරිත්‍යාගයකි',
  },
  'ඉවත් කිරීමට නියමිතයි': {
    en: 'Scheduled for Giveaway',
    ta: 'வழங்க திட்டமிடப்பட்டுள்ளது',
    si: 'ඉවත් කිරීමට නියමිතයි',
  },
  'හුවමාරු කිරීමට': {
    en: 'For Exchange',
    ta: 'பரிமாற்றம் செய்ய',
    si: 'හුවමාරු කිරීමට',
  },
  'භාණ්ඩ හුවමාරුව (Exchange)': {
    en: 'Item Exchange',
    ta: 'பொருட்கள் பரிமாற்றம்',
    si: 'භාණ්ඩ හුවමාරුව',
  },
  'භාණ්ඩ හුවමාරුව': {
    en: 'Item Exchange',
    ta: 'பொருட்கள் பரிமாற்றம்',
    si: 'භාණ්ඩ හුවමාරුව',
  },
  'හුවමාරුවට: බයිසිකල් හෙල්මට් එකක් ⇄ ජංගම දුරකථන Power Bank එකකට': {
    en: 'For Swap: 1 Bicycle Helmet ⇄ 1 Mobile Power Bank',
    ta: 'பரிமாற்றத்திற்கு: 1 சைக்கிள் ஹெல்மெட் ⇄ 1 மொபைல் பவர் பேங்க்',
    si: 'හුවමාරුවට: බයිසිකල් හෙල්මට් එකක් ⇄ ජංගම දුරකථන Power Bank එකකට',
  },
  'බයිසිකල් හෙල්මට් (Full-Face)': {
    en: 'Bicycle Helmet (Full-Face)',
    ta: 'சைக்கிள் ஹெல்மெட் (Full-Face)',
    si: 'බයිසිකල් හෙල්මට්',
  },
  'බයිසිකල් හෙල්මට්': {
    en: 'Bicycle Helmet',
    ta: 'சைக்கிள் ஹெல்மெட்',
    si: 'බයිසිකල් හෙල්මට්',
  },
  'හෙල්මට් එක ඉතා හොඳ තත්ත්වයේ ඇත.': {
    en: 'Helmet is in very good condition.',
    ta: 'ஹெல்மெட் மிக நல்ல நிலையில் உள்ளது.',
    si: 'හෙල්මට් එක ඉතා හොඳ තත්ත්වයේ ඇත.',
  },
  'ඉවත් කිරීමට නියමිතයි: ලී පුටු 4ක් සහ මේසයක්': {
    en: 'Giveaway: 4 Wooden chairs and a table',
    ta: 'இலவச வழங்கல்: 4 மர நாற்காலிகள் மற்றும் மேஜை',
    si: 'ඉවත් කිරීමට නියමිතයි: ලී පුටු 4ක් සහ මේසයක්',
  },
  'නිවස අලුත්වැඩියාව නිසා අවශ්‍ය කෙනෙකුට ලබාගැනීමට.': {
    en: 'Offered due to house renovation for anyone in need.',
    ta: 'வீட்டுப் பழுதுபார்ப்பு காரணமாகத் தேவைப்படுவோருக்கு இலவசமாக வழங்கப்படுகிறது.',
    si: 'නිවස අලුත්වැඩියාව නිසා අවශ්‍ය කෙනෙකුට ලබාගැනීමට.',
  },
  'නොමිලේ (ඉවත්කරන බැවින්)': {
    en: 'Free (Clearing out)',
    ta: 'இலவசம் (அகற்றுவதால்)',
    si: 'නොමිලේ',
  },
  'පෞද්ගලිකව දැනුම්දෙනු ලැබේ': {
    en: 'Will be notified privately',
    ta: 'தனிப்பட்ட முறையில் தெரிவிக்கப்படும்',
    si: 'පෞද්ගලිකව දැනුම්දෙනු ලැබේ',
  },
  'චැට් හරහා විස්තර විමසා රැගෙන යා හැක.': {
    en: 'Can inquire details via chat and pick up.',
    ta: 'Chat மூலம் விவரங்களைக் கேட்டுப் பெற்றுக்கொள்ளலாம்.',
    si: 'චැට් හරහා විස්තර විමසා රැගෙන යා හැක.',
  },
  'පාසල් බෑග් සහ පොත්පත් කට්ටල': {
    en: 'School bags and book stationery sets',
    ta: 'பள்ளி பைகள் மற்றும் புத்தக தொகுப்புகள்',
    si: 'පාසල් බෑග් සහ පොත්පත් කට්ටල',
  },
  'දරුවන්ට හෝ පාසලකට': {
    en: 'For students or a school',
    ta: 'மாணவர்களுக்கு அல்லது பள்ளிக்கு',
    si: 'දරුවන්ට හෝ පාසලකට',
  },
  'අවශ්‍ය ඕනෑම අයෙක්ට': {
    en: 'For anyone in need',
    ta: 'தேவையுள்ள எவருக்கும்',
    si: 'අවශ්‍ය ඕනෑම අයෙක්ට',
  },
  'අලුත් තත්වයේ ඇති පාසල් බෑග් දෙකක් සහ 80 පිටු පොත් 20ක් ඇත.': {
    en: 'Two new school bags and twenty 80-page books available.',
    ta: '2 புதிய பள்ளி பைகள் மற்றும் 20 (80 பக்க) புத்தகங்கள் உள்ளன.',
    si: 'අලුත් තත්වයේ ඇති පාසල් බෑග් දෙකක් සහ 80 පිටු පොත් 20ක් ඇත.',
  },
  'ලී පුටු 4ක් සහ මේසයක්': {
    en: '4 Wooden chairs and a table',
    ta: '4 மர நாற்காலிகள் மற்றும் மேஜை',
    si: 'ලී පුටු 4ක් සහ මේසයක්',
  },

  // Categories & Tags
  'ඉක්මන් සේවා': { en: 'Quick Services', ta: 'விரைவு சேவை', si: 'ඉක්මන් සේවා' },
  'ඉක්මන් සේවා (Quick Services)': { en: 'Quick Services', ta: 'விரைவு சேவை', si: 'ඉක්මන් සේවා' },
  'quick_services': { en: 'Quick Services', ta: 'விரைவு சேவை', si: 'ඉක්මන් සේවා' },
  'quick': { en: 'Quick Services', ta: 'விரைவு சேவை', si: 'ඉක්මන් සේවා' },
  'සොයාදෙන්න': { en: 'Find For Me', ta: 'கண்டுபிடிக்க', si: 'සොයාදෙන්න' },
  'find_for_me': { en: 'Find For Me', ta: 'கண்டுபிடிக்க', si: 'සොයාදෙන්න' },
  'මගෙන් ඔබට': { en: 'From Me To You', ta: 'என்னிடமிருந்து உங்களுக்கு', si: 'මගෙන් ඔබට' },
  'from_me_to_you': { en: 'From Me To You', ta: 'என்னிடமிருந்து உங்களுக்கு', si: 'මගෙන් ඔබට' },
  'වෙළඳපොල': { en: 'Marketplace', ta: 'சந்தை', si: 'වෙළඳපොල' },
  'වෙළඳපොළ': { en: 'Marketplace', ta: 'சந்தை', si: 'වෙළඳපොළ' },
  'සහය වෙළඳපොළ': { en: 'Sahaya Marketplace', ta: 'சகாய சந்தை', si: 'සහය වෙළඳපොළ' },
  'marketplace': { en: 'Marketplace', ta: 'சந்தை', si: 'වෙළඳපොල' },
  'කණ්ඩායම් වැඩ': { en: 'Group Work', ta: 'கூட்டு வேலை', si: 'කණ්ඩායම් වැඩ' },
  'group_work': { en: 'Group Work', ta: 'கூட்டு வேலை', si: 'කණ්ඩායම් වැඩ' },
  'වෘත්තීය සේවා': { en: 'Professional Services', ta: 'தொழில்முறை சேவைகள்', si: 'වෘත්තීය සේවා' },
  'professional_services': { en: 'Professional Services', ta: 'தொழில்முறை சேவைகள்', si: 'වෘත්තීය සේවා' },
  'සාමාන්‍ය සේවා': { en: 'General Services', ta: 'பொது சேவைகள்', si: 'සාමාන්‍ය සේවා' },
  'සාමාන්‍ය සේවා (General Services)': { en: 'General Services', ta: 'பொது சேவைகள்', si: 'සාමාන්‍ය සේවා' },
  'normal_services': { en: 'General Services', ta: 'பொது சேவைகள்', si: 'සාමාන්‍ය සේවා' },

  // Tag Names & Disciplines
  'Roof Repair': { en: 'Roof Repair', ta: 'கூரை பழுது', si: 'වහල අලුත්වැඩියාව' },
  'Vehicle Repair': { en: 'Vehicle Repair', ta: 'வாகன பழுது', si: 'වාහන අලුත්වැඩියාව' },
  'වාහන අලුත්වැඩියාව': { en: 'Vehicle Repair', ta: 'வாகன பழுது', si: 'වාහන අලුත්වැඩියාව' },
  'වහල හා ගෘහ නඩත්තුව': { en: 'Roof & Home Maintenance', ta: 'கூரை மற்றும் வீட்டு பராமரிப்பு', si: 'වහල හා ගෘහ නඩත්තුව' },
  'Plumbing': { en: 'Plumbing', ta: 'குழாய் வேலை', si: 'නල කාර්මික' },
  'Electrical': { en: 'Electrical', ta: 'மின்சார வேலை', si: 'විදුලි කාර්මික' },
  'Masonry': { en: 'Masonry', ta: 'மேசன் வேலை', si: 'මේසන් වැඩ' },
  'Carpentry': { en: 'Carpentry', ta: 'மரவேலை', si: 'වඩු වැඩ' },
  'Painting': { en: 'Painting', ta: 'வர்ணம் பூசுதல்', si: 'තීන්ත ආලේපය' },
  'AC Repair': { en: 'AC Repair', ta: 'ஏசி பழுது', si: 'වායුසමන අලුත්වැඩියාව' },
  'Cleaning': { en: 'Cleaning', ta: 'சுத்தம் செய்தல்', si: 'පිරිසිදු කිරීම්' },
  'Gardening': { en: 'Gardening', ta: 'தோட்ட வேலை', si: 'වතු නඩත්තුව' },
  'Emergency Aid': { en: 'Emergency Aid', ta: 'அவசர உதவி', si: 'හදිසි ආධාර' },
  'කෑම / බීම': { en: 'Food & Drinks', ta: 'உணவு / பானங்கள்', si: 'කෑම / බීම' },
  'ආහාර, පෝෂණ': { en: 'Food & Nutrition', ta: 'உணவு மற்றும் ஊட்டச்சத்து', si: 'ආහාර, පෝෂණ' },
  'කාර්මික': { en: 'Mechanical & Repair', ta: 'தொழில்நுட்ப பழுது', si: 'කාර්මික' },
  'Mechanical, Repair': { en: 'Mechanical & Repair', ta: 'தொழில்நுட்ப பழுது', si: 'කාර්මික' },
};

/**
 * Word Level Lexicon with clean, unambiguous single definitions (no slashes)
 */
const WORD_LEXICON: Record<string, { en: string; ta: string }> = {
  // Common Verbs & Actions
  'අවශ්‍යයි': { en: 'needed', ta: 'தேவை' },
  'අවශ්‍ය': { en: 'required', ta: 'தேவையான' },
  'අවශ්‍යවේ': { en: 'required', ta: 'தேவைப்படுகிறது' },
  'සොයමි': { en: 'searching for', ta: 'தேடுகிறேன்' },
  'සොයාදෙන්න': { en: 'please find', ta: 'கண்டுபிடிக்கவும்' },
  'සොයාගත්': { en: 'who found', ta: 'கண்டுபிடித்தவர்' },
  'නැතිවී': { en: 'lost', ta: 'தொலைந்து' },
  'නැතිවූ': { en: 'lost', ta: 'தொலைந்த' },
  'සොරාගත්': { en: 'stolen', ta: 'திருடப்பட்ட' },
  'කැඩී': { en: 'broken', ta: 'உடைந்து' },
  'බිඳී': { en: 'broken', ta: 'விரிசல் அடைந்து' },
  'කාන්දු': { en: 'leaking', ta: 'கசிகிறது' },
  'අලුත්වැඩියා': { en: 'repair', ta: 'பழுதுபார்ப்பு' },
  'හදාගන්න': { en: 'to fix', ta: 'சரிசெய்ய' },
  'පරීක්ෂා': { en: 'inspect', ta: 'பரிசோதிக்க' },
  'පණගැන්විය': { en: 'to start', ta: 'ஸ்டார்ட் செய்ய' },
  'බැස': { en: 'drained', ta: 'தீர்ந்துவிட்டது' },
  'පැමිණිය': { en: 'to visit', ta: 'வர' },
  'රැගෙන': { en: 'to collect', ta: 'கொண்டு செல்ல' },
  'ගෙනවිත්': { en: 'deliver', ta: 'கொண்டுவந்து' },
  'ලබාදෙමි': { en: 'will give', ta: 'வழங்குவேன்' },
  'ලබාදීම': { en: 'giveaway', ta: 'வழங்குதல்' },
  'හුවමාරු': { en: 'exchange', ta: 'பரிமாற்றம்' },
  'විමසන්න': { en: 'contact', ta: 'தொடர்பு கொள்ளவும்' },
  'සම්බන්ධකරගන්න': { en: 'contact me', ta: 'தொடர்பு கொள்ளவும்' },

  // Items & Objects
  'වහලය': { en: 'roof', ta: 'கூரை' },
  'වහලයේ': { en: 'of the roof', ta: 'கூரையின்' },
  'උළු': { en: 'tiles', ta: 'ஓடுகள்' },
  'බැටරිය': { en: 'battery', ta: 'பேட்டரி' },
  'මෝටර්': { en: 'motor', ta: 'மோட்டார்' },
  'රථයේ': { en: 'vehicle', ta: 'வாகனத்தின்' },
  'කාර්': { en: 'car', ta: 'கார்' },
  'වෑන්': { en: 'van', ta: 'வேன்' },
  'යතුරුපැදිය': { en: 'motorcycle', ta: 'மோட்டார் சைக்கிள்' },
  'බයික්': { en: 'motorbike', ta: 'பைக்' },
  'ත්‍රිරෝද': { en: 'three-wheeler', ta: 'ஆட்டோ' },
  'පසුම්බිය': { en: 'wallet', ta: 'பணப்பை' },
  'ලියකියවිලි': { en: 'documents', ta: 'ஆவணங்கள்' },
  'හැඳුනුම්පත': { en: 'National ID', ta: 'அடையாள அட்டை' },
  'බලපත්‍රය': { en: 'license', ta: 'உரிமம்' },
  'කාඩ්පත': { en: 'card', ta: 'அட்டை' },
  'දුරකථනය': { en: 'phone', ta: 'தொலைபேசி' },
  'ජංගම': { en: 'mobile', ta: 'கைபேசி' },
  'පොත්පත්': { en: 'stationery', ta: 'புத்தகங்கள்' },
  'පොත්': { en: 'books', ta: 'புத்தகங்கள்' },
  'බෑග්': { en: 'bags', ta: 'பைகள்' },
  'ඇඳුම්': { en: 'clothes', ta: 'உடைகள்' },
  'සපත්තු': { en: 'shoes', ta: 'காலணிகள்' },
  'වතුර': { en: 'water', ta: 'தண்ணீர்' },
  'ටැංකිය': { en: 'tank', ta: 'தொட்டி' },
  'බට': { en: 'pipes', ta: 'குழாய்கள்' },
  'විදුලි': { en: 'electrical', ta: 'மின்சார' },
  'නල': { en: 'plumbing', ta: 'குழாய்' },
  'තීන්ත': { en: 'paint', ta: 'வர்ணம்' },
  'මේසන්': { en: 'masonry', ta: 'மேசன்' },
  'වඩු': { en: 'carpentry', ta: 'மரவேலை' },
  'ශීතකරණය': { en: 'refrigerator', ta: 'குளிர்சாதனப் பெட்டி' },
  'රූපවාහිනී': { en: 'TV', ta: 'தொலைக்காட்சி' },

  // People & Roles
  'සහායකයෙක්': { en: 'an assistant', ta: 'ஒரு உதவியாளர்' },
  'සහායකයින්': { en: 'helpers', ta: 'உதவியாளர்கள்' },
  'කාර්මිකයෙක්': { en: 'a technician', ta: 'ஒரு தொழில்நுட்ப வல்லுநர்' },
  'ශිල්පින්': { en: 'technicians', ta: 'தொழில்நுட்ப வல்லுநர்கள்' },
  'දරුවන්ට': { en: 'for students', ta: 'மாணவர்களுக்கு' },
  'පුද්ගලයෙක්': { en: 'person', ta: 'நபர்' },
  'අය': { en: 'persons', ta: 'நபர்கள்' },
  'පළපුරුදු': { en: 'experienced', ta: 'அனுபவமுள்ள' },

  // Qualities & Modifiers
  'හදිසි': { en: 'urgent', ta: 'அவசர' },
  'කළු': { en: 'black', ta: 'கருப்பு' },
  'සුදු': { en: 'white', ta: 'வெள்ளை' },
  'රතු': { en: 'red', ta: 'சிகப்பு' },
  'නිල්': { en: 'blue', ta: 'நீல' },
  'නොමිලේ': { en: 'free', ta: 'இலவசமாக' },
  'පරිත්‍යාගයකි': { en: 'Donation', ta: 'நன்கொடை' },
  'හොඳ': { en: 'good', ta: 'நல்ல' },
  'තත්වයේ': { en: 'condition', ta: 'நிலையில்' },
  'නව': { en: 'new', ta: 'புதிய' },
  'පැරණි': { en: 'used', ta: 'பழைய' },
  'මුදලින්': { en: 'in cash', ta: 'பணமாக' },
  'මුදල්': { en: 'cash', ta: 'பணம்' },
  'ත්‍යාගයක්': { en: 'reward', ta: 'பரிசு' },
  'ත්‍යාගය': { en: 'Reward', ta: 'பரிசு' },

  // Time & Location Words
  'අද': { en: 'today', ta: 'இன்று' },
  'අදම': { en: 'today itself', ta: 'இன்றே' },
  'හෙට': { en: 'tomorrow', ta: 'நாளை' },
  'දින': { en: 'date', ta: 'தேதி' },
  'පැය': { en: 'hours', ta: 'மணிநேரம்' },
  'මිනිත්තු': { en: 'minutes', ta: 'நிமிடங்கள்' },
  'පෙර': { en: 'ago', ta: 'முன்' },
  'අසල': { en: 'near', ta: 'அருகில்' },
  'හන්දිය': { en: 'junction', ta: 'சந்தி' },
  'පාර': { en: 'road', ta: 'வீதி' },
  'නගරය': { en: 'town', ta: 'நகரம்' },
  'ස්ථානය': { en: 'location', ta: 'இடம்' },
  'ලිපිනය': { en: 'address', ta: 'முகவரி' },
  'දක්වා': { en: 'up to', ta: 'வரை' },
  'සිට': { en: 'from', ta: 'இருந்து' },
};

/**
 * Common regex phrase replacements for automated sentence structuring
 */
const PATTERN_REPLACEMENTS: Array<{
  pattern: RegExp;
  en: string | ((...args: any[]) => string);
  ta: string | ((...args: any[]) => string);
}> = [
  {
    pattern: /මීට මිනිත්තු (\d+) කට පෙර/g,
    en: '$1 mins ago',
    ta: '$1 நிமிடங்களுக்கு முன்',
  },
  {
    pattern: /මීට පැය (\d+) කට පෙර/g,
    en: '$1 hours ago',
    ta: '$1 மணிநேரத்திற்கு முன்',
  },
  {
    pattern: /මීට දින (\d+) කට පෙර/g,
    en: '$1 days ago',
    ta: '$1 நாட்களுக்கு முன்',
  },
  {
    pattern: /රු\.\s*([\d,]+)/g,
    en: 'Rs. $1',
    ta: 'ரூ. $1',
  },
  {
    pattern: /රුපියල්\s*([\d,]+)/g,
    en: 'Rs. $1',
    ta: 'ரூ. $1',
  },
  {
    pattern: /(\d+)\s*දෙනෙක්/g,
    en: '$1 person(s)',
    ta: '$1 நபர்கள்',
  },
  {
    pattern: /(\d+)\s*ක්/g,
    en: '$1 item(s)',
    ta: '$1 உருப்படிகள்',
  },
];

/**
 * Clean dual-language parenthetical text (e.g., "නැවුම් කීරි සම්බා සහල් (Keeri Samba Rice)"
 * or "විදුලි කාර්මික (Electrician)") to return ONLY ONE pristine language without mixed brackets.
 */
export const cleanBilingualParentheses = (text: string, targetLang: 'si' | 'en' | 'ta'): string => {
  if (!text) return '';
  const trimmed = text.trim();

  // Pattern: "Sinhala Text (English Text)" with optional trailing commas/spaces
  const match = trimmed.match(/^([\u0D80-\u0DFF\s0-9.,_&'/\-—–]+)[\s]*\(([A-Za-z0-9\s/.,&'+-—–]+)\)[\s,.]*$/);
  if (match) {
    const sinhalaPart = match[1].trim().replace(/[,]+$/, '');
    const englishPart = match[2].trim();

    if (targetLang === 'si') {
      return sinhalaPart;
    }
    if (targetLang === 'en') {
      return englishPart;
    }
    if (targetLang === 'ta') {
      return POST_DICTIONARY[sinhalaPart]?.ta || POST_DICTIONARY[englishPart]?.ta || sinhalaPart;
    }
  }

  // Pattern: "English Text (Sinhala Text)"
  const reverseMatch = trimmed.match(/^([A-Za-z0-9\s/.,&'+-—–]+)[\s]*\(([\u0D80-\u0DFF\s0-9.,_&'/\-—–]+)\)[\s,.]*$/);
  if (reverseMatch) {
    const englishPart = reverseMatch[1].trim();
    const sinhalaPart = reverseMatch[2].trim();

    if (targetLang === 'si') {
      return sinhalaPart;
    }
    if (targetLang === 'en') {
      return englishPart;
    }
    if (targetLang === 'ta') {
      return POST_DICTIONARY[sinhalaPart]?.ta || POST_DICTIONARY[englishPart]?.ta || englishPart;
    }
  }

  // If in Sinhala mode, strip embedded "(English Translation)" brackets while preserving technical codes/units
  if (targetLang === 'si') {
    return trimmed.replace(/\s*\(([A-Za-z\s/&'-]{3,})\)/g, (full, inner) => {
      if (/^(HP|kW|ft|kg|km|NIC|OTP|ID|AES-256|Rs|USD|W|V|LED|CCTV|AC)$/i.test(inner.trim())) {
        return full;
      }
      return '';
    }).trim();
  }

  return trimmed;
};

/**
 * Translates a single text string according to the active language (si, en, ta),
 * ensuring NO mixed-language words or bilingual leaks appear in the UI.
 */
export const translateText = (text?: string, lang: Language | string = 'si'): string => {
  if (!text) return '';
  const trimmed = text.trim();
  const targetLang: 'si' | 'en' | 'ta' = (lang === 'en' || lang === 'ta') ? lang : 'si';

  // 1. First, resolve any bilingual parenthetical formats e.g. "නැවුම් කීරි සම්බා සහල් (Keeri Samba Rice)"
  const cleaned = cleanBilingualParentheses(trimmed, targetLang);

  if (targetLang === 'si') {
    // If exact dictionary match has clean Sinhala override, use it
    if (POST_DICTIONARY[cleaned]?.si) {
      return POST_DICTIONARY[cleaned].si!;
    }
    if (POST_DICTIONARY[trimmed]?.si) {
      return POST_DICTIONARY[trimmed].si!;
    }
    for (const [sKey, trans] of Object.entries(POST_DICTIONARY)) {
      if (trans.en && trans.en.toLowerCase() === cleaned.toLowerCase()) {
        return trans.si || sKey;
      }
      if (trans.ta && trans.ta.toLowerCase() === cleaned.toLowerCase()) {
        return trans.si || sKey;
      }
    }
    return cleaned;
  }

  // 2. Direct dictionary match for entire string
  if (POST_DICTIONARY[cleaned]) {
    return POST_DICTIONARY[cleaned][targetLang] || POST_DICTIONARY[cleaned].en || cleaned;
  }
  if (POST_DICTIONARY[trimmed]) {
    return POST_DICTIONARY[trimmed][targetLang] || POST_DICTIONARY[trimmed].en || cleaned;
  }

  // 2b. Check inverse match (if source is in English or Tamil)
  for (const [, trans] of Object.entries(POST_DICTIONARY)) {
    if (trans.en && trans.en.toLowerCase() === cleaned.toLowerCase()) {
      return trans[targetLang] || cleaned;
    }
    if (trans.ta && trans.ta.toLowerCase() === cleaned.toLowerCase()) {
      return trans[targetLang] || cleaned;
    }
  }

  // 3. Exact sub-phrase lookups (sort by longest phrase first to prevent partial word collisions)
  let result = cleaned;
  const sortedPhrases = Object.entries(POST_DICTIONARY).sort((a, b) => b[0].length - a[0].length);

  for (const [key, trans] of sortedPhrases) {
    if (key.length > 3 && result.includes(key)) {
      const replacement = trans[targetLang] || trans.en;
      if (replacement) {
        result = result.replaceAll(key, replacement);
      }
    }
  }

  // 3b. English sub-phrase lookups (when input string contains English phrases)
  if (targetLang === 'ta') {
    for (const [, trans] of sortedPhrases) {
      if (trans.en && trans.en.length > 3 && result.toLowerCase().includes(trans.en.toLowerCase())) {
        const replacement = trans.ta;
        if (replacement) {
          const regex = new RegExp(trans.en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
          result = result.replace(regex, replacement);
        }
      }
    }
  }

  // 4. Regex structural replacements
  for (const item of PATTERN_REPLACEMENTS) {
    if (item.pattern.test(result)) {
      result = result.replace(item.pattern, (item[targetLang] || item.en) as any);
    }
  }

  // 5. Word-by-word tokenized translation if still containing Sinhala Unicode
  const containsSinhala = /[\u0D80-\u0DFF]/.test(result);
  if (containsSinhala) {
    // Sort lexicon words by length descending to match composite words before single words
    const sortedLexicon = Object.entries(WORD_LEXICON).sort((a, b) => b[0].length - a[0].length);

    for (const [sinhalaWord, trans] of sortedLexicon) {
      if (result.includes(sinhalaWord)) {
        const replacement = trans[targetLang] || trans.en;
        result = result.replaceAll(sinhalaWord, replacement);
      }
    }

    // Replace district & location names
    result = translateLocation(result, targetLang);
  }

  // Final cleanup: remove double spaces or leftover awkward punctuation
  result = result.replace(/\s{2,}/g, ' ').trim();

  return result;
};

/**
 * Returns a localized HelpPost where all displayable fields match the selected language (si, en, ta)
 */
export const getLocalizedPost = (post: HelpPost, lang: Language | string = 'si'): HelpPost => {
  if (!post) return post;

  return {
    ...post,
    tagName: translateText(post.tagName, lang),
    tagCategory: translateText(post.tagCategory, lang),
    whatHappened: translateText(post.whatHappened, lang),
    whatIsNeeded: translateText(post.whatIsNeeded, lang),
    conditions: translateText(post.conditions, lang),
    specialNotice: translateText(post.specialNotice, lang),
    transport: translateText(post.transport, lang),
    payment: translateText(post.payment, lang),
    locationName: translateLocation(post.locationName, lang),
    incidentLocation: translateLocation(post.incidentLocation, lang),
    itemLostStolenOrSearched: translateText(post.itemLostStolenOrSearched, lang),
    otherDetails: translateText(post.otherDetails, lang),
    rewardDetails: translateText(post.rewardDetails, lang),
    deliveryOption: translateText(post.deliveryOption, lang),
    donationItem: translateText(post.donationItem, lang),
    donationRecipient: translateText(post.donationRecipient, lang),
    donationDeliveryMethod: translateText(post.donationDeliveryMethod, lang),
    exchangeHaveItem: translateText(post.exchangeHaveItem, lang),
    exchangeWantItem: translateText(post.exchangeWantItem, lang),
    identifyingInfo: translateText(post.identifyingInfo, lang),
    replies: post.replies ? post.replies.map(r => ({
      ...r,
      message: translateText(r.message, lang),
      responderName: translateLocation(r.responderName, lang),
    })) : post.replies,
  };
};

/**
 * Common card and UI labels localized for feed cards (Pure single-language values)
 */
export const getCardLabels = (lang: Language | string = 'si') => {
  if (lang === 'en') {
    return {
      elapsedTime: 'Time elapsed:',
      live: '⏱️ Live',
      supportConfirmed: '✅ Support Confirmed',
      confirmedHelper: 'Confirmed Helper:',
      accountHolder: 'Account Holder',
      whatHappened: 'What Happened:',
      whatIsNeeded: 'What is Needed:',
      conditions: 'Conditions:',
      specialNotice: 'Special Notice:',
      transport: 'Transport:',
      payment: 'Payment / Fee:',
      helpersNeeded: 'Helpers needed:',
      personSuffix: 'person(s)',
      saved: 'Saved',
      save: 'Save',
      confirmed: 'Confirmed',
      askPhoneChat: '🔒 Request Phone (Chat)',
      ourChat: 'In-App Chat',
      call: 'Call',
      whatsapp: 'WhatsApp',
      mapRoute: 'Map Route',
      addressProtected: '🔒 Address Protected',
      details: 'More Details:',
      interestedCount: 'Interested Responders:',
      peopleSuffix: 'people',
      newBadge: '✨ New',
      personLabel: 'Person:',
      viewAndConfirm: 'View and Confirm ➔',
      viewAllResponses: 'View all responses...',
      iCanHelp: '🤝 I Can Help',
      youOfferedHelp: '✓ You Offered Support',
      alreadyConfirmedByOther: '🔒 Confirmed by another helper',
      chatAboutPost: '💬 Chat About Post',
      edit: 'Edit',
      view: 'View',
      delete: 'Delete',
      boostTopAd: '🚀 Boost Top Ad (Rs. 250)',
      boostedTopAd: '⭐ TOP AD',
      quickServicePriority: '⚡ Quick Service Priority',
    };
  }
  if (lang === 'ta') {
    return {
      elapsedTime: 'கடந்த நேரம்:',
      live: '⏱️ நேரலை',
      supportConfirmed: '✅ உதவி உறுதிப்படுத்தப்பட்டது',
      confirmedHelper: 'உறுதிப்படுத்தப்பட்ட உதவியாளர்:',
      accountHolder: 'கணக்கு வைத்திருப்பவர்',
      whatHappened: 'என்ன நடந்தது:',
      whatIsNeeded: 'தேவையான உதவி:',
      conditions: 'நிபந்தனைகள்:',
      specialNotice: 'சிறப்பு அறிவிப்பு:',
      transport: 'போக்குவரத்து:',
      payment: 'கட்டணம்:',
      helpersNeeded: 'தேவையான உதவியாளர்கள்:',
      personSuffix: 'நபர்',
      saved: 'சேமிக்கப்பட்டது',
      save: 'சேமிக்க',
      confirmed: 'உறுதியானது',
      askPhoneChat: '🔒 எண் கேட்க (Chat)',
      ourChat: 'எங்கள் Chat',
      call: 'அழைக்கவும்',
      whatsapp: 'WhatsApp',
      mapRoute: 'வரைபட பாதை',
      addressProtected: '🔒 முகவரி பாதுகாக்கப்பட்டுள்ளது',
      details: 'கூடுதல் விவரங்கள்:',
      interestedCount: 'ஆர்வமுள்ளவர்கள்:',
      peopleSuffix: 'பேர்',
      newBadge: '✨ புதிய',
      personLabel: 'நபர்:',
      viewAndConfirm: 'பார்த்து உறுதிப்படுத்த ➔',
      viewAllResponses: 'அனைத்து பதில்களையும் காண்க...',
      iCanHelp: '🤝 நான் உதவ முடியும்',
      youOfferedHelp: '✓ நீங்கள் உதவ முன்வந்தீர்கள்',
      alreadyConfirmedByOther: '🔒 பிற உதவியாளரால் உறுதிப்படுத்தப்பட்டது',
      chatAboutPost: '💬 விளம்பரம் பற்றி Chat',
      edit: 'திருத்து',
      view: 'பார்வை',
      delete: 'நீக்கு',
      boostTopAd: '🚀 முக்கிய விளம்பரமாக மாற்று (ரூ. 250)',
      boostedTopAd: '⭐ TOP AD',
      quickServicePriority: '⚡ விரைவு சேவை முன்னுரிமை',
    };
  }
  return {
    elapsedTime: 'ගතවූ කාලය:',
    live: '⏱️ සජීවී',
    supportConfirmed: '✅ සහය සනාථ කර ඇත',
    confirmedHelper: 'තෝරාගත් සහායකයා:',
    accountHolder: 'ගිණුම් හිමියා',
    whatHappened: 'සිදුවී ඇති දේ:',
    whatIsNeeded: 'වියයුතු දේ:',
    conditions: 'කොන්දේසි:',
    specialNotice: 'විශේෂ දැනුවත් කිරීම:',
    transport: 'ගමනාගමනය:',
    payment: 'ගෙවීම් :',
    helpersNeeded: 'අවශ්‍ය සහායකයින් ගණන:',
    personSuffix: 'කි.',
    saved: 'සුරකින්න',
    save: 'සුරකින්න',
    confirmed: 'සනාථයි',
    askPhoneChat: '🔒 අංකය විමසන්න (චැට්)',
    ourChat: 'අපගේ චැට්',
    call: 'ඇමතුමක්',
    whatsapp: 'WhatsApp',
    mapRoute: 'සිතියම් මාර්ගය',
    addressProtected: '🔒 ලිපිනය ආරක්ෂිතයි',
    details: 'වැඩි විස්තර:',
    interestedCount: 'කැමැත්ත දැක්වූවන්:',
    peopleSuffix: 'දෙනෙක්',
    newBadge: '✨ නව',
    personLabel: 'පුද්ගලයා:',
    viewAndConfirm: 'බලා තහවුරු කරන්න ➔',
    viewAllResponses: 'සියලු ප්‍රතිචාර බලන්න...',
    iCanHelp: '🤝 මට සහය විය හැක',
    youOfferedHelp: '✓ ඔබ සහය දැක්වූවා',
    alreadyConfirmedByOther: '🔒 වෙනත් සහායකයෙක් සනාථ කර ඇත',
    chatAboutPost: '💬 දැන්වීම ගැන කතාබස් කරන්න',
    edit: 'සංස්කරණය',
    view: 'බලන්න',
    delete: 'ඉවත් කරන්න',
    boostTopAd: '🚀 විශේෂිත දැන්වීම (රු. 250)',
    boostedTopAd: '⭐ විශේෂිත දැන්වීම',
    quickServicePriority: '⚡ ඉක්මන් සේවා ප්‍රමුඛතාවය',
  };
};

/**
 * Translate location names to English or Tamil transliterations cleanly
 */
export const translateLocation = (locName?: string, lang: Language | string = 'si'): string => {
  if (!locName || lang === 'si') return locName || '';
  
  if (lang === 'en') {
    return locName
      .replace(/කඩවත/g, 'Kadawatha')
      .replace(/කොළඹ/g, 'Colombo')
      .replace(/කටුනායක/g, 'Katunayake')
      .replace(/මීගමුව/g, 'Negombo')
      .replace(/ගම්පහ/g, 'Gampaha')
      .replace(/කෝවින්න/g, 'Kovinna')
      .replace(/නුවර පාර/g, 'Kandy Road')
      .replace(/ගංගාරාම පාර/g, 'Gangarama Road')
      .replace(/බස් නැවතුම්පොළ/g, 'Bus Stand')
      .replace(/පෙරියමුල්ල/g, 'Periyamulla')
      .replace(/කොළඹ-පුත්තලම පාර/g, 'Colombo-Puttalam Road')
      .replace(/කළුතර/g, 'Kalutara')
      .replace(/පානදුර/g, 'Panadura')
      .replace(/මහරගම/g, 'Maharagama')
      .replace(/හෝමාගම/g, 'Homagama')
      .replace(/නිට්ටඹුව/g, 'Nittambuwa')
      .replace(/මීරිගම/g, 'Mirigama')
      .replace(/ජා-ඇල/g, 'Ja-Ela')
      .replace(/වත්තල/g, 'Wattala')
      .replace(/කැළණිය/g, 'Kelaniya')
      .replace(/කුරුණෑගල/g, 'Kurunegala')
      .replace(/මහනුවර/g, 'Kandy')
      .replace(/ගාල්ල/g, 'Galle')
      .replace(/මාතර/g, 'Matara')
      .replace(/රත්නපුර/g, 'Ratnapura')
      .replace(/අනුරාධපුර/g, 'Anuradhapura')
      .replace(/පුත්තලම/g, 'Puttalam')
      .replace(/යාපනය/g, 'Jaffna');
  }

  if (lang === 'ta') {
    return locName
      .replace(/කඩවත/g, 'கடவத்தை')
      .replace(/කොළඹ/g, 'கொழும்பு')
      .replace(/කටුනායක/g, 'கட்டுநாயக்க')
      .replace(/මීගමුව/g, 'நீர்கொழும்பு')
      .replace(/ගම්පහ/g, 'கம்பஹா')
      .replace(/කෝවින්න/g, 'கோவின்ன')
      .replace(/නුවර පාර/g, 'கண்டி வீதி')
      .replace(/ගංගාරාම පාර/g, 'கங்காராம வீதி')
      .replace(/බස් නැවතුම්පොළ/g, 'பஸ் நிலையம்')
      .replace(/කළුතර/g, 'களுத்துறை')
      .replace(/පානදුර/g, 'பாணந்துறை')
      .replace(/මහරගම/g, 'மஹரகம')
      .replace(/හෝමාගම/g, 'ஹோமாகம')
      .replace(/ජා-ඇල/g, 'ஜா-எல')
      .replace(/වත්තල/g, 'வத்தளை')
      .replace(/කැළණිය/g, 'களனி')
      .replace(/කුරුණෑගල/g, 'குருநாகல்')
      .replace(/මහනුවර/g, 'கண்டி')
      .replace(/ගාල්ල/g, 'காலி')
      .replace(/මාතර/g, 'மாத்தறை')
      .replace(/යාපනය/g, 'யாழ்ப்பாணம்');
  }

  return locName;
};
