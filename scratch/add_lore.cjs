const fs = require('fs');

const loreFile = 'data/lore.json';
const factoryFile = 'data/factory/lore.json';

const newIncinerator = [
  {
    "type": "note",
    "thread": "LOST",
    "title": "Burnt Badge",
    "text": "Found a badge in the ash trap. The plastic is melted, the photo is gone, but the signature on the back belongs to ${c.lead}. I checked the roster; we haven't issued a new badge in a year."
  },
  {
    "type": "document",
    "thread": "GEOMETRY",
    "title": "Volume Anomaly",
    "text": "ASH YIELD REPORT, WEEK ${WEEK}\n\nVolume of ash produced: 400 cubic meters.\nVolume of the incinerator room itself: 350 cubic meters.\n\nWe are burning more material than the room can physically hold, yet the pile never reaches the ceiling. Where is the rest of it going?"
  }
];

const newCheckpoint = [
  {
    "type": "document",
    "thread": "GEOMETRY",
    "title": "Gate Width",
    "text": "DIAGNOSTIC FAULT - LANE 2\n\nThe scanner recorded an object passing through that was 4.2 meters wide. \n\nLane 2 is exactly 1.2 meters wide.\n\nThe machine did not trigger an alarm. It simply printed this log and gracefully powered down."
  },
  {
    "type": "note",
    "thread": "HUM",
    "title": "Turnstile Vibration",
    "text": "Do not touch the turnstile in lane 4.\n\nIt is vibrating at a frequency that matches the humming in the walls. I rested my hand on it yesterday and my teeth haven't stopped aching since."
  }
];

const newMaintenance = [
  {
    "type": "clipboard",
    "thread": "LOST",
    "title": "Missing Tools",
    "text": "Missing from locker C:\n- 1 pipe wrench\n- 1 flashlight\n- ${c.lost}'s jacket\n\nIf you're going to borrow tools, sign them out. But don't take a person's jacket when they haven't been seen for a month."
  },
  {
    "type": "document",
    "thread": "HUM",
    "title": "Harmonic Pipes",
    "text": "ACOUSTIC LOG - LEVEL 3\n\nThe water pipes in the maintenance crawlspace are vibrating in perfect harmony. It is a sustained C-major chord.\n\nPlumbing does not naturally tune itself. Something is playing the pipes."
  }
];

function updateLore(file) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    data.INCINERATOR.push(...newIncinerator);
    data.CHECKPOINT.push(...newCheckpoint);
    data.MAINTENANCE.push(...newMaintenance);
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

updateLore(loreFile);
updateLore(factoryFile);
