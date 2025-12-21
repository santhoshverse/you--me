const animals = [
    "Tiger", "Panda", "Fox", "Wolf", "Eagle",
    "Lion", "Bear", "Shark", "Falcon", "Dragon",
    "Phoenix", "Griffin", "Kraken", "Cobra", "Panther"
];

const adjectives = [
    "Brave", "Silent", "Crazy", "Lucky",
    "Happy", "Wild", "Smart", "Gentle", "Swift", "Mighty",
    "Neon", "Cyber", "Mega", "Super", "Ultra"
];

export function generateRandomName() {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const animal = animals[Math.floor(Math.random() * animals.length)];
    const number = Math.floor(Math.random() * 999);
    return `${adj}${animal}${number}`;
}
