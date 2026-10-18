/**
 * Sri Lanka Districts & Police Divisions Geographical Dataset
 * Sahaya Sewa Platform
 */

export const SRI_LANKA_DISTRICTS: string[] = [
  'Colombo',
  'Gampaha',
  'Kalutara',
  'Kandy',
  'Matale',
  'Nuwara Eliya',
  'Galle',
  'Matara',
  'Hambantota',
  'Jaffna',
  'Kilinochchi',
  'Mannar',
  'Vavuniya',
  'Mullaitivu',
  'Batticaloa',
  'Ampara',
  'Trincomalee',
  'Kurunegala',
  'Puttalam',
  'Anuradhapura',
  'Polonnaruwa',
  'Badulla',
  'Monaragala',
  'Ratnapura',
  'Kegalle'
];

export const SRI_LANKA_POLICE_DIVISIONS: Record<string, string[]> = {
  // 1. කොළඹ දිස්ත්‍රික්කය
  Colombo: [
    'Fort', 'Pettah', 'Kollupitiya', 'Bambalapitiya', 'Wellawatte', 'Cinnamon Gardens',
    'Slave Island', 'Maradana', 'Borella', 'Dematagoda', 'Grandpass', 'Kotahena',
    'Modara', 'Mattakkuliya', 'Narahenpita', 'Kirulapone', 'Thimbirigasyaya', 'Hulftsdorp',
    'Mount Lavinia', 'Dehiwala', 'Ratmalana', 'Moratuwa', 'Angulana', 'Egoda Uyana',
    'Kohuwala', 'Wellampitiya', 'Mulleriyawa', 'Gothatuwa', 'Nugegoda', 'Mirihana',
    'Maharagama', 'Kottawa', 'Homagama', 'Padukka', 'Avissawella', 'Hanwella', 'Kosgama'
  ],

  // 2. ගම්පහ දිස්ත්‍රික්කය
  Gampaha: [
    'Gampaha', 'Yakkala', 'Mirigama', 'Veyangoda', 'Nittambuwa', 'Pasyala',
    'Negombo', 'Katunayake', 'Seeduwa', 'Kochchikade', 'Ja-Ela', 'Kandana',
    'Ragama', 'Kelaniya', 'Peliyagoda', 'Kiribathgoda', 'Kadawatha', 'Biyagama',
    'Sapugaskanda', 'Dompe', 'Malwathuhiripitiya', 'Minuwangoda', 'Divulapitiya', 'Pugoda'
  ],

  // 3. කළුතර දිස්ත්‍රික්කය
  Kalutara: [
    'Kalutara North', 'Kalutara South', 'Panadura North', 'Panadura South', 'Wadduwa',
    'Beruwala', 'Aluthgama', 'Payagala', 'Maggona', 'Matugama', 'Agalawatta',
    'Dodangoda', 'Horana', 'Ingiriya', 'Moragahahena', 'Bulathsinhala', 'Baduraliya', 'Tebuwana'
  ],

  // 4. මහනුවර දිස්ත්‍රික්කය
  Kandy: [
    'Kandy', 'Peradeniya', 'Katugastota', 'Gampola', 'Nawalapitiya', 'Kadugannawa',
    'Kundasale', 'Teldeniya', 'Menikhinna', 'Wattegama', 'Panwila', 'Alawatugoda',
    'Pussellawa', 'Hasalaka', 'Medamahanuwara', 'Talatuoya', 'Daulagala'
  ],

  // 5. මාතලේ දිස්ත්‍රික්කය
  Matale: [
    'Matale', 'Dambulla', 'Galewela', 'Sigiriya', 'Naula', 'Ukuwela', 'Rattota',
    'Yatawatta', 'Wilgamuwa', 'Laggala'
  ],

  // 6. නුවරඑළිය දිස්ත්‍රික්කය
  'Nuwara Eliya': [
    'Nuwara Eliya', 'Hatton', 'Talawakele', 'Norwood', 'Bogawantalawa', 'Maskeliya',
    'Kotagala', 'Nanuoya', 'Ragala', 'Walapane', 'Hanguranketha', 'Ginigathena', 'Norton Bridge'
  ],

  // 7. ගාල්ල දිස්ත්‍රික්කය
  Galle: [
    'Galle', 'Karapitiya', 'Dadalla', 'Habaraduwa', 'Ahangama', 'Hikkaduwa',
    'Rathgama', 'Ambalangoda', 'Meetiyagoda', 'Ahungalla', 'Elpitiya', 'Pitigala',
    'Baddegama', 'Nagoda', 'Udugama', 'Neluwa', 'Hiniduma', 'Bentota'
  ],

  // 8. මාතර දිස්ත්‍රික්කය
  Matara: [
    'Matara', 'Gandara', 'Dickwella', 'Kekanadurra', 'Devinuwara', 'Weligama',
    'Akuressa', 'Hakmana', 'Kamburupitiya', 'Deniyaya', 'Morawaka', 'Pitabeddara', 'Urumpitiya'
  ],

  // 9. හම්බන්තොට දිස්ත්‍රික්කය
  Hambantota: [
    'Hambantota', 'Tangalle', 'Beliatta', 'Ambalantota', 'Tissamaharama', 'Kataragama',
    'Walasmulla', 'Weeraketiya', 'Middeniya', 'Sooriyawewa', 'Hungama', 'Katuwana'
  ],

  // 10. යාපනය දිස්ත්‍රික්කය
  Jaffna: [
    'Jaffna', 'Chunnakam', 'Kankesanthurai', 'Tellippalai', 'Manipay', 'Valvettithurai',
    'Point Pedro', 'Kodikamam', 'Chavakachcheri', 'Kayts', 'Vaddukoddai', 'Karainagar'
  ],

  // 11. කිලිනොච්චිය දිස්ත්‍රික්කය
  Kilinochchi: [
    'Kilinochchi', 'Pallai', 'Poonakary', 'Dharmapuram'
  ],

  // 12. මන්නාරම දිස්ත්‍රික්කය
  Mannar: [
    'Mannar', 'Talaimannar', 'Murunkan', 'Silavathurai', 'Adampan'
  ],

  // 13. වවුනියාව දිස්ත්‍රික්කය
  Vavuniya: [
    'Vavuniya', 'Nedunkeni', 'Chettikulam', 'Omanthai', 'Poovarasankulam'
  ],
  // 14. මුලතිව් දිස්ත්‍රික්කය
  Mullaitivu: [
    'Mullaitivu', 'Mulliyawalai', 'Oddusuddan', 'Puthukkudiyiruppu', 'Mankulam', 'Kokkilai'
  ],

  // 15. මඩකලපුව දිස්ත්‍රික්කය
  Batticaloa: [
    'Batticaloa', 'Kattankudy', 'Eravur', 'Valaichchenai', 'Kalkudah', 'Kokkadichcholai',
    'Vellavely', 'Kaluwanchikudy', 'Karadiyanaru'
  ],

  // 16. අම්පාර දිස්ත්‍රික්කය
  Ampara: [
    'Ampara', 'Kalmunai', 'Sammanthurai', 'Akkaraipattu', 'Pottuvil', 'Uhana',
    'Damana', 'Padiyatalawa', 'Mahaoya', 'Dehiattakandiya', 'Sainthamaruthu', 'Addalaichenai'
  ],

  // 17. ත්‍රිකුණාමලය දිස්ත්‍රික්කය
  Trincomalee: [
    'Trincomalee', 'Harbour Police', 'China Bay', 'Uppuveli', 'Nilaveli', 'Kantale',
    'Kinniya', 'Muttur', 'Serunuwara', 'Pulmoddai', 'Thambalagamuwa'
  ],

  // 18. කුරුණෑගල දිස්ත්‍රික්කය
  Kurunegala: [
    'Kurunegala', 'Kuliyapitiya', 'Pannala', 'Narammala', 'Giriulla', 'Alawwa',
    'Polgahawela', 'Mawatagama', 'Wariyapola', 'Nikaweratiya', 'Bingiriya',
    'Hettipola', 'Dummalasuriya', 'Ibbagamuwa', 'Galgamuwa', 'Mahawa', 'Gokarella'
  ],

  // 19. පුත්තලම දිස්ත්‍රික්කය
  Puttalam: [
    'Puttalam', 'Chilaw', 'Marawila', 'Wennappuwa', 'Dankotuwa', 'Anamaduwa',
    'Kalpitiya', 'Norochcholai', 'Mundalama', 'Madampe', 'Wanathawilluwa', 'Mahawewa'
  ],

  // 20. අනුරාධපුරය දිස්ත්‍රික්කය
  Anuradhapura: [
    'Anuradhapura', 'Medawachchiya', 'Kebithigollewa', 'Padaviya', 'Kekirawa',
    'Habarana', 'Galnewa', 'Thambuttegama', 'Nochchiyagama', 'Talawa', 'Eppawala',
    'Horowpathana', 'Kahatagasdigiliya', 'Mihintale'
  ],

  // 21. පොළොන්නරුව දිස්ත්‍රික්කය
  Polonnaruwa: [
    'Polonnaruwa', 'Kaduruwela', 'Hingurakgoda', 'Minneriya', 'Medirigiriya',
    'Bakamuna', 'Aralaganwila', 'Dimbulagala', 'Welikanda'
  ],

  // 22. බදුල්ල දිස්ත්‍රික්කය
  Badulla: [
    'Badulla', 'Bandarawela', 'Hali-Ela', 'Diyatalawa', 'Haputale', 'Ella',
    'Welimada', 'Mahiyanganaya', 'Passara', 'Girandurukotte', 'Kandeketiya', 'Lunugala'
  ],

  // 23. මොණරාගල දිස්ත්‍රික්කය
  Monaragala: [
    'Monaragala', 'Wellawaya', 'Buttala', 'Bibile', 'Kataragama', 'Siyambalanduwa',
    'Badalkumbura', 'Medagama', 'Thanamalwila'
  ],

  // 24. රත්නපුර දිස්ත්‍රික්කය
  Ratnapura: [
    'Ratnapura', 'Pelmadulla', 'Balangoda', 'Kahawatta', 'Kuruwita', 'Eheliyagoda',
    'Godakawela', 'Embilipitiya', 'Rakwana', 'Kolonna', 'Kalawana', 'Ayagama', 'Nivitigala'
  ],

  // 25. කෑගල්ල දිස්ත්‍රික්කය
  Kegalle: [
    'Kegalle', 'Mawanella', 'Warakapola', 'Rambukkana', 'Ruwanwella', 'Yatiyantota',
    'Deraniyagala', 'Dehiowita', 'Kitulgala', 'Aranayaka', 'Hemmathagama'
  ]
};
