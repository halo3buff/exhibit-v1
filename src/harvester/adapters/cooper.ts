import { ArchiveItem } from '../types.js';

const CREATOR_ROLES = new Set(['Designer','Artist','Maker','Manufacturer','Engraver','Illustrator','Printmaker','Lithographer','Photographer']);
const SKIP_WORDS    = ['fund','gift','donor','bequest','library','association','purchase','collection','museum'];

function getAuthor(raw: any): string {
  const parts = raw.participants || [];
  // Prefer someone with a real creator role
  for (const p of parts) {
    if (CREATOR_ROLES.has(p.role_name)) return p.person_name;
  }
  // Otherwise first person who isn't an institution
  for (const p of parts) {
    if (!SKIP_WORDS.some(w => p.person_name?.toLowerCase().includes(w))) return p.person_name;
  }
  return 'Unknown';
}

const TYPE_PREFIXES = ['Drawing, ','Print, ','Poster, ','Textile, ','Photograph, ','Painting, ','Sample, ','Album, ','Book, ','Plate, ','Card, ','Label, ','Model, '];

function cleanTitle(t: string): string {
  for (const p of TYPE_PREFIXES) if (t.startsWith(p)) return t.slice(p.length);
  return t;
}

export const cooperAdapter = (raw: any): ArchiveItem => ({
  id:             `ch-${raw.id}`,
  title:          cleanTitle(raw.title || 'Untitled'),
  author:         getAuthor(raw),
  year:           raw.date || 'n.d.',
  imageUrl:       raw.images?.[0]?.b?.url || raw.images?.[0]?.z?.url || '',
  source:         'Cooper Hewitt Smithsonian Design Museum',
  link:           `https://collection.cooperhewitt.org/objects/${raw.id}/`,
  department:     'Cooper Hewitt',
  classification: raw.type || raw.classification || 'Object',
  medium:         raw.medium || 'Unknown',
  culture:        raw.woe_country_name || 'Unknown',
});