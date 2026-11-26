// Wózek Y25 – wszystkie buildery w jednym miejscu.
// Klucz = "typ" części w data/components/y25.json.
import { bogieBuilders } from './bogie.js';
import { wheelsetBuilders } from './wheelset.js';
import { axleboxBuilders } from './axlebox.js';
import { suspensionBuilders } from './suspension.js';
import { brakeBuilders } from './brake.js';

export const y25Builders = {
  ...bogieBuilders,
  ...wheelsetBuilders,
  ...axleboxBuilders,
  ...suspensionBuilders,
  ...brakeBuilders,
};
