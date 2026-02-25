import { metAdapter } from './met.js';
import { articAdapter } from './artic.js';
import { harvardAdapter } from './harvard.js';
import { cooperAdapter } from './cooper.js';
import { adaAdapter } from './ada.js';
import { vaAdapter } from './va.js';
import { rijksAdapter } from './rijks.js';
import { smithsonianAdapter } from './smithsonian.js';
import { gettyAdapter } from './getty.js';
import { ngaAdapter } from './nga.js';
import { locAdapter } from './loc.js';
import { nyplAdapter } from './nypl.js';
import { wikimediaAdapter } from './wikimedia.js';
import { iaAdapter } from './ia.js';
import { wellcomeAdapter } from './wellcome.js';
import { europeanaAdapter } from './europeana.js';
import { jstorAdapter } from './jstor.js';
import { aifAdapter } from './aif.js';
import { palarchiveAdapter } from './palarchive.js';
import { harvardMEAdapter } from './harvardme.js';
import { raveAdapter } from './rave.js';
import { designReviewedAdapter } from './designedreviewed.js';
import { letterformAdapter } from './letterform.js';
import { translatioAdapter } from './translatio.js';
import { aucAdapter } from './auc.js';

export const Adapters: Record<string, (raw: any) => any> = {
  met: metAdapter,
  artic: articAdapter,
  harvard: harvardAdapter,
  cooper: cooperAdapter,
  arabic_design: adaAdapter,
  va: vaAdapter,
  rijks: rijksAdapter,
  smithsonian: smithsonianAdapter,
  getty: gettyAdapter,
  nga: ngaAdapter,
  loc: locAdapter,
  nypl: nyplAdapter,
  wikimedia: wikimediaAdapter,
  internetarchive: iaAdapter,
  wellcome: wellcomeAdapter,
  europeana: europeanaAdapter,
  jstor: jstorAdapter,
  aif: aifAdapter,
  palarchive: palarchiveAdapter,
  harvardme: harvardMEAdapter,
  rave: raveAdapter,
  designreviewed: designReviewedAdapter,
  letterform: letterformAdapter,
  translatio: translatioAdapter,
  auc: aucAdapter,
};