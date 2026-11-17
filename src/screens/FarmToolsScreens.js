import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LocalizedText as Text } from '../i18n/LocalizedText';
import { LocalizedTextInput as TextInput } from '../i18n/LocalizedTextInput';
import { useLanguage } from '../i18n/LanguageContext';
import * as ImagePicker from 'expo-image-picker';
import { fetch as expoFetch } from 'expo/fetch';
import { File } from 'expo-file-system';

function getHarvestTasks(plant) {
  const cropHarvestSteps = {
    rice: [
      { id: 'harvest', title: 'Drain and harvest the field', detail: 'Drain the field about 10-15 days before harvest when conditions allow. Cut mature panicles with clean tools.' },
      { id: 'process', title: 'Thresh and dry the grain', detail: 'Thresh carefully, remove debris, and dry grain on a clean surface until it is suitable for storage.' },
    ],
    tomato: [
      { id: 'harvest', title: 'Pick ripe fruit in rounds', detail: 'Pick at the maturity and color stage your buyer needs. Use clean hands or tools and avoid bruising fruit.' },
      { id: 'process', title: 'Sort and cool the produce', detail: 'Separate damaged fruit, use clean shallow containers, and move tomatoes to shade promptly.' },
    ],
    cotton: [
      { id: 'harvest', title: 'Pick dry, open bolls', detail: 'Collect mature lint only when plants and lint are dry. Keep leaves, soil, and debris out of the cotton.' },
      { id: 'process', title: 'Grade and protect the lint', detail: 'Keep pickings clean and dry, and separate grades according to buyer requirements.' },
    ],
    groundnut: [
      { id: 'harvest', title: 'Lift mature plants', detail: 'Check sample pods, loosen the soil, and lift carefully to avoid leaving pods behind or damaging them.' },
      { id: 'process', title: 'Dry and sort the pods', detail: 'Dry plants in a clean, ventilated place, then separate pods and remove damaged material.' },
    ],
  };
  const cropDetails = cropHarvestSteps[plant.id] || [
    { id: 'harvest', title: 'Harvest at the right maturity', detail: `Check crop maturity and use the guide harvest window (${plant.harvest || 'not specified'}) with local agricultural advice. Harvest carefully to limit damage.` },
    { id: 'process', title: 'Clean and grade the produce', detail: 'Remove excess soil and debris, separate damaged produce, and grade it to the buyer’s requirements.' },
  ];
  const maturityRanges = {
    rice: [100, 130],
    tomato: [60, 90],
    cotton: [120, 210],
    groundnut: [90, 120],
  };
  const [maturityStart, maturityEnd] = maturityRanges[plant.id] || [90, 150];
  const lifecycle = [
    { id: 'market-plan', title: 'Plan the market and budget', detail: 'Check likely buyers, local prices, input costs, transport options, and expected quality requirements before committing to a crop.', startDay: -35, endDay: -28 },
    { id: 'soil-check', title: 'Check the field and soil', detail: 'Review drainage, water access, recent crop history, and soil condition. Use a local soil test where available.', startDay: -30, endDay: -21 },
    { id: 'land-prep', title: 'Prepare the land', detail: `Clear the field safely, improve drainage, and prepare a suitable seedbed for ${plant.name}. Follow local soil-conservation practices.`, startDay: -21, endDay: -7 },
    { id: 'seed-inputs', title: 'Select seed and gather inputs', detail: 'Choose locally suitable seed and arrange tools and approved inputs. Check seed quality and keep inputs labelled and safely stored.', startDay: -14, endDay: -1 },
    { id: 'plant', title: 'Sow or transplant', detail: `Plant ${plant.name} at the locally recommended spacing and depth. Record the actual planting date used for this plan.`, startDay: 0, endDay: 2 },
    { id: 'establish', title: 'Support crop establishment', detail: `Check germination or transplant recovery, maintain appropriate moisture, and replace failed plants where practical. ${plant.water || ''}`, startDay: 3, endDay: 14 },
    { id: 'weed', title: 'Control weeds and maintain the field', detail: 'Inspect the field regularly and control weeds early using locally recommended practices that avoid crop damage.', startDay: 14, endDay: 35 },
    { id: 'nutrition', title: 'Review crop nutrition', detail: 'Observe crop growth and apply nutrients only according to soil results, crop guidance, and locally approved recommendations.', startDay: 21, endDay: 45 },
    { id: 'scout', title: 'Scout for pests and disease', detail: `Inspect plants regularly for pests, disease, and water stress. ${plant.pests ? `Watch for: ${plant.pests}.` : ''} Seek local advice before treatment.`, startDay: 14, endDay: maturityStart - 7 },
    { id: 'maintain', title: 'Maintain crop-specific care', detail: `Continue timely irrigation, drainage, staking, or other care appropriate to this crop. ${plant.water || ''}`, startDay: 35, endDay: maturityStart - 14 },
    { id: 'preharvest', title: 'Check maturity and prepare to harvest', detail: `Compare field signs with the guide harvest window (${plant.harvest || 'not specified'}). Arrange labour, clean tools, containers, and a dry handling area.`, startDay: maturityStart - 14, endDay: maturityStart - 7 },
    ...cropDetails.map((task) => ({ ...task, startDay: maturityStart, endDay: maturityEnd })),
    { id: 'postharvest', title: 'Handle and protect the harvest', detail: 'Move produce carefully, keep it clean, and protect it from rain, heat, pests, and contamination during handling.', startDay: maturityEnd, endDay: maturityEnd + 4 },
    { id: 'store', title: 'Store or stage produce safely', detail: 'Use clean, dry, crop-appropriate storage. Keep lots identified and follow food-safety guidance where applicable.', startDay: maturityEnd + 1, endDay: maturityEnd + 8 },
    { id: 'market-ready', title: 'Grade, pack, and confirm the sale', detail: 'Sort and pack to buyer specifications, confirm quantity and price, and prepare any required records or receipts.', startDay: maturityEnd + 2, endDay: maturityEnd + 10 },
    { id: 'transport-sell', title: 'Transport and sell to market', detail: 'Choose a suitable transport time and protect the crop in transit. Confirm delivery, payment, and buyer feedback.', startDay: maturityEnd + 4, endDay: maturityEnd + 14 },
    { id: 'review', title: 'Review the season and field', detail: 'Record yield, costs, sales, and lessons learned. Plan residue management and the next rotation with local guidance.', startDay: maturityEnd + 14, endDay: maturityEnd + 21 },
  ];

  const stageByTaskId = {
    'market-plan': 'Planning',
    'soil-check': 'Preparing',
    'land-prep': 'Preparing',
    'seed-inputs': 'Preparing',
    plant: 'Planting',
    establish: 'Growing',
    weed: 'Growing',
    nutrition: 'Growing',
    scout: 'Growing',
    maintain: 'Growing',
    preharvest: 'Growing',
    harvest: 'Harvesting',
    process: 'Harvesting',
    postharvest: 'Harvesting',
    store: 'Harvesting',
    'market-ready': 'Selling',
    'transport-sell': 'Selling',
    review: 'Selling',
  };

  return lifecycle.map((task) => ({ ...task, stage: stageByTaskId[task.id] || 'Growing' }));
}

