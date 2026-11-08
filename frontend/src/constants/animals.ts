import { AnimalReference } from '../types';

export const SUPPORTED_ANIMALS: AnimalReference[] = [
  {
    class_id: 14,
    name: 'Bird',
    hex: '#FFC800',
    scientific: 'Aves',
    category: 'Avian Wildlife',
    iucn: 'Species Dependent',
    imageUrl: 'https://images.unsplash.com/photo-1444464666168-49d633b86797?auto=format&fit=crop&w=900&q=80',
    description: 'Feathered, winged bipedal vertebrates distinguished by toothless beaked jaws, high metabolic rate, and a strong yet lightweight skeleton.',
    habitat: 'Global: Forests, wetlands, savannas, oceanic shorelines, and urban canopies.',
    yoloInfo: 'COCO Class 14. Highly variable wing silhouettes, distinct beak profiles, and varied resting perches.'
  },
  {
    class_id: 15,
    name: 'Cat',
    hex: '#00C8FF',
    scientific: 'Felis catus',
    category: 'Carnivore (Felidae)',
    iucn: 'Domesticated',
    imageUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=900&q=80',
    description: 'Small, agile predatory mammal known for flexible spine, retractable claws, acute hearing, and nocturnal vision adaptation.',
    habitat: 'Domestic domestic environments, agricultural barns, and urban feral ecosystems.',
    yoloInfo: 'COCO Class 15. Detected by upright pointed ears, triangular facial structure, arched back, and fluid tail.'
  },
  {
    class_id: 16,
    name: 'Dog',
    hex: '#008CFF',
    scientific: 'Canis lupus familiaris',
    category: 'Carnivore (Canidae)',
    iucn: 'Domesticated',
    imageUrl: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=900&q=80',
    description: 'Highly adaptable domesticated descendant of the gray wolf, characterized by social intelligence and keen olfactory senses.',
    habitat: 'Ubiquitous human companionship, working ranches, pastoral ranges, and nature parks.',
    yoloInfo: 'COCO Class 16. Detected by elongated muzzle, quadrupus stance, wagging tail, and distinctive ear postures.'
  },
  {
    class_id: 17,
    name: 'Horse',
    hex: '#B400FF',
    scientific: 'Equus caballus',
    category: 'Perissodactyla (Equidae)',
    iucn: 'Domesticated',
    imageUrl: 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&w=900&q=80',
    description: 'Single-toed ungulate mammal renowned for speed, stamina, flowing mane, muscular torso, and upright sensory ears.',
    habitat: 'Grassland steppes, open pastures, grazing paddocks, and equestrian reserves.',
    yoloInfo: 'COCO Class 17. High aspect ratio, long arched neck, elevated torso, and long straight equine limbs.'
  },
  {
    class_id: 18,
    name: 'Sheep',
    hex: '#FF64C8',
    scientific: 'Ovis aries',
    category: 'Artiodactyla (Bovidae)',
    iucn: 'Domesticated',
    imageUrl: 'https://images.unsplash.com/photo-1484557052118-f32bd25b45b5?auto=format&fit=crop&w=900&q=80',
    description: 'Even-toed ruminant mammal characterized by a dense wool fleece, flocking behavior, and spiral horn architecture.',
    habitat: 'Highland moorlands, alpine meadows, temperate grasslands, and pastoral farms.',
    yoloInfo: 'COCO Class 18. Clustered flocking patterns, round fleece volume, down-facing head, and short legs.'
  },
  {
    class_id: 19,
    name: 'Cow',
    hex: '#00FFB4',
    scientific: 'Bos taurus',
    category: 'Artiodactyla (Bovidae)',
    iucn: 'Domesticated',
    imageUrl: 'https://images.unsplash.com/photo-1546445317-29f4545e9d53?auto=format&fit=crop&w=900&q=80',
    description: 'Large herbivorous ungulate with a massive rectangular torso, distinct dewlap, broad wet snout, and cloven hooves.',
    habitat: 'Rangelands, temperate pastures, agricultural savannas, and river valleys.',
    yoloInfo: 'COCO Class 19. Large rectangular bounding boxes, horizontal spine line, broad snout, and distinct spotted or solid coats.'
  },
  {
    class_id: 20,
    name: 'Elephant',
    hex: '#00C850',
    scientific: 'Loxodonta africana / Elephas maximus',
    category: 'Proboscidea (Elephantidae)',
    iucn: 'Endangered',
    imageUrl: 'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?auto=format&fit=crop&w=900&q=80',
    description: 'The largest terrestrial megafauna on Earth, featuring a prehensile muscular trunk, large fan-like ears, and ivoried tusks.',
    habitat: 'Sub-Saharan African savannas, dense equatorial rainforests, and South Asian scrublands.',
    yoloInfo: 'COCO Class 20. Distinctive trunk silhouette, enormous ear expanse, pillar-like legs, and grey textured skin.'
  },
  {
    class_id: 21,
    name: 'Bear',
    hex: '#003CFF',
    scientific: 'Ursidae',
    category: 'Carnivore (Ursidae)',
    iucn: 'Vulnerable',
    imageUrl: 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?auto=format&fit=crop&w=900&q=80',
    description: 'Massive apex mammal with a robust skeleton, dense double-layer fur, non-retractile claws, and short rounded ears.',
    habitat: 'Taiga, temperate coniferous and broadleaf forests, alpine tundra, and riparian salmon rivers.',
    yoloInfo: 'COCO Class 21. Heavily built torso, pronounced shoulder hump (especially Grizzlies), round head, and plantigrade posture.'
  },
  {
    class_id: 22,
    name: 'Zebra',
    hex: '#C8C8C8',
    scientific: 'Equus quagga',
    category: 'Perissodactyla (Equidae)',
    iucn: 'Near Threatened',
    imageUrl: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=900&q=80',
    description: 'Iconic African wild equids recognized by their striking, individually unique black-and-white disruptive camouflage striping.',
    habitat: 'Treeless grasslands, open savannas, and acacia woodlands across southern and eastern Africa.',
    yoloInfo: 'COCO Class 22. Highly recognizable high-frequency vertical and horizontal stripe texture pattern across body and neck.'
  },
  {
    class_id: 23,
    name: 'Giraffe',
    hex: '#1EB4FF',
    scientific: 'Giraffa camelopardalis',
    category: 'Artiodactyla (Giraffidae)',
    iucn: 'Vulnerable',
    imageUrl: 'https://images.unsplash.com/photo-1547721064-da6cfb341d50?auto=format&fit=crop&w=900&q=80',
    description: 'The tallest living terrestrial animal, characterized by an exceptionally long neck, ossicones, and brown polygonal coat patches.',
    habitat: 'Dry acacia savannas, open woodlands, and bush veld of the African continent.',
    yoloInfo: 'COCO Class 23. Extremely high vertical aspect ratio, long sloped spine, elongated legs, and towering neck profile.'
  }
];
