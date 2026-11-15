// Where things stand on the roof, and their solid shapes.
// Looks are not decided here: the view asks the registry to build each id.
// The roof spans X -8..8 (west..east) and Z -5..5 (north..south). The camera is south, looking north.

export const PROPS = [
  { id: 'water_tank', x: -6.7, z: -3.7, yaw: 0, solid: { type: 'circle', r: 1.0 } },
  { id: 'lamp_post', x: -3.7, z: -4.55, yaw: 0, solid: { type: 'circle', r: 0.15 } },
  { id: 'lamp_post', x: 7.2, z: -4.55, yaw: 0, solid: { type: 'circle', r: 0.15 } },
  { id: 'crate', x: -7.2, z: 1.0, yaw: 0, solid: { type: 'box', hx: 0.5, hz: 0.5 } },
  { id: 'crate', x: -7.2, z: 2.0, yaw: Math.PI / 2, solid: { type: 'box', hx: 0.5, hz: 0.5 } },
  { id: 'crate', x: 7.2, z: -0.6, yaw: Math.PI, solid: { type: 'box', hx: 0.5, hz: 0.5 } },
  { id: 'crate', x: 7.2, z: 0.4, yaw: -Math.PI / 2, solid: { type: 'box', hx: 0.5, hz: 0.5 } },
  // the weapons spot: a rack against the back wall, facing the camera (+Z)
  { id: 'weapon_rack', x: 4.6, z: -4.45, yaw: 0, solid: { type: 'box', hx: 0.9, hz: 0.25 } },
];

// Stand on a pad in front of the rack and press attack to buy its weapon.
export const WEAPON_PADS = [
  { weapon: 'pipe', x: 4.15, z: -3.6 },
  { weapon: 'hammer', x: 5.05, z: -3.6 },
];

export const JUNO_START = { x: 0, z: 1.0 };

// Enemies climb in over the back wall at these x positions (cycled).
export const SPAWN_X = [-1.5, 2.0, 0.2, 6.2, -2.4]; // clear of the weapon rack (x 3.7..5.5)
export const SPAWN_Z = -4.15; // far enough from the wall for Grudge (radius 0.45)