function formatDateRange(plantingDate, startDay, endDay, language = 'en') {
  if (!plantingDate) return language === 'ta' ? `நடவு நாளிலிருந்து ${startDay} முதல் ${endDay} நாள் வரை` : `Day ${startDay} to ${endDay}`;
  const [year, month, day] = plantingDate.split('-').map(Number);
  const start = new Date(year, month - 1, day + startDay);
  const end = new Date(year, month - 1, day + endDay);
  const options = { month: 'short', day: 'numeric', year: 'numeric' };
  const locale = language === 'ta' ? 'ta-IN' : 'en';
  return `${start.toLocaleDateString(locale, options)} - ${end.toLocaleDateString(locale, options)}`;
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateFromKey(value) {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDaysToDateKey(value, days) {
  const date = dateFromKey(value);
  if (!date) return dateKey(new Date());
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

function getMonthDays(monthDate) {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const gridStart = new Date(first.getFullYear(), first.getMonth(), 1 - mondayOffset);
  return Array.from({ length: 42 }, (_, index) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index));
}

function isValidPlantingDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function mapPlantDiagnosis(resultText) {
  const classMatch = resultText.match(/Predicted Class:\s*(Healthy|Powdery|Rust)\b/i);
  const confidenceMatch = resultText.match(/Confidence Score:\s*([\d.]+)%/i);
  if (!classMatch) return null;

  const category = {
    healthy: { title: '1. Healthy', detail: 'The model did not detect Powdery Mildew or Rust in this image.', style: styles.resultGood },
    powdery: { title: '2. Needs more maintenance', detail: 'The model detected signs of Powdery Mildew. Inspect affected leaves and contact a local agricultural advisor for crop-specific guidance.', style: styles.resultMaintenance },
    rust: { title: '3. Bad', detail: 'Your plant is in critical condition. Contact an agricultural advisor.', style: styles.resultCritical },
  }[classMatch[1].toLowerCase()];

  return { ...category, detectedClass: classMatch[1], confidence: confidenceMatch?.[1] || null };
}

export function HarvestPlannerScreen({ plants, followedCrops, selectedPlantId, onSelectPlant, onBackToList, onSetPlantingDate, onToggleTask, onGoToCalendar, onBrowsePlants }) {
  const { language } = useLanguage();
  const [dateInputs, setDateInputs] = useState({});
  const [dateErrors, setDateErrors] = useState({});
  const [toolView, setToolView] = useState(null);
  const followedPlants = plants.filter((plant) => followedCrops[plant.id]);
  const selectedPlant = followedPlants.find((plant) => plant.id === selectedPlantId);
  const followDetails = selectedPlant ? followedCrops[selectedPlant.id] : null;
  const tasks = selectedPlant ? getHarvestTasks(selectedPlant) : [];
  const completedTaskIds = followDetails?.completedTaskIds || [];

  const savePlantingDate = () => {
    const value = (dateInputs[selectedPlant.id] || '').trim();
    if (!isValidPlantingDate(value)) {
      setDateErrors((current) => ({ ...current, [selectedPlant.id]: 'Enter a valid date in YYYY-MM-DD format.' }));
      return;
    }
    setDateErrors((current) => ({ ...current, [selectedPlant.id]: '' }));
    onSetPlantingDate(selectedPlant.id, value);
  };

  if (selectedPlant) {
    const plantingDate = followDetails.plantingDate;
    const dateValue = dateInputs[selectedPlant.id] ?? plantingDate ?? '';
    const completedCount = tasks.filter((task) => completedTaskIds.includes(task.id)).length;

    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable accessibilityRole="button" onPress={onBackToList} style={styles.backButton}><Text style={styles.backText}>‹  Followed crops</Text></Pressable>
        <Text style={styles.eyebrow}>FARM-TO-MARKET CHECKLIST</Text>
        <Text style={styles.title}>{selectedPlant.name}</Text>
        {!plantingDate ? (
          <View style={styles.datePanel}>
            <Text style={styles.dateTitle}>When did you plant {selectedPlant.name}?</Text>
            <Text style={styles.dateCopy}>Add the planting date to start a checklist for this crop.</Text>
            <TextInput
              accessibilityLabel="Planting date"
              value={dateValue}
              onChangeText={(value) => {
                setDateInputs((current) => ({ ...current, [selectedPlant.id]: value }));
                setDateErrors((current) => ({ ...current, [selectedPlant.id]: '' }));
              }}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#89948B"
              style={styles.dateInput}
            />
            {!!dateErrors[selectedPlant.id] && <Text style={styles.dateError}>{dateErrors[selectedPlant.id]}</Text>}
            <Pressable accessibilityRole="button" onPress={savePlantingDate} style={styles.saveDateButton}><Text style={styles.saveDateText}>Save planting date</Text></Pressable>
            <Text style={styles.dateHint}>Crop guide harvest window: {selectedPlant.harvest || 'Not provided'}</Text>
          </View>
        ) : (
          <>
            <View style={styles.progressPanel}>
              <View style={styles.progressCopy}><Text style={styles.progressHeading}>Planting date</Text><Text style={styles.progressDate}>{plantingDate}</Text></View>
              <View style={styles.progressCount}><Text style={styles.progressValue}>{completedCount}/{tasks.length}</Text><Text style={styles.progressLabel}>DONE</Text></View>
            </View>
            <Text style={styles.scheduleNote}>Estimated date ranges are calculated from your planting date. Adjust the schedule for your variety, weather, and local field conditions.</Text>
            <Text style={styles.sectionTitle}>Field-to-market tasks</Text>
            {tasks.map((task, index) => {
              const isComplete = completedTaskIds.includes(task.id);
              return (
                <View key={task.id} style={styles.taskRow}>
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isComplete }}
                    accessibilityLabel={`${task.title}, ${isComplete ? 'completed' : 'not completed'}`}
                    onPress={() => onToggleTask(selectedPlant.id, task.id)}
                    style={styles.taskToggle}
                  >
                    <View style={[styles.taskCheck, isComplete && styles.taskChecked]}>{isComplete && <Text style={styles.taskCheckMark}>✓</Text>}</View>
                    <View style={styles.taskCopy}><Text style={styles.taskNumber}>STEP {String(index + 1).padStart(2, '0')}  ·  {formatDateRange(plantingDate, task.startDay, task.endDay, language)}</Text><Text style={[styles.taskTitle, isComplete && styles.taskTitleDone]}>{task.title}</Text><Text style={styles.taskDetail}>{task.detail}</Text></View>
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Go to calendar date for ${task.title}`} onPress={() => onGoToCalendar(selectedPlant.id, plantingDate, task.startDay)} style={styles.goCalendarButton}>
                    <Text style={styles.goCalendarText}>View on calendar  ›</Text>
                  </Pressable>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    );
  }

  if (toolView === 'weather') return <FarmWeatherScreen onBack={() => setToolView(null)} />;
  if (toolView === 'scan') return <PlantHealthScanScreen onBack={() => setToolView(null)} />;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>YOUR FIELD WORKSPACE</Text>
      <Text style={styles.title}>Harvest planner</Text>
      <Text style={styles.subtitle}>Follow a crop from field preparation through harvest and market sale.</Text>
      <Text style={styles.sectionTitle}>Farm tools</Text>
      <View style={styles.toolsGrid}>
        <Pressable accessibilityRole="button" onPress={() => setToolView('weather')} style={styles.toolCard}>
          <View style={styles.toolIcon}><Text style={styles.toolIconText}>☀</Text></View>
          <Text style={styles.toolTitle}>Farm weather</Text>
          <Text style={styles.toolDescription}>Check current conditions and the next 7 days for your area.</Text>
          <Text style={styles.toolAction}>View forecast  ›</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => setToolView('scan')} style={styles.toolCard}>
          <View style={[styles.toolIcon, styles.scanIcon]}><Text style={styles.toolIconText}>◎</Text></View>
          <Text style={styles.toolTitle}>Plant health scan</Text>
          <Text style={styles.toolDescription}>Add a plant photo and record the symptoms you can see.</Text>
          <Text style={styles.toolAction}>Check a plant  ›</Text>
        </Pressable>
      </View>
      <Text style={styles.sectionTitle}>Your followed crops</Text>
      <View style={styles.summary}>
        <View style={styles.summaryCount}><Text style={styles.countValue}>{followedPlants.length}</Text><Text style={styles.countLabel}>FOLLOWING</Text></View>
        <View style={styles.summaryCopy}><Text style={styles.summaryTitle}>{followedPlants.length ? 'Your followed crops' : 'No followed crops yet'}</Text><Text style={styles.summaryText}>{followedPlants.length ? 'Choose a crop to add its planting date and track harvest tasks.' : 'Follow plants from the Plants tab and they will appear here.'}</Text></View>
      </View>
      {!followedPlants.length && <Pressable accessibilityRole="button" onPress={onBrowsePlants} style={styles.browseButton}><Text style={styles.browseButtonText}>Browse plants</Text></Pressable>}
      {followedPlants.map((plant) => {
        const date = followedCrops[plant.id].plantingDate;
        const tasksForPlant = getHarvestTasks(plant);
        const completed = followedCrops[plant.id].completedTaskIds || [];
        return (
          <Pressable key={plant.id} accessibilityRole="button" onPress={() => onSelectPlant(plant.id)} style={styles.followedRow}>
            <View style={styles.followedAccent} />
            <View style={styles.cropCopy}><Text style={styles.cropName}>{plant.name}</Text><Text style={styles.cropMeta}>{date ? `Planted ${date}  ·  ${completed.length}/${tasksForPlant.length} tasks done` : 'Tap to add planting date'}</Text></View>
            <Text style={styles.rowAction}>›</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function weatherDescription(code) {
  if (code === 0) return { label: 'Clear sky', icon: '☀️' };
  if ([1, 2].includes(code)) return { label: 'Partly cloudy', icon: '🌤️' };
  if (code === 3) return { label: 'Overcast', icon: '☁️' };
  if ([45, 48].includes(code)) return { label: 'Fog', icon: '🌫️' };
  if ([51, 53, 55, 56, 57].includes(code)) return { label: 'Drizzle', icon: '🌦️' };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { label: 'Showers', icon: '🌧️' };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: 'Snow', icon: '🌨️' };
  if ([95, 96, 99].includes(code)) return { label: 'Thunderstorms', icon: '⛈️' };
  return { label: 'Conditions unavailable', icon: '☁️' };
}

function formatForecastDay(dateValue, index) {
  if (index === 0) return 'Today';
  const [year, month, day] = dateValue.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en', { weekday: 'short' });
}

function getFieldWeatherNote(weather) {
  const rainToday = weather?.daily?.precipitation_sum?.[0] || 0;
  const wind = weather?.current?.wind_speed_10m || 0;
  if (rainToday >= 5) return 'Rain is expected today. Delay field spraying and avoid moving machinery on saturated soil. Check drainage and protect harvested produce.';
  if (wind >= 20) return 'Winds are elevated today. Take care with field work and avoid spraying in conditions that could cause drift. Check soil moisture before irrigating.';
  return 'No significant rain is forecast today. Check soil moisture before irrigating, and use local guidance to plan spraying and field work.';
}

function FarmWeatherScreen({ onBack }) {
  const [locationInput, setLocationInput] = useState('Madurai');
  const [weather, setWeather] = useState(null);
  const [location, setLocation] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const loadWeather = async () => {
    const query = locationInput.trim();
    if (!query) {
      setError('Enter a city or town to search.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const geocodingResponse = await expoFetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`);
      if (!geocodingResponse.ok) throw new Error('Could not find that location. Check the name and try again.');
      const geocodingData = await geocodingResponse.json();
      const match = geocodingData.results?.[0];
      if (!match) throw new Error('No matching location found. Try a nearby city or town.');

      const forecastUrl = 'https://api.open-meteo.com/v1/forecast?latitude='
        + `${match.latitude}&longitude=${match.longitude}`
        + '&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation,weather_code'
        + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum'
        + '&forecast_days=7&timezone=auto';
      const forecastResponse = await expoFetch(forecastUrl);
      if (!forecastResponse.ok) throw new Error('Weather data is unavailable right now. Please try again.');
      const forecast = await forecastResponse.json();
      setLocation(match);
      setWeather(forecast);
    } catch (loadError) {
      setWeather(null);
      setLocation(null);
      setError(loadError.message || 'Weather data is unavailable right now. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const current = weather?.current;
  const currentCondition = current ? weatherDescription(current.weather_code) : null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.weatherContent} keyboardShouldPersistTaps="handled">
      <Pressable accessibilityRole="button" onPress={onBack} style={styles.backButton}><Text style={styles.backText}>‹  Harvest planner</Text></Pressable>
      <Text style={styles.eyebrow}>FIELD CONDITIONS</Text>
      <Text style={styles.title}>Farm weather</Text>
      <Text style={styles.subtitle}>Plan irrigation, spraying, and harvest around the forecast.</Text>
      <View style={styles.weatherSearchRow}>
        <TextInput
          accessibilityLabel="City or town"
          autoCapitalize="words"
          onChangeText={setLocationInput}
          onSubmitEditing={loadWeather}
          placeholder="Enter a city or town"
          placeholderTextColor="#89948B"
          returnKeyType="search"
          style={styles.weatherSearchInput}
          value={locationInput}
        />
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: isLoading }} disabled={isLoading} onPress={loadWeather} style={styles.weatherSearchButton}>
          {isLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.weatherSearchButtonText}>Go</Text>}
        </Pressable>
      </View>

      {!!error && <Text accessibilityRole="alert" style={styles.weatherError}>{error}</Text>}

      {!weather && !isLoading && !error && (
        <View style={styles.weatherEmpty}>
          <Text style={styles.weatherEmptyIcon}>🌦️</Text>
          <Text style={styles.weatherEmptyTitle}>Weather for {locationInput.trim() || 'your area'}</Text>
          <Text style={styles.weatherEmptyCopy}>Search to see current conditions and the next 7 days.</Text>
        </View>
      )}

      {isLoading && !weather && <View style={styles.weatherLoading}><ActivityIndicator color="#23613A" size="large" /><Text style={styles.weatherLoadingText}>Finding local conditions...</Text></View>}

      {!!weather && !!location && (
        <>
          <View style={styles.currentWeatherCard}>
            <View style={styles.currentWeatherTop}>
              <View style={styles.currentLocationCopy}>
                <Text style={styles.currentLocation}>{location.name}</Text>
                <Text style={styles.currentRegion}>{[location.admin1, location.country].filter(Boolean).join(', ')}</Text>
              </View>
              <Text style={styles.currentWeatherIcon}>{currentCondition.icon}</Text>
            </View>
            <View style={styles.currentWeatherSummary}>
              <Text style={styles.currentTemperature}>{Math.round(current.temperature_2m)}°</Text>
              <View style={styles.currentConditionCopy}>
                <Text style={styles.currentCondition}>{currentCondition.label}</Text>
                <Text style={styles.feelsLike}>Feels like {Math.round(current.apparent_temperature)}°C</Text>
              </View>
            </View>
            <View style={styles.currentMetrics}>
              <View style={styles.currentMetric}><Text style={styles.currentMetricValue}>{current.relative_humidity_2m}%</Text><Text style={styles.currentMetricLabel}>HUMIDITY</Text></View>
              <View style={styles.currentMetric}><Text style={styles.currentMetricValue}>{Math.round(current.wind_speed_10m)} km/h</Text><Text style={styles.currentMetricLabel}>WIND</Text></View>
              <View style={styles.currentMetric}><Text style={styles.currentMetricValue}>{Number(current.precipitation).toFixed(1)} mm</Text><Text style={styles.currentMetricLabel}>RAIN NOW</Text></View>
            </View>
          </View>

          <View style={styles.fieldWeatherNote}>
            <Text style={styles.fieldWeatherEyebrow}>FIELD NOTE</Text>
            <Text style={styles.fieldWeatherTitle}>{currentCondition.label === 'Showers' || currentCondition.label === 'Thunderstorms' ? 'Plan around wet weather' : 'Use the forecast to plan field work'}</Text>
            <Text style={styles.fieldWeatherCopy}>{getFieldWeatherNote(weather)}</Text>
          </View>

          <Text style={styles.forecastTitle}>Next 7 days</Text>
          <View style={styles.forecastList}>
            {weather.daily.time.map((date, index) => {
              const condition = weatherDescription(weather.daily.weather_code[index]);
              const rainChance = weather.daily.precipitation_probability_max[index];
              return (
                <View key={date} style={[styles.forecastRow, index === 0 && styles.forecastToday]}>
                  <Text style={styles.forecastDay}>{formatForecastDay(date, index)}</Text>
                  <Text style={styles.forecastIcon}>{condition.icon}</Text>
                  <View style={styles.forecastRain}>
                    <Text style={styles.forecastRainChance}>↑ {rainChance ?? 0}%</Text>
                    <Text style={styles.forecastRainAmount}>{Number(weather.daily.precipitation_sum[index] || 0).toFixed(1)} mm</Text>
                  </View>
                  <Text style={styles.forecastTemperatures}>{Math.round(weather.daily.temperature_2m_max[index])}° <Text style={styles.forecastLow}>/ {Math.round(weather.daily.temperature_2m_min[index])}°</Text></Text>
                </View>
              );
            })}
          </View>
          <Text style={styles.weatherDisclaimer}>Forecast from Open-Meteo. Local conditions may vary; follow district advisories.</Text>
        </>
      )}
    </ScrollView>
  );
}

function PlantHealthScanScreen({ onBack }) {
  const { translate } = useLanguage();
  const [photo, setPhoto] = useState(null);
  const [diagnosis, setDiagnosis] = useState(null);
  const [diagnosisError, setDiagnosisError] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const selectPhoto = (asset) => {
    setPhoto(asset);
    setDiagnosis(null);
    setDiagnosisError('');
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(translate('Camera permission needed'), translate('Allow camera access to take a plant photo.'));
      return;
    }
    const picked = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.8 });
    if (!picked.canceled && picked.assets?.[0]?.uri) selectPhoto(picked.assets[0]);
  };

  const uploadPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(translate('Photo permission needed'), translate('Allow photo access to upload a plant image.'));
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.8 });
    if (!picked.canceled && picked.assets?.[0]?.uri) selectPhoto(picked.assets[0]);
  };

  const analyzePhoto = async () => {
    if (!photo?.uri || isAnalyzing) return;

    setIsAnalyzing(true);
    setDiagnosis(null);
    setDiagnosisError('');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);
    const baseUrl = 'https://luisotorres-plant-disease-detection.hf.space';
    const sessionHash = `plant-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    try {
      const imageFile = new File(photo.uri);
      const formData = new FormData();
      formData.append('files', imageFile, photo.fileName || imageFile.name || 'plant-photo.jpg');

      const uploadResponse = await expoFetch(`${baseUrl}/upload`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      if (!uploadResponse.ok) throw new Error('Photo upload failed. Check your connection and try again.');
      const uploadedFiles = await uploadResponse.json();
      const uploadedPath = uploadedFiles?.[0];
      if (!uploadedPath) throw new Error('The diagnosis service did not accept this photo.');

      const queueResponse = await fetch(`${baseUrl}/queue/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fn_index: 0,
          data: [{ path: uploadedPath, meta: { _type: 'gradio.FileData' } }],
          session_hash: sessionHash,
        }),
        signal: controller.signal,
      });
      if (!queueResponse.ok) throw new Error('The diagnosis service is unavailable. Try again later.');
      const queued = await queueResponse.json();
      if (!queued.event_id) throw new Error('The diagnosis service did not start analysis.');

      const resultResponse = await fetch(`${baseUrl}/queue/data?session_hash=${sessionHash}`, { signal: controller.signal });
      if (!resultResponse.ok) throw new Error('Could not retrieve the diagnosis. Try again.');
      const eventStream = await resultResponse.text();
      const completedEvent = eventStream
        .split('\n')
        .filter((line) => line.startsWith('data: '))
        .map((line) => {
          try {
            return JSON.parse(line.slice(6));
          } catch {
            return null;
          }
        })
        .find((event) => event?.msg === 'process_completed');
      const resultText = completedEvent?.output?.data?.[0];
      if (!completedEvent?.success || typeof resultText !== 'string') {
        throw new Error('The diagnosis service could not analyze this image. Try a clearer plant photo.');
      }
      const mappedDiagnosis = mapPlantDiagnosis(resultText);
      if (!mappedDiagnosis) throw new Error('The diagnosis service returned an unsupported result. Please try again later.');
      setDiagnosis(mappedDiagnosis);
    } catch (error) {
      setDiagnosisError(error.name === 'AbortError' ? 'Diagnosis took too long. Check your connection and try again.' : error.message || 'Diagnosis failed. Please try again later.');
    } finally {
      clearTimeout(timeout);
      setIsAnalyzing(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Pressable accessibilityRole="button" onPress={onBack} style={styles.backButton}><Text style={styles.backText}>‹  Harvest</Text></Pressable>
      <Text style={styles.eyebrow}>PLANT HEALTH CHECK</Text>
      <Text style={styles.title}>Plant health scan</Text>
      <Text style={styles.subtitle}>Add a clear plant photo for disease assessment.</Text>

      <View style={styles.scanNotice}>
        <Text style={styles.scanNoticeTitle}>Online plant disease screening</Text>
        <Text style={styles.scanNoticeText}>Your photo is uploaded to a public Hugging Face service for classification as Healthy, Powdery Mildew, or Rust. It may not recognize other crops or diseases; confirm results with a local agricultural advisor.</Text>
      </View>

      {photo ? <Image source={{ uri: photo.uri }} style={styles.scanPhoto} /> : (
        <View style={styles.photoPlaceholder}><Text style={styles.photoPlaceholderIcon}>＋</Text><Text style={styles.photoPlaceholderText}>Add a clear photo of one plant</Text></View>
      )}
      <View style={styles.scanPhotoActions}>
        <Pressable accessibilityRole="button" onPress={takePhoto} style={styles.scanPrimaryButton}><Text style={styles.scanPrimaryText}>Take photo</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={uploadPhoto} style={styles.scanSecondaryButton}><Text style={styles.scanSecondaryText}>Upload photo</Text></Pressable>
      </View>

      {!!photo && (
        <Pressable accessibilityRole="button" disabled={isAnalyzing} onPress={analyzePhoto} style={[styles.evaluateButton, isAnalyzing && styles.evaluateButtonDisabled]}>
          <Text style={styles.evaluateButtonText}>{isAnalyzing ? 'Analyzing photo…' : 'Diagnose photo'}</Text>
        </Pressable>
      )}

      {isAnalyzing && <ActivityIndicator accessibilityLabel="Analyzing plant photo" color="#23613A" size="large" style={styles.scanLoading} />}
      {!!diagnosis && <View accessibilityLiveRegion="polite" style={[styles.scanResult, diagnosis.style]}><Text style={styles.scanResultTitle}>{diagnosis.title}</Text><Text style={styles.scanResultText}>{diagnosis.detail}</Text><Text style={styles.scanResultMeta}><Text>Detected:</Text>{` ${diagnosis.detectedClass}`}{diagnosis.confidence ? <>{' · '}<Text>Confidence:</Text>{` ${diagnosis.confidence}%`}</> : null}</Text></View>}
      {!!diagnosisError && <View accessibilityLiveRegion="polite" style={[styles.scanResult, styles.resultCritical]}><Text style={styles.scanResultTitle}>Diagnosis unavailable</Text><Text style={styles.scanResultText}>{diagnosisError}</Text></View>}

      <Text style={styles.disclaimer}>This is an automated screening result, not a confirmed diagnosis. For urgent crop loss or spreading disease, contact a local agricultural advisor.</Text>
    </ScrollView>
  );
}

