// PROTOTYPE - NOT FOR PRODUCTION
// Little Ocean feel prototype — every tuning value lives here ({value, min, max, step}); the game reads them live.
// Sources: GDD 02 (sailing), 03 (world), 04 (fishing), 05 (economy), 10 (UI), juice-bible.md.
window.CONFIG = {
  seed: 20261126,

  // ---- sailing (02, scaled for a feel prototype) ----
  maxSpeed:        { value: 9.0,  min: 4,    max: 16,   step: 0.5,  note: 'm/s at Full notch' },
  reverseSpeed:    { value: 2.0,  min: 0,    max: 4,    step: 0.5 },
  accel:           { value: 1.6,  min: 0.4,  max: 4,    step: 0.1,  note: 'm/s² toward the notch speed' },
  decel:           { value: 2.2,  min: 0.4,  max: 6,    step: 0.1 },
  anchorBrake:     { value: 3.0,  min: 1,    max: 8,    step: 0.5 },
  turnRate:        { value: 0.62, min: 0.2,  max: 1.4,  step: 0.02, note: 'rad/s at full rudder, good speed' },
  turnAtRest:      { value: 0.22, min: 0,    max: 0.6,  step: 0.02, note: 'fraction of turnRate when stopped' },
  rudderEase:      { value: 5.5,  min: 1,    max: 14,   step: 0.5 },
  yawInertia:      { value: 3.2,  min: 1,    max: 10,   step: 0.2 },
  leanK:           { value: 0.055, min: 0,   max: 0.15, step: 0.005, note: 'roll per (yawRate*speed)' },
  leanMax:         { value: 0.2,  min: 0,    max: 0.4,  step: 0.01 },
  noseUpK:         { value: 0.05, min: 0,    max: 0.15, step: 0.005, note: 'pitch per m/s² of acceleration' },
  surfK:           { value: 1.8,  min: 0,    max: 5,    step: 0.1,  note: 'speed gained per unit of down-slope' },
  notchRepeat:     { value: 0.28, min: 0.1,  max: 0.6,  step: 0.02, note: 's between notches while held' },

  // ---- sea / regions (03, compressed) ----
  swellShallows:   { value: 0.45, min: 0,    max: 1.5,  step: 0.05 },
  swellSwells:     { value: 1.35, min: 0.4,  max: 2.5,  step: 0.05 },
  regionSwellsX:   { value: 360,  min: 200,  max: 500,  step: 10,   note: 'x where The Swells begin' },
  bandWidth:       { value: 70,   min: 20,   max: 150,  step: 5 },

  // ---- camera (02 + bible) ----
  camDist:         { value: 21,   min: 10,   max: 40,   step: 0.5 },
  camHeight:       { value: 0.26, min: 0.08, max: 0.6,  step: 0.01, note: 'pitch, rad' },
  camYawFollow:    { value: 2.4,  min: 0.5,  max: 8,    step: 0.1 },
  camLeadTurn:     { value: 0.38, min: 0,    max: 1,    step: 0.02 },
  camLeadAhead:    { value: 0.45, min: 0,    max: 1.5,  step: 0.05, note: 'm ahead per m/s' },
  camSpeedPull:    { value: 0.55, min: 0,    max: 1.5,  step: 0.05, note: 'extra distance per m/s' },
  fovBase:         { value: 36,   min: 28,   max: 50,   step: 0.5,  note: 'vertical' },
  fovSpeed:        { value: 6,    min: 0,    max: 14,   step: 0.5 },
  traumaDecay:     { value: 1.6,  min: 0.5,  max: 4,    step: 0.1 },
  traumaMax:       { value: 0.35, min: 0,    max: 1,    step: 0.05 },
  idleWiden:       { value: 20,   min: 5,    max: 60,   step: 1,    note: 's without input before the idle drift' },

  // ---- fishing (04, faster for a feel test) ----
  catchMin:        { value: 5.5,  min: 1,    max: 20,   step: 0.5,  note: 's between catches per crew (min)' },
  catchMax:        { value: 10,   min: 2,    max: 30,   step: 0.5 },
  biteLead:        { value: 0.75, min: 0.2,  max: 2,    step: 0.05, note: 's of "!" before the fish comes out' },
  slowBonus:       { value: 1.35, min: 1,    max: 2,    step: 0.05, note: 'catch speed multiplier when anchored or slow' },
  cargoCapacity:   { value: 20,   min: 5,    max: 60,   step: 1 },
  spotRadius:      { value: 34,   min: 10,   max: 80,   step: 1 },

  // ---- exploration ----
  discoverRadius:  { value: 42,   min: 15,   max: 100,  step: 1 },
  glintRadius:     { value: 150,  min: 50,   max: 300,  step: 5 },
  letterbox:       { value: 1.4,  min: 0,    max: 2,    step: 0.1,  note: 's of discovery push-in' },

  // ---- time / weather (10 Open Q 5 proposal) ----
  dayMinutes:      { value: 30,   min: 5,    max: 120,  step: 1,    note: 'real minutes per in-game day' },
  startHour:       { value: 15.5, min: 6,    max: 20,   step: 0.25 },
  drizzleClear:    { value: 180,  min: 30,   max: 600,  step: 10,   note: 's clear in The Swells' },
  drizzleWet:      { value: 90,   min: 30,   max: 600,  step: 10 },

  // ---- selling juice ----
  coinFlight:      { value: 0.7,  min: 0.2,  max: 1.5,  step: 0.05 },
  coinsPerSale:    { value: 28,   min: 5,    max: 60,   step: 1 },
  countUp:         { value: 1.1,  min: 0.2,  max: 3,    step: 0.1 },

  // ---- audio ----
  volume:          { value: 0.7,  min: 0,    max: 1,    step: 0.05 },
};
window.C = (k) => window.CONFIG[k].value;
