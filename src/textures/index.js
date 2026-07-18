/**
 * Barrel export for procedural / asset textures.
 * Safe to import; does not wire into the game loop by itself.
 */

export {
  drawUSFlag,
  createUSFlagTexture,
  loadUSFlagTexture,
} from './flags.js';

export {
  createFaceTexture,
  createSmileFaceTexture,
  createMaleFaceTexture,
  createFemaleFaceTexture,
} from './faces.js';

export {
  createSuitWoolTexture,
  createCottonShirtTexture,
  createSariShimmerTexture,
  createDenimTexture,
} from './fabrics.js';

export {
  SKIN_TONES,
  createSkinTexture,
  createSkinPresetTexture,
} from './skin.js';

export {
  createAsphaltTexture,
  createConcreteTexture,
  createPlazaGroundTexture,
} from './ground.js';

export {
  createWheelchairMetalTexture,
  createTireTreadTexture,
  createWheelchairSeatTexture,
} from './wheelchair.js';

export {
  createTrumpFaceTexture,
  createTrumpHairTexture,
  loadTrumpFaceTextures,
} from './trump.js';