export function HarvestTaskGuideScreen({ plant, onBack }) {
  const { language } = useLanguage();
  const tasks = getHarvestTasks(plant);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Pressable accessibilityRole="button" onPress={onBack} style={styles.backButton}><Text style={styles.backText}>‹  Plants</Text></Pressable>
      <Text style={styles.eyebrow}>STEP-BY-STEP GUIDE</Text>
      <Text style={styles.title}>{plant.name} harvest</Text>
      <Text style={styles.subtitle}>A complete field-to-market sequence with estimated timing relative to planting.</Text>
      <View style={styles.guideWindow}><Text style={styles.guideWindowLabel}>CROP GUIDE HARVEST WINDOW</Text><Text style={styles.guideWindowValue}>{plant.harvest || 'Check local crop guidance'}</Text></View>
      {tasks.map((task, index) => (
        <View key={task.id} style={styles.guideRow}>
          <View style={styles.guideStep}><Text style={styles.guideStepText}>{String(index + 1).padStart(2, '0')}</Text></View>
          <View style={styles.taskCopy}><Text style={styles.taskNumber}>{formatDateRange(null, task.startDay, task.endDay, language)}{language === 'ta' ? '' : ' relative to planting'}</Text><Text style={styles.taskTitle}>{task.title}</Text><Text style={styles.taskDetail}>{task.detail}</Text></View>
        </View>
      ))}
      <Text style={styles.disclaimer}>Date ranges are planning estimates relative to planting, not fixed recommendations. Actual timing varies by variety, weather, and field conditions. Confirm decisions with local agricultural guidance.</Text>
    </ScrollView>
  );
}

