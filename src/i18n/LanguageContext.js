import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import {
  MuktaMalar_400Regular,
  MuktaMalar_500Medium,
  MuktaMalar_600SemiBold,
  MuktaMalar_700Bold,
} from '@expo-google-fonts/mukta-malar';

const LANGUAGE_KEY = '@farmer-support-system/language';
const LanguageContext = createContext({ language: 'en', setLanguage: () => {}, translate: (value) => value });

const tamilTranslations = {
  'Farm tools': 'வயல் கருவிகள்',
  'Farm weather': 'வயல் வானிலை',
  'Check current conditions and the next 7 days for your area.': 'உங்கள் பகுதியின் தற்போதைய நிலை மற்றும் அடுத்த 7 நாள் வானிலையைப் பாருங்கள்.',
  'View forecast  ›': 'முன்னறிவிப்பைப் பார்க்கவும்  ›',
  'FIELD CONDITIONS': 'வயல் நிலைமைகள்',
  'Plan irrigation, spraying, and harvest around the forecast.': 'முன்னறிவிப்புக்கு ஏற்ப பாசனம், தெளிப்பு மற்றும் அறுவடையைத் திட்டமிடுங்கள்.',
  'City or town': 'நகரம் அல்லது ஊர்',
  'Enter a city or town': 'நகரம் அல்லது ஊரை உள்ளிடவும்',
  'Enter a city or town to search.': 'தேட நகரம் அல்லது ஊரை உள்ளிடவும்.',
  'Could not find that location. Check the name and try again.': 'அந்த இடத்தைக் கண்டறிய முடியவில்லை. பெயரைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.',
  'No matching location found. Try a nearby city or town.': 'பொருந்தும் இடம் கிடைக்கவில்லை. அருகிலுள்ள நகரம் அல்லது ஊரை முயற்சிக்கவும்.',
  'Weather data is unavailable right now. Please try again.': 'வானிலைத் தரவு இப்போது கிடைக்கவில்லை. மீண்டும் முயற்சிக்கவும்.',
  'Search to see current conditions and the next 7 days.': 'தற்போதைய நிலை மற்றும் அடுத்த 7 நாள் வானிலையைப் பார்க்கத் தேடுங்கள்.',
  'Finding local conditions...': 'உள்ளூர் வானிலை நிலவரம் தேடப்படுகிறது...',
  'Clear sky': 'தெளிவான வானம்',
  'Partly cloudy': 'ஓரளவு மேகமூட்டம்',
  'Overcast': 'முழு மேகமூட்டம்',
  'Fog': 'மூடுபனி',
  'Drizzle': 'தூறல்',
  'Showers': 'மழை',
  'Snow': 'பனிப்பொழிவு',
  'Thunderstorms': 'இடியுடன் கூடிய மழை',
  'Conditions unavailable': 'வானிலை நிலவரம் கிடைக்கவில்லை',
  'HUMIDITY': 'ஈரப்பதம்',
  'WIND': 'காற்று',
  'RAIN NOW': 'தற்போதைய மழை',
  'FIELD NOTE': 'வயல் குறிப்பு',
  'Plan around wet weather': 'மழைக்கேற்பத் திட்டமிடுங்கள்',
  'Use the forecast to plan field work': 'முன்னறிவிப்பைப் பயன்படுத்தி வயல் பணிகளைத் திட்டமிடுங்கள்',
  'Rain is expected today. Delay field spraying and avoid moving machinery on saturated soil. Check drainage and protect harvested produce.': 'இன்று மழை எதிர்பார்க்கப்படுகிறது. தெளிப்பைத் தள்ளிவைத்து, நீர் தேங்கிய மண்ணில் இயந்திரங்களை இயக்க வேண்டாம். வடிகாலைச் சரிபார்த்து, அறுவடைப் பொருட்களைப் பாதுகாக்கவும்.',
  'Winds are elevated today. Take care with field work and avoid spraying in conditions that could cause drift. Check soil moisture before irrigating.': 'இன்று காற்றின் வேகம் அதிகமாக உள்ளது. வயல் பணிகளில் கவனம் செலுத்துங்கள்; தெளிப்பு காற்றில் பரவும் சூழலைத் தவிர்க்கவும். பாசனத்திற்கு முன் மண் ஈரத்தைச் சரிபார்க்கவும்.',
  'No significant rain is forecast today. Check soil moisture before irrigating, and use local guidance to plan spraying and field work.': 'இன்று குறிப்பிடத்தக்க மழை முன்னறிவிக்கப்படவில்லை. பாசனத்திற்கு முன் மண் ஈரத்தைச் சரிபார்த்து, தெளிப்பு மற்றும் வயல் பணிகளுக்கு உள்ளூர் வழிகாட்டுதலைப் பின்பற்றவும்.',
  'Next 7 days': 'அடுத்த 7 நாட்கள்',
  'Forecast from Open-Meteo. Local conditions may vary; follow district advisories.': 'Open-Meteo வழங்கும் முன்னறிவிப்பு. உள்ளூர் நிலை மாறலாம்; மாவட்ட அறிவுறுத்தல்களைப் பின்பற்றவும்.',
  'Plant health scan': 'பயிர் நலப் பரிசோதனை',
  'Add a plant photo and record the symptoms you can see.': 'பயிர் புகைப்படத்தைச் சேர்த்து, காணும் அறிகுறிகளைத் தேர்ந்தெடுக்கவும்.',
  'Check a plant  ›': 'பயிரைப் பரிசோதிக்கவும்  ›',
  'PLANT HEALTH CHECK': 'பயிர் நலப் பரிசோதனை',
  'Add a clear plant photo for disease assessment.': 'நோய் மதிப்பீட்டிற்காக தெளிவான பயிர் புகைப்படத்தைச் சேர்க்கவும்.',
  'Online plant disease screening': 'ஆன்லைன் பயிர் நோய் பரிசோதனை',
  'Your photo is uploaded to a public Hugging Face service for classification as Healthy, Powdery Mildew, or Rust. It may not recognize other crops or diseases; confirm results with a local agricultural advisor.': 'உங்கள் புகைப்படம் ஆரோக்கியம், பூஞ்சைத் தூள் நோய் அல்லது துரு நோய் என வகைப்படுத்த பொதுவான Hugging Face சேவைக்கு பதிவேற்றப்படுகிறது. பிற பயிர்கள் அல்லது நோய்களை இது அடையாளம் காணாமல் இருக்கலாம்; முடிவை உள்ளூர் வேளாண் ஆலோசகரிடம் உறுதிப்படுத்தவும்.',
  'Diagnose photo': 'புகைப்படத்தைப் பரிசோதிக்கவும்',
  'Analyzing photo…': 'புகைப்படத்தைப் பகுப்பாய்வு செய்கிறது…',
  '1. Healthy': '1. ஆரோக்கியமானது',
  'The model did not detect Powdery Mildew or Rust in this image.': 'இந்தப் படத்தில் பூஞ்சைத் தூள் நோய் அல்லது துரு நோயை மாதிரி கண்டறியவில்லை.',
  '2. Needs more maintenance': '2. கூடுதல் பராமரிப்பு தேவை',
  'The model detected signs of Powdery Mildew. Inspect affected leaves and contact a local agricultural advisor for crop-specific guidance.': 'பூஞ்சைத் தூள் நோயின் அறிகுறிகளை மாதிரி கண்டறிந்துள்ளது. பாதிக்கப்பட்ட இலைகளைப் பார்வையிட்டு, பயிருக்கு ஏற்ற வழிகாட்டுதலுக்கு உள்ளூர் வேளாண் ஆலோசகரை அணுகவும்.',
  '3. Bad': '3. மோசமான நிலை',
  'Your plant is in critical condition. Contact an agricultural advisor.': 'உங்கள் பயிர் மிகவும் கவலைக்கிடமான நிலையில் உள்ளது. வேளாண் ஆலோசகரைத் தொடர்புகொள்ளவும்.',
  'Detected:': 'கண்டறிந்தது:',
  'Confidence:': 'நம்பகத்தன்மை:',
  'Diagnosis unavailable': 'நோயறிதல் கிடைக்கவில்லை',
  'This is an automated screening result, not a confirmed diagnosis. For urgent crop loss or spreading disease, contact a local agricultural advisor.': 'இது தானியங்கி பரிசோதனை முடிவு மட்டுமே; உறுதிப்படுத்தப்பட்ட நோயறிதல் அல்ல. பயிர் இழப்பு அல்லது பரவும் நோய் ஏற்பட்டால் உள்ளூர் வேளாண் ஆலோசகரை அணுகவும்.',
  'Add a clear photo of one plant': 'ஒரு பயிரின் தெளிவான புகைப்படத்தைச் சேர்க்கவும்',
  'Upload photo': 'புகைப்படத்தைப் பதிவேற்றவும்',
  'For urgent crop loss or spreading disease, contact a local agricultural advisor. Do not use this screen as a diagnosis until an image-analysis service is connected.': 'பயிர் இழப்பு அல்லது பரவும் நோய் ஏற்பட்டால் உள்ளூர் வேளாண் ஆலோசகரை அணுகவும். படப் பகுப்பாய்வு சேவை இணைக்கப்படும் வரை இந்தத் திரையை நோயறிதலாகப் பயன்படுத்த வேண்டாம்.',
  'Plant photo needed': 'பயிர் புகைப்படம் தேவை',
  'Please upload or take a clear photo of the plant first.': 'முதலில் பயிரின் தெளிவான புகைப்படத்தைப் பதிவேற்றவும் அல்லது எடுக்கவும்.',
  'Camera permission needed': 'கேமரா அனுமதி தேவை',
  'Allow camera access to take a plant photo.': 'பயிர் புகைப்படம் எடுக்க கேமரா அனுமதி வழங்கவும்.',
  'Photo permission needed': 'புகைப்பட அனுமதி தேவை',
  'Allow photo access to upload a plant image.': 'பயிர் படத்தைப் பதிவேற்ற புகைப்பட அனுமதி வழங்கவும்.',
  'nav.Plants': 'பயிர்', 'nav.Harvest': 'அறுவடை', 'nav.Calendar': 'நாள்', 'nav.Reports': 'அறிக்கை', 'nav.Profile': 'கணக்கு',
  'AI Farmer Assistant': 'AI விவசாய உதவியாளர்',
  'Ask farming questions in English or Tamil': 'ஆங்கிலம் அல்லது தமிழில் விவசாயக் கேள்விகளைக் கேளுங்கள்',
  'FARMING SUPPORT': 'விவசாய உதவி',
  'Back': 'மீண்டும்',
  'Ask a farming question': 'விவசாயக் கேள்வியைக் கேளுங்கள்',
  'Clear': 'அழி',
  'Clear chat history': 'அரட்டை வரலாற்றை அழி',
  'Clear chat history?': 'அரட்டை வரலாற்றை அழிக்கவா?',
  'This permanently deletes the saved conversation.': 'சேமித்த உரையாடல் நிரந்தரமாக நீக்கப்படும்.',
  'Clear chat': 'அரட்டையை அழி',
  'Chat history could not be cleared. Please try again.': 'அரட்டை வரலாற்றை அழிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
  'Preparing farming advice…': 'விவசாய ஆலோசனை தயாராகிறது…',
  'SUGGESTED QUESTIONS': 'பரிந்துரைக்கப்படும் கேள்விகள்',
  'How can I improve my soil before planting?': 'நடவு செய்வதற்கு முன் மண்ணை எவ்வாறு மேம்படுத்தலாம்?',
  'What are the early signs of pest or disease in my crop?': 'பயிரில் பூச்சி அல்லது நோயின் ஆரம்ப அறிகுறிகள் என்ன?',
  'How should I plan irrigation during a dry week?': 'வறண்ட வாரத்தில் பாசனத்தை எவ்வாறு திட்டமிடலாம்?',
  'How do I choose good-quality seeds?': 'தரமான விதைகளை எவ்வாறு தேர்வு செய்வது?',
  'Send message': 'செய்தியை அனுப்பு',
  'AI': 'AI',
  'Plants': 'பயிர்கள்', 'Harvest': 'அறுவடை', 'Calendar': 'நாட்காட்டி', 'Reports': 'அறிக்கைகள்', 'Profile': 'சுயவிவரம்',
  'Harvest Planner': 'அறுவடை திட்டம்', 'Harvest Calendar': 'அறுவடை நாட்காட்டி', 'Reports & Analytics': 'அறிக்கைகள் மற்றும் பகுப்பாய்வு',
  'FARMER SUPPORT SYSTEM': 'விவசாயிகள் உதவி அமைப்பு', 'ADMIN REPORT': 'நிர்வாக அறிக்கை',
  'Understand how farmers use crop guidance and grow the field library.': 'விவசாயிகள் வழிகாட்டிகளை எவ்வாறு பயன்படுத்துகிறார்கள் என்பதை அறியுங்கள்.',
  'Application overview': 'செயலி அறிமுகம்', 'Date range': 'தேதி வரம்பு', 'Today': 'இன்று', 'Yesterday': 'நேற்று', 'Last 7 Days': 'கடந்த 7 நாட்கள்', 'Last 30 Days': 'கடந்த 30 நாட்கள்', 'Custom': 'தனிப்பயன்',
  'Start (YYYY-MM-DD)': 'தொடக்கம் (YYYY-MM-DD)', 'End (YYYY-MM-DD)': 'முடிவு (YYYY-MM-DD)', 'Enter a valid start and end date (YYYY-MM-DD).': 'சரியான தொடக்க மற்றும் முடிவு தேதியை உள்ளிடவும் (YYYY-MM-DD).',
  'Generate Report': 'அறிக்கையை உருவாக்கு', 'Refresh Data': 'தரவைப் புதுப்பி', 'Refreshing…': 'புதுப்பிக்கிறது…', 'Print Report': 'அறிக்கையை அச்சிடு', 'Download PDF': 'PDF பதிவிறக்கு', 'Export CSV': 'CSV ஏற்றுமதி',
  'Registered users': 'பதிவு செய்த பயனர்கள்', 'Active users': 'செயலில் உள்ள பயனர்கள்', "Today's active users": 'இன்றைய செயலில் உள்ள பயனர்கள்', 'New registrations today': 'இன்றைய புதிய பதிவுகள்', 'Total visits': 'மொத்த வருகைகள்', 'Total user sessions': 'மொத்த பயனர் அமர்வுகள்', 'Average session duration': 'சராசரி அமர்வு நேரம்', 'Most-used feature': 'அதிகம் பயன்படுத்திய அம்சம்',
  'Community': 'சமூகம்', 'View registered users and crop followers': 'பதிவு செய்த பயனர்கள் மற்றும் பயிர் பின்தொடர்பவர்களைப் பார்க்கவும்', 'COMMUNITY DIRECTORY': 'சமூக பட்டியல்', 'Users & plant follows': 'பயனர்கள் மற்றும் பயிர் பின்தொடர்வுகள்', 'Browse local accounts and see which crops farmers follow.': 'உள்ளூர் கணக்குகளையும் விவசாயிகள் பின்தொடரும் பயிர்களையும் பாருங்கள்.', 'Plant follows': 'பயிர் பின்தொடர்வுகள்',
  'Search username or role': 'பயனர் பெயர் அல்லது வகையைத் தேடுங்கள்', 'No users match your search.': 'உங்கள் தேடலுக்கு பயனர்கள் இல்லை.', 'No registered accounts are recorded on this device yet.': 'இந்த சாதனத்தில் பதிவு செய்யப்பட்ட கணக்குகள் இல்லை.', 'Demo farmer account · Built-in sample login': 'செயல்விளக்க விவசாயி கணக்கு · மாதிரி உள்நுழைவு', 'Joined': 'சேர்ந்த தேதி', 'Plant follow records are unavailable. Refresh the report to try again.': 'பயிர் பின்தொடர்வு விவரங்கள் கிடைக்கவில்லை. அறிக்கையைப் புதுப்பிக்கவும்.', 'No users following this crop yet': 'இந்தப் பயிரை யாரும் இன்னும் பின்தொடரவில்லை', 'No crop guides are available.': 'பயிர் வழிகாட்டிகள் இல்லை.', 'Only accounts and follows stored in this app installation are included. Passwords are never shown.': 'இந்த சாதனத்தில் சேமித்த கணக்குகள் மற்றும் பின்தொடர்வுகள் மட்டுமே காட்டப்படும். கடவுச்சொற்கள் காட்டப்படாது.',
  'Daily usage report': 'தினசரி பயன்பாட்டு அறிக்கை', 'Daily active users': 'தினசரி செயலில் உள்ள பயனர்கள்', 'Daily application visits': 'தினசரி செயலி வருகைகள்', 'Feature usage': 'அம்சப் பயன்பாடு', 'Peak usage times': 'அதிகப் பயன்பாட்டு நேரங்கள்', 'Usage comparisons': 'பயன்பாட்டு ஒப்பீடுகள்', 'This week vs last week': 'இந்த வாரம் மற்றும் கடந்த வாரம்', 'This month vs last month': 'இந்த மாதம் மற்றும் கடந்த மாதம்', 'Search date or feature…': 'தேதி அல்லது அம்சத்தைத் தேடுங்கள்…',
  'No usage data for this date range': 'இந்த தேதி வரம்பில் பயன்பாட்டுத் தரவு இல்லை', 'No usage records yet': 'பயன்பாட்டுப் பதிவுகள் இல்லை', 'Unable to load analytics': 'பகுப்பாய்வுத் தரவை ஏற்ற முடியவில்லை', 'Try again': 'மீண்டும் முயற்சி', 'Loading real usage records…': 'பயன்பாட்டுப் பதிவுகளை ஏற்றுகிறது…',
  'No tasks scheduled for this date.': 'இந்தத் தேதிக்கு பணிகள் இல்லை.', 'No Planning tasks scheduled for this date.': 'இந்தத் தேதிக்கு திட்டமிடல் பணிகள் இல்லை.', 'No Preparing tasks scheduled for this date.': 'இந்தத் தேதிக்கு தயாரிப்பு பணிகள் இல்லை.', 'No Planting tasks scheduled for this date.': 'இந்தத் தேதிக்கு நடவு பணிகள் இல்லை.', 'No Growing tasks scheduled for this date.': 'இந்தத் தேதிக்கு வளர்ச்சிப் பணிகள் இல்லை.', 'No Harvesting tasks scheduled for this date.': 'இந்தத் தேதிக்கு அறுவடை பணிகள் இல்லை.', 'No Selling tasks scheduled for this date.': 'இந்தத் தேதிக்கு விற்பனைப் பணிகள் இல்லை.',
  'GOOD MORNING,': 'காலை வணக்கம்,', 'What are you growing?': 'நீங்கள் என்ன பயிரிடுகிறீர்கள்?',
  'Find the right season, care routine, and harvest tips for your crop.': 'உங்கள் பயிருக்கு ஏற்ற பருவம், பராமரிப்பு முறை மற்றும் அறுவடை குறிப்புகளை அறியுங்கள்.',
  'Search crops...': 'பயிர்களைத் தேடுங்கள்...', 'Crop library': 'பயிர் வழிகாட்டிகள்', 'guides': 'வழிகாட்டிகள்',
  'Manage crop guides  ›': 'பயிர் வழிகாட்டிகளை நிர்வகிக்க  ›', 'No crop guides match your search.': 'உங்கள் தேடலுக்கு பயிர் வழிகாட்டிகள் இல்லை.',
  'PLANTING SEASON': 'நடவு பருவம்', 'Harvest tasks': 'அறுவடை பணிகள்', 'Following': 'பின்தொடர்கிறீர்கள்', 'Follow': 'பின்தொடர்',
  'FARM-TO-MARKET CHECKLIST': 'வயலிலிருந்து சந்தை வரை பணிப்பட்டியல்', 'When did you plant': 'எப்போது நடவு செய்தீர்கள்',
  'Add the planting date to start a checklist for this crop.': 'இந்தப் பயிரின் பணிப்பட்டியலைத் தொடங்க நடவு தேதியைச் சேர்க்கவும்.',
  'Planting date': 'நடவு தேதி', 'Save planting date': 'நடவு தேதியைச் சேமிக்கவும்', 'Crop guide harvest window:': 'வழிகாட்டியில் அறுவடை காலம்:',
  'Estimated date ranges are calculated from your planting date. Adjust the schedule for your variety, weather, and local field conditions.': 'உங்கள் நடவு தேதியிலிருந்து கணிக்கப்பட்ட தேதிகள் கணக்கிடப்பட்டுள்ளன. ரகம், வானிலை மற்றும் உள்ளூர் நிலைக்கு ஏற்ப மாற்றவும்.',
  'Field-to-market tasks': 'வயலிலிருந்து சந்தை வரை பணிகள்', 'STEP': 'படி', 'View on calendar  ›': 'நாட்காட்டியில் காண்க  ›',
  'Followed crops': 'பின்தொடரும் பயிர்கள்', 'YOUR FIELD WORKSPACE': 'உங்கள் வயல் பணிகள்', 'Harvest planner': 'அறுவடை திட்டம்',
  'Follow a crop from field preparation through harvest and market sale.': 'நிலத் தயாரிப்பிலிருந்து அறுவடை மற்றும் விற்பனை வரை பயிரைப் பின்தொடருங்கள்.',
  'FOLLOWING': 'பின்தொடர்கிறது', 'Your followed crops': 'நீங்கள் பின்தொடரும் பயிர்கள்', 'No followed crops yet': 'இன்னும் பயிர்களைப் பின்தொடரவில்லை',
  'Choose a crop to add its planting date and track harvest tasks.': 'நடவு தேதியைச் சேர்த்து பணிகளைக் கண்காணிக்க பயிரைத் தேர்ந்தெடுக்கவும்.',
  'Follow plants from the Plants tab and they will appear here.': 'பயிர்கள் பகுதியில் இருந்து பின்தொடர்ந்தால் அவை இங்கே தோன்றும்.',
  'Tap to add planting date': 'நடவு தேதியைச் சேர்க்கத் தொடுங்கள்', 'Browse plants': 'பயிர்களைப் பாருங்கள்',
  'YOUR CROP SCHEDULE': 'உங்கள் பயிர் அட்டவணை', 'Harvest calendar': 'அறுவடை நாட்காட்டி', 'Choose a crop and day to see what needs doing.': 'செய்ய வேண்டிய பணிகளைப் பார்க்க பயிரையும் நாளையும் தேர்ந்தெடுக்கவும்.',
  'Follow a crop from Plants and it will appear in your calendar.': 'பயிர்கள் பகுதியில் பின்தொடர்ந்த பயிர் இங்கே தோன்றும்.',
  'needs a planting date': 'நடவு தேதியைச் சேர்க்க வேண்டும்', 'Add the planting date in Harvest Planner to calculate this crop’s calendar dates.': 'தேதிகளைக் கணக்கிட அறுவடை திட்டத்தில் நடவு தேதியைச் சேர்க்கவும்.',
  'Add planting date': 'நடவு தேதியைச் சேர்க்கவும்', 'Planted': 'நடவு செய்தது', 'Show tasks': 'பணிகளைக் காட்டு',
  'Planning': 'திட்டமிடல்', 'Preparing': 'தயாரிப்பு', 'Planting': 'நடவு', 'Growing': 'வளர்ச்சி', 'Harvesting': 'அறுவடை', 'Selling': 'விற்பனை', 'All': 'அனைத்தும்',
  'Season tasks': 'பருவப் பணிகள்', 'tasks': 'பணிகள்', 'task': 'பணி', 'A green dot means there are tasks on that day.': 'பச்சை குறியீடு உள்ள நாளில் பணிகள் உள்ளன.',
  'Tap a colored date to see its tasks.': 'பணிகளைப் பார்க்க வண்ணத் தேதியைத் தொடுங்கள்.',
  'Previous month': 'முந்தைய மாதம்', 'Next month': 'அடுத்த மாதம்',
  'No tasks in this stage.': 'இந்த நிலையில் பணிகள் இல்லை.', 'Date ranges are estimates based on planting date and crop guide timing. Adjust for variety, weather, and local field conditions.': 'தேதிகள் நடவு தேதி மற்றும் பயிர் வழிகாட்டியின் அடிப்படையிலான கணிப்புகள். உள்ளூர் நிலைக்கு ஏற்ப மாற்றவும்.',
  'STEP-BY-STEP GUIDE': 'படிப்படியான வழிகாட்டி', 'harvest': 'அறுவடை',
  'ACCOUNT': 'கணக்கு', 'Your profile': 'உங்கள் சுயவிவரம்', 'Administrator': 'நிர்வாகி', 'Farmer account': 'விவசாயி கணக்கு',
  'Contact advisors': 'ஆலோசகர்களைத் தொடர்புகொள்ளுங்கள்', 'Get farming advice or find a nearby agricultural office.': 'விவசாய ஆலோசனை பெறுங்கள் அல்லது அருகிலுள்ள வேளாண் அலுவலகத்தைக் கண்டறியுங்கள்.',
  'Kisan Call Centre · Government of India': 'கிசான் கால் சென்டர் · இந்திய அரசு', 'Talk to an agricultural advisor in your local language.': 'உங்கள் உள்ளூர் மொழியில் வேளாண் ஆலோசகரிடம் பேசுங்கள்.',
  'Call Kisan Call Centre': 'கிசான் கால் சென்டரை அழைக்கவும்', 'Official contact information': 'அதிகாரப்பூர்வ தொடர்பு விவரம்',
  'Find a nearby office': 'அருகிலுள்ள அலுவலகத்தைக் கண்டறியுங்கள்', 'Enter your village, district, or PIN code. It will be used to search Google Maps.': 'உங்கள் கிராமம், மாவட்டம் அல்லது அஞ்சல் குறியீட்டை உள்ளிடுங்கள். Google Maps தேடலுக்கு இது பயன்படுத்தப்படும்.',
  'Village, district, or PIN code': 'கிராமம், மாவட்டம் அல்லது அஞ்சல் குறியீடு', 'e.g. Madurai or 625001': 'உதா. மதுரை அல்லது 625001',
  'Find nearest KVK': 'அருகிலுள்ள வேளாண் அறிவியல் மையத்தைக் கண்டறியுங்கள்', 'Find District Agriculture Office': 'மாவட்ட வேளாண் அலுவலகத்தைக் கண்டறியுங்கள்',
  'Unable to open link': 'இணைப்பைத் திறக்க முடியவில்லை', 'Please check that your device has a phone or maps app available.': 'உங்கள் சாதனத்தில் தொலைபேசி அல்லது வரைபடச் செயலி உள்ளதா எனச் சரிபார்க்கவும்.',
  'Enter your area': 'உங்கள் பகுதியை உள்ளிடுங்கள்', 'Add your village, district, or PIN code to find nearby offices.': 'அருகிலுள்ள அலுவலகங்களைக் கண்டறிய உங்கள் கிராமம், மாவட்டம் அல்லது அஞ்சல் குறியீட்டைச் சேர்க்கவும்.',
  'Account details': 'கணக்கு விவரங்கள்', 'NAME': 'பெயர்', 'USERNAME': 'பயனர் பெயர்', 'ACCOUNT TYPE': 'கணக்கு வகை', 'Admin': 'நிர்வாகி', 'Farmer': 'விவசாயி', 'Sign out': 'வெளியேறு',
  'Language': 'மொழி', 'App language': 'செயலி மொழி', 'Choose the language used across the app.': 'செயலி முழுவதும் பயன்படுத்த வேண்டிய மொழியைத் தேர்ந்தெடுக்கவும்.',
  'Show password': 'கடவுச்சொல்லைக் காட்டு', 'Hide password': 'கடவுச்சொல்லை மறை',
  'Tamil': 'தமிழ்',
  'Welcome back': 'மீண்டும் வரவேற்கிறோம்', 'Create your account': 'கணக்கை உருவாக்கவும்', 'Join the field library as a farmer.': 'விவசாயியாக பயிர் வழிகாட்டிகளில் இணையுங்கள்.',
  'Sign in to explore planting and harvest guidance.': 'நடவு மற்றும் அறுவடை வழிகாட்டிகளைப் பார்க்க உள்நுழையுங்கள்.', 'Your name': 'உங்கள் பெயர்', 'Username': 'பயனர் பெயர்', 'Password': 'கடவுச்சொல்', 'Confirm password': 'கடவுச்சொல்லை உறுதிப்படுத்தவும்',
  'Sign in': 'உள்நுழை', 'Create account': 'கணக்கை உருவாக்கு', 'Already have an account? Sign in': 'ஏற்கனவே கணக்கு உள்ளதா? உள்நுழைக', 'New to App ? Create an account': 'புதியவரா? கணக்கை உருவாக்குங்கள்',
  'All crops': 'அனைத்து பயிர்கள்', 'PLANT': 'நடவு', 'HARVEST': 'அறுவடை', 'SOIL & FIELD': 'மண் மற்றும் வயல்', 'WATERING': 'நீர்ப்பாசனம்', 'PESTS TO WATCH': 'கவனிக்க வேண்டிய பூச்சிகள்',
  'Pesticide guidance': 'பூச்சிக்கொல்லி வழிகாட்டுதல்', 'Always follow the product label and local agriculture officer guidance.': 'தயாரிப்பு லேபிள் மற்றும் உள்ளூர் வேளாண் அலுவலரின் ஆலோசனையைப் பின்பற்றுங்கள்.',
  'Watch the visual guide': 'காணொளி வழிகாட்டியைப் பாருங்கள்', 'Open in YouTube': 'YouTube-இல் திறக்கவும்',
  'CONTENT MANAGEMENT': 'உள்ளடக்க நிர்வாகம்', 'Crop guides': 'பயிர் வழிகாட்டிகள்', 'Keep planting, care, and harvest advice clear and useful for farmers.': 'நடவு, பராமரிப்பு மற்றும் அறுவடை ஆலோசனைகளை விவசாயிகளுக்கு எளிமையாக வழங்குங்கள்.',
  'Published guides': 'வெளியிடப்பட்ட வழிகாட்டிகள்', 'Select a guide to update its details.': 'விவரங்களை மாற்ற வழிகாட்டியைத் தேர்ந்தெடுக்கவும்.', 'Add crop guide': 'பயிர் வழிகாட்டியைச் சேர்க்கவும்',
  'All guides': 'அனைத்து வழிகாட்டிகள்', 'Search crop guides': 'பயிர் வழிகாட்டிகளைத் தேடுங்கள்', 'Planting:': 'நடவு:', 'Not set': 'அமைக்கப்படவில்லை', 'Edit': 'திருத்து',
  'Crop identity': 'பயிர் விவரம்', 'Name the crop and choose the closest category.': 'பயிரின் பெயரையும் பொருத்தமான வகையையும் தேர்ந்தெடுக்கவும்.', 'Crop name *': 'பயிரின் பெயர் *', 'Local name': 'உள்ளூர் பெயர்',
  'Category': 'வகை', 'Vegetables': 'காய்கறிகள்', 'Cereals': 'தானியங்கள்', 'Pulses': 'பருப்பு வகைகள்', 'Cash Crops': 'பணப்பயிர்கள்', 'Other category': 'மற்ற வகை', 'Enter category': 'வகையை உள்ளிடவும்',
  'Growing calendar': 'பயிர் அட்டவணை', 'Use the season and timing farmers should plan around.': 'விவசாயிகள் திட்டமிட வேண்டிய பருவம் மற்றும் காலத்தைச் சேர்க்கவும்.',
  'Planting season *': 'நடவு பருவம் *', 'Expected harvest': 'எதிர்பார்க்கும் அறுவடை', 'Crop overview': 'பயிர் சுருக்கம்', 'Short description': 'சுருக்கமான விளக்கம்', 'Soil and field preparation': 'மண் மற்றும் நிலத் தயாரிப்பு', 'Watering guidance': 'நீர்ப்பாசன வழிகாட்டுதல்',
  'Pest and safety guidance': 'பூச்சி மற்றும் பாதுகாப்பு வழிகாட்டுதல்', 'Pests to watch': 'கவனிக்க வேண்டிய பூச்சிகள்', 'Treatment guidance': 'சிகிச்சை வழிகாட்டுதல்', 'Photos and video': 'புகைப்படங்கள் மற்றும் காணொளி', 'At least one clear crop photo is required.': 'குறைந்தது ஒரு தெளிவான பயிர் புகைப்படம் தேவை.',
  'Choose photos': 'புகைப்படங்களைத் தேர்ந்தெடுக்கவும்', 'Take photo': 'புகைப்படம் எடுக்கவும்', 'No photos added yet': 'புகைப்படங்கள் சேர்க்கப்படவில்லை', 'Video URL (optional)': 'காணொளி இணைப்பு (விருப்பம்)', 'Save changes': 'மாற்றங்களைச் சேமிக்கவும்', 'Create crop guide': 'பயிர் வழிகாட்டியை உருவாக்கவும்', 'Delete guide': 'வழிகாட்டியை நீக்கவும்', 'Cancel': 'ரத்து செய்',
  'Login failed': 'உள்நுழைவு தோல்வியடைந்தது', 'Check your username and password.': 'பயனர் பெயர் மற்றும் கடவுச்சொல்லைச் சரிபார்க்கவும்.',
  'Planning tasks': 'திட்டமிடல் பணிகள்', 'Preparing tasks': 'தயாரிப்பு பணிகள்', 'Planting tasks': 'நடவு பணிகள்', 'Growing tasks': 'வளர்ச்சிப் பணிகள்', 'Harvesting tasks': 'அறுவடை பணிகள்', 'Selling tasks': 'விற்பனைப் பணிகள்',
  'Plan the market and budget': 'சந்தை மற்றும் செலவுத் திட்டமிடல்', 'Check the field and soil': 'வயல் மற்றும் மண்ணைச் சரிபார்க்கவும்', 'Prepare the land': 'நிலத்தைத் தயாரிக்கவும்', 'Select seed and gather inputs': 'விதையைத் தேர்ந்தெடுத்து தேவையான பொருட்களைச் சேகரிக்கவும்', 'Sow or transplant': 'விதைக்கவும் அல்லது நாற்று நடவும்',
  'Support crop establishment': 'பயிர் வளர்ச்சியை உறுதிசெய்யவும்', 'Control weeds and maintain the field': 'களைகளை கட்டுப்படுத்தி வயலைப் பராமரிக்கவும்', 'Review crop nutrition': 'பயிர் ஊட்டச்சத்தைச் சரிபார்க்கவும்', 'Scout for pests and disease': 'பூச்சி மற்றும் நோய்களை ஆய்வு செய்யவும்', 'Maintain crop-specific care': 'பயிருக்கு ஏற்ற பராமரிப்பைத் தொடரவும்',
  'Check maturity and prepare to harvest': 'முதிர்ச்சியைச் சரிபார்த்து அறுவடைக்குத் தயாராகவும்', 'Drain and harvest the field': 'நீரை வடித்து வயலை அறுவடை செய்யவும்', 'Pick ripe fruit in rounds': 'பழுத்த பழங்களைத் தவணைகளாகப் பறிக்கவும்', 'Pick dry, open bolls': 'உலர்ந்த திறந்த பருத்திக் காய்களைப் பறிக்கவும்', 'Lift mature plants': 'முதிர்ந்த செடிகளைப் பிடுங்கவும்',
  'Thresh and dry the grain': 'தானியத்தைப் பிரித்து உலர்த்தவும்', 'Sort and cool the produce': 'விளைபொருளைத் தரம் பிரித்து குளிர்விக்கவும்', 'Grade and protect the lint': 'பருத்தி நாரைத் தரம் பிரித்து பாதுகாக்கவும்', 'Dry and sort the pods': 'காய்களை உலர்த்தி தரம் பிரிக்கவும்',
  'Handle and protect the harvest': 'அறுவடையை கவனமாகக் கையாள்ந்து பாதுகாக்கவும்', 'Store or stage produce safely': 'விளைபொருளைப் பாதுகாப்பாகச் சேமிக்கவும்', 'Grade, pack, and confirm the sale': 'தரம் பிரித்து பொதியிட்டு விற்பனையை உறுதிசெய்யவும்', 'Transport and sell to market': 'சந்தைக்கு எடுத்துச் சென்று விற்கவும்', 'Review the season and field': 'பருவத்தையும் வயலையும் மதிப்பாய்வு செய்யவும்',
  'Crop guide harvest window': 'பயிர் வழிகாட்டி அறுவடை காலம்',
  'Check likely buyers, local prices, input costs, transport options, and expected quality requirements before committing to a crop.': 'பயிர் தேர்வு செய்வதற்கு முன் வாங்குபவர்கள், உள்ளூர் விலை, இடுபொருள் செலவு, போக்குவரத்து மற்றும் தரத் தேவைகளை விசாரிக்கவும்.',
  'Review drainage, water access, recent crop history, and soil condition. Use a local soil test where available.': 'வடிகால், நீர் வசதி, முந்தைய பயிர்கள் மற்றும் மண்ணின் நிலையைச் சரிபார்க்கவும். வசதி இருந்தால் மண் பரிசோதனை செய்யவும்.',
  'Choose locally suitable seed and arrange tools and approved inputs. Check seed quality and keep inputs labelled and safely stored.': 'உள்ளூருக்கு ஏற்ற விதையைத் தேர்ந்தெடுத்து கருவிகள் மற்றும் அங்கீகரிக்கப்பட்ட இடுபொருட்களைத் தயார் செய்யவும். விதைத் தரத்தைச் சரிபார்த்து, பொருட்களை லேபிளுடன் பாதுகாப்பாக வைக்கவும்.',
  'Inspect the field regularly and control weeds early using locally recommended practices that avoid crop damage.': 'வயலைத் தொடர்ந்து கவனித்து, பயிருக்கு சேதமில்லாத உள்ளூர் முறையில் களைகளை ஆரம்பத்திலேயே கட்டுப்படுத்தவும்.',
  'Observe crop growth and apply nutrients only according to soil results, crop guidance, and locally approved recommendations.': 'பயிர் வளர்ச்சியைக் கவனித்து, மண் பரிசோதனை மற்றும் உள்ளூர் வேளாண் பரிந்துரைப்படி மட்டுமே ஊட்டச்சத்துகளை இடவும்.',
  'Move produce carefully, keep it clean, and protect it from rain, heat, pests, and contamination during handling.': 'விளைபொருளை கவனமாகக் கையாள்ந்து சுத்தமாக வைக்கவும். மழை, வெப்பம், பூச்சி மற்றும் மாசுபாட்டிலிருந்து பாதுகாக்கவும்.',
  'Use clean, dry, crop-appropriate storage. Keep lots identified and follow food-safety guidance where applicable.': 'பயிருக்கு ஏற்ற சுத்தமான, உலர்ந்த இடத்தில் சேமிக்கவும். ஒவ்வொரு தொகுதியையும் அடையாளப்படுத்தி உணவுப் பாதுகாப்பு வழிமுறைகளைப் பின்பற்றவும்.',
  'Sort and pack to buyer specifications, confirm quantity and price, and prepare any required records or receipts.': 'வாங்குபவர் கேட்ட தரப்படி தரம் பிரித்து பொதியிடவும். அளவு, விலை உறுதி செய்து தேவையான பதிவுகள் மற்றும் ரசீதுகளைத் தயார் செய்யவும்.',
  'Choose a suitable transport time and protect the crop in transit. Confirm delivery, payment, and buyer feedback.': 'பொருத்தமான போக்குவரத்து நேரத்தைத் தேர்ந்தெடுத்து வழியில் விளைபொருளைப் பாதுகாக்கவும். ஒப்படைப்பு, பணம் மற்றும் வாங்குபவர் கருத்தை உறுதிப்படுத்தவும்.',
  'Record yield, costs, sales, and lessons learned. Plan residue management and the next rotation with local guidance.': 'விளைச்சல், செலவு, விற்பனை மற்றும் கற்றுக்கொண்டவற்றைப் பதிவு செய்யவும். பயிர் அறுவடைக்குப் பிந்தைய கழிவுகளை நிர்வகித்து அடுத்த பயிர் சுழற்சியைத் திட்டமிட உள்ளூர் ஆலோசனை பெறவும்.',
  'Drain the field about 10-15 days before harvest when conditions allow. Cut mature panicles with clean tools.': 'வாய்ப்புள்ளபோது அறுவடைக்கு 10-15 நாட்களுக்கு முன் வயல் நீரை வடிக்கவும். சுத்தமான கருவியால் நன்கு முதிர்ந்த கதிர்களை அறுக்கவும்.',
  'Thresh carefully, remove debris, and dry grain on a clean surface until it is suitable for storage.': 'கவனமாகக் கதிரடித்து கழிவுகளை நீக்கவும். சேமிக்க ஏற்ற அளவு உலரும் வரை தானியத்தைச் சுத்தமான தரையில் உலர்த்தவும்.',
  'Pick at the maturity and color stage your buyer needs. Use clean hands or tools and avoid bruising fruit.': 'வாங்குபவர் விரும்பும் முதிர்ச்சி மற்றும் நிறத்தில் பழங்களைப் பறிக்கவும். சுத்தமான கைகள் அல்லது கருவிகளைப் பயன்படுத்தி பழங்கள் அடிபடாமல் கவனிக்கவும்.',
  'Separate damaged fruit, use clean shallow containers, and move tomatoes to shade promptly.': 'சேதமடைந்த பழங்களைப் பிரிக்கவும். சுத்தமான அகலமான பாத்திரங்களில் வைத்து உடனே நிழலுக்கு மாற்றவும்.',
  'Collect mature lint only when plants and lint are dry. Keep leaves, soil, and debris out of the cotton.': 'செடியும் பஞ்சும் உலர்ந்திருக்கும்போது மட்டுமே முதிர்ந்த பஞ்சைப் பறிக்கவும். இலை, மண் மற்றும் கழிவுகள் கலக்காமல் பார்த்துக்கொள்ளவும்.',
  'Keep pickings clean and dry, and separate grades according to buyer requirements.': 'பறித்த பஞ்சைச் சுத்தமாகவும் உலர்ந்தும் வைக்கவும். வாங்குபவர் தேவைக்கேற்ப தரம் பிரிக்கவும்.',
  'Check sample pods, loosen the soil, and lift carefully to avoid leaving pods behind or damaging them.': 'சில காய்களைத் திறந்து முதிர்ச்சியைச் சரிபார்க்கவும். மண்ணைத் தளர்த்தி காய்கள் மிஞ்சாமல் அல்லது சேதமடையாமல் செடிகளைப் பிடுங்கவும்.',
  'Dry plants in a clean, ventilated place, then separate pods and remove damaged material.': 'செடிகளைச் சுத்தமான காற்றோட்டமான இடத்தில் உலர்த்தவும். பின்னர் காய்களைப் பிரித்து சேதமானவற்றை நீக்கவும்.',
  'Remove excess soil and debris, separate damaged produce, and grade it to the buyer’s requirements.': 'அதிகப்படியான மண் மற்றும் கழிவுகளை நீக்கி சேதமடைந்தவற்றைப் பிரிக்கவும். வாங்குபவர் தேவைக்கேற்ப தரம் பிரிக்கவும்.',
  'Keep the field moist during early growth. Drain the field 10-15 days before harvest.': 'ஆரம்ப வளர்ச்சியில் வயலில் ஈரப்பதம் இருக்குமாறு பராமரிக்கவும். அறுவடைக்கு 10-15 நாட்களுக்கு முன் நீரை வடிக்கவும்.',
  'Water at the base every 2-3 days. Avoid wetting leaves to reduce fungal disease.': '2-3 நாட்களுக்கு ஒருமுறை செடியின் அடிப்பகுதியில் நீர் ஊற்றவும். பூஞ்சை நோய் குறைய இலைகளை நனைக்க வேண்டாம்.',
  'Provide irrigation during flowering and boll formation, especially through dry spells.': 'பூக்கும் காலத்திலும் காய் உருவாகும் காலத்திலும், குறிப்பாக வறண்ட நாட்களில் நீர்ப்பாசனம் செய்யவும்.',
  'Irrigate at sowing, flowering, pegging, and pod development. Stop irrigation before harvest.': 'விதைக்கும் போது, பூக்கும் போது, ஆணி வேர் உருவாகும் போது மற்றும் காய் வளரும் போது நீர்ப்பாசனம் செய்யவும். அறுவடைக்கு முன் நிறுத்தவும்.',
  'Stem borer, brown planthopper': 'தண்டு துளைப்பான், பழுப்பு தாவரத் தத்துப்பூச்சி',
  'Fruit borer, whitefly, early blight': 'காய்த் துளைப்பான், வெள்ளை ஈ, ஆரம்ப இலைக்கருகல்',
  'Pink bollworm, whitefly, aphids': 'இளஞ்சிவப்பு காய்ப்புழு, வெள்ளை ஈ, அசுவினி',
  'Leaf miner, thrips, tobacco caterpillar': 'இலை சுரங்கப்புழு, த்ரிப்ஸ், புகையிலைப் புழு',
  'Check the field carefully and use the guide harvest window (not specified) alongside local agricultural advice.': 'வயலைச் சரிபார்த்து, உள்ளூர் வேளாண் ஆலோசனையுடன் அறுவடை காலத்தைப் பின்பற்றுங்கள்.',
  'CROP GUIDE HARVEST WINDOW': 'வழிகாட்டி அறுவடை காலம்', 'Date ranges are planning estimates relative to planting, not fixed recommendations. Actual timing varies by variety, weather, and field conditions. Confirm decisions with local agricultural guidance.': 'தேதிகள் நடவு நாளை அடிப்படையாகக் கொண்ட கணிப்புகள்; உறுதியான பரிந்துரைகள் அல்ல. ரகம், வானிலை மற்றும் வயல் நிலைக்கு ஏற்ப மாறலாம். உள்ளூர் வேளாண் ஆலோசனையைப் பெறுங்கள்.',
  'No guides yet. Add your first crop guide to get started.': 'வழிகாட்டிகள் இல்லை. தொடங்க முதல் வழிகாட்டியைச் சேர்க்கவும்.',
  'Saving': 'சேமிக்கிறது', 'Current month': 'இந்த மாதம்', 'Planted date': 'நடவு தேதி', 'Open profile': 'சுயவிவரத்தைத் திறக்கவும்',
};

