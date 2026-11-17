const seedPlants = [
  {
    id: 'rice', name: 'Rice', localName: 'Paddy', category: 'Cereals', season: 'June - July', harvest: 'October - November',
    description: 'A warm-season cereal that grows best in fertile, level fields with a reliable water supply.',
    soil: 'Clay or clay-loam soil with good water retention. Keep soil slightly acidic to neutral.',
    water: 'Keep the field moist during early growth. Drain the field 10-15 days before harvest.',
    pests: 'Stem borer, brown planthopper', pesticide: 'Neem oil 5 ml/L for early control. For severe stem borer, use a locally approved chlorantraniliprole product at the label rate.',
    images: ['https://plus.unsplash.com/premium_photo-1675814316651-3ce3c6409922?q=80&w=736&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=900'],
    video: 'https://youtu.be/7qsw9pjUrww?si=JAKNMks4HnXypWDO',
  },
  {
    id: 'tomato', name: 'Tomato', localName: 'Thakkali', category: 'Vegetables', season: 'October - November', harvest: '60 - 90 days after planting',
    description: 'A high-value vegetable that needs sunlight, steady watering, and support as the plant grows.',
    soil: 'Well-drained loamy soil rich in compost. Avoid planting after other solanaceous crops.',
    water: 'Water at the base every 2-3 days. Avoid wetting leaves to reduce fungal disease.',
    pests: 'Fruit borer, whitefly, early blight', pesticide: 'Use neem oil 3 ml/L for sucking pests. Remove affected leaves and use a locally approved bio-fungicide for blight.',
    images: ['https://images.unsplash.com/photo-1610099167931-33655a52194b?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=900'],
    video: 'https://youtu.be/Zj-pLI1mISo?si=HP6_MlHwb6UgPuvh',
  },
  {
    id: 'cotton', name: 'Cotton', localName: 'Paruthi', category: 'Cash Crops', season: 'May - June', harvest: 'October - January',
    description: 'A long-duration cash crop that rewards good seed selection, weed management, and pest scouting.',
    soil: 'Deep black soil or well-drained loam. Prepare a fine seedbed and avoid standing water.',
    water: 'Provide irrigation during flowering and boll formation, especially through dry spells.',
    pests: 'Pink bollworm, whitefly, aphids', pesticide: 'Install pheromone traps for bollworm. Use neem-based products first and only use approved pesticides after checking the label.',
    images: ['https://images.unsplash.com/photo-1502395809857-fd80069897d0?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', 'https://images.unsplash.com/photo-1633527992904-53f86f81a23a?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8Y290dG9ufGVufDB8fDB8fHww'],
    video: 'https://youtu.be/pZKena63_PY?si=yLhlXcQGqTY_Cc7D',
  },
  {
    id: 'groundnut', name: 'Groundnut', localName: 'Verkadalai', category: 'Pulses & Oilseeds', season: 'June - July or September - October', harvest: '90 - 120 days',
    description: 'A soil-friendly oilseed crop that forms pods underground and needs loose soil for easy harvest.',
    soil: 'Loose sandy loam with good drainage. Avoid heavy clay and waterlogging.',
    water: 'Irrigate at sowing, flowering, pegging, and pod development. Stop irrigation before harvest.',
    pests: 'Leaf miner, thrips, tobacco caterpillar', pesticide: 'Use yellow sticky traps for early monitoring. Apply a locally approved neem formulation or pesticide only when the pest crosses the recommended threshold.',
    images: ['https://images.unsplash.com/photo-1567892737950-30c4db37cd89?w=900', 'https://images.unsplash.com/photo-1724058663142-e6e1a5e89f2d?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'],
    video: 'https://youtu.be/-8tBRc-4SgM?si=_xoHie67TlkCAaqV',
  },
];

let plants = [...seedPlants];

export const getPlants = () => plants;
export const createPlant = (plant) => {
  const newPlant = { ...plant, id: `plant-${Date.now()}` };
  plants = [newPlant, ...plants];
  return newPlant;
};
export const updatePlant = (plant) => {
  plants = plants.map((item) => item.id === plant.id ? plant : item);
};
export const deletePlant = (id) => {
  plants = plants.filter((plant) => plant.id !== id);
};