const calendarStages = ['All', 'Planning', 'Preparing', 'Planting', 'Growing', 'Harvesting', 'Selling'];

export function HarvestCalendarScreen({ plants, followedCrops, onAddPlantingDate, focusRequest }) {
  const { language } = useLanguage();
  const followedPlants = plants.filter((plant) => followedCrops[plant.id]);
  const focusPlantingDate = focusRequest ? followedCrops[focusRequest.plantId]?.plantingDate : null;
  const initialFocusDate = focusPlantingDate
    ? addDaysToDateKey(focusPlantingDate, focusRequest.startDay)
    : dateKey(new Date());
  const initialCalendarDate = dateFromKey(initialFocusDate);
  const [selectedPlantId, setSelectedPlantId] = useState(focusRequest?.plantId || followedPlants[0]?.id || null);
  const [selectedStage, setSelectedStage] = useState('All');
  const [displayedMonth, setDisplayedMonth] = useState(() => new Date(initialCalendarDate.getFullYear(), initialCalendarDate.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(initialFocusDate);
  const selectedPlant = followedPlants.find((plant) => plant.id === selectedPlantId) || followedPlants[0];
  const plantingDate = selectedPlant ? followedCrops[selectedPlant.id]?.plantingDate : null;
  const tasks = selectedPlant && plantingDate ? getHarvestTasks(selectedPlant) : [];
  const visibleTasks = selectedStage === 'All' ? tasks : tasks.filter((task) => task.stage === selectedStage);
  const datedTasks = visibleTasks.map((task) => {
    const [year, month, day] = plantingDate.split('-').map(Number);
    return {
      ...task,
      rangeStart: new Date(year, month - 1, day + task.startDay),
      rangeEnd: new Date(year, month - 1, day + task.endDay),
    };
  });
  const monthDays = getMonthDays(displayedMonth);
  const monthWeeks = Array.from({ length: 6 }, (_, weekIndex) => monthDays.slice(weekIndex * 7, (weekIndex + 1) * 7));
  const selectStage = (stage) => {
    setSelectedStage(stage);
    if (!selectedPlant || !plantingDate) return;

    const stageTasks = getHarvestTasks(selectedPlant).filter((task) => stage === 'All' || task.stage === stage);
    const firstTask = stageTasks.reduce((earliest, task) => (
      !earliest || task.startDay < earliest.startDay ? task : earliest
    ), null);
    if (!firstTask) return;

    const [year, month, day] = plantingDate.split('-').map(Number);
    const firstTaskDate = new Date(year, month - 1, day + firstTask.startDay);
    setSelectedDate(dateKey(firstTaskDate));
    setDisplayedMonth(new Date(firstTaskDate.getFullYear(), firstTaskDate.getMonth(), 1));
  };
  const tasksForSelectedDate = datedTasks.filter((task) => {
    const key = selectedDate;
    return dateKey(task.rangeStart) <= key && dateKey(task.rangeEnd) >= key;
  });
  const selectedDateValue = dateFromKey(selectedDate);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>YOUR CROP SCHEDULE</Text>
      <Text style={styles.title}>Harvest calendar</Text>
      <Text style={styles.subtitle}>Choose a crop and day to see what needs doing.</Text>

      {!followedPlants.length ? (
        <View style={styles.calendarEmpty}>
          <Text style={styles.calendarEmptyTitle}>No followed crops yet</Text>
          <Text style={styles.calendarEmptyCopy}>Follow a crop from Plants and it will appear in your calendar.</Text>
        </View>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cropSelector}>
            {followedPlants.map((plant) => {
              const active = selectedPlant?.id === plant.id;
              return (
                <Pressable key={plant.id} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => {
                  setSelectedPlantId(plant.id);
                  const cropDate = dateFromKey(followedCrops[plant.id]?.plantingDate);
                  if (cropDate) {
                    setSelectedDate(dateKey(cropDate));
                    setDisplayedMonth(new Date(cropDate.getFullYear(), cropDate.getMonth(), 1));
                  }
                }} style={[styles.cropChip, active && styles.cropChipActive]}>
                  <Text style={[styles.cropChipText, active && styles.cropChipTextActive]}>{plant.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {selectedPlant && !plantingDate ? (
            <View style={styles.calendarEmpty}>
              <Text style={styles.calendarEmptyTitle}>{selectedPlant.name} needs a planting date</Text>
              <Text style={styles.calendarEmptyCopy}>Add the planting date in Harvest Planner to calculate this crop’s calendar dates.</Text>
              <Pressable accessibilityRole="button" onPress={() => onAddPlantingDate(selectedPlant.id)} style={styles.calendarAction}><Text style={styles.calendarActionText}>Add planting date</Text></Pressable>
            </View>
          ) : selectedPlant ? (
            <>
              <View style={styles.calendarCropInfo}>
                <View style={styles.calendarCropCopy}><Text style={styles.calendarCropName}>{selectedPlant.name}</Text><Text style={styles.calendarCropDate}>Planted {plantingDate}</Text></View>
                <Text style={styles.calendarHarvestWindow}>{selectedPlant.harvest || 'Harvest date varies'}</Text>
              </View>

              <Text style={styles.filterLabel}>Show tasks</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stageFilters}>
                {calendarStages.map((stage) => {
                  const active = selectedStage === stage;
                  return (
                    <Pressable key={stage} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => selectStage(stage)} style={[styles.stageChip, active && styles.stageChipActive]}>
                      <Text style={[styles.stageChipText, active && styles.stageChipTextActive]}>{stage}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View style={styles.monthCalendar}>
                <View style={styles.monthHeader}>
                  <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => setDisplayedMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))} style={styles.monthArrow}><Text style={styles.monthArrowText}>‹</Text></Pressable>
                  <View style={styles.monthTitleWrap}><Text style={styles.monthTitle}>{displayedMonth.toLocaleDateString(language === 'ta' ? 'ta-IN' : 'en', { month: 'long', year: 'numeric' })}</Text><Pressable accessibilityRole="button" onPress={() => {
                    const now = new Date();
                    setDisplayedMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                    setSelectedDate(dateKey(now));
                  }}><Text style={styles.todayButton}>Today</Text></Pressable></View>
                  <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => setDisplayedMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))} style={styles.monthArrow}><Text style={styles.monthArrowText}>›</Text></Pressable>
                </View>
                <View style={styles.weekHeader}>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <Text key={day} style={styles.weekday}>{day}</Text>)}
                </View>
                <View style={styles.monthGrid}>
                  {monthWeeks.map((week, weekIndex) => (
                    <View key={`week-${weekIndex}`} style={styles.monthWeekRow}>
                      {week.map((day) => {
                        const key = dateKey(day);
                        const dayTasks = datedTasks.filter((task) => dateKey(task.rangeStart) <= key && dateKey(task.rangeEnd) >= key);
                        const inMonth = day.getMonth() === displayedMonth.getMonth();
                        const isSelected = key === selectedDate;
                        const isToday = key === dateKey(new Date());
                        const taskStage = dayTasks[0]?.stage;
                        return (
                          <Pressable key={key} accessibilityRole="button" accessibilityLabel={`${day.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}, ${dayTasks.length} tasks`} accessibilityState={{ selected: isSelected }} onPress={() => {
                            setSelectedDate(key);
                            if (!inMonth) setDisplayedMonth(new Date(day.getFullYear(), day.getMonth(), 1));
                          }} style={styles.dayCell}>
                            <View style={[styles.dayNumberWrap, taskStage && styles[`dayNumber${taskStage}`], !inMonth && !isSelected && styles.dayNumberOutsideMonth, isSelected && styles.dayNumberSelected, isToday && !isSelected && styles.dayNumberToday]}>
                              <Text style={[styles.dayNumber, taskStage && styles[`dayNumberText${taskStage}`], !inMonth && !taskStage && styles.dayNumberOutside, isSelected && styles.dayNumberTextSelected]}>{day.getDate()}</Text>
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  ))}
                </View>
                <View style={styles.calendarLegend}>
                  {calendarStages.slice(1).map((stage) => (
                    <View key={stage} style={styles.legendItem}>
                      <View style={[styles.legendSwatch, styles[`dayNumber${stage}`]]} />
                      <Text style={styles.legendText}>{stage}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.calendarHint}>Tap a colored date to see its tasks.</Text>
              </View>

                <View style={styles.agendaHeader}><Text style={styles.calendarSectionTitle}>{selectedDateValue?.toLocaleDateString(language === 'ta' ? 'ta-IN' : 'en', { weekday: 'long', month: 'long', day: 'numeric' })}</Text><Text style={styles.agendaCount}>{tasksForSelectedDate.length} {tasksForSelectedDate.length === 1 ? 'task' : 'tasks'}</Text></View>
              {!tasksForSelectedDate.length ? <Text style={styles.emptyTasks}>No {selectedStage === 'All' ? '' : `${selectedStage.toLowerCase()} `}tasks scheduled for this date.</Text> : tasksForSelectedDate.map((task) => (
                <View key={task.id} style={styles.calendarTask}>
                  <View style={[styles.stageMarker, styles[`stageMarker${task.stage}`]]} />
                  <View style={styles.calendarTaskCopy}>
                    <View style={styles.calendarTaskMeta}><Text style={styles.calendarTaskStage}>{task.stage}</Text><Text style={styles.calendarTaskDate}>{formatDateRange(plantingDate, task.startDay, task.endDay)}</Text></View>
                    <Text style={styles.calendarTaskTitle}>{task.title}</Text>
                    <Text style={styles.calendarTaskDetail}>{task.detail}</Text>
                  </View>
                </View>
              ))}
              <Text style={styles.disclaimer}>Date ranges are estimates based on planting date and crop guide timing. Adjust for variety, weather, and local field conditions.</Text>
            </>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

export function ProfileScreen({ user, onLogout, onOpenAssistant }) {
  const { language, setLanguage } = useLanguage();
  const [advisorArea, setAdvisorArea] = useState('');
  const initials = user.name.trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

  const openAdvisorLink = async (url) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Unable to open link', 'Please check that your device has a phone or maps app available.');
    }
  };

  const searchLocalOffice = (office) => {
    const area = advisorArea.trim();
    if (!area) {
      Alert.alert('Enter your area', 'Add your village, district, or PIN code to find nearby offices.');
      return;
    }
    const query = encodeURIComponent(`${office} near ${area}`);
    openAdvisorLink(`https://www.google.com/maps/search/?api=1&query=${query}`);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>ACCOUNT</Text>
      <Text style={styles.title}>Your profile</Text>
      <View style={styles.profileHeader}>
        <View style={styles.profileAvatar}><Text style={styles.profileInitials}>{initials}</Text></View>
        <View style={styles.profileCopy}><Text style={styles.profileName}>{user.name}</Text><Text style={styles.profileRole}>{user.role === 'admin' ? 'Administrator' : 'Farmer account'}</Text></View>
      </View>

      <Pressable accessibilityRole="button" onPress={onOpenAssistant} style={styles.assistantMenuItem}>
        <View style={styles.assistantMenuMark}><Text style={styles.assistantMenuMarkText}>AI</Text></View>
        <View style={styles.assistantMenuCopy}>
          <Text style={styles.assistantMenuTitle}>AI Farmer Assistant</Text>
          <Text style={styles.assistantMenuDescription}>Ask farming questions in English or Tamil</Text>
        </View>
        <Text style={styles.assistantMenuArrow}>›</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>Account details</Text>
      <View style={styles.details}>
        <View style={styles.detailRow}><Text style={styles.detailLabel}>NAME</Text><Text style={styles.detailValue}>{user.name}</Text></View>
        <View style={styles.detailDivider} />
        <View style={styles.detailRow}><Text style={styles.detailLabel}>USERNAME</Text><Text style={styles.detailValue}>{user.userId}</Text></View>
        <View style={styles.detailDivider} />
        <View style={styles.detailRow}><Text style={styles.detailLabel}>ACCOUNT TYPE</Text><Text style={styles.detailValue}>{user.role === 'admin' ? 'Admin' : 'Farmer'}</Text></View>
      </View>

      <Text style={styles.sectionTitle}>Contact advisors</Text>
      <Text style={styles.advisorIntro}>Get farming advice or find a nearby agricultural office.</Text>
      <View style={styles.advisorPanel}>
        <Text style={styles.advisorOrganization}>Kisan Call Centre · Government of India</Text>
        <Text style={styles.advisorDescription}>Talk to an agricultural advisor in your local language.</Text>
        <Text style={styles.advisorPhone}>1800-180-1551</Text>
        <Pressable accessibilityRole="button" onPress={() => openAdvisorLink('tel:18001801551')} style={styles.advisorCallButton}>
          <Text style={styles.advisorCallText}>Call Kisan Call Centre</Text>
        </Pressable>
        <Pressable accessibilityRole="link" onPress={() => openAdvisorLink('https://www.manage.gov.in/kcc/aboutkcc.asp')} style={styles.advisorSourceButton}>
          <Text style={styles.advisorSourceText}>Official contact information</Text>
        </Pressable>
      </View>

      <View style={styles.localAdvisorSection}>
        <Text style={styles.localAdvisorTitle}>Find a nearby office</Text>
        <Text style={styles.advisorDescription}>Enter your village, district, or PIN code. It will be used to search Google Maps.</Text>
        <TextInput
          accessibilityLabel="Village, district, or PIN code"
          value={advisorArea}
          onChangeText={setAdvisorArea}
          placeholder="e.g. Madurai or 625001"
          placeholderTextColor="#89948B"
          returnKeyType="search"
          style={styles.advisorAreaInput}
        />
        <Pressable accessibilityRole="button" onPress={() => searchLocalOffice('Krishi Vigyan Kendra')} style={styles.localAdvisorButton}>
          <Text style={styles.localAdvisorButtonText}>Find nearest KVK</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => searchLocalOffice('District Agriculture Office')} style={styles.localAdvisorSecondaryButton}>
          <Text style={styles.localAdvisorSecondaryText}>Find District Agriculture Office</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>App language</Text>
      <Text style={styles.languageHint}>Choose the language used across the app.</Text>
      <View accessibilityRole="radiogroup" style={styles.languagePicker}>
        <Pressable accessibilityRole="radio" accessibilityState={{ checked: language === 'en' }} onPress={() => setLanguage('en')} style={[styles.languageOption, language === 'en' && styles.languageSelected]}>
          <Text style={[styles.languageOptionText, language === 'en' && styles.languageSelectedText]}>English</Text>
        </Pressable>
        <Pressable accessibilityRole="radio" accessibilityState={{ checked: language === 'ta' }} onPress={() => setLanguage('ta')} style={[styles.languageOption, language === 'ta' && styles.languageSelected]}>
          <Text style={[styles.languageOptionText, language === 'ta' && styles.languageSelectedText]}>தமிழ்</Text>
        </Pressable>
      </View>

      <Pressable accessibilityRole="button" onPress={onLogout} style={styles.logoutButton}>
        <Text style={styles.logoutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#F7F8F2', flex: 1 },
  content: { padding: 22, paddingBottom: 32, paddingTop: 27 },
  backButton: { alignSelf: 'flex-start', marginBottom: 20, paddingVertical: 4, paddingRight: 12 },
  backText: { color: '#23613A', fontSize: 14, fontWeight: '800' },
  eyebrow: { color: '#E47B35', fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  title: { color: '#17391F', fontSize: 28, fontWeight: '900', marginTop: 7 },
  subtitle: { color: '#718075', fontSize: 14, lineHeight: 21, marginTop: 7, maxWidth: 330 },
  summary: { alignItems: 'center', backgroundColor: '#EAF1E5', borderRadius: 14, flexDirection: 'row', gap: 14, marginTop: 22, padding: 16 },
  summaryCount: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 11, height: 66, justifyContent: 'center', width: 72 },
  countValue: { color: '#23613A', fontSize: 23, fontWeight: '900' },
  countLabel: { color: '#718075', fontSize: 8, fontWeight: '800', marginTop: 2 },
  summaryCopy: { flex: 1 },
  summaryTitle: { color: '#17391F', fontSize: 15, fontWeight: '800' },
  summaryText: { color: '#718075', fontSize: 12, lineHeight: 17, marginTop: 3 },
  toolsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  toolCard: { backgroundColor: '#FFFFFF', borderColor: '#E4EAE1', borderRadius: 12, borderWidth: 1, flexBasis: '47%', flexGrow: 1, minWidth: 145, padding: 13 },
  toolIcon: { alignItems: 'center', backgroundColor: '#EAF1E5', borderRadius: 10, height: 38, justifyContent: 'center', width: 38 },
  scanIcon: { backgroundColor: '#FFF1E4' },
  toolIconText: { color: '#23613A', fontSize: 22, fontWeight: '800' },
  toolTitle: { color: '#17391F', fontSize: 14, fontWeight: '900', lineHeight: 19, marginTop: 11 },
  toolDescription: { color: '#718075', fontSize: 11, lineHeight: 16, marginTop: 5, minHeight: 48 },
  toolAction: { color: '#23613A', fontSize: 11, fontWeight: '800', marginTop: 10 },
  weatherContent: { padding: 22, paddingBottom: 32, paddingTop: 18 },
  weatherSearchRow: { alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 19 },
  weatherSearchInput: { backgroundColor: '#FFFFFF', borderColor: '#CBD7D0', borderRadius: 10, borderWidth: 1, color: '#17391F', flex: 1, fontSize: 15, minHeight: 49, paddingHorizontal: 13, paddingVertical: 10 },
  weatherSearchButton: { alignItems: 'center', backgroundColor: '#23613A', borderRadius: 10, justifyContent: 'center', minHeight: 49, minWidth: 63, paddingHorizontal: 15 },
  weatherSearchButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  weatherError: { backgroundColor: '#FFF0ED', borderLeftColor: '#B84D3B', borderLeftWidth: 4, borderRadius: 8, color: '#805A3D', fontSize: 13, lineHeight: 19, marginTop: 12, padding: 12 },
  weatherEmpty: { alignItems: 'center', backgroundColor: '#EAF1ED', borderRadius: 15, justifyContent: 'center', marginTop: 20, minHeight: 150, paddingHorizontal: 18, paddingVertical: 22 },
  weatherEmptyIcon: { fontSize: 31 },
  weatherEmptyTitle: { color: '#17391F', fontSize: 17, fontWeight: '800', marginTop: 8, textAlign: 'center' },
  weatherEmptyCopy: { color: '#647568', fontSize: 13, lineHeight: 19, marginTop: 5, textAlign: 'center' },
  weatherLoading: { alignItems: 'center', backgroundColor: '#EAF1ED', borderRadius: 15, marginTop: 20, padding: 28 },
  weatherLoadingText: { color: '#647568', fontSize: 13, marginTop: 10 },
  currentWeatherCard: { backgroundColor: '#194D46', borderRadius: 14, marginTop: 20, padding: 17 },
  currentWeatherTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  currentLocationCopy: { flex: 1 },
  currentLocation: { color: '#FFFFFF', fontSize: 20, fontWeight: '900' },
  currentRegion: { color: '#C4D9D3', fontSize: 12, marginTop: 3 },
  currentWeatherIcon: { fontSize: 35, marginLeft: 10 },
  currentWeatherSummary: { alignItems: 'center', flexDirection: 'row', marginTop: 15 },
  currentTemperature: { color: '#FFFFFF', fontSize: 54, fontWeight: '800', lineHeight: 62 },
  currentConditionCopy: { marginLeft: 10 },
  currentCondition: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  feelsLike: { color: '#C4D9D3', fontSize: 12, marginTop: 3 },
  currentMetrics: { borderTopColor: '#47766E', borderTopWidth: 1, flexDirection: 'row', marginTop: 14, paddingTop: 12 },
  currentMetric: { flex: 1, minWidth: 0, paddingRight: 7 },
  currentMetricValue: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  currentMetricLabel: { color: '#C4D9D3', fontSize: 8, fontWeight: '800', marginTop: 4 },
  fieldWeatherNote: { backgroundColor: '#E6F0F3', borderLeftColor: '#3583A2', borderLeftWidth: 4, borderRadius: 10, marginTop: 13, padding: 14 },
  fieldWeatherEyebrow: { color: '#536B72', fontSize: 9, fontWeight: '900' },
  fieldWeatherTitle: { color: '#21453E', fontSize: 14, fontWeight: '900', marginTop: 4 },
  fieldWeatherCopy: { color: '#536157', fontSize: 12, lineHeight: 18, marginTop: 4 },
  forecastTitle: { color: '#17391F', fontSize: 17, fontWeight: '900', marginBottom: 9, marginTop: 20 },
  forecastList: { backgroundColor: '#FFFFFF', borderColor: '#DCE7E0', borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  forecastRow: { alignItems: 'center', borderBottomColor: '#E6ECE8', borderBottomWidth: 1, flexDirection: 'row', minHeight: 54, paddingHorizontal: 11 },
  forecastToday: { backgroundColor: '#F0F5F2' },
  forecastDay: { color: '#29483E', flexBasis: 49, fontSize: 12, fontWeight: '800' },
  forecastIcon: { fontSize: 19, textAlign: 'center', width: 31 },
  forecastRain: { flex: 1, marginLeft: 7, minWidth: 57 },
  forecastRainChance: { color: '#347C9D', fontSize: 11, fontWeight: '900' },
  forecastRainAmount: { color: '#82928B', fontSize: 9, marginTop: 2 },
  forecastTemperatures: { color: '#29483E', flexShrink: 0, fontSize: 12, fontWeight: '800' },
  forecastLow: { color: '#82928B', fontWeight: '500' },
  weatherDisclaimer: { color: '#89948B', fontSize: 10, lineHeight: 15, marginTop: 13 },
  sectionTitle: { color: '#17391F', fontSize: 18, fontWeight: '800', marginBottom: 10, marginTop: 25 },
  cropRow: { alignItems: 'center', backgroundColor: '#FFFFFF', borderBottomColor: '#EDF0EA', borderBottomWidth: 1, flexDirection: 'row', gap: 11, minHeight: 72, paddingHorizontal: 13 },
  check: { alignItems: 'center', borderColor: '#C8D2C8', borderRadius: 8, borderWidth: 1.5, height: 23, justifyContent: 'center', width: 23 },
  checked: { backgroundColor: '#23613A', borderColor: '#23613A' },
  checkMark: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', lineHeight: 18 },
  cropCopy: { flex: 1 },
  cropName: { color: '#17391F', fontSize: 14, fontWeight: '800' },
  cropMeta: { color: '#718075', fontSize: 11, lineHeight: 16, marginTop: 4 },
  rowAction: { color: '#23613A', fontSize: 12, fontWeight: '800', paddingLeft: 5 },
  planSection: { marginTop: 4 },
  planRow: { alignItems: 'center', backgroundColor: '#FFFFFF', borderBottomColor: '#EDF0EA', borderBottomWidth: 1, flexDirection: 'row', gap: 12, padding: 13 },
  planDot: { backgroundColor: '#E47B35', borderRadius: 5, height: 9, width: 9 },
  browseButton: { alignItems: 'center', backgroundColor: '#23613A', borderRadius: 11, marginTop: 20, padding: 14 },
  browseButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  scanNotice: { backgroundColor: '#FFF7EF', borderColor: '#F0DEC7', borderRadius: 10, borderWidth: 1, marginTop: 18, padding: 13 },
  scanNoticeTitle: { color: '#805A3D', fontSize: 13, fontWeight: '900' },
  scanNoticeText: { color: '#806B58', fontSize: 12, lineHeight: 18, marginTop: 4 },
  photoPlaceholder: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#DCE4D9', borderRadius: 12, borderStyle: 'dashed', borderWidth: 1.5, height: 190, justifyContent: 'center', marginTop: 15, padding: 18 },
  photoPlaceholderIcon: { color: '#23613A', fontSize: 34, fontWeight: '400' },
  photoPlaceholderText: { color: '#718075', fontSize: 13, fontWeight: '700', marginTop: 7, textAlign: 'center' },
  scanPhoto: { backgroundColor: '#EAF1E5', borderRadius: 12, height: 230, marginTop: 15, width: '100%' },
  scanPhotoActions: { flexDirection: 'row', gap: 9, marginTop: 11 },
  scanPrimaryButton: { alignItems: 'center', backgroundColor: '#23613A', borderRadius: 9, flex: 1, justifyContent: 'center', minHeight: 47, paddingHorizontal: 10 },
  scanPrimaryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800', textAlign: 'center' },
  scanSecondaryButton: { alignItems: 'center', backgroundColor: '#EAF1E5', borderRadius: 9, flex: 1, justifyContent: 'center', minHeight: 47, paddingHorizontal: 10 },
  scanSecondaryText: { color: '#23613A', fontSize: 13, fontWeight: '800', textAlign: 'center' },
  evaluateButton: { alignItems: 'center', backgroundColor: '#23613A', borderRadius: 10, justifyContent: 'center', marginTop: 16, minHeight: 49, paddingHorizontal: 14 },
  evaluateButtonDisabled: { opacity: 0.65 },
  evaluateButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  scanLoading: { marginTop: 18 },
  scanResult: { borderRadius: 11, borderLeftWidth: 4, marginTop: 14, padding: 14 },
  resultGood: { backgroundColor: '#EAF4E9', borderLeftColor: '#347A3C' },
  resultMaintenance: { backgroundColor: '#FFF6E2', borderLeftColor: '#D09A27' },
  resultCritical: { backgroundColor: '#FFF0ED', borderLeftColor: '#B84D3B' },
  scanResultTitle: { color: '#17391F', fontSize: 16, fontWeight: '900' },
  scanResultText: { color: '#536157', fontSize: 13, lineHeight: 19, marginTop: 5 },
  scanResultMeta: { color: '#647568', fontSize: 11, fontWeight: '700', marginTop: 8 },
  followedRow: { alignItems: 'center', backgroundColor: '#FFFFFF', borderBottomColor: '#EDF0EA', borderBottomWidth: 1, flexDirection: 'row', gap: 12, marginTop: 10, minHeight: 76, padding: 14 },
  followedAccent: { backgroundColor: '#E47B35', borderRadius: 3, height: 38, width: 4 },
  datePanel: { backgroundColor: '#FFFFFF', borderColor: '#E4EAE1', borderRadius: 14, borderWidth: 1, marginTop: 22, padding: 17 },
  dateTitle: { color: '#17391F', fontSize: 17, fontWeight: '800' },
  dateCopy: { color: '#718075', fontSize: 13, lineHeight: 19, marginTop: 5 },
  dateInput: { borderColor: '#DCE4D9', borderRadius: 10, borderWidth: 1, color: '#17391F', fontSize: 16, marginTop: 16, paddingHorizontal: 13, paddingVertical: 13 },
  dateError: { color: '#B84D3B', fontSize: 12, marginTop: 7 },
  saveDateButton: { alignItems: 'center', backgroundColor: '#23613A', borderRadius: 10, marginTop: 12, minHeight: 46, justifyContent: 'center', paddingHorizontal: 14 },
  saveDateText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  dateHint: { color: '#718075', fontSize: 12, lineHeight: 18, marginTop: 13 },
  progressPanel: { alignItems: 'center', backgroundColor: '#EAF1E5', borderRadius: 13, flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, padding: 15 },
  progressCopy: { flex: 1 },
  progressHeading: { color: '#647568', fontSize: 11, fontWeight: '700' },
  progressDate: { color: '#17391F', fontSize: 16, fontWeight: '800', marginTop: 3 },
  progressCount: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 10, minWidth: 68, paddingHorizontal: 10, paddingVertical: 8 },
  progressValue: { color: '#23613A', fontSize: 16, fontWeight: '900' },
  progressLabel: { color: '#718075', fontSize: 8, fontWeight: '900', marginTop: 2 },
  scheduleNote: { color: '#718075', fontSize: 11, lineHeight: 17, marginTop: 12 },
  taskRow: { backgroundColor: '#FFFFFF', borderBottomColor: '#EDF0EA', borderBottomWidth: 1, padding: 14 },
  taskToggle: { alignItems: 'flex-start', flexDirection: 'row', gap: 12 },
  taskCheck: { alignItems: 'center', borderColor: '#C8D2C8', borderRadius: 8, borderWidth: 1.5, height: 24, justifyContent: 'center', marginTop: 2, width: 24 },
  taskChecked: { backgroundColor: '#23613A', borderColor: '#23613A' },
  taskCheckMark: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', lineHeight: 18 },
  taskCopy: { flex: 1 },
  taskNumber: { color: '#E47B35', fontSize: 9, fontWeight: '900' },
  taskTitle: { color: '#17391F', fontSize: 14, fontWeight: '800', marginTop: 3 },
  taskTitleDone: { color: '#718075', textDecorationLine: 'line-through' },
  taskDetail: { color: '#718075', fontSize: 12, lineHeight: 18, marginTop: 5 },
  goCalendarButton: { alignSelf: 'flex-start', marginLeft: 36, marginTop: 8, minHeight: 36, justifyContent: 'center', paddingHorizontal: 2 },
  goCalendarText: { color: '#23613A', fontSize: 12, fontWeight: '800' },
  guideWindow: { backgroundColor: '#EAF1E5', borderRadius: 12, marginBottom: 16, marginTop: 22, padding: 15 },
  guideWindowLabel: { color: '#718075', fontSize: 9, fontWeight: '900' },
  guideWindowValue: { color: '#23613A', fontSize: 16, fontWeight: '800', marginTop: 5 },
  guideRow: { backgroundColor: '#FFFFFF', borderBottomColor: '#EDF0EA', borderBottomWidth: 1, flexDirection: 'row', gap: 12, padding: 14 },
  guideStep: { alignItems: 'center', backgroundColor: '#FFF1E4', borderRadius: 9, height: 34, justifyContent: 'center', width: 38 },
  guideStepText: { color: '#9A4E1B', fontSize: 11, fontWeight: '900' },
  cropSelector: { gap: 8, paddingBottom: 4, paddingTop: 17 },
  cropChip: { backgroundColor: '#FFFFFF', borderColor: '#DCE4D9', borderRadius: 10, borderWidth: 1, justifyContent: 'center', minHeight: 46, paddingHorizontal: 16 },
  cropChipActive: { backgroundColor: '#23613A', borderColor: '#23613A' },
  cropChipText: { color: '#536157', fontSize: 14, fontWeight: '700' },
  cropChipTextActive: { color: '#FFFFFF' },
  calendarEmpty: { alignItems: 'flex-start', backgroundColor: '#FFFFFF', borderColor: '#E4EAE1', borderRadius: 13, borderWidth: 1, marginTop: 22, padding: 17 },
  calendarEmptyTitle: { color: '#17391F', fontSize: 17, fontWeight: '800' },
  calendarEmptyCopy: { color: '#718075', fontSize: 13, lineHeight: 19, marginTop: 6 },
  calendarAction: { alignItems: 'center', backgroundColor: '#23613A', borderRadius: 9, justifyContent: 'center', marginTop: 14, minHeight: 44, paddingHorizontal: 14 },
  calendarActionText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  calendarCropInfo: { alignItems: 'center', backgroundColor: '#EAF1E5', borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, padding: 15 },
  calendarCropCopy: { flex: 1 },
  calendarCropName: { color: '#17391F', fontSize: 16, fontWeight: '900' },
  calendarCropDate: { color: '#718075', fontSize: 12, marginTop: 3 },
  calendarHarvestWindow: { color: '#23613A', flexShrink: 1, fontSize: 11, fontWeight: '800', marginLeft: 9, textAlign: 'right' },
  filterLabel: { color: '#536157', fontSize: 13, fontWeight: '800', marginTop: 18 },
  stageFilters: { gap: 7, paddingBottom: 3, paddingTop: 8 },
  stageChip: { backgroundColor: '#FFFFFF', borderColor: '#E1E8DF', borderRadius: 9, borderWidth: 1, justifyContent: 'center', minHeight: 42, paddingHorizontal: 13 },
  stageChipActive: { backgroundColor: '#17391F', borderColor: '#17391F' },
  stageChipText: { color: '#667469', fontSize: 13, fontWeight: '700' },
  stageChipTextActive: { color: '#FFFFFF' },
  monthCalendar: { backgroundColor: '#FFFFFF', borderColor: '#E6EBE3', borderRadius: 12, borderWidth: 1, marginTop: 11, padding: 11 },
  monthHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 11 },
  monthArrow: { alignItems: 'center', backgroundColor: '#F1F5EF', borderRadius: 10, height: 44, justifyContent: 'center', width: 44 },
  monthArrowText: { color: '#23613A', fontSize: 27, fontWeight: '600', lineHeight: 31 },
  monthTitleWrap: { alignItems: 'center', flex: 1 },
  monthTitle: { color: '#17391F', fontSize: 18, fontWeight: '800' },
  todayButton: { color: '#23613A', fontSize: 12, fontWeight: '800', marginTop: 4, padding: 3 },
  weekHeader: { flexDirection: 'row', marginBottom: 4 },
  weekday: { color: '#647568', flex: 1, fontSize: 10, fontWeight: '800', paddingVertical: 7, textAlign: 'center' },
  monthGrid: { flexDirection: 'column' },
  monthWeekRow: { flexDirection: 'row' },
  dayCell: { alignItems: 'center', flex: 1, height: 51, justifyContent: 'flex-start', minWidth: 0, paddingTop: 2 },
  dayNumberWrap: { alignItems: 'center', borderRadius: 18, height: 35, justifyContent: 'center', width: 35 },
  dayNumberOutsideMonth: { opacity: 0.35 },
  dayNumberSelected: { borderColor: '#17391F', borderWidth: 3, elevation: 3, shadowColor: '#17391F', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, transform: [{ scale: 1.1 }], zIndex: 1 },
  dayNumberToday: { borderColor: '#23613A', borderWidth: 1 },
  dayNumber: { color: '#25382B', fontSize: 14, fontWeight: '600' },
  dayNumberOutside: { color: '#B8C0B8' },
  dayNumberTextSelected: { color: '#17391F', fontSize: 15, fontWeight: '900' },
  dayNumberPlanning: { backgroundColor: '#FFF1C7' },
  dayNumberTextPlanning: { color: '#795A00', fontWeight: '800' },
  dayNumberPreparing: { backgroundColor: '#DCEAF8' },
  dayNumberTextPreparing: { color: '#28577E', fontWeight: '800' },
  dayNumberPlanting: { backgroundColor: '#FCE4D4' },
  dayNumberTextPlanting: { color: '#914917', fontWeight: '800' },
  dayNumberGrowing: { backgroundColor: '#DDF1EB' },
  dayNumberTextGrowing: { color: '#28675D', fontWeight: '800' },
  dayNumberHarvesting: { backgroundColor: '#DDEEDB' },
  dayNumberTextHarvesting: { color: '#28613A', fontWeight: '800' },
  dayNumberSelling: { backgroundColor: '#EEE5F4' },
  dayNumberTextSelling: { color: '#65437A', fontWeight: '800' },
  calendarLegend: { borderTopColor: '#EDF0EA', borderTopWidth: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 7, paddingTop: 10 },
  legendItem: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  legendSwatch: { borderRadius: 7, height: 14, width: 14 },
  legendText: { color: '#536157', fontSize: 10, fontWeight: '600' },
  calendarHint: { color: '#718075', fontSize: 11, marginTop: 9, textAlign: 'center' },
  agendaHeader: { alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between', marginTop: 9 },
  calendarSectionTitle: { color: '#17391F', flex: 1, fontSize: 17, fontWeight: '800', marginBottom: 9, marginTop: 12 },
  agendaCount: { color: '#23613A', fontSize: 12, fontWeight: '800', marginLeft: 8 },
  calendarTask: { backgroundColor: '#FFFFFF', borderBottomColor: '#EDF0EA', borderBottomWidth: 1, flexDirection: 'row', gap: 11, paddingHorizontal: 13, paddingVertical: 15 },
  stageMarker: { alignSelf: 'stretch', borderRadius: 3, width: 4 },
  stageMarkerPlanning: { backgroundColor: '#D6A42B' },
  stageMarkerPreparing: { backgroundColor: '#467BB5' },
  stageMarkerPlanting: { backgroundColor: '#E47B35' },
  stageMarkerGrowing: { backgroundColor: '#4A9A8F' },
  stageMarkerHarvesting: { backgroundColor: '#23613A' },
  stageMarkerSelling: { backgroundColor: '#8B66AF' },
  calendarTaskCopy: { flex: 1 },
  calendarTaskMeta: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 4 },
  calendarTaskStage: { color: '#718075', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  calendarTaskDate: { color: '#23613A', fontSize: 11, fontWeight: '800', marginLeft: 7 },
  calendarTaskTitle: { color: '#17391F', fontSize: 15, fontWeight: '800', marginTop: 6 },
  calendarTaskDetail: { color: '#647568', fontSize: 13, lineHeight: 19, marginTop: 5 },
  emptyTasks: { color: '#718075', fontSize: 13, paddingVertical: 20 },
  weatherPanel: { backgroundColor: '#EAF1E5', borderRadius: 15, marginTop: 22, padding: 17 },
  weatherTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  weatherTitle: { color: '#17391F', fontSize: 16, fontWeight: '800' },
  locationPill: { backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 6 },
  locationText: { color: '#68786B', fontSize: 8, fontWeight: '900' },
  weatherStatus: { color: '#23613A', fontSize: 21, fontWeight: '900', marginTop: 20 },
  weatherCopy: { color: '#647568', fontSize: 13, lineHeight: 19, marginTop: 5, maxWidth: 330 },
  sectionHeader: { alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  sectionMeta: { color: '#89948B', fontSize: 8, fontWeight: '900' },
  insightRow: { backgroundColor: '#FFFFFF', borderBottomColor: '#EDF0EA', borderBottomWidth: 1, flexDirection: 'row', gap: 12, paddingHorizontal: 13, paddingVertical: 14 },
  insightIndex: { alignItems: 'center', backgroundColor: '#FFF1E4', borderRadius: 8, height: 29, justifyContent: 'center', width: 34 },
  insightIndexText: { color: '#9A4E1B', fontSize: 10, fontWeight: '900' },
  insightCopy: { flex: 1 },
  insightText: { color: '#718075', fontSize: 12, lineHeight: 18, marginTop: 4 },
  disclaimer: { color: '#89948B', fontSize: 11, lineHeight: 17, marginTop: 20 },
  profileHeader: { alignItems: 'center', backgroundColor: '#EAF1E5', borderRadius: 14, flexDirection: 'row', gap: 14, marginTop: 22, padding: 17 },
  profileAvatar: { alignItems: 'center', backgroundColor: '#23613A', borderRadius: 28, height: 56, justifyContent: 'center', width: 56 },
  profileInitials: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  profileCopy: { flex: 1 },
  profileName: { color: '#17391F', fontSize: 18, fontWeight: '900' },
  profileRole: { color: '#718075', fontSize: 13, marginTop: 4 },
  assistantMenuItem: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#DCE7D8', borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 12, marginTop: 12, minHeight: 72, paddingHorizontal: 13, paddingVertical: 11 },
  assistantMenuMark: { alignItems: 'center', backgroundColor: '#EAF1E5', borderRadius: 10, height: 40, justifyContent: 'center', width: 40 },
  assistantMenuMarkText: { color: '#23613A', fontSize: 13, fontWeight: '900' },
  assistantMenuCopy: { flex: 1 },
  assistantMenuTitle: { color: '#17391F', fontSize: 14, fontWeight: '900' },
  assistantMenuDescription: { color: '#718075', fontSize: 11, lineHeight: 16, marginTop: 3 },
  assistantMenuArrow: { color: '#23613A', fontSize: 25, fontWeight: '500' },
  details: { backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 14 },
  detailRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 52 },
  detailLabel: { color: '#89948B', fontSize: 10, fontWeight: '800' },
  detailValue: { color: '#17391F', flexShrink: 1, fontSize: 13, fontWeight: '700', marginLeft: 12, textAlign: 'right' },
  detailDivider: { backgroundColor: '#EDF0EA', height: 1 },
  advisorIntro: { color: '#718075', fontSize: 13, lineHeight: 19, marginBottom: 11, marginTop: -5 },
  advisorPanel: { backgroundColor: '#FFFFFF', borderColor: '#DCE7D8', borderRadius: 11, borderWidth: 1, padding: 15 },
  advisorOrganization: { color: '#17391F', fontSize: 14, fontWeight: '900' },
  advisorDescription: { color: '#718075', fontSize: 12, lineHeight: 18, marginTop: 5 },
  advisorPhone: { color: '#23613A', fontSize: 21, fontWeight: '900', marginTop: 11 },
  advisorCallButton: { alignItems: 'center', backgroundColor: '#23613A', borderRadius: 9, justifyContent: 'center', marginTop: 11, minHeight: 45, paddingHorizontal: 12 },
  advisorCallText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  advisorSourceButton: { alignSelf: 'flex-start', marginTop: 10, paddingVertical: 4 },
  advisorSourceText: { color: '#23613A', fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' },
  localAdvisorSection: { backgroundColor: '#FFFFFF', borderRadius: 11, marginTop: 10, padding: 15 },
  localAdvisorTitle: { color: '#17391F', fontSize: 14, fontWeight: '900' },
  advisorAreaInput: { backgroundColor: '#FFFFFF', borderColor: '#DCE4D9', borderRadius: 9, borderWidth: 1, color: '#17391F', fontSize: 14, minHeight: 46, marginTop: 12, paddingHorizontal: 12 },
  localAdvisorButton: { alignItems: 'center', backgroundColor: '#EAF1E5', borderRadius: 9, justifyContent: 'center', marginTop: 10, minHeight: 44, paddingHorizontal: 12 },
  localAdvisorButtonText: { color: '#23613A', fontSize: 13, fontWeight: '800', textAlign: 'center' },
  localAdvisorSecondaryButton: { alignItems: 'center', borderColor: '#DCE4D9', borderRadius: 9, borderWidth: 1, justifyContent: 'center', marginTop: 8, minHeight: 44, paddingHorizontal: 12 },
  localAdvisorSecondaryText: { color: '#536157', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  languageHint: { color: '#718075', fontSize: 12, lineHeight: 18, marginBottom: 10, marginTop: -4 },
  languagePicker: { backgroundColor: '#EAF1E5', borderRadius: 11, flexDirection: 'row', gap: 5, padding: 4 },
  languageOption: { alignItems: 'center', borderRadius: 8, flex: 1, justifyContent: 'center', minHeight: 46, paddingHorizontal: 10 },
  languageSelected: { backgroundColor: '#23613A' },
  languageOptionText: { color: '#536157', fontSize: 14, fontWeight: '800' },
  languageSelectedText: { color: '#FFFFFF' },
  logoutButton: { alignItems: 'center', borderColor: '#DDBEB7', borderRadius: 11, borderWidth: 1, marginTop: 27, padding: 14 },
  logoutText: { color: '#A64C3C', fontSize: 14, fontWeight: '800' },
});