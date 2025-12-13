const animals = [
    "Tiger", "Panda", "Fox", "Wolf", "Eagle",
    "Lion", "Bear", "Shark", "Falcon", "Dragon"
];

const adjectives = [
    "Brave", "Silent", "Crazy", "Lucky",
    "Happy", "Wild", "Smart", "Gentle", "Swift", "Mighty"
];

export function generateRandomName() {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const animal = animals[Math.floor(Math.random() * animals.length)];
    return `${adj} ${animal}`;
}