function translateTamil(text) {
  if (tamilTranslations[text]) return tamilTranslations[text];
  if (text.startsWith('GOOD MORNING, ')) return `காலை வணக்கம், ${text.slice('GOOD MORNING, '.length)}`;
  const guideCount = text.match(/^(\d+) guides$/);
  if (guideCount) return `${guideCount[1]} வழிகாட்டிகள்`;
  const taskStep = text.match(/^STEP (\d+)(\s+·\s+.+)$/);
  if (taskStep) return `படி ${taskStep[1]}${taskStep[2]}`;
  const plantedDate = text.match(/^Planted (.+)$/);
  if (plantedDate) return `நடவு செய்தது ${plantedDate[1]}`;
  const landPreparation = text.match(/^Clear the field safely, improve drainage, and prepare a suitable seedbed for (.+)\. Follow local soil-conservation practices\.$/);
  if (landPreparation) return `பாதுகாப்பாக வயலைச் சுத்தம் செய்து வடிகாலை மேம்படுத்தவும். ${landPreparation[1]} பயிருக்கு ஏற்ற விதைப்படுக்கை அமைத்து மண் பாதுகாப்பு முறைகளைப் பின்பற்றவும்.`;
  const plantingInstruction = text.match(/^Plant (.+) at the locally recommended spacing and depth\. Record the actual planting date used for this plan\.$/);
  if (plantingInstruction) return `உள்ளூர் பரிந்துரைத்த இடைவெளி மற்றும் ஆழத்தில் ${plantingInstruction[1]} பயிரை நடவு செய்யவும். உண்மையான நடவு தேதியைப் பதிவு செய்யவும்.`;
  const harvestWindow = text.match(/^Compare field signs with the guide harvest window \((.+)\)\. Arrange labour, clean tools, containers, and a dry handling area\.$/);
  if (harvestWindow) return `வயல் நிலையை வழிகாட்டி அறுவடை காலத்துடன் (${harvestWindow[1]}) ஒப்பிடவும். தொழிலாளர், சுத்தமான கருவிகள், பாத்திரங்கள் மற்றும் உலர்ந்த கையாளும் இடத்தைத் தயார் செய்யவும்.`;
  const genericHarvest = text.match(/^Check crop maturity and use the guide harvest window \((.+)\) with local agricultural advice\. Harvest carefully to limit damage\.$/);
  if (genericHarvest) return `பயிரின் முதிர்ச்சியைச் சரிபார்த்து, வழிகாட்டி அறுவடை காலம் (${genericHarvest[1]}) மற்றும் உள்ளூர் வேளாண் ஆலோசனையைப் பின்பற்றவும். சேதமின்றி கவனமாக அறுவடை செய்யவும்.`;
  const establishedCrop = text.match(/^Check germination or transplant recovery, maintain appropriate moisture, and replace failed plants where practical\.\s*(.*)$/);
  if (establishedCrop) return `முளைப்பு அல்லது நாற்று வளர்ச்சியைச் சரிபார்த்து சரியான ஈரப்பதத்தைப் பராமரிக்கவும். முடியுமானால் வளராத செடிகளை மாற்றவும்.${establishedCrop[1] ? ` ${tamilTranslations[establishedCrop[1]] || establishedCrop[1]}` : ''}`;
  const pestScouting = text.match(/^Inspect plants regularly for pests, disease, and water stress\.\s*(.*?)\s*Seek local advice before treatment\.$/);
  if (pestScouting) return `பூச்சி, நோய் மற்றும் நீர் பற்றாக்குறை உள்ளதா என செடிகளைத் தொடர்ந்து பாருங்கள்.${pestScouting[1] ? ` ${tamilTranslations[pestScouting[1]] || pestScouting[1]}` : ''} சிகிச்சைக்கு முன் உள்ளூர் ஆலோசனை பெறவும்.`;
  const cropCare = text.match(/^Continue timely irrigation, drainage, staking, or other care appropriate to this crop\.\s*(.*)$/);
  if (cropCare) return `சரியான நேரத்தில் நீர்ப்பாசனம், வடிகால், தாங்கு குச்சி அல்லது பயிருக்கு ஏற்ற பராமரிப்பைத் தொடரவும்.${cropCare[1] ? ` ${tamilTranslations[cropCare[1]] || cropCare[1]}` : ''}`;
  return text;
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState('en');
  const [fontsLoaded, fontError] = useFonts({
    TamilRegular: MuktaMalar_400Regular,
    TamilMedium: MuktaMalar_500Medium,
    TamilSemiBold: MuktaMalar_600SemiBold,
    TamilBold: MuktaMalar_700Bold,
  });

  useEffect(() => {
    AsyncStorage.getItem(LANGUAGE_KEY).then((stored) => {
      if (stored === 'en' || stored === 'ta') setLanguageState(stored);
    }).catch(() => {});
  }, []);

  const setLanguage = (nextLanguage) => {
    if (nextLanguage !== 'en' && nextLanguage !== 'ta') return;
    setLanguageState(nextLanguage);
    AsyncStorage.setItem(LANGUAGE_KEY, nextLanguage).catch(() => {});
  };

  const value = useMemo(() => ({
    language,
    setLanguage,
    fontFamilyForWeight: (weight) => {
      const numericWeight = Number(weight) || 400;
      if (numericWeight >= 700) return 'TamilBold';
      if (numericWeight >= 600) return 'TamilSemiBold';
      if (numericWeight >= 500) return 'TamilMedium';
      return 'TamilRegular';
    },
    translate: (text) => language === 'ta' ? translateTamil(text) : text,
  }), [language]);

  if (!fontsLoaded && !fontError) return null;

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
